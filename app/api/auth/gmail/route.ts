import { NextResponse } from "next/server";

// GET /api/auth/gmail
// Redirects to Google OAuth consent screen
// Visit this URL once from the browser while logged in as outreach@bioergotech.org
export async function GET() {
  const clientId    = process.env.GMAIL_CLIENT_ID!;
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/gmail/callback`;

  if (!clientId) {
    return NextResponse.json({
      error: "GMAIL_CLIENT_ID not set in environment variables",
      setup: "Add GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET to Vercel env vars first",
    }, { status: 500 });
  }

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",  // read emails
      "https://www.googleapis.com/auth/gmail.modify",    // mark as read
    ].join(" "),
    access_type:   "offline",   // gives us a refresh token
    prompt:        "consent",   // force consent screen to always return refresh_token
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  return NextResponse.redirect(authUrl);
}
