import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireMember } from "@/lib/auth/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

async function awardCoins(client: SupabaseClient, userId: string, amount: number, reason: string) {
  try {
      const { data: existing } = await client.from("coin_balances").select("balance, lifetime_earned").eq("user_id", userId).single();
    const currentBalance = existing?.balance ?? 0;
    const currentLifetime = existing?.lifetime_earned ?? 0;
    await client.from("coin_balances").upsert({ user_id: userId, balance: currentBalance + amount, lifetime_earned: currentLifetime + amount }, { onConflict: "user_id" });
    await client.from("coin_transactions").insert({ user_id: userId, amount, reason, type: "earn" });
  } catch (e) { console.error("Failed to award coins:", e); }
}

export async function GET(request: NextRequest) {
  const guard = await requireMember();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const pending = searchParams.get("pending") === "true";

  let query = client
    .from("knowledge_documents")
    .select("*")
    .order("created_at", { ascending: false });

  if (pending) {
    query = query.eq("is_approved", false);
  } else {
    query = query.eq("is_approved", true);
    if (category) query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data });
}

export async function POST(request: Request) {
  const guard = await requireMember();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client, chiamante } = guard;

  try {
    const body = await request.json();
    // L'inserimento diretto pubblica senza revisione, quindi non basta che il
    // chiamante lo chieda: deve essere staff. Un membro che manda
    // is_admin_add: true ottiene comunque una proposta da approvare.
    const isAdminAdd = body.is_admin_add === true && chiamante.isAdmin;

    const payload = {
      title: body.title?.trim(),
      category: body.category?.trim(),
      description: body.description?.trim() || null,
      url: body.url?.trim() || null,
      doc_type: body.doc_type || "external",
      is_public: body.is_public ?? true,
      added_by: isAdminAdd ? chiamante.id : null,
      is_approved: isAdminAdd,
      // Chi propone lo dice la sessione, non il corpo della richiesta:
      // altrimenti si attribuisce una proposta a chiunque (e i +30 coin
      // dell'approvazione finiscono a lui).
      proposed_by: isAdminAdd ? null : chiamante.id,
      proposed_by_name: isAdminAdd ? null : body.proposed_by_name?.trim() || null,
    };

    if (!payload.title || !payload.category) {
      return NextResponse.json({ error: "Title and category are required" }, { status: 400 });
    }
    if (isAdminAdd && !payload.url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const { data, error } = await client
      .from("knowledge_documents")
      .insert(payload)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ document: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// PATCH — approve or reject proposal. Awards +30 coins to proposer when approved.
export async function PATCH(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  try {
    const body = await request.json();
    const { id, is_approved } = body;
    if (!id) return NextResponse.json({ error: "Missing document id" }, { status: 400 });

    // Fetch proposer before updating
    const { data: existing } = await client
      .from("knowledge_documents")
      .select("proposed_by, title")
      .eq("id", id)
      .single();

    const { data, error } = await client
      .from("knowledge_documents")
      .update({ is_approved })
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Award coins to proposer on approval
    if (is_approved && existing?.proposed_by) {
      await awardCoins(client, existing.proposed_by, 30, `Knowledge contribution approved: "${existing.title}"`);
    }

    return NextResponse.json({ document: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing document id" }, { status: 400 });

    const { error } = await client
      .from("knowledge_documents")
      .delete()
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
