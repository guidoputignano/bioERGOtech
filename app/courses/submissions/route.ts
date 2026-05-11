import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const getAdmin = () =>
  createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ submission: null });

    const { searchParams } = new URL(req.url);
    const lessonSlug = searchParams.get("lesson_slug");

    if (!lessonSlug) {
      return NextResponse.json(
        { error: "lesson_slug required" },
        { status: 400 }
      );
    }

    const admin = getAdmin();

    const { data, error } = await admin
      .from("lesson_submissions")
      .select("*")
      .eq("lesson_slug", lessonSlug)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ submission: data ?? null });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load submission" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { lesson_slug, lesson_title, reflection, question, comment } = body;

    if (!lesson_slug || !lesson_title) {
      return NextResponse.json(
        { error: "lesson_slug and lesson_title required" },
        { status: 400 }
      );
    }

    if (!reflection || !reflection.trim()) {
      return NextResponse.json(
        { error: "Reflection is required" },
        { status: 400 }
      );
    }

    const admin = getAdmin();
    const studentId = `BIO-${user.id.slice(0, 8).toUpperCase()}`;

    const { data, error } = await admin
      .from("lesson_submissions")
      .upsert(
        {
          lesson_slug,
          lesson_title,
          user_id: user.id,
          student_id: studentId,
          student_name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email ||
            "Student",
          student_email: user.email,
          reflection: reflection.trim(),
          question: question?.trim() || null,
          comment: comment?.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "lesson_slug,user_id" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ submission: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Submission failed" },
      { status: 500 }
    );
  }
}