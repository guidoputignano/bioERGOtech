import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const getAdmin = () =>
  createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

// GET /api/courses/submissions?lesson_slug=lesson-1-1
// Returns the current user's submission for a specific lesson
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ submission: null });

  const { searchParams } = new URL(req.url);
  const lessonSlug = searchParams.get("lesson_slug");
  if (!lessonSlug) return NextResponse.json({ error: "lesson_slug required" }, { status: 400 });

  const admin = getAdmin();
  const { data } = await admin
    .from("lesson_submissions")
    .select("*")
    .eq("lesson_slug", lessonSlug)
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({ submission: data ?? null });
}

// POST /api/courses/submissions
// Body: { lesson_slug, lesson_title, reflection, question, comment }
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const { lesson_slug, lesson_title, reflection, question, comment } = body;

  if (!lesson_slug || !lesson_title) {
    return NextResponse.json({ error: "lesson_slug and lesson_title required" }, { status: 400 });
  }

  const admin = getAdmin();

  // Ensure student_id is assigned
  const { data: studentIdData } = await admin.rpc("assign_student_id", { p_user_id: user.id });
  const studentId = studentIdData as string;

  // Upsert the submission
  const { data, error } = await admin
    .from("lesson_submissions")
    .upsert(
      {
        lesson_slug,
        lesson_title,
        user_id: user.id,
        student_id: studentId,
        reflection: reflection?.trim() || null,
        question: question?.trim() || null,
        comment: comment?.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "lesson_slug,user_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ submission: data });
}
