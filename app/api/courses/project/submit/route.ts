import { NextResponse } from "next/server";
import { requireMember } from "@/lib/auth/admin";
import { loadStudentState } from "@/lib/course/data";
import { githubConfig } from "@/lib/github/client";
import { headCommit, runProjectChecks } from "@/lib/github/projects";

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

  const commit = await headCommit(cfg, state.project.full_name);
  const result = commit
    ? await runProjectChecks(cfg, state.project.full_name, state.github?.login ?? null, commit)
    : {
        ref: null,
        ran_at: new Date().toISOString(),
        items: [],
        passed: false,
        error: "The repository has no commits yet, or the mentor account cannot see it.",
      };

  const { error } = await client
    .from("course_project_members")
    .update({
      submitted_at: new Date().toISOString(),
      submitted_commit: commit,
      check_result: result,
      checked_at: result.ran_at,
    })
    .eq("user_id", chiamante.id);
  if (error) {
    console.error("course submit:", error.message);
    return NextResponse.json({ error: "Could not save your submission" }, { status: 500 });
  }

  return NextResponse.json({ state: await loadStudentState(client, chiamante.id) });
}
