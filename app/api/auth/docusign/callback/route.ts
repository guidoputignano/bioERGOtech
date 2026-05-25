import { NextRequest, NextResponse } from "next/server";

// GET /api/auth/docusign/callback
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return new NextResponse(`<html><body style="font-family:sans-serif;padding:40px">
      <h2 style="color:#e55">DocuSign Auth Failed</h2><p>${error}</p>
    </body></html>`, { headers: { "Content-Type": "text/html" } });
  }

  if (!code) {
    return NextResponse.json({ error: "No code returned" }, { status: 400 });
  }

  // Retrieve PKCE code_verifier from cookie
  const codeVerifier = req.cookies.get("ds_code_verifier")?.value;
  if (!codeVerifier) {
    return new NextResponse(`<html><body style="font-family:sans-serif;padding:40px">
      <h2 style="color:#e55">Session Expired</h2>
      <p>The PKCE code verifier cookie was not found. Please <a href="/api/auth/docusign">try again</a>.</p>
    </body></html>`, { headers: { "Content-Type": "text/html" } });
  }

  const clientId    = process.env.DOCUSIGN_CLIENT_ID!;
  const clientSecret = process.env.DOCUSIGN_CLIENT_SECRET!;
  const siteUrl     = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bioergotech.org";
  const redirectUri = `${siteUrl}/api/auth/docusign/callback`;

  // Exchange code for tokens using PKCE code_verifier
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const tokenRes = await fetch("https://account-d.docusign.com/oauth/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type:    "authorization_code",
      code,
      redirect_uri:  redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  const tokens = await tokenRes.json();
  if (tokens.error) {
    return new NextResponse(`<html><body style="font-family:sans-serif;padding:40px">
      <h2 style="color:#e55">Token Exchange Failed</h2>
      <p>${tokens.error}: ${tokens.error_description}</p>
    </body></html>`, { headers: { "Content-Type": "text/html" } });
  }

  // Get user account info
  const userRes  = await fetch("https://account-d.docusign.com/oauth/userinfo", {
    headers: { "Authorization": `Bearer ${tokens.access_token}` },
  });
  const userInfo = await userRes.json();
  const account  = userInfo.accounts?.[0];

  const html = `
    <html>
    <head><title>DocuSign Connected — bioERGOtech</title></head>
    <body style="font-family:'Segoe UI',sans-serif;padding:40px;max-width:700px;margin:0 auto;background:#f0f4f8">
      <div style="background:#fff;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
        <div style="color:#2EC4B6;font-size:28px;margin-bottom:8px">✓</div>
        <h2 style="margin:0 0 8px;color:#1A2332">DocuSign connected successfully</h2>
        <p style="color:#6b7a8d;margin:0 0 24px">Add these three values to Vercel → Environment Variables, then redeploy.</p>

        <div style="margin-bottom:16px">
          <div style="font-size:11px;font-weight:700;color:#6b7a8d;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">DOCUSIGN_REFRESH_TOKEN</div>
          <div style="background:#f8fafb;border:1px solid #dde3ec;border-radius:8px;padding:12px;font-family:monospace;font-size:11px;word-break:break-all">${tokens.refresh_token || "⚠️ No refresh token returned"}</div>
        </div>

        <div style="margin-bottom:16px">
          <div style="font-size:11px;font-weight:700;color:#6b7a8d;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">DOCUSIGN_ACCOUNT_ID</div>
          <div style="background:#f8fafb;border:1px solid #dde3ec;border-radius:8px;padding:12px;font-family:monospace;font-size:13px">${account?.account_id || "Not found"}</div>
        </div>

        <div style="margin-bottom:16px">
          <div style="font-size:11px;font-weight:700;color:#6b7a8d;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">DOCUSIGN_BASE_URI</div>
          <div style="background:#f8fafb;border:1px solid #dde3ec;border-radius:8px;padding:12px;font-family:monospace;font-size:13px">${account?.base_uri || "https://demo.docusign.net"}</div>
        </div>

        <div style="background:#fff8e6;border:1px solid #e89c1a40;border-radius:8px;padding:14px;font-size:13px;color:#9a6500;margin-top:16px">
          <strong>Important:</strong> Copy all three values before closing this page — the refresh token is only shown once.
          After adding to Vercel, redeploy for the DocuSign button to work in the portal.
        </div>
      </div>
    </body>
    </html>`;

  const response = new NextResponse(html, { headers: { "Content-Type": "text/html" } });
  // Clear the code_verifier cookie
  response.cookies.delete("ds_code_verifier");
  return response;
}