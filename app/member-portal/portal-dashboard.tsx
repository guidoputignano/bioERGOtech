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
const PROJECT_PHASES = ["Planning","Discovery","Development","Validation","Execution","Completed"];
const PROJECT_STATUSES = ["on-track","at-risk","blocked"];
const EVENT_TYPES = ["internal","national","international","online"];
const EQUIPMENT_CATEGORIES = ["Flow Cytometry","Sequencing","Imaging","Spectroscopy","Cell Culture","Electroporation","Organoid","PCR","Other"];

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

type Project = {
  id?: string;
  name: string;
  pillar: string;
  phase: string;
  status: string;
  lead: string;
  description: string;
  progress: number;
  color: string;
  is_public?: boolean;
  objectives?: string[];
  update_notes?: string | null;
  created_by?: string | null;
  updated_at?: string | null;
};
type Event = { id?: string; title: string; event_date: string; event_type: string; location: string; description?: string; video_link?: string; is_public?: boolean; is_approved?: boolean; };
type Organisation = { id?: string; name: string; org_type: string; location: string; };
type Subscriber = { id: string; email: string; full_name: string; source: string; subscribed_at: string; is_active: boolean; };
type EquipmentProposal = { id: string; name: string; category?: string; location: string; description?: string; proposed_by_email?: string; proposed_by_name?: string; status: string; admin_notes?: string; reviewed_at?: string; created_at: string; };

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
  { id: "admin", label: "Admin Panel", icon: "shield" },
];
const STATIC_EQUIPMENT = [
  { name: "Flow Cytometer BD FACSAria III", location: "Taranto Lab A", status: "available", utilization: 42 },
  { name: "CRISPR Electroporation System", location: "Zurich UZH", status: "booked", utilization: 78 },
  { name: "Raman Spectrometer", location: "Taranto Lab B", status: "available", utilization: 31 },
  { name: "Organoid Culture Station", location: "Zurich UZH", status: "maintenance", utilization: 65 },
  { name: "High-Throughput Sequencer", location: "Taranto Lab A", status: "available", utilization: 55 },
];

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
    star: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    chevronRight: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
    clock: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    x: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    inbox: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
    mail: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
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

// ─── EVENT MODAL ─────────────────────────────────────────────────────────────
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
type ProjectFormState = { name: string; pillar: string; phase: string; status: string; lead: string; description: string; progress: number; color: string; is_public: boolean; };
const EMPTY_PROJECT_FORM: ProjectFormState = { name: "", pillar: PROJECT_PILLARS[0], phase: "Planning", status: "on-track", lead: "", description: "", progress: 0, color: "#2EC4B6", is_public: true };

function ProjectModal({ project, onClose, onSave }: { project: Partial<Project> | null; onClose: () => void; onSave: (p: Partial<Project>) => Promise<void>; }) {
  const [form, setForm] = useState<ProjectFormState>(project ? { name: project.name || "", pillar: project.pillar || PROJECT_PILLARS[0], phase: project.phase || "Planning", status: project.status || "on-track", lead: project.lead || "", description: project.description || "", progress: project.progress ?? 0, color: project.color || "#2EC4B6", is_public: project.is_public ?? true } : { ...EMPTY_PROJECT_FORM });
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

// ─── PROPOSE EQUIPMENT MODAL ─────────────────────────────────────────────────
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

// ─── DASHBOARD VIEW — real counts from Supabase ───────────────────────────────
function DashboardView({ projects, events, members, approvedEquipmentCount }: { projects: Project[]; events: Event[]; members: Organisation[]; approvedEquipmentCount: number; }) {
  const stats = [
    { label: "Active Projects", value: projects.length, icon: "layers", color: TEAL, bg: TEAL_LIGHT },
    { label: "Member Organizations", value: members.length, icon: "users", color: "#7C5CFC", bg: "#F0EDFF" },
    { label: "Equipment Shared", value: approvedEquipmentCount, icon: "cpu", color: "#E74C6F", bg: "#FDECF1" },
    { label: "Upcoming Events", value: events.length, icon: "calendar", color: "#F0A500", bg: "#FFF8E6" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
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
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 20 }}>
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
            <div style={{ fontSize: 11, color: TEXT_LIGHT, marginTop: 4 }}>{h.count} organization{h.count > 1 ? "s" : ""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectDrawer({
  project,
  isAdmin,
  onClose,
  onSave,
}: {
  project: Project;
  isAdmin?: boolean;
  onClose: () => void;
  onSave: (payload: Partial<Project>) => Promise<void>;
}) {
  const [progress, setProgress] = useState(project.progress ?? 0);
  const [notes, setNotes] = useState(project.update_notes || "");
  const [objectives, setObjectives] = useState<string[]>(
    Array.isArray(project.objectives) ? project.objectives : []
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setProgress(project.progress ?? 0);
    setNotes(project.update_notes || "");
    setObjectives(Array.isArray(project.objectives) ? project.objectives : []);
    setMessage(null);
  }, [project]);

  const handleObjectiveChange = (index: number, value: string) => {
    setObjectives((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const handleAddObjective = () => {
    setObjectives((prev) => [...prev, ""]);
  };

  const handleRemoveObjective = (index: number) => {
    setObjectives((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerateObjectives = () => {
    setObjectives(generateProjectObjectives(project));
  };

  const handleSave = async () => {
    if (!project.id) return;
    setSaving(true);
    setMessage(null);

    try {
      await onSave({
        id: project.id,
        progress,
        update_notes: notes,
        objectives: objectives.filter((item) => item.trim() !== ""),
      });
      setMessage("Project updated successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update project.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 120, display: "flex" }}>
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(26,35,50,0.38)",
          backdropFilter: "blur(3px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: 560,
          background: CARD,
          boxShadow: "-6px 0 28px rgba(0,0,0,0.12)",
          display: "flex",
          flexDirection: "column",
          animation: "slideIn 0.25s ease both",
        }}
      >
        <div
          style={{
            padding: "22px 28px",
            borderBottom: `1px solid ${BORDER}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 4,
                  background: project.color || TEAL,
                  flexShrink: 0,
                }}
              />
              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 700,
                  color: TEXT,
                  fontFamily: "'Sora', sans-serif",
                }}
              >
                {project.name}
              </h2>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  padding: "4px 10px",
                  borderRadius: 20,
                  background: `${project.color || TEAL}12`,
                  color: project.color || TEAL,
                  fontWeight: 700,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {project.phase}
              </span>
              <StatusBadge status={project.status} />
            </div>

            <div
              style={{
                fontSize: 13,
                color: TEXT_LIGHT,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {project.pillar} · Lead: {project.lead}
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
              flexShrink: 0,
            }}
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 22,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: TEXT_LIGHT,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: 8,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Description
            </div>
            <div
              style={{
                fontSize: 14,
                color: TEXT_MID,
                lineHeight: 1.65,
                fontFamily: "'DM Sans', sans-serif",
                background: "#FAFBFC",
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: 16,
              }}
            >
              {project.description || "No description available."}
            </div>
          </div>

          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: TEXT_LIGHT,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Progress
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: project.color || TEAL,
                  fontFamily: "'Sora', sans-serif",
                }}
              >
                {progress}%
              </div>
            </div>

            {isAdmin ? (
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                style={{ width: "100%", accentColor: project.color || TEAL }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: 8,
                  borderRadius: 8,
                  background: `${project.color || TEAL}14`,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: "100%",
                    background: project.color || TEAL,
                  }}
                />
              </div>
            )}
          </div>

          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: TEXT_LIGHT,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Objectives
              </div>

              {isAdmin && (
                <button
                  onClick={handleGenerateObjectives}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: `1px solid ${TEAL_MUTED}`,
                    background: TEAL_LIGHT,
                    color: TEAL_DARK,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Generate Objectives
                </button>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {objectives.length === 0 && (
                <div
                  style={{
                    fontSize: 13,
                    color: TEXT_LIGHT,
                    fontFamily: "'DM Sans', sans-serif",
                    background: "#FAFBFC",
                    border: `1px dashed ${BORDER}`,
                    borderRadius: 12,
                    padding: 14,
                  }}
                >
                  No objectives added yet.
                </div>
              )}

              {objectives.map((objective, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 8,
                      background: TEAL_LIGHT,
                      color: TEAL_DARK,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: "'Sora', sans-serif",
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    {index + 1}
                  </div>

                  {isAdmin ? (
                    <>
                      <textarea
                        value={objective}
                        onChange={(e) => handleObjectiveChange(index, e.target.value)}
                        rows={2}
                        style={{
                          ...modalInputStyle,
                          resize: "vertical",
                          flex: 1,
                        }}
                      />
                      <button
                        onClick={() => handleRemoveObjective(index)}
                        style={{
                          background: "#FDECF1",
                          border: "none",
                          borderRadius: 8,
                          padding: "8px 10px",
                          color: "#D63563",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </>
                  ) : (
                    <div
                      style={{
                        flex: 1,
                        fontSize: 14,
                        color: TEXT_MID,
                        lineHeight: 1.6,
                        fontFamily: "'DM Sans', sans-serif",
                        background: "#FAFBFC",
                        border: `1px solid ${BORDER}`,
                        borderRadius: 12,
                        padding: 12,
                      }}
                    >
                      {objective}
                    </div>
                  )}
                </div>
              ))}

              {isAdmin && (
                <button
                  onClick={handleAddObjective}
                  style={{
                    alignSelf: "flex-start",
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: `1px solid ${BORDER}`,
                    background: CARD,
                    color: TEXT_MID,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Icon name="plus" size={14} />
                  Add Objective
                </button>
              )}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: TEXT_LIGHT,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: 8,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Update Notes
            </div>

            {isAdmin ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Add a project update note..."
                style={{
                  ...modalInputStyle,
                  resize: "vertical",
                }}
              />
            ) : (
              <div
                style={{
                  fontSize: 14,
                  color: TEXT_MID,
                  lineHeight: 1.65,
                  fontFamily: "'DM Sans', sans-serif",
                  background: "#FAFBFC",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                {notes || "No update notes available."}
              </div>
            )}
          </div>

          {project.updated_at && (
            <div
              style={{
                fontSize: 12,
                color: TEXT_LIGHT,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Last updated: {new Date(project.updated_at).toLocaleString()}
            </div>
          )}

          {message && (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                background: message.includes("success") ? "#E6F9F5" : "#FDECF1",
                color: message.includes("success") ? "#0D9373" : "#D63563",
                fontSize: 13,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {message}
            </div>
          )}
        </div>

        <div
          style={{
            padding: "16px 28px",
            borderTop: `1px solid ${BORDER}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: `1.5px solid ${BORDER}`,
              background: CARD,
              color: TEXT_MID,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Close
          </button>

          {isAdmin && (
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: "10px 22px",
                borderRadius: 10,
                border: "none",
                background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`,
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: saving ? "default" : "pointer",
                fontFamily: "'DM Sans', sans-serif",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Saving…" : "Save Updates"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProjectsView({ projects, isAdmin, onEdit, onDelete }: { projects: Project[]; isAdmin?: boolean; onEdit?: (p: Project) => void; onDelete?: (id: string) => void; }) {
  const [selected, setSelected] = useState<number | null>(null);
  const pillars = ["All", "Digital Twin", "Synthetic Biology", "Biomanufacturing", "Multi-Omics"];
  const [filter, setFilter] = useState("All");
  const filtered = filter === "All" ? projects : projects.filter(p => p.pillar.toLowerCase().includes(filter.toLowerCase()));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
        {pillars.map(p => (<button key={p} onClick={() => setFilter(p)} style={{ padding: "7px 16px", borderRadius: 24, border: `1.5px solid ${filter === p ? TEAL : BORDER}`, background: filter === p ? TEAL_LIGHT : CARD, color: filter === p ? TEAL_DARK : TEXT_MID, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{p}</button>))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
        {filtered.map((p, i) => (
          <div key={i} onClick={() => setSelected(selected === i ? null : i)} style={{ background: CARD, border: `1.5px solid ${selected === i ? p.color + "50" : BORDER}`, borderRadius: 16, padding: 24, cursor: "pointer", boxShadow: selected === i ? SHADOW_HOVER : SHADOW, transition: "all 0.25s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 12, height: 12, borderRadius: 4, background: p.color }} /><span style={{ fontSize: 17, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>{p.name}</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <StatusBadge status={p.status} />
                {isAdmin && (<div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}><button onClick={() => onEdit?.(p)} style={{ background: "#F3F5F8", border: "none", borderRadius: 6, padding: "4px 6px", cursor: "pointer", color: TEXT_MID }}><Icon name="edit" size={13} /></button><button onClick={() => { if (confirm("Delete this project?")) onDelete?.(p.id!); }} style={{ background: "#FDECF1", border: "none", borderRadius: 6, padding: "4px 6px", cursor: "pointer", color: "#D63563" }}><Icon name="trash" size={13} /></button></div>)}
              </div>
            </div>
            <div style={{ fontSize: 12, color: TEXT_MID, marginBottom: 4 }}>{p.pillar}</div>
            <p style={{ fontSize: 13, color: TEXT_MID, lineHeight: 1.55, margin: "8px 0 16px", fontFamily: "'DM Sans', sans-serif" }}>{p.description}</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 10, padding: "4px 12px", borderRadius: 20, background: `${p.color}12`, color: p.color, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", fontFamily: "'DM Sans', sans-serif" }}>{p.phase}</span>
              <span style={{ fontSize: 12, color: TEXT_LIGHT, fontFamily: "'DM Sans', sans-serif" }}>Lead: {p.lead}</span>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 11, color: TEXT_LIGHT, fontFamily: "'DM Sans', sans-serif" }}>Progress</span><span style={{ fontSize: 12, color: p.color, fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>{p.progress}%</span></div>
              <div style={{ width: "100%", height: 6, borderRadius: 3, background: `${p.color}14` }}><div style={{ width: `${p.progress}%`, height: "100%", borderRadius: 3, background: p.color }} /></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LabView({ userEmail, userName }: { userEmail: string; userName: string; }) {
  const [proposing, setProposing] = useState(false);
  const [approvedEquipment, setApprovedEquipment] = useState<EquipmentProposal[]>([]);
  useEffect(() => {
    fetch("/api/admin/equipment").then(r => r.json()).then(d => setApprovedEquipment((d.proposals || []).filter((p: EquipmentProposal) => p.status === "approved"))).catch(() => {});
  }, []);
  const allEquipment = [...STATIC_EQUIPMENT, ...approvedEquipment.map(p => ({ name: p.name, location: p.location, status: "available", utilization: 0 }))];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {proposing && <ProposeEquipmentModal userEmail={userEmail} userName={userName} onClose={() => setProposing(false)} onSave={() => {}} />}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 18px", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, boxShadow: SHADOW }}>
          <span style={{ color: TEXT_LIGHT }}><Icon name="search" size={16} /></span>
          <input placeholder="Search equipment..." style={{ background: "transparent", border: "none", outline: "none", color: TEXT, flex: 1, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }} />
        </div>
        <button onClick={() => setProposing(true)} style={{ padding: "11px 20px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 6, boxShadow: `0 2px 8px ${TEAL}33` }}>
          <Icon name="plus" size={14} /> Propose Equipment
        </button>
      </div>
      <div style={{ padding: "14px 18px", borderRadius: 12, background: TEAL_LIGHT, border: `1px solid ${TEAL_MUTED}`, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ color: TEAL_DARK, flexShrink: 0 }}><Icon name="cpu" size={16} /></span>
        <span style={{ fontSize: 13, color: TEAL_DARK, fontFamily: "'DM Sans', sans-serif" }}>Have equipment to share? Click <strong>Propose Equipment</strong> to submit it for admin approval. Once approved, it will appear in the network below.</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[{ label: "Network Utilization", value: "54%", sub: "Avg. across all equipment", color: TEAL }, { label: "Cost Savings", value: "€32K", sub: "Estimated this quarter", color: "#7C5CFC" }, { label: "Bookings This Month", value: "18", sub: "Across 3 locations", color: "#F0A500" }].map((s, i) => (
          <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20, boxShadow: SHADOW }}>
            <div style={{ fontSize: 11, color: TEXT_LIGHT, marginBottom: 10, textTransform: "uppercase" as const, letterSpacing: "0.06em", fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{s.label}</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: s.color, fontFamily: "'Sora', sans-serif", lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: TEXT_LIGHT, marginTop: 6, fontFamily: "'DM Sans', sans-serif" }}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: SHADOW }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 100px 130px 100px", padding: "14px 24px", borderBottom: `1px solid ${BORDER}`, fontSize: 11, color: TEXT_LIGHT, textTransform: "uppercase" as const, letterSpacing: "0.07em", fontWeight: 700, fontFamily: "'DM Sans', sans-serif", background: "#FAFBFC" }}>
          <span>Equipment</span><span>Location</span><span>Status</span><span>Utilization</span><span>Action</span>
        </div>
        {allEquipment.map((e, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 100px 130px 100px", padding: "16px 24px", borderBottom: i < allEquipment.length - 1 ? `1px solid ${BORDER}` : "none", alignItems: "center", fontFamily: "'DM Sans', sans-serif" }}>
            <span style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>{e.name}</span>
            <span style={{ fontSize: 12, color: TEXT_LIGHT }}>{e.location}</span>
            <span><span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, fontWeight: 700, background: e.status === "available" ? "#E6F9F5" : e.status === "booked" ? "#FFF8E6" : "#FDECF1", color: e.status === "available" ? "#0D9373" : e.status === "booked" ? "#C48700" : "#D63563", textTransform: "capitalize" as const }}>{e.status}</span></span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#EEF0F4" }}><div style={{ width: `${e.utilization}%`, height: "100%", borderRadius: 3, background: e.utilization > 70 ? "#F0A500" : TEAL }} /></div>
              <span style={{ fontSize: 12, color: TEXT_MID, fontFamily: "'Sora', sans-serif", fontWeight: 600, width: 30 }}>{e.utilization}%</span>
            </div>
            <button style={{ padding: "6px 16px", borderRadius: 8, border: e.status === "available" ? `1.5px solid ${TEAL}` : `1px solid ${BORDER}`, background: e.status === "available" ? TEAL_LIGHT : "#FAFBFC", color: e.status === "available" ? TEAL_DARK : TEXT_LIGHT, cursor: e.status === "available" ? "pointer" : "default", fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
              {e.status === "available" ? "Book" : e.status === "booked" ? "Waitlist" : "N/A"}
            </button>
          </div>
        ))}
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
              <span style={{ fontSize: 10, padding: "4px 10px", borderRadius: 20, fontWeight: 700, background: hl ? TEAL_LIGHT : "#F3F5F8", color: hl ? TEAL_DARK : TEXT_LIGHT, textTransform: "uppercase" as const, letterSpacing: "0.05em", fontFamily: "'DM Sans', sans-serif" }}>{e.event_type}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13, color: TEAL_DARK, fontFamily: "'Sora', sans-serif", fontWeight: 700 }}>{e.event_date}</span>
                {isAdmin && (<div style={{ display: "flex", gap: 4 }}><button onClick={() => onEdit?.(e)} style={{ background: "#F3F5F8", border: "none", borderRadius: 6, padding: "4px 6px", cursor: "pointer", color: TEXT_MID }}><Icon name="edit" size={13} /></button><button onClick={() => { if (confirm("Delete this event?")) onDelete?.(e.id!); }} style={{ background: "#FDECF1", border: "none", borderRadius: 6, padding: "4px 6px", cursor: "pointer", color: "#D63563" }}><Icon name="trash" size={13} /></button></div>)}
              </div>
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif", marginBottom: 8 }}>{e.title}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: e.description ? 8 : 20 }}><span style={{ color: TEXT_LIGHT }}><Icon name="mapPin" size={13} /></span><span style={{ fontSize: 13, color: TEXT_MID, fontFamily: "'DM Sans', sans-serif" }}>{e.location}</span></div>
            {e.description && <p style={{ fontSize: 12, color: TEXT_LIGHT, lineHeight: 1.5, marginBottom: 16, fontFamily: "'DM Sans', sans-serif" }}>{e.description}</p>}
            <button style={{ width: "100%", padding: "9px 0", borderRadius: 10, border: hl ? "none" : `1.5px solid ${BORDER}`, background: hl ? `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})` : CARD, color: hl ? "#fff" : TEXT_MID, cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>RSVP</button>
          </div>
        );
      })}
    </div>
  );
}

function MembersView({ members }: { members: Organisation[] }) {
  const tc: Record<string, string> = { Foundation: TEAL, University: "#7C5CFC", Startup: "#00B894", SME: "#F0A500", "Clinical Center": "#E74C6F", Investor: "#4A7DFF", "International Partner": "#F0A500" };
  const tbg: Record<string, string> = { Foundation: TEAL_LIGHT, University: "#F0EDFF", Startup: "#E6F9F5", SME: "#FFF8E6", "Clinical Center": "#FDECF1", Investor: "#EBF1FF", "International Partner": "#FFF8E6" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>Member Network Map</h3>
          <span style={{ fontSize: 12, color: TEXT_LIGHT, fontFamily: "'DM Sans', sans-serif" }}>OpenStreetMap · 6 hubs across 3 continents</span>
        </div>
        <MemberMap />
      </div>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>Member Organisations</h3>
      {(!members || members.length === 0) ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>{[1,2,3,4,5,6].map(i => (<div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20, boxShadow: SHADOW, height: 80, opacity: 0.4 }} />))}</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {members.map((m, i) => (
            <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20, boxShadow: SHADOW }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: tbg[m.org_type] || TEAL_LIGHT, color: tc[m.org_type] || TEAL, fontSize: 14, fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>{m.name.charAt(0)}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, fontFamily: "'DM Sans', sans-serif" }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: TEXT_LIGHT, display: "flex", alignItems: "center", gap: 4, marginTop: 1, fontFamily: "'DM Sans', sans-serif" }}><Icon name="mapPin" size={11} /> {m.location}</div>
                </div>
              </div>
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 14, background: tbg[m.org_type] || TEAL_LIGHT, color: tc[m.org_type] || TEAL, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{m.org_type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KnowledgeView() {
  const categories = [
    { name: "Regulatory Pathways", count: 8, icon: "book", desc: "IVDR, MDR, EMA guidance documents", color: TEAL, bg: TEAL_LIGHT },
    { name: "Funding Programs", count: 12, icon: "chart", desc: "NIDI, Mini-PIA, PIA, Horizon Europe guides", color: "#7C5CFC", bg: "#F0EDFF" },
    { name: "Technical Protocols", count: 15, icon: "flask", desc: "Lab procedures and best practices", color: "#E74C6F", bg: "#FDECF1" },
    { name: "IP Strategy", count: 6, icon: "layers", desc: "Patent templates and licensing frameworks", color: "#F0A500", bg: "#FFF8E6" },
    { name: "Onboarding", count: 4, icon: "users", desc: "New member guides and welcome materials", color: "#00B894", bg: "#E6F9F5" },
    { name: "Webinar Archive", count: 9, icon: "globe", desc: "Expert webinar recordings and slides", color: "#4A7DFF", bg: "#EBF1FF" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, boxShadow: SHADOW }}>
        <span style={{ color: TEXT_LIGHT }}><Icon name="search" size={16} /></span>
        <input placeholder="Search the knowledge base..." style={{ background: "transparent", border: "none", outline: "none", color: TEXT, flex: 1, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 16 }}>
        {categories.map((c, i) => (
          <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, boxShadow: SHADOW, cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: c.bg, color: c.color, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={c.icon} size={20} /></div>
              <span style={{ fontSize: 12, color: TEXT_LIGHT, fontFamily: "'Sora', sans-serif", fontWeight: 600 }}>{c.count} docs</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif", marginBottom: 6 }}>{c.name}</div>
            <div style={{ fontSize: 13, color: TEXT_MID, lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif" }}>{c.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

type UserProfile = { id: string; email: string; full_name?: string; partnership_level: PartnershipLevel; };
type Application = { id: string; email: string; full_name?: string; contact_role?: string; organisation_name?: string; organisation_type?: string; organisation_website?: string; country?: string; city?: string; areas_of_interest?: string[]; what_you_bring?: string; what_you_seek?: string; application_status: string; applied_at?: string; reviewed_at?: string; admin_notes?: string; partnership_level: PartnershipLevel; };
const ORG_TYPE_LABELS: Record<string, string> = { startup: "Startup", sme: "SME / Company", hospital: "Hospital / Clinic", university: "University / Research Institute", investor: "Investor / VC", international_partner: "International Partner", other: "Other" };
const PILLAR_LABELS: Record<string, string> = { digital_twin: "Digital Twin Therapeutics", synthetic_biology: "Synthetic Biology & Cell Engineering", biomanufacturing: "Automated Biomanufacturing", multi_omics: "Integrated Multi-Omics Analytics" };

function ApplicationDrawer({ app, onClose, onAction }: { app: Application; onClose: () => void; onAction: (id: string, action: "approve" | "decline", notes: string, level: PartnershipLevel) => void; }) {
  const [notes, setNotes] = useState(app.admin_notes ?? "");
  const [level, setLevel] = useState<PartnershipLevel>("member");
  const [acting, setActing] = useState(false);
  const handle = async (action: "approve" | "decline") => { setActing(true); await onAction(app.id, action, notes, level); setActing(false); };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(26,35,50,0.4)", backdropFilter: "blur(3px)" }} />
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 520, background: CARD, boxShadow: "-4px 0 32px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", overflow: "hidden", animation: "slideIn 0.25s ease both" }}>
        <div style={{ padding: "22px 28px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>{app.full_name || app.email}</div>
            <div style={{ fontSize: 13, color: TEXT_LIGHT, marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>{app.organisation_name && `${app.organisation_name} · `}{app.email}</div>
          </div>
          <button onClick={onClose} style={{ background: "#F3F5F8", border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: TEXT_MID }}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: "#FAFBFC", borderRadius: 14, padding: 18, border: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_LIGHT, textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 14, fontFamily: "'DM Sans', sans-serif" }}>Organisation</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[{ label: "Name", value: app.organisation_name }, { label: "Type", value: app.organisation_type ? ORG_TYPE_LABELS[app.organisation_type] : undefined }, { label: "Location", value: [app.city, app.country].filter(Boolean).join(", ") }, { label: "Website", value: app.organisation_website }].map(({ label, value }) => (
                <div key={label}><div style={{ fontSize: 11, color: TEXT_LIGHT, marginBottom: 3, fontFamily: "'DM Sans', sans-serif" }}>{label}</div><div style={{ fontSize: 13, color: TEXT, fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>{value || "—"}</div></div>
              ))}
            </div>
          </div>
          {app.areas_of_interest && app.areas_of_interest.length > 0 && (<div><div style={{ fontSize: 11, fontWeight: 700, color: TEXT_LIGHT, textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>Scientific Interests</div><div style={{ display: "flex", flexWrap: "wrap" as const, gap: 7 }}>{app.areas_of_interest.map(a => (<span key={a} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: TEAL_LIGHT, color: TEAL_DARK, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{PILLAR_LABELS[a] ?? a}</span>))}</div></div>)}
          {app.what_you_bring && (<div><div style={{ fontSize: 11, fontWeight: 700, color: TEXT_LIGHT, textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>What They Bring</div><p style={{ fontSize: 13, color: TEXT_MID, lineHeight: 1.65, margin: 0, background: "#FAFBFC", padding: 14, borderRadius: 10, border: `1px solid ${BORDER}`, fontFamily: "'DM Sans', sans-serif" }}>{app.what_you_bring}</p></div>)}
          {app.what_you_seek && (<div><div style={{ fontSize: 11, fontWeight: 700, color: TEXT_LIGHT, textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>What They Seek</div><p style={{ fontSize: 13, color: TEXT_MID, lineHeight: 1.65, margin: 0, background: "#FAFBFC", padding: 14, borderRadius: 10, border: `1px solid ${BORDER}`, fontFamily: "'DM Sans', sans-serif" }}>{app.what_you_seek}</p></div>)}
          {app.applied_at && (<div style={{ display: "flex", alignItems: "center", gap: 6, color: TEXT_LIGHT, fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}><Icon name="clock" size={13} />Applied {new Date(app.applied_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>)}
          <div><div style={{ fontSize: 11, fontWeight: 700, color: TEXT_LIGHT, textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>Admin Notes</div><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add notes..." rows={3} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${BORDER}`, fontSize: 13, color: TEXT, outline: "none", resize: "vertical" as const, background: "#FAFBFC", fontFamily: "'DM Sans', sans-serif" }} /></div>
          {app.application_status === "pending" && (<div><div style={{ fontSize: 11, fontWeight: 700, color: TEXT_LIGHT, textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>Grant Partnership Level</div><div style={{ display: "flex", gap: 8 }}>{(["member", "partner"] as PartnershipLevel[]).map(l => { const lbl = PARTNERSHIP_LABELS[l]; return (<button key={l} onClick={() => setLevel(l)} style={{ padding: "7px 18px", borderRadius: 10, border: `1.5px solid ${level === l ? lbl.color : BORDER}`, background: level === l ? lbl.bg : CARD, color: level === l ? lbl.color : TEXT_LIGHT, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{lbl.label}</button>); })}</div></div>)}
        </div>
        {app.application_status === "pending" && (
          <div style={{ padding: "18px 28px", borderTop: `1px solid ${BORDER}`, display: "flex", gap: 10 }}>
            <button onClick={() => handle("decline")} disabled={acting} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: `1.5px solid #F9C3CE`, background: "#FEF2F4", color: "#D63563", fontSize: 13, fontWeight: 700, cursor: acting ? "default" : "pointer", fontFamily: "'DM Sans', sans-serif", opacity: acting ? 0.6 : 1 }}>Decline</button>
            <button onClick={() => handle("approve")} disabled={acting} style={{ flex: 2, padding: "11px 0", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: acting ? "default" : "pointer", fontFamily: "'DM Sans', sans-serif", opacity: acting ? 0.6 : 1 }}>{acting ? "Processing…" : `Approve as ${PARTNERSHIP_LABELS[level].label}`}</button>
          </div>
        )}
        {app.application_status !== "pending" && (
          <div style={{ padding: "18px 28px", borderTop: `1px solid ${BORDER}` }}>
            <div style={{ padding: "12px 18px", borderRadius: 12, textAlign: "center", background: app.application_status === "approved" ? "#E6F9F5" : "#FEF2F4", color: app.application_status === "approved" ? "#0D9373" : "#D63563", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>
              {app.application_status === "approved" ? "✓ Approved" : "✗ Declined"}{app.reviewed_at && ` · ${new Date(app.reviewed_at).toLocaleDateString("en-GB")}`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminPanel({ onEventsChanged, onProjectsChanged }: { onEventsChanged?: () => void; onProjectsChanged?: () => void; }) {
  const [tab, setTab] = useState<"applications" | "users" | "events" | "projects" | "equipment" | "newsletter">("applications");
  const [applications, setApplications] = useState<Application[]>([]);
  const [appFilter, setAppFilter] = useState<"pending" | "approved" | "declined" | "all">("pending");
  const [loadingApps, setLoadingApps] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
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

  useEffect(() => {
    setLoadingApps(true);
    fetch(`/api/admin/applications?status=${appFilter}`).then(r => r.json()).then(d => { setApplications(d.applications || []); setLoadingApps(false); }).catch(() => setLoadingApps(false));
  }, [appFilter]);

  useEffect(() => {
    if (tab === "users") { setLoadingUsers(true); fetch("/api/admin/users").then(r => r.json()).then(d => { setUsers(d.users || []); setLoadingUsers(false); }).catch(() => setLoadingUsers(false)); }
    if (tab === "newsletter") { setLoadingNewsletter(true); fetch("/api/admin/newsletter").then(r => r.json()).then(d => { setSubscribers(d.subscribers || []); setLoadingNewsletter(false); }).catch(() => setLoadingNewsletter(false)); }
    if (tab === "events") { setLoadingEvents(true); fetch("/api/admin/events").then(r => r.json()).then(d => { setAdminEvents(d.events || []); setLoadingEvents(false); }).catch(() => setLoadingEvents(false)); }
    if (tab === "projects") { setLoadingProjects(true); fetch("/api/admin/projects").then(r => r.json()).then(d => { setAdminProjects(d.projects || []); setLoadingProjects(false); }).catch(() => setLoadingProjects(false)); }
    if (tab === "equipment") { setLoadingProposals(true); fetch("/api/admin/equipment").then(r => r.json()).then(d => { setProposals(d.proposals || []); setLoadingProposals(false); }).catch(() => setLoadingProposals(false)); }
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

  const handleSaveEvent = async (event: Partial<Event>) => {
    const isEdit = !!event.id;
    const res = await fetch("/api/admin/events", { method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(event) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to save");
    if (isEdit) setAdminEvents(prev => prev.map(e => e.id === event.id ? data.event : e)); else setAdminEvents(prev => [data.event, ...prev]);
    onEventsChanged?.();
  };
  const handleDeleteEvent = async (id: string) => { const res = await fetch("/api/admin/events", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); if (res.ok) { setAdminEvents(prev => prev.filter(e => e.id !== id)); onEventsChanged?.(); } };

  const handleSaveProject = async (project: Partial<Project>) => {
    const isEdit = !!project.id;
    const res = await fetch("/api/admin/projects", { method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(project) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to save");
    if (isEdit) setAdminProjects(prev => prev.map(p => p.id === project.id ? data.project : p)); else setAdminProjects(prev => [data.project, ...prev]);
    onProjectsChanged?.();
  };
  const handleDeleteProject = async (id: string) => { const res = await fetch("/api/admin/projects", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); if (res.ok) { setAdminProjects(prev => prev.filter(p => p.id !== id)); onProjectsChanged?.(); } };

  const handleReviewProposal = async (id: string, status: "approved" | "rejected") => {
    setReviewingProposal(id);
    try {
      const res = await fetch("/api/admin/equipment", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status, admin_notes: "" }) });
      const data = await res.json();
      if (res.ok) setProposals(prev => prev.map(p => p.id === id ? data.proposal : p));
    } finally { setReviewingProposal(null); }
  };
  const handleDeleteProposal = async (id: string) => { const res = await fetch("/api/admin/equipment", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); if (res.ok) setProposals(prev => prev.filter(p => p.id !== id)); };

  const exportCSV = () => {
    const csv = ["Name,Email,Source,Date"].concat(subscribers.map(s => `"${s.full_name || ""}","${s.email}","${s.source}","${new Date(s.subscribed_at).toLocaleDateString("en-GB")}"`)).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `bioergotech-newsletter-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const pendingCount = applications.filter(a => a.application_status === "pending").length;
  const pendingProposals = proposals.filter(p => p.status === "pending").length;
  const tabs = [
    { id: "applications" as const, label: "Applications", icon: "inbox", badge: (pendingCount > 0 && appFilter === "pending") ? pendingCount : null as number | null },
    { id: "users" as const, label: "Users", icon: "users", badge: null as number | null },
    { id: "events" as const, label: "Events", icon: "calendar", badge: null as number | null },
    { id: "projects" as const, label: "Projects", icon: "layers", badge: null as number | null },
    { id: "equipment" as const, label: "Equipment", icon: "cpu", badge: pendingProposals > 0 ? pendingProposals : null as number | null },
    { id: "newsletter" as const, label: "Newsletter", icon: "mail", badge: null as number | null },
  ];
  const btnBase: React.CSSProperties = { border: "none", borderRadius: 7, padding: "6px 8px", cursor: "pointer" };

  return (
    <>
      {selectedApp && <ApplicationDrawer app={selectedApp} onClose={() => setSelectedApp(null)} onAction={handleAction} />}
      {eventModal.open && <EventModal event={eventModal.event} onClose={() => setEventModal({ open: false, event: null })} onSave={handleSaveEvent} />}
      {projectModal.open && <ProjectModal project={projectModal.project} onClose={() => setProjectModal({ open: false, project: null })} onSave={handleSaveProject} />}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ background: "#FDECF1", border: "1px solid #F9C3CE", borderRadius: 14, padding: "16px 22px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ color: "#E74C6F" }}><Icon name="shield" size={20} /></div>
          <div><div style={{ fontSize: 14, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>Admin Panel</div><div style={{ fontSize: 12, color: TEXT_MID, fontFamily: "'DM Sans', sans-serif" }}>Manage applications, users, events, projects, equipment proposals and newsletter.</div></div>
        </div>
        {actionMessage && (<div style={{ padding: "12px 18px", borderRadius: 10, background: actionMessage.type === "success" ? "#E6F9F5" : "#FDECF1", border: `1px solid ${actionMessage.type === "success" ? "#A3E4D7" : "#F9C3CE"}`, color: actionMessage.type === "success" ? "#0D9373" : "#D63563", fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>{actionMessage.text}</div>)}
        <div style={{ display: "flex", gap: 4, background: "#F3F5F8", borderRadius: 12, padding: 4, flexWrap: "wrap" as const }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 9, border: "none", background: tab === t.id ? CARD : "transparent", color: tab === t.id ? TEXT : TEXT_LIGHT, fontSize: 13, fontWeight: tab === t.id ? 700 : 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", boxShadow: tab === t.id ? SHADOW : "none", transition: "all 0.15s ease" }}>
              <Icon name={t.icon} size={15} />{t.label}
              {t.badge != null && (<span style={{ background: "#E74C6F", color: "#fff", borderRadius: 20, fontSize: 10, fontWeight: 700, padding: "1px 7px" }}>{t.badge}</span>)}
            </button>
          ))}
        </div>

        {tab === "applications" && (
          <>
            <div style={{ display: "flex", gap: 8 }}>
              {(["pending", "approved", "declined", "all"] as const).map(s => (<button key={s} onClick={() => setAppFilter(s)} style={{ padding: "6px 16px", borderRadius: 20, border: `1.5px solid ${appFilter === s ? (s === "pending" ? "#F0A500" : s === "approved" ? TEAL : s === "declined" ? "#E74C6F" : BORDER) : BORDER}`, background: appFilter === s ? (s === "pending" ? "#FFF8E6" : s === "approved" ? TEAL_LIGHT : s === "declined" ? "#FDECF1" : "#F3F5F8") : CARD, color: appFilter === s ? (s === "pending" ? "#C48700" : s === "approved" ? TEAL_DARK : s === "declined" ? "#D63563" : TEXT_MID) : TEXT_LIGHT, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textTransform: "capitalize" as const }}>{s}</button>))}
            </div>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: SHADOW }}>
              <div style={{ padding: "16px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>{appFilter === "all" ? "All" : appFilter.charAt(0).toUpperCase() + appFilter.slice(1)} Applications</h3>
                <span style={{ fontSize: 12, color: TEXT_LIGHT, fontFamily: "'DM Sans', sans-serif" }}>{applications.length} total</span>
              </div>
              {loadingApps ? (<div style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT, fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>Loading…</div>)
                : applications.length === 0 ? (<div style={{ padding: 48, textAlign: "center" }}><div style={{ color: "#E8EDF3", marginBottom: 12 }}><Icon name="inbox" size={48} /></div><div style={{ fontSize: 15, fontWeight: 600, color: TEXT_MID, fontFamily: "'Sora', sans-serif" }}>No {appFilter} applications</div></div>)
                : applications.map((app, i) => {
                  const sc = app.application_status === "approved" ? TEAL : app.application_status === "declined" ? "#E74C6F" : "#F0A500";
                  const sb = app.application_status === "approved" ? TEAL_LIGHT : app.application_status === "declined" ? "#FDECF1" : "#FFF8E6";
                  return (<div key={app.id} onClick={() => setSelectedApp(app)} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 140px 120px 80px", padding: "16px 24px", borderBottom: i < applications.length - 1 ? `1px solid ${BORDER}` : "none", alignItems: "center", cursor: "pointer", transition: "background 0.15s", fontFamily: "'DM Sans', sans-serif" }} onMouseEnter={e => (e.currentTarget.style.background = "#FAFBFC")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
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

        {tab === "users" && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: SHADOW }}>
            <div style={{ padding: "16px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>All Users</h3>
              <span style={{ fontSize: 12, color: TEXT_LIGHT, fontFamily: "'DM Sans', sans-serif" }}>{users.length} users</span>
            </div>
            {loadingUsers ? (<div style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT, fontSize: 14 }}>Loading…</div>)
              : users.length === 0 ? (<div style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT, fontSize: 14 }}>No users found.</div>)
              : (<div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 200px", padding: "12px 24px", background: "#FAFBFC", borderBottom: `1px solid ${BORDER}`, fontSize: 11, color: TEXT_LIGHT, textTransform: "uppercase" as const, letterSpacing: "0.07em", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}><span>Email</span><span>Name</span><span>Partnership Level</span></div>
                {users.map((u, i) => { const lbl = PARTNERSHIP_LABELS[u.partnership_level] || PARTNERSHIP_LABELS.viewer; return (
                  <div key={u.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 200px", padding: "16px 24px", borderBottom: i < users.length - 1 ? `1px solid ${BORDER}` : "none", alignItems: "center", fontFamily: "'DM Sans', sans-serif" }}>
                    <span style={{ fontSize: 13, color: TEXT, fontWeight: 500 }}>{u.email}</span>
                    <span style={{ fontSize: 13, color: TEXT_MID }}>{u.full_name || "—"}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <select value={u.partnership_level} onChange={e => updateLevel(u.id, e.target.value as PartnershipLevel)} disabled={saving === u.id} style={{ padding: "6px 10px", borderRadius: 8, border: `1.5px solid ${lbl.color}30`, background: lbl.bg, color: lbl.color, fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", outline: "none", opacity: saving === u.id ? 0.6 : 1 }}>
                        <option value="viewer">Viewer</option><option value="member">Member</option><option value="partner">Partner</option><option value="admin">Admin</option>
                      </select>
                      {saving === u.id && <span style={{ fontSize: 11, color: TEXT_LIGHT }}>Saving…</span>}
                    </div>
                  </div>
                ); })}
              </div>)}
          </div>
        )}

        {tab === "events" && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: SHADOW }}>
            <div style={{ padding: "16px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>Events</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, color: TEXT_LIGHT }}>{adminEvents.length} total</span>
                <button onClick={() => setEventModal({ open: true, event: null })} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}><Icon name="plus" size={14} /> Add Event</button>
              </div>
            </div>
            {loadingEvents ? (<div style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT, fontSize: 14 }}>Loading…</div>)
              : adminEvents.length === 0 ? (<div style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT, fontSize: 14 }}>No events yet.</div>)
              : (<div>
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 100px 140px 100px 90px", padding: "12px 24px", background: "#FAFBFC", borderBottom: `1px solid ${BORDER}`, fontSize: 11, color: TEXT_LIGHT, textTransform: "uppercase" as const, letterSpacing: "0.07em", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}><span>Title</span><span>Date</span><span>Location</span><span>Type</span><span>Actions</span></div>
                {adminEvents.map((e, i) => (
                  <div key={e.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 100px 140px 100px 90px", padding: "14px 24px", borderBottom: i < adminEvents.length - 1 ? `1px solid ${BORDER}` : "none", alignItems: "center", fontFamily: "'DM Sans', sans-serif" }}>
                    <div><div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{e.title}</div>{!e.is_approved && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "#FFF8E6", color: "#C48700", fontWeight: 700 }}>Pending</span>}</div>
                    <span style={{ fontSize: 12, color: TEXT_MID }}>{e.event_date}</span>
                    <span style={{ fontSize: 12, color: TEXT_LIGHT }}>{e.location}</span>
                    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: e.event_type === "national" ? TEAL_LIGHT : "#F3F5F8", color: e.event_type === "national" ? TEAL_DARK : TEXT_LIGHT, fontWeight: 700, textTransform: "capitalize" as const, width: "fit-content" }}>{e.event_type}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setEventModal({ open: true, event: e })} style={{ ...btnBase, background: "#F3F5F8", color: TEXT_MID }}><Icon name="edit" size={14} /></button>
                      <button onClick={() => { if (confirm("Delete this event?")) handleDeleteEvent(e.id!); }} style={{ ...btnBase, background: "#FDECF1", color: "#D63563" }}><Icon name="trash" size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>)}
          </div>
        )}

        {tab === "projects" && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: SHADOW }}>
            <div style={{ padding: "16px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>Projects</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, color: TEXT_LIGHT }}>{adminProjects.length} total</span>
                <button onClick={() => setProjectModal({ open: true, project: null })} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}><Icon name="plus" size={14} /> Add Project</button>
              </div>
            </div>
            {loadingProjects ? (<div style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT, fontSize: 14 }}>Loading…</div>)
              : adminProjects.length === 0 ? (<div style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT, fontSize: 14 }}>No projects yet.</div>)
              : (<div>
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 100px 140px 90px", padding: "12px 24px", background: "#FAFBFC", borderBottom: `1px solid ${BORDER}`, fontSize: 11, color: TEXT_LIGHT, textTransform: "uppercase" as const, letterSpacing: "0.07em", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}><span>Name</span><span>Pillar</span><span>Phase</span><span>Progress</span><span>Actions</span></div>
                {adminProjects.map((p, i) => (
                  <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 100px 140px 90px", padding: "14px 24px", borderBottom: i < adminProjects.length - 1 ? `1px solid ${BORDER}` : "none", alignItems: "center", fontFamily: "'DM Sans', sans-serif" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: p.color, flexShrink: 0 }} /><div><div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{p.name}</div><div style={{ fontSize: 11, color: TEXT_LIGHT }}>{p.lead}</div></div></div>
                    <span style={{ fontSize: 11, color: TEXT_MID }}>{p.pillar.split(" ").slice(0, 2).join(" ")}…</span>
                    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: `${p.color}12`, color: p.color, fontWeight: 700, width: "fit-content" }}>{p.phase}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ flex: 1, height: 5, borderRadius: 3, background: `${p.color}14` }}><div style={{ width: `${p.progress}%`, height: "100%", borderRadius: 3, background: p.color }} /></div><span style={{ fontSize: 11, color: TEXT_MID, fontWeight: 600, width: 30 }}>{p.progress}%</span></div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setProjectModal({ open: true, project: p })} style={{ ...btnBase, background: "#F3F5F8", color: TEXT_MID }}><Icon name="edit" size={14} /></button>
                      <button onClick={() => { if (confirm("Delete this project?")) handleDeleteProject(p.id!); }} style={{ ...btnBase, background: "#FDECF1", color: "#D63563" }}><Icon name="trash" size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>)}
          </div>
        )}

        {tab === "equipment" && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: SHADOW }}>
            <div style={{ padding: "16px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>Equipment Proposals</h3>
              <span style={{ fontSize: 12, color: TEXT_LIGHT }}>{proposals.length} total · {pendingProposals} pending</span>
            </div>
            {loadingProposals ? (<div style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT, fontSize: 14 }}>Loading…</div>)
              : proposals.length === 0 ? (
                <div style={{ padding: 48, textAlign: "center" }}>
                  <div style={{ color: "#E8EDF3", marginBottom: 12 }}><Icon name="cpu" size={48} /></div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: TEXT_MID, fontFamily: "'Sora', sans-serif" }}>No equipment proposals yet</div>
                  <div style={{ fontSize: 13, color: TEXT_LIGHT, marginTop: 4 }}>Members and partners can propose equipment from the Distributed Lab section.</div>
                </div>
              ) : (<div>
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 100px 120px 160px", padding: "12px 24px", background: "#FAFBFC", borderBottom: `1px solid ${BORDER}`, fontSize: 11, color: TEXT_LIGHT, textTransform: "uppercase" as const, letterSpacing: "0.07em", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>
                  <span>Equipment</span><span>Location</span><span>Category</span><span>Status</span><span>Actions</span>
                </div>
                {proposals.map((p, i) => {
                  const isPending = p.status === "pending";
                  const isApproved = p.status === "approved";
                  const statusColor = isApproved ? "#0D9373" : isPending ? "#C48700" : "#D63563";
                  const statusBg = isApproved ? "#E6F9F5" : isPending ? "#FFF8E6" : "#FDECF1";
                  return (
                    <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 100px 120px 160px", padding: "16px 24px", borderBottom: i < proposals.length - 1 ? `1px solid ${BORDER}` : "none", alignItems: "center", fontFamily: "'DM Sans', sans-serif" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{p.name}</div>
                        {p.proposed_by_name && <div style={{ fontSize: 11, color: TEXT_LIGHT, marginTop: 2 }}>Proposed by {p.proposed_by_name}</div>}
                        {p.description && <div style={{ fontSize: 11, color: TEXT_LIGHT, marginTop: 1 }}>{p.description.slice(0, 60)}{p.description.length > 60 ? "…" : ""}</div>}
                      </div>
                      <span style={{ fontSize: 12, color: TEXT_MID }}>{p.location}</span>
                      <span style={{ fontSize: 11, color: TEXT_LIGHT }}>{p.category || "—"}</span>
                      <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: statusBg, color: statusColor, fontWeight: 700, textTransform: "capitalize" as const, width: "fit-content" }}>{p.status}</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        {isPending && (
                          <>
                            <button onClick={() => handleReviewProposal(p.id, "approved")} disabled={reviewingProposal === p.id} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#E6F9F5", color: "#0D9373", fontSize: 11, fontWeight: 700, cursor: "pointer", opacity: reviewingProposal === p.id ? 0.6 : 1 }}>✓ Approve</button>
                            <button onClick={() => handleReviewProposal(p.id, "rejected")} disabled={reviewingProposal === p.id} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#FDECF1", color: "#D63563", fontSize: 11, fontWeight: 700, cursor: "pointer", opacity: reviewingProposal === p.id ? 0.6 : 1 }}>✗ Reject</button>
                          </>
                        )}
                        {!isPending && <button onClick={() => { if (confirm("Delete this proposal?")) handleDeleteProposal(p.id); }} style={{ ...btnBase, background: "#FDECF1", color: "#D63563" }}><Icon name="trash" size={14} /></button>}
                      </div>
                    </div>
                  );
                })}
              </div>)}
          </div>
        )}

        {tab === "newsletter" && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: SHADOW }}>
            <div style={{ padding: "16px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>Newsletter Subscribers</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, color: TEXT_LIGHT }}>{subscribers.length} subscribers</span>
                <button onClick={exportCSV} style={{ padding: "7px 16px", borderRadius: 10, border: `1.5px solid ${TEAL}`, background: TEAL_LIGHT, color: TEAL_DARK, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 6 }}>↓ Export CSV</button>
              </div>
            </div>
            {loadingNewsletter ? (<div style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT, fontSize: 14 }}>Loading…</div>)
              : subscribers.length === 0 ? (<div style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT, fontSize: 14 }}>No subscribers yet.</div>)
              : (<div>
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 120px 120px", padding: "12px 24px", background: "#FAFBFC", borderBottom: `1px solid ${BORDER}`, fontSize: 11, color: TEXT_LIGHT, textTransform: "uppercase" as const, letterSpacing: "0.07em", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}><span>Email</span><span>Name</span><span>Source</span><span>Date</span></div>
                {subscribers.map((s, i) => (
                  <div key={s.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 120px 120px", padding: "14px 24px", borderBottom: i < subscribers.length - 1 ? `1px solid ${BORDER}` : "none", alignItems: "center", fontFamily: "'DM Sans', sans-serif" }}>
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
  const [approvedEquipmentCount, setApprovedEquipmentCount] = useState(0);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const fetchProjects = () => fetch("/api/projects").then(r => r.json()).then(d => setProjects(d.projects || []));
  const fetchEvents = () => fetch("/api/events").then(r => r.json()).then(d => setEvents(d.events || []));

  useEffect(() => {
    fetchProjects();
    fetchEvents();
    fetch("/api/organisations").then(r => r.json()).then(d => setMembers(d.organisations || []));
    fetch("/api/admin/equipment").then(r => r.json()).then(d => {
      const approved = (d.proposals || []).filter((p: EquipmentProposal) => p.status === "approved").length;
      setApprovedEquipmentCount(STATIC_EQUIPMENT.length + approved);
    }).catch(() => setApprovedEquipmentCount(STATIC_EQUIPMENT.length));
  }, []);

  const partnershipLevel = user.partnership_level;
  const isAdmin = partnershipLevel === "admin";
  const accessibleSections = PARTNERSHIP_ACCESS[partnershipLevel] || PARTNERSHIP_ACCESS.viewer;
  const levelInfo = PARTNERSHIP_LABELS[partnershipLevel] || PARTNERSHIP_LABELS.viewer;
  const sectionNames: Record<string, string> = { dashboard: "Dashboard", projects: "Project Tracker", lab: "Distributed Laboratory", events: "Events & Meetings", members: "Member Network", knowledge: "Knowledge Base", admin: "Admin Panel" };
  const visibleNav = navItems.filter(item => { if (item.id === "admin") return isAdmin; return true; });

  const handleSaveEventInline = async (event: Partial<Event>) => { const res = await fetch("/api/admin/events", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(event) }); if (res.ok) { fetchEvents(); setEditingEvent(null); } };
  const handleSaveProjectInline = async (project: Partial<Project>) => { const res = await fetch("/api/admin/projects", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(project) }); if (res.ok) { fetchProjects(); setEditingProject(null); } };

  const renderContent = () => {
    switch (activeNav) {
      case "dashboard": return <DashboardView projects={projects} events={events} members={members} approvedEquipmentCount={approvedEquipmentCount} />;
      case "projects": return (
        <SectionWrapper sectionId="projects" sectionName="Projects" partnershipLevel={partnershipLevel}>
          <>{editingProject && <ProjectModal project={editingProject} onClose={() => setEditingProject(null)} onSave={handleSaveProjectInline} />}<ProjectsView projects={projects} isAdmin={isAdmin} onEdit={p => setEditingProject(p)} onDelete={async id => { await fetch("/api/admin/projects", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); fetchProjects(); }} /></>
        </SectionWrapper>
      );
      case "lab": return (
        <SectionWrapper sectionId="lab" sectionName="Distributed Lab" partnershipLevel={partnershipLevel}>
          <LabView userEmail={user.email} userName={user.display_name || user.full_name || user.email} />
        </SectionWrapper>
      );
      case "events": return (
        <SectionWrapper sectionId="events" sectionName="Events" partnershipLevel={partnershipLevel}>
          <>{editingEvent && <EventModal event={editingEvent} onClose={() => setEditingEvent(null)} onSave={handleSaveEventInline} />}<EventsView events={events} isAdmin={isAdmin} onEdit={e => setEditingEvent(e)} onDelete={async id => { await fetch("/api/admin/events", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); fetchEvents(); }} /></>
        </SectionWrapper>
      );
      case "members": return <SectionWrapper sectionId="members" sectionName="Members" partnershipLevel={partnershipLevel}><MembersView members={members} /></SectionWrapper>;
      case "knowledge": return <SectionWrapper sectionId="knowledge" sectionName="Knowledge Base" partnershipLevel={partnershipLevel}><KnowledgeView /></SectionWrapper>;
      case "admin": return isAdmin ? <AdminPanel onEventsChanged={fetchEvents} onProjectsChanged={fetchProjects} /> : null;
      default: return <DashboardView projects={projects} events={events} members={members} approvedEquipmentCount={approvedEquipmentCount} />;
    }
  };

  const isLocked = (sectionId: string) => !accessibleSections.includes(sectionId);

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
      `}</style>
      <div style={{ width: collapsed ? 68 : 240, background: "#fff", borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", transition: "width 0.3s ease", flexShrink: 0, boxShadow: "1px 0 8px rgba(0,0,0,0.02)" }}>
        <div style={{ padding: collapsed ? "22px 14px" : "22px 22px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setCollapsed(!collapsed)}>
          <div style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "'Sora', sans-serif", boxShadow: `0 2px 8px ${TEAL}33` }}>bE</div>
          {!collapsed && (<div><div style={{ fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>bio<span style={{ color: TEAL }}>ERGO</span>tech</div><div style={{ fontSize: 10, color: TEXT_LIGHT, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>Member Portal</div></div>)}
        </div>
        <nav style={{ flex: 1, padding: "16px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
          {visibleNav.map(item => {
            const active = activeNav === item.id;
            const locked = isLocked(item.id);
            return (
              <button key={item.id} onClick={() => setActiveNav(item.id)} title={locked ? "Requires higher partnership level" : item.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: collapsed ? "11px 14px" : "11px 16px", borderRadius: 12, border: "none", cursor: "pointer", background: active ? TEAL_LIGHT : "transparent", color: active ? TEAL_DARK : locked ? "#C5CED8" : TEXT_MID, fontSize: 13, fontWeight: active ? 700 : 500, fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s ease", justifyContent: collapsed ? "center" : "flex-start", position: "relative" }}>
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
            <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: "'Sora', sans-serif" }}>{user.initials || user.email.slice(0, 2).toUpperCase()}</div>
            {!collapsed && (<div style={{ minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{user.display_name || user.full_name || user.email}</div><span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: levelInfo.bg, color: levelInfo.color, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{levelInfo.label}</span></div>)}
          </div>
          {!collapsed && (<a href="/auth/sign-out" style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, color: TEXT_LIGHT, fontSize: 12, fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}><Icon name="logout" size={14} /> Sign out</a>)}
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "16px 30px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 23, fontWeight: 800, color: TEXT, fontFamily: "'Sora', sans-serif" }}>{sectionNames[activeNav]}</h1>
            <p style={{ margin: "3px 0 0", fontSize: 13, color: TEXT_LIGHT, fontFamily: "'DM Sans', sans-serif" }}>Fondazione bioERGOtech ETS · {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ padding: "7px 14px", borderRadius: 10, background: levelInfo.bg, border: `1px solid ${levelInfo.color}30`, display: "flex", alignItems: "center", gap: 6 }}><Icon name="star" size={13} /><span style={{ fontSize: 12, fontWeight: 700, color: levelInfo.color, fontFamily: "'DM Sans', sans-serif" }}>{levelInfo.label}</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "#F3F5F8", border: `1px solid ${BORDER}`, borderRadius: 10 }}><span style={{ color: TEXT_LIGHT }}><Icon name="search" size={14} /></span><input placeholder="Quick search..." style={{ background: "transparent", border: "none", outline: "none", color: TEXT, width: 140, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }} /></div>
            <div style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "#F3F5F8", border: `1px solid ${BORDER}`, color: TEXT_LIGHT, cursor: "pointer", position: "relative" }}><Icon name="bell" size={16} /><div style={{ position: "absolute", top: 8, right: 8, width: 7, height: 7, borderRadius: "50%", background: "#E74C6F", border: "2px solid #fff" }} /></div>
          </div>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "26px 30px" }}>{renderContent()}</div>
      </div>
    </div>
  );
}
