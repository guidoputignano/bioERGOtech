"use client";

/**
 * Research Centres campaign (US Research Student Collaboration – August 2027).
 * Separate from the Outreach & MoU Pipeline: own tables (rc_*), own routes
 * (/api/admin/research/*), own daily job. Same look as OutreachView.
 *
 * Workflow: Research → Verify → Approve contact → Draft sequence → Review →
 * Approve (initial + its two follow-ups, once per institution) → Send →
 * daily job: replies, Day 3 / Day 7 follow-ups, No Response → people handle
 * replies, referrals, meetings and quotations.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { CALL_OUTCOMES, INSTITUTION_STATUSES, REPLY_LABEL_ACTION, REPLY_LABEL_TEXT, REPLY_LABELS, STATUS_TEXT } from "@/lib/research-campaign/core";

const TEAL = "#2EC4B6";
const CARD = "#FFFFFF";
const BORDER = "#E8EDF3";
const TEXT = "#1A2332";
const TEXT_MID = "#4A5568";
const TEXT_LIGHT = "#8896A6";
const RED = "#D63563";
const AMBER = "#9A6500";
const GREEN = "#008F6B";
const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)";

// ── Types ───────────────────────────────────────────────────────────────
type Contact = {
  id: string; institution_id: string; department: string | null; person_name: string | null; person_title: string | null;
  email: string | null; phone_e164: string | null; timezone: string | null; contact_form_url: string | null;
  source_url: string | null; verified_on: string | null; verification: string; approved_for_contact: boolean; notes: string | null;
  role_assessment: string; referred_by_contact_id: string | null; followups_paused: boolean; is_primary: boolean;
};
type Institution = {
  id: string; ref_code: string | null; name: string; website: string | null; domain: string | null; city: string | null; state: string | null;
  cluster: string | null; institution_type: string | null; specialisations: string | null; programme_evidence: string | null;
  formats: string | null; eligibility_notes: string | null; fees_published: string | null; august_availability: string | null;
  key_unknowns: string | null; priority: "A" | "B" | "C" | null; ineligible_reason: string | null; status: string; followups_paused: boolean;
  previous_outreach: string | null; owner: string | null; last_activity_at: string | null; next_action: string | null;
  next_action_due: string | null; source_url: string | null; checked_on: string | null; notes: string | null;
  score_outreach: number; score_international: number; score_capacity: number; score_relevance: number;
  score_august: number; score_cost: number; score_contact: number; score: number;
  eng_contact_role: string | null; eng_interest: string | null; eng_duration: string | null; eng_activities: string | null;
  eng_eligibility: string | null; eng_dates: string | null; eng_participants: string | null; eng_supervision_insurance: string | null;
  eng_fees_conditions: string | null; eng_documents: string | null; eng_meeting: string | null;
  rc_contacts: Contact[];
  activity: { sent: number; inbound: number; drafts: number; lastSent: string | null; lastInbound: string | null };
};
type Label = { id: string; label: string; source: string; confidence: number | null; rationale: string | null; confirmed_at: string | null; created_at: string; opt_out: boolean; return_date: string | null };
type Message = {
  id: string; institution_id: string; contact_id: string | null; direction: "outbound" | "inbound"; step: string; state: string;
  from_email: string | null; to_email: string | null; subject: string | null; body: string | null; sent_at: string | null;
  received_at: string | null; created_at: string; delivery_status: string | null; error_message: string | null; historical: boolean;
  scheduled_for: string | null; personalisation_source: string | null; template_key: string | null; template_version: number | null;
  approved_at: string | null; rc_reply_labels: Label[]; markers: string[];
  rc_institutions?: { name: string } | null; rc_contacts?: { person_name: string | null; email: string | null; approved_for_contact: boolean } | null;
};
type Task = {
  id: string; institution_id: string; task_type: string; status: string; due_date: string | null; objective: string | null;
  calling_window: string | null; call_outcome: string | null; outcome: string | null; last_email: string | null;
  rc_institutions: { name: string; city: string | null; state: string | null; status: string } | null;
  rc_contacts: { person_name: string | null; department: string | null; phone_e164: string | null; timezone: string | null; email: string | null } | null;
};
type Campaign = {
  id: string; name: string; status: string; sender_name: string | null; sender_email: string | null; reply_to: string | null;
  sender_provider: "resend" | "gmail"; sending_enabled: boolean; daily_send_cap: number; reply_mailbox: string | null;
  selection_status: string | null; age_range: string | null; chaperone: string | null;
  schedule_mode: "business" | "calendar"; followup1_days: number; followup2_days: number; no_response_after_days: number;
  send_window_start: number; send_window_end: number; approved_at: string | null;
};
type Metrics = Record<string, number> & { byStatus: Record<string, number>; byPriority: Record<string, number> };
type Readiness = {
  allowedSenders: string[]; senderAllowed: boolean; resendConfigured: boolean; gmailSendConfigured: boolean;
  replyCronConfigured: boolean; deliveryWebhookConfigured: boolean; classifierModel: boolean; sentToday: number;
};
type Template = { key: string; label: string; subject: string; body: string; version: number; updated_at: string };

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  discovered: { bg: "#F3F5F8", color: "#8896A6" }, verified: { bg: "#E8F1FB", color: "#1A5DA8" },
  approved: { bg: "#E6F0FD", color: "#1A6DD4" }, contacted: { bg: "#EDE8FB", color: "#6B4BCC" },
  followup_due: { bg: "#FDECEA", color: RED }, responded: { bg: "#E6F9F4", color: GREEN },
  qualified: { bg: "#D0F5EA", color: "#007A5A" }, meeting: { bg: "#FDF3DD", color: AMBER },
  negotiating: { bg: "#FDF3DD", color: AMBER }, confirmed: { bg: GREEN, color: "#FFFFFF" },
  closed: { bg: "#F0F0F0", color: "#6B6B6B" }, no_response: { bg: "#F0F0F0", color: "#6B6B6B" },
  ineligible: { bg: "#FDECEA", color: RED }, declined: { bg: "#F0F0F0", color: "#8A8A8A" }, paused: { bg: "#F0F0F0", color: "#8A8A8A" },
};
const VERIFICATION_TEXT: Record<string, string> = {
  unverified: "Unverified", verified_named: "Verified (named, official page)", verified_department: "Verified (department, official page)",
  form_only: "Contact form only", provided_by_institution: "Given by the institution in writing",
};
const ROLE_TEXT: Record<string, string> = { unknown: "Role not assessed", appropriate: "Right person to coordinate", not_appropriate: "Not the coordinator" };
const STEP_TEXT: Record<string, string> = { initial: "Initial e-mail", followup1: "Follow-up 1", followup2: "Final follow-up", coordinator: "Template 4", reply: "Reply", custom: "Message", inbound: "Reply received" };
const CALL_TEXT: Record<string, string> = {
  connected: "Connected", voicemail: "Left voicemail", referred: "Referred to another department", direct_contact: "Direct contact obtained",
  written_info_requested: "Asked for written information", declined: "Declined", follow_up_agreed: "Follow-up agreed", no_answer: "No answer",
};
const MESSAGE_STATE_COLOR: Record<string, string> = {
  draft: TEXT_LIGHT, in_review: AMBER, approved: "#1A6DD4", sending: "#6B4BCC", sent: GREEN, failed: RED, cancelled: "#8A8A8A", received: GREEN,
};
const ENGAGEMENT_FIELDS: [keyof Institution, string][] = [
  ["eng_contact_role", "Contact person and role"], ["eng_interest", "Nature of their interest"], ["eng_duration", "Proposed duration"],
  ["eng_activities", "Possible student activities"], ["eng_eligibility", "Age and eligibility restrictions"], ["eng_dates", "Dates and availability"],
  ["eng_participants", "Number of participants accepted"], ["eng_supervision_insurance", "Supervision and insurance requirements"],
  ["eng_fees_conditions", "Fees and payment conditions"], ["eng_documents", "Required application documents"], ["eng_meeting", "Virtual planning meeting"],
];

// ── Helpers ─────────────────────────────────────────────────────────────
async function api<T = Record<string, unknown>>(url: string, method = "GET", body?: unknown): Promise<T> {
  const r = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  let d: Record<string, unknown> = {};
  try { d = JSON.parse(text); } catch { throw new Error(text.slice(0, 160) || r.statusText); }
  if (!r.ok || d.error) throw Object.assign(new Error(String(d.error || r.statusText)), { data: d });
  return d as T;
}
const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const todayIso = () => new Date().toISOString().slice(0, 10);
const pill = (text: string, bg: string, color: string) => (
  <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: 10, fontWeight: 600, background: bg, color, whiteSpace: "nowrap" }}>{text}</span>
);
const statusPill = (s: string) => { const c = STATUS_COLOR[s] || STATUS_COLOR.discovered; return pill(STATUS_TEXT[s as keyof typeof STATUS_TEXT] || s, c.bg, c.color); };
const priorityPill = (p: string | null) => p
  ? pill(p, p === "A" ? "#D0F5EA" : p === "B" ? "#FDF3DD" : "#F0F0F0", p === "A" ? "#007A5A" : p === "B" ? AMBER : "#6B6B6B")
  : pill("—", "#F3F5F8", TEXT_LIGHT);

const cardStyle: React.CSSProperties = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, boxShadow: SHADOW };
const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 10, border: `1px solid ${BORDER}`, fontSize: 13, color: TEXT, fontFamily: "'DM Sans', sans-serif", outline: "none", background: "#FAFBFC", boxSizing: "border-box" };
const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: TEXT_LIGHT, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5, display: "block" };
const btn = (kind: "primary" | "ghost" | "danger" = "primary", disabled = false): React.CSSProperties => ({
  padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", whiteSpace: "nowrap",
  border: kind === "ghost" ? `1px solid ${BORDER}` : "none", opacity: disabled ? 0.55 : 1,
  background: kind === "primary" ? TEAL : kind === "danger" ? RED : "#fff", color: kind === "ghost" ? TEXT_MID : "#fff",
});
const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" };
const grid = (min: number): React.CSSProperties => ({ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))`, gap: 10 });

type Notify = (ok: boolean, t: string) => void;

// ── Component ───────────────────────────────────────────────────────────
export default function ResearchCentresView() {
  const [tab, setTab] = useState<"dashboard" | "institutions" | "review" | "tasks" | "settings">("dashboard");
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [queue, setQueue] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);

  // Stable identity: child panels list it in their effect dependencies.
  const notify = useCallback<Notify>((ok, text) => { setFlash({ ok, text }); setTimeout(() => setFlash(null), 7000); }, []);

  const loadAll = useCallback(async () => {
    setLoading(true); setLoadError("");
    try {
      const [c, i, q, t] = await Promise.all([
        api<{ campaign: Campaign; metrics: Metrics; readiness: Readiness }>("/api/admin/research/campaign"),
        api<{ institutions: Institution[] }>("/api/admin/research/institutions"),
        api<{ messages: Message[] }>("/api/admin/research/messages?queue=review"),
        api<{ tasks: Task[] }>("/api/admin/research/tasks?status=open"),
      ]);
      setCampaign(c.campaign); setMetrics(c.metrics); setReadiness(c.readiness);
      setInstitutions(i.institutions); setQueue(q.messages); setTasks(t.tasks);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load the campaign");
    }
    setLoading(false);
  }, []);
  useEffect(() => { loadAll(); }, [loadAll]);
  const closeDrawer = useCallback(() => setDrawerId(null), []);

  const tabBtn = (id: typeof tab): React.CSSProperties => ({
    padding: "8px 18px", borderRadius: 20, border: "none", background: tab === id ? TEAL : "#F3F5F8",
    color: tab === id ? "#fff" : TEXT_MID, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  });
  const badge = (n: number, active: boolean) => n > 0 && (
    <span style={{ marginLeft: 6, background: active ? "rgba(255,255,255,0.3)" : "#E0E5EC", borderRadius: 10, padding: "1px 7px", fontSize: 11, fontFamily: "'DM Mono', monospace" }}>{n}</span>
  );

  if (loading && !campaign) return <div style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT }}>Loading research campaign…</div>;
  if (loadError && !campaign) return (
    <div style={{ ...cardStyle, borderLeft: `3px solid ${RED}` }}>
      <div style={{ fontWeight: 700, color: TEXT, marginBottom: 6 }}>The research campaign could not be loaded</div>
      <div style={{ fontSize: 13, color: TEXT_MID }}>{loadError}</div>
      <button style={{ ...btn(), marginTop: 12 }} onClick={loadAll}>Retry</button>
    </div>
  );

  const drawerInst = institutions.find((x) => x.id === drawerId) || null;
  const reviewCount = queue.filter((m) => m.state !== "approved" || !(m.step === "followup1" || m.step === "followup2")).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {campaign && <CampaignBanner campaign={campaign} readiness={readiness} />}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button style={tabBtn("dashboard")} onClick={() => setTab("dashboard")}>Dashboard</button>
        <button style={tabBtn("institutions")} onClick={() => setTab("institutions")}>Institutions{badge(institutions.length, tab === "institutions")}</button>
        <button style={tabBtn("review")} onClick={() => setTab("review")}>Review &amp; send{badge(reviewCount, tab === "review")}</button>
        <button style={tabBtn("tasks")} onClick={() => setTab("tasks")}>Tasks &amp; calls{badge(tasks.length, tab === "tasks")}</button>
        <button style={tabBtn("settings")} onClick={() => setTab("settings")}>Settings &amp; templates</button>
        <button style={{ ...btn("ghost"), marginLeft: "auto" }} onClick={loadAll}>{loading ? "Refreshing…" : "⟳ Refresh"}</button>
      </div>
      {flash && <div role="status" style={{ padding: "10px 14px", borderRadius: 10, fontSize: 13, background: flash.ok ? "#E6F9F4" : "#FDECEA", color: flash.ok ? GREEN : RED }}>{flash.text}</div>}

      {tab === "dashboard" && metrics && <Dashboard metrics={metrics} institutions={institutions} onOpen={setDrawerId} />}
      {tab === "institutions" && <InstitutionsTable institutions={institutions} onOpen={setDrawerId} onCreated={(id) => { loadAll(); setDrawerId(id); }} notify={notify} />}
      {tab === "review" && <ReviewQueue queue={queue} campaign={campaign} readiness={readiness} onChanged={loadAll} notify={notify} onOpen={setDrawerId} />}
      {tab === "tasks" && <TasksView tasks={tasks} onChanged={loadAll} notify={notify} onOpen={setDrawerId} />}
      {tab === "settings" && campaign && <SettingsView campaign={campaign} readiness={readiness} onChanged={loadAll} notify={notify} />}

      {drawerInst && <InstitutionDrawer key={drawerInst.id} inst={drawerInst} campaign={campaign} onClose={closeDrawer} onChanged={loadAll} notify={notify} />}
    </div>
  );
}

// ── Banner ──────────────────────────────────────────────────────────────
function CampaignBanner({ campaign, readiness }: { campaign: Campaign; readiness: Readiness | null }) {
  const live = campaign.status === "active" && campaign.sending_enabled;
  return (
    <div style={{ ...cardStyle, padding: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", borderLeft: `3px solid ${live ? GREEN : AMBER}` }}>
      <div style={{ flex: 1, minWidth: 240 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: TEXT, fontFamily: "'Sora', sans-serif" }}>{campaign.name}</div>
        <div style={{ fontSize: 12, color: TEXT_LIGHT, marginTop: 3 }}>
          From {campaign.sender_name ? `${campaign.sender_name} ` : ""}&lt;{campaign.sender_email || "not set"}&gt; via {campaign.sender_provider === "gmail" ? "Gmail" : "Resend"}
          {readiness && !readiness.senderAllowed && <span style={{ color: RED }}> · not in RC_ALLOWED_SENDERS</span>}
          {" · "}Follow-ups Day {campaign.followup1_days} and Day {campaign.followup2_days} ({campaign.schedule_mode} days)
        </div>
      </div>
      {pill(`Campaign: ${campaign.status}`, "#F3F5F8", TEXT_MID)}
      {live ? pill("Sending ON", "#D0F5EA", "#007A5A") : pill("Sending OFF", "#FDF3DD", AMBER)}
      {readiness && pill(`${readiness.sentToday}/${campaign.daily_send_cap} sent today`, "#F3F5F8", TEXT_MID)}
    </div>
  );
}

// ── Dashboard ───────────────────────────────────────────────────────────
function Dashboard({ metrics, institutions, onOpen }: { metrics: Metrics; institutions: Institution[]; onOpen: (id: string) => void }) {
  const tiles: { label: string; value: number; color: string }[] = [
    { label: "Institutions discovered", value: metrics.institutionsDiscovered, color: TEAL },
    { label: "Verified", value: metrics.verified, color: "#1A5DA8" },
    { label: "Approved", value: metrics.approved, color: "#1A6DD4" },
    { label: "E-mails sent", value: metrics.emailsSent, color: "#6B4BCC" },
    { label: "Bounced", value: metrics.bounced, color: metrics.bounced ? RED : TEXT_LIGHT },
    { label: "Institutions replied", value: metrics.repliesReceived, color: GREEN },
    { label: "Positive responses", value: metrics.positiveResponses, color: "#007A5A" },
    { label: "Referrals", value: metrics.referrals, color: GREEN },
    { label: "Meetings", value: metrics.meetings, color: AMBER },
    { label: "Fees requested", value: metrics.feesRequested, color: AMBER },
    { label: "Negotiation", value: metrics.negotiating, color: AMBER },
    { label: "Hosting confirmed", value: metrics.confirmed, color: GREEN },
    { label: "No response", value: metrics.noResponse, color: TEXT_LIGHT },
    { label: "Outstanding actions", value: metrics.outstandingActions, color: metrics.outstandingActions ? RED : TEXT_LIGHT },
  ];
  const upcoming = institutions
    .filter((i) => i.next_action && !["declined", "ineligible", "closed"].includes(i.status))
    .sort((a, b) => (a.next_action_due || "9999").localeCompare(b.next_action_due || "9999")).slice(0, 12);
  const clusters = useMemo(() => {
    const m = new Map<string, { total: number; a: number; active: number }>();
    for (const i of institutions) {
      const k = i.cluster || "Unassigned";
      const v = m.get(k) || { total: 0, a: 0, active: 0 };
      v.total++; if (i.priority === "A") v.a++;
      if (["responded", "qualified", "meeting", "negotiating", "confirmed"].includes(i.status)) v.active++;
      m.set(k, v);
    }
    return [...m.entries()].sort((a, b) => b[1].active - a[1].active || b[1].total - a[1].total);
  }, [institutions]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(150px, 100%), 1fr))", gap: 10 }}>
        {tiles.map((s) => (
          <div key={s.label} style={{ ...cardStyle, padding: 14, borderLeft: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color, fontFamily: "'Sora', sans-serif" }}>{s.value}</div>
            <div style={{ fontSize: 10, color: TEXT_LIGHT, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: TEXT_LIGHT }}>
        &quot;Sent&quot; means accepted by the mail provider, not read; opens are not tracked. {metrics.followupsQueued} follow-up(s) approved and waiting · {metrics.draftsAwaitingReview} draft(s) to review · {metrics.overdueActions} overdue next action(s).
      </div>
      <div style={grid(320)}>
        <div style={cardStyle}>
          <div style={sectionTitle}>Pipeline</div>
          {INSTITUTION_STATUSES.filter((s) => metrics.byStatus[s]).map((s) => {
            const n = metrics.byStatus[s]; const pct = Math.round((n / Math.max(1, metrics.institutionsDiscovered)) * 100);
            return (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ width: 130, fontSize: 12, color: TEXT_MID }}>{STATUS_TEXT[s]}</div>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#F3F5F8", overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: (STATUS_COLOR[s] || STATUS_COLOR.discovered).color }} />
                </div>
                <div style={{ width: 30, fontSize: 11, color: TEXT_LIGHT, textAlign: "right", fontFamily: "'DM Mono', monospace" }}>{n}</div>
              </div>
            );
          })}
          {!metrics.institutionsDiscovered && <div style={{ fontSize: 13, color: TEXT_LIGHT }}>No institutions yet. Import the research files in Settings &amp; templates.</div>}
        </div>
        <div style={cardStyle}>
          <div style={sectionTitle}>Clusters</div>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead><tr style={{ color: TEXT_LIGHT, fontSize: 10, textTransform: "uppercase", textAlign: "left" }}><th style={{ padding: 4 }}>Cluster</th><th>Total</th><th>Priority A</th><th>In conversation</th></tr></thead>
            <tbody>{clusters.map(([k, v]) => (
              <tr key={k} style={{ borderTop: `1px solid ${BORDER}` }}><td style={{ padding: "6px 4px", color: TEXT }}>{k}</td><td>{v.total}</td><td>{v.a}</td><td style={{ color: v.active ? GREEN : TEXT_LIGHT, fontWeight: 700 }}>{v.active}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </div>
      <div style={cardStyle}>
        <div style={sectionTitle}>Next actions</div>
        {upcoming.length === 0 ? <div style={{ fontSize: 13, color: TEXT_LIGHT }}>Nothing scheduled.</div> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <tbody>{upcoming.map((i) => (
                <tr key={i.id} onClick={() => onOpen(i.id)} style={{ borderTop: `1px solid ${BORDER}`, cursor: "pointer" }}>
                  <td style={{ padding: "7px 4px", fontWeight: 600, color: TEXT }}>{i.name}</td>
                  <td>{statusPill(i.status)}</td>
                  <td style={{ color: TEXT_MID }}>{i.next_action}</td>
                  <td style={{ color: TEXT_LIGHT }}>{i.owner || ""}</td>
                  <td style={{ color: i.next_action_due && i.next_action_due < todayIso() ? RED : TEXT_LIGHT, fontFamily: "'DM Mono', monospace" }}>{i.next_action_due || ""}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Institutions table ──────────────────────────────────────────────────
function InstitutionsTable({ institutions, onOpen, onCreated, notify }: { institutions: Institution[]; onOpen: (id: string) => void; onCreated: (id: string) => void; notify: Notify }) {
  const [search, setSearch] = useState("");
  const [field, setField] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fPriority, setFPriority] = useState("");
  const [fCluster, setFCluster] = useState("");
  const [fState, setFState] = useState("");
  const [fOwner, setFOwner] = useState("");
  const [fActivity, setFActivity] = useState("");
  const [sort, setSort] = useState<"score" | "name" | "activity">("score");
  const [newName, setNewName] = useState("");
  const [newSite, setNewSite] = useState("");
  const uniq = (xs: (string | null)[]) => [...new Set(xs.filter(Boolean))].sort() as string[];
  const clusters = uniq(institutions.map((i) => i.cluster));
  const states = uniq(institutions.map((i) => i.state));
  const owners = uniq(institutions.map((i) => i.owner));
  const since = fActivity ? new Date(Date.now() - Number(fActivity) * 86400000).toISOString() : null;
  const rows = institutions.filter((i) => {
    if (fStatus && i.status !== fStatus) return false;
    if (fPriority && (i.priority || "") !== fPriority) return false;
    if (fCluster && i.cluster !== fCluster) return false;
    if (fState && i.state !== fState) return false;
    if (fOwner && (fOwner === "__none" ? !!i.owner : i.owner !== fOwner)) return false;
    if (since && (!i.last_activity_at || i.last_activity_at < since)) return false;
    if (field && !`${i.specialisations ?? ""} ${i.programme_evidence ?? ""}`.toLowerCase().includes(field.toLowerCase())) return false;
    if (search) {
      const s = search.toLowerCase();
      return [i.name, i.city, i.state, i.cluster, ...i.rc_contacts.map((c) => `${c.email} ${c.person_name}`)].some((x) => (x || "").toLowerCase().includes(s));
    }
    return true;
  }).sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "activity" ? (b.last_activity_at || "").localeCompare(a.last_activity_at || "") : b.score - a.score);

  const create = async () => {
    if (!newName.trim()) return;
    try {
      const d = await api<{ institution: { id: string } }>("/api/admin/research/institutions", "POST", { name: newName, website: newSite || null });
      setNewName(""); setNewSite(""); notify(true, "Institution added"); onCreated(d.institution.id);
    } catch (e) { notify(false, e instanceof Error ? e.message : "Failed"); }
  };
  const sel = (value: string, set: (v: string) => void, all: string, options: [string, string][], width = 150) => (
    <select style={{ ...inputStyle, width, flex: "1 1 auto" }} value={value} onChange={(e) => set(e.target.value)}>
      <option value="">{all}</option>{options.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    </select>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ ...cardStyle, padding: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input style={{ ...inputStyle, flex: "2 1 200px" }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search institution, city, contact…" />
        <input style={{ ...inputStyle, flex: "1 1 150px" }} value={field} onChange={(e) => setField(e.target.value)} placeholder="Research field…" />
        {sel(fStatus, setFStatus, "All stages", INSTITUTION_STATUSES.map((s) => [s, STATUS_TEXT[s]]))}
        {sel(fPriority, setFPriority, "All priorities", [["A", "A"], ["B", "B"], ["C", "C"]], 120)}
        {sel(fCluster, setFCluster, "All clusters", clusters.map((c) => [c, c]))}
        {sel(fState, setFState, "All states", states.map((s) => [s, s]), 110)}
        {sel(fOwner, setFOwner, "All owners", [...owners.map((o) => [o, o] as [string, string]), ["__none", "Unassigned"]], 130)}
        {sel(fActivity, setFActivity, "Any activity", [["7", "Active last 7 days"], ["30", "Active last 30 days"]], 150)}
        <select style={{ ...inputStyle, width: 140, flex: "1 1 auto" }} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          <option value="score">Sort: score</option><option value="name">Sort: name</option><option value="activity">Sort: last activity</option>
        </select>
        <span style={{ fontSize: 12, color: TEXT_LIGHT, fontFamily: "'DM Mono', monospace" }}>{rows.length}/{institutions.length}</span>
      </div>
      <div style={{ ...cardStyle, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ textAlign: "left", color: TEXT_LIGHT, textTransform: "uppercase", fontSize: 10, letterSpacing: "0.05em", background: "#FAFBFC" }}>
              {["Pri", "Score", "Institution", "Cluster", "Stage", "Contacts", "Activity", "Owner", "Next action"].map((h) => <th key={h} style={{ padding: "10px 10px" }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => {
              const approved = i.rc_contacts.filter((c) => c.approved_for_contact).length;
              const verified = i.rc_contacts.filter((c) => c.verification !== "unverified").length;
              return (
                <tr key={i.id} onClick={() => onOpen(i.id)} style={{ borderTop: `1px solid ${BORDER}`, cursor: "pointer", background: i.ineligible_reason ? "#FFF8F8" : undefined }}>
                  <td style={{ padding: "9px 10px" }}>{priorityPill(i.priority)}</td>
                  <td style={{ padding: "9px 10px", fontFamily: "'DM Mono', monospace", color: TEXT_MID }}>{i.score}</td>
                  <td style={{ padding: "9px 10px" }}>
                    <div style={{ fontWeight: 600, color: TEXT }}>{i.name}</div>
                    <div style={{ fontSize: 11, color: TEXT_LIGHT }}>{[i.city, i.state].filter(Boolean).join(", ")}{i.previous_outreach ? " · contacted before" : ""}{i.followups_paused ? " · follow-ups paused" : ""}</div>
                  </td>
                  <td style={{ padding: "9px 10px", color: TEXT_MID }}>{i.cluster || "—"}</td>
                  <td style={{ padding: "9px 10px" }}>{statusPill(i.status)}</td>
                  <td style={{ padding: "9px 10px", color: TEXT_MID }}>{i.rc_contacts.length} · {verified} verified · {approved} approved</td>
                  <td style={{ padding: "9px 10px", color: TEXT_MID }}>{i.activity.sent} sent · {i.activity.inbound} in{i.activity.drafts ? ` · ${i.activity.drafts} draft` : ""}</td>
                  <td style={{ padding: "9px 10px", color: TEXT_MID }}>{i.owner || "—"}</td>
                  <td style={{ padding: "9px 10px", color: TEXT_MID, maxWidth: 260 }}>{i.next_action || "—"}</td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={9} style={{ padding: 30, textAlign: "center", color: TEXT_LIGHT }}>{institutions.length ? "No results for these filters." : "No institutions yet. Use Settings & templates → Import."}</td></tr>}
          </tbody>
        </table>
      </div>
      <div style={{ ...cardStyle, padding: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>Add institution</span>
        <input style={{ ...inputStyle, flex: "2 1 200px" }} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Official name" />
        <input style={{ ...inputStyle, flex: "2 1 200px" }} value={newSite} onChange={(e) => setNewSite(e.target.value)} placeholder="https://official-website" />
        <button style={btn("primary", !newName.trim())} disabled={!newName.trim()} onClick={create}>Add</button>
      </div>
    </div>
  );
}

// ── Institution drawer ──────────────────────────────────────────────────
function InstitutionDrawer({ inst, campaign, onClose, onChanged, notify }: { inst: Institution; campaign: Campaign | null; onClose: () => void; onChanged: () => void; notify: Notify }) {
  const [section, setSection] = useState<"overview" | "engagement" | "contacts" | "messages" | "costs">(inst.activity.sent || inst.activity.inbound ? "messages" : "overview");
  const [form, setForm] = useState<Partial<Institution>>(inst);
  const [saving, setSaving] = useState(false);
  const [thread, setThread] = useState<Message[]>([]);
  const [costs, setCosts] = useState<{ id: string; category: string; amount: number | null; currency: string; basis: string | null; description: string | null }[]>([]);

  const loadThread = useCallback(async () => {
    try {
      const [m, c] = await Promise.all([
        api<{ messages: Message[] }>(`/api/admin/research/messages?institution_id=${inst.id}`),
        api<{ costs: typeof costs }>(`/api/admin/research/costs?institution_id=${inst.id}`),
      ]);
      setThread(m.messages); setCosts(c.costs);
    } catch (e) { notify(false, e instanceof Error ? e.message : "Could not load messages"); }
  }, [inst.id, notify]);
  useEffect(() => { loadThread(); }, [loadThread]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (k: keyof Institution, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const save = async (keys: (keyof Institution)[]) => {
    setSaving(true);
    try {
      const fields: Record<string, unknown> = { id: inst.id };
      for (const k of keys) if (form[k] !== inst[k]) fields[k] = form[k] === "" ? null : form[k];
      await api("/api/admin/research/institutions", "PATCH", fields);
      notify(true, "Saved"); onChanged();
    } catch (e) { notify(false, e instanceof Error ? e.message : "Save failed"); }
    setSaving(false);
  };
  const remove = async () => {
    if (!confirm(`Delete ${inst.name}? Only possible when there is no correspondence.`)) return;
    try { await api("/api/admin/research/institutions", "DELETE", { id: inst.id }); notify(true, "Deleted"); onClose(); onChanged(); }
    catch (e) { notify(false, e instanceof Error ? e.message : "Delete failed"); }
  };

  const field = (k: keyof Institution, label: string, multiline = false) => (
    <div key={String(k)}>
      <span style={labelStyle}>{label}</span>
      {multiline
        ? <textarea style={{ ...inputStyle, minHeight: 56, resize: "vertical" }} value={(form[k] as string) ?? ""} onChange={(e) => set(k, e.target.value)} />
        : <input style={inputStyle} value={(form[k] as string) ?? ""} onChange={(e) => set(k, e.target.value)} />}
    </div>
  );
  const scoreField = (k: keyof Institution, label: string, max: number) => (
    <div><span style={labelStyle}>{label} /{max}</span>
      <input type="number" min={0} max={max} style={inputStyle} value={(form[k] as number) ?? 0} onChange={(e) => set(k, Number(e.target.value))} /></div>
  );
  const SCORE_KEYS = ["score_outreach", "score_international", "score_capacity", "score_relevance", "score_august", "score_cost", "score_contact"] as const;
  const total = SCORE_KEYS.reduce((n, k) => n + (Number(form[k]) || 0), 0);
  const OVERVIEW_KEYS: (keyof Institution)[] = ["name", "website", "city", "state", "cluster", "institution_type", "specialisations", "programme_evidence", "formats", "eligibility_notes", "fees_published", "august_availability", "key_unknowns", "ineligible_reason", "previous_outreach", "owner", "next_action", "next_action_due", "source_url", "notes", "priority", "status", "followups_paused", ...SCORE_KEYS];
  const secBtn = (id: typeof section, text: string) => (
    <button onClick={() => setSection(id)} style={{ padding: "6px 14px", borderRadius: 16, border: "none", background: section === id ? TEXT : "#F3F5F8", color: section === id ? "#fff" : TEXT_MID, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{text}</button>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,0.35)", zIndex: 1000, display: "flex", justifyContent: "flex-end" }} onClick={onClose}>
      <div role="dialog" aria-label={inst.name} onClick={(e) => e.stopPropagation()} style={{ width: "min(780px, 100vw)", height: "100%", background: "#F7F9FB", overflowY: "auto", padding: 22, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: TEXT, fontFamily: "'Sora', sans-serif" }}>{inst.name}</div>
            <div style={{ fontSize: 12, color: TEXT_LIGHT, marginTop: 4, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {priorityPill(inst.priority)} {statusPill(inst.status)} <span>Score {inst.score}</span>
              {inst.website && <a href={inst.website} target="_blank" rel="noreferrer" style={{ color: TEAL }}>{inst.domain || "website"}</a>}
              {inst.owner && <span>Owner: {inst.owner}</span>}
            </div>
          </div>
          <button style={btn("ghost")} onClick={onClose}>✕ Close</button>
        </div>
        {inst.previous_outreach && <div style={{ fontSize: 12, padding: "8px 12px", borderRadius: 10, background: "#FDF3DD", color: AMBER }}>Previous outreach: {inst.previous_outreach}. Log that correspondence under Correspondence before writing again.</div>}
        {inst.ineligible_reason && <div style={{ fontSize: 12, padding: "8px 12px", borderRadius: 10, background: "#FDECEA", color: RED }}>Not eligible: {inst.ineligible_reason}</div>}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {secBtn("overview", "Overview & score")}{secBtn("engagement", "Engagement")}{secBtn("contacts", `Contacts (${inst.rc_contacts.length})`)}{secBtn("messages", `Correspondence (${thread.length})`)}{secBtn("costs", `Costs (${costs.length})`)}
        </div>

        {section === "overview" && (
          <div style={{ ...cardStyle, ...grid(240) }}>
            <div><span style={labelStyle}>Stage</span>
              <select style={inputStyle} value={form.status} onChange={(e) => set("status", e.target.value)}>{INSTITUTION_STATUSES.map((k) => <option key={k} value={k}>{STATUS_TEXT[k]}</option>)}</select></div>
            <div><span style={labelStyle}>Priority</span>
              <select style={inputStyle} value={form.priority || ""} onChange={(e) => set("priority", e.target.value || null)}><option value="">—</option><option>A</option><option>B</option><option>C</option></select></div>
            {field("owner", "Responsible Foundation staff member")}
            {field("next_action", "Next action")}
            <div><span style={labelStyle}>Next action due</span><input type="date" style={inputStyle} value={form.next_action_due || ""} onChange={(e) => set("next_action_due", e.target.value || null)} /></div>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: TEXT_MID }}>
              <input type="checkbox" checked={!!form.followups_paused} onChange={(e) => set("followups_paused", e.target.checked)} /> Pause automatic follow-ups
            </label>
            {field("name", "Official name")}{field("website", "Website")}{field("city", "City")}{field("state", "State (2 letters)")}
            {field("cluster", "Cluster")}{field("institution_type", "Type")}
            <div style={{ gridColumn: "1 / -1" }}>{field("specialisations", "Specialisations", true)}</div>
            <div style={{ gridColumn: "1 / -1" }}>{field("programme_evidence", "Programme / outreach evidence", true)}</div>
            <div style={{ gridColumn: "1 / -1" }}>{field("eligibility_notes", "Eligibility as published", true)}</div>
            {field("formats", "Possible formats")}{field("fees_published", "Fees published")}{field("august_availability", "August availability")}
            <div style={{ gridColumn: "1 / -1" }}>{field("key_unknowns", "Unknowns to ask", true)}</div>
            <div style={{ gridColumn: "1 / -1" }}>{field("ineligible_reason", "Not eligible because (empty if eligible)")}</div>
            {field("source_url", "Source URL")}{field("previous_outreach", "Previous outreach")}
            <div style={{ gridColumn: "1 / -1" }}>{field("notes", "Notes", true)}</div>
            <div style={{ gridColumn: "1 / -1", borderTop: `1px solid ${BORDER}`, paddingTop: 10, fontSize: 12, fontWeight: 700, color: TEXT }}>Suitability score: {total}/100 (unknown = 0)</div>
            {scoreField("score_outreach", "Outreach / visiting programme", 30)}{scoreField("score_international", "International visitors eligible", 20)}
            {scoreField("score_capacity", "Capacity for five", 15)}{scoreField("score_relevance", "Relevance", 10)}
            {scoreField("score_august", "August availability", 10)}{scoreField("score_cost", "Cost feasibility", 10)}{scoreField("score_contact", "Reliable contact channel", 5)}
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, justifyContent: "space-between" }}>
              <button style={btn("danger")} onClick={remove}>Delete</button>
              <button style={btn("primary", saving)} disabled={saving} onClick={() => save(OVERVIEW_KEYS)}>{saving ? "Saving…" : "Save changes"}</button>
            </div>
          </div>
        )}
        {section === "engagement" && (
          <div style={{ ...cardStyle, ...grid(260) }}>
            <div style={{ gridColumn: "1 / -1", fontSize: 12, color: TEXT_LIGHT }}>Fill from the institution&apos;s own replies. Fees are itemised under Costs. Nothing here commits the Foundation.</div>
            {ENGAGEMENT_FIELDS.map(([k, label]) => field(k, label, true))}
            {field("next_action", "Next action")}
            <div><span style={labelStyle}>Deadline</span><input type="date" style={inputStyle} value={form.next_action_due || ""} onChange={(e) => set("next_action_due", e.target.value || null)} /></div>
            <div style={{ gridColumn: "1 / -1", textAlign: "right" }}>
              <button style={btn("primary", saving)} disabled={saving} onClick={() => save([...ENGAGEMENT_FIELDS.map(([k]) => k), "next_action", "next_action_due"])}>{saving ? "Saving…" : "Save engagement"}</button>
            </div>
          </div>
        )}
        {section === "contacts" && <ContactsPanel inst={inst} onChanged={onChanged} notify={notify} />}
        {section === "messages" && <ThreadPanel inst={inst} campaign={campaign} thread={thread} reload={() => { loadThread(); onChanged(); }} notify={notify} />}
        {section === "costs" && <CostsPanel instId={inst.id} costs={costs} reload={loadThread} notify={notify} />}
      </div>
    </div>
  );
}

function ContactsPanel({ inst, onChanged, notify }: { inst: Institution; onChanged: () => void; notify: Notify }) {
  const blank = { department: "", person_name: "", person_title: "", email: "", phone: "", contact_form_url: "", source_url: "", verification: "unverified", verified_on: todayIso() };
  const [nc, setNc] = useState(blank);
  const byId = new Map(inst.rc_contacts.map((c) => [c.id, c]));
  const act = async (method: string, body: Record<string, unknown>, ok: string) => {
    try { await api("/api/admin/research/contacts", method, body); notify(true, ok); onChanged(); return true; }
    catch (e) { notify(false, e instanceof Error ? e.message : "Failed"); return false; }
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {inst.rc_contacts.length === 0 && <div style={{ ...cardStyle, fontSize: 13, color: TEXT_LIGHT }}>No contacts yet. Add a published channel below, with the page you found it on.</div>}
      {inst.rc_contacts.map((c) => {
        const ref = c.referred_by_contact_id ? byId.get(c.referred_by_contact_id) : null;
        return (
          <div key={c.id} style={{ ...cardStyle, padding: 14, display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 240px", fontSize: 12, color: TEXT_MID, lineHeight: 1.6 }}>
              <div style={{ fontWeight: 700, color: TEXT, fontSize: 13 }}>{c.person_name || c.department || "Department channel"}{c.person_title ? `, ${c.person_title}` : ""} {c.is_primary && pill("Primary", "#E6F9F4", GREEN)}</div>
              {c.email && <div>✉ {c.email}</div>}
              {c.phone_e164 && <div>☎ {c.phone_e164} {c.timezone ? `· ${c.timezone}` : ""}</div>}
              {c.contact_form_url && <div>Form: <a href={c.contact_form_url} target="_blank" rel="noreferrer" style={{ color: TEAL }}>open</a></div>}
              {c.source_url && <div>Source: <a href={c.source_url} target="_blank" rel="noreferrer" style={{ color: TEAL }}>{c.source_url.slice(0, 60)}</a> · checked {c.verified_on || "—"}</div>}
              {ref && <div>Referred by {ref.person_name || ref.email}</div>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "stretch", minWidth: 210 }}>
              <select aria-label="Verification" style={inputStyle} value={c.verification} onChange={(e) => act("PATCH", { id: c.id, verification: e.target.value }, "Verification updated")}>
                {Object.entries(VERIFICATION_TEXT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select aria-label="Role" style={inputStyle} value={c.role_assessment} onChange={(e) => act("PATCH", { id: c.id, role_assessment: e.target.value }, "Role updated")}>
                {Object.entries(ROLE_TEXT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <label style={{ fontSize: 12, color: TEXT_MID, display: "flex", gap: 6, alignItems: "center" }}>
                <input type="checkbox" checked={c.followups_paused} onChange={(e) => act("PATCH", { id: c.id, followups_paused: e.target.checked }, e.target.checked ? "Follow-ups paused" : "Follow-ups resumed")} /> Pause follow-ups
              </label>
              {c.approved_for_contact
                ? <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "space-between" }}>{pill("Approved for contact", "#D0F5EA", "#007A5A")}<button style={btn("ghost")} onClick={() => act("PATCH", { id: c.id, action: "unapprove" }, "Approval removed")}>Unapprove</button></div>
                : <button style={btn("primary", !c.email || c.verification === "unverified")} disabled={!c.email || c.verification === "unverified"} title={c.verification === "unverified" ? "Verify on an official page first" : ""} onClick={() => act("PATCH", { id: c.id, action: "approve" }, "Contact approved")}>Approve for contact</button>}
              <button style={{ ...btn("ghost"), color: RED }} onClick={() => confirm("Delete this contact?") && act("DELETE", { id: c.id }, "Contact deleted")}>Delete</button>
            </div>
          </div>
        );
      })}
      <div style={{ ...cardStyle, ...grid(220) }}>
        <div style={{ gridColumn: "1 / -1", fontSize: 13, fontWeight: 700, color: TEXT }}>Add a contact (published channels only; never guess an address)</div>
        {(["department", "person_name", "person_title", "email", "phone", "contact_form_url", "source_url"] as const).map((k) => (
          <div key={k}><span style={labelStyle}>{k.replace(/_/g, " ")}</span><input style={inputStyle} value={nc[k]} onChange={(e) => setNc({ ...nc, [k]: e.target.value })} /></div>
        ))}
        <div><span style={labelStyle}>Verification</span>
          <select style={inputStyle} value={nc.verification} onChange={(e) => setNc({ ...nc, verification: e.target.value })}>{Object.entries(VERIFICATION_TEXT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><span style={labelStyle}>Checked on</span><input type="date" style={inputStyle} value={nc.verified_on} onChange={(e) => setNc({ ...nc, verified_on: e.target.value })} /></div>
        <div style={{ gridColumn: "1 / -1", textAlign: "right" }}>
          <button style={btn()} onClick={async () => { if (await act("POST", { ...nc, institution_id: inst.id }, "Contact added")) setNc(blank); }}>Add contact</button>
        </div>
      </div>
    </div>
  );
}

function ThreadPanel({ inst, campaign, thread, reload, notify }: { inst: Institution; campaign: Campaign | null; thread: Message[]; reload: () => void; notify: Notify }) {
  const emailContacts = inst.rc_contacts.filter((c) => c.email);
  const live = thread.filter((m) => m.state !== "cancelled");
  const hasHistory = live.length > 0;
  const hasInbound = live.some((m) => m.direction === "inbound");
  const [contactId, setContactId] = useState(emailContacts.find((c) => c.is_primary)?.id || emailContacts.find((c) => c.approved_for_contact)?.id || emailContacts[0]?.id || "");
  const [connection, setConnection] = useState("");
  const [sourceUrl, setSourceUrl] = useState(inst.source_url || "");
  const [log, setLog] = useState({ direction: "inbound", historical: false, from_email: "", to_email: "", subject: "", body: "", date: todayIso() });
  const [busy, setBusy] = useState(false);
  const missingFacts = !campaign?.selection_status || !campaign?.age_range || !campaign?.chaperone;

  const create = async (kind: "sequence" | "coordinator" | "reply", extra: Record<string, unknown> = {}) => {
    setBusy(true);
    try {
      const d = await api<{ markers: string[] }>("/api/admin/research/messages", "POST", { institution_id: inst.id, contact_id: contactId, kind, ...extra });
      notify(true, d.markers.length ? `Draft created. Still to fill: ${d.markers.join(", ")}` : kind === "sequence" ? "Initial e-mail and its two follow-ups drafted. Review and approve them together." : "Draft created");
      reload();
    } catch (e) {
      const data = (e as { data?: { needsOverride?: boolean } }).data;
      if (data?.needsOverride && confirm(`${(e as Error).message}\n\nStart a new sequence anyway?`)) { setBusy(false); return create(kind, { ...extra, override_previous: true }); }
      notify(false, e instanceof Error ? e.message : "Failed");
    }
    setBusy(false);
  };
  const logMessage = async () => {
    setBusy(true);
    try {
      const d = await api<{ label?: string; template4?: boolean }>("/api/admin/research/replies", "POST", { institution_id: inst.id, ...log });
      notify(true, log.direction === "outbound" ? "Past e-mail recorded" : `Message recorded. Suggested class: ${REPLY_LABEL_TEXT[d.label as keyof typeof REPLY_LABEL_TEXT] || d.label}${d.template4 ? " · Template 4 suggested" : ""}. Confirm it below.`);
      setLog({ ...log, from_email: "", to_email: "", subject: "", body: "" });
      reload();
    } catch (e) { notify(false, e instanceof Error ? e.message : "Failed"); }
    setBusy(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {thread.length === 0 && <div style={{ ...cardStyle, fontSize: 13, color: TEXT_LIGHT }}>No correspondence yet.</div>}
      {thread.map((m) => <MessageCard key={m.id} m={m} inst={inst} onChanged={reload} notify={notify} />)}

      <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, flex: 1 }}>{hasHistory ? "Write in this conversation" : "Start the sequence (Templates 1, 2 and 3)"}</div>
          <select aria-label="Recipient" style={{ ...inputStyle, width: 280 }} value={contactId} onChange={(e) => setContactId(e.target.value)}>
            {emailContacts.length === 0 && <option value="">No contact with an e-mail</option>}
            {emailContacts.map((c) => <option key={c.id} value={c.id}>{c.email}{c.approved_for_contact ? "" : " (not approved)"}</option>)}
          </select>
        </div>
        {!hasHistory ? (
          <>
            {missingFacts && <div style={{ fontSize: 12, color: AMBER }}>Selection status, ages or chaperone are not confirmed in Settings yet. The draft will show placeholders and cannot be approved until they are filled.</div>}
            <div>
              <span style={labelStyle}>Research connection (completes &quot;Given your institution&apos;s work in …&quot;)</span>
              <input style={inputStyle} value={connection} onChange={(e) => setConnection(e.target.value)} placeholder="e.g. cancer biology and its high-school laboratory programmes" />
              {inst.programme_evidence && <div style={{ fontSize: 11, color: TEXT_LIGHT, marginTop: 4 }}>Evidence on file: {inst.programme_evidence}</div>}
            </div>
            <div><span style={labelStyle}>Official page that supports it</span><input style={inputStyle} value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" /></div>
            <div style={{ fontSize: 11, color: TEXT_LIGHT }}>Creates the initial e-mail plus follow-ups for Day {campaign?.followup1_days ?? 3} and Day {campaign?.followup2_days ?? 7} ({campaign?.schedule_mode ?? "business"} days from the initial). Approving the initial approves all three; follow-ups go only if nobody replies.</div>
            <div style={{ textAlign: "right" }}><button style={btn("primary", busy || !contactId || !connection.trim() || !sourceUrl.trim())} disabled={busy || !contactId || !connection.trim() || !sourceUrl.trim()} onClick={() => create("sequence", { research_connection: connection, personalisation_source: sourceUrl })}>Draft sequence</button></div>
          </>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button style={btn("ghost", busy || !contactId || !hasInbound)} disabled={busy || !contactId || !hasInbound} title={hasInbound ? "" : "Only after a reply"} onClick={() => create("coordinator")}>Draft Template 4 (ask who is responsible)</button>
            <button style={btn("primary", busy || !contactId)} disabled={busy || !contactId} onClick={() => create("reply")}>Draft a contextual reply</button>
          </div>
        )}
      </div>

      <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Record a message from outside the platform</div>
        <div style={grid(150)}>
          <div><span style={labelStyle}>Direction</span>
            <select style={inputStyle} value={log.direction} onChange={(e) => setLog({ ...log, direction: e.target.value, historical: e.target.value === "outbound" ? true : log.historical })}>
              <option value="inbound">Received from them</option><option value="outbound">Sent by us (past)</option>
            </select></div>
          <div><span style={labelStyle}>From</span><input style={inputStyle} value={log.from_email} onChange={(e) => setLog({ ...log, from_email: e.target.value })} /></div>
          {log.direction === "outbound" && <div><span style={labelStyle}>To</span><input style={inputStyle} value={log.to_email} onChange={(e) => setLog({ ...log, to_email: e.target.value })} /></div>}
          <div><span style={labelStyle}>Date</span><input type="date" style={inputStyle} value={log.date} onChange={(e) => setLog({ ...log, date: e.target.value })} /></div>
        </div>
        <input style={inputStyle} placeholder="Subject" value={log.subject} onChange={(e) => setLog({ ...log, subject: e.target.value })} />
        <textarea style={{ ...inputStyle, minHeight: 100 }} value={log.body} onChange={(e) => setLog({ ...log, body: e.target.value })} placeholder="Paste the full text" />
        <label style={{ fontSize: 12, color: TEXT_MID, display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={log.historical} disabled={log.direction === "outbound"} onChange={(e) => setLog({ ...log, historical: e.target.checked })} />
          Earlier correspondence (before this campaign): record only, do not change the stage or follow-ups
        </label>
        <div style={{ textAlign: "right" }}><button style={btn("primary", busy || !log.body.trim())} disabled={busy || !log.body.trim()} onClick={logMessage}>Record</button></div>
      </div>
    </div>
  );
}

function MessageCard({ m, inst, onChanged, notify, showInstitution = false, onOpen }: { m: Message; inst?: Institution; onChanged: () => void; notify: Notify; showInstitution?: boolean; onOpen?: (id: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(m.subject || "");
  const [body, setBody] = useState(m.body || "");
  const [open, setOpen] = useState(m.direction === "inbound" || ["draft", "in_review", "failed"].includes(m.state) || (m.state === "approved" && m.step !== "followup1" && m.step !== "followup2"));
  const labels = [...(m.rc_reply_labels || [])].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const confirmed = labels.find((l) => l.confirmed_at);
  const suggested = labels.find((l) => !l.confirmed_at);
  const [label, setLabel] = useState(confirmed?.label || suggested?.label || "unclear");
  const [optOut, setOptOut] = useState(!!suggested?.opt_out);
  const [role, setRole] = useState<string>("");
  const [referral, setReferral] = useState({ person_name: "", person_title: "", department: "", email: "" });
  const isFollowup = m.step === "followup1" || m.step === "followup2";

  const act = async (action: string, extra: Record<string, unknown> = {}) => {
    try {
      await api("/api/admin/research/messages", "PATCH", { id: m.id, action, ...extra });
      notify(true, action === "approve" && m.step === "initial" ? "Initial e-mail and its follow-ups approved" : action === "edit" ? "Saved (back to draft)" : `Done: ${action}`);
      setEditing(false); onChanged();
    } catch (e) { notify(false, e instanceof Error ? e.message : "Failed"); }
  };
  const confirmLabel = async () => {
    try {
      const d = await api<{ referredContactId: string | null }>("/api/admin/research/replies", "PATCH", {
        message_id: m.id, label, opt_out: optOut, respondent_role: role || null,
        referral: label === "referred" && (referral.email || referral.person_name) ? referral : null,
      });
      notify(true, `Class confirmed: ${REPLY_LABEL_TEXT[label as keyof typeof REPLY_LABEL_TEXT]}${d.referredContactId ? "; referred contact added (approve it before writing)" : ""}`);
      onChanged();
    } catch (e) { notify(false, e instanceof Error ? e.message : "Failed"); }
  };
  const when = m.direction === "inbound" ? m.received_at : m.sent_at || m.created_at;
  const queued = m.state === "approved" && m.scheduled_for;

  return (
    <div style={{ ...cardStyle, padding: 14, borderLeft: `3px solid ${m.direction === "inbound" ? GREEN : MESSAGE_STATE_COLOR[m.state] || TEXT_LIGHT}`, opacity: m.state === "cancelled" ? 0.6 : 1 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", cursor: "pointer" }} onClick={() => setOpen(!open)}>
        <span style={{ fontSize: 11, fontWeight: 700, color: m.direction === "inbound" ? GREEN : TEXT_MID, textTransform: "uppercase" }}>{m.direction === "inbound" ? "↙ " : "↗ "}{STEP_TEXT[m.step] || m.step}</span>
        {pill(m.state.replace("_", " "), "#F3F5F8", MESSAGE_STATE_COLOR[m.state] || TEXT_MID)}
        {m.historical && pill("earlier correspondence", "#F3F5F8", TEXT_MID)}
        {queued && pill(`${isFollowup ? "sends" : "queued for"} ${fmtDate(m.scheduled_for)} if no reply`.replace(" if no reply", isFollowup ? " if no reply" : ""), "#E6F0FD", "#1A6DD4")}
        {m.state === "approved" && isFollowup && !m.scheduled_for && pill("approved, waits for the initial e-mail", "#E6F0FD", "#1A6DD4")}
        {m.delivery_status && pill(m.delivery_status, m.delivery_status === "bounced" || m.delivery_status === "complained" ? "#FDECEA" : "#F3F5F8", m.delivery_status === "bounced" || m.delivery_status === "complained" ? RED : TEXT_MID)}
        {confirmed && pill(REPLY_LABEL_TEXT[confirmed.label as keyof typeof REPLY_LABEL_TEXT], "#D0F5EA", "#007A5A")}
        {showInstitution && m.rc_institutions && <span onClick={(e) => { e.stopPropagation(); onOpen?.(m.institution_id); }} style={{ fontSize: 12, fontWeight: 700, color: TEAL }}>{m.rc_institutions.name}</span>}
        <span style={{ fontSize: 12, color: TEXT, fontWeight: 600, flex: "1 1 200px" }}>{m.subject}</span>
        <span style={{ fontSize: 11, color: TEXT_LIGHT }}>{m.direction === "inbound" ? m.from_email : m.to_email} · {fmtDate(when)}</span>
      </div>
      {open && (
        <div style={{ marginTop: 10 }}>
          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input style={inputStyle} value={subject} onChange={(e) => setSubject(e.target.value)} />
              <textarea style={{ ...inputStyle, minHeight: 300, fontFamily: "'DM Mono', monospace", fontSize: 12 }} value={body} onChange={(e) => setBody(e.target.value)} />
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button style={btn("ghost")} onClick={() => { setEditing(false); setSubject(m.subject || ""); setBody(m.body || ""); }}>Discard</button>
                <button style={btn()} onClick={() => act("edit", { subject, body })}>Save</button>
              </div>
            </div>
          ) : (
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "'DM Sans', sans-serif", fontSize: 12.5, color: TEXT_MID, background: "#FAFBFC", border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12, margin: 0, maxHeight: 420, overflowY: "auto" }}>{m.body}</pre>
          )}
          {m.personalisation_source && <div style={{ marginTop: 6, fontSize: 11, color: TEXT_LIGHT }}>Personalisation source: <a href={m.personalisation_source} target="_blank" rel="noreferrer" style={{ color: TEAL }}>{m.personalisation_source}</a>{m.template_key ? ` · template ${m.template_key} v${m.template_version}` : ""}</div>}
          {m.markers?.length > 0 && <div style={{ marginTop: 8, fontSize: 12, color: RED }}>To fill before approval: {m.markers.join(", ")}</div>}
          {m.error_message && <div style={{ marginTop: 8, fontSize: 12, color: m.state === "failed" ? RED : AMBER }}>{m.error_message}</div>}
          {m.direction === "outbound" && !m.historical && !editing && (
            <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {["draft", "in_review", "approved", "failed"].includes(m.state) && <button style={btn("ghost")} onClick={() => setEditing(true)}>Edit</button>}
              {m.state === "draft" && <button style={btn("ghost")} onClick={() => act("submit")}>Submit for review</button>}
              {["draft", "in_review"].includes(m.state) && <button style={btn("primary", m.markers?.length > 0)} disabled={m.markers?.length > 0} onClick={() => act("approve")}>{m.step === "initial" ? "Approve with its follow-ups" : "Approve"}</button>}
              {m.state === "approved" && <button style={btn("ghost")} onClick={() => act("unapprove")}>Unapprove</button>}
              {m.state === "failed" && <button style={btn("ghost")} onClick={() => act("retry")}>Back to review</button>}
              {["draft", "in_review", "approved", "failed"].includes(m.state) && <button style={{ ...btn("ghost"), color: RED }} onClick={() => confirm(m.step === "initial" ? "Cancel the initial e-mail and its follow-ups?" : "Cancel this message?") && act("cancel")}>Cancel</button>}
            </div>
          )}
          {m.direction === "inbound" && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8, background: "#FAFBFC", border: `1px solid ${BORDER}`, borderRadius: 10, padding: 10 }}>
              {suggested && <div style={{ fontSize: 12, color: TEXT_MID }}>Suggested ({suggested.source}{suggested.confidence !== null ? ` ${Math.round((suggested.confidence || 0) * 100)}%` : ""}): <b>{REPLY_LABEL_TEXT[suggested.label as keyof typeof REPLY_LABEL_TEXT]}</b>{suggested.rationale ? ` · ${suggested.rationale}` : ""}{suggested.return_date ? ` · back on ${suggested.return_date}` : ""}{suggested.opt_out ? " · asked not to be contacted" : ""}</div>}
              <div style={{ fontSize: 12, color: TEXT_LIGHT }}>Action: {REPLY_LABEL_ACTION[label as keyof typeof REPLY_LABEL_ACTION]}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <select aria-label="Reply class" style={{ ...inputStyle, width: 240 }} value={label} onChange={(e) => setLabel(e.target.value)}>{REPLY_LABELS.map((k) => <option key={k} value={k}>{REPLY_LABEL_TEXT[k]}</option>)}</select>
                <select aria-label="Respondent role" style={{ ...inputStyle, width: 240 }} value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="">Respondent&apos;s role: not assessed</option><option value="appropriate">Respondent is the right coordinator</option><option value="not_appropriate">Respondent is not the coordinator</option>
                </select>
                <label style={{ fontSize: 12, color: TEXT_MID, display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={optOut} onChange={(e) => setOptOut(e.target.checked)} /> Asked not to be contacted</label>
              </div>
              {label === "referred" && (
                <div style={grid(160)}>
                  {(["person_name", "person_title", "department", "email"] as const).map((k) => (
                    <div key={k}><span style={labelStyle}>Referred {k.replace("_", " ")}</span><input style={inputStyle} value={referral[k]} onChange={(e) => setReferral({ ...referral, [k]: e.target.value })} /></div>
                  ))}
                </div>
              )}
              {inst && (label === "requests_coordinator") && <div style={{ fontSize: 12, color: AMBER }}>After confirming, use &quot;Draft Template 4&quot; below the conversation.</div>}
              <div style={{ textAlign: "right" }}><button style={btn()} onClick={confirmLabel}>{confirmed ? "Correct class" : "Confirm class"}</button></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CostsPanel({ instId, costs, reload, notify }: { instId: string; costs: { id: string; category: string; amount: number | null; currency: string; basis: string | null; description: string | null }[]; reload: () => void; notify: Notify }) {
  const [c, setC] = useState({ category: "hosting_fee", amount: "", currency: "USD", basis: "per_group", description: "" });
  const CAT: Record<string, string> = { hosting_fee: "Programme / hosting fee", lab_access: "Laboratory access / training", insurance_safety: "Insurance / safety training", materials: "Materials / equipment", administrative: "Administrative", travel_accommodation: "Travel & accommodation", other: "Other mandatory" };
  const add = async () => {
    try { await api("/api/admin/research/costs", "POST", { ...c, institution_id: instId }); notify(true, "Cost line added"); reload(); setC({ ...c, amount: "", description: "" }); }
    catch (e) { notify(false, e instanceof Error ? e.message : "Failed"); }
  };
  return (
    <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 12, color: TEXT_LIGHT }}>Record only figures quoted in writing. Institution fees are kept apart from travel and accommodation. Nothing here commits the Foundation.</div>
      {costs.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <tbody>{costs.map((x) => (
              <tr key={x.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                <td style={{ padding: 6 }}>{CAT[x.category]}</td><td style={{ fontFamily: "'DM Mono', monospace" }}>{x.amount !== null ? `${x.amount} ${x.currency}` : "—"}</td>
                <td>{x.basis?.replace("_", " ")}</td><td style={{ color: TEXT_MID }}>{x.description}</td>
                <td style={{ textAlign: "right" }}><button style={{ ...btn("ghost"), color: RED }} onClick={async () => { await api("/api/admin/research/costs", "DELETE", { id: x.id }); reload(); }}>✕</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <div style={grid(140)}>
        <select style={inputStyle} value={c.category} onChange={(e) => setC({ ...c, category: e.target.value })}>{Object.entries(CAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <input style={inputStyle} placeholder="Amount" value={c.amount} onChange={(e) => setC({ ...c, amount: e.target.value })} />
        <input style={inputStyle} value={c.currency} onChange={(e) => setC({ ...c, currency: e.target.value.toUpperCase().slice(0, 3) })} />
        <select style={inputStyle} value={c.basis} onChange={(e) => setC({ ...c, basis: e.target.value })}><option value="per_group">per group</option><option value="per_student">per student</option><option value="per_day">per day</option><option value="other">other</option></select>
      </div>
      <input style={inputStyle} placeholder="Inclusions, exclusions, payment conditions, quote reference" value={c.description} onChange={(e) => setC({ ...c, description: e.target.value })} />
      <div style={{ textAlign: "right" }}><button style={btn()} onClick={add}>Add cost line</button></div>
    </div>
  );
}

// ── Review & send ───────────────────────────────────────────────────────
function ReviewQueue({ queue, campaign, readiness, onChanged, notify, onOpen }: { queue: Message[]; campaign: Campaign | null; readiness: Readiness | null; onChanged: () => void; notify: Notify; onOpen: (id: string) => void }) {
  const sendable = (m: Message) => m.state === "approved" && m.step !== "followup1" && m.step !== "followup2" && !m.scheduled_for;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [report, setReport] = useState<{ id: string; status: string; reasons?: string[]; reason?: string; error?: string }[]>([]);
  const live = campaign?.status === "active" && campaign.sending_enabled;
  const waiting = queue.filter((m) => m.state === "approved" && (m.step === "followup1" || m.step === "followup2"));
  const toReview = queue.filter((m) => !waiting.includes(m));

  const send = async () => {
    const ids = [...selected].filter((id) => queue.some((m) => m.id === id && sendable(m)));
    if (!ids.length) return;
    const names = ids.map((id) => { const m = queue.find((x) => x.id === id)!; return `• ${m.rc_institutions?.name} → ${m.to_email} (${STEP_TEXT[m.step]})`; }).join("\n");
    if (!confirm(`Send ${ids.length} approved message(s) from ${campaign?.sender_email}?\n\n${names}\n\nOutside the recipient's business hours a message is queued for the next daily run. Approved follow-ups will then go automatically on their due dates unless the institution replies.`)) return;
    setSending(true);
    try {
      const d = await api<{ results: typeof report; sent: number; queued: number; blocked: number; failed: number }>("/api/admin/research/send", "POST", { message_ids: ids.slice(0, 10) });
      setReport(d.results); setSelected(new Set());
      notify(d.failed === 0 && d.blocked === 0, `${d.sent} sent · ${d.queued} queued · ${d.blocked} blocked · ${d.failed} failed`);
      onChanged();
    } catch (e) { notify(false, e instanceof Error ? e.message : "Send failed"); }
    setSending(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ ...cardStyle, padding: 14, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 260px", fontSize: 12, color: TEXT_MID }}>
          Approve each institution&apos;s initial e-mail (its two follow-ups are approved with it), select it, then <b>Send</b>. The daily job sends due follow-ups at 17:00 UTC unless the institution replied, paused or bounced. Every gate is re-checked before each message.
          {!live && <div style={{ color: AMBER, marginTop: 4 }}>Sending is off for this campaign. Approved messages wait here until it is switched on in Settings.</div>}
          {readiness && <div style={{ color: TEXT_LIGHT, marginTop: 4 }}>{readiness.sentToday} of {campaign?.daily_send_cap} sent today.</div>}
        </div>
        <button style={btn("primary", !live || sending || selected.size === 0)} disabled={!live || sending || selected.size === 0} onClick={send}>{sending ? "Sending…" : `Send ${selected.size} approved`}</button>
      </div>
      {report.length > 0 && (
        <div style={{ ...cardStyle, padding: 14, fontSize: 12 }}>
          {report.map((r) => <div key={r.id} style={{ color: r.status === "sent" ? GREEN : r.status === "queued" ? "#1A6DD4" : RED }}>{r.status}: {queue.find((m) => m.id === r.id)?.rc_institutions?.name || r.id} {r.reasons ? `· ${r.reasons.join("; ")}` : ""}{r.reason ? `· ${r.reason}` : ""}{r.error ? `· ${r.error}` : ""}</div>)}
        </div>
      )}
      {toReview.length === 0 && <div style={{ ...cardStyle, fontSize: 13, color: TEXT_LIGHT }}>Nothing to review. Draft a sequence from an institution&apos;s Correspondence tab.</div>}
      {toReview.map((m) => (
        <div key={m.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <input type="checkbox" aria-label="Select to send" style={{ marginTop: 18 }} disabled={!sendable(m)} checked={selected.has(m.id)}
            onChange={(e) => setSelected((s) => { const n = new Set(s); if (e.target.checked) n.add(m.id); else n.delete(m.id); return n; })} />
          <div style={{ flex: 1, minWidth: 0 }}><MessageCard m={m} onChanged={onChanged} notify={notify} showInstitution onOpen={onOpen} /></div>
        </div>
      ))}
      {waiting.length > 0 && (
        <div style={{ ...cardStyle, padding: 14 }}>
          <div style={sectionTitle}>Approved follow-ups ({waiting.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {waiting.map((m) => <MessageCard key={m.id} m={m} onChanged={onChanged} notify={notify} showInstitution onOpen={onOpen} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tasks ───────────────────────────────────────────────────────────────
function TasksView({ tasks, onChanged, notify, onOpen }: { tasks: Task[]; onChanged: () => void; notify: Notify; onOpen: (id: string) => void }) {
  const [outcome, setOutcome] = useState<Record<string, string>>({});
  const [callOutcome, setCallOutcome] = useState<Record<string, string>>({});
  const update = async (t: Task, status: string) => {
    if (t.task_type === "call" && status === "done" && !callOutcome[t.id]) { notify(false, "Choose the call outcome first"); return; }
    try { await api("/api/admin/research/tasks", "PATCH", { id: t.id, status, outcome: outcome[t.id] || null, ...(t.task_type === "call" ? { call_outcome: callOutcome[t.id] || null } : {}) }); notify(true, "Task updated"); onChanged(); }
    catch (e) { notify(false, e instanceof Error ? e.message : "Failed"); }
  };
  const TYPE: Record<string, string> = { call: "Phone call", meeting: "Meeting", quote: "Quotation", reply: "Reply", referral: "Referral", other: "Action" };
  const localNow = (tz: string | null) => tz ? new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit" }).format(new Date()) : null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 12, color: TEXT_LIGHT }}>Calls are made by a person; the platform never dials. Follow-up e-mails are not tasks: they are approved with the initial e-mail and sent by the daily job.</div>
      {tasks.length === 0 && <div style={{ ...cardStyle, fontSize: 13, color: TEXT_LIGHT }}>No open tasks.</div>}
      {tasks.map((t) => {
        const overdue = t.due_date && t.due_date < todayIso();
        const now = localNow(t.rc_contacts?.timezone ?? null);
        return (
          <div key={t.id} style={{ ...cardStyle, padding: 14, borderLeft: `3px solid ${overdue ? RED : t.task_type === "call" ? AMBER : TEAL}` }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {pill(TYPE[t.task_type] || t.task_type, "#F3F5F8", TEXT_MID)}
              <span onClick={() => onOpen(t.institution_id)} style={{ fontWeight: 700, color: TEAL, cursor: "pointer", fontSize: 13 }}>{t.rc_institutions?.name}</span>
              <span style={{ fontSize: 11, color: TEXT_LIGHT }}>{[t.rc_institutions?.city, t.rc_institutions?.state].filter(Boolean).join(", ")}</span>
              <span style={{ marginLeft: "auto", fontSize: 12, color: overdue ? RED : TEXT_LIGHT, fontFamily: "'DM Mono', monospace" }}>due {t.due_date || "—"}</span>
            </div>
            <div style={{ fontSize: 12, color: TEXT_MID, marginTop: 6, lineHeight: 1.6 }}>
              {t.objective && <div>Objective: {t.objective}</div>}
              {t.task_type === "call" && t.rc_contacts && <div>☎ <b>{t.rc_contacts.phone_e164}</b> · {t.rc_contacts.person_name || t.rc_contacts.department || "Main line"}{now ? ` · local time now ${now}` : ""}</div>}
              {t.calling_window && <div>Calling window: {t.calling_window}</div>}
              {t.last_email && <div>Last e-mail: {t.last_email}</div>}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {t.task_type === "call" && (
                <select aria-label="Call outcome" style={{ ...inputStyle, width: 230 }} value={callOutcome[t.id] || ""} onChange={(e) => setCallOutcome({ ...callOutcome, [t.id]: e.target.value })}>
                  <option value="">Call outcome…</option>{CALL_OUTCOMES.map((k) => <option key={k} value={k}>{CALL_TEXT[k]}</option>)}
                </select>
              )}
              <input style={{ ...inputStyle, flex: "1 1 200px" }} placeholder="Notes and agreed next action" value={outcome[t.id] || ""} onChange={(e) => setOutcome({ ...outcome, [t.id]: e.target.value })} />
              <button style={btn()} onClick={() => update(t, "done")}>Done</button>
              <button style={btn("ghost")} onClick={() => update(t, "cancelled")}>Cancel</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Settings, templates, import, export ─────────────────────────────────
function TemplatesEditor({ notify }: { notify: Notify }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [placeholders, setPlaceholders] = useState<Record<string, string>>({});
  const [active, setActive] = useState("initial");
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null);
  const load = useCallback(() => {
    api<{ templates: Template[]; placeholders: Record<string, string> }>("/api/admin/research/templates")
      .then((d) => { setTemplates(d.templates); setPlaceholders(d.placeholders); })
      .catch((e) => notify(false, e instanceof Error ? e.message : "Could not load templates"));
  }, [notify]);
  useEffect(() => { load(); }, [load]);
  const t = templates.find((x) => x.key === active);
  useEffect(() => { if (t) setDraft({ subject: t.subject, body: t.body }); }, [t]);
  const save = async () => {
    if (!draft) return;
    try { await api("/api/admin/research/templates", "PATCH", { key: active, ...draft }); notify(true, "Template saved as a new version. Existing drafts keep their text."); load(); }
    catch (e) { notify(false, e instanceof Error ? e.message : "Failed"); }
  };
  return (
    <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={sectionTitle}>E-mail templates</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {templates.map((x) => <button key={x.key} onClick={() => setActive(x.key)} style={{ padding: "6px 12px", borderRadius: 14, border: "none", background: active === x.key ? TEXT : "#F3F5F8", color: active === x.key ? "#fff" : TEXT_MID, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{x.label}</button>)}
      </div>
      {t && draft && (
        <>
          <div style={{ fontSize: 11, color: TEXT_LIGHT }}>Version {t.version}, saved {fmtDate(t.updated_at)}. Not sent automatically: a template only becomes a draft for one institution, which a person approves.</div>
          <input style={inputStyle} value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
          <textarea style={{ ...inputStyle, minHeight: 320, fontFamily: "'DM Mono', monospace", fontSize: 12 }} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
          <div style={{ fontSize: 11, color: TEXT_LIGHT, lineHeight: 1.6 }}>Placeholders: {Object.entries(placeholders).map(([k, v]) => <span key={k} title={v} style={{ marginRight: 8, fontFamily: "'DM Mono', monospace" }}>{`{{${k}}}`}</span>)}</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button style={btn("ghost")} onClick={() => setDraft({ subject: t.subject, body: t.body })}>Discard changes</button>
            <button style={btn("primary", draft.subject === t.subject && draft.body === t.body)} disabled={draft.subject === t.subject && draft.body === t.body} onClick={save}>Save new version</button>
          </div>
        </>
      )}
    </div>
  );
}

function SettingsView({ campaign, readiness, onChanged, notify }: { campaign: Campaign; readiness: Readiness | null; onChanged: () => void; notify: Notify }) {
  const [f, setF] = useState(campaign);
  const [csv, setCsv] = useState("");
  const [plan, setPlan] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [supp, setSupp] = useState<{ id: string; value: string; kind: string; reason: string }[]>([]);
  const [newSupp, setNewSupp] = useState("");
  const loadSupp = useCallback(() => { api<{ suppressions: typeof supp }>("/api/admin/research/suppressions").then((d) => setSupp(d.suppressions)).catch(() => {}); }, []);
  useEffect(() => { loadSupp(); }, [loadSupp]);

  const patch = async (body: Record<string, unknown>, ok: string) => {
    try { await api("/api/admin/research/campaign", "PATCH", body); notify(true, ok); onChanged(); }
    catch (e) { notify(false, e instanceof Error ? e.message : "Failed"); }
  };
  const KEYS = ["sender_name", "sender_email", "reply_to", "sender_provider", "reply_mailbox", "selection_status", "age_range", "chaperone",
    "schedule_mode", "followup1_days", "followup2_days", "no_response_after_days", "send_window_start", "send_window_end", "daily_send_cap"] as const;
  const saveSettings = () => patch({ fields: Object.fromEntries(KEYS.map((k) => [k, f[k]])) }, "Settings saved");
  const runImport = async (apply: boolean) => {
    setBusy(true);
    try {
      const d = await api<Record<string, unknown>>("/api/admin/research/import", "POST", { csv, apply });
      setPlan(d);
      if (apply) { notify(true, "Import applied. Imported contacts are not approved."); onChanged(); }
    } catch (e) { notify(false, e instanceof Error ? e.message : "Import failed"); }
    setBusy(false);
  };
  const check = (ok: boolean | undefined, text: string) => <div style={{ fontSize: 12, color: ok ? GREEN : AMBER }}>{ok ? "✓" : "○"} {text}</div>;
  const text = (k: keyof Campaign, label: string, placeholder = "") => (
    <div><span style={labelStyle}>{label}</span><input style={inputStyle} value={(f[k] as string) ?? ""} placeholder={placeholder} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
  );
  const num = (k: keyof Campaign, label: string) => (
    <div><span style={labelStyle}>{label}</span><input type="number" style={inputStyle} value={(f[k] as number) ?? 0} onChange={(e) => setF({ ...f, [k]: Number(e.target.value) })} /></div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={grid(300)}>
        <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={sectionTitle}>Sender</div>
          {text("sender_name", "Display name")}
          {text("sender_email", "From")}
          {text("reply_to", "Reply-To")}
          <div><span style={labelStyle}>Provider</span>
            <select style={inputStyle} value={f.sender_provider} onChange={(e) => setF({ ...f, sender_provider: e.target.value as "resend" | "gmail" })}>
              <option value="gmail">Gmail API (sender&apos;s own mailbox, keeps threads)</option><option value="resend">Resend</option>
            </select></div>
          {text("reply_mailbox", "Mailbox the reply sync reads")}
          <div style={{ fontSize: 11, color: TEXT_LIGHT }}>Changing the sender revokes campaign approval and switches sending off.</div>
        </div>
        <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={sectionTitle}>Facts used in the e-mails</div>
          {text("selection_status", "The students …", "are being selected")}
          {text("age_range", "Aged …", "16 to 18")}
          {text("chaperone", "Accompanied by …", "two teachers from their school")}
          <div style={{ fontSize: 11, color: TEXT_LIGHT }}>Leave empty until confirmed by leadership: a first e-mail cannot be approved without them.</div>
        </div>
        <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={sectionTitle}>Follow-ups and pacing</div>
          <div><span style={labelStyle}>Count days as</span>
            <select style={inputStyle} value={f.schedule_mode} onChange={(e) => setF({ ...f, schedule_mode: e.target.value as "business" | "calendar" })}>
              <option value="business">Business days (no weekends or US holidays)</option><option value="calendar">Calendar days</option>
            </select></div>
          <div style={grid(110)}>
            {num("followup1_days", "Follow-up 1: day")}{num("followup2_days", "Final: day")}{num("no_response_after_days", "No response after +days")}
            {num("send_window_start", "Window from (h)")}{num("send_window_end", "Window to (h)")}{num("daily_send_cap", "Daily cap")}
          </div>
          <div style={{ fontSize: 11, color: TEXT_LIGHT }}>Days count from the initial e-mail. The window is the recipient&apos;s local time, weekdays.</div>
          <div style={{ textAlign: "right" }}><button style={btn()} onClick={saveSettings}>Save settings</button></div>
        </div>
        <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={sectionTitle}>Approval and sending</div>
          {check(!!campaign.selection_status && !!campaign.age_range && !!campaign.chaperone, "Student facts confirmed")}
          {check(readiness?.senderAllowed, `Sender in RC_ALLOWED_SENDERS (${readiness?.allowedSenders.join(", ") || "none set"})`)}
          {check(campaign.sender_provider === "gmail" ? readiness?.gmailSendConfigured : readiness?.resendConfigured, campaign.sender_provider === "gmail" ? "Gmail sending credentials (RC_GMAIL_REFRESH_TOKEN)" : "Resend API key")}
          {check(readiness?.replyCronConfigured, "Reply sync configured (RC_GMAIL_USER, RC_GMAIL_REFRESH_TOKEN, CRON_SECRET). Without it, follow-ups are held.")}
          {campaign.sender_provider === "resend" && check(readiness?.deliveryWebhookConfigured, "Delivery webhook (RC_RESEND_WEBHOOK_SECRET)")}
          {check(readiness?.classifierModel, "Reply classifier model (otherwise keyword rules)")}
          {check(!!campaign.approved_at, `Campaign approved${campaign.approved_at ? ` on ${fmtDate(campaign.approved_at)}` : ""}`)}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            {!campaign.approved_at && <button style={btn()} onClick={() => confirm("Approve this campaign's sender, student facts and templates?") && patch({ action: "approve" }, "Campaign approved")}>Approve campaign</button>}
            {campaign.approved_at && <button style={btn("ghost")} onClick={() => patch({ action: "revoke" }, "Approval revoked")}>Revoke approval</button>}
            {campaign.approved_at && campaign.status !== "active" && <button style={btn()} onClick={() => patch({ action: "activate" }, "Campaign active")}>Activate</button>}
            {campaign.status === "active" && !campaign.sending_enabled && <button style={btn()} onClick={() => confirm("Switch sending ON? Initial e-mails go only when you press Send; approved follow-ups then go automatically on their due dates unless a reply or stop condition intervenes.") && patch({ action: "enable_sending" }, "Sending switched on")}>Switch sending ON</button>}
            {campaign.sending_enabled && <button style={btn("danger")} onClick={() => patch({ action: "disable_sending" }, "Sending switched off: nothing will be sent, including follow-ups")}>Switch sending OFF</button>}
            {campaign.status === "active" && <button style={btn("ghost")} onClick={() => patch({ action: "pause" }, "Campaign paused")}>Pause</button>}
          </div>
        </div>
      </div>

      <TemplatesEditor notify={notify} />

      <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={sectionTitle}>Import institutions (CSV)</div>
        <div style={{ fontSize: 12, color: TEXT_LIGHT }}>
          Accepts the research files (02_CANDIDATES.csv, 02b_CANDIDATES_EXPANSION.csv) or this page&apos;s export. Duplicates match by website domain, then by name; a contact e-mail already in the campaign is skipped. Imported contacts are never approved. Run a dry run first.
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input type="file" accept=".csv,text/csv" style={{ maxWidth: "100%" }} onChange={async (e) => { const file = e.target.files?.[0]; if (file) { setCsv(await file.text()); setPlan(null); } }} />
          <span style={{ fontSize: 12, color: TEXT_LIGHT }}>{csv ? `${csv.split(/\r?\n/).length - 1} lines loaded` : "or paste below"}</span>
        </div>
        <textarea style={{ ...inputStyle, minHeight: 90, fontFamily: "'DM Mono', monospace", fontSize: 11 }} value={csv} onChange={(e) => { setCsv(e.target.value); setPlan(null); }} />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button style={btn("ghost", busy || !csv.trim())} disabled={busy || !csv.trim()} onClick={() => runImport(false)}>Dry run</button>
          <button style={btn("primary", busy || !plan || !(plan as { dryRun?: boolean }).dryRun)} disabled={busy || !plan || !(plan as { dryRun?: boolean }).dryRun} onClick={() => confirm("Apply this import?") && runImport(true)}>Apply import</button>
        </div>
        {plan && <pre style={{ fontSize: 11, background: "#FAFBFC", border: `1px solid ${BORDER}`, borderRadius: 10, padding: 10, maxHeight: 260, overflow: "auto", margin: 0 }}>{JSON.stringify(plan, null, 2)}</pre>}
      </div>

      <div style={grid(300)}>
        <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={sectionTitle}>Export (CSV, opens in Excel)</div>
          {[["summary", "Management summary"], ["institutions", "Institutions"], ["contacts", "Contacts"], ["messages", "Messages"]].map(([t, l]) => <a key={t} href={`/api/admin/research/export?type=${t}`} style={{ ...btn("ghost"), textDecoration: "none", textAlign: "center" }}>Download {l}</a>)}
        </div>
        <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={sectionTitle}>Do not contact ({supp.length})</div>
          <div style={{ display: "flex", gap: 6 }}>
            <input style={inputStyle} value={newSupp} onChange={(e) => setNewSupp(e.target.value)} placeholder="address@domain or domain.edu" />
            <button style={btn()} onClick={async () => {
              try { await api("/api/admin/research/suppressions", "POST", { value: newSupp, kind: newSupp.includes("@") ? "email" : "domain", reason: "no_further_contact" }); setNewSupp(""); loadSupp(); notify(true, "Added"); }
              catch (e) { notify(false, e instanceof Error ? e.message : "Failed"); }
            }}>Add</button>
          </div>
          <div style={{ maxHeight: 180, overflowY: "auto" }}>
            {supp.map((s) => (
              <div key={s.id} style={{ display: "flex", gap: 6, fontSize: 12, padding: "4px 0", borderTop: `1px solid ${BORDER}`, alignItems: "center" }}>
                <span style={{ flex: 1, color: TEXT, overflowWrap: "anywhere" }}>{s.value}</span><span style={{ color: TEXT_LIGHT }}>{s.reason}</span>
                <button style={{ ...btn("ghost"), padding: "2px 8px" }} onClick={async () => { if (confirm("Remove from the do-not-contact list?")) { await api("/api/admin/research/suppressions", "DELETE", { id: s.id }); loadSupp(); } }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
