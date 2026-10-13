import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAdmin } from "@/lib/auth/admin";
import { draftReply } from "@/lib/course/draft-reply";

// A draft usually takes 10 to 30 seconds. 60 is within every Vercel plan's
// limit, so this setting can never be what fails a deploy.
export const maxDuration = 60;

/**
 * POST /api/admin/course/draft-reply
 * Body: { submission_id }
 *
 * Returns a suggested reply for the admin to edit. Nothing is saved or sent
 * here: the admin sends through PATCH /api/admin/submissions.
 */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured" }, { status: 503 });
  }

  const { submission_id } = (await req.json().catch(() => ({}))) as { submission_id?: string };
  if (!submission_id) return NextResponse.json({ error: "submission_id is required" }, { status: 400 });

  const { data: s, error } = await client
    .from("lesson_submissions")
    .select("lesson_slug, lesson_title, reflection, question, comment")
    .eq("id", submission_id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!s?.question?.trim()) return NextResponse.json({ error: "This submission has no question" }, { status: 404 });

  try {
    const result = await draftReply({
      lessonSlug: s.lesson_slug,
      lessonTitle: s.lesson_title,
      reflection: s.reflection,
      question: s.question,
      comment: s.comment,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Claude is rate limited. Try again in a minute." }, { status: 429 });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("draft-reply Claude error:", err.status, err.message);
      return NextResponse.json({ error: `Claude API error (${err.status})` }, { status: 502 });
    }
    console.error("draft-reply:", (err as Error).message);
    return NextResponse.json({ error: "Could not draft a reply" }, { status: 500 });
  }
}
