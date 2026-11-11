import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { loadCampaign } from "@/lib/research-campaign/server";
import { dispatchMessage, type DispatchResult } from "@/lib/research-campaign/dispatch";

const MAX_PER_REQUEST = 10;

// POST /api/admin/research/send  { message_ids: string[] }
// Sends approved initial e-mails and replies. Every gate is re-checked per
// message. Outside the recipient's business hours a message is queued for
// the next daily run instead. Follow-ups are not sent from here: the daily
// job sends them when due.
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const db = guard.client;
  let ids: string[];
  try {
    const b = await request.json();
    ids = Array.isArray(b.message_ids) ? b.message_ids.filter((x: unknown) => typeof x === "string") : [];
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!ids.length) return NextResponse.json({ error: "No messages selected" }, { status: 400 });
  if (ids.length > MAX_PER_REQUEST) return NextResponse.json({ error: `At most ${MAX_PER_REQUEST} per request` }, { status: 400 });
  const campaign = await loadCampaign(db);
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const { data: steps } = await db.from("rc_messages").select("id, step").in("id", ids);
  const results: DispatchResult[] = [];
  for (const id of ids) {
    const step = steps?.find((s) => s.id === id)?.step;
    if (step === "followup1" || step === "followup2") {
      results.push({ id, status: "skipped", reasons: ["Follow-ups are sent by the daily job when due"] });
      continue;
    }
    const r = await dispatchMessage(db, campaign, id, guard.chiamante.email || guard.chiamante.id, { queueOutsideWindow: true });
    results.push(r);
    if (r.status === "sent") await new Promise((res) => setTimeout(res, 1500));
  }
  return NextResponse.json({
    results,
    sent: results.filter((r) => r.status === "sent").length,
    queued: results.filter((r) => r.status === "queued").length,
    blocked: results.filter((r) => r.status === "blocked" || r.status === "skipped").length,
    failed: results.filter((r) => r.status === "failed").length,
  });
}
