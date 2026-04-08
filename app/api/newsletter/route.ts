import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Public POST endpoint — receives subscriptions from the newsletter popup
// and the registration form. Does NOT require authentication.
// Place this file at: app/api/newsletter/route.ts

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, full_name, source } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("newsletter_subscribers")
      .upsert(
        {
          email: email.trim().toLowerCase(),
          full_name: full_name?.trim() || "",
          source: source || "popup",
          subscribed_at: new Date().toISOString(),
          is_active: true,
        },
        { onConflict: "email" }
      );

    if (error) {
      console.error("[newsletter/route] Supabase error:", error.message);
      return NextResponse.json(
        { error: "Failed to subscribe. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[newsletter/route] Unexpected error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
