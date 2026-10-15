import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";

/**
 * GET /api/admin/summary
 *
 * What is waiting for staff, for the Admin Panel's overview cards and menu
 * badges, in one request. Counts only (head requests): no rows travel.
 *
 * Each count degrades on its own. A table that is missing or a query that
 * fails gives null, which the panel shows as "no badge", so one broken
 * source never blanks the whole panel.
 */
export async function GET() {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  const count = async (q: PromiseLike<{ count: number | null; error: { message: string } | null }>, label: string) => {
    const { count: n, error } = await q;
    if (error) {
      console.error(`admin summary ${label}:`, error.message);
      return null;
    }
    return n ?? 0;
  };

  const [applications, equipment, docProposals, redemptions, openQuestions] = await Promise.all([
    count(client.from("applications").select("id", { count: "exact", head: true }).eq("application_status", "pending"), "applications"),
    count(client.from("equipment_proposals").select("id", { count: "exact", head: true }).eq("status", "pending"), "equipment"),
    count(client.from("knowledge_documents").select("id", { count: "exact", head: true }).eq("is_approved", false), "knowledge"),
    count(client.from("redemption_requests").select("id", { count: "exact", head: true }).eq("status", "pending"), "redemptions"),
    count(
      client
        .from("lesson_submissions")
        .select("id", { count: "exact", head: true })
        .not("question", "is", null)
        .neq("question", "")
        .is("admin_reply", null),
      "questions",
    ),
  ]);

  // Submitted course projects whose checks passed and that have no certificate yet.
  // Submissions that failed a check wait on the student, not on staff, so they are left out.
  let awaitingCertificate: number | null = null;
  const [submitted, certified] = await Promise.all([
    client.from("course_project_members").select("user_id, passed:check_result->passed").not("submitted_at", "is", null).limit(5000),
    client.from("course_certificates").select("user_id").is("revoked_at", null).limit(5000),
  ]);
  if (!submitted.error && !certified.error) {
    const done = new Set((certified.data ?? []).map((r) => r.user_id));
    awaitingCertificate = (submitted.data ?? []).filter((r) => r.passed === true && !done.has(r.user_id)).length;
  } else {
    console.error("admin summary course:", submitted.error?.message ?? certified.error?.message);
  }

  return NextResponse.json({
    applications,
    equipment,
    docProposals,
    redemptions,
    openQuestions,
    awaitingCertificate,
  });
}
