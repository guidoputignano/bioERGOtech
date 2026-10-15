import { NextResponse } from "next/server";
import { requireMember } from "@/lib/auth/admin";
import { loadStudentState } from "@/lib/course/data";
import { BUSY_MESSAGE, readCommit, runProjectChecks } from "@/lib/github/projects";

/** Each check spends GitHub requests from a shared hourly allowance. */
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

  const state = await loadStudentState(client, chiamante.id);
  if (state.certificate) {
    return NextResponse.json({ error: "Your certificate has already been issued" }, { status: 409 });
  }
  if (!state.project || !state.membership) {
    return NextResponse.json({ error: "Add your project repository first (Lesson 4.4)" }, { status: 400 });
  }
  const last = state.membership.checked_at ? Date.parse(state.membership.checked_at) : 0;
  const wait = Math.ceil(MIN_SECONDS_BETWEEN_CHECKS - (Date.now() - last) / 1000);
  if (wait > 0) {
    return NextResponse.json({ error: `Please wait ${wait} seconds before checking again` }, { status: 429 });
  }

  const head = await readCommit(state.project.full_name);
  const commit = head.sha;
  const result = commit
    ? await runProjectChecks({
        fullName: state.project.full_name,
        studentId: state.student_id,
        pinnedRef: commit,
        fork: { isFork: state.project.is_fork, parent: state.project.fork_parent },
      })
    : {
        ref: null,
        ran_at: new Date().toISOString(),
        items: [],
        passed: false,
        error: head.transient
          ? BUSY_MESSAGE
          : "We could not read your repository. Check that it still exists, is public and has at least one commit.",
      };
  if (result.error === BUSY_MESSAGE) {
    // GitHub unreachable or its limit used up, before or during the check:
    // nothing about the repository is known, so record nothing. An earlier
    // submission and its check describe each other and stay as they are.
    // A repo that is gone or private is not this case: that is recorded
    // below, so the student sees why and the one-minute throttle applies.
    return NextResponse.json(
      { error: `${BUSY_MESSAGE}${state.membership.submitted_commit ? " Your earlier submission is unchanged." : ""}` },
      { status: 502 },
    );
  }

  // Without a commit there is nothing to pin, so it is not a submission:
  // record the failed check only, and the student submits again once the
  // repository can be read. Otherwise a later check would assess whatever
  // the latest commit happens to be at that moment.
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

  return NextResponse.json({ state: await loadStudentState(client, chiamante.id) });
}
