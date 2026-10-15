import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { countReadyToCertify } from "@/lib/course/data";

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

  // Students the Course Monitor lists as "Ready to certify". Submissions that
  // still miss a lesson or a check wait on the student, not on staff.
  let readyToCertify: number | null = null;
  try {
    readyToCertify = await countReadyToCertify(client);
  } catch (e) {
    console.error("admin summary course:", (e as Error).message);
  }

  return NextResponse.json({
    applications,
    equipment,
    docProposals,
    redemptions,
    openQuestions,
    readyToCertify,
  });
}
