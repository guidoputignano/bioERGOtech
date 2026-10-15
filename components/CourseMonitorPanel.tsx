"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Course Monitor: the admin view of the Agentic AI course.
 *
 * Three views over the same data:
 * - Students: progress, project repository, check result, certificate. This is
 *   where certificates are issued, one at a time or in bulk, and only to
 *   students the server agrees are eligible.
 * - Questions: open student questions, oldest first, with a Claude draft
 *   the admin edits before sending.
 * - Drop-off: how many students reached each lesson.
 */

const TEAL = "#00C4B4";
const TEAL_DARK = "#009688"; // bars: passes 3:1 against white, TEAL does not
const TEAL_LIGHT = "#E6F9F7";
const NAVY = "#0D1B32";
const TEXT = "#1A2332";
const TEXT_MID = "#4A5568";
const TEXT_LIGHT = "#718096";
const BORDER = "#E2E8F0";
const CARD = "#FFFFFF";
const SHADOW = "0 2px 12px rgba(0,0,0,0.05)";
const AMBER = "#B7791F";
const AMBER_BG = "#FFF8E6";
const RED = "#C0392B";
const RED_BG = "#FDECEA";

interface StudentRow {
  user_id: string;
  name: string | null;
  email: string | null;
  student_id: string;
  lessons_done: number;
  missing_core: number;
  track_done: boolean;
  lessons_complete: boolean;
  last_activity: string | null;
  open_questions: number;
  project_full_name: string | null;
  project_url: string | null;
  project_fork: boolean;
  submitted_at: string | null;
  checked_at: string | null;
  check_passed: boolean | null;
  check_error: string | null;
  cert_id: string | null;
  cert_issued_at: string | null;
  cert_legacy: boolean;
  cert_verified: boolean;
  cert_emailed: boolean;
  eligible: boolean;
  reasons: string[];
}

interface Overview {
  students: StudentRow[];
  lessonFunnel: { slug: string; number: string; title: string; students: number }[];
  totals: Record<string, number>;
  lessonsTotal: number;
}

interface Question {
  id: string;
  lesson_slug: string;
  lesson_title: string;
  student_id: string | null;
  reflection: string | null;
  question: string;
  comment: string | null;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
  updated_at: string | null;
  profiles: { full_name: string | null; email: string | null } | null;
}

type Filter = "all" | "eligible" | "review" | "progress" | "certified" | "cert_action" | "no_project";

const FILTERS: { id: Filter; label: string; test: (s: StudentRow) => boolean }[] = [
  { id: "all", label: "All", test: () => true },
  { id: "eligible", label: "Ready to certify", test: (s) => s.eligible },
  { id: "review", label: "Submitted, needs fixes", test: (s) => !!s.submitted_at && !s.eligible && !s.cert_id },
  { id: "progress", label: "In progress", test: (s) => !s.submitted_at && !s.cert_id },
  { id: "certified", label: "Certified", test: (s) => !!s.cert_id },
  { id: "cert_action", label: "Certificate needs action", test: (s) => !!s.cert_id && (!s.cert_verified || !s.cert_emailed) },
  { id: "no_project", label: "No project yet", test: (s) => !s.project_url && !s.cert_id },
];

const PAGE = 50;

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";

const daysSince = (iso: string | null) => (iso ? Math.floor((Date.now() - Date.parse(iso)) / 86_400_000) : 0);

export default function CourseMonitorPanel({
  adminUserId,
  initialView = "students",
  onChanged,
}: {
  adminUserId?: string;
  initialView?: "students" | "questions" | "funnel";
  /** Called after a reply, check or certificate action, so the host can refresh its counts. */
  onChanged?: () => void;
}) {
  const [view, setView] = useState<"students" | "questions" | "funnel">(initialView);
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    // Long messages (a bulk run naming failures) stay up long enough to read.
    setTimeout(() => setToast((t) => (t === msg ? null : t)), msg.length > 90 ? 12000 : 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/course/overview", { cache: "no-store" });
      const json = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const changed = () => {
    load();
    onChanged?.();
  };

  const t = data?.totals;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Stat tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
        <Tile label="Students" value={t?.students} />
        <Tile label="Active, last 7 days" value={t?.active7d} />
        <Tile label="All lessons done" value={t?.lessonsComplete} />
        <Tile label="Projects linked" value={t?.projects} />
        <Tile label="Projects submitted" value={t?.submitted} />
        <Tile label="Ready to certify" value={t?.eligible} accent={!!t?.eligible} />
        <Tile label="Certified" value={t?.certified} />
        <Tile label="Open questions" value={t?.openQuestions} warn={!!t?.openQuestions} />
      </div>

      {/* View switch */}
      <div style={{ display: "flex", gap: 4, background: "#F3F5F8", borderRadius: 12, padding: 4, flexWrap: "wrap", alignSelf: "flex-start" }}>
        {([
          ["students", "Students"],
          ["questions", `Questions${t?.openQuestions ? ` (${t.openQuestions})` : ""}`],
          ["funnel", "Lesson drop-off"],
        ] as const).map(([id, label]) => (
          <button key={id} onClick={() => setView(id)} style={{ padding: "8px 16px", borderRadius: 9, border: "none", fontSize: 13, cursor: "pointer", background: view === id ? CARD : "transparent", color: view === id ? TEXT : TEXT_LIGHT, fontWeight: view === id ? 700 : 500, boxShadow: view === id ? SHADOW : "none" }}>
            {label}
          </button>
        ))}
        <button onClick={load} disabled={loading} style={{ padding: "8px 14px", borderRadius: 9, border: "none", background: "transparent", color: TEAL_DARK, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          {loading ? "Loading…" : "↻ Refresh"}
        </button>
      </div>

      {error && <Banner tone="error">{error}</Banner>}

      {view === "students" && data && (
        <StudentsView data={data} onChanged={changed} showToast={showToast} />
      )}
      {view === "questions" && (
        <QuestionsView adminUserId={adminUserId} showToast={showToast} onAnswered={changed} />
      )}
      {view === "funnel" && data && <FunnelView data={data} />}

      {toast && (
        <div role="status" style={{ position: "fixed", bottom: 24, right: 24, background: NAVY, color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", zIndex: 9999, maxWidth: 420 }}>
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Students ────────────────────────────────────────────────────────────

function StudentsView({ data, onChanged, showToast }: { data: Overview; onChanged: () => void; showToast: (m: string) => void }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [bulk, setBulk] = useState<{ done: number; total: number; failed: number } | null>(null);

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.id, data.students.filter(f.test).length])) as Record<Filter, number>,
    [data.students],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const test = FILTERS.find((f) => f.id === filter)!.test;
    return data.students.filter(
      (s) =>
        test(s) &&
        (!q ||
          [s.name, s.email, s.student_id, s.project_full_name].some((v) => v?.toLowerCase().includes(q))),
    );
  }, [data.students, filter, query]);

  const eligibleSelected = rows.filter((s) => selected.has(s.user_id) && s.eligible);

  const runCheck = async (s: StudentRow) => {
    setBusy(s.user_id);
    try {
      const res = await fetch("/api/admin/course/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: s.user_id }) });
      const json = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      showToast(res.ok ? (json.result.passed ? `✓ All checks pass for ${s.name || s.email}` : `Checks ran: ${json.result.error ?? "some items still failing"}`) : `Error: ${json.error}`);
      onChanged();
    } finally {
      setBusy(null);
    }
  };

  const issue = async (s: StudentRow, opts: { resend?: boolean; override_reason?: string } = {}) => {
    try {
      const res = await fetch("/api/admin/approve-certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: s.user_id, ...opts }),
      });
      // A gateway timeout comes back as HTML, not JSON.
      const json = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      return { ok: res.ok, status: res.status, json };
    } catch {
      return { ok: false, status: 0, json: { error: "Network error" } };
    }
  };

  const certAction = async (s: StudentRow, action: "confirm" | "revoke") => {
    let reason: string | undefined;
    if (action === "confirm") {
      if (!window.confirm(`Confirm certificate ${s.cert_id} for ${s.name || s.email}? Only confirm it if it matches a certificate the old system actually emailed. It will then show as valid on /verify.`)) return;
    } else {
      const r = window.prompt(`Revoke certificate ${s.cert_id} for ${s.name || s.email}? It will stop verifying, and a new one can be issued.\n\nReason (kept with the record):`);
      if (!r?.trim()) return;
      reason = r.trim();
    }
    setBusy(s.user_id);
    try {
      const res = await fetch("/api/admin/course/certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cert_id: s.cert_id, action, reason }),
      });
      const json = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      showToast(res.ok ? `✓ Certificate ${s.cert_id} ${action === "confirm" ? "confirmed" : "revoked"}` : `Error: ${json.error}`);
      onChanged();
    } finally {
      setBusy(null);
    }
  };

  const issueOne = async (s: StudentRow) => {
    const who = s.name || s.email || "this student";
    let override: string | undefined;
    if (!s.eligible) {
      const reason = window.prompt(
        `${who} does not meet the automatic rule:\n\n• ${s.reasons.join("\n• ")}\n\nTo issue anyway, give a reason (it is stored with the certificate):`,
      );
      if (!reason?.trim()) return;
      override = reason.trim();
    } else if (!window.confirm(`Issue and email the certificate to ${who}?`)) {
      return;
    }
    setBusy(s.user_id);
    try {
      const { ok, json } = await issue(s, { override_reason: override });
      showToast(ok ? `✓ Certificate ${json.certId} sent to ${json.sentTo}` : `Error: ${json.error}${json.reasons ? ` (${json.reasons.join("; ")})` : ""}`);
      onChanged();
    } finally {
      setBusy(null);
    }
  };

  const resend = async (s: StudentRow) => {
    // Not s.email: that is the editable profile address, and the certificate
    // goes to the address the student signs in with. The toast names it.
    if (!window.confirm(`Email certificate ${s.cert_id} again to ${s.name || "this student"}? It goes to the address they sign in with.`)) return;
    setBusy(s.user_id);
    try {
      const { ok, json } = await issue(s, { resend: true });
      showToast(ok ? `✓ Resent ${json.certId} to ${json.sentTo}` : `Error: ${json.error}`);
      // Clears "Not emailed" at once, so nobody presses Resend twice.
      onChanged();
    } finally {
      setBusy(null);
    }
  };

  const issueBulk = async () => {
    const list = eligibleSelected;
    if (!list.length || !window.confirm(`Issue and email certificates to ${list.length} student${list.length === 1 ? "" : "s"}?`)) return;
    setBulk({ done: 0, total: list.length, failed: 0 });
    const notIssued: string[] = [];
    const notEmailed: string[] = [];
    const already: string[] = [];
    const unknown: string[] = [];
    const who = (s: StudentRow) => s.name || s.email || s.user_id;
    try {
      // One at a time: each issue generates a file and sends an email, and
      // the email provider rate-limits bursts.
      for (let i = 0; i < list.length; i++) {
        const { ok, status, json } = await issue(list[i]);
        if (!ok) {
          const w = who(list[i]);
          if (json?.emailFailed) notEmailed.push(w); // issued, email did not go out
          else if (status === 409 && json?.alreadyIssued) already.push(w); // someone else issued it meanwhile
          else if (status === 0 || status >= 500) unknown.push(w); // may have been issued before the failure
          else notIssued.push(w);
        }
        setBulk({ done: i + 1, total: list.length, failed: notIssued.length + notEmailed.length + already.length + unknown.length });
      }
      const names = (l: string[]) => `${l.slice(0, 5).join(", ")}${l.length > 5 ? "…" : ""}`;
      const issued = list.length - notIssued.length - already.length - unknown.length;
      showToast(
        `Issued ${issued} certificate${issued === 1 ? "" : "s"}.` +
          (notEmailed.length ? ` Email failed for ${notEmailed.length} (marked "Not emailed", use Resend): ${names(notEmailed)}.` : "") +
          (already.length ? ` Already certified: ${names(already)}.` : "") +
          (unknown.length ? ` Outcome unknown, check these rows in the refreshed list: ${names(unknown)}.` : "") +
          (notIssued.length ? ` Not issued: ${names(notIssued)}.` : ""),
      );
    } finally {
      setSelected(new Set());
      setBulk(null);
      onChanged();
    }
  };

  const exportCsv = () => {
    const header = ["name", "email", "student_id", "lessons_done", "missing_core", "project", "submitted_at", "checks", "eligible", "cert_id", "missing"];
    const lines = rows.map((s) =>
      [s.name, s.email, s.student_id, s.lessons_done, s.missing_core, s.project_url, s.submitted_at, s.check_passed === null ? "" : s.check_passed ? "pass" : "fail", s.eligible, s.cert_id, s.reasons.join("; ")]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `agentic-ai-students-${filter}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, boxShadow: SHADOW, overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => { setFilter(f.id); setShown(PAGE); }} style={{ padding: "6px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer", border: `1px solid ${filter === f.id ? TEAL : BORDER}`, background: filter === f.id ? TEAL_LIGHT : CARD, color: filter === f.id ? TEAL_DARK : TEXT_MID, fontWeight: filter === f.id ? 700 : 500 }}>
              {f.label} <span style={{ color: TEXT_LIGHT, fontWeight: 500 }}>{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <input value={query} onChange={(e) => { setQuery(e.target.value); setShown(PAGE); }} placeholder="Search name, email, GitHub, ID" aria-label="Search students" style={{ marginLeft: "auto", flex: "0 1 260px", minWidth: 160, padding: "8px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, outline: "none" }} />
        <button onClick={exportCsv} style={ghostBtn}>Export CSV</button>
      </div>

      {eligibleSelected.length > 0 && (
        <div style={{ padding: "10px 20px", background: TEAL_LIGHT, display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: TEAL_DARK, flexWrap: "wrap" }}>
          <strong>{eligibleSelected.length} ready to certify selected</strong>
          <button onClick={issueBulk} disabled={!!bulk} style={primaryBtn}>
            {bulk ? `Issuing ${bulk.done} of ${bulk.total}…` : `🎓 Issue ${eligibleSelected.length} certificate${eligibleSelected.length === 1 ? "" : "s"}`}
          </button>
          <button onClick={() => setSelected(new Set())} style={{ ...ghostBtn, border: "none" }}>Clear</button>
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 920 }}>
          <thead>
            <tr style={{ background: "#F7F9FC", textAlign: "left", color: TEXT_LIGHT, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              <th style={th}>
                <input
                  type="checkbox"
                  aria-label="Select all ready to certify"
                  checked={rows.some((s) => s.eligible) && rows.filter((s) => s.eligible).every((s) => selected.has(s.user_id))}
                  onChange={(e) => setSelected(e.target.checked ? new Set(rows.filter((s) => s.eligible).map((s) => s.user_id)) : new Set())}
                />
              </th>
              <th style={th}>Student</th>
              <th style={th}>Lessons</th>
              <th style={th}>Project repository</th>
              <th style={th}>Submission</th>
              <th style={th}>Certificate</th>
              <th style={{ ...th, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: TEXT_LIGHT }}>No students match.</td></tr>
            )}
            {rows.slice(0, shown).map((s) => (
              <StudentTableRow
                key={s.user_id}
                s={s}
                total={data.lessonsTotal}
                busy={busy === s.user_id}
                selected={selected.has(s.user_id)}
                expanded={expanded === s.user_id}
                onToggleSelect={(on) => setSelected((prev) => { const n = new Set(prev); if (on) n.add(s.user_id); else n.delete(s.user_id); return n; })}
                onToggleExpand={() => setExpanded((e) => (e === s.user_id ? null : s.user_id))}
                onCheck={() => runCheck(s)}
                onIssue={() => issueOne(s)}
                onResend={() => resend(s)}
                onConfirm={() => certAction(s, "confirm")}
                onRevoke={() => certAction(s, "revoke")}
              />
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > shown && (
        <div style={{ padding: 14, textAlign: "center", borderTop: `1px solid ${BORDER}` }}>
          <button onClick={() => setShown((n) => n + PAGE)} style={ghostBtn}>Show {Math.min(PAGE, rows.length - shown)} more of {rows.length - shown}</button>
        </div>
      )}
    </div>
  );
}

function StudentTableRow({
  s, total, busy, selected, expanded, onToggleSelect, onToggleExpand, onCheck, onIssue, onResend, onConfirm, onRevoke,
}: {
  s: StudentRow; total: number; busy: boolean; selected: boolean; expanded: boolean;
  onToggleSelect: (on: boolean) => void; onToggleExpand: () => void; onCheck: () => void; onIssue: () => void; onResend: () => void;
  onConfirm: () => void; onRevoke: () => void;
}) {
  const pct = Math.round((s.lessons_done / Math.max(1, total)) * 100);
  return (
    <>
      <tr style={{ borderTop: `1px solid ${BORDER}`, background: expanded ? "#FAFBFC" : CARD, verticalAlign: "top" }}>
        <td style={td}>
          <input type="checkbox" aria-label={`Select ${s.name || s.email}`} disabled={!s.eligible} checked={selected} onChange={(e) => onToggleSelect(e.target.checked)} />
        </td>
        <td style={td}>
          <div style={{ fontWeight: 700, color: TEXT }}>{s.name || <span style={{ color: TEXT_LIGHT }}>No name</span>}</div>
          <div style={{ color: TEXT_LIGHT, fontSize: 12 }}>{s.email}</div>
          <div style={{ color: TEXT_LIGHT, fontSize: 11, fontFamily: "monospace" }}>{s.student_id}</div>
          {s.last_activity && <div style={{ color: TEXT_LIGHT, fontSize: 11 }}>Active {fmtDate(s.last_activity)}</div>}
        </td>
        <td style={td}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }} title={`${s.lessons_done} of ${total} lesson reflections`}>
            <div style={{ width: 70, height: 6, background: BORDER, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: s.lessons_complete ? TEAL_DARK : AMBER }} />
            </div>
            <span style={{ color: TEXT }}>{s.lessons_done}/{total}</span>
          </div>
          {s.missing_core > 0 && <div style={{ color: TEXT_LIGHT, fontSize: 11, marginTop: 3 }}>{s.missing_core} core missing</div>}
          {!s.track_done && <div style={{ color: TEXT_LIGHT, fontSize: 11 }}>No track lesson</div>}
          {s.open_questions > 0 && <div style={{ color: AMBER, fontSize: 11, fontWeight: 600, marginTop: 3 }}>{s.open_questions} open question{s.open_questions === 1 ? "" : "s"}</div>}
        </td>
        <td style={td}>
          {s.project_url ? (
            <>
              <a href={s.project_url} target="_blank" rel="noopener noreferrer" style={{ color: TEAL_DARK, fontWeight: 600, overflowWrap: "anywhere" }}>{s.project_full_name}</a>
              {s.project_fork && <div style={{ color: AMBER, fontSize: 11 }}>⚠ Fork: compare with the original</div>}
            </>
          ) : (
            <span style={{ color: TEXT_LIGHT }}>No repository yet</span>
          )}
        </td>
        <td style={td}>
          {s.submitted_at ? (
            <>
              <div style={{ color: TEXT }}>Submitted {fmtDate(s.submitted_at)}</div>
              {s.check_error ? (
                <Pill tone="error">Checks could not run</Pill>
              ) : s.check_passed ? (
                <Pill tone="ok">✓ Checks pass</Pill>
              ) : (
                <Pill tone="warn">✗ Checks failing</Pill>
              )}
            </>
          ) : (
            <span style={{ color: TEXT_LIGHT }}>Not submitted</span>
          )}
        </td>
        <td style={td}>
          {s.cert_id ? (
            <>
              <a href={`/verify/${s.cert_id}`} target="_blank" rel="noopener noreferrer" style={{ color: TEAL_DARK, fontFamily: "monospace", fontWeight: 600 }}>{s.cert_id}</a>
              <div style={{ color: TEXT_LIGHT, fontSize: 11 }}>{fmtDate(s.cert_issued_at)}{s.cert_legacy ? " · from old system" : ""}</div>
              {!s.cert_verified && <Pill tone="warn">Pending confirmation</Pill>}
              {s.cert_verified && !s.cert_emailed && <Pill tone="error">Not emailed</Pill>}
            </>
          ) : s.eligible ? (
            <Pill tone="ok">Ready to certify</Pill>
          ) : (
            <button onClick={onToggleExpand} style={{ ...ghostBtn, padding: "3px 8px", fontSize: 11 }}>
              {s.reasons.length} missing {expanded ? "▴" : "▾"}
            </button>
          )}
        </td>
        <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
          <div style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {s.project_url && !s.cert_id && (
              <button onClick={onCheck} disabled={busy} style={ghostBtn}>{busy ? "…" : "Run checks"}</button>
            )}
            {s.cert_id ? (
              <>
                {s.cert_verified ? (
                  <button onClick={onResend} disabled={busy} style={s.cert_emailed ? ghostBtn : primaryBtn}>Resend</button>
                ) : (
                  <button onClick={onConfirm} disabled={busy} style={primaryBtn} title="Only if it matches a certificate the old system emailed">Confirm</button>
                )}
                <button onClick={onRevoke} disabled={busy} style={{ ...ghostBtn, color: RED }}>Revoke…</button>
              </>
            ) : (
              <button onClick={onIssue} disabled={busy} style={s.eligible ? primaryBtn : { ...ghostBtn, color: TEXT_LIGHT }} title={s.eligible ? "Issue and email the certificate" : "Issue outside the automatic rule (asks for a reason)"}>
                {s.eligible ? "🎓 Approve & issue" : "Issue anyway…"}
              </button>
            )}
          </div>
        </td>
      </tr>
      {expanded && !s.cert_id && (
        <tr style={{ background: "#FAFBFC" }}>
          <td />
          <td colSpan={6} style={{ ...td, paddingTop: 0 }}>
            <div style={{ fontSize: 12, color: TEXT_MID }}>
              <strong style={{ color: TEXT }}>Still missing:</strong>
              <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                {s.reasons.map((r) => <li key={r}>{r}</li>)}
              </ul>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Questions ───────────────────────────────────────────────────────────

function QuestionsView({ adminUserId, showToast, onAnswered }: { adminUserId?: string; showToast: (m: string) => void; onAnswered: () => void }) {
  const [status, setStatus] = useState<"open" | "answered">("open");
  const [items, setItems] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/course/questions?status=${status}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setItems(json.questions);
      setTotal(json.total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {(["open", "answered"] as const).map((s) => (
          <button key={s} onClick={() => setStatus(s)} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer", border: `1px solid ${status === s ? TEAL : BORDER}`, background: status === s ? TEAL_LIGHT : CARD, color: status === s ? TEAL_DARK : TEXT_MID, fontWeight: status === s ? 700 : 500 }}>
            {s === "open" ? "Waiting for a reply" : "Answered"}
          </button>
        ))}
        <span style={{ fontSize: 12, color: TEXT_LIGHT }}>
          {loading ? "Loading…" : `${total} question${total === 1 ? "" : "s"}${total > items.length ? `, showing the ${status === "open" ? "oldest" : "latest"} ${items.length}` : ""}`}
        </span>
      </div>
      {error && <Banner tone="error">{error}</Banner>}
      {!loading && items.length === 0 && !error && (
        <div style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT, background: CARD, borderRadius: 14, border: `1px solid ${BORDER}` }}>
          {status === "open" ? "No questions waiting. 🎉" : "No answered questions yet."}
        </div>
      )}
      {items.map((q) => (
        <QuestionCard
          key={q.id}
          q={q}
          adminUserId={adminUserId}
          onSent={() => {
            showToast("✓ Reply sent. The student sees it on their lesson page.");
            if (status === "open") {
              setItems((prev) => prev.filter((x) => x.id !== q.id));
              setTotal((n) => n - 1);
            }
            onAnswered();
          }}
        />
      ))}
    </div>
  );
}

function QuestionCard({ q, adminUserId, onSent }: { q: Question; adminUserId?: string; onSent: () => void }) {
  const [reply, setReply] = useState(q.admin_reply ?? "");
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<{ tone: "info" | "warn" | "error"; text: string } | null>(null);
  const [showReflection, setShowReflection] = useState(false);
  const waited = daysSince(q.updated_at ?? q.created_at);

  const draft = async () => {
    setDrafting(true);
    setNote(null);
    try {
      const res = await fetch("/api/admin/course/draft-reply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submission_id: q.id }) });
      const json = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      if (!res.ok) {
        setNote({ tone: "error", text: json.error ?? "Could not draft" });
      } else if (json.flagged) {
        setNote({ tone: "error", text: json.draft });
      } else {
        setReply(json.draft);
        setNote({ tone: "info", text: "Draft by Claude. Read it, edit anything that is not right, then send." });
      }
    } catch {
      setNote({ tone: "error", text: "Network error" });
    } finally {
      setDrafting(false);
    }
  };

  const send = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/submissions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: q.id, admin_reply: reply.trim(), replied_by: adminUserId }) });
      if (res.ok) onSent();
      else setNote({ tone: "error", text: (await res.json().catch(() => ({}))).error ?? `Failed to send (HTTP ${res.status})` });
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20, boxShadow: SHADOW }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 700, color: TEXT, fontSize: 14 }}>{q.profiles?.full_name || q.profiles?.email || "Unknown student"}</div>
          <div style={{ fontSize: 12, color: TEXT_LIGHT }}>{q.profiles?.email} · {q.lesson_title}</div>
        </div>
        {!q.admin_reply && (
          <Pill tone={waited >= 3 ? "warn" : "ok"}>{waited === 0 ? "Today" : `Waiting ${waited} day${waited === 1 ? "" : "s"}`}</Pill>
        )}
      </div>

      <div style={{ borderLeft: "4px solid #4A7DFF", background: "#F5F8FF", padding: "10px 14px", borderRadius: "0 8px 8px 0", fontSize: 14, color: TEXT, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
        {q.question}
      </div>
      {q.comment && <p style={{ fontSize: 13, color: TEXT_MID, margin: "8px 0 0", whiteSpace: "pre-wrap" }}><strong>Comment:</strong> {q.comment}</p>}
      {q.reflection && (
        <div style={{ marginTop: 8 }}>
          <button onClick={() => setShowReflection((v) => !v)} style={{ ...ghostBtn, border: "none", padding: 0, fontSize: 12 }}>
            {showReflection ? "Hide" : "Show"} reflection
          </button>
          {showReflection && <p style={{ fontSize: 13, color: TEXT_MID, margin: "6px 0 0", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{q.reflection}</p>}
        </div>
      )}

      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        rows={reply ? Math.min(14, Math.max(5, reply.split("\n").length + 2)) : 4}
        placeholder="Write a reply, or press Draft with Claude for a starting point…"
        aria-label="Reply to student"
        style={{ width: "100%", boxSizing: "border-box", marginTop: 14, padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${reply ? TEAL : BORDER}`, fontSize: 14, lineHeight: 1.6, fontFamily: "inherit", color: TEXT, resize: "vertical", outline: "none" }}
      />
      {note && <Banner tone={note.tone}>{note.text}</Banner>}
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <button onClick={draft} disabled={drafting || sending} style={ghostBtn}>{drafting ? "Drafting…" : "✨ Draft with Claude"}</button>
        <button onClick={send} disabled={sending || !reply.trim()} style={{ ...primaryBtn, opacity: reply.trim() ? 1 : 0.5 }}>
          {sending ? "Sending…" : q.admin_reply ? "Update reply" : "Send reply"}
        </button>
      </div>
    </div>
  );
}

// ── Drop-off ────────────────────────────────────────────────────────────

function FunnelView({ data }: { data: Overview }) {
  const max = Math.max(1, ...data.lessonFunnel.map((l) => l.students));
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "20px 24px", boxShadow: SHADOW }}>
      <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>Students who submitted each lesson</h3>
      <p style={{ margin: "0 0 16px", fontSize: 12, color: TEXT_LIGHT }}>
        Out of {data.totals.students} students who started. A sharp drop marks a lesson worth revisiting. Track lessons 4.1 to 4.3 are lower by design: each student takes one.
      </p>
      <div role="table" aria-label="Students per lesson" style={{ display: "grid", gap: 4 }}>
        {data.lessonFunnel.map((l) => (
          <div
            key={l.slug}
            role="row"
            title={`${l.number} ${l.title}: ${l.students} student${l.students === 1 ? "" : "s"}`}
            style={{ display: "grid", gridTemplateColumns: "minmax(120px, 34%) 1fr 48px", alignItems: "center", gap: 12, padding: "3px 0" }}
          >
            <span role="cell" style={{ fontSize: 12, color: TEXT_MID, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <span style={{ color: TEXT_LIGHT, display: "inline-block", minWidth: 34 }}>{l.number}</span>
              {l.title}
            </span>
            <span role="cell" style={{ height: 12, background: "#F1F4F7", borderRadius: 4 }}>
              <span style={{ display: "block", height: "100%", width: `${(l.students / max) * 100}%`, minWidth: l.students ? 2 : 0, background: TEAL_DARK, borderRadius: "0 4px 4px 0" }} />
            </span>
            <span role="cell" style={{ fontSize: 12, color: TEXT, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{l.students}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Bits ────────────────────────────────────────────────────────────────

function Tile({ label, value, accent, warn }: { label: string; value: number | undefined; accent?: boolean; warn?: boolean }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderTop: `3px solid ${accent ? TEAL : warn ? "#F0A500" : BORDER}`, borderRadius: 12, padding: "14px 16px", boxShadow: SHADOW }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: TEXT, fontFamily: "'Sora', sans-serif", fontVariantNumeric: "tabular-nums" }}>{value ?? "–"}</div>
      <div style={{ fontSize: 12, color: TEXT_LIGHT, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Pill({ tone, children }: { tone: "ok" | "warn" | "error"; children: React.ReactNode }) {
  const c = { ok: [TEAL_LIGHT, TEAL_DARK], warn: [AMBER_BG, AMBER], error: [RED_BG, RED] }[tone];
  return <span style={{ display: "inline-block", marginTop: 3, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: c[0], color: c[1] }}>{children}</span>;
}

function Banner({ tone, children }: { tone: "info" | "warn" | "error"; children: React.ReactNode }) {
  const c = { info: [TEAL_LIGHT, TEAL_DARK], warn: [AMBER_BG, AMBER], error: [RED_BG, RED] }[tone];
  return <div role="status" style={{ marginTop: 10, padding: "10px 14px", borderRadius: 8, fontSize: 13, lineHeight: 1.5, background: c[0], color: c[1] }}>{children}</div>;
}

const th: React.CSSProperties = { padding: "10px 12px", fontWeight: 700 };
const td: React.CSSProperties = { padding: "12px", lineHeight: 1.45 };
const ghostBtn: React.CSSProperties = { padding: "6px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: CARD, color: TEXT_MID, fontSize: 12, fontWeight: 600, cursor: "pointer" };
const primaryBtn: React.CSSProperties = { padding: "6px 14px", borderRadius: 8, border: "none", background: TEAL, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" };
