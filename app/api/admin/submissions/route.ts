import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const getAdmin = () =>
  createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

// GET /api/admin/submissions?lesson_slug=lesson-1-1 (optional filter)
// Returns all student submissions with profile info
export async function GET(req: NextRequest) {
  const admin = getAdmin();
  const { searchParams } = new URL(req.url);
  const lessonSlug = searchParams.get("lesson_slug");

  let query = admin
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
// Body: { id, admin_reply, replied_by }
export async function PATCH(req: NextRequest) {
  const admin = getAdmin();
  const body = await req.json();
  const { id, admin_reply, replied_by } = body;

  if (!id || !admin_reply) {
    return NextResponse.json({ error: "id and admin_reply required" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("lesson_submissions")
    .update({
      admin_reply: admin_reply.trim(),
      replied_at: new Date().toISOString(),
      replied_by,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ submission: data });
}
