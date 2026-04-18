"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
const MemberMap = dynamic(() => import("@/components/member-map"), { ssr: false });

const TEAL = "#2EC4B6";
const TEAL_DARK = "#1A9E92";
const TEAL_LIGHT = "#E8F8F6";
const TEAL_MUTED = "#B2E8E2";
const BG = "#F7F9FC";
const CARD = "#FFFFFF";
const BORDER = "#E8EDF3";
const TEXT = "#1A2332";
const TEXT_MID = "#4A5568";
const TEXT_LIGHT = "#8896A6";
const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)";
const SHADOW_HOVER = "0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.05)";

const PROJECT_COLORS = ["#2EC4B6","#7C5CFC","#E74C6F","#F0A500","#00B894","#4A7DFF","#FF6B6B","#A29BFE"];
const PROJECT_PILLARS = ["Digital Twin Therapeutics","Synthetic Biology & Cell Engineering","Automated Biomanufacturing","Integrated Multi-Omics Analytics"];
const PROJECT_PHASES = ["Ideation","Planning","Discovery","Development","Validation","Execution","Production","Completed"];
const PROJECT_STATUSES = ["on-track","at-risk","blocked"];
const EVENT_TYPES = ["internal","national","international","online"];
const EQUIPMENT_CATEGORIES = ["Flow Cytometry","Sequencing","Imaging","Spectroscopy","Cell Culture","Electroporation","Organoid","PCR","Other"];

const KNOWLEDGE_CATEGORIES = [
  { name: "Regulatory Pathways", icon: "book", desc: "IVDR, MDR, EMA guidance documents", color: TEAL, bg: TEAL_LIGHT },
  { name: "Funding Programs", icon: "chart", desc: "NIDI, Mini-PIA, PIA, Horizon Europe guides", color: "#7C5CFC", bg: "#F0EDFF" },
  { name: "Technical Protocols", icon: "flask", desc: "Lab procedures and best practices", color: "#E74C6F", bg: "#FDECF1" },
  { name: "IP Strategy", icon: "layers", desc: "Patent templates and licensing frameworks", color: "#F0A500", bg: "#FFF8E6" },
  { name: "Onboarding", icon: "users", desc: "New member guides and welcome materials", color: "#00B894", bg: "#E6F9F5" },
  { name: "Webinar Archive", icon: "globe", desc: "Expert webinar recordings and slides", color: "#4A7DFF", bg: "#EBF1FF" },
];

function generateProjectObjectives(project: Partial<Project>): string[] {
  const name = project.name?.trim() || "this project";
  const pillar = project.pillar?.trim() || "the selected pillar";
  const phase = project.phase?.trim() || "the current phase";
  return [
    `Define a clear scope and expected outcomes for ${name}.`,
    `Develop a practical workplan aligned with ${pillar}.`,
    `Track execution milestones and risks during the ${phase} phase.`,
    `Document progress updates, evidence, and next actions for internal review.`,
  ];
}

// ─── CHANGE 1: OBJECTIVE HELPERS ──────────────────────────────────────────────
// Completion state is encoded as a "[x] " prefix on the objective string.
// This persists in the DB without any schema change.
function isObjectiveComplete(obj: string): boolean {
  return obj.startsWith("[x] ");
}
function getObjectiveText(obj: string): string {
  return obj.startsWith("[x] ") ? obj.slice(4) : obj;
}
function toggleObjectiveComplete(obj: string): string {
  return obj.startsWith("[x] ") ? obj.slice(4) : `[x] ${obj}`;
}

// ─── CHANGE 2: LEAD MAILTO HELPER ─────────────────────────────────────────────
// If the lead string contains "@" we use it directly as the email address.
// Otherwise we construct firstname.lastname@bioergotech.org from the display name,
// stripping common honorific prefixes.
function leadMailtoHref(lead: string): string {
  if (!lead) return "#";
  if (lead.includes("@")) return `mailto:${lead.trim()}`;
  const clean = lead.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s*/i, "").trim();
  const parts = clean.split(/\s+/);
  const first = parts[0]?.toLowerCase() || "";
  const last = parts[parts.length - 1]?.toLowerCase() || "";
  const email = last && last !== first ? `${first}.${last}@bioergotech.org` : `${first}@bioergotech.org`;
  return `mailto:${email}`;
}

// ─── TYPES ────────────────────────────────────────────────────────────────────
type Project = { id?: string; name: string; pillar: string; phase: string; status: string; lead: string; lead_email?: string | null; lead_phone?: string | null; description: string; progress: number; color: string; is_public?: boolean; objectives?: string[]; update_notes?: string | null; created_by?: string | null; updated_at?: string | null; };
type Event = { id?: string; title: string; event_date: string; event_type: string; location: string; description?: string; video_link?: string; is_public?: boolean; is_approved?: boolean; };
type Organisation = { id?: string; name: string; org_type: string; location: string; country?: string | null; city?: string | null; website?: string | null; areas_of_interest?: string[]; is_active?: boolean; };
type Subscriber = { id: string; email: string; full_name: string; source: string; subscribed_at: string; is_active: boolean; };
type EquipmentProposal = { id: string; name: string; category?: string; location: string; description?: string; proposed_by_email?: string; proposed_by_name?: string; contact_email?: string | null; contact_phone?: string | null; image_url?: string | null; status: string; admin_notes?: string; reviewed_at?: string; created_at: string; is_available?: boolean; utilization?: number; cost_savings_text?: string | null; bookings_count?: number; };
type LabStats = { utilization_text: string; utilization_sub: string; cost_savings_text: string; cost_savings_sub: string; bookings_text: string; bookings_sub: string; };
type KnowledgeDocument = { id: string; title: string; category: string; description?: string; url?: string; doc_type?: string; is_public?: boolean; added_by?: string; created_at: string; is_approved?: boolean; proposed_by?: string | null; proposed_by_name?: string | null; };

export type PartnershipLevel = "viewer" | "member" | "partner" | "admin";

const PARTNERSHIP_ACCESS: Record<PartnershipLevel, string[]> = {
  viewer: ["dashboard"],
  member: ["dashboard", "events", "members"],
  partner: ["dashboard", "projects", "lab", "events", "members", "knowledge"],
  admin: ["dashboard", "projects", "lab", "events", "members", "knowledge", "admin"],
};
const PARTNERSHIP_LABELS: Record<PartnershipLevel, { label: string; color: string; bg: string }> = {
  viewer: { label: "Viewer", color: "#8896A6", bg: "#F3F5F8" },
  member: { label: "Member", color: "#0D9373", bg: "#E6F9F5" },
  partner: { label: "Partner", color: "#7C5CFC", bg: "#F0EDFF" },
  admin: { label: "Admin", color: "#E74C6F", bg: "#FDECF1" },
};
const LOCKED_SECTIONS: Record<PartnershipLevel, { id: string; requiredLevel: string }[]> = {
  viewer: [{ id: "projects", requiredLevel: "Member" }, { id: "lab", requiredLevel: "Partner" }, { id: "events", requiredLevel: "Member" }, { id: "members", requiredLevel: "Member" }, { id: "knowledge", requiredLevel: "Partner" }],
  member: [{ id: "lab", requiredLevel: "Partner" }, { id: "knowledge", requiredLevel: "Partner" }],
  partner: [], admin: [],
};
const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "grid" },
  { id: "projects", label: "Projects", icon: "layers" },
  { id: "lab", label: "Distributed Lab", icon: "cpu" },
  { id: "events", label: "Events", icon: "calendar" },
  { id: "members", label: "Members", icon: "users" },
  { id: "knowledge", label: "Knowledge Base", icon: "book" },
  { id: "rewards", label: "Rewards", icon: "star" },
  { id: "admin", label: "Admin Panel", icon: "shield" },
];

// ─── CHANGE 3: STATIC_EQUIPMENT REMOVED ───────────────────────────────────────
// Equipment is now fetched purely from the DB (equipment_proposals, status = "approved").
// Run the SQL migration to insert the 5 legacy items as approved proposals if needed.

const Icon = ({ name, size = 18 }: { name: string; size?: number }) => {
  const icons: Record<string, React.ReactNode> = {
    grid: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
    layers: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
    cpu: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>,
    calendar: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    users: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    book: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
    shield: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    search: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    bell: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    flask: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6v7l5 8H4l5-8V3z"/><line x1="8" y1="3" x2="16" y2="3"/></svg>,
    dna: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 15c6.667-6 13.333 0 20-6"/><path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993"/><path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993"/><path d="M17 6l-2.5 2.5"/><path d="M14 8l-1 1"/><path d="M7 18l2.5-2.5"/></svg>,
    chart: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    mapPin: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    plus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    globe: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
    lock: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    edit: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    trash: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
    logout: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    award: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>,
    star: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    chevronRight: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
    chevronLeft: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
    clock: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    x: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    fileText: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
    inbox: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
    mail: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    link: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  };
  return <>{icons[name] || null}</>;
};

const AnimNum = ({ target, dur = 1200 }: { target: number; dur?: number }) => {
  const [v, setV] = useState(0);
  useEffect(() => {
    let s = 0; const step = target / (dur / 16);
    const t = setInterval(() => { s += step; if (s >= target) { setV(target); clearInterval(t); } else setV(Math.floor(s)); }, 16);
    return () => clearInterval(t);
  }, [target, dur]);
  return <span>{v}</span>;
};

const StatusBadge = ({ status }: { status: string }) => {
  const m: Record<string, { bg: string; color: string; label: string }> = {
    "on-track": { bg: "#E6F9F5", color: "#0D9373", label: "On Track" },
    "at-risk": { bg: "#FFF8E6", color: "#C48700", label: "At Risk" },
    blocked: { bg: "#FEE9EE", color: "#D63563", label: "Blocked" },
  };
  const s = m[status] || m["on-track"];
  return <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: s.bg, color: s.color, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{s.label}</span>;
};

function LockedOverlay({ requiredLevel, sectionName }: { requiredLevel: string; sectionName: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, borderRadius: 16, zIndex: 10, background: "rgba(247,249,252,0.92)", backdropFilter: "blur(4px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 32 }}>
      <div style={{ width: 52, height: 52, borderRadius: 16, background: "#F3F5F8", display: "flex", alignItems: "center", justifyContent: "center", color: TEXT_LIGHT }}><Icon name="lock" size={24} /></div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif", marginBottom: 6 }}>{sectionName} Locked</div>
        <div style={{ fontSize: 13, color: TEXT_MID, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.55 }}>This section requires <strong>{requiredLevel}</strong> partnership level or above.</div>
      </div>
      <div style={{ marginTop: 4, padding: "8px 20px", borderRadius: 10, background: TEAL_LIGHT, color: TEAL_DARK, fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>Upgrade to {requiredLevel}</div>
    </div>
  );
}

const modalInputStyle: React.CSSProperties = { width: "100%", padding: "9px 14px", borderRadius: 10, border: `1.5px solid ${BORDER}`, fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: TEXT, outline: "none", background: "#FAFBFC" };
const modalLabelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: TEXT_MID, fontFamily: "'DM Sans', sans-serif", marginBottom: 6, display: "block" };

// ─── EVENT MODAL ──────────────────────────────────────────────────────────────
type EventFormState = { title: string; event_date: string; event_type: string; location: string; description: string; video_link: string; is_public: boolean; is_approved: boolean; };
const EMPTY_EVENT_FORM: EventFormState = { title: "", event_date: "", event_type: "internal", location: "", description: "", video_link: "", is_public: true, is_approved: true };

function EventModal({ event, onClose, onSave }: { event: Partial<Event> | null; onClose: () => void; onSave: (e: Partial<Event>) => Promise<void>; }) {
  const [form, setForm] = useState<EventFormState>(event ? { title: event.title || "", event_date: event.event_date || "", event_type: event.event_type || "internal", location: event.location || "", description: event.description || "", video_link: event.video_link || "", is_public: event.is_public ?? true, is_approved: event.is_approved ?? true } : { ...EMPTY_EVENT_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!event?.id;
  const textFields: { label: string; key: keyof Pick<EventFormState, "title" | "event_date" | "location" | "video_link">; placeholder: string }[] = [
    { label: "Title *", key: "title", placeholder: "e.g. Project Genesis Intro" },
    { label: "Date *", key: "event_date", placeholder: "e.g. Feb 15 or Mar 2026" },
    { label: "Location *", key: "location", placeholder: "e.g. Online or Taranto" },
    { label: "Video Link", key: "video_link", placeholder: "https://..." },
  ];
  const handle = async () => {
    if (!form.title.trim() || !form.event_date.trim() || !form.location.trim()) { setError("Title, date and location are required."); return; }
    setSaving(true); setError(null);
    try { await onSave({ ...form, ...(isEdit ? { id: event!.id } : {}) }); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to save."); }
    finally { setSaving(false); }
  };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(26,35,50,0.45)", backdropFilter: "blur(3px)" }} />
      <div style={{ position: "relative", width: 520, background: CARD, borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden", animation: "fadeUp 0.2s ease both" }}>
        <div style={{ padding: "20px 28px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>{isEdit ? "Edit Event" : "Add New Event"}</div>
          <button onClick={onClose} style={{ background: "#F3F5F8", border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: TEXT_MID }}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 14, maxHeight: "65vh", overflowY: "auto" }}>
          {error && <div style={{ padding: "10px 14px", borderRadius: 10, background: "#FDECF1", color: "#D63563", fontSize: 13 }}>{error}</div>}
          {textFields.map(f => (<div key={f.key}><label style={modalLabelStyle}>{f.label}</label><input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={modalInputStyle} /></div>))}
          <div><label style={modalLabelStyle}>Event Type *</label><select value={form.event_type} onChange={e => setForm(p => ({ ...p, event_type: e.target.value }))} style={modalInputStyle}>{EVENT_TYPES.map(t => (<option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>))}</select></div>
          <div><label style={modalLabelStyle}>Description</label><textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Optional..." style={{ ...modalInputStyle, resize: "vertical" as const }} /></div>
          <div style={{ display: "flex", gap: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: TEXT_MID, fontFamily: "'DM Sans', sans-serif" }}><input type="checkbox" checked={form.is_public} onChange={e => setForm(p => ({ ...p, is_public: e.target.checked }))} style={{ accentColor: TEAL, width: 15, height: 15 }} />Public</label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: TEXT_MID, fontFamily: "'DM Sans', sans-serif" }}><input type="checkbox" checked={form.is_approved} onChange={e => setForm(p => ({ ...p, is_approved: e.target.checked }))} style={{ accentColor: TEAL, width: 15, height: 15 }} />Approved</label>
          </div>
        </div>
        <div style={{ padding: "16px 28px", borderTop: `1px solid ${BORDER}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 10, border: `1.5px solid ${BORDER}`, background: CARD, color: TEXT_MID, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
          <button onClick={handle} disabled={saving} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", fontFamily: "'DM Sans', sans-serif", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : isEdit ? "Save Changes" : "Add Event"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── PROJECT MODAL ────────────────────────────────────────────────────────────
type ProjectFormState = { name: string; pillar: string; phase: string; status: string; lead: string; lead_email: string; lead_phone: string; description: string; progress: number; color: string; is_public: boolean; };
const EMPTY_PROJECT_FORM: ProjectFormState = { name: "", pillar: PROJECT_PILLARS[0], phase: "Planning", status: "on-track", lead: "", lead_email: "", lead_phone: "", description: "", progress: 0, color: "#2EC4B6", is_public: true };

function ProjectModal({ project, onClose, onSave }: { project: Partial<Project> | null; onClose: () => void; onSave: (p: Partial<Project>) => Promise<void>; }) {
  const [form, setForm] = useState<ProjectFormState>(project ? { name: project.name || "", pillar: project.pillar || PROJECT_PILLARS[0], phase: project.phase || "Planning", status: project.status || "on-track", lead: project.lead || "", lead_email: project.lead_email || "", lead_phone: project.lead_phone || "", description: project.description || "", progress: project.progress ?? 0, color: project.color || "#2EC4B6", is_public: project.is_public ?? true } : { ...EMPTY_PROJECT_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!project?.id;
  const handle = async () => {
    if (!form.name.trim() || !form.lead.trim()) { setError("Name and lead are required."); return; }
    setSaving(true); setError(null);
    try { await onSave({ ...form, ...(isEdit ? { id: project!.id } : {}) }); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to save."); }
    finally { setSaving(false); }
  };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(26,35,50,0.45)", backdropFilter: "blur(3px)" }} />
      <div style={{ position: "relative", width: 560, background: CARD, borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden", animation: "fadeUp 0.2s ease both" }}>
        <div style={{ padding: "20px 28px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>{isEdit ? "Edit Project" : "Add New Project"}</div>
          <button onClick={onClose} style={{ background: "#F3F5F8", border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: TEXT_MID }}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 14, maxHeight: "65vh", overflowY: "auto" }}>
          {error && <div style={{ padding: "10px 14px", borderRadius: 10, background: "#FDECF1", color: "#D63563", fontSize: 13 }}>{error}</div>}
          <div><label style={modalLabelStyle}>Project Name *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. CranioTech Radar" style={modalInputStyle} /></div>
          <div><label style={modalLabelStyle}>Lead *</label><input value={form.lead} onChange={e => setForm(p => ({ ...p, lead: e.target.value }))} placeholder="e.g. Dr. Maria Rossi" style={modalInputStyle} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={modalLabelStyle}>Lead Email</label><input value={form.lead_email} onChange={e => setForm(p => ({ ...p, lead_email: e.target.value }))} placeholder="lead@email.com" style={modalInputStyle} /></div>
              <div><label style={modalLabelStyle}>Lead Phone</label><input value={form.lead_phone} onChange={e => setForm(p => ({ ...p, lead_phone: e.target.value }))} placeholder="+39 123 456 7890" style={modalInputStyle} /></div>
            </div>
          <div><label style={modalLabelStyle}>Scientific Pillar</label><select value={form.pillar} onChange={e => setForm(p => ({ ...p, pillar: e.target.value }))} style={modalInputStyle}>{PROJECT_PILLARS.map(pl => (<option key={pl} value={pl}>{pl}</option>))}</select></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={modalLabelStyle}>Phase</label><select value={form.phase} onChange={e => setForm(p => ({ ...p, phase: e.target.value }))} style={modalInputStyle}>{PROJECT_PHASES.map(ph => (<option key={ph} value={ph}>{ph}</option>))}</select></div>
            <div><label style={modalLabelStyle}>Status</label><select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} style={modalInputStyle}>{PROJECT_STATUSES.map(s => (<option key={s} value={s}>{s === "on-track" ? "On Track" : s === "at-risk" ? "At Risk" : "Blocked"}</option>))}</select></div>
          </div>
          <div><label style={modalLabelStyle}>Progress ({form.progress}%)</label><input type="range" min={0} max={100} value={form.progress} onChange={e => setForm(p => ({ ...p, progress: Number(e.target.value) }))} style={{ width: "100%", accentColor: TEAL }} /></div>
          <div><label style={modalLabelStyle}>Colour</label><div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>{PROJECT_COLORS.map(c => (<button key={c} onClick={() => setForm(p => ({ ...p, color: c }))} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: form.color === c ? `3px solid ${TEXT}` : "3px solid transparent", cursor: "pointer", flexShrink: 0 }} />))}</div></div>
          <div><label style={modalLabelStyle}>Description</label><textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Brief project description..." style={{ ...modalInputStyle, resize: "vertical" as const }} /></div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: TEXT_MID, fontFamily: "'DM Sans', sans-serif" }}><input type="checkbox" checked={form.is_public} onChange={e => setForm(p => ({ ...p, is_public: e.target.checked }))} style={{ accentColor: TEAL, width: 15, height: 15 }} />Public</label>
        </div>
        <div style={{ padding: "16px 28px", borderTop: `1px solid ${BORDER}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 10, border: `1.5px solid ${BORDER}`, background: CARD, color: TEXT_MID, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
          <button onClick={handle} disabled={saving} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", fontFamily: "'DM Sans', sans-serif", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : isEdit ? "Save Changes" : "Add Project"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── PROPOSE EQUIPMENT MODAL ──────────────────────────────────────────────────
type EquipmentFormState = { name: string; category: string; location: string; description: string; };

function ProposeEquipmentModal({ userEmail, userName, onClose, onSave }: { userEmail: string; userName: string; onClose: () => void; onSave: () => void; }) {
  const [form, setForm] = useState<EquipmentFormState>({ name: "", category: "", location: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const handle = async () => {
    if (!form.name.trim() || !form.location.trim()) { setError("Equipment name and location are required."); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/admin/equipment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, proposed_by_email: userEmail, proposed_by_name: userName }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setSuccess(true); onSave();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to submit."); }
    finally { setSaving(false); }
  };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(26,35,50,0.45)", backdropFilter: "blur(3px)" }} />
      <div style={{ position: "relative", width: 500, background: CARD, borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden", animation: "fadeUp 0.2s ease both" }}>
        <div style={{ padding: "20px 28px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={{ fontSize: 17, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>Propose Equipment</div><div style={{ fontSize: 12, color: TEXT_LIGHT, marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>Submit a machine for the Distributed Lab network</div></div>
          <button onClick={onClose} style={{ background: "#F3F5F8", border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: TEXT_MID }}><Icon name="x" size={16} /></button>
        </div>
        {success ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: TEAL_LIGHT, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: TEAL }}><Icon name="check" size={28} /></div>
            <div style={{ fontSize: 16, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif", marginBottom: 8 }}>Proposal Submitted!</div>
            <div style={{ fontSize: 13, color: TEXT_MID, fontFamily: "'DM Sans', sans-serif", marginBottom: 24 }}>The admin team will review your proposal and get back to you.</div>
            <button onClick={onClose} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Close</button>
          </div>
        ) : (
          <>
            <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
              {error && <div style={{ padding: "10px 14px", borderRadius: 10, background: "#FDECF1", color: "#D63563", fontSize: 13 }}>{error}</div>}
              <div><label style={modalLabelStyle}>Equipment Name *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Confocal Microscope Leica SP8" style={modalInputStyle} /></div>
              <div><label style={modalLabelStyle}>Category</label><select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={modalInputStyle}><option value="">Select a category…</option>{EQUIPMENT_CATEGORIES.map(c => (<option key={c} value={c}>{c}</option>))}</select></div>
              <div><label style={modalLabelStyle}>Location / Hub *</label><input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Taranto Lab A or Zurich UZH" style={modalInputStyle} /></div>
              <div><label style={modalLabelStyle}>Description</label><textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Describe the equipment, its capabilities and availability…" style={{ ...modalInputStyle, resize: "vertical" as const }} /></div>
              <div style={{ padding: "12px 16px", borderRadius: 10, background: TEAL_LIGHT, border: `1px solid ${TEAL_MUTED}`, fontSize: 12, color: TEAL_DARK, fontFamily: "'DM Sans', sans-serif" }}>Your proposal will be reviewed by the admin team. Once approved, the equipment will appear in the Distributed Lab network.</div>
            </div>
            <div style={{ padding: "16px 28px", borderTop: `1px solid ${BORDER}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 10, border: `1.5px solid ${BORDER}`, background: CARD, color: TEXT_MID, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
              <button onClick={handle} disabled={saving} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", fontFamily: "'DM Sans', sans-serif", opacity: saving ? 0.7 : 1 }}>{saving ? "Submitting…" : "Submit Proposal"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

type EquipmentAdminFormState = { name: string; category: string; location: string; description: string; contact_email: string; contact_phone: string; image_url: string; utilization: number; is_available: boolean; cost_savings_text: string; bookings_count: number; };

function EquipmentAdminModal({ equipment, onClose, onSave }: { equipment: Partial<EquipmentProposal> | null; onClose: () => void; onSave: (payload: Partial<EquipmentProposal> & { is_admin_add?: boolean }) => Promise<void>; }) {
  const [form, setForm] = useState<EquipmentAdminFormState>({ name: equipment?.name || "", category: equipment?.category || "", location: equipment?.location || "", description: equipment?.description || "", contact_email: equipment?.contact_email || "", contact_phone: equipment?.contact_phone || "", image_url: equipment?.image_url || "", utilization: equipment?.utilization ?? 0, is_available: equipment?.is_available ?? true, cost_savings_text: equipment?.cost_savings_text || "", bookings_count: equipment?.bookings_count ?? 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!equipment?.id;
  const handle = async () => {
    if (!form.name.trim() || !form.location.trim()) { setError("Equipment name and location are required."); return; }
    setSaving(true); setError(null);
    try { await onSave({ ...(isEdit ? { id: equipment!.id } : { is_admin_add: true }), ...form, status: "approved" }); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to save equipment."); }
    finally { setSaving(false); }
  };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 210, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(26,35,50,0.45)", backdropFilter: "blur(3px)" }} />
      <div style={{ position: "relative", width: 620, background: CARD, borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden" }}>
        <div style={{ padding: "20px 28px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>{isEdit ? "Edit Equipment" : "Add Equipment"}</div>
          <button onClick={onClose} style={{ background: "#F3F5F8", border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: TEXT_MID }}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 14, maxHeight: "70vh", overflowY: "auto" }}>
          {error && <div style={{ padding: "10px 14px", borderRadius: 10, background: "#FDECF1", color: "#D63563", fontSize: 13 }}>{error}</div>}
          <div><label style={modalLabelStyle}>Equipment Name *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={modalInputStyle} /></div>
          <div><label style={modalLabelStyle}>Category</label><select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={modalInputStyle}><option value="">Select a category…</option>{EQUIPMENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <div><label style={modalLabelStyle}>Location *</label><input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} style={modalInputStyle} /></div>
          <div><label style={modalLabelStyle}>Description</label><textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} style={{ ...modalInputStyle, resize: "vertical" as const }} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={modalLabelStyle}>Contact Email</label><input value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} style={modalInputStyle} /></div>
            <div><label style={modalLabelStyle}>Contact Phone</label><input value={form.contact_phone} onChange={e => setForm(p => ({ ...p, contact_phone: e.target.value }))} style={modalInputStyle} /></div>
          </div>
          <div><label style={modalLabelStyle}>Image URL</label><input value={form.image_url} onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))} style={modalInputStyle} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div><label style={modalLabelStyle}>Utilization (%)</label><input type="number" min={0} max={100} value={form.utilization} onChange={e => setForm(p => ({ ...p, utilization: Number(e.target.value) }))} style={modalInputStyle} /></div>
            <div><label style={modalLabelStyle}>Bookings Count</label><input type="number" min={0} value={form.bookings_count} onChange={e => setForm(p => ({ ...p, bookings_count: Number(e.target.value) }))} style={modalInputStyle} /></div>
            <div><label style={modalLabelStyle}>Cost Savings Text</label><input value={form.cost_savings_text} onChange={e => setForm(p => ({ ...p, cost_savings_text: e.target.value }))} style={modalInputStyle} /></div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: TEXT_MID, fontFamily: "'DM Sans', sans-serif" }}><input type="checkbox" checked={form.is_available} onChange={e => setForm(p => ({ ...p, is_available: e.target.checked }))} style={{ accentColor: TEAL, width: 15, height: 15 }} />Available for booking</label>
        </div>
        <div style={{ padding: "16px 28px", borderTop: `1px solid ${BORDER}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 10, border: `1.5px solid ${BORDER}`, background: CARD, color: TEXT_MID, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
          <button onClick={handle} disabled={saving} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", fontFamily: "'DM Sans', sans-serif", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : isEdit ? "Save Changes" : "Add Equipment"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD VIEW ───────────────────────────────────────────────────────────
  const onboardingCopy: Record<
    PartnershipLevel,
    {
      title: string;
      text: string;
      actions: { label: string; target: string }[];
    }
  > = {
    viewer: {
      title: "Your access is currently limited",
      text: "You can view the dashboard for now. If you need broader access to members, events, projects, or knowledge resources, please contact the bioERGOtech team for an access upgrade.",
      actions: [
        { label: "View Dashboard", target: "dashboard" },
      ],
    },
    member: {
      title: "Welcome to the member network",
      text: "You now have access to the ecosystem directory and shared events. A good place to start is to explore who is in the network and what events are coming up.",
      actions: [
        { label: "Explore Members", target: "members" },
        { label: "View Events", target: "events" },
      ],
    },
    partner: {
      title: "You can now actively contribute",
      text: "As a partner, you can work across projects, distributed lab resources, events, members, and the knowledge base. Start by opening your project portfolio or reviewing shared lab equipment.",
      actions: [
        { label: "Open Projects", target: "projects" },
        { label: "Open Lab", target: "lab" },
      ],
    },
    admin: {
      title: "Administrator access enabled",
      text: "You can manage applications, users, projects, organisations, equipment, knowledge resources, and newsletter subscribers. Review pending applications first to keep the ecosystem moving.",
      actions: [
        { label: "Open Admin Panel", target: "admin" },
        { label: "Review Projects", target: "projects" },
      ],
    },
  };

function DashboardView({
  projects,
  events,
  members,
  approvedEquipmentCount,
  partnershipLevel,
  displayName,
  onQuickNavigate,
}: {
  projects: Project[];
  events: Event[];
  members: Organisation[];
  approvedEquipmentCount: number;
  partnershipLevel: PartnershipLevel;
  displayName?: string;
  onQuickNavigate?: (section: string) => void;
}) {
  const onboardingCopy: Record<
    PartnershipLevel,
    {
      title: string;
      text: string;
      actions: { label: string; target: string }[];
    }
  > = {
    viewer: {
      title: "Your access is currently limited",
      text: "You can view the dashboard for now. If you need broader access to members, events, projects, or knowledge resources, please contact the bioERGOtech team for an access upgrade.",
      actions: [{ label: "View Dashboard", target: "dashboard" }],
    },
    member: {
      title: "Welcome to the member network",
      text: "You now have access to the ecosystem directory and shared events. A good place to start is to explore who is in the network and what events are coming up.",
      actions: [
        { label: "Explore Members", target: "members" },
        { label: "View Events", target: "events" },
      ],
    },
    partner: {
      title: "You can now actively contribute",
      text: "As a partner, you can work across projects, distributed lab resources, events, members, and the knowledge base. Start by opening your project portfolio or reviewing shared lab equipment.",
      actions: [
        { label: "Open Projects", target: "projects" },
        { label: "Open Lab", target: "lab" },
      ],
    },
    admin: {
      title: "Administrator access enabled",
      text: "You can manage applications, users, projects, organisations, equipment, knowledge resources, and newsletter subscribers. Review pending applications first to keep the ecosystem moving.",
      actions: [
        { label: "Open Admin Panel", target: "admin" },
        { label: "Review Projects", target: "projects" },
      ],
    },
  };

  const onboarding = onboardingCopy[partnershipLevel];

  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try { return localStorage.getItem(`onboarding_dismissed_${partnershipLevel}`) === "true"; }
    catch { return false; }
  });
  const handleDismissBanner = () => {
    try { localStorage.setItem(`onboarding_dismissed_${partnershipLevel}`, "true"); } catch {}
    setBannerDismissed(true);
  };

  const stats = [
    { label: "Active Projects", value: projects.length, icon: "layers", color: TEAL, bg: TEAL_LIGHT },
    { label: "Member Organizations", value: members.length, icon: "users", color: "#7C5CFC", bg: "#F0EDFF" },
    { label: "Equipment Shared", value: approvedEquipmentCount, icon: "cpu", color: "#E74C6F", bg: "#FDECF1" },
    { label: "Upcoming Events", value: events.length, icon: "calendar", color: "#F0A500", bg: "#FFF8E6" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
    {!bannerDismissed && (
      <div
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 18,
          padding: "22px 24px",
          boxShadow: SHADOW,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 18,
          flexWrap: "wrap",
          position: "relative",
        }}
      >
        <div style={{ maxWidth: 760 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: TEAL_DARK,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              marginBottom: 8,
            }}
          >
            Getting Started
          </div>

          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: TEXT,
              fontFamily: "'Sora', sans-serif",
              marginBottom: 8,
            }}
          >
            {displayName ? `Welcome, ${displayName}` : "Welcome to your portal"}
          </div>

          <div
            style={{
              fontSize: 14,
              color: TEXT_MID,
              lineHeight: 1.65,
              maxWidth: 700,
            }}
          >
            <strong>{onboarding.title}</strong>
            <div style={{ marginTop: 6 }}>{onboarding.text}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {onboarding.actions.map((action) => (
            <button
              key={action.target}
              onClick={() => onQuickNavigate?.(action.target)}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`,
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleDismissBanner}
          title="Dismiss"
          style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_LIGHT, padding: 4, borderRadius: 6, display: "flex", alignItems: "flex-start", flexShrink: 0, alignSelf: "flex-start" }}
        >
          <Icon name="x" size={15} />
        </button>
      </div>
    )}
      <div className="portal-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "20px 22px", boxShadow: SHADOW, animation: `fadeUp 0.45s ease ${i * 0.08}s both` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: s.bg, color: s.color, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={s.icon} size={18} /></div>
              <span style={{ fontSize: 12, color: TEXT_LIGHT, fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 34, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif", lineHeight: 1 }}><AnimNum target={s.value} dur={900 + i * 250} /></div>
          </div>
        ))}
      </div>
      <div className="portal-dashboard-grid" style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 20 }}>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, boxShadow: SHADOW }}>
          <h3 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>Active Projects</h3>
          {projects.slice(0, 4).map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 0", borderBottom: i < 3 ? `1px solid ${BORDER}` : "none" }}>
              <div style={{ width: 4, height: 40, borderRadius: 3, background: p.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, fontFamily: "'DM Sans', sans-serif" }}>{p.name}</div>
                <div style={{ fontSize: 12, color: TEXT_LIGHT, fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>{p.pillar} · {p.lead}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <div style={{ width: 64, height: 5, borderRadius: 3, background: `${p.color}18`, overflow: "hidden" }}><div style={{ width: `${p.progress}%`, height: "100%", borderRadius: 3, background: p.color }} /></div>
                <span style={{ fontSize: 12, color: TEXT_MID, fontFamily: "'Sora', sans-serif", fontWeight: 600, width: 34, textAlign: "right" }}>{p.progress}%</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, boxShadow: SHADOW }}>
          <h3 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>Upcoming Events</h3>
          {events.slice(0, 5).map((e, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 0", borderBottom: i < 4 ? `1px solid ${BORDER}` : "none" }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0, background: e.event_type === "national" ? TEAL_LIGHT : "#F3F5F8", border: `1px solid ${e.event_type === "national" ? TEAL_MUTED : BORDER}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 11, color: e.event_type === "national" ? TEAL_DARK : TEXT_MID, fontWeight: 700, lineHeight: 1.2 }}>{e.event_date.split(" ")[0]}</span>
                {e.event_date.split(" ")[1] && <span style={{ fontSize: 9, color: TEXT_LIGHT }}>{e.event_date.split(" ")[1]}</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, fontFamily: "'DM Sans', sans-serif" }}>{e.title}</div>
                <div style={{ fontSize: 11, color: TEXT_LIGHT, marginTop: 2, display: "flex", alignItems: "center", gap: 4, fontFamily: "'DM Sans', sans-serif" }}><Icon name="mapPin" size={11} /> {e.location}</div>
              </div>
              <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 20, fontWeight: 600, background: e.event_type === "national" ? TEAL_LIGHT : "#F3F5F8", color: e.event_type === "national" ? TEAL_DARK : TEXT_LIGHT, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>{e.event_type}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[{ city: "Taranto", country: "Italy", role: "Experimental Hub", icon: "flask", count: 4, color: TEAL, bg: TEAL_LIGHT }, { city: "Zurich", country: "Switzerland", role: "Talent & Innovation Hub", icon: "dna", count: 3, color: "#7C5CFC", bg: "#F0EDFF" }, { city: "Riyadh", country: "Saudi Arabia", role: "Clinical Translation Hub", icon: "globe", count: 1, color: "#E74C6F", bg: "#FDECF1" }].map((h, i) => (
          <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 22, boxShadow: SHADOW, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", bottom: -16, right: -12, opacity: 0.06, color: h.color }}><Icon name={h.icon} size={90} /></div>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: h.bg, color: h.color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}><Icon name={h.icon} size={20} /></div>
            <div style={{ fontSize: 20, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>{h.city}</div>
            <div style={{ fontSize: 12, color: TEXT_LIGHT, marginBottom: 6 }}>{h.country}</div>
            <div style={{ fontSize: 12, color: h.color, fontWeight: 600 }}>{h.role}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PROJECT DRAWER ───────────────────────────────────────────────────────────
// CHANGE 1: Objectives are now tappable checkboxes for all roles.
//           Completion encoded as "[x] " prefix — persists in DB without schema change.
//           Save button visible to all roles so ticking state persists.
// CHANGE 2: Lead rendered as a clickable mailto anchor.
function ProjectDrawer({ project, isAdmin, onClose, onSave }: { project: Project; isAdmin?: boolean; onClose: () => void; onSave: (payload: Partial<Project>) => Promise<void>; }) {
  const [progress, setProgress] = useState(project.progress ?? 0);
  const [notes, setNotes] = useState(project.update_notes || "");
  const [objectives, setObjectives] = useState<string[]>(Array.isArray(project.objectives) ? project.objectives : []);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setProgress(project.progress ?? 0);
    setNotes(project.update_notes || "");
    setObjectives(Array.isArray(project.objectives) ? project.objectives : []);
    setMessage(null);
  }, [project]);

  const handleSave = async () => {
    if (!project.id) return;
    setSaving(true); setMessage(null);
    try {
      await onSave({ id: project.id, progress, update_notes: notes, objectives: objectives.filter(o => o.trim() !== "") });
      setMessage("Project updated successfully.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Failed to update project."); }
    finally { setSaving(false); }
  };

  // Toggle completion for any role — state saved when user clicks "Save Updates"
  const handleToggleComplete = (idx: number) => {
    setObjectives(prev => prev.map((o, i) => i === idx ? toggleObjectiveComplete(o) : o));
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 120, display: "flex" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(26,35,50,0.38)", backdropFilter: "blur(3px)" }} />
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 560, background: CARD, boxShadow: "-6px 0 28px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", animation: "slideIn 0.25s ease both" }}>

        {/* Header */}
        <div style={{ padding: "22px 28px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 12, height: 12, borderRadius: 4, background: project.color || TEAL, flexShrink: 0 }} />
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>{project.name}</h2>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, background: `${project.color || TEAL}12`, color: project.color || TEAL, fontWeight: 700 }}>{project.phase}</span>
              <StatusBadge status={project.status} />
            </div>
            {/* CHANGE 2: Lead as mailto link */}
            <div style={{ fontSize: 13, color: TEXT_LIGHT }}>
              {project.pillar} · Lead: <strong style={{ color: TEXT }}>{project.lead}</strong>
            </div>
            <button
              onClick={() => { const m = document.getElementById("contact-lead-modal"); if (m) m.style.display = "flex"; }}
              style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, border: `1.5px solid ${TEAL}`, background: TEAL_LIGHT, color: TEAL_DARK, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
            >
              <Icon name="mail" size={13} /> Contact Lead
            </button>
            <div id="contact-lead-modal" style={{ display: "none", position: "fixed", inset: 0, zIndex: 500, alignItems: "center", justifyContent: "center" }}>
                <div onClick={() => { const m = document.getElementById("contact-lead-modal"); if (m) m.style.display = "none"; }} style={{ position: "absolute", inset: 0, background: "rgba(26,35,50,0.5)", backdropFilter: "blur(4px)" }} />
                <div style={{ position: "relative", width: 440, background: CARD, borderRadius: 20, boxShadow: "0 24px 80px rgba(0,0,0,0.22)", padding: 28, display: "flex", flexDirection: "column", gap: 16, zIndex: 501 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>Contact Project Lead</div>
                    <button onClick={() => { const m = document.getElementById("contact-lead-modal"); if (m) m.style.display = "none"; }} style={{ background: "#F3F5F8", border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: TEXT_MID }}><Icon name="x" size={15} /></button>
                  </div>
                  <div style={{ background: "#FAFBFC", border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: TEAL_LIGHT, color: TEAL_DARK, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 }}>{project.lead?.charAt(0) || "L"}</div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>{project.lead}</div>
                        <div style={{ fontSize: 12, color: TEXT_LIGHT }}>Project Lead · {project.name}</div>
                      </div>
                    </div>
                    {project.lead_email && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 8, borderTop: `1px solid ${BORDER}` }}>
                        <Icon name="mail" size={14} />
                        <a href={`mailto:${project.lead_email}`} style={{ fontSize: 13, color: TEAL_DARK, textDecoration: "none", fontWeight: 600 }}>{project.lead_email}</a>
                      </div>
                    )}
                    {project.lead_phone && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Icon name="phone" size={14} />
                        <a href={`tel:${project.lead_phone}`} style={{ fontSize: 13, color: TEXT_MID, textDecoration: "none" }}>{project.lead_phone}</a>
                      </div>
                    )}
                    {!project.lead_email && !project.lead_phone && (
                      <div style={{ fontSize: 13, color: TEXT_LIGHT, paddingTop: 8, borderTop: `1px solid ${BORDER}` }}>No contact details available. Ask an admin to add them.</div>
                    )}
                  </div>
                  {project.lead_email && (
                    <a href={`mailto:${project.lead_email}?subject=Re: ${encodeURIComponent(project.name)}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 20px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", fontFamily: "'DM Sans', sans-serif" }}>
                      <Icon name="mail" size={14} /> Open Email
                    </a>
                  )}
                </div>
              </div>
          </div>
          <button onClick={onClose} style={{ background: "#F3F5F8", border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: TEXT_MID, flexShrink: 0 }}><Icon name="x" size={16} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 22 }}>

          {/* Description */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_LIGHT, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Description</div>
            <div style={{ fontSize: 14, color: TEXT_MID, lineHeight: 1.65, background: "#FAFBFC", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>{project.description || "No description available."}</div>
          </div>

          {/* Progress */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_LIGHT, textTransform: "uppercase", letterSpacing: "0.07em" }}>Progress</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: project.color || TEAL }}>{progress}%</div>
            </div>
            {isAdmin
              ? <input type="range" min={0} max={100} value={progress} onChange={e => setProgress(Number(e.target.value))} style={{ width: "100%", accentColor: project.color || TEAL }} />
              : <div style={{ width: "100%", height: 8, borderRadius: 8, background: `${project.color || TEAL}14`, overflow: "hidden" }}><div style={{ width: `${progress}%`, height: "100%", background: project.color || TEAL }} /></div>
            }
          </div>

          {/* Objectives — CHANGE 1 */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_LIGHT, textTransform: "uppercase", letterSpacing: "0.07em" }}>Objectives</div>
              {isAdmin && (
                <button onClick={() => setObjectives(generateProjectObjectives(project))} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${TEAL_MUTED}`, background: TEAL_LIGHT, color: TEAL_DARK, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  Generate Objectives
                </button>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {objectives.length === 0 && (
                <div style={{ fontSize: 13, color: TEXT_LIGHT, background: "#FAFBFC", border: `1px dashed ${BORDER}`, borderRadius: 12, padding: 14 }}>No objectives added yet.</div>
              )}
              {objectives.map((obj, idx) => {
                const done = isObjectiveComplete(obj);
                const text = getObjectiveText(obj);
                return (
                  <div key={idx} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    {/* Toggle button — clickable for ALL roles */}
                    <button
                      onClick={() => handleToggleComplete(idx)}
                      title={done ? "Mark incomplete" : "Mark complete"}
                      style={{
                        width: 24, height: 24, borderRadius: 8, border: "none", cursor: "pointer",
                        flexShrink: 0, marginTop: 2,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: done ? TEAL : TEAL_LIGHT,
                        color: done ? "#fff" : TEAL_DARK,
                        fontSize: 12, fontWeight: 700,
                        transition: "all 0.18s ease",
                      }}
                    >
                      {done ? <Icon name="check" size={13} /> : idx + 1}
                    </button>

                    {/* Admin: editable textarea + delete; non-admin: read-only with strikethrough when done */}
                    {isAdmin ? (
                      <>
                        <textarea
                          value={text}
                          onChange={e => setObjectives(prev => prev.map((o, i) => {
                            if (i !== idx) return o;
                            return isObjectiveComplete(o) ? `[x] ${e.target.value}` : e.target.value;
                          }))}
                          rows={2}
                          style={{ ...modalInputStyle, resize: "vertical", flex: 1, textDecoration: done ? "line-through" : "none", color: done ? TEXT_LIGHT : TEXT }}
                        />
                        <button onClick={() => setObjectives(prev => prev.filter((_, i) => i !== idx))} style={{ background: "#FDECF1", border: "none", borderRadius: 8, padding: "8px 10px", color: "#D63563", cursor: "pointer", flexShrink: 0 }}><Icon name="trash" size={14} /></button>
                      </>
                    ) : (
                      <div style={{
                        flex: 1, fontSize: 14, color: done ? TEXT_LIGHT : TEXT_MID, lineHeight: 1.6,
                        background: done ? "#F7F9FC" : "#FAFBFC",
                        border: `1px solid ${done ? TEAL_MUTED : BORDER}`,
                        borderRadius: 12, padding: 12,
                        textDecoration: done ? "line-through" : "none",
                        transition: "all 0.18s ease",
                      }}>
                        {text}
                      </div>
                    )}
                  </div>
                );
              })}
              {isAdmin && (
                <button onClick={() => setObjectives(prev => [...prev, ""])} style={{ alignSelf: "flex-start", padding: "8px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, background: CARD, color: TEXT_MID, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="plus" size={14} />Add Objective
                </button>
              )}
            </div>
          </div>

          {/* Update Notes */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_LIGHT, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Update Notes</div>
            {isAdmin
              ? <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} placeholder="Add a project update note..." style={{ ...modalInputStyle, resize: "vertical" }} />
              : <div style={{ fontSize: 14, color: TEXT_MID, lineHeight: 1.65, background: "#FAFBFC", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>{notes || "No update notes available."}</div>
            }
          </div>

          {project.updated_at && <div style={{ fontSize: 12, color: TEXT_LIGHT }}>Last updated: {new Date(project.updated_at).toLocaleString()}</div>}
          {message && <div style={{ padding: "12px 14px", borderRadius: 10, background: message.includes("success") ? "#E6F9F5" : "#FDECF1", color: message.includes("success") ? "#0D9373" : "#D63563", fontSize: 13 }}>{message}</div>}
        </div>

        <div style={{ padding: "16px 28px", borderTop: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <button onClick={onClose} style={{ padding: "10px 18px", borderRadius: 10, border: `1.5px solid ${BORDER}`, background: CARD, color: TEXT_MID, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Close</button>
          {/* Save available to ALL roles so objective ticking persists */}
          <button onClick={handleSave} disabled={saving} style={{ padding: "10px 22px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : "Save Updates"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectsView({
  projects,
  isAdmin,
  canCreateProjects,
  currentUserId,
  onEdit,
  onDelete,
  onAddProject,
  onSaveProjectDetails,
}: {
  projects: Project[];
  isAdmin?: boolean;
  canCreateProjects?: boolean;
  currentUserId: string;
  onEdit?: (p: Project) => void;
  onDelete?: (id: string) => void;
   onAddProject?: () => void;
  onSaveProjectDetails: (payload: Partial<Project>) => Promise<void>;
}) {
  const pillars = ["All", "Digital Twin", "Synthetic Biology", "Biomanufacturing", "Multi-Omics"];
  const [filter, setFilter] = useState("All");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const filtered =
    filter === "All"
      ? projects
      : projects.filter((p) => p.pillar.toLowerCase().includes(filter.toLowerCase()));

  const canEditProject = (project: Project) =>
    !!isAdmin || (!!project.created_by && project.created_by === currentUserId);

  const canDeleteProject = (project: Project) =>
    !!isAdmin || (!!project.created_by && project.created_by === currentUserId);

  return (
    <>
      {selectedProject && (
        <ProjectDrawer
          project={selectedProject}
          isAdmin={isAdmin || canEditProject(selectedProject)}
          onClose={() => setSelectedProject(null)}
          onSave={async (payload) => {
            if (!canEditProject(selectedProject)) {
              throw new Error("You do not have permission to update this project.");
            }

            await onSaveProjectDetails(payload);

            setSelectedProject((prev) =>
              prev
                ? {
                    ...prev,
                    ...payload,
                    updated_at: new Date().toISOString(),
                  }
                : prev
            );
          }}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
            {pillars.map((p) => (
              <button
                key={p}
                onClick={() => setFilter(p)}
                style={{
                  padding: "7px 16px",
                  borderRadius: 24,
                  border: `1.5px solid ${filter === p ? TEAL : BORDER}`,
                  background: filter === p ? TEAL_LIGHT : CARD,
                  color: filter === p ? TEAL_DARK : TEXT_MID,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {p}
              </button>
            ))}
          </div>

          {canCreateProjects && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 12, color: TEXT_LIGHT, padding: "8px 12px", borderRadius: 10, background: "#F7F9FC", border: `1px solid ${BORDER}` }}>
                You can manage projects you created.
            </div>
            {!isAdmin && (
              <button
                onClick={() => onAddProject?.()}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" as const }}
              >
                <Icon name="plus" size={14} /> Add Project
              </button>
            )}
  </div>
)}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {filtered.map((p) => {
            const canEdit = canEditProject(p);
            const canDelete = canDeleteProject(p);

            return (
              <div
                key={p.id || p.name}
                onClick={() => setSelectedProject(p)}
                style={{
                  background: CARD,
                  border: `1.5px solid ${BORDER}`,
                  borderRadius: 16,
                  padding: 24,
                  cursor: "pointer",
                  boxShadow: SHADOW,
                  transition: "all 0.25s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 12,
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 4,
                        background: p.color,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 17,
                        fontWeight: 700,
                        color: TEXT,
                        fontFamily: "'Sora', sans-serif",
                      }}
                    >
                      {p.name}
                    </span>
                  </div>

                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <StatusBadge status={p.status} />

                    {(canEdit || canDelete) && (
                      <div style={{ display: "flex", gap: 4 }}>
                        {canEdit && (
                          <button
                            onClick={() => onEdit?.(p)}
                            style={{
                              background: "#F3F5F8",
                              border: "none",
                              borderRadius: 6,
                              padding: "4px 6px",
                              cursor: "pointer",
                              color: TEXT_MID,
                            }}
                            title="Edit project"
                          >
                            <Icon name="edit" size={13} />
                          </button>
                        )}

                        {canDelete && p.id && (
                          <button
                            onClick={() => {
                              if (confirm("Delete this project?")) onDelete?.(p.id!);
                            }}
                            style={{
                              background: "#FDECF1",
                              border: "none",
                              borderRadius: 6,
                              padding: "4px 6px",
                              cursor: "pointer",
                              color: "#D63563",
                            }}
                            title="Delete project"
                          >
                            <Icon name="trash" size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: 12, color: TEXT_MID, marginBottom: 4 }}>{p.pillar}</div>

                <p
                  style={{
                    fontSize: 13,
                    color: TEXT_MID,
                    lineHeight: 1.55,
                    margin: "8px 0 16px",
                  }}
                >
                  {p.description}
                </p>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 14,
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      padding: "4px 12px",
                      borderRadius: 20,
                      background: `${p.color}12`,
                      color: p.color,
                      fontWeight: 700,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {p.phase}
                  </span>

                  <span style={{ fontSize: 12, color: TEXT_LIGHT }}>
                    Lead: {p.lead}
                  </span>
                </div>

                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ fontSize: 11, color: TEXT_LIGHT }}>Progress</span>
                    <span style={{ fontSize: 12, color: p.color, fontWeight: 700 }}>
                      {p.progress}%
                    </span>
                  </div>

                  <div
                    style={{
                      width: "100%",
                      height: 6,
                      borderRadius: 3,
                      background: `${p.color}14`,
                    }}
                  >
                    <div
                      style={{
                        width: `${p.progress}%`,
                        height: "100%",
                        borderRadius: 3,
                        background: p.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─── EQUIPMENT DRAWER ─────────────────────────────────────────────────────────
function EquipmentDrawer({ equipment, isAdmin, onClose, onEdit, onDelete }: { equipment: EquipmentProposal; isAdmin?: boolean; onClose: () => void; onEdit?: (e: EquipmentProposal) => void; onDelete?: (id: string) => void; }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 205, display: "flex" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(26,35,50,0.38)", backdropFilter: "blur(3px)" }} />
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 540, background: CARD, boxShadow: "-6px 0 28px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "22px 28px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div><div style={{ fontSize: 20, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>{equipment.name}</div><div style={{ fontSize: 13, color: TEXT_LIGHT, marginTop: 6 }}>{equipment.category || "Uncategorized"} · {equipment.location}</div></div>
          <button onClick={onClose} style={{ background: "#F3F5F8", border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: TEXT_MID }}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
          {equipment.image_url ? <img src={equipment.image_url} alt={equipment.name} style={{ width: "100%", height: 220, objectFit: "cover", borderRadius: 14, border: `1px solid ${BORDER}` }} /> : <div style={{ width: "100%", height: 180, borderRadius: 14, border: `1px dashed ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", color: TEXT_LIGHT, background: "#FAFBFC", fontSize: 13 }}>No image available</div>}
          <div><div style={{ fontSize: 11, color: TEXT_LIGHT, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700 }}>Description</div><div style={{ fontSize: 14, color: TEXT_MID, lineHeight: 1.65, background: "#FAFBFC", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>{equipment.description || "No description available."}</div></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ padding: 16, background: "#FAFBFC", border: `1px solid ${BORDER}`, borderRadius: 12 }}><div style={{ fontSize: 11, color: TEXT_LIGHT, marginBottom: 6, textTransform: "uppercase", fontWeight: 700 }}>Contact Email</div><div style={{ fontSize: 14, color: TEXT }}>{equipment.contact_email ? <a href={`mailto:${equipment.contact_email}`} style={{ color: TEAL_DARK, textDecoration: "none" }}>{equipment.contact_email}</a> : "Not provided"}</div></div>
            <div style={{ padding: 16, background: "#FAFBFC", border: `1px solid ${BORDER}`, borderRadius: 12 }}><div style={{ fontSize: 11, color: TEXT_LIGHT, marginBottom: 6, textTransform: "uppercase", fontWeight: 700 }}>Contact Phone</div><div style={{ fontSize: 14, color: TEXT }}>{equipment.contact_phone ? <a href={`tel:${equipment.contact_phone}`} style={{ color: TEAL_DARK, textDecoration: "none" }}>{equipment.contact_phone}</a> : "Not provided"}</div></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <div style={{ padding: 16, background: "#FAFBFC", border: `1px solid ${BORDER}`, borderRadius: 12 }}><div style={{ fontSize: 11, color: TEXT_LIGHT, marginBottom: 6, textTransform: "uppercase", fontWeight: 700 }}>Status</div><div style={{ fontSize: 14, color: TEXT, fontWeight: 600 }}>{equipment.is_available ? "Available" : "Unavailable"}</div></div>
            <div style={{ padding: 16, background: "#FAFBFC", border: `1px solid ${BORDER}`, borderRadius: 12 }}><div style={{ fontSize: 11, color: TEXT_LIGHT, marginBottom: 6, textTransform: "uppercase", fontWeight: 700 }}>Utilization</div><div style={{ fontSize: 14, color: TEXT, fontWeight: 600 }}>{equipment.utilization ?? 0}%</div></div>
            <div style={{ padding: 16, background: "#FAFBFC", border: `1px solid ${BORDER}`, borderRadius: 12 }}><div style={{ fontSize: 11, color: TEXT_LIGHT, marginBottom: 6, textTransform: "uppercase", fontWeight: 700 }}>Bookings</div><div style={{ fontSize: 14, color: TEXT, fontWeight: 600 }}>{equipment.bookings_count ?? 0}</div></div>
          </div>
          {equipment.cost_savings_text && <div style={{ padding: 16, background: TEAL_LIGHT, border: `1px solid ${TEAL_MUTED}`, borderRadius: 12, color: TEAL_DARK, fontSize: 13 }}>Cost savings: <strong>{equipment.cost_savings_text}</strong></div>}
        </div>
        <div style={{ padding: "16px 28px", borderTop: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", gap: 12 }}>
          <button onClick={onClose} style={{ padding: "10px 18px", borderRadius: 10, border: `1.5px solid ${BORDER}`, background: CARD, color: TEXT_MID, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Close</button>
          {isAdmin && <div style={{ display: "flex", gap: 10 }}><button onClick={() => onEdit?.(equipment)} style={{ padding: "10px 18px", borderRadius: 10, border: `1.5px solid ${BORDER}`, background: CARD, color: TEXT_MID, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Edit</button><button onClick={() => { if (confirm("Delete this equipment item?")) onDelete?.(equipment.id); }} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "#FDECF1", color: "#D63563", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Delete</button></div>}
        </div>
      </div>
    </div>
  );
}

// ─── LAB VIEW ─────────────────────────────────────────────────────────────────

function LabView({ userEmail, userName, isAdmin }: { userEmail: string; userName: string; isAdmin?: boolean; }) {
  const [proposing, setProposing] = useState(false);
  const [equipmentModal, setEquipmentModal] = useState<Partial<EquipmentProposal> | null>(null);
  const [approvedEquipment, setApprovedEquipment] = useState<EquipmentProposal[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentProposal | null>(null);
  const [editingStats, setEditingStats] = useState(false);
  const [search, setSearch] = useState("");

  // Lab stats — loaded from DB, null until loaded
  const [labStats, setLabStats] = useState<{
    utilization_text: string;
    utilization_sub: string;
    cost_savings_text: string;
    cost_savings_sub: string;
    bookings_text: string;
    bookings_sub: string;
  } | null>(null);
  const [labStatsLoading, setLabStatsLoading] = useState(true);
  // Local draft for editing — only used when admin clicks "Edit Stats"
  const [statsDraft, setStatsDraft] = useState<typeof labStats>(null);

  // Fetch approved equipment from DB
  const fetchEquipment = async () => {
    try {
      const res = await fetch("/api/admin/equipment");
      const data = await res.json();
      setApprovedEquipment(
        (data.proposals || []).filter((p: EquipmentProposal) => p.status === "approved")
      );
    } catch {}
  };

  // Fetch lab stats from DB
  const fetchLabStats = async () => {
    try {
      const res = await fetch("/api/admin/lab-stats");
      const data = await res.json();
      if (data.stats) setLabStats(data.stats);
    } catch {}
    finally { setLabStatsLoading(false); }
  };

  useEffect(() => {
    fetchEquipment();
    fetchLabStats();
  }, []);

  const filteredEquipment = approvedEquipment.filter(e =>
    [e.name, e.location, e.category, e.description]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const handleSaveEquipment = async (payload: Partial<EquipmentProposal> & { is_admin_add?: boolean }) => {
    const isEdit = !!payload.id;
    const res = await fetch("/api/admin/equipment", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to save equipment");
    await fetchEquipment();
  };

  const handleDeleteEquipment = async (id: string) => {
    await fetch("/api/admin/equipment", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setSelectedEquipment(null);
    await fetchEquipment();
  };

  const handleSaveStats = async () => {
    if (!statsDraft) return;
    try {
      const res = await fetch("/api/admin/lab-stats", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(statsDraft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save stats");
      setLabStats(data.stats);
      setEditingStats(false);
      setStatsDraft(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save stats");
    }
  };

  const startEditingStats = () => {
    // Copy current values into draft so edits don't affect display until saved
    setStatsDraft(labStats ? { ...labStats } : {
      utilization_text: "54%",
      utilization_sub: "Avg. across all equipment",
      cost_savings_text: "€32K",
      cost_savings_sub: "Estimated this quarter",
      bookings_text: "18",
      bookings_sub: "Across 3 locations",
    });
    setEditingStats(true);
  };

  const cancelEditingStats = () => {
    setEditingStats(false);
    setStatsDraft(null);
  };

  // Stat card definitions — use live labStats when available, fallback otherwise
  const statCards = [
    {
      key: "utilization",
      label: "Network Utilization",
      value: labStats?.utilization_text ?? "—",
      sub: labStats?.utilization_sub ?? "No data yet",
      color: TEAL,
      draftValueKey: "utilization_text" as const,
      draftSubKey: "utilization_sub" as const,
    },
    {
      key: "cost",
      label: "Cost Savings (Est. Q)",
      value: labStats?.cost_savings_text ?? "—",
      sub: labStats?.cost_savings_sub ?? "No data yet",
      color: "#7C5CFC",
      draftValueKey: "cost_savings_text" as const,
      draftSubKey: "cost_savings_sub" as const,
    },
    {
      key: "bookings",
      label: "Bookings This Month",
      value: labStats?.bookings_text ?? "—",
      sub: labStats?.bookings_sub ?? "No data yet",
      color: "#F0A500",
      draftValueKey: "bookings_text" as const,
      draftSubKey: "bookings_sub" as const,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Modals */}
      {proposing && (
        <ProposeEquipmentModal
          userEmail={userEmail}
          userName={userName}
          onClose={() => setProposing(false)}
          onSave={() => { setProposing(false); fetchEquipment(); }}
        />
      )}
      {equipmentModal !== null && (
        <EquipmentAdminModal
          equipment={equipmentModal}
          onClose={() => setEquipmentModal(null)}
          onSave={async (payload) => { await handleSaveEquipment(payload); setEquipmentModal(null); }}
        />
      )}
      {selectedEquipment && (
        <EquipmentDrawer
          equipment={selectedEquipment}
          isAdmin={isAdmin}
          onClose={() => setSelectedEquipment(null)}
          onEdit={e => { setSelectedEquipment(null); setEquipmentModal(e); }}
          onDelete={handleDeleteEquipment}
        />
      )}

      {/* Toolbar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 18px", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, boxShadow: SHADOW }}>
          <span style={{ color: TEXT_LIGHT }}><Icon name="search" size={16} /></span>
          <input
            placeholder="Search equipment..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ background: "transparent", border: "none", outline: "none", color: TEXT, flex: 1, fontSize: 13 }}
          />
        </div>
        {isAdmin ? (
          <button
            onClick={() => setEquipmentModal({})}
            style={{ padding: "11px 20px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" as const }}
          >
            <Icon name="plus" size={14} /> Add Equipment
          </button>
        ) : (
          <button
            onClick={() => setProposing(true)}
            style={{ padding: "11px 20px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" as const }}
          >
            <Icon name="plus" size={14} /> Propose Equipment
          </button>
        )}
      </div>

      {/* Info banner */}
      <div style={{ padding: "14px 18px", borderRadius: 12, background: TEAL_LIGHT, border: `1px solid ${TEAL_MUTED}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: TEAL_DARK, flexShrink: 0 }}><Icon name="cpu" size={16} /></span>
          <span style={{ fontSize: 13, color: TEAL_DARK, fontFamily: "'DM Sans', sans-serif" }}>
            {isAdmin
              ? "Add equipment directly to the Distributed Lab, or edit existing shared equipment."
              : "Have equipment to share? Click Propose Equipment to submit it for admin approval."}
          </span>
        </div>
        {isAdmin && !editingStats && (
          <button
            onClick={startEditingStats}
            style={{ padding: "7px 14px", borderRadius: 10, border: `1px solid ${TEAL_MUTED}`, background: "#fff", color: TEAL_DARK, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" as const }}
          >
            Edit Stats
          </button>
        )}
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {labStatsLoading ? (
          // Loading skeleton
          [0, 1, 2].map(i => (
            <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20, boxShadow: SHADOW }}>
              <div style={{ height: 10, background: "#EEF0F4", borderRadius: 6, width: "60%", marginBottom: 14 }} />
              <div style={{ height: 28, background: "#EEF0F4", borderRadius: 6, width: "40%", marginBottom: 10 }} />
              <div style={{ height: 10, background: "#EEF0F4", borderRadius: 6, width: "70%" }} />
            </div>
          ))
        ) : (
          statCards.map(s => (
            <div key={s.key} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20, boxShadow: SHADOW }}>
              <div style={{ fontSize: 11, color: TEXT_LIGHT, marginBottom: 10, textTransform: "uppercase" as const, letterSpacing: "0.06em", fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
                {s.label}
              </div>
              {editingStats && isAdmin && statsDraft ? (
                // Edit mode — show inputs using the draft copy
                <>
                  <input
                    value={statsDraft[s.draftValueKey]}
                    onChange={e => setStatsDraft(prev => prev ? { ...prev, [s.draftValueKey]: e.target.value } : prev)}
                    placeholder="e.g. 54% or €32K"
                    style={{ ...modalInputStyle, marginBottom: 8, fontSize: 18, fontWeight: 700, color: s.color }}
                  />
                  <input
                    value={statsDraft[s.draftSubKey]}
                    onChange={e => setStatsDraft(prev => prev ? { ...prev, [s.draftSubKey]: e.target.value } : prev)}
                    placeholder="Subtitle text"
                    style={{ ...modalInputStyle, fontSize: 12 }}
                  />
                </>
              ) : (
                // Display mode — show saved values
                <>
                  <div style={{ fontSize: 30, fontWeight: 700, color: s.color, fontFamily: "'Sora', sans-serif", lineHeight: 1 }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 12, color: TEXT_LIGHT, marginTop: 6, fontFamily: "'DM Sans', sans-serif" }}>
                    {s.sub}
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Save / Cancel buttons — only shown when editing */}
      {editingStats && isAdmin && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={cancelEditingStats}
            style={{ padding: "10px 20px", borderRadius: 10, border: `1.5px solid ${BORDER}`, background: CARD, color: TEXT_MID, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSaveStats}
            style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
          >
            Save Stats
          </button>
        </div>
      )}

      {/* Equipment table */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: SHADOW }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 120px 140px 100px", padding: "14px 24px", borderBottom: `1px solid ${BORDER}`, fontSize: 11, color: TEXT_LIGHT, textTransform: "uppercase" as const, letterSpacing: "0.07em", fontWeight: 700, background: "#FAFBFC", fontFamily: "'DM Sans', sans-serif" }}>
          <span>Equipment</span>
          <span>Location</span>
          <span>Status</span>
          <span>Utilization</span>
          <span>Action</span>
        </div>

        {filteredEquipment.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: TEXT_LIGHT, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
            {isAdmin
              ? "No equipment yet. Use the Add Equipment button above."
              : "No approved equipment in the network yet."}
          </div>
        ) : (
          filteredEquipment.map((e, i) => (
            <div
              key={e.id}
              onClick={() => setSelectedEquipment(e)}
              style={{ display: "grid", gridTemplateColumns: "2fr 1fr 120px 140px 100px", padding: "16px 24px", borderBottom: i < filteredEquipment.length - 1 ? `1px solid ${BORDER}` : "none", alignItems: "center", cursor: "pointer", transition: "background 0.15s" }}
              onMouseEnter={el => (el.currentTarget as HTMLElement).style.background = "#FAFBFC"}
              onMouseLeave={el => (el.currentTarget as HTMLElement).style.background = "transparent"}
            >
              <div>
                <div style={{ fontSize: 13, color: TEXT, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{e.name}</div>
                {e.category && <div style={{ fontSize: 11, color: TEXT_LIGHT, marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>{e.category}</div>}
              </div>
              <span style={{ fontSize: 12, color: TEXT_LIGHT, fontFamily: "'DM Sans', sans-serif" }}>{e.location}</span>
              <span>
                <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, fontWeight: 700, background: e.is_available ? "#E6F9F5" : "#FDECF1", color: e.is_available ? "#0D9373" : "#D63563", textTransform: "capitalize" as const }}>
                  {e.is_available ? "Available" : "Unavailable"}
                </span>
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#EEF0F4" }}>
                  <div style={{ width: `${e.utilization ?? 0}%`, height: "100%", borderRadius: 3, background: (e.utilization ?? 0) > 70 ? "#F0A500" : TEAL }} />
                </div>
                <span style={{ fontSize: 12, color: TEXT_MID, fontWeight: 600, width: 30, fontFamily: "'Sora', sans-serif" }}>{e.utilization ?? 0}%</span>
              </div>
              <button
                onClick={evt => { evt.stopPropagation(); }}
                style={{ padding: "6px 16px", borderRadius: 8, border: e.is_available ? `1.5px solid ${TEAL}` : `1px solid ${BORDER}`, background: e.is_available ? TEAL_LIGHT : "#FAFBFC", color: e.is_available ? TEAL_DARK : TEXT_LIGHT, cursor: e.is_available ? "pointer" : "default", fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}
              >
                {e.is_available ? "Book" : "N/A"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


function EventsView({ events, isAdmin, onEdit, onDelete }: { events: Event[]; isAdmin?: boolean; onEdit?: (e: Event) => void; onDelete?: (id: string) => void; }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
      {events.map((e, i) => {
        const hl = e.event_type === "national";
        return (
          <div key={i} style={{ background: CARD, borderRadius: 16, padding: 24, border: `1.5px solid ${hl ? TEAL_MUTED : BORDER}`, boxShadow: SHADOW, position: "relative", overflow: "hidden" }}>
            {hl && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${TEAL}, ${TEAL_DARK})` }} />}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <span style={{ fontSize: 10, padding: "4px 10px", borderRadius: 20, fontWeight: 700, background: hl ? TEAL_LIGHT : "#F3F5F8", color: hl ? TEAL_DARK : TEXT_LIGHT, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{e.event_type}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13, color: TEAL_DARK, fontWeight: 700 }}>{e.event_date}</span>
                {isAdmin && <div style={{ display: "flex", gap: 4 }}><button onClick={() => onEdit?.(e)} style={{ background: "#F3F5F8", border: "none", borderRadius: 6, padding: "4px 6px", cursor: "pointer", color: TEXT_MID }}><Icon name="edit" size={13} /></button><button onClick={() => { if (confirm("Delete this event?")) onDelete?.(e.id!); }} style={{ background: "#FDECF1", border: "none", borderRadius: 6, padding: "4px 6px", cursor: "pointer", color: "#D63563" }}><Icon name="trash" size={13} /></button></div>}
              </div>
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif", marginBottom: 8 }}>{e.title}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: e.description ? 8 : 20 }}><span style={{ color: TEXT_LIGHT }}><Icon name="mapPin" size={13} /></span><span style={{ fontSize: 13, color: TEXT_MID }}>{e.location}</span></div>
            {e.description && <p style={{ fontSize: 12, color: TEXT_LIGHT, lineHeight: 1.5, marginBottom: 16 }}>{e.description}</p>}
            <button style={{ width: "100%", padding: "9px 0", borderRadius: 10, border: hl ? "none" : `1.5px solid ${BORDER}`, background: hl ? `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})` : CARD, color: hl ? "#fff" : TEXT_MID, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>RSVP</button>
          </div>
        );
      })}
    </div>
  );
}

// ─── ORGANISATION MODAL ───────────────────────────────────────────────────────
type OrganisationFormState = { name: string; org_type: string; location: string; country: string; city: string; website: string; areas_of_interest: string; is_active: boolean; };

function OrganisationModal({ organisation, onClose, onSave }: { organisation: Partial<Organisation> | null; onClose: () => void; onSave: (payload: Partial<Organisation>) => Promise<void>; }) {
  const [form, setForm] = useState<OrganisationFormState>({ name: organisation?.name || "", org_type: organisation?.org_type || "", location: organisation?.location || "", country: organisation?.country || "", city: organisation?.city || "", website: organisation?.website || "", areas_of_interest: Array.isArray(organisation?.areas_of_interest) ? organisation!.areas_of_interest!.join(", ") : "", is_active: organisation?.is_active ?? true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!organisation?.id;
  const handle = async () => {
    if (!form.name.trim()) { setError("Organisation name is required."); return; }
    setSaving(true); setError(null);
    try { await onSave({ ...(isEdit ? { id: organisation!.id } : {}), name: form.name, org_type: form.org_type, location: form.location, country: form.country, city: form.city, website: form.website, areas_of_interest: form.areas_of_interest.split(",").map(i => i.trim()).filter(Boolean), is_active: form.is_active }); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to save organisation."); }
    finally { setSaving(false); }
  };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(26,35,50,0.50)", backdropFilter: "blur(4px)", zIndex: 3000 }} />
      <div style={{ position: "relative", zIndex: 3001, width: 620, maxWidth: "92vw", maxHeight: "88vh", overflow: "hidden", background: CARD, borderRadius: 20, boxShadow: "0 24px 80px rgba(0,0,0,0.22)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 28px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>{isEdit ? "Edit Organisation" : "Add Organisation"}</div>
          <button onClick={onClose} style={{ background: "#F3F5F8", border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: TEXT_MID }}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
          {error && <div style={{ padding: "10px 14px", borderRadius: 10, background: "#FDECF1", color: "#D63563", fontSize: 13 }}>{error}</div>}
          <div><label style={modalLabelStyle}>Organisation Name *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={modalInputStyle} /></div>
          <div><label style={modalLabelStyle}>Organisation Type</label>
  <select value={form.org_type} onChange={e => setForm(p => ({ ...p, org_type: e.target.value }))} style={modalInputStyle}>
    <option value="">Select a type…</option>
    <option value="foundation">Foundation</option>
    <option value="university">University / Research Institute</option>
    <option value="startup">Startup</option>
    <option value="sme">SME / Company</option>
    <option value="hospital">Hospital / Clinic</option>
    <option value="clinical_center">Clinical Center</option>
    <option value="investor">Investor / VC</option>
    <option value="international_partner">International Partner</option>
    <option value="other">Other</option>
  </select>
</div>
          <div><label style={modalLabelStyle}>Location</label><input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} style={modalInputStyle} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={modalLabelStyle}>Country</label><input value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} style={modalInputStyle} /></div>
            <div><label style={modalLabelStyle}>City</label><input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} style={modalInputStyle} /></div>
          </div>
          <div><label style={modalLabelStyle}>Website</label><input value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} style={modalInputStyle} /></div>
          <div><label style={modalLabelStyle}>Areas of Interest</label><input value={form.areas_of_interest} onChange={e => setForm(p => ({ ...p, areas_of_interest: e.target.value }))} placeholder="Comma separated" style={modalInputStyle} /></div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: TEXT_MID }}><input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} style={{ accentColor: TEAL, width: 15, height: 15 }} />Active organisation</label>
        </div>
        <div style={{ padding: "16px 28px", borderTop: `1px solid ${BORDER}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 10, border: `1.5px solid ${BORDER}`, background: CARD, color: TEXT_MID, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button onClick={handle} disabled={saving} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : isEdit ? "Save Changes" : "Add Organisation"}</button>
        </div>
      </div>
    </div>
  );
}

function MemberDrawer({ member, isAdmin, onClose, onEdit, onDelete }: { member: Organisation; isAdmin?: boolean; onClose: () => void; onEdit?: (m: Organisation) => void; onDelete?: (id: string) => void; }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(26,35,50,0.38)", backdropFilter: "blur(3px)" }} />
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 540, background: CARD, boxShadow: "-6px 0 28px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", zIndex: 1001 }}>
        <div style={{ padding: "22px 28px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div><div style={{ fontSize: 20, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>{member.name}</div><div style={{ fontSize: 13, color: TEXT_LIGHT, marginTop: 6 }}>{member.org_type || "Organisation"} · {member.location || "No location"}</div></div>
          <button onClick={onClose} style={{ background: "#F3F5F8", border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: TEXT_MID }}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[{ label: "Type", value: member.org_type }, { label: "Location", value: member.location }, { label: "Country", value: member.country }, { label: "City", value: member.city }].map(({ label, value }) => (
              <div key={label} style={{ padding: 16, background: "#FAFBFC", border: `1px solid ${BORDER}`, borderRadius: 12 }}><div style={{ fontSize: 11, color: TEXT_LIGHT, marginBottom: 6, textTransform: "uppercase", fontWeight: 700 }}>{label}</div><div style={{ fontSize: 14, color: TEXT, fontWeight: 600 }}>{value || "Not provided"}</div></div>
            ))}
          </div>
          <div style={{ padding: 16, background: "#FAFBFC", border: `1px solid ${BORDER}`, borderRadius: 12 }}><div style={{ fontSize: 11, color: TEXT_LIGHT, marginBottom: 6, textTransform: "uppercase", fontWeight: 700 }}>Website</div><div style={{ fontSize: 14, color: TEXT }}>{member.website ? <a href={member.website} target="_blank" rel="noreferrer" style={{ color: TEAL_DARK, textDecoration: "none" }}>{member.website}</a> : "Not provided"}</div></div>
          <div style={{ padding: 16, background: "#FAFBFC", border: `1px solid ${BORDER}`, borderRadius: 12 }}><div style={{ fontSize: 11, color: TEXT_LIGHT, marginBottom: 8, textTransform: "uppercase", fontWeight: 700 }}>Areas of Interest</div>{member.areas_of_interest && member.areas_of_interest.length > 0 ? <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{member.areas_of_interest.map(a => (<span key={a} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 20, background: TEAL_LIGHT, color: TEAL_DARK, fontWeight: 600 }}>{a}</span>))}</div> : <div style={{ fontSize: 14, color: TEXT_LIGHT }}>No areas of interest provided.</div>}</div>
        </div>
        <div style={{ padding: "16px 28px", borderTop: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", gap: 12 }}>
          <button onClick={onClose} style={{ padding: "10px 18px", borderRadius: 10, border: `1.5px solid ${BORDER}`, background: CARD, color: TEXT_MID, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Close</button>
          {isAdmin && <div style={{ display: "flex", gap: 10 }}><button onClick={() => onEdit?.(member)} style={{ padding: "10px 18px", borderRadius: 10, border: `1.5px solid ${BORDER}`, background: CARD, color: TEXT_MID, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Edit</button><button onClick={() => { if (member.id && confirm("Delete this organisation?")) onDelete?.(member.id); }} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "#FDECF1", color: "#D63563", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Delete</button></div>}
        </div>
      </div>
    </div>
  );
}

function MembersView({ members, isAdmin }: { members: Organisation[]; isAdmin?: boolean; }) {
  const [membersTab, setMembersTab] = useState<"organisations" | "people">("organisations");
  const [profiles, setProfiles] = useState<{ id: string; email: string; full_name?: string; partnership_level: string; coin_balance?: number; lifetime_earned?: number; tier?: string }[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  useEffect(() => {
    if (membersTab === "people") {
      setLoadingProfiles(true);
      Promise.all([
        fetch("/api/admin/users").then(r => r.json()),
        fetch("/api/coins?all=true").then(r => r.json()),
      ]).then(([usersData, coinsData]) => {
        const balanceMap: Record<string, { balance: number; lifetime_earned: number; tier: string }> = {};
        (coinsData.balances || []).forEach((cb: { user_id: string; balance: number; lifetime_earned: number; tier: string }) => {
          balanceMap[cb.user_id] = { balance: cb.balance, lifetime_earned: cb.lifetime_earned, tier: cb.tier };
        });
        const filtered = (usersData.users || []).filter((u: { partnership_level: string }) => u.partnership_level !== "admin");
                const enriched = filtered.map((u: { id: string; email: string; full_name?: string; partnership_level: string }) => ({
        
          ...u,
          coin_balance: balanceMap[u.id]?.balance ?? 0,
          lifetime_earned: balanceMap[u.id]?.lifetime_earned ?? 0,
          tier: balanceMap[u.id]?.tier ?? "Explorer",
        }));
        setProfiles(enriched);
        setLoadingProfiles(false);
      }).catch(() => setLoadingProfiles(false));
    }
  }, [membersTab]);

  const tc: Record<string, string> = { Foundation: TEAL, University: "#7C5CFC", Startup: "#00B894", SME: "#F0A500", "Clinical Center": "#E74C6F", Investor: "#4A7DFF", "International Partner": "#F0A500" };
  const tbg: Record<string, string> = { Foundation: TEAL_LIGHT, University: "#F0EDFF", Startup: "#E6F9F5", SME: "#FFF8E6", "Clinical Center": "#FDECF1", Investor: "#EBF1FF", "International Partner": "#FFF8E6" };
  const [selectedMember, setSelectedMember] = useState<Organisation | null>(null);
  const [organisationModal, setOrganisationModal] = useState<Partial<Organisation> | null>(null);
  const [memberList, setMemberList] = useState<Organisation[]>(members);
  const [isOpeningEdit, setIsOpeningEdit] = useState(false);

  useEffect(() => { setMemberList(members); }, [members]);

  const fetchMembers = async () => {
    const res = await fetch("/api/organisations");
    const data = await res.json();
    setMemberList(data.organisations || []);
  };

  const handleSaveOrganisation = async (payload: Partial<Organisation>) => {
    const isEdit = !!payload.id;
    const res = await fetch("/api/organisations", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to save organisation");
    await fetchMembers();
  };

  const handleDeleteOrganisation = async (id: string) => {
    const res = await fetch("/api/organisations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) { setSelectedMember(null); await fetchMembers(); }
  };

  const openEditModal = (member: Organisation) => {
    setIsOpeningEdit(true);
    setSelectedMember(null);
    setTimeout(() => {
      setOrganisationModal(member);
      setIsOpeningEdit(false);
    }, 120);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, position: "relative", isolation: "isolate" }}>

      {/* Map */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>Member Network Map</h3>
          <span style={{ fontSize: 12, color: TEXT_LIGHT }}>{memberList.length} organisations</span>
        </div>
        <div style={{ position: "relative", zIndex: 1, borderRadius: 16, overflow: "hidden" }}>
          <MemberMap />
        </div>
      </div>

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>
          {membersTab === "organisations" ? "Member Organisations" : "Community Members"}
        </h3>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={() => setMembersTab("organisations")} style={{ padding: "6px 14px", borderRadius: 20, border: "none", background: membersTab === "organisations" ? TEAL : "#F3F5F8", color: membersTab === "organisations" ? "#fff" : TEXT_MID, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Organisations</button>
          <button onClick={() => setMembersTab("people")} style={{ padding: "6px 14px", borderRadius: 20, border: "none", background: membersTab === "people" ? TEAL : "#F3F5F8", color: membersTab === "people" ? "#fff" : TEXT_MID, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>People</button>
        </div>
        {isAdmin && (
          <button
            onClick={() => setOrganisationModal({})}
            style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
          >
            <Icon name="plus" size={14} /> Add Organisation
          </button>
        )}
      </div>

      {/* Cards */}
      {membersTab === "people" ? (
        <div>
          {loadingProfiles ? (
            <div style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT, fontSize: 14 }}>Loading members…</div>
          ) : profiles.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT, fontSize: 14 }}>No members found.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
              {profiles.map((p) => {
                const tier = getCoinTier(p.lifetime_earned ?? 0);
                const levelColors: Record<string, { bg: string; color: string }> = { admin: { bg: "#FDECF1", color: "#E74C6F" }, partner: { bg: TEAL_LIGHT, color: TEAL_DARK }, member: { bg: "#F0EDFF", color: "#7C5CFC" } };
                const lvl = levelColors[p.partnership_level] || levelColors.member;
                return (
                  <div key={p.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, boxShadow: SHADOW, display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                        {(p.full_name || p.email).charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{p.full_name || "—"}</div>
                        <div style={{ fontSize: 12, color: TEXT_LIGHT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{p.email}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: lvl.bg, color: lvl.color, fontWeight: 700, textTransform: "capitalize" as const }}>{p.partnership_level}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: tier.bg, color: tier.color, fontWeight: 700 }}>{tier.badge} {p.tier || "Explorer"}</span>
                        <span style={{ fontSize: 11, color: TEXT_LIGHT }}>🪙 {p.coin_balance ?? 0}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (!memberList || memberList.length === 0) ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20, boxShadow: SHADOW, height: 80, opacity: 0.4 }} />
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {memberList.map((m, i) => (
            <div
              key={m.id || i}
              onClick={() => setSelectedMember(m)}
              style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20, boxShadow: SHADOW, cursor: "pointer", transition: "box-shadow 0.15s ease" }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = SHADOW_HOVER)}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = SHADOW)}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                {/* Avatar */}
                <div style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: tbg[m.org_type] || TEAL_LIGHT, color: tc[m.org_type] || TEAL, fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                  {m.name?.charAt(0) || "O"}
                </div>

                {/* Name + location */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, fontFamily: "'DM Sans', sans-serif" }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: TEXT_LIGHT, display: "flex", alignItems: "center", gap: 4, marginTop: 1, fontFamily: "'DM Sans', sans-serif" }}>
                    <Icon name="mapPin" size={11} /> {m.location || "No location"}
                  </div>
                </div>

                {/* Admin action buttons — edit + delete */}
                {isAdmin && (
                  <div style={{ display: "flex", gap: 5, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => openEditModal(m)}
                      title="Edit organisation"
                      style={{ background: "#F3F5F8", border: "none", borderRadius: 7, padding: "5px 7px", cursor: "pointer", color: TEXT_MID, display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <Icon name="edit" size={13} />
                    </button>
                    <button
                      onClick={() => { if (confirm(`Delete ${m.name}?`)) handleDeleteOrganisation(m.id!); }}
                      title="Delete organisation"
                      style={{ background: "#FDECF1", border: "none", borderRadius: 7, padding: "5px 7px", cursor: "pointer", color: "#D63563", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  </div>
                )}
              </div>

              {/* Type badge */}
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 14, background: tbg[m.org_type] || TEAL_LIGHT, color: tc[m.org_type] || TEAL, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>
                {m.org_type || "Organisation"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Member detail drawer */}
      {selectedMember && !isOpeningEdit && (
        <MemberDrawer
          member={selectedMember}
          isAdmin={isAdmin}
          onClose={() => setSelectedMember(null)}
          onEdit={openEditModal}
          onDelete={handleDeleteOrganisation}
        />
      )}

      {/* Add / Edit organisation modal */}
      {organisationModal !== null && (
        <OrganisationModal
          organisation={organisationModal}
          onClose={() => { setOrganisationModal(null); setIsOpeningEdit(false); }}
          onSave={async payload => {
            await handleSaveOrganisation(payload);
            setOrganisationModal(null);
            setIsOpeningEdit(false);
          }}
        />
      )}
    </div>
  );
}

// ─── KNOWLEDGE VIEW ───────────────────────────────────────────────────────────

// ─── KNOWLEDGE VIEW (with Propose Document for members/partners) ───────────────
function KnowledgeView({ isAdmin, currentUserId, currentUserName }: { isAdmin?: boolean; currentUserId?: string; currentUserName?: string }) {
  const [docCounts, setDocCounts] = useState<Record<string, number>>({});
  const [selectedCategory, setSelectedCategory] = useState<typeof KNOWLEDGE_CATEGORIES[0] | null>(null);
  const [categoryDocs, setCategoryDocs] = useState<KnowledgeDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [addingDoc, setAddingDoc] = useState(false);
  const [proposingDoc, setProposingDoc] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: "", description: "", url: "" });
  const [proposalDoc, setProposalDoc] = useState({ title: "", description: "", url: "" });
  const [savingDoc, setSavingDoc] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/knowledge").then(r => r.json()).then(d => {
      const counts: Record<string, number> = {};
      (d.documents || []).forEach((doc: KnowledgeDocument) => { counts[doc.category] = (counts[doc.category] || 0) + 1; });
      setDocCounts(counts);
    }).catch(() => {});
  }, []);

  const openCategory = async (cat: typeof KNOWLEDGE_CATEGORIES[0]) => {
    setSelectedCategory(cat); setLoadingDocs(true); setAddingDoc(false); setProposingDoc(false);
    try { const res = await fetch(`/api/admin/knowledge?category=${encodeURIComponent(cat.name)}`); const data = await res.json(); setCategoryDocs(data.documents || []); }
    catch { setCategoryDocs([]); }
    finally { setLoadingDocs(false); }
  };

  const handleAddDoc = async () => {
    if (!newDoc.title.trim() || !selectedCategory) return;
    setSavingDoc(true);
    try {
      const res = await fetch("/api/admin/knowledge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newDoc.title, description: newDoc.description, url: newDoc.url, category: selectedCategory.name, doc_type: "link", is_public: true, is_admin_add: true }) });
      const data = await res.json();
      if (res.ok) { setCategoryDocs(prev => [data.document, ...prev]); setDocCounts(prev => ({ ...prev, [selectedCategory.name]: (prev[selectedCategory.name] || 0) + 1 })); setNewDoc({ title: "", description: "", url: "" }); setAddingDoc(false); }
    } catch {} finally { setSavingDoc(false); }
  };

  const handleProposeDoc = async () => {
    if (!proposalDoc.title.trim() || !selectedCategory) return;
    setSavingDoc(true);
    try {
      const res = await fetch("/api/admin/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: proposalDoc.title,
          description: proposalDoc.description,
          url: proposalDoc.url,
          category: selectedCategory.name,
          doc_type: "link",
          is_public: true,
          is_admin_add: false,
          proposed_by: currentUserId,
          proposed_by_name: currentUserName,
        }),
      });
      if (res.ok) {
        setProposingDoc(false);
        setProposalDoc({ title: "", description: "", url: "" });
        alert("Your proposal has been submitted for admin review. It will appear publicly once approved.");
      }
    } catch {} finally { setSavingDoc(false); }
  };

  const handleDeleteDoc = async (id: string, category: string) => {
    if (!confirm("Delete this document?")) return;
    const res = await fetch("/api/admin/knowledge", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (res.ok) { setCategoryDocs(prev => prev.filter(d => d.id !== id)); setDocCounts(prev => ({ ...prev, [category]: Math.max(0, (prev[category] || 1) - 1) })); }
  };

  const filteredDocs = categoryDocs.filter(d => [d.title, d.description].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase()));

  if (selectedCategory) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => { setSelectedCategory(null); setSearch(""); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: `1.5px solid ${BORDER}`, background: CARD, color: TEXT_MID, fontSize: 13, fontWeight: 600, cursor: "pointer" }}><Icon name="chevronLeft" size={16} /> Back</button>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: selectedCategory.bg, color: selectedCategory.color, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={selectedCategory.icon} size={18} /></div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>{selectedCategory.name}</div>
                <div style={{ fontSize: 12, color: TEXT_LIGHT }}>{docCounts[selectedCategory.name] || 0} documents</div>
              </div>
            </div>
          </div>
          {/* Admin sees Add, members/partners see Propose */}
          {isAdmin ? (
            <button onClick={() => { setAddingDoc(true); setProposingDoc(false); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}><Icon name="plus" size={14} /> Add Document</button>
          ) : (
            <button onClick={() => { setProposingDoc(true); setAddingDoc(false); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, border: `1.5px solid ${TEAL}`, background: TEAL_LIGHT, color: TEAL_DARK, fontSize: 13, fontWeight: 700, cursor: "pointer" }}><Icon name="plus" size={14} /> Propose Document</button>
          )}
        </div>

        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 18px", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, boxShadow: SHADOW }}>
          <span style={{ color: TEXT_LIGHT }}><Icon name="search" size={16} /></span>
          <input placeholder={`Search ${selectedCategory.name}…`} value={search} onChange={e => setSearch(e.target.value)} style={{ background: "transparent", border: "none", outline: "none", color: TEXT, flex: 1, fontSize: 13 }} />
        </div>

        {/* Admin add form */}
        {addingDoc && isAdmin && (
          <div style={{ background: CARD, border: `1.5px solid ${TEAL_MUTED}`, borderRadius: 16, padding: 24, boxShadow: SHADOW }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 16, fontFamily: "'Sora', sans-serif" }}>Add Document to {selectedCategory.name}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div><label style={modalLabelStyle}>Title *</label><input value={newDoc.title} onChange={e => setNewDoc(p => ({ ...p, title: e.target.value }))} placeholder="Document title" style={modalInputStyle} /></div>
              <div><label style={modalLabelStyle}>Description</label><input value={newDoc.description} onChange={e => setNewDoc(p => ({ ...p, description: e.target.value }))} placeholder="Brief description" style={modalInputStyle} /></div>
              <div><label style={modalLabelStyle}>URL (Google Drive or external link)</label><input value={newDoc.url} onChange={e => setNewDoc(p => ({ ...p, url: e.target.value }))} placeholder="https://drive.google.com/..." style={modalInputStyle} /></div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => { setAddingDoc(false); setNewDoc({ title: "", description: "", url: "" }); }} style={{ padding: "9px 18px", borderRadius: 10, border: `1.5px solid ${BORDER}`, background: CARD, color: TEXT_MID, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button onClick={handleAddDoc} disabled={savingDoc || !newDoc.title.trim()} style={{ padding: "9px 20px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: savingDoc ? "default" : "pointer", opacity: savingDoc ? 0.7 : 1 }}>{savingDoc ? "Adding…" : "Add Document"}</button>
              </div>
            </div>
          </div>
        )}

        {/* Member/partner propose form */}
        {proposingDoc && !isAdmin && (
          <div style={{ background: CARD, border: `1.5px solid ${TEAL_MUTED}`, borderRadius: 16, padding: 24, boxShadow: SHADOW }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 4, fontFamily: "'Sora', sans-serif" }}>Propose a Document</div>
            <div style={{ fontSize: 12, color: TEXT_LIGHT, marginBottom: 16 }}>Your proposal will be reviewed by an admin before appearing publicly.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div><label style={modalLabelStyle}>Title *</label><input value={proposalDoc.title} onChange={e => setProposalDoc(p => ({ ...p, title: e.target.value }))} placeholder="Document title" style={modalInputStyle} /></div>
              <div><label style={modalLabelStyle}>Description</label><input value={proposalDoc.description} onChange={e => setProposalDoc(p => ({ ...p, description: e.target.value }))} placeholder="Brief description" style={modalInputStyle} /></div>
              <div><label style={modalLabelStyle}>URL (optional)</label><input value={proposalDoc.url} onChange={e => setProposalDoc(p => ({ ...p, url: e.target.value }))} placeholder="https://drive.google.com/..." style={modalInputStyle} /></div>
              <div style={{ padding: "10px 14px", borderRadius: 10, background: TEAL_LIGHT, border: `1px solid ${TEAL_MUTED}`, fontSize: 12, color: TEAL_DARK }}>
                Your proposal will appear after admin approval.
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => { setProposingDoc(false); setProposalDoc({ title: "", description: "", url: "" }); }} style={{ padding: "9px 18px", borderRadius: 10, border: `1.5px solid ${BORDER}`, background: CARD, color: TEXT_MID, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button onClick={handleProposeDoc} disabled={savingDoc || !proposalDoc.title.trim()} style={{ padding: "9px 20px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: savingDoc ? "default" : "pointer", opacity: savingDoc ? 0.7 : 1 }}>{savingDoc ? "Submitting…" : "Submit Proposal"}</button>
              </div>
            </div>
          </div>
        )}

        {/* Document list */}
        {loadingDocs ? (
          <div style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT, fontSize: 14 }}>Loading…</div>
        ) : filteredDocs.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{ color: "#E8EDF3", marginBottom: 12 }}><Icon name="book" size={48} /></div>
            <div style={{ fontSize: 15, fontWeight: 600, color: TEXT_MID, fontFamily: "'Sora', sans-serif" }}>No documents yet</div>
            {isAdmin && <div style={{ fontSize: 13, color: TEXT_LIGHT, marginTop: 4 }}>Click "Add Document" to add the first document to this category.</div>}
            {!isAdmin && <div style={{ fontSize: 13, color: TEXT_LIGHT, marginTop: 4 }}>Click "Propose Document" to suggest a resource for this category.</div>}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredDocs.map(doc => (
              <div key={doc.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "18px 22px", boxShadow: SHADOW, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif", marginBottom: 4 }}>{doc.title}</div>
                  {doc.description && <div style={{ fontSize: 13, color: TEXT_MID, marginBottom: 8, lineHeight: 1.5 }}>{doc.description}</div>}
                  {doc.url && <a href={doc.url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: TEAL_DARK, fontWeight: 600, textDecoration: "none", padding: "5px 12px", borderRadius: 8, background: TEAL_LIGHT, border: `1px solid ${TEAL_MUTED}` }}><Icon name="link" size={13} /> Open Document</a>}
                  <div style={{ fontSize: 11, color: TEXT_LIGHT, marginTop: 8 }}>{new Date(doc.created_at).toLocaleDateString("en-GB")}</div>
                </div>
                {isAdmin && <button onClick={() => handleDeleteDoc(doc.id, doc.category)} style={{ background: "#FDECF1", border: "none", borderRadius: 8, padding: "7px 9px", cursor: "pointer", color: "#D63563", flexShrink: 0 }}><Icon name="trash" size={15} /></button>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Category grid view
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, boxShadow: SHADOW }}>
        <span style={{ color: TEXT_LIGHT }}><Icon name="search" size={16} /></span>
        <input placeholder="Search the knowledge base..." style={{ background: "transparent", border: "none", outline: "none", color: TEXT, flex: 1, fontSize: 13 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 16 }}>
        {KNOWLEDGE_CATEGORIES.map((c, i) => (
          <div key={i} onClick={() => openCategory(c)} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, boxShadow: SHADOW, cursor: "pointer", transition: "box-shadow 0.2s ease" }} onMouseEnter={e => (e.currentTarget.style.boxShadow = SHADOW_HOVER)} onMouseLeave={e => (e.currentTarget.style.boxShadow = SHADOW)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: c.bg, color: c.color, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={c.icon} size={20} /></div>
              <span style={{ fontSize: 12, color: TEXT_LIGHT, fontWeight: 600 }}>{docCounts[c.name] !== undefined ? docCounts[c.name] : "…"} docs</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif", marginBottom: 6 }}>{c.name}</div>
            <div style={{ fontSize: 13, color: TEXT_MID, lineHeight: 1.5 }}>{c.desc}</div>
            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: c.color, fontWeight: 700 }}>View documents <Icon name="chevronRight" size={14} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}



// ─── COIN TIER HELPER ─────────────────────────────────────────────────────────
const COIN_TIERS = [
  { name: "Catalyst",     min: 1000, color: "#F0A500", bg: "#FFF8E6", badge: "🟡" },
  { name: "Collaborator", min: 500,  color: "#4A7DFF", bg: "#EBF1FF", badge: "🔵" },
  { name: "Contributor",  min: 200,  color: "#00B894", bg: "#E6F9F5", badge: "🟢" },
  { name: "Explorer",     min: 0,    color: "#8896A6", bg: "#F3F5F8", badge: "⚪" },
];
function getCoinTier(lifetime: number) {
  return COIN_TIERS.find(t => lifetime >= t.min) || COIN_TIERS[3];
}
type CoinBalance = { user_id: string; balance: number; lifetime_earned: number; tier: string; };
type CoinTransaction = { id: string; amount: number; reason: string; type: string; created_at: string; };


// ─── REDEMPTION CATALOGUE ─────────────────────────────────────────────────────
const REDEMPTION_CATALOGUE = [
  { id: "intro_1on1", label: "Request a 1:1 intro to another partner", cost: 150, icon: "users", color: "#7C5CFC", bg: "#F0EDFF", description: "Get a warm introduction to a partner of your choice facilitated by bioERGOtech." },
  { id: "premium_kb", label: "Access a premium knowledge base resource", cost: 100, icon: "book", color: "#2EC4B6", bg: "#E8F8F6", description: "Unlock access to exclusive research, datasets, or proprietary resources in the Knowledge Base." },
  { id: "priority_lab", label: "Priority lab slot booking", cost: 250, icon: "cpu", color: "#F0A500", bg: "#FFF8E6", description: "Jump the queue and secure priority access to Distributed Lab equipment and facilities." },
  { id: "feature_project", label: "Feature your project on the portal homepage", cost: 400, icon: "star", color: "#E74C6F", bg: "#FDECF1", description: "Get your project highlighted on the bioERGOtech portal homepage for maximum visibility." },
  { id: "nominate_upgrade", label: "Nominate someone for a partnership upgrade", cost: 600, icon: "award", color: "#00B894", bg: "#E6F9F5", description: "Nominate a colleague or partner for a tier upgrade within the bioERGOtech ecosystem." },
  { id: "cobrand_event", label: "Co-brand an event with bioERGOtech", cost: 1000, icon: "calendar", color: "#4A7DFF", bg: "#EBF1FF", description: "Partner with bioERGOtech to co-host a branded event, workshop, or webinar." },
];

// ─── ADMIN TYPES ──────────────────────────────────────────────────────────────
type UserProfile = { id: string; email: string; full_name?: string; partnership_level: PartnershipLevel; organisation_id?: string | null; };
type Application = { id: string; email: string; full_name?: string; contact_role?: string; organisation_name?: string; organisation_type?: string; organisation_website?: string; country?: string; city?: string; areas_of_interest?: string[]; what_you_bring?: string; what_you_seek?: string; application_status: string; applied_at?: string; reviewed_at?: string; partnership_type?: string; admin_notes?: string; partnership_level: PartnershipLevel; };
const ORG_TYPE_LABELS: Record<string, string> = { startup: "Startup", sme: "SME / Company", hospital: "Hospital / Clinic", university: "University / Research Institute", investor: "Investor / VC", international_partner: "International Partner", other: "Other" };
const PARTNERSHIP_TYPE_LABELS: Record<string, string> = {
  community_partner: "Community Partner",
  project_partner: "Project Partner",
  strategic_partner: "Strategic Partner",
};
const PILLAR_LABELS: Record<string, string> = { digital_twin: "Digital Twin Therapeutics", synthetic_biology: "Synthetic Biology & Cell Engineering", biomanufacturing: "Automated Biomanufacturing", multi_omics: "Integrated Multi-Omics Analytics" };

function ApplicationDrawer({
  app,
  onClose,
  onAction,
}: {
  app: Application;
  onClose: () => void;
  onAction: (
    id: string,
    action: "approve" | "decline",
    notes: string,
    level: PartnershipLevel
  ) => void;
}) {
  const [notes, setNotes] = useState(app.admin_notes ?? "");
  const [level, setLevel] = useState<PartnershipLevel>(
    app.partnership_type === "strategic_partner" ? "partner" : "member"
  );
  const [acting, setActing] = useState(false);

  const handle = async (action: "approve" | "decline") => {
    setActing(true);
    await onAction(app.id, action, notes, level);
    setActing(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex" }}>
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(26,35,50,0.4)",
          backdropFilter: "blur(3px)",
        }}
      />

      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: 520,
          background: CARD,
          boxShadow: "-4px 0 32px rgba(0,0,0,0.12)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "slideIn 0.25s ease both",
        }}
      >
        <div
          style={{
            padding: "22px 28px",
            borderBottom: `1px solid ${BORDER}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: TEXT,
                fontFamily: "'Sora', sans-serif",
              }}
            >
              {app.full_name || app.email}
            </div>
            <div
              style={{
                fontSize: 13,
                color: TEXT_LIGHT,
                marginTop: 2,
              }}
            >
              {app.organisation_name && `${app.organisation_name} · `}
              {app.email}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "#F3F5F8",
              border: "none",
              borderRadius: 8,
              padding: 8,
              cursor: "pointer",
              color: TEXT_MID,
            }}
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: "24px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div
            style={{
              background: "#FAFBFC",
              borderRadius: 14,
              padding: 18,
              border: `1px solid ${BORDER}`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: TEXT_LIGHT,
                textTransform: "uppercase" as const,
                letterSpacing: "0.07em",
                marginBottom: 10,
              }}
            >
              Partnership Type
            </div>
            <div
              style={{
                fontSize: 13,
                color: TEXT,
                fontWeight: 600,
              }}
            >
              {app.partnership_type
                ? PARTNERSHIP_TYPE_LABELS[app.partnership_type] ?? app.partnership_type
                : "—"}
            </div>
          </div>

          <div
            style={{
              background: "#FAFBFC",
              borderRadius: 14,
              padding: 18,
              border: `1px solid ${BORDER}`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: TEXT_LIGHT,
                textTransform: "uppercase" as const,
                letterSpacing: "0.07em",
                marginBottom: 14,
              }}
            >
              Organisation
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              {[
                { label: "Name", value: app.organisation_name },
                {
                  label: "Type",
                  value: app.organisation_type
                    ? ORG_TYPE_LABELS[app.organisation_type]
                    : undefined,
                },
                {
                  label: "Location",
                  value: [app.city, app.country].filter(Boolean).join(", "),
                },
                { label: "Website", value: app.organisation_website },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div
                    style={{
                      fontSize: 11,
                      color: TEXT_LIGHT,
                      marginBottom: 3,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: TEXT,
                      fontWeight: 500,
                    }}
                  >
                    {value || "—"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {app.areas_of_interest && app.areas_of_interest.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: TEXT_LIGHT,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.07em",
                  marginBottom: 10,
                }}
              >
                Scientific Interests
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap" as const,
                  gap: 7,
                }}
              >
                {app.areas_of_interest.map((a) => (
                  <span
                    key={a}
                    style={{
                      fontSize: 12,
                      padding: "4px 12px",
                      borderRadius: 20,
                      background: TEAL_LIGHT,
                      color: TEAL_DARK,
                      fontWeight: 600,
                    }}
                  >
                    {PILLAR_LABELS[a] ?? a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {app.what_you_bring && (
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: TEXT_LIGHT,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.07em",
                  marginBottom: 8,
                }}
              >
                What They Bring
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: TEXT_MID,
                  lineHeight: 1.65,
                  margin: 0,
                  background: "#FAFBFC",
                  padding: 14,
                  borderRadius: 10,
                  border: `1px solid ${BORDER}`,
                }}
              >
                {app.what_you_bring}
              </p>
            </div>
          )}

          {app.what_you_seek && (
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: TEXT_LIGHT,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.07em",
                  marginBottom: 8,
                }}
              >
                What They Seek
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: TEXT_MID,
                  lineHeight: 1.65,
                  margin: 0,
                  background: "#FAFBFC",
                  padding: 14,
                  borderRadius: 10,
                  border: `1px solid ${BORDER}`,
                }}
              >
                {app.what_you_seek}
              </p>
            </div>
          )}

          {app.applied_at && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: TEXT_LIGHT,
                fontSize: 12,
              }}
            >
              <Icon name="clock" size={13} />
              Applied{" "}
              {new Date(app.applied_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
          )}

          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: TEXT_LIGHT,
                textTransform: "uppercase" as const,
                letterSpacing: "0.07em",
                marginBottom: 8,
              }}
            >
              Admin Notes
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes..."
              rows={3}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 10,
                border: `1.5px solid ${BORDER}`,
                fontSize: 13,
                color: TEXT,
                outline: "none",
                resize: "vertical" as const,
                background: "#FAFBFC",
              }}
            />
          </div>

          {app.application_status === "pending" && (
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: TEXT_LIGHT,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.07em",
                  marginBottom: 8,
                }}
              >
                Grant Portal Access Level
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                {(["member", "partner"] as PartnershipLevel[]).map((l) => {
                  const lbl = PARTNERSHIP_LABELS[l];
                  return (
                    <button
                      key={l}
                      onClick={() => setLevel(l)}
                      style={{
                        padding: "7px 18px",
                        borderRadius: 10,
                        border: `1.5px solid ${level === l ? lbl.color : BORDER}`,
                        background: level === l ? lbl.bg : CARD,
                        color: level === l ? lbl.color : TEXT_LIGHT,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {lbl.label}
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: TEXT_LIGHT,
                  marginTop: 8,
                  lineHeight: 1.5,
                }}
              >
                Standard approved applicants should usually be granted <strong>Member</strong>.
                Strategic partnership applications should usually be granted <strong>Partner</strong>.
                Viewer is reserved for limited-access cases and is not part of normal approvals.
              </div>
            </div>
          )}
        </div>

        {app.application_status === "pending" ? (
          <div
            style={{
              padding: "18px 28px",
              borderTop: `1px solid ${BORDER}`,
              display: "flex",
              gap: 10,
            }}
          >
            <button
              onClick={() => handle("decline")}
              disabled={acting}
              style={{
                flex: 1,
                padding: "11px 0",
                borderRadius: 12,
                border: `1.5px solid #F9C3CE`,
                background: "#FEF2F4",
                color: "#D63563",
                fontSize: 13,
                fontWeight: 700,
                cursor: acting ? "default" : "pointer",
                opacity: acting ? 0.6 : 1,
              }}
            >
              Decline
            </button>

            <button
              onClick={() => handle("approve")}
              disabled={acting}
              style={{
                flex: 2,
                padding: "11px 0",
                borderRadius: 12,
                border: "none",
                background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`,
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: acting ? "default" : "pointer",
                opacity: acting ? 0.6 : 1,
              }}
            >
              {acting ? "Processing…" : `Approve as ${PARTNERSHIP_LABELS[level].label}`}
            </button>
          </div>
        ) : (
          <div
            style={{
              padding: "18px 28px",
              borderTop: `1px solid ${BORDER}`,
            }}
          >
            <div
              style={{
                padding: "12px 18px",
                borderRadius: 12,
                textAlign: "center",
                background:
                  app.application_status === "approved" ? "#E6F9F5" : "#FEF2F4",
                color:
                  app.application_status === "approved" ? "#0D9373" : "#D63563",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {app.application_status === "approved" ? "✓ Approved" : "✗ Declined"}
              {app.reviewed_at &&
                ` · ${new Date(app.reviewed_at).toLocaleDateString("en-GB")}`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
function AdminPanel({ onEventsChanged, onProjectsChanged }: { onEventsChanged?: () => void; onProjectsChanged?: () => void; }) {
  const [tab, setTab] = useState<"applications" | "users" | "events" | "projects" | "equipment" | "knowledge" | "pending_docs" | "coins" | "redemptions" | "newsletter">("applications");
  const [applications, setApplications] = useState<Application[]>([]);
  const [appFilter, setAppFilter] = useState<"pending" | "approved" | "declined" | "all">("pending");
  const [loadingApps, setLoadingApps] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [allOrgs, setAllOrgs] = useState<{ id: string; name: string }[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loadingNewsletter, setLoadingNewsletter] = useState(true);
  const [adminEvents, setAdminEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventModal, setEventModal] = useState<{ open: boolean; event: Partial<Event> | null }>({ open: false, event: null });
  const [adminProjects, setAdminProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectModal, setProjectModal] = useState<{ open: boolean; project: Partial<Project> | null }>({ open: false, project: null });
  const [proposals, setProposals] = useState<EquipmentProposal[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(true);
  const [reviewingProposal, setReviewingProposal] = useState<string | null>(null);
  // Knowledge docs (approved)
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDocument[]>([]);
  const [loadingKnowledge, setLoadingKnowledge] = useState(true);
  const [knowledgeFilter, setKnowledgeFilter] = useState("All");
  const [addingKnowledgeDoc, setAddingKnowledgeDoc] = useState(false);
  const [newKnowledgeDoc, setNewKnowledgeDoc] = useState({ title: "", description: "", url: "", category: KNOWLEDGE_CATEGORIES[0].name });
  const [savingKnowledgeDoc, setSavingKnowledgeDoc] = useState(false);
  // Pending document proposals
  const [pendingDocs, setPendingDocs] = useState<KnowledgeDocument[]>([]);
  const [loadingPendingDocs, setLoadingPendingDocs] = useState(true);
  const [pendingRedemptions, setPendingRedemptions] = useState<{ id: string; user_email: string; user_name?: string; item_id: string; item_label: string; coins_spent: number; status: string; admin_notes?: string; created_at: string; actioned_at?: string }[]>([]);
  const [loadingRedemptions, setLoadingRedemptions] = useState(true);
  const [allCoinBalances, setAllCoinBalances] = useState<(CoinBalance & { profiles: { email: string; full_name?: string; partnership_level: string } })[]>([]);
  const [loadingCoins, setLoadingCoins] = useState(true);
  const [coinTopUp, setCoinTopUp] = useState<{ userId: string; amount: string; reason: string } | null>(null);
  const [savingCoin, setSavingCoin] = useState(false);

  useEffect(() => {
    setLoadingApps(true);
    fetch(`/api/admin/applications?status=${appFilter}`).then(r => r.json()).then(d => { setApplications(d.applications || []); setLoadingApps(false); }).catch(() => setLoadingApps(false));
  }, [appFilter]);

  useEffect(() => {
    if (tab === "users") {
      setLoadingUsers(true);
      fetch("/api/admin/users").then(r => r.json()).then(d => { setUsers(d.users || []); setLoadingUsers(false); }).catch(() => setLoadingUsers(false));
      fetch("/api/organisations").then(r => r.json()).then(d => setAllOrgs(d.organisations || [])).catch(() => {});
    }
    if (tab === "newsletter") { setLoadingNewsletter(true); fetch("/api/admin/newsletter").then(r => r.json()).then(d => { setSubscribers(d.subscribers || []); setLoadingNewsletter(false); }).catch(() => setLoadingNewsletter(false)); }
    if (tab === "events") { setLoadingEvents(true); fetch("/api/admin/events").then(r => r.json()).then(d => { setAdminEvents(d.events || []); setLoadingEvents(false); }).catch(() => setLoadingEvents(false)); }
    if (tab === "projects") { setLoadingProjects(true); fetch("/api/admin/projects").then(r => r.json()).then(d => { setAdminProjects(d.projects || []); setLoadingProjects(false); }).catch(() => setLoadingProjects(false)); }
    if (tab === "equipment") { setLoadingProposals(true); fetch("/api/admin/equipment").then(r => r.json()).then(d => { setProposals(d.proposals || []); setLoadingProposals(false); }).catch(() => setLoadingProposals(false)); }
    if (tab === "knowledge") { setLoadingKnowledge(true); fetch("/api/admin/knowledge").then(r => r.json()).then(d => { setKnowledgeDocs(d.documents || []); setLoadingKnowledge(false); }).catch(() => setLoadingKnowledge(false)); }
    if (tab === "redemptions") { setLoadingRedemptions(true); fetch("/api/redemptions").then(r => r.json()).then(d => { setPendingRedemptions(d.requests || []); setLoadingRedemptions(false); }).catch(() => setLoadingRedemptions(false)); }
    if (tab === "coins") { setLoadingCoins(true); fetch("/api/coins?all=true").then(r => r.json()).then(d => { setAllCoinBalances(d.balances || []); setLoadingCoins(false); }).catch(() => setLoadingCoins(false)); }
    if (tab === "pending_docs") { setLoadingPendingDocs(true); fetch("/api/admin/knowledge?pending=true").then(r => r.json()).then(d => { setPendingDocs(d.documents || []); setLoadingPendingDocs(false); }).catch(() => setLoadingPendingDocs(false)); }
  }, [tab]);

  const handleAction = async (id: string, action: "approve" | "decline", notes: string, level: PartnershipLevel) => {
    try {
      const res = await fetch("/api/admin/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ applicantId: id, action, adminNotes: notes, partnershipLevel: level }) });
      const data = await res.json();
      if (res.ok) { setApplications(prev => prev.map(a => a.id === id ? { ...a, application_status: action === "approve" ? "approved" : "declined", reviewed_at: new Date().toISOString() } : a)); setSelectedApp(null); setActionMessage({ type: "success", text: `Application ${action === "approve" ? "approved" : "declined"} successfully.` }); }
      else { setActionMessage({ type: "error", text: data.error || "Failed." }); }
    } catch { setActionMessage({ type: "error", text: "Network error." }); }
  };

  const updateLevel = async (userId: string, level: PartnershipLevel) => {
    setSaving(userId);
    try { const res = await fetch("/api/admin/set-partnership", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, partnershipLevel: level }) }); if (res.ok) setUsers(prev => prev.map(u => u.id === userId ? { ...u, partnership_level: level } : u)); } finally { setSaving(null); }
  };

  const updateUserOrg = async (userId: string, orgId: string | null) => {
    const res = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, organisation_id: orgId }) });
    if (res.ok) setUsers(prev => prev.map(u => u.id === userId ? { ...u, organisation_id: orgId } : u));
  };

  const handleSaveEvent = async (event: Partial<Event>) => { const isEdit = !!event.id; const res = await fetch("/api/admin/events", { method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(event) }); const data = await res.json(); if (!res.ok) throw new Error(data.error || "Failed to save"); if (isEdit) setAdminEvents(prev => prev.map(e => e.id === event.id ? data.event : e)); else setAdminEvents(prev => [data.event, ...prev]); onEventsChanged?.(); };
  const handleDeleteEvent = async (id: string) => { const res = await fetch("/api/admin/events", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); if (res.ok) { setAdminEvents(prev => prev.filter(e => e.id !== id)); onEventsChanged?.(); } };
  const handleSaveProject = async (project: Partial<Project>) => { const isEdit = !!project.id; const res = await fetch("/api/admin/projects", { method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(project) }); const data = await res.json(); if (!res.ok) throw new Error(data.error || "Failed to save"); if (isEdit) setAdminProjects(prev => prev.map(p => p.id === project.id ? data.project : p)); else setAdminProjects(prev => [data.project, ...prev]); onProjectsChanged?.(); };
  const handleDeleteProject = async (id: string) => { const res = await fetch("/api/admin/projects", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); if (res.ok) { setAdminProjects(prev => prev.filter(p => p.id !== id)); onProjectsChanged?.(); } };
  const handleReviewProposal = async (id: string, status: "approved" | "rejected") => { setReviewingProposal(id); try { const res = await fetch("/api/admin/equipment", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status, admin_notes: "" }) }); const data = await res.json(); if (res.ok) setProposals(prev => prev.map(p => p.id === id ? data.proposal : p)); } finally { setReviewingProposal(null); } };
  const handleDeleteProposal = async (id: string) => { const res = await fetch("/api/admin/equipment", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); if (res.ok) setProposals(prev => prev.filter(p => p.id !== id)); };

  const handleAddKnowledgeDoc = async () => {
    if (!newKnowledgeDoc.title.trim()) return;
    setSavingKnowledgeDoc(true);
    try {
      const res = await fetch("/api/admin/knowledge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...newKnowledgeDoc, doc_type: "link", is_public: true, is_admin_add: true }) });
      const data = await res.json();
      if (res.ok) { setKnowledgeDocs(prev => [data.document, ...prev]); setNewKnowledgeDoc({ title: "", description: "", url: "", category: KNOWLEDGE_CATEGORIES[0].name }); setAddingKnowledgeDoc(false); }
    } catch {} finally { setSavingKnowledgeDoc(false); }
  };

  const handleDeleteKnowledgeDoc = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    const res = await fetch("/api/admin/knowledge", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (res.ok) setKnowledgeDocs(prev => prev.filter(d => d.id !== id));
  };

  const handleApproveDoc = async (id: string) => {
    const res = await fetch("/api/admin/knowledge", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, is_approved: true }) });
    if (res.ok) { setPendingDocs(prev => prev.filter(d => d.id !== id)); }
  };

  const handleRejectDoc = async (id: string) => {
    if (!confirm("Reject and delete this proposal?")) return;
    const res = await fetch("/api/admin/knowledge", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (res.ok) setPendingDocs(prev => prev.filter(d => d.id !== id));
  };

  const exportCSV = () => { const csv = ["Name,Email,Source,Date"].concat(subscribers.map(s => `"${s.full_name || ""}","${s.email}","${s.source}","${new Date(s.subscribed_at).toLocaleDateString("en-GB")}"`)).join("\n"); const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `bioergotech-newsletter-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url); };

  const pendingCount = applications.filter(a => a.application_status === "pending").length;
  const pendingProposals = proposals.filter(p => p.status === "pending").length;
  const filteredKnowledgeDocs = knowledgeFilter === "All" ? knowledgeDocs : knowledgeDocs.filter(d => d.category === knowledgeFilter);
  const btnBase: React.CSSProperties = { border: "none", borderRadius: 7, padding: "6px 8px", cursor: "pointer" };

  const tabs = [
    { id: "applications" as const, label: "Applications", icon: "inbox", badge: (pendingCount > 0 && appFilter === "pending") ? pendingCount : null as number | null },
    { id: "users" as const, label: "Users", icon: "users", badge: null as number | null },
    { id: "events" as const, label: "Events", icon: "calendar", badge: null as number | null },
    { id: "projects" as const, label: "Projects", icon: "layers", badge: null as number | null },
    { id: "equipment" as const, label: "Equipment", icon: "cpu", badge: pendingProposals > 0 ? pendingProposals : null as number | null },
    { id: "knowledge" as const, label: "Knowledge", icon: "book", badge: null as number | null },
    { id: "pending_docs" as const, label: "Doc Proposals", icon: "fileText", badge: pendingDocs.length > 0 ? pendingDocs.length : null as number | null },
    { id: "coins" as const, label: "Coins", icon: "star", badge: null as number | null },
    { id: "redemptions" as const, label: "Redemptions", icon: "award", badge: pendingRedemptions.length > 0 ? pendingRedemptions.length : null as number | null },
    { id: "newsletter" as const, label: "Newsletter", icon: "mail", badge: null as number | null },
  ];

  return (
    <>
      {selectedApp && <ApplicationDrawer app={selectedApp} onClose={() => setSelectedApp(null)} onAction={handleAction} />}
      {eventModal.open && <EventModal event={eventModal.event} onClose={() => setEventModal({ open: false, event: null })} onSave={handleSaveEvent} />}
      {projectModal.open && <ProjectModal project={projectModal.project} onClose={() => setProjectModal({ open: false, project: null })} onSave={handleSaveProject} />}

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ background: "#FDECF1", border: "1px solid #F9C3CE", borderRadius: 14, padding: "16px 22px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ color: "#E74C6F" }}><Icon name="shield" size={20} /></div>
          <div><div style={{ fontSize: 14, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>Admin Panel</div><div style={{ fontSize: 12, color: TEXT_MID }}>Manage applications, users, events, projects, equipment, knowledge base and newsletter.</div></div>
        </div>

        {actionMessage && <div style={{ padding: "12px 18px", borderRadius: 10, background: actionMessage.type === "success" ? "#E6F9F5" : "#FDECF1", border: `1px solid ${actionMessage.type === "success" ? "#A3E4D7" : "#F9C3CE"}`, color: actionMessage.type === "success" ? "#0D9373" : "#D63563", fontSize: 13, fontWeight: 500 }}>{actionMessage.text}</div>}

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 4, background: "#F3F5F8", borderRadius: 12, padding: 4, flexWrap: "wrap" as const }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 9, border: "none", background: tab === t.id ? CARD : "transparent", color: tab === t.id ? TEXT : TEXT_LIGHT, fontSize: 13, fontWeight: tab === t.id ? 700 : 500, cursor: "pointer", boxShadow: tab === t.id ? SHADOW : "none", transition: "all 0.15s ease" }}>
              <Icon name={t.icon} size={15} />{t.label}
              {t.badge != null && <span style={{ background: "#E74C6F", color: "#fff", borderRadius: 20, fontSize: 10, fontWeight: 700, padding: "1px 7px" }}>{t.badge}</span>}
            </button>
          ))}
        </div>

        {/* ── Applications ── */}
        {tab === "applications" && (
          <>
            <div style={{ display: "flex", gap: 8 }}>
              {(["pending", "approved", "declined", "all"] as const).map(s => (<button key={s} onClick={() => setAppFilter(s)} style={{ padding: "6px 16px", borderRadius: 20, border: `1.5px solid ${appFilter === s ? (s === "pending" ? "#F0A500" : s === "approved" ? TEAL : s === "declined" ? "#E74C6F" : BORDER) : BORDER}`, background: appFilter === s ? (s === "pending" ? "#FFF8E6" : s === "approved" ? TEAL_LIGHT : s === "declined" ? "#FDECF1" : "#F3F5F8") : CARD, color: appFilter === s ? (s === "pending" ? "#C48700" : s === "approved" ? TEAL_DARK : s === "declined" ? "#D63563" : TEXT_MID) : TEXT_LIGHT, fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" as const }}>{s}</button>))}
            </div>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: SHADOW }}>
              <div style={{ padding: "16px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>{appFilter === "all" ? "All" : appFilter.charAt(0).toUpperCase() + appFilter.slice(1)} Applications</h3>
                <span style={{ fontSize: 12, color: TEXT_LIGHT }}>{applications.length} total</span>
              </div>
              {loadingApps ? <div style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT, fontSize: 14 }}>Loading…</div>
                : applications.length === 0 ? <div style={{ padding: 48, textAlign: "center" }}><div style={{ color: "#E8EDF3", marginBottom: 12 }}><Icon name="inbox" size={48} /></div><div style={{ fontSize: 15, fontWeight: 600, color: TEXT_MID, fontFamily: "'Sora', sans-serif" }}>No {appFilter} applications</div></div>
                : applications.map((app, i) => {
                  const sc = app.application_status === "approved" ? TEAL : app.application_status === "declined" ? "#E74C6F" : "#F0A500";
                  const sb = app.application_status === "approved" ? TEAL_LIGHT : app.application_status === "declined" ? "#FDECF1" : "#FFF8E6";
                  return (<div key={app.id} onClick={() => setSelectedApp(app)} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 140px 120px 80px", padding: "16px 24px", borderBottom: i < applications.length - 1 ? `1px solid ${BORDER}` : "none", alignItems: "center", cursor: "pointer", transition: "background 0.15s" }} onMouseEnter={e => (e.currentTarget.style.background = "#FAFBFC")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <div><div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{app.full_name || "—"}</div><div style={{ fontSize: 12, color: TEXT_LIGHT, marginTop: 1 }}>{app.email}</div></div>
                    <div><div style={{ fontSize: 13, color: TEXT }}>{app.organisation_name || "—"}</div><div style={{ fontSize: 12, color: TEXT_LIGHT, marginTop: 1 }}>{app.organisation_type ? ORG_TYPE_LABELS[app.organisation_type] : "—"}</div></div>
                    <div style={{ fontSize: 12, color: TEXT_LIGHT }}>{[app.city, app.country].filter(Boolean).join(", ") || "—"}</div>
                    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 700, background: sb, color: sc, textTransform: "capitalize" as const, width: "fit-content" }}>{app.application_status}</span>
                    <div style={{ color: TEXT_LIGHT, display: "flex", justifyContent: "flex-end" }}><Icon name="chevronRight" size={16} /></div>
                  </div>);
                })}
            </div>
          </>
        )}

        {/* ── Users ── */}
        {tab === "users" && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: SHADOW }}>
            <div style={{ padding: "16px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>All Users</h3>
              <span style={{ fontSize: 12, color: TEXT_LIGHT }}>{users.length} users</span>
            </div>
            {loadingUsers ? <div style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT, fontSize: 14 }}>Loading…</div>
              : users.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT, fontSize: 14 }}>No users found.</div>
              : (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 200px", padding: "12px 24px", background: "#FAFBFC", borderBottom: `1px solid ${BORDER}`, fontSize: 11, color: TEXT_LIGHT, textTransform: "uppercase" as const, letterSpacing: "0.07em", fontWeight: 700 }}>
                    <span>Email</span><span>Name</span><span>Organisation</span><span>Partnership Level</span>
                  </div>
                  {users.map((u, i) => {
                    const lbl = PARTNERSHIP_LABELS[u.partnership_level] || PARTNERSHIP_LABELS.viewer;
                    return (
                      <div key={u.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 200px", padding: "16px 24px", borderBottom: i < users.length - 1 ? `1px solid ${BORDER}` : "none", alignItems: "center" }}>
                        <span style={{ fontSize: 13, color: TEXT, fontWeight: 500 }}>{u.email}</span>
                        <span style={{ fontSize: 13, color: TEXT_MID }}>{u.full_name || "—"}</span>
                        {/* Organisation affiliation dropdown */}
                        <select
                          value={u.organisation_id || ""}
                          onChange={e => updateUserOrg(u.id, e.target.value || null)}
                          style={{ padding: "6px 10px", borderRadius: 8, border: `1.5px solid ${BORDER}`, fontSize: 12, cursor: "pointer", outline: "none", maxWidth: 180, color: TEXT_MID }}
                        >
                          <option value="">No organisation</option>
                          {allOrgs.map(org => (
                            <option key={org.id} value={org.id}>{org.name}</option>
                          ))}
                        </select>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <select value={u.partnership_level} onChange={e => updateLevel(u.id, e.target.value as PartnershipLevel)} disabled={saving === u.id} style={{ padding: "6px 10px", borderRadius: 8, border: `1.5px solid ${lbl.color}30`, background: lbl.bg, color: lbl.color, fontSize: 12, fontWeight: 700, cursor: "pointer", outline: "none", opacity: saving === u.id ? 0.6 : 1 }}>
                            <option value="viewer">Viewer</option><option value="member">Member</option><option value="partner">Partner</option><option value="admin">Admin</option>
                          </select>
                          {saving === u.id && <span style={{ fontSize: 11, color: TEXT_LIGHT }}>Saving…</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        )}

        {/* ── Events ── */}
        {tab === "events" && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: SHADOW }}>
            <div style={{ padding: "16px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>Events</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, color: TEXT_LIGHT }}>{adminEvents.length} total</span>
                <button onClick={() => setEventModal({ open: true, event: null })} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}><Icon name="plus" size={14} /> Add Event</button>
              </div>
            </div>
            {loadingEvents ? <div style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT, fontSize: 14 }}>Loading…</div>
              : adminEvents.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT, fontSize: 14 }}>No events yet.</div>
              : (<div>
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 100px 140px 100px 90px", padding: "12px 24px", background: "#FAFBFC", borderBottom: `1px solid ${BORDER}`, fontSize: 11, color: TEXT_LIGHT, textTransform: "uppercase" as const, letterSpacing: "0.07em", fontWeight: 700 }}><span>Title</span><span>Date</span><span>Location</span><span>Type</span><span>Actions</span></div>
                {adminEvents.map((e, i) => (
                  <div key={e.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 100px 140px 100px 90px", padding: "14px 24px", borderBottom: i < adminEvents.length - 1 ? `1px solid ${BORDER}` : "none", alignItems: "center" }}>
                    <div><div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{e.title}</div>{!e.is_approved && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "#FFF8E6", color: "#C48700", fontWeight: 700 }}>Pending</span>}</div>
                    <span style={{ fontSize: 12, color: TEXT_MID }}>{e.event_date}</span>
                    <span style={{ fontSize: 12, color: TEXT_LIGHT }}>{e.location}</span>
                    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: e.event_type === "national" ? TEAL_LIGHT : "#F3F5F8", color: e.event_type === "national" ? TEAL_DARK : TEXT_LIGHT, fontWeight: 700, textTransform: "capitalize" as const, width: "fit-content" }}>{e.event_type}</span>
                    <div style={{ display: "flex", gap: 6 }}><button onClick={() => setEventModal({ open: true, event: e })} style={{ ...btnBase, background: "#F3F5F8", color: TEXT_MID }}><Icon name="edit" size={14} /></button><button onClick={() => { if (confirm("Delete this event?")) handleDeleteEvent(e.id!); }} style={{ ...btnBase, background: "#FDECF1", color: "#D63563" }}><Icon name="trash" size={14} /></button></div>
                  </div>
                ))}
              </div>)}
          </div>
        )}

        {/* ── Projects ── */}
        {tab === "projects" && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: SHADOW }}>
            <div style={{ padding: "16px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>Projects</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, color: TEXT_LIGHT }}>{adminProjects.length} total</span>
                <button onClick={() => setProjectModal({ open: true, project: null })} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}><Icon name="plus" size={14} /> Add Project</button>
              </div>
            </div>
            {loadingProjects ? <div style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT, fontSize: 14 }}>Loading…</div>
              : adminProjects.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT, fontSize: 14 }}>No projects yet.</div>
              : (<div>
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 100px 140px 90px", padding: "12px 24px", background: "#FAFBFC", borderBottom: `1px solid ${BORDER}`, fontSize: 11, color: TEXT_LIGHT, textTransform: "uppercase" as const, letterSpacing: "0.07em", fontWeight: 700 }}><span>Name</span><span>Pillar</span><span>Phase</span><span>Progress</span><span>Actions</span></div>
                {adminProjects.map((p, i) => (
                  <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 100px 140px 90px", padding: "14px 24px", borderBottom: i < adminProjects.length - 1 ? `1px solid ${BORDER}` : "none", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: p.color, flexShrink: 0 }} /><div><div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{p.name}</div><div style={{ fontSize: 11, color: TEXT_LIGHT }}>{p.lead}</div></div></div>
                    <span style={{ fontSize: 11, color: TEXT_MID }}>{p.pillar.split(" ").slice(0, 2).join(" ")}…</span>
                    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: `${p.color}12`, color: p.color, fontWeight: 700, width: "fit-content" }}>{p.phase}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ flex: 1, height: 5, borderRadius: 3, background: `${p.color}14` }}><div style={{ width: `${p.progress}%`, height: "100%", borderRadius: 3, background: p.color }} /></div><span style={{ fontSize: 11, color: TEXT_MID, fontWeight: 600, width: 30 }}>{p.progress}%</span></div>
                    <div style={{ display: "flex", gap: 6 }}><button onClick={() => setProjectModal({ open: true, project: p })} style={{ ...btnBase, background: "#F3F5F8", color: TEXT_MID }}><Icon name="edit" size={14} /></button><button onClick={() => { if (confirm("Delete this project?")) handleDeleteProject(p.id!); }} style={{ ...btnBase, background: "#FDECF1", color: "#D63563" }}><Icon name="trash" size={14} /></button></div>
                  </div>
                ))}
              </div>)}
          </div>
        )}

        {/* ── Equipment ── */}
        {tab === "equipment" && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: SHADOW }}>
            <div style={{ padding: "16px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>Equipment Proposals</h3>
              <span style={{ fontSize: 12, color: TEXT_LIGHT }}>{proposals.length} total · {pendingProposals} pending</span>
            </div>
            {loadingProposals ? <div style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT, fontSize: 14 }}>Loading…</div>
              : proposals.length === 0 ? (<div style={{ padding: 48, textAlign: "center" }}><div style={{ color: "#E8EDF3", marginBottom: 12 }}><Icon name="cpu" size={48} /></div><div style={{ fontSize: 15, fontWeight: 600, color: TEXT_MID, fontFamily: "'Sora', sans-serif" }}>No equipment proposals yet</div></div>)
              : (<div>
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 100px 120px 160px", padding: "12px 24px", background: "#FAFBFC", borderBottom: `1px solid ${BORDER}`, fontSize: 11, color: TEXT_LIGHT, textTransform: "uppercase" as const, letterSpacing: "0.07em", fontWeight: 700 }}><span>Equipment</span><span>Location</span><span>Category</span><span>Status</span><span>Actions</span></div>
                {proposals.map((p, i) => {
                  const isPending = p.status === "pending"; const isApproved = p.status === "approved";
                  const statusColor = isApproved ? "#0D9373" : isPending ? "#C48700" : "#D63563";
                  const statusBg = isApproved ? "#E6F9F5" : isPending ? "#FFF8E6" : "#FDECF1";
                  return (
                    <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 100px 120px 160px", padding: "16px 24px", borderBottom: i < proposals.length - 1 ? `1px solid ${BORDER}` : "none", alignItems: "center" }}>
                      <div><div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{p.name}</div>{p.proposed_by_name && <div style={{ fontSize: 11, color: TEXT_LIGHT, marginTop: 2 }}>By {p.proposed_by_name}</div>}</div>
                      <span style={{ fontSize: 12, color: TEXT_MID }}>{p.location}</span>
                      <span style={{ fontSize: 11, color: TEXT_LIGHT }}>{p.category || "—"}</span>
                      <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: statusBg, color: statusColor, fontWeight: 700, textTransform: "capitalize" as const, width: "fit-content" }}>{p.status}</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        {isPending && (<><button onClick={() => handleReviewProposal(p.id, "approved")} disabled={reviewingProposal === p.id} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#E6F9F5", color: "#0D9373", fontSize: 11, fontWeight: 700, cursor: "pointer", opacity: reviewingProposal === p.id ? 0.6 : 1 }}>✓ Approve</button><button onClick={() => handleReviewProposal(p.id, "rejected")} disabled={reviewingProposal === p.id} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#FDECF1", color: "#D63563", fontSize: 11, fontWeight: 700, cursor: "pointer", opacity: reviewingProposal === p.id ? 0.6 : 1 }}>✗ Reject</button></>)}
                        {!isPending && <button onClick={() => { if (confirm("Delete?")) handleDeleteProposal(p.id); }} style={{ ...btnBase, background: "#FDECF1", color: "#D63563" }}><Icon name="trash" size={14} /></button>}
                      </div>
                    </div>
                  );
                })}
              </div>)}
          </div>
        )}

        {/* ── Knowledge Documents (approved) ── */}
        {tab === "knowledge" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: SHADOW }}>
              <div style={{ padding: "16px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>Knowledge Documents</h3>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 12, color: TEXT_LIGHT }}>{knowledgeDocs.length} total</span>
                  <button onClick={() => setAddingKnowledgeDoc(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}><Icon name="plus" size={14} /> Add Document</button>
                </div>
              </div>
              <div style={{ padding: "12px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                {["All", ...KNOWLEDGE_CATEGORIES.map(c => c.name)].map(cat => (
                  <button key={cat} onClick={() => setKnowledgeFilter(cat)} style={{ padding: "5px 12px", borderRadius: 20, border: `1.5px solid ${knowledgeFilter === cat ? TEAL : BORDER}`, background: knowledgeFilter === cat ? TEAL_LIGHT : CARD, color: knowledgeFilter === cat ? TEAL_DARK : TEXT_MID, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{cat}</button>
                ))}
              </div>
              {addingKnowledgeDoc && (
                <div style={{ padding: "20px 24px", borderBottom: `1px solid ${BORDER}`, background: "#FAFBFC", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 4 }}>Add New Document</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><label style={modalLabelStyle}>Title *</label><input value={newKnowledgeDoc.title} onChange={e => setNewKnowledgeDoc(p => ({ ...p, title: e.target.value }))} placeholder="Document title" style={modalInputStyle} /></div>
                    <div><label style={modalLabelStyle}>Category</label><select value={newKnowledgeDoc.category} onChange={e => setNewKnowledgeDoc(p => ({ ...p, category: e.target.value }))} style={modalInputStyle}>{KNOWLEDGE_CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}</select></div>
                  </div>
                  <div><label style={modalLabelStyle}>Description</label><input value={newKnowledgeDoc.description} onChange={e => setNewKnowledgeDoc(p => ({ ...p, description: e.target.value }))} placeholder="Brief description" style={modalInputStyle} /></div>
                  <div><label style={modalLabelStyle}>URL</label><input value={newKnowledgeDoc.url} onChange={e => setNewKnowledgeDoc(p => ({ ...p, url: e.target.value }))} placeholder="https://drive.google.com/…" style={modalInputStyle} /></div>
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button onClick={() => { setAddingKnowledgeDoc(false); setNewKnowledgeDoc({ title: "", description: "", url: "", category: KNOWLEDGE_CATEGORIES[0].name }); }} style={{ padding: "8px 16px", borderRadius: 10, border: `1.5px solid ${BORDER}`, background: CARD, color: TEXT_MID, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                    <button onClick={handleAddKnowledgeDoc} disabled={savingKnowledgeDoc || !newKnowledgeDoc.title.trim()} style={{ padding: "8px 18px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: savingKnowledgeDoc ? "default" : "pointer", opacity: savingKnowledgeDoc ? 0.7 : 1 }}>{savingKnowledgeDoc ? "Adding…" : "Add Document"}</button>
                  </div>
                </div>
              )}
              {loadingKnowledge ? <div style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT, fontSize: 14 }}>Loading…</div>
                : filteredKnowledgeDocs.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT, fontSize: 14 }}>No documents{knowledgeFilter !== "All" ? ` in ${knowledgeFilter}` : ""} yet.</div>
                : (<div>
                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 80px", padding: "12px 24px", background: "#FAFBFC", borderBottom: `1px solid ${BORDER}`, fontSize: 11, color: TEXT_LIGHT, textTransform: "uppercase" as const, letterSpacing: "0.07em", fontWeight: 700 }}><span>Title</span><span>Category</span><span>URL</span><span>Actions</span></div>
                  {filteredKnowledgeDocs.map((d, i) => (
                    <div key={d.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 80px", padding: "14px 24px", borderBottom: i < filteredKnowledgeDocs.length - 1 ? `1px solid ${BORDER}` : "none", alignItems: "center" }}>
                      <div><div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{d.title}</div>{d.description && <div style={{ fontSize: 11, color: TEXT_LIGHT, marginTop: 2 }}>{d.description.slice(0, 50)}{d.description.length > 50 ? "…" : ""}</div>}</div>
                      <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: TEAL_LIGHT, color: TEAL_DARK, fontWeight: 700, width: "fit-content" }}>{d.category}</span>
                      <span>{d.url ? <a href={d.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: TEAL_DARK, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}><Icon name="link" size={13} /> Open</a> : <span style={{ fontSize: 12, color: TEXT_LIGHT }}>No URL</span>}</span>
                      <button onClick={() => handleDeleteKnowledgeDoc(d.id)} style={{ ...btnBase, background: "#FDECF1", color: "#D63563" }}><Icon name="trash" size={14} /></button>
                    </div>
                  ))}
                </div>)}
            </div>
          </div>
        )}

        {/* ── Pending Document Proposals ── */}
        {tab === "pending_docs" && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: SHADOW }}>
            <div style={{ padding: "16px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>Pending Document Proposals</h3>
              <span style={{ fontSize: 12, color: TEXT_LIGHT }}>{pendingDocs.length} pending</span>
            </div>
            {loadingPendingDocs ? <div style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT, fontSize: 14 }}>Loading…</div>
              : pendingDocs.length === 0 ? (
                <div style={{ padding: 48, textAlign: "center" }}>
                  <div style={{ color: "#E8EDF3", marginBottom: 12 }}><Icon name="book" size={48} /></div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: TEXT_MID, fontFamily: "'Sora', sans-serif" }}>No pending proposals</div>
                  <div style={{ fontSize: 13, color: TEXT_LIGHT, marginTop: 4 }}>Members and partners can propose documents from the Knowledge Base section.</div>
                </div>
              ) : (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 160px", padding: "12px 24px", background: "#FAFBFC", borderBottom: `1px solid ${BORDER}`, fontSize: 11, color: TEXT_LIGHT, textTransform: "uppercase" as const, letterSpacing: "0.07em", fontWeight: 700 }}>
                    <span>Document</span><span>Category</span><span>Proposed By</span><span>Actions</span>
                  </div>
                  {pendingDocs.map((doc, i) => (
                    <div key={doc.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 160px", padding: "16px 24px", borderBottom: i < pendingDocs.length - 1 ? `1px solid ${BORDER}` : "none", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{doc.title}</div>
                        {doc.description && <div style={{ fontSize: 11, color: TEXT_LIGHT, marginTop: 2 }}>{doc.description}</div>}
                        {doc.url && <a href={doc.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: TEAL_DARK, textDecoration: "none" }}>View link →</a>}
                      </div>
                      <span style={{ fontSize: 12, color: TEXT_MID }}>{doc.category}</span>
                      <span style={{ fontSize: 12, color: TEXT_LIGHT }}>{doc.proposed_by_name || "Unknown"}</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => handleApproveDoc(doc.id)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#E6F9F5", color: "#0D9373", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✓ Approve</button>
                        <button onClick={() => handleRejectDoc(doc.id)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#FDECF1", color: "#D63563", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✗ Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}

        {/* ── Newsletter ── */}
        {tab === "coins" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: SHADOW }}>
              <div style={{ padding: "16px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>Member Coin Balances</h3>
                <span style={{ fontSize: 12, color: TEXT_LIGHT }}>{allCoinBalances.length} members</span>
              </div>
              {loadingCoins ? <div style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT, fontSize: 14 }}>Loading…</div>
                : allCoinBalances.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT, fontSize: 14 }}>No coin balances yet.</div>
                : (<div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 100px 120px 140px", padding: "12px 24px", background: "#FAFBFC", borderBottom: `1px solid ${BORDER}`, fontSize: 11, color: TEXT_LIGHT, textTransform: "uppercase" as const, letterSpacing: "0.07em", fontWeight: 700 }}>
                    <span>Email</span><span>Name</span><span>Balance</span><span>Lifetime</span><span>Tier</span><span>Top Up</span>
                  </div>
                  {allCoinBalances.map((cb, i) => {
                    const tier = getCoinTier(cb.lifetime_earned);
                    return (
                      <div key={cb.user_id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 100px 120px 140px", padding: "14px 24px", borderBottom: i < allCoinBalances.length - 1 ? `1px solid ${BORDER}` : "none", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: TEXT }}>{cb.profiles?.email}</span>
                        <span style={{ fontSize: 12, color: TEXT_MID }}>{cb.profiles?.full_name || "—"}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: cb.balance <= 0 ? "#E74C6F" : TEXT }}>{cb.balance}</span>
                        <span style={{ fontSize: 12, color: TEXT_LIGHT }}>{cb.lifetime_earned}</span>
                        <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: tier.bg, color: tier.color, fontWeight: 700, width: "fit-content" }}>{tier.badge} {cb.tier}</span>
                        <button
                          onClick={() => setCoinTopUp({ userId: cb.user_id, amount: "", reason: "" })}
                          style={{ padding: "5px 12px", borderRadius: 8, border: `1.5px solid ${TEAL}`, background: TEAL_LIGHT, color: TEAL_DARK, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                        >+ Add Coins</button>
                      </div>
                    );
                  })}
                </div>)}
            </div>
          </div>
        )}

        {/* Coin Top-Up Modal */}
        {coinTopUp && (
          <div style={{ position: "fixed", inset: 0, zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div onClick={() => setCoinTopUp(null)} style={{ position: "absolute", inset: 0, background: "rgba(26,35,50,0.5)", backdropFilter: "blur(4px)" }} />
            <div style={{ position: "relative", width: 400, background: CARD, borderRadius: 20, padding: 28, boxShadow: "0 24px 80px rgba(0,0,0,0.22)", display: "flex", flexDirection: "column", gap: 16, zIndex: 3001 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>Add Coins</div>
                <button onClick={() => setCoinTopUp(null)} style={{ background: "#F3F5F8", border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: TEXT_MID }}><Icon name="x" size={15} /></button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div><label style={modalLabelStyle}>Amount</label><input type="number" value={coinTopUp.amount} onChange={e => setCoinTopUp(p => p ? { ...p, amount: e.target.value } : p)} placeholder="e.g. 100" style={modalInputStyle} /></div>
                <div><label style={modalLabelStyle}>Reason</label><input value={coinTopUp.reason} onChange={e => setCoinTopUp(p => p ? { ...p, reason: e.target.value } : p)} placeholder="e.g. Manual top-up by admin" style={modalInputStyle} /></div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setCoinTopUp(null)} style={{ padding: "9px 18px", borderRadius: 10, border: `1.5px solid ${BORDER}`, background: CARD, color: TEXT_MID, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button
                  onClick={async () => {
                    if (!coinTopUp.amount || !coinTopUp.reason) return;
                    setSavingCoin(true);
                    try {
                      const res = await fetch("/api/coins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: coinTopUp.userId, amount: Number(coinTopUp.amount), reason: coinTopUp.reason, type: "admin" }) });
                      const data = await res.json();
                      if (res.ok) {
                        setAllCoinBalances(prev => prev.map(cb => cb.user_id === coinTopUp.userId ? { ...cb, balance: data.balance.balance, lifetime_earned: data.balance.lifetime_earned, tier: data.balance.tier } : cb));
                        setCoinTopUp(null);
                      }
                    } catch {} finally { setSavingCoin(false); }
                  }}
                  disabled={savingCoin || !coinTopUp.amount || !coinTopUp.reason}
                  style={{ padding: "9px 20px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: savingCoin ? "default" : "pointer", opacity: savingCoin ? 0.7 : 1 }}
                >{savingCoin ? "Saving…" : "Add Coins"}</button>
              </div>
            </div>
          </div>
        )}

        {tab === "redemptions" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: SHADOW }}>
              <div style={{ padding: "16px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>Coin Redemption Requests</h3>
                <span style={{ fontSize: 12, color: TEXT_LIGHT }}>{pendingRedemptions.filter(r => r.status === "pending").length} pending</span>
              </div>
              {loadingRedemptions ? (
                <div style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT, fontSize: 14 }}>Loading…</div>
              ) : pendingRedemptions.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT, fontSize: 14 }}>No redemption requests yet.</div>
              ) : (
                <div>
                  {pendingRedemptions.map((req, i) => {
                    const statusColors: Record<string, { bg: string; color: string }> = {
                      pending: { bg: "#FFF8E6", color: "#F0A500" },
                      actioned: { bg: "#E6F9F5", color: "#00B894" },
                      declined: { bg: "#FDECF1", color: "#E74C6F" },
                    };
                    const sc = statusColors[req.status] || statusColors.pending;
                    return (
                      <div key={req.id} style={{ padding: "18px 24px", borderBottom: i < pendingRedemptions.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 4 }}>{req.item_label}</div>
                            <div style={{ fontSize: 12, color: TEXT_LIGHT, marginBottom: 6 }}>
                              {req.user_name || req.user_email} · {new Date(req.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: sc.bg, color: sc.color, fontWeight: 700, textTransform: "capitalize" as const }}>{req.status}</span>
                              <span style={{ fontSize: 12, color: TEXT_LIGHT }}>🪙 {req.coins_spent} coins</span>
                            </div>
                            {req.admin_notes && <div style={{ fontSize: 12, color: TEXT_MID, marginTop: 6, fontStyle: "italic" }}>Note: {req.admin_notes}</div>}
                          </div>
                          {req.status === "pending" && (
                            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                              <button
                                onClick={async () => {
                                  const res = await fetch("/api/redemptions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: req.id, status: "actioned" }) });
                                  if (res.ok) setPendingRedemptions(prev => prev.map(r => r.id === req.id ? { ...r, status: "actioned" } : r));
                                }}
                                style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#E6F9F5", color: "#00B894", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                              >✓ Mark Actioned</button>
                              <button
                                onClick={async () => {
                                  const res = await fetch("/api/redemptions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: req.id, status: "declined" }) });
                                  if (res.ok) setPendingRedemptions(prev => prev.map(r => r.id === req.id ? { ...r, status: "declined" } : r));
                                }}
                                style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#FDECF1", color: "#E74C6F", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                              >✕ Decline</button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "newsletter" && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: SHADOW }}>
            <div style={{ padding: "16px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>Newsletter Subscribers</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, color: TEXT_LIGHT }}>{subscribers.length} subscribers</span>
                <button onClick={exportCSV} style={{ padding: "7px 16px", borderRadius: 10, border: `1.5px solid ${TEAL}`, background: TEAL_LIGHT, color: TEAL_DARK, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>↓ Export CSV</button>
              </div>
            </div>
            {loadingNewsletter ? <div style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT, fontSize: 14 }}>Loading…</div>
              : subscribers.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT, fontSize: 14 }}>No subscribers yet.</div>
              : (<div>
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 120px 120px", padding: "12px 24px", background: "#FAFBFC", borderBottom: `1px solid ${BORDER}`, fontSize: 11, color: TEXT_LIGHT, textTransform: "uppercase" as const, letterSpacing: "0.07em", fontWeight: 700 }}><span>Email</span><span>Name</span><span>Source</span><span>Date</span></div>
                {subscribers.map((s, i) => (
                  <div key={s.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 120px 120px", padding: "14px 24px", borderBottom: i < subscribers.length - 1 ? `1px solid ${BORDER}` : "none", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: TEXT, fontWeight: 500 }}>{s.email}</span>
                    <span style={{ fontSize: 13, color: TEXT_MID }}>{s.full_name || "—"}</span>
                    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: TEAL_LIGHT, color: TEAL_DARK, fontWeight: 700, width: "fit-content" }}>{s.source}</span>
                    <span style={{ fontSize: 12, color: TEXT_LIGHT }}>{new Date(s.subscribed_at).toLocaleDateString("en-GB")}</span>
                  </div>
                ))}
              </div>)}
          </div>
        )}
      </div>
    </>
  );
}



// ─── REWARDS VIEW ─────────────────────────────────────────────────────────────
function RewardsView({ coinBalance, currentUserId, userEmail, userName, onRedeem }: {
  coinBalance: CoinBalance | null;
  currentUserId: string;
  userEmail: string;
  userName?: string;
  onRedeem: (item: typeof REDEMPTION_CATALOGUE[0], newBalance: number) => void;
}) {
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [confirmItem, setConfirmItem] = useState<typeof REDEMPTION_CATALOGUE[0] | null>(null);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);

  useEffect(() => {
    if (!currentUserId) return;
    fetch(`/api/coins?userId=${currentUserId}`)
      .then(r => r.json())
      .then(d => { setTransactions(d.transactions || []); setLoadingTx(false); })
      .catch(() => setLoadingTx(false));
  }, [currentUserId]);

  const handleRedeem = async (item: typeof REDEMPTION_CATALOGUE[0]) => {
    if (!coinBalance || coinBalance.balance < item.cost) return;
    setRedeeming(item.id);
    try {
      const res = await fetch("/api/coins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, amount: -item.cost, reason: `Redeemed: ${item.label}`, type: "spend" }),
      });
      const data = await res.json();
      if (res.ok) {
        setTransactions(prev => [{ id: Date.now().toString(), amount: -item.cost, reason: `Redeemed: ${item.label}`, type: "spend", created_at: new Date().toISOString() }, ...prev]);
        onRedeem(item, data.balance.balance);
        setConfirmItem(null);
        // Log redemption request for admin
        await fetch("/api/redemptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUserId, userEmail, userName, itemId: item.id, itemLabel: item.label, coinsSpent: item.cost }),
        });
      }
    } catch (e) { console.error(e); }
    finally { setRedeeming(null); }
  };

  const tier = coinBalance ? getCoinTier(coinBalance.lifetime_earned) : COIN_TIERS[3];
  const balance = coinBalance?.balance ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Balance card */}
      <div style={{ background: "linear-gradient(135deg, #1A2332, #2C3E50)", borderRadius: 20, padding: "28px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontSize: 13, color: "#8896A6", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em" }}>Your Coin Balance</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 48, fontWeight: 800, color: "#fff", fontFamily: "'Sora', sans-serif", lineHeight: 1 }}>{balance}</span>
            <span style={{ fontSize: 24 }}>🪙</span>
          </div>
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, padding: "3px 12px", borderRadius: 20, background: tier.bg, color: tier.color, fontWeight: 700 }}>{tier.badge} {tier.name}</span>
            <span style={{ fontSize: 12, color: "#8896A6" }}>· {coinBalance?.lifetime_earned ?? 0} lifetime coins</span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "#8896A6", marginBottom: 8 }}>Next tier</div>
          {tier.name !== "Catalyst" && (() => {
            const nextTier = COIN_TIERS[COIN_TIERS.findIndex(t => t.name === tier.name) - 1];
            const progress = nextTier ? Math.min(100, ((coinBalance?.lifetime_earned ?? 0) / nextTier.min) * 100) : 100;
            return (
              <div>
                <div style={{ fontSize: 12, color: nextTier?.color, fontWeight: 700, marginBottom: 6 }}>{nextTier?.name} ({nextTier?.min} coins)</div>
                <div style={{ width: 160, height: 6, borderRadius: 6, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                  <div style={{ width: `${progress}%`, height: "100%", background: nextTier?.color, borderRadius: 6, transition: "width 0.5s ease" }} />
                </div>
                <div style={{ fontSize: 11, color: "#8896A6", marginTop: 4 }}>{nextTier ? nextTier.min - (coinBalance?.lifetime_earned ?? 0) : 0} coins to go</div>
              </div>
            );
          })()}
          {tier.name === "Catalyst" && <div style={{ fontSize: 13, color: "#F0A500", fontWeight: 700 }}>🏆 Maximum tier reached!</div>}
        </div>
      </div>

      {/* Redemption catalogue */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif", marginBottom: 16 }}>Redeem Your Coins</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          {REDEMPTION_CATALOGUE.map(item => {
            const canAfford = balance >= item.cost;
            return (
              <div key={item.id} style={{ background: CARD, border: `1px solid ${canAfford ? BORDER : "#F3F5F8"}`, borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 12, boxShadow: SHADOW, opacity: canAfford ? 1 : 0.65 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: item.bg, color: item.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon name={item.icon} size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif", lineHeight: 1.3 }}>{item.label}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                      <span style={{ fontSize: 13 }}>🪙</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.cost} coins</span>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: TEXT_LIGHT, lineHeight: 1.55 }}>{item.description}</div>
                <button
                  onClick={() => canAfford && setConfirmItem(item)}
                  disabled={!canAfford || redeeming === item.id}
                  style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: canAfford ? `linear-gradient(135deg, ${item.color}, ${item.color}CC)` : "#E8EDF3", color: canAfford ? "#fff" : TEXT_LIGHT, fontSize: 13, fontWeight: 700, cursor: canAfford ? "pointer" : "not-allowed", fontFamily: "'DM Sans', sans-serif" }}
                >
                  {!canAfford ? `Need ${item.cost - balance} more coins` : redeeming === item.id ? "Processing…" : "Redeem"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transaction history */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif", marginBottom: 16 }}>Transaction History</div>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: SHADOW }}>
          {loadingTx ? (
            <div style={{ padding: 32, textAlign: "center", color: TEXT_LIGHT, fontSize: 14 }}>Loading…</div>
          ) : transactions.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: TEXT_LIGHT, fontSize: 14 }}>No transactions yet.</div>
          ) : (
            transactions.map((tx, i) => (
              <div key={tx.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: i < transactions.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: tx.amount > 0 ? "#E6F9F5" : "#FDECF1", color: tx.amount > 0 ? "#00B894" : "#E74C6F", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>
                    {tx.amount > 0 ? "+" : "−"}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{tx.reason}</div>
                    <div style={{ fontSize: 11, color: TEXT_LIGHT, marginTop: 2 }}>{new Date(tx.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: tx.amount > 0 ? "#00B894" : "#E74C6F" }}>
                  {tx.amount > 0 ? "+" : ""}{tx.amount} 🪙
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Confirmation modal */}
      {confirmItem && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={() => setConfirmItem(null)} style={{ position: "absolute", inset: 0, background: "rgba(26,35,50,0.5)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "relative", width: 440, background: CARD, borderRadius: 20, padding: 28, boxShadow: "0 24px 80px rgba(0,0,0,0.22)", display: "flex", flexDirection: "column", gap: 16, zIndex: 501 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>Confirm Redemption</div>
            <div style={{ background: "#FAFBFC", border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 8 }}>{confirmItem.label}</div>
              <div style={{ fontSize: 13, color: TEXT_LIGHT, lineHeight: 1.55, marginBottom: 12 }}>{confirmItem.description}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 16 }}>🪙</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: confirmItem.color }}>{confirmItem.cost} coins</span>
                <span style={{ fontSize: 13, color: TEXT_LIGHT }}>· Remaining: {balance - confirmItem.cost}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmItem(null)} style={{ padding: "10px 18px", borderRadius: 10, border: `1.5px solid ${BORDER}`, background: CARD, color: TEXT_MID, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button
                onClick={() => handleRedeem(confirmItem)}
                disabled={redeeming === confirmItem.id}
                style={{ padding: "10px 22px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${confirmItem.color}, ${confirmItem.color}CC)`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              >{redeeming === confirmItem.id ? "Processing…" : "Confirm & Redeem"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionWrapper({ sectionId, sectionName, partnershipLevel, children }: { sectionId: string; sectionName: string; partnershipLevel: PartnershipLevel; children: React.ReactNode }) {
  const lockedEntry = LOCKED_SECTIONS[partnershipLevel]?.find(s => s.id === sectionId);
  if (lockedEntry) {
    return (
      <div style={{ position: "relative", minHeight: 300 }}>
        <div style={{ filter: "blur(6px)", pointerEvents: "none", userSelect: "none" as const, opacity: 0.4 }}>{children}</div>
        <LockedOverlay requiredLevel={lockedEntry.requiredLevel} sectionName={sectionName} />
      </div>
    );
  }
  return <>{children}</>;
}

export interface PortalUser { email: string; sub: string; full_name?: string; partnership_level: PartnershipLevel; initials?: string; display_name?: string; }

export default function BioERGOtechPortal({ user }: { user: PortalUser }) {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<Organisation[]>([]);
  // CHANGE 4: Pure DB count — no STATIC_EQUIPMENT offset
  const [approvedEquipmentCount, setApprovedEquipmentCount] = useState(0);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [addingProject, setAddingProject] = useState(false);
  const [coinBalance, setCoinBalance] = useState<CoinBalance | null>(null);
  const [coinToast, setCoinToast] = useState<{ amount: number; reason: string } | null>(null);

  const fetchCoinBalance = () => {
    fetch(`/api/coins?userId=${user.sub}`).then(r => r.json()).then(d => { if (d.balance) setCoinBalance(d.balance); }).catch(() => {});
  };
  const showCoinToast = (amount: number, reason: string) => {
    setCoinToast({ amount, reason });
    setTimeout(() => setCoinToast(null), 5000);
  };
  const fetchProjects = () => fetch("/api/projects").then(r => r.json()).then(d => setProjects(d.projects || []));
  const fetchEvents = () => fetch("/api/events").then(r => r.json()).then(d => setEvents(d.events || []));

  useEffect(() => {
    fetchProjects(); fetchEvents();
    // Fetch coin balance
    fetchCoinBalance();
    fetch("/api/organisations").then(r => r.json()).then(d => setMembers(d.organisations || []));
    // Pure DB count — no static offset added
    fetch("/api/admin/equipment").then(r => r.json()).then(d => {
      const approved = (d.proposals || []).filter((p: EquipmentProposal) => p.status === "approved").length;
      setApprovedEquipmentCount(approved);
    }).catch(() => setApprovedEquipmentCount(0));
  }, []);

  const partnershipLevel = user.partnership_level;
  const isAdmin = partnershipLevel === "admin";
  const canCreateProjects = partnershipLevel === "partner" || partnershipLevel === "admin";
  const canManageAllProjects = partnershipLevel === "admin";
  const accessibleSections = PARTNERSHIP_ACCESS[partnershipLevel] || PARTNERSHIP_ACCESS.viewer;
  const levelInfo = PARTNERSHIP_LABELS[partnershipLevel] || PARTNERSHIP_LABELS.viewer;
  const sectionNames: Record<string, string> = { dashboard: "Dashboard", projects: "Project Tracker", lab: "Distributed Laboratory", events: "Events & Meetings", members: "Member Network", knowledge: "Knowledge Base", admin: "Admin Panel" };
  const visibleNav = navItems.filter(item => { if (item.id === "admin") return isAdmin; return true; });

  const handleSaveEventInline = async (event: Partial<Event>) => { const res = await fetch("/api/admin/events", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(event) }); if (res.ok) { fetchEvents(); setEditingEvent(null); } };
  const handleSaveProjectInline = async (project: Partial<Project>) => { const res = await fetch("/api/admin/projects", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(project) }); if (res.ok) { fetchProjects(); setEditingProject(null); } };

  // ─── renderContent ────────────────────────────────────────────────────────────
  const renderContent = () => {
    switch (activeNav) {
      case "dashboard":
        return (
          <DashboardView
            projects={projects}
            events={events}
            members={members}
            approvedEquipmentCount={approvedEquipmentCount}
            partnershipLevel={partnershipLevel}
            displayName={user.display_name || user.full_name || user.email}
            onQuickNavigate={(section) => setActiveNav(section)}
          />
        );

      case "projects":
        return (
          <SectionWrapper sectionId="projects" sectionName="Projects" partnershipLevel={partnershipLevel}>
            <>
              {editingProject && (
                <ProjectModal
                  project={editingProject}
                  onClose={() => setEditingProject(null)}
                  onSave={handleSaveProjectInline}
                />
              )}
              {addingProject && (
                <ProjectModal
                  project={null}
                  onClose={() => setAddingProject(false)}
                  onSave={async (project) => {
                    const res = await fetch("/api/projects", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ ...project, created_by: user.sub }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Failed to create project");
                    const projectName = data.project?.name || project.name || "your project";
                    setAddingProject(false);
                    fetchProjects();
                    // Small delay to let coin award complete server-side before fetching
                    setTimeout(() => {
                      fetchCoinBalance();
                      showCoinToast(40, `You earned 40 coins for adding "${projectName}" to the bioERGOtech project catalogue!`);
                    }, 1000);
                  }}
                />
              )}
              <ProjectsView
                projects={projects}
                isAdmin={isAdmin}
                canCreateProjects={canCreateProjects}
                currentUserId={user.sub}
                onAddProject={() => setAddingProject(true)}
                onEdit={(p) => setEditingProject(p)}
                onDelete={async (id) => {
                  // Find the project to check if current user is creator
                  const proj = projects.find(p => p.id === id);
                  await fetch("/api/admin/projects", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id }),
                  });
                  // Deduct coins if creator is deleting their own project
                  if (proj?.created_by === user.sub) {
                    await fetch("/api/coins", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ userId: user.sub, amount: -40, reason: `Project removed: "${proj.name}"`, type: "spend" }),
                    });
                    setTimeout(() => fetchCoinBalance(), 500);
                  }
                  fetchProjects();
                }}
                onSaveProjectDetails={async (payload) => {
                  const res = await fetch("/api/projects", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || "Failed to update project");
                  fetchProjects();
                }}
              />
            </>
          </SectionWrapper>
        );

      case "lab":
        return (
          <SectionWrapper sectionId="lab" sectionName="Distributed Lab" partnershipLevel={partnershipLevel}>
            <LabView userEmail={user.email} userName={user.display_name || user.full_name || user.email} isAdmin={isAdmin} />
          </SectionWrapper>
        );

      case "events":
        return (
          <SectionWrapper sectionId="events" sectionName="Events" partnershipLevel={partnershipLevel}>
            <>
              {editingEvent && (
                <EventModal event={editingEvent} onClose={() => setEditingEvent(null)} onSave={handleSaveEventInline} />
              )}
              <EventsView
                events={events}
                isAdmin={isAdmin}
                onEdit={(e) => setEditingEvent(e)}
                onDelete={async (id) => {
                  await fetch("/api/admin/events", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id }),
                  });
                  fetchEvents();
                }}
              />
            </>
          </SectionWrapper>
        );

      case "members":
        return (
          <SectionWrapper sectionId="members" sectionName="Members" partnershipLevel={partnershipLevel}>
            <MembersView members={members} isAdmin={isAdmin} />
          </SectionWrapper>
        );

      case "knowledge":
        return (
          <SectionWrapper sectionId="knowledge" sectionName="Knowledge Base" partnershipLevel={partnershipLevel}>
            <KnowledgeView
              isAdmin={isAdmin}
              currentUserId={user.sub}
              currentUserName={user.display_name || user.full_name || user.email}
            />
          </SectionWrapper>
        );

      case "rewards":
        return (
          <RewardsView
            coinBalance={coinBalance}
            currentUserId={user.sub}
            userEmail={user.email}
            userName={user.display_name || user.full_name}
            onRedeem={(item, newBalance) => {
              setCoinBalance(prev => prev ? { ...prev, balance: newBalance } : prev);
              setTimeout(() => showCoinToast(-item.cost, `${item.cost} coins spent on: "${item.label}"`), 300);
            }}
          />
        );

      case "admin":
        return isAdmin ? <AdminPanel onEventsChanged={fetchEvents} onProjectsChanged={fetchProjects} /> : null;

      default:
        return (
          <DashboardView
            projects={projects}
            events={events}
            members={members}
            approvedEquipmentCount={approvedEquipmentCount}
            partnershipLevel={partnershipLevel}
            displayName={user.display_name || user.full_name || user.email}
            onQuickNavigate={(section) => setActiveNav(section)}
          />
        );
    }
  }; // ← closes renderContent

  const isLocked = (sectionId: string) => !accessibleSections.includes(sectionId);

  // ─── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", height: "100vh", width: "100%", background: BG, fontFamily: "'DM Sans', sans-serif", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sora:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #D5DAE3; border-radius: 10px; }
        ::placeholder { color: #A8B5C4; }
        button:hover { filter: brightness(0.97); }
        @media (max-width: 768px) {
          .portal-sidebar { display: none !important; }
          .portal-main { margin-left: 0 !important; padding-bottom: 70px !important; }
          .portal-bottom-nav { display: flex !important; }
          .portal-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .portal-dashboard-grid { grid-template-columns: 1fr !important; }
          .portal-header { padding: 16px 16px !important; }
          .portal-content { padding: 16px 16px !important; }
        }
        @media (min-width: 769px) {
          .portal-bottom-nav { display: none !important; }
        }
      `}</style>

      {/* ── Sidebar ── */}
<div className="portal-sidebar" style={{ width: collapsed ? 68 : 240, background: "#fff", borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", transition: "width 0.3s ease", flexShrink: 0, boxShadow: "1px 0 8px rgba(0,0,0,0.02)" }}>
  
  {/* Logo row — logo links home, arrow toggles collapse */}
  <div style={{ padding: collapsed ? "22px 14px" : "22px 22px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 12 }}>
    <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
      <img src="/assets/images/Logo/short_logo.webp" alt="bioERGOtech" style={{ width: 38, height: 38, objectFit: "contain", flexShrink: 0 }} />
      {!collapsed && (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>bio<span style={{ color: TEAL }}>ERGO</span>tech</div>
          <div style={{ fontSize: 10, color: TEXT_LIGHT, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontWeight: 600 }}>Member Portal</div>
        </div>
      )}
    </a>
    <button
      onClick={() => setCollapsed(!collapsed)}
      style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_LIGHT, padding: 4, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      <Icon name={collapsed ? "chevronRight" : "chevronLeft"} size={14} />
    </button>
  </div>

  <nav style={{ flex: 1, padding: "16px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
    {visibleNav.map(item => {
      const active = activeNav === item.id;
      const locked = isLocked(item.id);
      return (
        <button
          key={item.id}
          onClick={() => setActiveNav(item.id)}
          title={locked ? "Requires higher partnership level" : item.label}
          style={{ display: "flex", alignItems: "center", gap: 12, padding: collapsed ? "11px 14px" : "11px 16px", borderRadius: 12, border: "none", cursor: "pointer", background: active ? TEAL_LIGHT : "transparent", color: active ? TEAL_DARK : locked ? "#C5CED8" : TEXT_MID, fontSize: 13, fontWeight: active ? 700 : 500, transition: "all 0.15s ease", justifyContent: collapsed ? "center" : "flex-start", position: "relative" }}
        >
          {active && <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: 22, borderRadius: 2, background: TEAL }} />}
          <Icon name={item.icon} size={18} />
          {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
          {!collapsed && locked && <span style={{ color: "#C5CED8" }}><Icon name="lock" size={13} /></span>}
        </button>
      );
    })}
  </nav>

  <div style={{ padding: collapsed ? "16px 10px" : "16px 18px", borderTop: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", gap: 8 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>
        {user.initials || user.email.slice(0, 2).toUpperCase()}
      </div>
      {!collapsed && (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
            {user.display_name || user.full_name || user.email}
          </div>
          <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: levelInfo.bg, color: levelInfo.color, fontWeight: 700 }}>{levelInfo.label}</span>
          {coinBalance !== null && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
              <span style={{ fontSize: 11 }}>🪙</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: getCoinTier(coinBalance.lifetime_earned).color }}>{coinBalance.balance} coins</span>
              <span style={{ fontSize: 10, color: TEXT_LIGHT }}>· {coinBalance.tier}</span>
            </div>
          )}
        </div>
      )}
    </div>
    {!collapsed && (
      <a href="/auth/sign-out" style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, color: TEXT_LIGHT, fontSize: 12, textDecoration: "none" }}>
        <Icon name="logout" size={14} /> Sign out
      </a>
    )}
  </div>

</div>

      {/* ── Main content ── */}
      <div className="portal-main" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "16px 30px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 23, fontWeight: 800, color: TEXT, fontFamily: "'Sora', sans-serif" }}>{sectionNames[activeNav]}</h1>
            <p style={{ margin: "3px 0 0", fontSize: 13, color: TEXT_LIGHT }}>Fondazione bioERGOtech ETS · {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ padding: "7px 14px", borderRadius: 10, background: levelInfo.bg, border: `1px solid ${levelInfo.color}30`, display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="star" size={13} />
              <span style={{ fontSize: 12, fontWeight: 700, color: levelInfo.color }}>{levelInfo.label}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "#F3F5F8", border: `1px solid ${BORDER}`, borderRadius: 10 }}>
              <span style={{ color: TEXT_LIGHT }}><Icon name="search" size={14} /></span>
              <input placeholder="Quick search..." style={{ background: "transparent", border: "none", outline: "none", color: TEXT, width: 140, fontSize: 13 }} />
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "#F3F5F8", border: `1px solid ${BORDER}`, color: TEXT_LIGHT, cursor: "pointer", position: "relative" }}>
              <Icon name="bell" size={16} />
              <div style={{ position: "absolute", top: 8, right: 8, width: 7, height: 7, borderRadius: "50%", background: "#E74C6F", border: "2px solid #fff" }} />
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "26px 30px" }}>
          {renderContent()}
        </div>
      </div>


      {/* ── Mobile Bottom Navigation ── */}
      <div className="portal-bottom-nav" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200, background: "#fff", borderTop: `1px solid ${BORDER}`, padding: "8px 0", justifyContent: "space-around", alignItems: "center" }}>
        {[
          { id: "dashboard", icon: "grid", label: "Home" },
          { id: "projects", icon: "layers", label: "Projects" },
          { id: "lab", icon: "cpu", label: "Lab" },
          { id: "events", icon: "calendar", label: "Events" },
          { id: "members", icon: "users", label: "Members" },
          { id: "rewards", icon: "star", label: "Rewards" },
          ...(isAdmin ? [{ id: "admin", icon: "shield", label: "Admin" }] : []),
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveNav(item.id as typeof activeNav)}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "none", border: "none", cursor: "pointer", padding: "4px 8px", color: activeNav === item.id ? TEAL : TEXT_LIGHT, minWidth: 44 }}
          >
            <Icon name={item.icon} size={20} />
            <span style={{ fontSize: 9, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{item.label}</span>
          </button>
        ))}
      </div>

      {/* ── Coin Toast Notification ── */}
      {coinToast && (
        <div style={{
          position: "fixed",
          bottom: 28,
          right: 28,
          zIndex: 9999,
          background: "linear-gradient(135deg, #1A2332, #2C3E50)",
          color: "#fff",
          borderRadius: 16,
          padding: "16px 22px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.28)",
          display: "flex",
          alignItems: "flex-start",
          gap: 14,
          maxWidth: 360,
          animation: "fadeUp 0.3s ease both",
        }}>
          <div style={{ fontSize: 28, flexShrink: 0 }}>🎉</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, fontFamily: "'Sora', sans-serif" }}>
              +{coinToast.amount} coins earned!
            </div>
            <div style={{ fontSize: 13, color: "#B8C5D6", lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif" }}>
              {coinToast.reason}
            </div>
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11 }}>🪙</span>
              <span style={{ fontSize: 12, color: "#2EC4B6", fontWeight: 700 }}>
                {coinBalance ? `New balance: ${coinBalance.balance + coinToast.amount} coins` : "Check your coin balance"}
              </span>
            </div>
          </div>
          <button
            onClick={() => setCoinToast(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#8896A6", padding: 0, flexShrink: 0, fontSize: 16, lineHeight: 1 }}
          >✕</button>
        </div>
      )}
    </div>
  );
} // ← closes BioERGOtechPortal
