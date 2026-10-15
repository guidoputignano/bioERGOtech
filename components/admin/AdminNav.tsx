"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Navigation for the member portal's Admin Panel.
 *
 * - AdminOverview: the landing page. A welcome banner, "needs your
 *   attention" cards with live counts, and every section grouped by area.
 * - AdminSectionBar: a sticky bar inside a section: back to the overview,
 *   grouped tabs with badges, and "Jump to" search.
 * - AdminJumpTo: the Ctrl+K / Cmd+K search over all sections.
 *
 * The sections themselves (and their icons) are defined by the portal, so
 * this file stays free of the portal's data and helpers.
 */

const TEAL = "#2EC4B6";
const TEAL_DARK = "#1A9E92";
const TEAL_LIGHT = "#E8F8F6";
const NAVY = "#0D1B32";
const TEXT = "#1A2332";
const TEXT_MID = "#4A5568";
const TEXT_LIGHT = "#8896A6";
const BORDER = "#E8EDF3";
const CARD = "#FFFFFF";
const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)";
const SHADOW_HOVER = "0 6px 18px rgba(13,27,50,0.08), 0 2px 6px rgba(13,27,50,0.05)";
const ALERT = "#E74C6F";
/** Space kept clear above and below the section bar once it sticks. */
const STUCK_GAP = 10;

export interface AdminGroup {
  id: string;
  label: string;
  /** Accent colour for the group's icons. */
  color: string;
  tint: string;
}

export interface AdminSection {
  id: string;
  label: string;
  description: string;
  group: string;
  icon: React.ReactNode;
  /** Extra words "Jump to" matches, e.g. "questions certificates" for the Course Monitor. */
  keywords?: string;
  /** Items waiting for action; null or 0 shows no badge. */
  badge?: number | null;
}

export interface AttentionItem {
  section: string;
  label: string;
  count: number | null;
  icon: React.ReactNode;
  color: string;
  tint: string;
}

const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

function Badge({ n, subtle }: { n?: number | null; subtle?: boolean }) {
  if (!n) return null;
  return (
    <span
      aria-label={`${n} waiting`}
      style={{
        minWidth: 20, height: 20, padding: "0 6px", borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700, background: subtle ? "#FDECF1" : ALERT, color: subtle ? ALERT : "#fff", fontVariantNumeric: "tabular-nums",
      }}
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}

// ── Overview ────────────────────────────────────────────────────────────

export function AdminOverview({
  name,
  groups,
  sections,
  attention,
  loading,
  onOpen,
  onJump,
}: {
  name?: string | null;
  groups: AdminGroup[];
  sections: AdminSection[];
  attention: AttentionItem[];
  loading: boolean;
  onOpen: (id: string) => void;
  onJump: () => void;
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const waiting = attention.reduce((n, a) => n + (a.count ?? 0), 0);
  const firstName = name && !name.includes("@") ? name.trim().split(/\s+/)[0] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, animation: "fadeUp 0.35s ease" }}>
      <style>{ADMIN_CSS}</style>
      {/* Banner */}
      <div
        style={{
          position: "relative", overflow: "hidden", borderRadius: 20, padding: "28px clamp(20px, 4vw, 34px)",
          background: `linear-gradient(135deg, ${NAVY} 0%, #14304D 55%, ${TEAL_DARK} 130%)`, color: "#fff",
          boxShadow: "0 12px 32px rgba(13,27,50,0.18)",
        }}
      >
        <div aria-hidden style={{ position: "absolute", right: -60, top: -80, width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(46,196,182,0.35), rgba(46,196,182,0) 70%)" }} />
        <div aria-hidden style={{ position: "absolute", right: 120, bottom: -110, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.10), rgba(255,255,255,0) 70%)" }} />
        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: TEAL, marginBottom: 8 }}>Admin Panel</div>
            <h2 style={{ margin: 0, fontFamily: "'Sora', sans-serif", fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 800, lineHeight: 1.2 }}>
              {greeting}{firstName ? `, ${firstName}` : ""}
            </h2>
            <p style={{ margin: "8px 0 0", fontSize: 14, color: "rgba(255,255,255,0.75)", maxWidth: 520, lineHeight: 1.6 }}>
              {loading
                ? "Checking what needs your attention…"
                : waiting > 0
                  ? `${waiting} item${waiting === 1 ? "" : "s"} waiting for you across the foundation.`
                  : "Everything is up to date. Nothing is waiting for you."}
            </p>
          </div>
          <button
            onClick={onJump}
            style={{
              display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, cursor: "pointer",
              background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.22)", color: "#fff", fontSize: 13, fontWeight: 600,
              backdropFilter: "blur(6px)",
            }}
          >
            <SearchGlyph /> Jump to a section
            <kbd className="admin-kbd" style={kbd(true)}>{isMac() ? "⌘" : "Ctrl"} K</kbd>
          </button>
        </div>
      </div>

      {/* Needs attention */}
      <section aria-label="Needs your attention">
        <h3 style={sectionTitle}>Needs your attention</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
          {attention.map((a) => {
            const clear = !loading && !a.count;
            return (
              <HoverCard key={a.section + a.label} onClick={() => onOpen(a.section)} label={`${a.label}: ${a.count ?? "unknown"}`}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <span style={{ width: 36, height: 36, borderRadius: 11, display: "inline-flex", alignItems: "center", justifyContent: "center", background: clear ? "#F3F5F8" : a.tint, color: clear ? TEXT_LIGHT : a.color }}>
                    {a.icon}
                  </span>
                  {clear ? (
                    <span style={{ fontSize: 11, fontWeight: 700, color: TEAL_DARK, background: TEAL_LIGHT, padding: "3px 8px", borderRadius: 20 }}>All clear</span>
                  ) : (
                    <span style={{ fontSize: 12, fontWeight: 600, color: a.color }}>Review →</span>
                  )}
                </div>
                <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 28, fontWeight: 800, color: clear ? TEXT_LIGHT : TEXT, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                  {loading ? "–" : a.count ?? "–"}
                </div>
                <div style={{ fontSize: 13, color: TEXT_MID, marginTop: 6 }}>{a.label}</div>
              </HoverCard>
            );
          })}
        </div>
      </section>

      {/* All sections */}
      <section aria-label="All sections">
        <h3 style={sectionTitle}>All sections</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 14 }}>
          {groups.map((g) => {
            const items = sections.filter((s) => s.group === g.id);
            if (!items.length) return null;
            return (
              <div key={g.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 8, boxShadow: SHADOW }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px 8px" }}>
                  <span aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", background: g.color }} />
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: TEXT_LIGHT }}>{g.label}</span>
                </div>
                {items.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onOpen(s.id)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: 12, border: "none",
                      background: "transparent", cursor: "pointer", textAlign: "left", transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#F6F8FB")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", background: g.tint, color: g.color }}>
                      {s.icon}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: TEXT }}>{s.label}</span>
                      <span style={{ display: "block", fontSize: 12, color: TEXT_LIGHT, marginTop: 2, lineHeight: 1.45 }}>{s.description}</span>
                    </span>
                    <Badge n={s.badge} />
                    <span aria-hidden style={{ color: "#C4CDD8", fontSize: 18, lineHeight: 1 }}>›</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function HoverCard({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      aria-label={label}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      style={{
        textAlign: "left", cursor: "pointer", background: CARD, border: `1px solid ${hover ? "#D7E0EA" : BORDER}`, borderRadius: 16, padding: "16px 18px",
        boxShadow: hover ? SHADOW_HOVER : SHADOW, transform: hover ? "translateY(-2px)" : "none", transition: "all 0.18s ease",
      }}
    >
      {children}
    </button>
  );
}

// ── Section bar ─────────────────────────────────────────────────────────

export function AdminSectionBar({
  groups,
  sections,
  current,
  onOpen,
  onOverview,
  onJump,
  scrollPadding = 0,
  pageBackground = "#F7F9FC",
}: {
  groups: AdminGroup[];
  sections: AdminSection[];
  current: string;
  onOpen: (id: string) => void;
  onOverview: () => void;
  onJump: () => void;
  /** Top padding of the scrolling element, so the stuck bar sits flush under the page header. */
  scrollPadding?: number;
  /** Fills the strip above the stuck bar, so scrolled content does not show through. */
  pageBackground?: string;
}) {
  const navRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLButtonElement | null>(null);
  // Which ends of the tab row are cut off, for the fades and arrows.
  const [more, setMore] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const n = navRef.current;
    if (!n) return;
    const left = n.scrollLeft > 2;
    const right = n.scrollLeft + n.clientWidth < n.scrollWidth - 2;
    setMore((m) => (m.left === left && m.right === right ? m : { left, right }));
  }, []);

  // Bring the open section into view inside the tab row only (scrollIntoView would also
  // move the page), clear of the arrow and fade at either end.
  const reveal = useCallback(() => {
    const n = navRef.current;
    const el = activeRef.current;
    if (!n || !el) return;
    const pad = 44;
    const nb = n.getBoundingClientRect();
    const eb = el.getBoundingClientRect();
    if (eb.left < nb.left + pad) n.scrollLeft -= nb.left + pad - eb.left;
    else if (eb.right > nb.right - pad) n.scrollLeft += eb.right - (nb.right - pad);
    measure();
  }, [measure]);

  useEffect(() => {
    const n = navRef.current;
    const t = trackRef.current;
    if (!n || !t) return;
    const onBar = new ResizeObserver(measure);
    onBar.observe(n);
    // The tabs widen when badges and fonts arrive, which can push the open one out of view.
    const onTabs = new ResizeObserver(reveal);
    onTabs.observe(t);
    return () => {
      onBar.disconnect();
      onTabs.disconnect();
    };
  }, [measure, reveal]);

  useEffect(() => reveal(), [current, reveal]);

  const nudge = (dir: 1 | -1) => navRef.current?.scrollBy({ left: dir * navRef.current.clientWidth * 0.7, behavior: "smooth" });
  const fade = `linear-gradient(to right, ${more.left ? "transparent" : "#000"} 0, #000 ${more.left ? 40 : 0}px, #000 calc(100% - ${more.right ? 40 : 0}px), ${more.right ? "transparent" : "#000"} 100%)`;

  return (
    <div
      style={{
        position: "sticky", top: -scrollPadding, zIndex: 30, background: pageBackground, containerType: "inline-size",
        // The strip around the bar takes no room in the layout: the negative margins cancel it.
        margin: `-${STUCK_GAP}px 0`, padding: `${STUCK_GAP}px 0`,
      }}
    >
      <style>{ADMIN_CSS}</style>
      <div
        className="admin-bar"
        style={{
          padding: 8, borderRadius: 16, background: CARD, border: `1px solid ${BORDER}`, boxShadow: SHADOW,
          display: "flex", alignItems: "center", gap: 8,
        }}
      >
        <button onClick={onOverview} title="Admin overview" style={{ ...pillBase, background: NAVY, color: "#fff", fontWeight: 700, flexShrink: 0 }}>
          <span aria-hidden>⌂</span> Overview
        </button>
        <div className="admin-bar-tabs" style={{ position: "relative", flex: 1, minWidth: 0, display: "flex" }}>
          {more.left && <ScrollArrow dir={-1} onClick={() => nudge(-1)} />}
          {more.right && <ScrollArrow dir={1} onClick={() => nudge(1)} />}
          <nav
            ref={navRef}
            onScroll={measure}
            aria-label="Admin sections"
            style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", overflowX: "auto", scrollbarWidth: "none", maskImage: fade, WebkitMaskImage: fade }}
          >
            <div ref={trackRef} style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
              {groups.map((g, gi) => {
                const items = sections.filter((s) => s.group === g.id);
                if (!items.length) return null;
                return (
                  <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                    {gi > 0 && <span aria-hidden style={{ width: 1, height: 22, background: BORDER, margin: "0 6px" }} />}
                    {items.map((s) => {
                      const active = s.id === current;
                      return (
                        <button
                          key={s.id}
                          ref={active ? activeRef : undefined}
                          onClick={() => onOpen(s.id)}
                          aria-current={active ? "page" : undefined}
                          title={s.description}
                          style={{
                            ...pillBase,
                            background: active ? g.tint : "transparent",
                            color: active ? g.color : TEXT_MID,
                            fontWeight: active ? 700 : 500,
                            boxShadow: active ? `inset 0 0 0 1px ${g.color}33` : "none",
                          }}
                        >
                          <span style={{ display: "inline-flex", color: active ? g.color : TEXT_LIGHT }}>{s.icon}</span>
                          {s.label}
                          <Badge n={s.badge} subtle={active} />
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </nav>
        </div>
        <button onClick={onJump} title="Jump to a section" className="admin-bar-jump" style={{ ...pillBase, border: `1px solid ${BORDER}`, background: CARD, color: TEXT_LIGHT, flexShrink: 0 }}>
          <SearchGlyph /> <kbd className="admin-kbd" style={kbd(false)}>{isMac() ? "⌘" : "Ctrl"} K</kbd>
        </button>
      </div>
    </div>
  );
}

// ── Jump to ─────────────────────────────────────────────────────────────

export function AdminJumpTo({
  open,
  onClose,
  groups,
  sections,
  onOpen,
}: {
  open: boolean;
  onClose: () => void;
  groups: AdminGroup[];
  sections: AdminSection[];
  onOpen: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const results = useMemo(() => {
    const items = [{ id: "overview", label: "Overview", description: "Everything waiting for you, and all sections", group: "", icon: <span aria-hidden>⌂</span> } as AdminSection, ...sections];
    const term = q.trim().toLowerCase();
    if (!term) return items;
    // Best first: the name starts with the term, then a word of the name, then a word
    // elsewhere, then the term anywhere ("ques" finds questions before requests).
    const words = (text: string) => text.toLowerCase().split(/[^a-z0-9]+/);
    const score = (s: AdminSection) => {
      const label = s.label.toLowerCase();
      const rest = `${s.description} ${s.keywords ?? ""} ${groups.find((g) => g.id === s.group)?.label ?? ""}`;
      if (label.startsWith(term)) return 0;
      if (words(label).some((w) => w.startsWith(term))) return 1;
      if (words(rest).some((w) => w.startsWith(term))) return 2;
      if (`${label} ${rest.toLowerCase()}`.includes(term)) return 3;
      return -1;
    };
    return items
      .map((s, i) => ({ s, i, rank: score(s) }))
      .filter((r) => r.rank >= 0)
      .sort((a, b) => a.rank - b.rank || a.i - b.i)
      .map((r) => r.s);
  }, [q, sections, groups]);

  // The host passes a fresh onClose on every render; a ref keeps the effect below tied to `open` alone.
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  useEffect(() => {
    if (!open) return;
    setQ("");
    setIndex(0);
    // Esc closes even when focus has left the search box.
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeRef.current(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  useEffect(() => setIndex(0), [q]);

  if (!open) return null;

  const choose = (id: string) => {
    onOpen(id);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Jump to a section"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(13,27,50,0.45)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "12vh 16px 16px" }}
    >
      <div style={{ width: "100%", maxWidth: 560, background: CARD, borderRadius: 18, boxShadow: "0 24px 64px rgba(13,27,50,0.3)", overflow: "hidden", animation: "fadeUp 0.18s ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: `1px solid ${BORDER}` }}>
          <span style={{ color: TEXT_LIGHT }}><SearchGlyph /></span>
          <input
            ref={inputRef}
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setIndex((i) => Math.min(i + 1, results.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
              else if (e.key === "Enter" && results[index]) { e.preventDefault(); choose(results[index].id); }
            }}
            placeholder="Jump to… applications, questions, events"
            aria-label="Search sections"
            style={{ flex: 1, border: "none", outline: "none", fontSize: 15, color: TEXT, background: "transparent" }}
          />
          <kbd className="admin-kbd" style={kbd(false)}>Esc</kbd>
        </div>
        <ul role="listbox" style={{ listStyle: "none", margin: 0, padding: 6, maxHeight: "50vh", overflowY: "auto" }}>
          {results.length === 0 && <li style={{ padding: 18, color: TEXT_LIGHT, fontSize: 14, textAlign: "center" }}>No section matches “{q}”.</li>}
          {results.map((s, i) => {
            const g = groups.find((x) => x.id === s.group);
            return (
              <li key={s.id} role="option" aria-selected={i === index}>
                <button
                  onClick={() => choose(s.id)}
                  onMouseEnter={() => setIndex(i)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12, border: "none", cursor: "pointer", textAlign: "left",
                    background: i === index ? TEAL_LIGHT : "transparent",
                  }}
                >
                  <span style={{ width: 32, height: 32, borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", background: g?.tint ?? "#F3F5F8", color: g?.color ?? TEXT_MID, flexShrink: 0 }}>{s.icon}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: TEXT }}>{s.label}</span>
                    <span style={{ display: "block", fontSize: 12, color: TEXT_LIGHT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g ? `${g.label} · ` : ""}{s.description}</span>
                  </span>
                  <Badge n={s.badge} />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// ── Bits ────────────────────────────────────────────────────────────────

// Inline styles cannot hold media or container queries, so the few responsive rules live here.
const ADMIN_CSS = `
@container (max-width: 560px) {
  .admin-bar { flex-wrap: wrap; }
  .admin-bar-tabs { order: 3; flex-basis: 100% !important; }
  .admin-bar-jump { margin-left: auto; }
}
@media (pointer: coarse) { .admin-kbd { display: none; } }
`;

function ScrollArrow({ dir, onClick }: { dir: 1 | -1; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={dir < 0 ? "Show earlier sections" : "Show more sections"}
      style={{
        position: "absolute", top: "50%", [dir < 0 ? "left" : "right"]: -2, transform: "translateY(-50%)", zIndex: 1,
        width: 28, height: 28, borderRadius: "50%", border: `1px solid ${BORDER}`, background: CARD, color: TEXT_MID, cursor: "pointer",
        display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(13,27,50,0.12)", fontSize: 16, lineHeight: 1,
      }}
    >
      {dir < 0 ? "‹" : "›"}
    </button>
  );
}

function SearchGlyph() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

const pillBase: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 12px", borderRadius: 10, border: "none", cursor: "pointer",
  fontSize: 13, whiteSpace: "nowrap", transition: "background 0.15s ease, color 0.15s ease",
};

const sectionTitle: React.CSSProperties = {
  margin: "0 0 12px", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: TEXT_LIGHT,
};

function kbd(dark: boolean): React.CSSProperties {
  return {
    fontFamily: "inherit", fontSize: 11, fontWeight: 600, padding: "2px 6px", borderRadius: 6,
    background: dark ? "rgba(255,255,255,0.14)" : "#F3F5F8", border: `1px solid ${dark ? "rgba(255,255,255,0.22)" : BORDER}`, color: dark ? "#fff" : TEXT_LIGHT,
  };
}
