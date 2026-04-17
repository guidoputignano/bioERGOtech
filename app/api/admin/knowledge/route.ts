import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const getClient = () =>
  createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

async function awardCoins(userId: string, amount: number, reason: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://bioergotech.org";
    await fetch(`${baseUrl}/api/coins`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, amount, reason, type: "earn" }),
    });
  } catch (e) { console.error("Failed to award coins:", e); }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const pending = searchParams.get("pending") === "true";

  let query = getClient()
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
  try {
    const body = await request.json();
    const isAdminAdd = body.is_admin_add === true;

    const payload = {
      title: body.title?.trim(),
      category: body.category?.trim(),
      description: body.description?.trim() || null,
      url: body.url?.trim() || null,
      doc_type: body.doc_type || "external",
      is_public: body.is_public ?? true,
      added_by: body.added_by || null,
      is_approved: isAdminAdd,
      proposed_by: body.proposed_by || null,
      proposed_by_name: body.proposed_by_name || null,
    };

    if (!payload.title || !payload.category) {
      return NextResponse.json({ error: "Title and category are required" }, { status: 400 });
    }
    if (isAdminAdd && !payload.url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const { data, error } = await getClient()
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
  try {
    const body = await request.json();
    const { id, is_approved } = body;
    if (!id) return NextResponse.json({ error: "Missing document id" }, { status: 400 });

    // Fetch proposer before updating
    const { data: existing } = await getClient()
      .from("knowledge_documents")
      .select("proposed_by, title")
      .eq("id", id)
      .single();

    const { data, error } = await getClient()
      .from("knowledge_documents")
      .update({ is_approved })
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Award coins to proposer on approval
    if (is_approved && existing?.proposed_by) {
      await awardCoins(existing.proposed_by, 30, `Knowledge contribution approved: "${existing.title}"`);
    }

    return NextResponse.json({ document: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing document id" }, { status: 400 });

    const { error } = await getClient()
      .from("knowledge_documents")
      .delete()
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
