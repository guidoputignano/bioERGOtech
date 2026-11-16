import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { loadCampaign, logEvent } from "@/lib/research-campaign/server";
import { syncReplies, type SyncReport } from "@/lib/research-campaign/sync";

// POST /api/admin/research/sync  check the mailbox for new replies now.
// Called when the research page opens and on Refresh. It only reads mail and
// stores replies (which stops the institution's follow-ups at once); it
// never sends anything. Follow-ups still go out only from the daily job.
// A check within the last 20 seconds is not repeated.
export const maxDuration = 60;
const MIN_INTERVAL_MS = 20_000;

export async function POST() {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const db = guard.client;
  const campaign = await loadCampaign(db);
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const { data: last } = await db.from("rc_events").select("created_at, detail").eq("campaign_id", campaign.id)
    .eq("action", "replies.synced").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (last && Date.now() - new Date(last.created_at).getTime() < MIN_INTERVAL_MS) {
    return NextResponse.json({ checked_at: last.created_at, repliesStored: 0, unmatched: 0, errors: [], recent: true });
  }

  const actor = guard.chiamante.email || guard.chiamante.id;
  const report: SyncReport = { repliesStored: 0, unmatched: 0, errors: [] };
  // The daily job reads the last 21 days; Refresh only needs the last few.
  try { await syncReplies(db, campaign, report, actor, "3d"); }
  catch (e) { report.errors.push(e instanceof Error ? e.message : String(e)); }
  const checkedAt = new Date().toISOString();
  await logEvent(db, { campaign_id: campaign.id, actor, action: "replies.synced", detail: { ...report, source: "refresh" } });
  return NextResponse.json({ checked_at: checkedAt, ...report });
}
