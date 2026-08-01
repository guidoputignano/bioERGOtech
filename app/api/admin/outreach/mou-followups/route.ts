// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";

function daysOutstanding(from: string | null): number {
  if (!from) return 0;
  const ms = Date.now() - new Date(from).getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  try {
    const db = client;

    const { data: followups, error } = await db
      .from("mou_followups")
      .select("id, lead_id, scheduled_for, cadence_step, channel, status, sent_at, notes, created_at")
      .in("status", ["pending", "sent"])
      .order("scheduled_for", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const leadIds = [...new Set((followups || []).map((f) => f.lead_id))];
    const { data: contacts } = leadIds.length
      ? await db
          .from("outreach_contacts")
          .select("id, name, email, country, contact_person, mou_sent_at, funnel_stage")
          .in("id", leadIds)
      : { data: [] };

    const contactMap = new Map((contacts || []).map((c) => [c.id, c]));

    const result = (followups || []).map((f) => {
      const contact = contactMap.get(f.lead_id) || null;
      return {
        ...f,
        contact,
        days_outstanding: daysOutstanding(contact?.mou_sent_at || f.created_at),
      };
    });

    return NextResponse.json({ followups: result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fetch failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  try {
    const { followup_id, actor, message_summary, new_status } = await req.json();
    if (!followup_id) return NextResponse.json({ error: "followup_id required" }, { status: 400 });

    const db = client;
    const status = new_status || "sent";

    const { data: followup, error: updateError } = await db
      .from("mou_followups")
      .update({ status, sent_at: new Date().toISOString() })
      .eq("id", followup_id)
      .select("id, lead_id")
      .single();

    if (updateError || !followup) {
      return NextResponse.json({ error: updateError?.message || "Follow-up not found" }, { status: 404 });
    }

    await db.from("mou_followup_log").insert({
      lead_id: followup.lead_id,
      followup_id: followup.id,
      actor: actor || "system",
      message_summary: message_summary || `Status updated to ${status}`,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Update failed" }, { status: 500 });
  }
}
