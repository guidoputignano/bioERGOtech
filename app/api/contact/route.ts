import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const NOTIFICATION_RECIPIENTS = [
  'info@bioergotech.org',
  'olufemi.yusuf@bioergotech.org',
  'guido.putignano@bioergotech.org',
];

export async function POST(request: NextRequest) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const body = await request.json();
    const { name, email, organisation, subject, message } = body;

    // Basic server-side validation
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // 1. Send notification email to bioERGOtech team
    await resend.emails.send({
      from: 'bioERGOtech Contact Form <noreply@bioergotech.org>',
      to: NOTIFICATION_RECIPIENTS,
      replyTo: email,
      subject: `[Contact Form] ${subject} — from ${name}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          
          <!-- Header -->
          <div style="background: #0A1628; padding: 32px 40px; border-radius: 12px 12px 0 0;">
            <h1 style="color: #00C896; font-size: 22px; margin: 0; font-weight: 700; letter-spacing: -0.5px;">
              bioERGOtech Foundation
            </h1>
            <p style="color: #94A3B8; font-size: 13px; margin: 4px 0 0;">New contact form submission</p>
          </div>

          <!-- Body -->
          <div style="padding: 36px 40px; background: #F8FAFB; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 12px 12px;">
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #E2E8F0; color: #718096; font-size: 13px; width: 130px; vertical-align: top; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Name</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #E2E8F0; color: #0A1628; font-size: 14px; font-weight: 500;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #E2E8F0; color: #718096; font-size: 13px; vertical-align: top; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Email</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #E2E8F0; color: #0A1628; font-size: 14px;">
                  <a href="mailto:${email}" style="color: #008F6B; text-decoration: none;">${email}</a>
                </td>
              </tr>
              ${organisation ? `
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #E2E8F0; color: #718096; font-size: 13px; vertical-align: top; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Organisation</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #E2E8F0; color: #0A1628; font-size: 14px;">${organisation}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #E2E8F0; color: #718096; font-size: 13px; vertical-align: top; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Subject</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #E2E8F0; color: #0A1628; font-size: 14px; font-weight: 600;">${subject}</td>
              </tr>
            </table>

            <div style="background: white; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px;">
              <p style="color: #718096; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px;">Message</p>
              <p style="color: #0A1628; font-size: 14px; line-height: 1.7; margin: 0; white-space: pre-wrap;">${message}</p>
            </div>

            <div style="margin-top: 24px; padding: 16px; background: #00C896/10; border-left: 3px solid #00C896; border-radius: 0 6px 6px 0; background-color: #f0fdf9;">
              <p style="color: #065f46; font-size: 13px; margin: 0;">
                💡 Reply directly to this email to respond to <strong>${name}</strong> at <strong>${email}</strong>
              </p>
            </div>

            <p style="color: #A0AEC0; font-size: 11px; margin: 28px 0 0; text-align: center;">
              Submitted via bioergotech.org/contact · ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/Rome', dateStyle: 'medium', timeStyle: 'short' })} CET
            </p>
          </div>
        </div>
      `,
    });

    // 2. Send auto-reply to the person who submitted
    await resend.emails.send({
      from: 'bioERGOtech Foundation <noreply@bioergotech.org>',
      to: email,
      subject: `We've received your message — bioERGOtech Foundation`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          
          <div style="background: #0A1628; padding: 32px 40px; border-radius: 12px 12px 0 0;">
            <h1 style="color: #00C896; font-size: 22px; margin: 0; font-weight: 700;">bioERGOtech Foundation</h1>
            <p style="color: #94A3B8; font-size: 13px; margin: 4px 0 0;">Agentic AI High School Innovation Program</p>
          </div>

          <div style="padding: 36px 40px; background: #F8FAFB; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #0A1628; font-size: 20px; margin: 0 0 12px; font-weight: 700;">Thank you, ${name}!</h2>
            <p style="color: #4A5568; font-size: 15px; line-height: 1.7; margin: 0 0 16px;">
              We've received your message regarding <strong>${subject}</strong> and will get back to you within 1–2 business days.
            </p>
            <p style="color: #4A5568; font-size: 15px; line-height: 1.7; margin: 0 0 28px;">
              In the meantime, feel free to explore the Agentic AI High School Innovation Program — a free 10-week course helping students build real AI systems.
            </p>

            <a href="https://www.bioergotech.org/courses/agentic-ai" 
               style="display: inline-block; background: #0A1628; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 14px; font-weight: 600;">
              Explore the AI Course →
            </a>

            <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 32px 0;" />
            <p style="color: #A0AEC0; font-size: 12px; margin: 0; line-height: 1.6;">
              bioERGOtech Foundation · Taranto, Italy<br>
              <a href="mailto:info@bioergotech.org" style="color: #008F6B;">info@bioergotech.org</a> · 
              <a href="https://www.bioergotech.org" style="color: #008F6B;">www.bioergotech.org</a>
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Failed to send message. Please try again.' },
      { status: 500 }
    );
  }
}
