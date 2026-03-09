"use client";

import { useState, useEffect } from "react";

// ─── DESIGN TOKENS ──────────────────────────────────────────
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

// ─── PARTNERSHIP ACCESS CONTROL ─────────────────────────────
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

// Which sections are locked for each level (shown with upgrade prompt)
const LOCKED_SECTIONS: Record<PartnershipLevel, { id: string; requiredLevel: string }[]> = {
  viewer: [
    { id: "projects", requiredLevel: "Member" },
    { id: "lab", requiredLevel: "Partner" },
    { id: "events", requiredLevel: "Member" },
    { id: "members", requiredLevel: "Member" },
    { id: "knowledge", requiredLevel: "Partner" },
  ],
  member: [
    { id: "lab", requiredLevel: "Partner" },
    { id: "knowledge", requiredLevel: "Partner" },
  ],
  partner: [],
  admin: [],
};

// ─── NAV ITEMS ───────────────────────────────────────────────
const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "grid" },
  { id: "projects", label: "Projects", icon: "layers" },
  { id: "lab", label: "Distributed Lab", icon: "cpu" },
  { id: "events", label: "Events", icon: "calendar" },
  { id: "members", label: "Members", icon: "users" },
  { id: "knowledge", label: "Knowledge Base", icon: "book" },
  { id: "admin", label: "Admin Panel", icon: "shield" },
];

// ─── ICONS ───────────────────────────────────────────────────
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
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    edit: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    logout: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    star: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    chevronRight: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
    clock: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  };
  return <>{icons[name] || null}</>;
};

// ─── DATA ────────────────────────────────────────────────────
const projects = [
  { name: "OncoTarget", pillar: "Synthetic Biology", phase: "Ideation", status: "on-track", lead: "G. Papa & L. Scalise", description: "Gastric cancer organoid pipeline for drug screening and personalized medicine", progress: 35, color: "#E74C6F" },
  { name: "VERO Algorithm", pillar: "Digital Twin", phase: "Production", status: "on-track", lead: "O. Yusuf", description: "Oncological risk assessment based on age and biomarkers", progress: 68, color: TEAL },
  { name: "CranioTech", pillar: "Multi-Omics", phase: "Production", status: "at-risk", lead: "CranioTech Solution", description: "Detection and analysis of cranial neurophysiological parameters", progress: 52, color: "#F0A500" },
  { name: "Lab AI Agents", pillar: "Multi-Omics", phase: "Ideation", status: "on-track", lead: "Z. Li (ETH Zurich)", description: "Protein language models to reduce costs and improve antibody simulations", progress: 20, color: "#7C5CFC" },
  { name: "Xperbot Automation", pillar: "Biomanufacturing", phase: "Ideation", status: "on-track", lead: "H. Huang & X. Wang", description: "Cost-effective automation solutions for cell therapy manufacturing", progress: 15, color: "#00B894" },
];

const equipment = [
  { name: "Flow Cytometer BD FACSAria III", location: "Taranto Lab A", status: "available", utilization: 42 },
  { name: "CRISPR Electroporation System", location: "Zurich UZH", status: "booked", utilization: 78 },
  { name: "Raman Spectrometer", location: "Taranto Lab B", status: "available", utilization: 31 },
  { name: "Organoid Culture Station", location: "Zurich UZH", status: "maintenance", utilization: 65 },
  { name: "High-Throughput Sequencer", location: "Taranto Lab A", status: "available", utilization: 55 },
];

const events = [
  { date: "Feb 15", title: "Project Genesis Intro", type: "internal", location: "Online" },
  { date: "Feb 28", title: "Progress Radar: CranioTech", type: "internal", location: "Taranto" },
  { date: "Mar 12", title: "National Event Rome", type: "national", location: "Camera dei Deputati" },
  { date: "Mar 25", title: "Project Genesis #1", type: "internal", location: "Online" },
  { date: "Apr 8", title: "Board of Advisors", type: "internal", location: "Zurich" },
  { date: "Apr 22", title: "Copy & Improve #1", type: "internal", location: "Taranto" },
  { date: "Nov", title: "Taranto Biotech Days 2026", type: "national", location: "Taranto" },
];

const members = [
  { name: "bioERGOtech Foundation", type: "Foundation", location: "Taranto, IT" },
  { name: "UZH Research Lab", type: "University", location: "Zurich, CH" },
  { name: "ETH Student Project House", type: "University", location: "Zurich, CH" },
  { name: "Xperbot", type: "Startup", location: "Zug, CH" },
  { name: "CranioTech Solution", type: "SME", location: "Puglia, IT" },
  { name: "Riyadh Clinical Hub", type: "Clinical Center", location: "Riyadh, SA" },
];

// ─── UTILS ───────────────────────────────────────────────────
const AnimNum = ({ target, dur = 1200 }: { target: number; dur?: number }) => {
  const [v, setV] = useState(0);
  useEffect(() => {
    let s = 0;
    const step = target / (dur / 16);
    const t = setInterval(() => {
      s += step;
      if (s >= target) { setV(target); clearInterval(t); }
      else setV(Math.floor(s));
    }, 16);
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
  return (
    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: s.bg, color: s.color, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.01em" }}>
      {s.label}
    </span>
  );
};

// ─── LOCKED SECTION OVERLAY ──────────────────────────────────
function LockedOverlay({ requiredLevel, sectionName }: { requiredLevel: string; sectionName: string }) {
  return (
    <div style={{
      position: "absolute", inset: 0, borderRadius: 16, zIndex: 10,
      background: "rgba(247,249,252,0.92)", backdropFilter: "blur(4px)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 12, padding: 32,
    }}>
      <div style={{ width: 52, height: 52, borderRadius: 16, background: "#F3F5F8", display: "flex", alignItems: "center", justifyContent: "center", color: TEXT_LIGHT }}>
        <Icon name="lock" size={24} />
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif", marginBottom: 6 }}>
          {sectionName} Locked
        </div>
        <div style={{ fontSize: 13, color: TEXT_MID, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.55 }}>
          This section requires <strong>{requiredLevel}</strong> partnership level or above.
          Contact your admin to upgrade your access.
        </div>
      </div>
      <div style={{ marginTop: 4, padding: "8px 20px", borderRadius: 10, background: TEAL_LIGHT, color: TEAL_DARK, fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>
        Upgrade to {requiredLevel}
      </div>
    </div>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────
function DashboardView() {
  const stats = [
    { label: "Active Projects", value: 5, icon: "layers", color: TEAL, bg: TEAL_LIGHT },
    { label: "Member Organizations", value: 8, icon: "users", color: "#7C5CFC", bg: "#F0EDFF" },
    { label: "Equipment Shared", value: 12, icon: "cpu", color: "#E74C6F", bg: "#FDECF1" },
    { label: "Upcoming Events", value: 7, icon: "calendar", color: "#F0A500", bg: "#FFF8E6" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "20px 22px", boxShadow: SHADOW, animation: `fadeUp 0.45s ease ${i * 0.08}s both` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: s.bg, color: s.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name={s.icon} size={18} />
              </div>
              <span style={{ fontSize: 12, color: TEXT_LIGHT, fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 34, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif", lineHeight: 1 }}>
              <AnimNum target={s.value} dur={900 + i * 250} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 20 }}>
        {/* Projects preview */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, boxShadow: SHADOW, animation: "fadeUp 0.45s ease 0.32s both" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>Active Projects</h3>
            <span style={{ fontSize: 12, color: TEAL, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>View all →</span>
          </div>
          {projects.slice(0, 4).map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 0", borderBottom: i < 3 ? `1px solid ${BORDER}` : "none" }}>
              <div style={{ width: 4, height: 40, borderRadius: 3, background: p.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, fontFamily: "'DM Sans', sans-serif" }}>{p.name}</div>
                <div style={{ fontSize: 12, color: TEXT_LIGHT, fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>{p.pillar} · {p.lead}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <div style={{ width: 64, height: 5, borderRadius: 3, background: `${p.color}18`, overflow: "hidden" }}>
                  <div style={{ width: `${p.progress}%`, height: "100%", borderRadius: 3, background: p.color, transition: "width 1s ease" }} />
                </div>
                <span style={{ fontSize: 12, color: TEXT_MID, fontFamily: "'Sora', sans-serif", fontWeight: 600, width: 34, textAlign: "right" }}>{p.progress}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Events preview */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, boxShadow: SHADOW, animation: "fadeUp 0.45s ease 0.38s both" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>Upcoming Events</h3>
            <span style={{ fontSize: 12, color: TEAL, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Calendar →</span>
          </div>
          {events.slice(0, 5).map((e, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 0", borderBottom: i < 4 ? `1px solid ${BORDER}` : "none" }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0, background: e.type === "national" ? TEAL_LIGHT : "#F3F5F8", border: `1px solid ${e.type === "national" ? TEAL_MUTED : BORDER}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 11, color: e.type === "national" ? TEAL_DARK : TEXT_MID, fontWeight: 700, fontFamily: "'Sora', sans-serif", lineHeight: 1.2 }}>{e.date.split(" ")[0]}</span>
                {e.date.split(" ")[1] && <span style={{ fontSize: 9, color: TEXT_LIGHT, fontFamily: "'DM Sans', sans-serif" }}>{e.date.split(" ")[1]}</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, fontFamily: "'DM Sans', sans-serif" }}>{e.title}</div>
                <div style={{ fontSize: 11, color: TEXT_LIGHT, fontFamily: "'DM Sans', sans-serif", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                  <Icon name="mapPin" size={11} /> {e.location}
                </div>
              </div>
              <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 20, fontWeight: 600, background: e.type === "national" ? TEAL_LIGHT : "#F3F5F8", color: e.type === "national" ? TEAL_DARK : TEXT_LIGHT, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>{e.type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hubs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[
          { city: "Taranto", country: "Italy", role: "Experimental Hub", icon: "flask", count: 4, color: TEAL, bg: TEAL_LIGHT },
          { city: "Zurich", country: "Switzerland", role: "Talent & Innovation Hub", icon: "dna", count: 3, color: "#7C5CFC", bg: "#F0EDFF" },
          { city: "Riyadh", country: "Saudi Arabia", role: "Clinical Translation Hub", icon: "globe", count: 1, color: "#E74C6F", bg: "#FDECF1" },
        ].map((h, i) => (
          <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 22, boxShadow: SHADOW, position: "relative", overflow: "hidden", animation: `fadeUp 0.45s ease ${0.44 + i * 0.06}s both` }}>
            <div style={{ position: "absolute", bottom: -16, right: -12, opacity: 0.06, color: h.color }}><Icon name={h.icon} size={90} /></div>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: h.bg, color: h.color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <Icon name={h.icon} size={20} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>{h.city}</div>
            <div style={{ fontSize: 12, color: TEXT_LIGHT, fontFamily: "'DM Sans', sans-serif", marginBottom: 6 }}>{h.country}</div>
            <div style={{ fontSize: 12, color: h.color, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{h.role}</div>
            <div style={{ fontSize: 11, color: TEXT_LIGHT, fontFamily: "'DM Sans', sans-serif", marginTop: 4 }}>{h.count} organization{h.count > 1 ? "s" : ""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PROJECTS ────────────────────────────────────────────────
function ProjectsView() {
  const [selected, setSelected] = useState<number | null>(null);
  const pillars = ["All", "Digital Twin", "Synthetic Biology", "Biomanufacturing", "Multi-Omics"];
  const [filter, setFilter] = useState("All");
  const filtered = filter === "All" ? projects : projects.filter(p => p.pillar === filter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
        {pillars.map(p => (
          <button key={p} onClick={() => setFilter(p)} style={{ padding: "7px 16px", borderRadius: 24, fontFamily: "'DM Sans', sans-serif", border: `1.5px solid ${filter === p ? TEAL : BORDER}`, background: filter === p ? TEAL_LIGHT : CARD, color: filter === p ? TEAL_DARK : TEXT_MID, cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.2s ease" }}>{p}</button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
        {filtered.map((p, i) => (
          <div key={i} onClick={() => setSelected(selected === i ? null : i)} style={{ background: CARD, border: `1.5px solid ${selected === i ? p.color + "50" : BORDER}`, borderRadius: 16, padding: 24, cursor: "pointer", boxShadow: selected === i ? SHADOW_HOVER : SHADOW, transition: "all 0.25s ease", animation: `fadeUp 0.4s ease ${i * 0.07}s both` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 12, height: 12, borderRadius: 4, background: p.color }} />
                <span style={{ fontSize: 17, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>{p.name}</span>
              </div>
              <StatusBadge status={p.status} />
            </div>
            <div style={{ fontSize: 12, color: TEXT_MID, fontFamily: "'DM Sans', sans-serif", marginBottom: 4 }}>{p.pillar}</div>
            <p style={{ fontSize: 13, color: TEXT_MID, lineHeight: 1.55, margin: "8px 0 16px", fontFamily: "'DM Sans', sans-serif" }}>{p.description}</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 10, padding: "4px 12px", borderRadius: 20, background: `${p.color}12`, color: p.color, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", fontFamily: "'DM Sans', sans-serif" }}>{p.phase}</span>
              <span style={{ fontSize: 12, color: TEXT_LIGHT, fontFamily: "'DM Sans', sans-serif" }}>Lead: {p.lead}</span>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: TEXT_LIGHT, fontFamily: "'DM Sans', sans-serif" }}>Progress</span>
                <span style={{ fontSize: 12, color: p.color, fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>{p.progress}%</span>
              </div>
              <div style={{ width: "100%", height: 6, borderRadius: 3, background: `${p.color}14` }}>
                <div style={{ width: `${p.progress}%`, height: "100%", borderRadius: 3, background: p.color, transition: "width 0.8s ease" }} />
              </div>
            </div>
            {selected === i && (
              <div style={{ marginTop: 18, paddingTop: 18, borderTop: `1px solid ${BORDER}`, animation: "fadeUp 0.25s ease both" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: TEXT, marginBottom: 10, fontFamily: "'Sora', sans-serif" }}>Quick Actions</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                  {["View Dashboard", "Question Board", "Request Resource", "Updates Feed"].map(a => (
                    <span key={a} style={{ fontSize: 11, padding: "6px 14px", borderRadius: 8, background: "#F3F5F8", border: `1px solid ${BORDER}`, color: TEXT_MID, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>{a}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        <div style={{ background: "transparent", border: `2px dashed ${BORDER}`, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 200, cursor: "pointer", animation: `fadeUp 0.4s ease ${filtered.length * 0.07}s both` }}>
          <div style={{ color: TEXT_LIGHT, marginBottom: 8 }}><Icon name="plus" size={28} /></div>
          <span style={{ fontSize: 14, color: TEXT_LIGHT, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>Propose New Project</span>
        </div>
      </div>
    </div>
  );
}

// ─── DISTRIBUTED LAB ─────────────────────────────────────────
function LabView() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 18px", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, boxShadow: SHADOW }}>
          <span style={{ color: TEXT_LIGHT }}><Icon name="search" size={16} /></span>
          <input placeholder="Search equipment, location, or category..." style={{ background: "transparent", border: "none", outline: "none", color: TEXT, flex: 1, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }} />
        </div>
        <button style={{ padding: "11px 20px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 6, boxShadow: `0 2px 8px ${TEAL}33` }}>
          <Icon name="plus" size={14} /> List Equipment
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[
          { label: "Network Utilization", value: "54%", sub: "Avg. across all equipment", color: TEAL },
          { label: "Cost Savings", value: "€32K", sub: "Estimated this quarter", color: "#7C5CFC" },
          { label: "Bookings This Month", value: "18", sub: "Across 3 locations", color: "#F0A500" },
        ].map((s, i) => (
          <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20, boxShadow: SHADOW, animation: `fadeUp 0.4s ease ${i * 0.08}s both` }}>
            <div style={{ fontSize: 11, color: TEXT_LIGHT, fontFamily: "'DM Sans', sans-serif", marginBottom: 10, textTransform: "uppercase" as const, letterSpacing: "0.06em", fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: s.color, fontFamily: "'Sora', sans-serif", lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: TEXT_LIGHT, fontFamily: "'DM Sans', sans-serif", marginTop: 6 }}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: SHADOW, animation: "fadeUp 0.4s ease 0.24s both" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 100px 130px 100px", padding: "14px 24px", borderBottom: `1px solid ${BORDER}`, fontSize: 11, color: TEXT_LIGHT, textTransform: "uppercase" as const, letterSpacing: "0.07em", fontWeight: 700, fontFamily: "'DM Sans', sans-serif", background: "#FAFBFC" }}>
          <span>Equipment</span><span>Location</span><span>Status</span><span>Utilization</span><span>Action</span>
        </div>
        {equipment.map((e, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 100px 130px 100px", padding: "16px 24px", borderBottom: i < equipment.length - 1 ? `1px solid ${BORDER}` : "none", alignItems: "center", fontFamily: "'DM Sans', sans-serif" }}>
            <span style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>{e.name}</span>
            <span style={{ fontSize: 12, color: TEXT_LIGHT }}>{e.location}</span>
            <span>
              <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, fontWeight: 700, background: e.status === "available" ? "#E6F9F5" : e.status === "booked" ? "#FFF8E6" : "#FDECF1", color: e.status === "available" ? "#0D9373" : e.status === "booked" ? "#C48700" : "#D63563", textTransform: "capitalize" as const }}>{e.status}</span>
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#EEF0F4" }}>
                <div style={{ width: `${e.utilization}%`, height: "100%", borderRadius: 3, background: e.utilization > 70 ? "#F0A500" : TEAL }} />
              </div>
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

// ─── EVENTS ──────────────────────────────────────────────────
function EventsView() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
      {events.map((e, i) => {
        const hl = e.type === "national";
        return (
          <div key={i} style={{ background: CARD, borderRadius: 16, padding: 24, border: `1.5px solid ${hl ? TEAL_MUTED : BORDER}`, boxShadow: SHADOW, animation: `fadeUp 0.4s ease ${i * 0.06}s both`, position: "relative", overflow: "hidden" }}>
            {hl && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${TEAL}, ${TEAL_DARK})` }} />}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <span style={{ fontSize: 10, padding: "4px 10px", borderRadius: 20, fontWeight: 700, background: hl ? TEAL_LIGHT : "#F3F5F8", color: hl ? TEAL_DARK : TEXT_LIGHT, textTransform: "uppercase" as const, letterSpacing: "0.05em", fontFamily: "'DM Sans', sans-serif" }}>{e.type}</span>
              <span style={{ fontSize: 13, color: TEAL_DARK, fontFamily: "'Sora', sans-serif", fontWeight: 700 }}>{e.date}</span>
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif", marginBottom: 8 }}>{e.title}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
              <span style={{ color: TEXT_LIGHT }}><Icon name="mapPin" size={13} /></span>
              <span style={{ fontSize: 13, color: TEXT_MID, fontFamily: "'DM Sans', sans-serif" }}>{e.location}</span>
            </div>
            <button style={{ width: "100%", padding: "9px 0", borderRadius: 10, border: hl ? "none" : `1.5px solid ${BORDER}`, background: hl ? `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})` : CARD, color: hl ? "#fff" : TEXT_MID, cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, boxShadow: hl ? `0 2px 8px ${TEAL}33` : "none" }}>RSVP</button>
          </div>
        );
      })}
    </div>
  );
}

// ─── MEMBERS ─────────────────────────────────────────────────
function MembersView() {
  const tc: Record<string, string> = { Foundation: TEAL, University: "#7C5CFC", Startup: "#00B894", SME: "#F0A500", "Clinical Center": "#E74C6F" };
  const tbg: Record<string, string> = { Foundation: TEAL_LIGHT, University: "#F0EDFF", Startup: "#E6F9F5", SME: "#FFF8E6", "Clinical Center": "#FDECF1" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 28, boxShadow: SHADOW, minHeight: 220, position: "relative", overflow: "hidden", animation: "fadeUp 0.4s ease both" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.025, backgroundImage: `radial-gradient(${TEAL} 1.2px, transparent 1.2px)`, backgroundSize: "28px 28px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, position: "relative" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>Member Network Map</h3>
          <span style={{ fontSize: 12, color: TEXT_LIGHT, fontFamily: "'DM Sans', sans-serif" }}>Google Maps for Nonprofits</span>
        </div>
        <div style={{ position: "relative", height: 150, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {members.map((m, i) => {
            const pos = [
              { left: "40%", top: "38%" }, { left: "44%", top: "14%" }, { left: "45%", top: "18%" },
              { left: "43%", top: "20%" }, { left: "39%", top: "34%" }, { left: "63%", top: "48%" },
            ];
            return (
              <div key={i} title={`${m.name} – ${m.location}`} style={{ position: "absolute", ...pos[i], width: 14, height: 14, borderRadius: "50%", background: tc[m.type], border: "2.5px solid #fff", boxShadow: `0 0 0 3px ${tc[m.type]}25, 0 2px 6px rgba(0,0,0,0.1)`, cursor: "pointer", animation: `pulse 2.5s ease ${i * 0.3}s infinite`, zIndex: 2 }} />
            );
          })}
          <span style={{ fontSize: 40, color: "#E8EDF3", fontFamily: "'Sora', sans-serif", fontWeight: 800, userSelect: "none" as const, letterSpacing: "0.04em" }}>INTERACTIVE MAP</span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {members.map((m, i) => (
          <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20, boxShadow: SHADOW, animation: `fadeUp 0.4s ease ${i * 0.05}s both` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: tbg[m.type], color: tc[m.type], fontSize: 14, fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>{m.name.charAt(0)}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, fontFamily: "'DM Sans', sans-serif" }}>{m.name}</div>
                <div style={{ fontSize: 12, color: TEXT_LIGHT, fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
                  <Icon name="mapPin" size={11} /> {m.location}
                </div>
              </div>
            </div>
            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 14, background: tbg[m.type], color: tc[m.type], fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{m.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── KNOWLEDGE BASE ──────────────────────────────────────────
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
          <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, boxShadow: SHADOW, cursor: "pointer", animation: `fadeUp 0.4s ease ${i * 0.06}s both` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: c.bg, color: c.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name={c.icon} size={20} />
              </div>
              <span style={{ fontSize: 12, color: TEXT_LIGHT, fontFamily: "'Sora', sans-serif", fontWeight: 600 }}>{c.count} docs</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif", marginBottom: 6 }}>{c.name}</div>
            <div style={{ fontSize: 13, color: TEXT_MID, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>{c.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ADMIN PANEL ─────────────────────────────────────────────
type UserProfile = {
  id: string;
  email: string;
  full_name?: string;
  partnership_level: PartnershipLevel;
};

function AdminPanel() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/users")
      .then(r => r.json())
      .then(data => { setUsers(data.users || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const updateLevel = async (userId: string, level: PartnershipLevel) => {
    setSaving(userId);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/set-partnership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, partnershipLevel: level }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, partnership_level: level } : u));
        setMessage({ type: "success", text: "Partnership level updated successfully." });
      } else {
        setMessage({ type: "error", text: data.error || "Failed to update." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header banner */}
      <div style={{ background: "#FDECF1", border: "1px solid #F9C3CE", borderRadius: 14, padding: "16px 22px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ color: "#E74C6F" }}><Icon name="shield" size={20} /></div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>Admin Panel</div>
          <div style={{ fontSize: 12, color: TEXT_MID, fontFamily: "'DM Sans', sans-serif" }}>Manage user partnership levels. Changes take effect immediately on next login.</div>
        </div>
      </div>

      {message && (
        <div style={{ padding: "12px 18px", borderRadius: 10, background: message.type === "success" ? "#E6F9F5" : "#FDECF1", border: `1px solid ${message.type === "success" ? "#A3E4D7" : "#F9C3CE"}`, color: message.type === "success" ? "#0D9373" : "#D63563", fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
          {message.text}
        </div>
      )}

      {/* Partnership level legend */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {(Object.entries(PARTNERSHIP_ACCESS) as [PartnershipLevel, string[]][]).map(([level, access]) => {
          const lbl = PARTNERSHIP_LABELS[level];
          return (
            <div key={level} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, boxShadow: SHADOW }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 14, background: lbl.bg, color: lbl.color, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{lbl.label}</span>
              </div>
              <div style={{ fontSize: 11, color: TEXT_LIGHT, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>
                {access.map(a => <div key={a}>· {a.charAt(0).toUpperCase() + a.slice(1)}</div>)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Users table */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: SHADOW }}>
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>Registered Users</h3>
          <span style={{ fontSize: 12, color: TEXT_LIGHT, fontFamily: "'DM Sans', sans-serif" }}>{users.length} users total</span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT, fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>Loading users…</div>
        ) : users.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT, fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>No users found.</div>
        ) : (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 200px", padding: "12px 24px", background: "#FAFBFC", borderBottom: `1px solid ${BORDER}`, fontSize: 11, color: TEXT_LIGHT, textTransform: "uppercase" as const, letterSpacing: "0.07em", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>
              <span>Email</span><span>Name</span><span>Partnership Level</span>
            </div>
            {users.map((u, i) => {
              const lbl = PARTNERSHIP_LABELS[u.partnership_level] || PARTNERSHIP_LABELS.viewer;
              return (
                <div key={u.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 200px", padding: "16px 24px", borderBottom: i < users.length - 1 ? `1px solid ${BORDER}` : "none", alignItems: "center", fontFamily: "'DM Sans', sans-serif" }}>
                  <span style={{ fontSize: 13, color: TEXT, fontWeight: 500 }}>{u.email}</span>
                  <span style={{ fontSize: 13, color: TEXT_MID }}>{u.full_name || "—"}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <select
                      value={u.partnership_level}
                      onChange={e => updateLevel(u.id, e.target.value as PartnershipLevel)}
                      disabled={saving === u.id}
                      style={{
                        padding: "6px 10px", borderRadius: 8, border: `1.5px solid ${lbl.color}30`,
                        background: lbl.bg, color: lbl.color, fontSize: 12, fontWeight: 700,
                        fontFamily: "'DM Sans', sans-serif", cursor: "pointer", outline: "none",
                        opacity: saving === u.id ? 0.6 : 1,
                      }}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="member">Member</option>
                      <option value="partner">Partner</option>
                      <option value="admin">Admin</option>
                    </select>
                    {saving === u.id && <span style={{ fontSize: 11, color: TEXT_LIGHT }}>Saving…</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SECTION WRAPPER WITH ACCESS CONTROL ─────────────────────
function SectionWrapper({
  sectionId,
  sectionName,
  partnershipLevel,
  children,
}: {
  sectionId: string;
  sectionName: string;
  partnershipLevel: PartnershipLevel;
  children: React.ReactNode;
}) {
  const lockedEntry = LOCKED_SECTIONS[partnershipLevel]?.find(s => s.id === sectionId);
  if (lockedEntry) {
    return (
      <div style={{ position: "relative", minHeight: 300 }}>
        {/* Blurred preview */}
        <div style={{ filter: "blur(6px)", pointerEvents: "none", userSelect: "none" as const, opacity: 0.4 }}>
          {children}
        </div>
        <LockedOverlay requiredLevel={lockedEntry.requiredLevel} sectionName={sectionName} />
      </div>
    );
  }
  return <>{children}</>;
}

// ─── MAIN PORTAL ─────────────────────────────────────────────
export interface PortalUser {
  email: string;
  sub: string;
  full_name?: string;
  partnership_level: PartnershipLevel;
  initials?: string;
  display_name?: string;
}

export default function BioERGOtechPortal({ user }: { user: PortalUser }) {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);

  const partnershipLevel = user.partnership_level;
  const accessibleSections = PARTNERSHIP_ACCESS[partnershipLevel] || PARTNERSHIP_ACCESS.viewer;
  const levelInfo = PARTNERSHIP_LABELS[partnershipLevel] || PARTNERSHIP_LABELS.viewer;

  const sectionNames: Record<string, string> = {
    dashboard: "Dashboard",
    projects: "Project Tracker",
    lab: "Distributed Laboratory",
    events: "Events & Meetings",
    members: "Member Network",
    knowledge: "Knowledge Base",
    admin: "Admin Panel",
  };

  // Visible nav items: accessible ones + locked preview for inaccessible (except admin)
  const visibleNav = navItems.filter(item => {
    if (item.id === "admin") return partnershipLevel === "admin";
    return true; // show all, locked ones will show overlay
  });

  const renderContent = () => {
    switch (activeNav) {
      case "dashboard":
        return <DashboardView />;
      case "projects":
        return (
          <SectionWrapper sectionId="projects" sectionName="Projects" partnershipLevel={partnershipLevel}>
            <ProjectsView />
          </SectionWrapper>
        );
      case "lab":
        return (
          <SectionWrapper sectionId="lab" sectionName="Distributed Lab" partnershipLevel={partnershipLevel}>
            <LabView />
          </SectionWrapper>
        );
      case "events":
        return (
          <SectionWrapper sectionId="events" sectionName="Events" partnershipLevel={partnershipLevel}>
            <EventsView />
          </SectionWrapper>
        );
      case "members":
        return (
          <SectionWrapper sectionId="members" sectionName="Members" partnershipLevel={partnershipLevel}>
            <MembersView />
          </SectionWrapper>
        );
      case "knowledge":
        return (
          <SectionWrapper sectionId="knowledge" sectionName="Knowledge Base" partnershipLevel={partnershipLevel}>
            <KnowledgeView />
          </SectionWrapper>
        );
      case "admin":
        return partnershipLevel === "admin" ? <AdminPanel /> : null;
      default:
        return <DashboardView />;
    }
  };

  const isLocked = (sectionId: string) =>
    !accessibleSections.includes(sectionId);

  return (
    <div style={{ display: "flex", height: "100vh", width: "100%", background: BG, fontFamily: "'DM Sans', sans-serif", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sora:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.25); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #D5DAE3; border-radius: 10px; }
        ::placeholder { color: #A8B5C4; }
        button:hover { filter: brightness(0.97); }
      `}</style>

      {/* Sidebar */}
      <div style={{ width: collapsed ? 68 : 240, background: "#fff", borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", transition: "width 0.3s ease", flexShrink: 0, boxShadow: "1px 0 8px rgba(0,0,0,0.02)" }}>
        {/* Logo */}
        <div style={{ padding: collapsed ? "22px 14px" : "22px 22px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setCollapsed(!collapsed)}>
          <div style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "'Sora', sans-serif", boxShadow: `0 2px 8px ${TEAL}33` }}>bE</div>
          {!collapsed && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>bio<span style={{ color: TEAL }}>ERGO</span>tech</div>
              <div style={{ fontSize: 10, color: TEXT_LIGHT, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>Member Portal</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "16px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
          {visibleNav.map(item => {
            const active = activeNav === item.id;
            const locked = isLocked(item.id);
            return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                title={locked ? `Requires higher partnership level` : item.label}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: collapsed ? "11px 14px" : "11px 16px",
                  borderRadius: 12, border: "none", cursor: "pointer",
                  background: active ? TEAL_LIGHT : "transparent",
                  color: active ? TEAL_DARK : locked ? "#C5CED8" : TEXT_MID,
                  fontSize: 13, fontWeight: active ? 700 : 500,
                  fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s ease",
                  justifyContent: collapsed ? "center" : "flex-start",
                  position: "relative",
                }}
              >
                {active && <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: 22, borderRadius: 2, background: TEAL }} />}
                <Icon name={item.icon} size={18} />
                {!collapsed && (
                  <span style={{ flex: 1 }}>{item.label}</span>
                )}
                {!collapsed && locked && (
                  <span style={{ color: "#C5CED8" }}><Icon name="lock" size={13} /></span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div style={{ padding: collapsed ? "16px 10px" : "16px 18px", borderTop: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: "'Sora', sans-serif" }}>
              {user.initials || user.email.slice(0, 2).toUpperCase()}
            </div>
            {!collapsed && (
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{user.display_name || user.full_name || user.email}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: levelInfo.bg, color: levelInfo.color, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{levelInfo.label}</span>
                </div>
              </div>
            )}
          </div>
          {!collapsed && (
            <a href="/auth/logout" style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, color: TEXT_LIGHT, fontSize: 12, fontFamily: "'DM Sans', sans-serif", textDecoration: "none", transition: "all 0.15s ease" }}>
              <Icon name="logout" size={14} /> Sign out
            </a>
          )}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "16px 30px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 23, fontWeight: 800, color: TEXT, fontFamily: "'Sora', sans-serif" }}>{sectionNames[activeNav]}</h1>
            <p style={{ margin: "3px 0 0", fontSize: 13, color: TEXT_LIGHT, fontFamily: "'DM Sans', sans-serif" }}>
              Fondazione bioERGOtech ETS · {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Partnership badge */}
            <div style={{ padding: "7px 14px", borderRadius: 10, background: levelInfo.bg, border: `1px solid ${levelInfo.color}30`, display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="star" size={13} />
              <span style={{ fontSize: 12, fontWeight: 700, color: levelInfo.color, fontFamily: "'DM Sans', sans-serif" }}>{levelInfo.label}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "#F3F5F8", border: `1px solid ${BORDER}`, borderRadius: 10 }}>
              <span style={{ color: TEXT_LIGHT }}><Icon name="search" size={14} /></span>
              <input placeholder="Quick search..." style={{ background: "transparent", border: "none", outline: "none", color: TEXT, width: 140, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }} />
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "#F3F5F8", border: `1px solid ${BORDER}`, color: TEXT_LIGHT, cursor: "pointer", position: "relative" }}>
              <Icon name="bell" size={16} />
              <div style={{ position: "absolute", top: 8, right: 8, width: 7, height: 7, borderRadius: "50%", background: "#E74C6F", border: "2px solid #fff" }} />
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "26px 30px" }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
