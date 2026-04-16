import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const getClient = () =>
  createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

// GET /api/coins?userId=xxx        → get balance + transactions for a user
// GET /api/coins?all=true          → get all users' balances (admin)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const all = searchParams.get("all") === "true";

  if (all) {
    // Admin view — all users with balances
    const { data, error } = await getClient()
      .from("coin_balances")
      .select(`
        *,
        profiles:user_id (
          id,
          email,
          full_name,
          partnership_level
        )
      `)
      .order("lifetime_earned", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ balances: data });
  }

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  // Get balance
  const { data: balance, error: balanceError } = await getClient()
    .from("coin_balances")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (balanceError && balanceError.code !== "PGRST116") {
    return NextResponse.json({ error: balanceError.message }, { status: 500 });
  }

  // Get last 20 transactions
  const { data: transactions, error: txError } = await getClient()
    .from("coin_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (txError) return NextResponse.json({ error: txError.message }, { status: 500 });

  return NextResponse.json({
    balance: balance || { user_id: userId, balance: 0, lifetime_earned: 0, tier: "Explorer" },
    transactions: transactions || [],
  });
}

// POST /api/coins — award or deduct coins
// { userId, amount, reason, type: "earn" | "spend" | "admin" }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, amount, reason, type } = body;

    if (!userId || amount === undefined || !reason || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const client = getClient();

    // Get current balance
    const { data: existing } = await client
      .from("coin_balances")
      .select("*")
      .eq("user_id", userId)
      .single();

    const currentBalance = existing?.balance ?? 0;
    const currentLifetime = existing?.lifetime_earned ?? 0;

    // Check sufficient balance for spend
    if (type === "spend" && currentBalance + amount < 0) {
      return NextResponse.json({ error: "Insufficient coins" }, { status: 400 });
    }

    const newBalance = currentBalance + amount;
    const newLifetime = amount > 0 ? currentLifetime + amount : currentLifetime;

    // Upsert balance
    const { data: updatedBalance, error: upsertError } = await client
      .from("coin_balances")
      .upsert({
        user_id: userId,
        balance: newBalance,
        lifetime_earned: newLifetime,
      }, { onConflict: "user_id" })
      .select()
      .single();

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    // Log transaction
    const { error: txError } = await client
      .from("coin_transactions")
      .insert({ user_id: userId, amount, reason, type });

    if (txError) {
      return NextResponse.json({ error: txError.message }, { status: 500 });
    }

    // If balance is zero or below, note it (admin can check the coins tab)
    if (newBalance <= 0) {
      console.warn(`User ${userId} has zero or negative coin balance`);
    }

    return NextResponse.json({ balance: updatedBalance });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}