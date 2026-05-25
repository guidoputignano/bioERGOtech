import { NextResponse } from "next/server";
import crypto from "crypto";

// GET /api/auth/docusign
// Redirects to DocuSign with PKCE code challenge
export async function GET() {
  const clientId    = process.env.DOCUSIGN_CLIENT_ID;
  const siteUrl     = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bioergotech.org";
  const redirectUri = `${siteUrl}/api/auth/docusign/callback`;

  if (!clientId) {
    return NextResponse.json({
      error: "DOCUSIGN_CLIENT_ID not set",
      setup: "Add DOCUSIGN_CLIENT_ID and DOCUSIGN_CLIENT_SECRET to Vercel env vars",
    }, { status: 500 });
  }

  // Generate PKCE code verifier + challenge
  const codeVerifier  = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");

  const authUrl =
    `https://account-d.docusign.com/oauth/auth` +
    `?response_type=code` +
    `&scope=signature` +
    `&client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&code_challenge=${codeChallenge}` +
    `&code_challenge_method=S256`;

  const response = NextResponse.redirect(authUrl);

  // Store code_verifier in cookie for the callback to read
  response.cookies.set("ds_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 300, // 5 minutes
    path: "/",
  });

  return response;
}
