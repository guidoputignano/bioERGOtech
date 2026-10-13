import { NextResponse } from "next/server";
import { requireMember } from "@/lib/auth/admin";
import { loadStudentState, recordMentorAccess } from "@/lib/course/data";
import { githubConfig } from "@/lib/github/client";
import { readHead, runProjectChecks } from "@/lib/github/projects";

/** Each check costs several GitHub calls on the mentor token's hourly budget. */
const MIN_SECONDS_BETWEEN_CHECKS = 60;

/**
 * POST /api/courses/project/submit
 *
 * "Submit for certificate". Pins the repository's current commit, runs the
 * project checks against it and stores the result. A student can submit
 * again after fixing something, until a certificate is issued.
 */
export async function POST() {
  const guard = await requireMember();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client, chiamante } = guard;

  const cfg = githubConfig();
  if (!cfg) return NextResponse.json({ error: "GitHub submissions are not enabled yet" }, { status: 503 });

  const state = await loadStudentState(client, chiamante.id);
  if (state.certificate && !state.certificate.revoked_at) {
    return NextResponse.json({ error: "Your certificate has already been issued" }, { status: 409 });
  }
  if (!state.project || !state.membership) {
    return NextResponse.json({ error: "Link your project repository first (Lesson 4.4)" }, { status: 400 });
  }
  const last = state.membership.checked_at ? Date.parse(state.membership.checked_at) : 0;
  const wait = Math.ceil(MIN_SECONDS_BETWEEN_CHECKS - (Date.now() - last) / 1000);
  if (wait > 0) {
    return NextResponse.json({ error: `Please wait ${wait} seconds before checking again` }, { status: 429 });
  }

  const head = await readHead(cfg, state.project.full_name);
  const commit = head.sha;
  if (!commit && head.transient && state.membership.submitted_commit) {
    // GitHub unreachable or rate-limited. The earlier submission and its
    // check describe each other: leave both alone rather than replace a
    // passing result with an error about a different moment. A repo that is
    // gone or hidden is not transient: that falls through and is recorded,
    // so the student sees why and the one-minute throttle applies.
    return NextResponse.json(
      { error: "We could not read your repository right now. Your earlier submission is unchanged; please try again shortly." },
      { status: 502 },
    );
  }
  const result = commit
    ? await runProjectChecks(
        cfg,
        state.project.full_name,
        state.github?.login ?? null,
        commit,
        state.project.created_via === "template",
      )
    : {
        ref: null,
        ran_at: new Date().toISOString(),
        items: [],
        passed: false,
        error: head.transient
          ? "GitHub could not be reached just now. Please try again in a few minutes."
          : "We could not read your repository. Check that it still exists, is public and has at least one commit, then link it again from Lesson 4.4 if needed.",
      };

  // Without a commit there is nothing to pin, so it is not a submission:
  // record the failed check only, and the student submits again once the
  // repository can be read. Otherwise a later check would assess whatever
  // HEAD happens to be at that moment.
  const { error } = await client
    .from("course_project_members")
    .update(
      commit
        ? { submitted_at: new Date().toISOString(), submitted_commit: commit, check_result: result, checked_at: result.ran_at }
        : { check_result: result, checked_at: result.ran_at },
    )
    .eq("user_id", chiamante.id);
  if (error) {
    console.error("course submit:", error.message);
    return NextResponse.json({ error: "Could not save your submission" }, { status: 500 });
  }
  await recordMentorAccess(client, state.project, result);

  return NextResponse.json({ state: await loadStudentState(client, chiamante.id) });
}
