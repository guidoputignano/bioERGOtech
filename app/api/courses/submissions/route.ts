import { NextRequest, NextResponse, after } from "next/server";
import { notifyStaffOfSubmission } from "@/lib/course/notify";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import {
  COLONNA_RIFLESSIONI_CONDIVISE,
  erroreSchemaMancante,
  iscrizioneLiceiPerAvviso,
  statoColonnaRiflessioni,
} from "@/lib/eventi/licei-server";
import { riflessioniPassatePerBox } from "@/lib/eventi/licei-riflessioni";

const getAdmin = () =>
  createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

/**
 * Percorso licei: who reads what a student writes in a lesson.
 *
 * For a student enrolled in the licei programme (pending or confirmed, with
 * the programme still open), reflection and question are also read by the
 * teachers of their school, but only for submissions saved after the
 * student has seen the notice in the lesson box. `avviso_referente` tells
 * the box whether to show that notice: `{ istituto }`, or null for everyone
 * else, and also while the `condivisa_referente_at` column does not exist
 * yet (the migration is applied by hand, after the deploy).
 *
 * Submissions saved before the notice become readable by those teachers
 * three days after the platform first shows the student a notice about
 * them, or at once if the student says "Va bene", and never if the student
 * says no. `riflessioni_passate` gives the box what that notice needs:
 * `{ scelta, avvisato_at, visibili_dal, visibili, riservate }` for licei
 * students only, where `visibili` is the teachers' rule computed now with
 * the server clock, null when the feature is not available (or cannot be
 * read: never an error here, the lesson must stay submittable). Loading
 * the box records nothing: the notice itself records the first view,
 * through the student route, once it is actually on screen.
 */
async function avvisoReferente(
  admin: ReturnType<typeof getAdmin>,
  userId: string,
): Promise<{ istituto: string; adesioneId: string } | null> {
  const iscrizione = await iscrizioneLiceiPerAvviso(admin, userId);
  if (!iscrizione) return null;
  return (await statoColonnaRiflessioni(admin)) === "presente" ? iscrizione : null;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ submission: null, avviso_referente: null });

    const { searchParams } = new URL(req.url);
    const lessonSlug = searchParams.get("lesson_slug");
    if (!lessonSlug) return NextResponse.json({ error: "lesson_slug required" }, { status: 400 });

    const admin = getAdmin();
    const [{ data, error }, { avviso, passate }] = await Promise.all([
      admin
        .from("lesson_submissions")
        .select("*")
        .eq("lesson_slug", lessonSlug)
        .eq("user_id", user.id)
        .maybeSingle(),
      // Notice and choice are read only for licei students: everyone else
      // stops at the first query of `avvisoReferente`, as before. They
      // count only when recorded for the school of the current enrolment,
      // as for the teachers. The box gets the school name, never the
      // adhesion id.
      avvisoReferente(admin, user.id).then(async (a) => ({
        avviso: a ? { istituto: a.istituto } : null,
        passate: a ? await riflessioniPassatePerBox(admin, user.id, a.adesioneId) : null,
      })),
    ]);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
      submission: data ?? null,
      avviso_referente: avviso,
      ...(avviso ? { riflessioni_passate: passate } : {}),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error)?.message || "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await req.json();
    const { lesson_slug, lesson_title, reflection, question, comment } = body;

    if (!lesson_slug || !lesson_title) {
      return NextResponse.json({ error: "lesson_slug and lesson_title required" }, { status: 400 });
    }
    if (!reflection?.trim()) {
      return NextResponse.json({ error: "Reflection is required" }, { status: 400 });
    }

    const admin = getAdmin();

    // Generate student_id from user id: deterministic, no extra columns needed
    const studentId = `BIO-${new Date().getFullYear()}-${user.id.slice(0, 8).toUpperCase()}`;
    const adesso = new Date().toISOString();

    // Shared with the teachers of the school only when BOTH hold: the box
    // showed the notice (the client says so, and only the current box does)
    // and the server confirms a licei enrolment with the programme open.
    // Every other save writes null: the text saved now was written without
    // the notice, so it goes back to staff only, even if an earlier version
    // had been shared. The comment is never shared, whatever this says.
    const condivisa =
      body.avviso_referente === true && (await iscrizioneLiceiPerAvviso(admin, user.id)) !== null;

    // The saved text before this save, so the team is emailed only about a
    // question or comment that is new or changed.
    const { data: prima } = await admin
      .from("lesson_submissions")
      .select("question, comment, admin_reply")
      .eq("lesson_slug", lesson_slug)
      .eq("user_id", user.id)
      .maybeSingle();

    // Upsert: only columns that exist in the table
    const riga = {
      lesson_slug,
      lesson_title,
      user_id: user.id,
      student_id: studentId,
      reflection: reflection.trim(),
      question: question?.trim() || null,
      comment: comment?.trim() || null,
      updated_at: adesso,
    };
    const salva = (valori: Record<string, unknown>) =>
      admin
        .from("lesson_submissions")
        .upsert(valori, { onConflict: "lesson_slug,user_id" })
        .select()
        .single();

    let { data, error } = await salva({
      ...riga,
      [COLONNA_RIFLESSIONI_CONDIVISE]: condivisa ? adesso : null,
    });

    // Before the migration the column does not exist. A failed save would
    // keep the next lesson locked for everyone, so save without it: with no
    // column there is nothing to share, and the row stays staff only.
    if (error && erroreSchemaMancante(error, "colonna")) {
      ({ data, error } = await salva(riga));
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // After the response: the student's save never waits on, or fails
    // because of, the email.
    after(() =>
      notifyStaffOfSubmission(admin, {
        userId: user.id,
        lessonSlug: lesson_slug,
        lessonTitle: lesson_title,
        reflection: riga.reflection,
        before: prima ?? null,
        after: { question: riga.question, comment: riga.comment },
      }).catch((e) => console.error("Course notification failed:", (e as Error).message)),
    );

    return NextResponse.json({ submission: data });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error)?.message || "Submission failed" }, { status: 500 });
  }
}
