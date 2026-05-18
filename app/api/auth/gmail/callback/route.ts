import { NextRequest, NextResponse } from "next/server";

// GET /api/auth/gmail/callback
// Handles the OAuth callback from Google and exchanges the code for tokens
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return new NextResponse(`
      <html><body style="font-family:sans-serif;padding:40px">
        <h2 style="color:#e55">Gmail Auth Failed</h2>
        <p>Error: ${error}</p>
        <p>Go back and try again.</p>
      </body></html>
    `, { headers: { "Content-Type": "text/html" } });
  }

  if (!code) {
    return NextResponse.json({ error: "No code returned from Google" }, { status: 400 });
  }

  const clientId     = process.env.GMAIL_CLIENT_ID!;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET!;
  const redirectUri  = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/gmail/callback`;

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  redirectUri,
      grant_type:    "authorization_code",
    }),
  });

  const tokens = await tokenRes.json();

  if (tokens.error) {
    return new NextResponse(`
      <html><body style="font-family:sans-serif;padding:40px">
        <h2 style="color:#e55">Token Exchange Failed</h2>
        <p>${tokens.error}: ${tokens.error_description}</p>
      </body></html>
    `, { headers: { "Content-Type": "text/html" } });
  }

  // Show the refresh token — user must copy this to Vercel env vars
  return new NextResponse(`
    <html>
    <head><title>Gmail Auth Success — bioERGOtech</title></head>
    <body style="font-family:'Segoe UI',sans-serif;padding:40px;max-width:700px;margin:0 auto;background:#f0f4f8">
      <div style="background:#fff;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
        <div style="color:#008F6B;font-size:28px;margin-bottom:8px">✓</div>
        <h2 style="margin:0 0 8px;color:#0A1628">Gmail authorised successfully</h2>
        <p style="color:#6b7a8d;margin:0 0 24px">Copy the refresh token below and add it to your Vercel environment variables.</p>

        <div style="margin-bottom:20px">
          <div style="font-size:11px;font-weight:700;color:#6b7a8d;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">
            GMAIL_REFRESH_TOKEN — add this to Vercel env vars
          </div>
          <div style="background:#f8fafb;border:1px solid #dde3ec;border-radius:8px;padding:14px;font-family:'Courier New',monospace;font-size:13px;word-break:break-all;color:#0A1628">
            ${tokens.refresh_token || "⚠️ No refresh token returned — make sure you selected the outreach@bioergotech.org account and granted all permissions"}
          </div>
        </div>

        <div style="background:#fff8e6;border:1px solid #e89c1a40;border-radius:8px;padding:14px;font-size:13px;color:#9a6500;margin-bottom:20px">
          <strong>Important:</strong> This refresh token is shown only once. Copy it now and add it to:<br>
          Vercel → Project Settings → Environment Variables → <code>GMAIL_REFRESH_TOKEN</code>
        </div>

        <div style="font-size:12px;color:#8896a6">
          Access token (expires in 1 hour — do NOT use this):<br>
          <span style="font-family:monospace">${tokens.access_token?.slice(0, 40)}...</span>
        </div>

        <div style="margin-top:24px;padding-top:20px;border-top:1px solid #edf0f5;font-size:13px;color:#6b7a8d">
          After adding <code>GMAIL_REFRESH_TOKEN</code> to Vercel and redeploying,
          the reply checker cron job will start running automatically every 5 minutes.
        </div>
      </div>
    </body>
    </html>
  `, { headers: { "Content-Type": "text/html" } });
}
