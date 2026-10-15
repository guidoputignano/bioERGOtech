import { NextResponse } from "next/server";
import { requireMember } from "@/lib/auth/admin";
import { claimGithub, loadStudentState, waitMessage } from "@/lib/course/data";
import { BUSY_MESSAGE, readCommit, runProjectChecks } from "@/lib/github/projects";

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
  // Each check spends GitHub requests from an hourly allowance shared by
  // every student. Claimed before calling GitHub, failed attempts included.
  const wait = await claimGithub(client, chiamante.id, "check");
  if (wait !== null) return NextResponse.json({ error: waitMessage(wait) }, { status: 429 });

  const checkedProject = state.membership.project_id;
  const head = await readCommit(state.project.full_name);
  const commit = head.sha;
  const result = commit
    ? await runProjectChecks({
        fullName: state.project.full_name,
        studentId: state.student_id,
        pinnedRef: commit,
        fork: { isFork: state.project.is_fork, parent: state.project.fork_parent },
        head,
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
    // below, so the student sees why.
    return NextResponse.json(
      { error: `${BUSY_MESSAGE}${state.membership.submitted_commit ? " Your earlier submission is unchanged." : ""}` },
      { status: 502 },
    );
  }

  // Without a commit there is nothing to pin, so it is not a submission:
  // record the failed check only, and the student submits again once the
  // repository can be read. The write only lands if the student is still
  // on the project that was checked: relinking during the check must not
  // put this result on another repository.
  const { data: updated, error } = await client
    .from("course_project_members")
    .update(
      commit
        ? { submitted_at: new Date().toISOString(), submitted_commit: commit, check_result: result, checked_at: result.ran_at }
        : { check_result: result, checked_at: result.ran_at },
    )
    .eq("user_id", chiamante.id)
    .eq("project_id", checkedProject)
    .select("user_id");
  if (error) {
    console.error("course submit:", error.message);
    return NextResponse.json({ error: "Could not save your submission" }, { status: 500 });
  }
  if (!updated?.length) {
    return NextResponse.json({ error: "Your repository changed while it was being checked. Please submit again." }, { status: 409 });
  }

  return NextResponse.json({ state: await loadStudentState(client, chiamante.id) });
}
