import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { Resend } from "resend";
import { generateCertificatePptx, generateCertId } from "@/lib/certificate/generate";
import { loadStudentState, studentIdFor } from "@/lib/course/data";

/** Printed on the certificate, stored with it, and shown on /verify. */
const COURSE_TITLE = "Agentic AI Program";

/**
 * POST /api/admin/approve-certificate
 * Body: { user_id: string, resend?: boolean, override_reason?: string }
 *
 * 1. Refuses if the student already holds a certificate (unless `resend`,
 *    which emails the existing one again under the same id).
 * 2. Checks eligibility on the server, with the same rule the Course
 *    Monitor and the student's project box show. An admin can issue to a
 *    student outside the rule only by giving a reason, which is stored.
 * 3. Records the certificate in course_certificates, the table the public
 *    /verify page reads. The unique user_id makes a second issue impossible
 *    even if two admins click at once.
 * 4. Generates the PPTX and emails it via Resend.
 */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client, chiamante } = guard;

  try {
    const body = (await req.json().catch(() => ({}))) as {
      user_id?: string;
      resend?: boolean;
      override_reason?: string;
    };
    const userId = body.user_id;
    if (!userId) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("id, email, full_name, student_id")
      .eq("id", userId)
      .single();
    if (profileError || !profile) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    const state = await loadStudentState(client, userId);
    const existing = state.certificate && !state.certificate.revoked_at ? state.certificate : null;

    // ── Resend an existing certificate ──
    if (existing) {
      if (!body.resend) {
        return NextResponse.json(
          { error: "A certificate has already been issued to this student", certId: existing.cert_id },
          { status: 409 },
        );
      }
      const { data: cert } = await client
        .from("course_certificates")
        .select("cert_id, recipient_name, student_id, course_title, issued_at")
        .eq("cert_id", existing.cert_id)
        .single();
      if (!cert) return NextResponse.json({ error: "Certificate record not found" }, { status: 404 });
      // The stored title, not today's: a resend reproduces the certificate
      // exactly as issued, matching what /verify shows for this id.
      const sent = await sendCertificate({
        to: profile.email,
        recipientName: cert.recipient_name,
        studentId: cert.student_id ?? studentIdFor(userId),
        certId: cert.cert_id,
        courseTitle: cert.course_title,
        issuedAt: cert.issued_at,
      });
      if (!sent.ok) return NextResponse.json({ error: "Email failed", detail: sent.error }, { status: 502 });
      await client.from("course_certificates").update({ emailed_at: new Date().toISOString() }).eq("cert_id", cert.cert_id);
      return NextResponse.json({ success: true, resent: true, certId: cert.cert_id, sentTo: profile.email });
    }

    // ── Issue a new one ──
    const overrideReason = body.override_reason?.trim() || null;
    if (!state.eligibility.eligible && !overrideReason) {
      return NextResponse.json(
        { error: "Student is not eligible yet", reasons: state.eligibility.reasons },
        { status: 422 },
      );
    }

    // The id the student already sees on every lesson page.
    const { data: firstSub } = await client
      .from("lesson_submissions")
      .select("student_id")
      .eq("user_id", userId)
      .not("student_id", "is", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const studentId = profile.student_id || firstSub?.student_id || studentIdFor(userId);
    const recipientName = profile.full_name || profile.email;
    const issuedAt = new Date().toISOString();

    let certId = "";
    for (let attempt = 0; attempt < 3 && !certId; attempt++) {
      const candidate = generateCertId();
      const { error } = await client.from("course_certificates").insert({
        cert_id: candidate,
        user_id: userId,
        recipient_name: recipientName,
        student_id: studentId,
        course_title: COURSE_TITLE,
        project_url: state.project?.html_url ?? null,
        submitted_commit: state.membership?.submitted_commit ?? null,
        issued_at: issuedAt,
        issued_by: chiamante.id,
        override_reason: overrideReason,
      });
      if (!error) {
        certId = candidate;
      } else if (error.code === "23505" && error.message.includes("user_id")) {
        return NextResponse.json({ error: "A certificate has already been issued to this student" }, { status: 409 });
      } else if (error.code !== "23505") {
        throw new Error(error.message);
      }
      // Any other 23505 is a cert_id collision: try a fresh id.
    }
    if (!certId) throw new Error("Could not allocate a certificate id");

    const sent = await sendCertificate({
      to: profile.email,
      recipientName,
      studentId,
      certId,
      courseTitle: COURSE_TITLE,
      issuedAt,
    });
    if (!sent.ok) {
      console.error("Resend error:", sent.error);
      // The certificate exists and verifies. Only the email needs retrying.
      return NextResponse.json(
        { error: "Certificate issued but the email failed. Use Resend to try again.", certId, emailError: sent.error },
        { status: 502 },
      );
    }
    await client.from("course_certificates").update({ emailed_at: new Date().toISOString() }).eq("cert_id", certId);

    return NextResponse.json({ success: true, certId, sentTo: profile.email, recipientName });
  } catch (error: unknown) {
    console.error("Certificate generation error:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Certificate generation failed" },
      { status: 500 },
    );
  }
}

async function sendCertificate(input: {
  to: string;
  recipientName: string;
  studentId: string;
  certId: string;
  courseTitle: string;
  issuedAt: string;
}): Promise<{ ok: boolean; error?: unknown }> {
  const issueDate = new Date(input.issuedAt).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
  const pptxBuffer = await generateCertificatePptx({
    recipientName: input.recipientName,
    studentId: input.studentId,
    courseTitle: input.courseTitle,
    certId: input.certId,
    issueDate,
  });
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: "bioERGOtech Foundation <certificates@bioergotech.org>",
    to: input.to,
    subject: "Your bioERGOtech Certificate of Completion 🎓",
    html: buildEmailHtml(input.recipientName, input.certId, issueDate, input.courseTitle),
    attachments: [{ filename: `bioERGOtech-Certificate-${input.certId}.pptx`, content: pptxBuffer }],
  });
  return error ? { ok: false, error } : { ok: true };
}

function buildEmailHtml(name: string, certId: string, issueDate: string, courseTitle: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#F5F8F6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F8F6;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;max-width:600px;">

        <!-- Header -->
        <tr>
          <td style="background:#0A1628;padding:28px 40px;text-align:center;">
            <p style="margin:0;font-size:22px;font-weight:700;color:#00C896;letter-spacing:-0.5px;">
              bio<span style="color:#FFFFFF;">ERGO</span>tech
            </p>
            <p style="margin:6px 0 0;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#7AA890;">
              Foundation · Fondazione ETS
            </p>
          </td>
        </tr>

        <!-- Teal accent line -->
        <tr><td style="height:4px;background:#00C896;"></td></tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#00A87D;">
              Certificate of Completion
            </p>
            <h1 style="margin:0 0 20px;font-size:26px;font-weight:700;color:#0A1628;line-height:1.2;">
              Congratulations, ${name}!
            </h1>
            <p style="margin:0 0 16px;font-size:15px;color:#4A5568;line-height:1.7;">
              You have successfully completed the
              <strong style="color:#0A1628;"> ${courseTitle}</strong>,
              a rigorous, hands-on course in agentic AI, machine learning ethics, and real-world agent development.
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#4A5568;line-height:1.7;">
              Your certificate is attached to this email as a PowerPoint file. Open it in Microsoft PowerPoint
              or Google Slides to view, print, or share your achievement.
            </p>

            <!-- Certificate ID box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F8F6;border-radius:8px;border-left:4px solid #00C896;margin-bottom:28px;">
              <tr>
                <td style="padding:14px 18px;">
                  <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#00A87D;">Certificate Details</p>
                  <p style="margin:0 0 2px;font-size:13px;color:#0A1628;"><strong>Certificate ID:</strong> ${certId}</p>
                  <p style="margin:0 0 2px;font-size:13px;color:#0A1628;"><strong>Issue Date:</strong> ${issueDate}</p>
                  <p style="margin:0;font-size:13px;color:#0A1628;"><strong>Verify:</strong>
                    <a href="https://bioergotech.org/verify/${certId}" style="color:#00A87D;">bioergotech.org/verify/${certId}</a>
                  </p>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="background:#00C896;border-radius:8px;padding:12px 28px;">
                  <a href="https://bioergotech.org" style="color:#0A1628;font-size:14px;font-weight:700;text-decoration:none;">
                    Visit bioERGOtech →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:14px;color:#6B7B8D;line-height:1.7;">
              We are proud of what you have built. The combination of technical capability, domain knowledge,
              and ethical awareness you have developed is genuinely rare, and genuinely valuable.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0A1628;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#7AA890;">
              bioERGOtech Foundation ETS · Via Ciro Giovinazzi 70, 74123 Taranto, Italy
            </p>
            <p style="margin:6px 0 0;font-size:11px;color:#4A6B5E;">
              <a href="https://bioergotech.org" style="color:#4A6B5E;">bioergotech.org</a>
              &nbsp;·&nbsp;
              <a href="mailto:info@bioergotech.org" style="color:#4A6B5E;">info@bioergotech.org</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
  `.trim();
}
