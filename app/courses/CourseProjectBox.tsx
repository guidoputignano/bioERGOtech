"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

const TEAL = "#00C4B4";
const TEAL_DARK = "#009688";
const TEAL_LIGHT = "#E6F9F7";
const TEXT = "#1A2332";
const TEXT_MID = "#4A5568";
const TEXT_LIGHT = "#718096";
const BORDER = "#E2E8F0";
const CARD = "#FFFFFF";
const SHADOW = "0 2px 12px rgba(0,0,0,0.05)";
const AMBER_BG = "#FFF8E6";
const AMBER_TEXT = "#7D5A00";
const RED = "#C0392B";

export const GITHUB_GUIDE_PATH = "/courses/agentic-ai/github";

export interface CheckItem {
  key: string;
  label: string;
  ok: boolean;
  required: boolean;
  detail: string;
}

export interface CourseState {
  lessons: { done: number; total: number; missingCore: { slug: string; number: string; title: string }[]; trackDone: boolean; complete: boolean };
  student_id: string;
  project: { full_name: string; html_url: string; is_fork: boolean; fork_parent: string | null } | null;
  membership: {
    submitted_at: string | null;
    submitted_commit: string | null;
    checked_at: string | null;
    check_result: { ref: string | null; items: CheckItem[]; passed: boolean; error?: string } | null;
  } | null;
  certificate: { cert_id: string; issued_at: string; revoked_at: string | null } | null;
  eligibility: { eligible: boolean; reasons: string[] };
  separate_track: boolean;
}

export function useCourseState() {
  const [state, setState] = useState<CourseState | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/courses/project", { cache: "no-store" });
      if (res.ok) setState(await res.json());
    } catch {
      // Leave the previous state; the box shows a retry hint.
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  return { state, setState, loading, reload: load };
}

interface Props {
  /** setup: Lesson 4.4, add the repository. submit: course closing. */
  mode: "setup" | "submit";
  /** Whether this lesson's reflection is saved: when it flips, the progress shown is stale. */
  lessonSubmitted?: boolean;
}

export default function CourseProjectBox({ mode, lessonSubmitted }: Props) {
  const { state, setState, loading, reload } = useCourseState();

  // Reload when this lesson's reflection gets saved, so the lesson count
  // includes it. Not on the first render: the hook already loads.
  const lastSubmitted = useRef(lessonSubmitted);
  useEffect(() => {
    if (lastSubmitted.current === lessonSubmitted) return;
    lastSubmitted.current = lessonSubmitted;
    if (lessonSubmitted) reload();
  }, [lessonSubmitted, reload]);

  const [repoUrl, setRepoUrl] = useState("");
  const [changing, setChanging] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkMessage, setLinkMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const merge = (next: Partial<CourseState>) => setState((prev) => (prev ? { ...prev, ...next } : (next as CourseState)));

  const linkRepo = async () => {
    setLinking(true);
    setLinkMessage(null);
    try {
      const res = await fetch("/api/courses/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: repoUrl }),
      });
      const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      if (!res.ok) {
        setLinkMessage({ ok: false, text: data.error ?? "Could not save your repository" });
      } else {
        merge(data.state);
        setChanging(false);
        setRepoUrl("");
        setLinkMessage({ ok: true, text: `Saved: github.com/${data.state.project?.full_name ?? ""}` });
      }
    } catch {
      setLinkMessage({ ok: false, text: "Network error. Please try again." });
    } finally {
      setLinking(false);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/courses/project/submit", { method: "POST" });
      const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      if (!res.ok) setSubmitError(data.error ?? "Submission failed");
      else merge(data.state);
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyId = async () => {
    if (!state) return;
    try {
      await navigator.clipboard.writeText(state.student_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the id is on screen to copy by hand.
    }
  };

  const certified = !!state?.certificate && !state.certificate.revoked_at;
  const check = state?.membership?.check_result ?? null;

  return (
    <div id="project" style={{ background: CARD, border: `1px solid ${BORDER}`, borderTop: `3px solid ${TEAL}`, borderRadius: 14, padding: "28px clamp(18px, 4vw, 36px)", marginTop: 32, boxShadow: SHADOW, scrollMarginTop: 90 }}>
      <div style={{ marginBottom: 18, paddingBottom: 14, borderBottom: `2px solid ${TEAL_LIGHT}` }}>
        <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 700, color: TEXT, margin: "0 0 4px" }}>
          {mode === "setup" ? "🗂️ Your Project Repository" : "🎓 Submit Your Project for the Certificate"}
        </h2>
        <p style={{ fontSize: 13, color: TEXT_LIGHT, margin: 0, lineHeight: 1.6 }}>
          {mode === "setup"
            ? "Your project lives in a public GitHub repository in your own account. Add its link here now, and keep building in it until the end of the course."
            : "When your prototype, demo video, README and ethics review are in your repository, submit it here. We check it automatically, then the bioERGOtech team reviews it and issues your certificate."}
        </p>
      </div>

      {loading ? (
        <p style={{ fontSize: 14, color: TEXT_LIGHT }}>Loading your project…</p>
      ) : !state ? (
        <p style={{ fontSize: 14, color: TEXT_LIGHT }}>We could not load your project status. Refresh the page to try again.</p>
      ) : (
        <>
          {/* Step 1: GitHub account, repository and Student ID */}
          <Step n={1} title="Create your GitHub repository" done={!!state.project}>
            <p style={{ ...hint, margin: "0 0 12px" }}>
              New to GitHub? The{" "}
              <Link href={GITHUB_GUIDE_PATH} style={{ color: TEAL_DARK, fontWeight: 700 }}>GitHub guide</Link>{" "}
              shows how to create a free account and a public repository, with the README and ethics review templates.
            </p>
            <div style={{ border: `1px dashed ${TEAL}`, background: TEAL_LIGHT, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 12, color: TEAL_DARK, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                Your Student ID
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <code style={{ fontSize: 16, fontWeight: 700, color: TEXT, background: CARD, padding: "4px 10px", borderRadius: 6, border: `1px solid ${BORDER}` }}>
                  {state.student_id}
                </code>
                <button onClick={copyId} style={{ ...linkBtn, textDecoration: "none", color: TEAL_DARK, fontWeight: 700 }}>
                  {copied ? "✓ Copied" : "Copy"}
                </button>
              </div>
              <p style={{ fontSize: 12.5, color: TEXT_MID, margin: "8px 0 0", lineHeight: 1.55 }}>
                Add it to the Team section of your README. It shows the repository is yours. In a team, every member adds their own.
              </p>
            </div>
          </Step>

          {/* Step 2: Repository link */}
          <Step n={2} title="Add your repository link" done={!!state.project} last={mode === "setup"}>
            {state.project && !changing ? (
              <div style={{ fontSize: 14, color: TEXT_MID, lineHeight: 1.7 }}>
                <a href={state.project.html_url} target="_blank" rel="noopener noreferrer" style={{ color: TEAL_DARK, fontWeight: 700, overflowWrap: "anywhere" }}>
                  github.com/{state.project.full_name}
                </a>
                {state.project.is_fork && (
                  <div style={{ fontSize: 13, color: AMBER_TEXT }}>
                    ⚠ This is a fork{state.project.fork_parent ? ` of ${state.project.fork_parent}` : ""}. Reviewers will compare it with the original.
                  </div>
                )}
                {!certified && (
                  <div>
                    <button onClick={() => { setChanging(true); setLinkMessage(null); }} style={{ ...linkBtn, marginTop: 6 }}>Use a different repository</button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <p style={hint}>
                  The repository must be public. Working in a team? Everyone adds the same repository link.
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && repoUrl.trim() && !linking) linkRepo(); }}
                    placeholder="github.com/your-name/your-project"
                    aria-label="Repository link"
                    style={input}
                  />
                  <button
                    onClick={linkRepo}
                    disabled={!repoUrl.trim() || linking}
                    style={{ ...btn(true), border: "none", cursor: linking ? "wait" : "pointer", opacity: repoUrl.trim() && !linking ? 1 : 0.5 }}
                  >
                    {linking ? "Checking…" : "Save repository"}
                  </button>
                </div>
                {changing && (
                  <button onClick={() => { setChanging(false); setLinkMessage(null); }} style={{ ...linkBtn, marginTop: 8 }}>Keep my current repository</button>
                )}
              </>
            )}
            {linkMessage && (
              <div role="status" style={{ marginTop: 10, padding: "10px 14px", borderRadius: 8, fontSize: 13.5, lineHeight: 1.55, background: linkMessage.ok ? TEAL_LIGHT : AMBER_BG, color: linkMessage.ok ? TEAL_DARK : AMBER_TEXT }}>
                {linkMessage.ok ? "✓ " : "⚠ "}{linkMessage.text}
              </div>
            )}
          </Step>

          {/* Step 3: Submission */}
          {mode === "setup" ? (
            <p style={{ ...hint, marginTop: 4 }}>
              You will submit this repository for your certificate in the{" "}
              <Link href="/courses/agentic-ai/lesson/course-closing" style={{ color: TEAL_DARK }}>Course Closing</Link> lesson.
            </p>
          ) : (
            <Step n={3} title="Submit for your certificate" done={certified} disabled={!state.project} last>
              {certified && state.certificate ? (
                <div style={{ fontSize: 14, color: TEXT_MID, lineHeight: 1.7 }}>
                  🎉 Your certificate has been issued and emailed to you.
                  <div>
                    Certificate ID{" "}
                    <a href={`/verify/${state.certificate.cert_id}`} style={{ color: TEAL_DARK, fontWeight: 700, fontFamily: "monospace" }}>
                      {state.certificate.cert_id}
                    </a>
                  </div>
                </div>
              ) : (
                <>
                  <LessonsLine lessons={state.lessons} />

                  {check && (
                    <div style={{ margin: "14px 0" }}>
                      <div style={{ fontSize: 12, color: TEXT_LIGHT, marginBottom: 6 }}>
                        Checked {state.membership?.checked_at ? new Date(state.membership.checked_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : ""}
                        {check.ref ? ` at commit ${check.ref.slice(0, 7)}` : ""}
                      </div>
                      {check.error ? (
                        <p style={{ fontSize: 13.5, color: RED, margin: 0 }}>{check.error}</p>
                      ) : (
                        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
                          {check.items.map((i) => (
                            <li key={i.key} style={{ display: "flex", gap: 10, fontSize: 13.5, lineHeight: 1.5 }}>
                              <span aria-hidden style={{ width: 18, flexShrink: 0, color: i.ok ? TEAL_DARK : i.required ? RED : TEXT_LIGHT, fontWeight: 700 }}>
                                {i.ok ? "✓" : i.required ? "✗" : "○"}
                              </span>
                              <span>
                                <strong style={{ color: TEXT }}>{i.label}</strong>
                                {!i.required && <span style={{ color: TEXT_LIGHT }}> (recommended)</span>}
                                <span style={{ color: TEXT_MID }}>. {i.detail}</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {state.membership?.submitted_at && state.eligibility.eligible && (
                    <div style={{ margin: "12px 0", padding: "12px 16px", borderRadius: 8, background: TEAL_LIGHT, color: TEAL_DARK, fontSize: 13.5, lineHeight: 1.55 }}>
                      ✓ Everything is in place. The bioERGOtech team will review your project and email your certificate.
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                    <button onClick={submit} disabled={submitting || !state.project} style={{ ...btn(true), border: "none", cursor: submitting ? "wait" : "pointer", opacity: submitting || !state.project ? 0.6 : 1 }}>
                      {submitting ? "Checking your repository…" : state.membership?.submitted_at ? "Resubmit and check again" : "Submit for certificate"}
                    </button>
                    <span style={{ fontSize: 12, color: TEXT_LIGHT }}>We check the latest commit. You can fix things and resubmit until your certificate is issued.</span>
                  </div>
                  {submitError && <p style={{ fontSize: 13, color: RED, margin: "10px 0 0" }}>{submitError}</p>}
                </>
              )}
            </Step>
          )}
        </>
      )}
    </div>
  );
}

function LessonsLine({ lessons }: { lessons: CourseState["lessons"] }) {
  const pct = Math.round((lessons.done / Math.max(1, lessons.total)) * 100);
  return (
    <div style={{ fontSize: 13.5, color: TEXT_MID, lineHeight: 1.6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, maxWidth: 220, height: 6, background: BORDER, borderRadius: 3, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: lessons.complete ? TEAL : "#F0A500" }} />
        </div>
        <span>{lessons.done} of {lessons.total} lesson reflections</span>
      </div>
      {lessons.missingCore.length > 0 && (
        <div style={{ marginTop: 6 }}>
          Still to submit:{" "}
          {lessons.missingCore.slice(0, 6).map((l, i) => (
            <span key={l.slug}>
              {i > 0 && ", "}
              <Link href={`/courses/agentic-ai/lesson/${l.slug}`} style={{ color: TEAL_DARK }}>{l.number}</Link>
            </span>
          ))}
          {lessons.missingCore.length > 6 && ` and ${lessons.missingCore.length - 6} more`}
        </div>
      )}
      {!lessons.trackDone && <div style={{ marginTop: 4 }}>Complete your technical track lesson (4.1, 4.2 or 4.3).</div>}
    </div>
  );
}

function Step({ n, title, done, disabled, last, children }: { n: number; title: string; done: boolean; disabled?: boolean; last?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 14, paddingBottom: last ? 0 : 18, marginBottom: last ? 0 : 18, borderBottom: last ? "none" : `1px solid ${BORDER}`, opacity: disabled ? 0.55 : 1 }}>
      <div aria-hidden style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, fontFamily: "'Sora', sans-serif", background: done ? TEAL : TEAL_LIGHT, color: done ? "#fff" : TEAL_DARK }}>
        {done ? "✓" : n}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 8, paddingTop: 3 }}>{title}</div>
        {children}
      </div>
    </div>
  );
}

const hint: React.CSSProperties = { fontSize: 13, color: TEXT_LIGHT, lineHeight: 1.6, margin: "0 0 10px" };
const input: React.CSSProperties = { flex: "1 1 220px", minWidth: 0, padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${BORDER}`, fontSize: 14, color: TEXT, fontFamily: "inherit", outline: "none", background: CARD };
const linkBtn: React.CSSProperties = { background: "none", border: "none", padding: 0, fontSize: 12.5, color: TEXT_LIGHT, cursor: "pointer", textDecoration: "underline" };

function btn(primary: boolean): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "10px 20px", borderRadius: 10,
    fontSize: 14, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap",
    background: primary ? TEAL : CARD, color: primary ? "#fff" : TEAL_DARK, border: primary ? "none" : `1.5px solid ${TEAL}`,
  };
}
