import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const getClient = () =>
  createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

// GET /api/redemptions          → all requests (admin)
// GET /api/redemptions?userId=x → user's own requests
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  let query = getClient()
    .from("redemption_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data });
}

// POST /api/redemptions → create a redemption request
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, userEmail, userName, itemId, itemLabel, coinsSpent } = body;

    if (!userId || !itemId || !coinsSpent) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data, error } = await getClient()
      .from("redemption_requests")
      .insert({
        user_id: userId,
        user_email: userEmail,
        user_name: userName || null,
        item_id: itemId,
        item_label: itemLabel,
        coins_spent: coinsSpent,
        status: "pending",
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ request: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// PATCH /api/redemptions → admin actions a request
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, adminNotes } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
    }

    const { data, error } = await getClient()
      .from("redemption_requests")
      .update({
        status,
        admin_notes: adminNotes || null,
        actioned_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ request: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}