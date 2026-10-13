import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { loadStudentState } from "@/lib/course/data";
import { githubConfig } from "@/lib/github/client";
import { runProjectChecks } from "@/lib/github/projects";

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

  const cfg = githubConfig();
  if (!cfg) return NextResponse.json({ error: "GitHub integration is not configured" }, { status: 503 });

  const { user_id } = (await req.json().catch(() => ({}))) as { user_id?: string };
  if (!user_id) return NextResponse.json({ error: "user_id is required" }, { status: 400 });

  const state = await loadStudentState(client, user_id);
  if (!state.project || !state.membership) {
    return NextResponse.json({ error: "This student has no linked project" }, { status: 404 });
  }

  const result = await runProjectChecks(
    cfg,
    state.project.full_name,
    state.github?.login ?? null,
    state.membership.submitted_commit,
  );

  const { error } = await client
    .from("course_project_members")
    .update({ check_result: result, checked_at: result.ran_at })
    .eq("user_id", user_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ result, state: await loadStudentState(client, user_id) });
}
