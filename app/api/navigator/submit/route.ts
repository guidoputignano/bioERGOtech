import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { computeEligibility, NavigatorAnswers, EligibleScheme } from "@/lib/navigator/rules-engine";
import { NAVIGATOR_QUESTIONS } from "@/lib/navigator/questions";

const getDB = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

function optionLabel(questionId: string, value: string): string {
  const question = NAVIGATOR_QUESTIONS.find((q) => q.id === questionId);
  return question?.options?.find((o) => o.value === value)?.label || value;
}

function optionLabels(questionId: string, values: string[]): string[] {
  return values.map((v) => optionLabel(questionId, v));
}

export async function POST(req: NextRequest) {
  try {
    const answers: NavigatorAnswers & { email: string } = await req.json();

    if (
      !answers.email?.includes("@") ||
      !answers.organisation_name?.trim() ||
      !answers.org_type ||
      !answers.region?.trim() ||
      !answers.stage ||
      (answers.region.trim() === "Italy" && !answers.italy_subregion)
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const eligible = await computeEligibility(
      answers,
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const db = getDB();

    // 1. Store the session
    const { data: session, error: sessionError } = await db
      .from("navigator_sessions")
      .insert({
        organisation_name: answers.organisation_name.trim(),
        org_type: answers.org_type,
        region: answers.region.trim(),
        italy_subregion: answers.italy_subregion ?? null,
        stage: answers.stage,
        interest_areas: answers.interest_areas,
        existing_support: answers.existing_support,
        existing_support_detail: answers.existing_support_detail ?? null,
        goals: answers.goals,
        email: answers.email.trim().toLowerCase(),
        eligible_schemes: eligible,
        completed: true,
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    // 2. Link into the existing outreach CRM (outreach_contacts). Always insert a
    //    new row rather than upsert by email — this project's CRM never writes by
    //    email elsewhere, and an existing tracked institution (e.g. a Signed MoU)
    //    must never be silently overwritten or regressed by a Navigator submission.
    const interestLabels = optionLabels("interest_areas", answers.interest_areas);
    const goalLabels = optionLabels("goals", answers.goals);
    const orgTypeLabel = optionLabel("org_type", answers.org_type);

    const notesLines = [
      `[Navigator] Submitted ${new Date().toLocaleDateString("en-GB")}`,
      ...(answers.italy_subregion ? [`Italy sub-region: ${answers.italy_subregion}`] : []),
      `Stage: ${answers.stage}`,
      `Interests: ${interestLabels.join(", ") || "—"}`,
      `Goals: ${goalLabels.join(", ") || "—"}`,
      `Existing grants/incentives: ${answers.existing_support}${answers.existing_support_detail ? ` (${answers.existing_support_detail})` : ""}`,
      `Eligible schemes shown: ${eligible.map((s) => s.scheme_name).join(", ") || "none matched"}`,
    ];

    const { error: contactError } = await db.from("outreach_contacts").insert({
      name: answers.organisation_name.trim(),
      email: answers.email.trim().toLowerCase(),
      country: answers.region.trim(),
      type: orgTypeLabel,
      category: orgTypeLabel,
      field_of_interest: interestLabels.join(", ") || null,
      email_status: "Warm",
      response_status: "Warm",
      funnel_stage: "warm_response", // self-identified interest, not cold-contacted
      source: "navigator",
      navigator_session_id: session.id,
      notes: notesLines.join("\n"),
    });

    if (contactError) console.error("outreach_contacts insert failed (non-fatal):", contactError.message);

    // 3. Email the results — direct fetch to Resend, matching the rest of the
    //    outreach codebase (see app/api/cron/mou-followup/route.ts).
    await sendResultsEmail(answers.email.trim().toLowerCase(), eligible);

    return NextResponse.json({ eligible, sessionId: session.id });
  } catch (err) {
    console.error("Navigator submit error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

async function sendResultsEmail(toEmail: string, eligible: EligibleScheme[]) {
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "outreach@bioergotech.org";
  if (!resendKey) return;

  const schemesHtml = eligible.length
    ? `<ul>${eligible
        .map((s) => `<li><strong>${s.scheme_name}</strong> — ${s.scheme_description}</li>`)
        .join("")}</ul>`
    : `<p>Based on your answers, we didn't find an exact match today — but our team may still be able to help. Reply to this email and we'll take a closer look.</p>`;

  const html = `
    <div style="font-family: Poppins, Arial, sans-serif; color: #1A2332;">
      <h2 style="color: #1A2332;">Your bioERGOtech funding readout</h2>
      <p>Thanks for using the Grant &amp; Funding Eligibility Navigator. Here's what you may be eligible for:</p>
      ${schemesHtml}
      <p>Want to talk it through? <a href="https://bioergotech.org/contact" style="color: #2EC4B6;">Get in touch</a> with our team.</p>
      <p>With warm regards,<br>Guido Putignano<br>President, bioERGOtech Foundation</p>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
    body: JSON.stringify({
      from: `Guido Putignano · bioERGOtech Foundation <${fromEmail}>`,
      to: [toEmail],
      subject: "Your funding & grant eligibility results",
      html,
    }),
  });

  if (!res.ok) {
    console.error("Resend send failed:", await res.text());
  }
}
