import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { loadStudentState } from "@/lib/course/data";
import { BUSY_MESSAGE, runProjectChecks } from "@/lib/github/projects";

/**
 * POST /api/admin/course/check
 * Body: { user_id }
 *
 * Re-runs the project checks for one student. A submitted project is
 * checked at the commit the student submitted, so the result is the one
 * the certificate will be based on. An unsubmitted project is checked at
 * its latest commit, as a preview.
 */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  const { user_id } = (await req.json().catch(() => ({}))) as { user_id?: string };
  if (!user_id) return NextResponse.json({ error: "user_id is required" }, { status: 400 });

  const state = await loadStudentState(client, user_id);
  if (!state.project || !state.membership) {
    return NextResponse.json({ error: "This student has no linked project" }, { status: 404 });
  }

  const result = await runProjectChecks({
    fullName: state.project.full_name,
    studentId: state.student_id,
    pinnedRef: state.membership.submitted_commit,
    fork: { isFork: state.project.is_fork, parent: state.project.fork_parent },
  });
  if (result.error === BUSY_MESSAGE) {
    // GitHub's limit, not the student's repo: keep the stored result.
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  // Only a submission carries a pinned commit. A preview check of an
  // unsubmitted project must not look like a passed submission, so it
  // updates the result but never submitted_at.
  // Only if the student is still on the project that was checked.
  const { data: updated, error } = await client
    .from("course_project_members")
    .update({ check_result: result, checked_at: result.ran_at })
    .eq("user_id", user_id)
    .eq("project_id", state.membership.project_id)
    .select("user_id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated?.length) {
    return NextResponse.json({ error: "The student changed repository during the check. Run it again." }, { status: 409 });
  }

  return NextResponse.json({ result, state: await loadStudentState(client, user_id) });
}
