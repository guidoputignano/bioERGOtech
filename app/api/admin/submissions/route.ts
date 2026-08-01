import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";

// GET /api/admin/submissions?lesson_slug=lesson-1-1 (optional filter)
// Returns all student submissions with profile info.
// Solo staff: la join su profiles espone nome, email e student_id di ogni
// studente insieme al testo delle sue riflessioni.
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  const { searchParams } = new URL(req.url);
  const lessonSlug = searchParams.get("lesson_slug");

  let query = client
    .from("lesson_submissions")
    .select(`
      *,
      profiles:user_id (
        id,
        full_name,
        email,
        student_id,
        partnership_level
      )
    `)
    .order("created_at", { ascending: false });

  if (lessonSlug) {
    query = query.eq("lesson_slug", lessonSlug);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ submissions: data ?? [] });
}

// PATCH /api/admin/submissions
// Body: { id, admin_reply }
export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client, chiamante } = guard;

  const body = await req.json();
  const { id, admin_reply } = body;

  if (!id || !admin_reply) {
    return NextResponse.json({ error: "id and admin_reply required" }, { status: 400 });
  }

  const { data, error } = await client
    .from("lesson_submissions")
    .update({
      admin_reply: admin_reply.trim(),
      replied_at: new Date().toISOString(),
      // Chi ha risposto lo sa il server dalla sessione: prima arrivava dal
      // corpo della richiesta, quindi era dichiarabile a piacere.
      replied_by: chiamante.id,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ submission: data });
}
