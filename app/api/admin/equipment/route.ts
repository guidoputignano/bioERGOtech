import { NextResponse } from "next/server";
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

export async function GET() {
  const { data, error } = await getClient()
    .from("equipment_proposals")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ proposals: data });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const isAdminAdd = body.is_admin_add === true;

    const payload = {
      name: body.name?.trim(),
      category: body.category?.trim() || null,
      location: body.location?.trim(),
      description: body.description?.trim() || null,
      proposed_by_email: body.proposed_by_email?.trim() || null,
      proposed_by_name: body.proposed_by_name?.trim() || null,
      contact_email: body.contact_email?.trim() || null,
      contact_phone: body.contact_phone?.trim() || null,
      image_url: body.image_url?.trim() || null,
      status: isAdminAdd ? "approved" : "pending",
      is_available: body.is_available ?? true,
      utilization: Number(body.utilization) || 0,
      cost_savings_text: body.cost_savings_text?.trim() || null,
      bookings_count: Number(body.bookings_count) || 0,
      reviewed_at: isAdminAdd ? new Date().toISOString() : null,
    };

    if (!payload.name || !payload.location) {
      return NextResponse.json({ error: "Equipment name and location are required" }, { status: 400 });
    }

    const { data, error } = await getClient()
      .from("equipment_proposals")
      .insert(payload)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ proposal: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// PATCH — approve/reject equipment proposal. Awards +25 coins to proposer when approved.
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...fields } = body;

    if (!id) return NextResponse.json({ error: "Missing equipment id" }, { status: 400 });

    // Fetch proposer info before updating
    const { data: existing } = await getClient()
      .from("equipment_proposals")
      .select("proposed_by_email, proposed_by_name, name, status")
      .eq("id", id)
      .single();

    const updatePayload: Record<string, unknown> = {};
    if (fields.name !== undefined) updatePayload.name = fields.name?.trim();
    if (fields.category !== undefined) updatePayload.category = fields.category?.trim() || null;
    if (fields.location !== undefined) updatePayload.location = fields.location?.trim();
    if (fields.description !== undefined) updatePayload.description = fields.description?.trim() || null;
    if (fields.proposed_by_email !== undefined) updatePayload.proposed_by_email = fields.proposed_by_email?.trim() || null;
    if (fields.proposed_by_name !== undefined) updatePayload.proposed_by_name = fields.proposed_by_name?.trim() || null;
    if (fields.contact_email !== undefined) updatePayload.contact_email = fields.contact_email?.trim() || null;
    if (fields.contact_phone !== undefined) updatePayload.contact_phone = fields.contact_phone?.trim() || null;
    if (fields.image_url !== undefined) updatePayload.image_url = fields.image_url?.trim() || null;
    if (fields.status !== undefined) { updatePayload.status = fields.status; updatePayload.reviewed_at = new Date().toISOString(); }
    if (fields.admin_notes !== undefined) updatePayload.admin_notes = fields.admin_notes?.trim() || null;
    if (fields.is_available !== undefined) updatePayload.is_available = fields.is_available;
    if (fields.utilization !== undefined) updatePayload.utilization = Number(fields.utilization) || 0;
    if (fields.cost_savings_text !== undefined) updatePayload.cost_savings_text = fields.cost_savings_text?.trim() || null;
    if (fields.bookings_count !== undefined) updatePayload.bookings_count = Number(fields.bookings_count) || 0;

    const { data, error } = await getClient()
      .from("equipment_proposals")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Award +25 coins when equipment proposal is approved
    // We need to look up the user by email since equipment proposals store email not user_id
    if (fields.status === "approved" && existing?.status !== "approved" && existing?.proposed_by_email) {
      const { data: profile } = await getClient()
        .from("profiles")
        .select("id")
        .eq("email", existing.proposed_by_email)
        .single();

      if (profile?.id) {
        await awardCoins(profile.id, 25, `Equipment proposal approved: "${existing.name}"`);
      }
    }

    return NextResponse.json({ proposal: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { error } = await getClient()
      .from("equipment_proposals")
      .delete()
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
