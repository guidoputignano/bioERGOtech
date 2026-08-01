import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

async function awardCoins(
  client: SupabaseClient,
  userId: string,
  amount: number,
  reason: string
) {
  const { data: existing } = await client
    .from("coin_balances")
    .select("balance, lifetime_earned")
    .eq("user_id", userId)
    .single();

  const currentBalance = existing?.balance ?? 0;
  const currentLifetime = existing?.lifetime_earned ?? 0;

  await client.from("coin_balances").upsert(
    {
      user_id: userId,
      balance: currentBalance + amount,
      lifetime_earned: currentLifetime + amount,
    },
    { onConflict: "user_id" }
  );

  await client.from("coin_transactions").insert({
    user_id: userId,
    amount,
    reason,
    type: "earn",
  });
}

// GET /api/admin/attendance?event_id=xxx
// Returns all attendees for a given event, with profile info
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("event_id");

  if (!eventId) {
    return NextResponse.json({ error: "event_id is required" }, { status: 400 });
  }


  const { data, error } = await client
    .from("event_attendees")
    .select(
      `
      id,
      attended,
      coins_awarded,
      created_at,
      user_id,
      profiles:user_id (
        id,
        full_name,
        email,
        avatar_url,
        organization
      )
    `
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ attendees: data });
}

// POST /api/admin/attendance
// Body: { event_id, user_ids: string[], marked_by: string }
// Marks users as attended, awards coins (+20 attendee, +60 if host)
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  const body = await req.json();
  const { event_id, user_ids, marked_by } = body;

  if (!event_id || !user_ids?.length || !marked_by) {
    return NextResponse.json(
      { error: "event_id, user_ids, and marked_by are required" },
      { status: 400 }
    );
  }


  // Fetch the event to determine who the host/creator is
  const { data: event, error: eventError } = await client
    .from("events")
    .select("id, created_by, title")
    .eq("id", event_id)
    .single();

  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const results: { user_id: string; status: string; coins: number }[] = [];

  for (const userId of user_ids) {
    // Check if already marked
    const { data: existing } = await client
      .from("event_attendees")
      .select("id, coins_awarded")
      .eq("event_id", event_id)
      .eq("user_id", userId)
      .single();

    if (existing) {
      // Already recorded — skip if coins already awarded
      if (existing.coins_awarded) {
        results.push({ user_id: userId, status: "already_awarded", coins: 0 });
        continue;
      }

      // Coins not yet awarded — award now and mark
      const isHost = event.created_by === userId;
      const coinAmount = isHost ? 60 : 20;
      const reason = isHost
        ? `Hosted event: ${event.title}`
        : `Attended event: ${event.title}`;

      await awardCoins(client, userId, coinAmount, reason);

      await client
        .from("event_attendees")
        .update({ coins_awarded: true, attended: true })
        .eq("id", existing.id);

      results.push({ user_id: userId, status: "coins_awarded", coins: coinAmount });
      continue;
    }

    // New attendance record
    const isHost = event.created_by === userId;
    const coinAmount = isHost ? 60 : 20;
    const reason = isHost
      ? `Hosted event: ${event.title}`
      : `Attended event: ${event.title}`;

    const { error: insertError } = await client.from("event_attendees").insert({
      event_id,
      user_id: userId,
      marked_by,
      attended: true,
      coins_awarded: true,
    });

    if (insertError) {
      results.push({ user_id: userId, status: "error", coins: 0 });
      continue;
    }

    await awardCoins(client, userId, coinAmount, reason);
    results.push({ user_id: userId, status: "marked_and_awarded", coins: coinAmount });
  }

  return NextResponse.json({ results });
}

// DELETE /api/admin/attendance
// Body: { event_id, user_id }
// Removes attendance record (does NOT reverse coin award)
export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  const body = await req.json();
  const { event_id, user_id } = body;

  if (!event_id || !user_id) {
    return NextResponse.json(
      { error: "event_id and user_id are required" },
      { status: 400 }
    );
  }


  const { error } = await client
    .from("event_attendees")
    .delete()
    .eq("event_id", event_id)
    .eq("user_id", user_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
