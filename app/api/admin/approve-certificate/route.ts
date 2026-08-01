import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { Resend } from "resend";
import { generateCertificatePptx, generateCertId } from "@/lib/certificate/generate";

/**
 * POST /api/admin/approve-certificate
 * Body: { user_id: string }
 * 
 * 1. Looks up student profile (name, email, student_id)
 * 2. Generates a PPTX certificate
 * 3. Emails it to the student via Resend
 * 4. Stores the cert_id in the profiles table
 */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  const admin = client;

  try {
    const { user_id } = await req.json();
    if (!user_id) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    // 1. Fetch student profile
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, email, full_name, student_id")
      .eq("id", user_id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    const recipientName = profile.full_name || profile.email;
    const studentId = profile.student_id || `BIO-${new Date().getFullYear()}-${user_id.slice(0, 8).toUpperCase()}`;
    const certId = generateCertId();
    const issueDate = new Date().toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric",
    });

    // 2. Generate certificate PPTX
    const pptxBuffer = await generateCertificatePptx({
      recipientName,
      studentId,
      certId,
      issueDate,
    });

    // 3. Store cert_id in profiles table
    await admin
      .from("profiles")
      .update({ cert_id: certId, cert_issued_at: new Date().toISOString() })
      .eq("id", user_id);

    // 4. Send email with certificate attached
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error: emailError } = await resend.emails.send({
      from: "bioERGOtech Foundation <certificates@bioergotech.org>",
      to: profile.email,
      subject: "Your bioERGOtech Certificate of Completion 🎓",
      html: buildEmailHtml(recipientName, certId, issueDate),
      attachments: [
        {
          filename: `bioERGOtech-Certificate-${certId}.pptx`,
          content: pptxBuffer,
        },
      ],
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      return NextResponse.json({ error: "Certificate generated but email failed", emailError }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      certId,
      sentTo: profile.email,
      recipientName,
    });

  } catch (error: unknown) {
    console.error("Certificate generation error:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Certificate generation failed" },
      { status: 500 }
    );
  }
}

function buildEmailHtml(name: string, certId: string, issueDate: string): string {
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
              <strong style="color:#0A1628;"> 10-Week Agentic AI High School Innovation Program</strong>
              — a rigorous, hands-on course in agentic AI, machine learning ethics, and real-world agent development.
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
              and ethical awareness you have developed is genuinely rare — and genuinely valuable.
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
