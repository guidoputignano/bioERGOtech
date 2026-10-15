import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";

/**
 * GET /api/admin/course/questions?status=open|answered
 *
 * Student questions from lesson submissions, oldest first, so whoever has
 * waited longest is answered first. A submission without a question is a
 * reflection, not something to reply to, and is left out.
 *
 * Replies are saved through PATCH /api/admin/submissions, as before.
 */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  const status = new URL(req.url).searchParams.get("status") === "answered" ? "answered" : "open";

  let query = client
    .from("lesson_submissions")
    .select(
      "id, user_id, lesson_slug, lesson_title, student_id, reflection, question, comment, admin_reply, replied_at, created_at, updated_at, profiles:user_id ( full_name, email )",
      { count: "exact" },
    )
    .not("question", "is", null)
    .neq("question", "");

  query =
    status === "open"
      ? query.is("admin_reply", null).order("updated_at", { ascending: true })
      : query.not("admin_reply", "is", null).order("replied_at", { ascending: false });

  const { data, error, count } = await query.limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ questions: data ?? [], total: count ?? 0 });
}
