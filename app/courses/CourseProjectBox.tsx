"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

export interface CheckItem {
  key: string;
  label: string;
  ok: boolean;
  required: boolean;
  detail: string;
}

export interface CourseState {
  lessons: { done: number; total: number; missingCore: { slug: string; number: string; title: string }[]; trackDone: boolean; complete: boolean };
  github: { login: string; avatar_url: string | null } | null;
  project: { full_name: string; html_url: string; mentor_access: boolean; created_via: string } | null;
  membership: {
    submitted_at: string | null;
    submitted_commit: string | null;
    checked_at: string | null;
    check_result: { ref: string | null; items: CheckItem[]; passed: boolean; error?: string } | null;
  } | null;
  certificate: { cert_id: string; issued_at: string; revoked_at: string | null } | null;
  eligibility: { eligible: boolean; reasons: string[] };
  separate_track: boolean;
  github_enabled: boolean;
  mentor_login: string | null;
  template_repo: string | null;
}

/** What came back from the GitHub round trip, in words a student can act on. */
export function githubMessage(code: string, p: URLSearchParams, mentor: string | null): { ok: boolean; text: string } | null {
  const mentorName = mentor ? `@${mentor}` : "the bioERGOtech mentor account";
  switch (code) {
    case "connected": return { ok: true, text: `GitHub connected as @${p.get("login") ?? ""}.` };
    case "created": return { ok: true, text: `Your project repository ${p.get("repo") ?? ""} is ready, and the bioERGOtech mentors have access.` };
    case "linked": return { ok: true, text: `Linked ${p.get("repo") ?? "your repository"}. The bioERGOtech mentors have access.` };
    case "mentor_failed": return { ok: false, text: `Your repository is linked, but we could not add ${mentorName} as a collaborator. Press "Use a different repository" below and link the same repository again: that retries it.` };
    case "cancelled": return { ok: false, text: "GitHub sign-in was cancelled. Nothing was changed." };
    case "expired": return { ok: false, text: "That GitHub sign-in took too long or was started in another tab. Please try again." };
    case "start_from_lesson": return { ok: false, text: "Please create or link your repository with the buttons in this box. If you use a privacy extension that hides the page you came from, allow it for bioergotech.org and try again." };
    case "signed_out": return { ok: false, text: "Your course login changed during GitHub sign-in. Log in again and retry." };
    case "github_in_use": return { ok: false, text: `The GitHub account @${p.get("login") ?? ""} is already connected to a different course account.` };
    case "not_configured": return { ok: false, text: "GitHub project submission is not available yet. Please check back soon." };
    case "bad_name": return { ok: false, text: "Repository names can only use letters, numbers, dots, dashes and underscores." };
    case "bad_repo": return { ok: false, text: "That does not look like a GitHub repository link. It should look like github.com/your-name/your-project." };
    case "repo_exists": return { ok: false, text: "You already have a repository with that name. Choose another name, or link the existing one instead." };
    case "template_missing": return { ok: false, text: "The project template is unavailable right now. Please ask a question in your lesson submission and the team will help." };
    case "repo_not_found": return { ok: false, text: "We could not find that repository. Check the link. If it is private, make it public first (Settings, then Danger Zone, then Change visibility): the course asks for public projects." };
    case "not_your_repo": return { ok: false, text: "You need write access to a repository to link it. Ask its owner to add you as a collaborator first." };
    case "repo_private": return { ok: false, text: "That repository is private. Make it public first (Settings, then Danger Zone, then Change visibility): the course asks for public projects." };
    case "owner_must_link": return { ok: false, text: `Ask @${p.get("owner") ?? "the owner"}, who owns the repository, to link it first. You can then link the same repository to join.` };
    case "locked": return { ok: false, text: "Your certificate has been issued, so your project can no longer be changed." };
    default: return { ok: false, text: "Something went wrong talking to GitHub. Please try again in a moment." };
  }
}

function connectHref(intent: "connect" | "create" | "link", next: string, repo?: string) {
  const q = new URLSearchParams({ intent, next });
  if (repo) q.set("repo", repo);
  return `/api/courses/github/connect?${q.toString()}`;
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
  /** setup: Lesson 4.4, create or link the repo. submit: course closing. */
  mode: "setup" | "submit";
  /** Whether this lesson's reflection is saved: when it flips, the progress shown is stale. */
  lessonSubmitted?: boolean;
}

export default function CourseProjectBox({ mode, lessonSubmitted }: Props) {
  const pathname = usePathname();
  const { state, setState, loading, reload } = useCourseState();

  // Reload when this lesson's reflection gets saved. Not on the first render
  // (the hook already loads), and not by remounting, which would lose the
  // GitHub result message read from the URL.
  const lastSubmitted = useRef(lessonSubmitted);
  useEffect(() => {
    if (lastSubmitted.current === lessonSubmitted) return;
    lastSubmitted.current = lessonSubmitted;
    if (lessonSubmitted) reload();
  }, [lessonSubmitted, reload]);
  // The raw result of the GitHub round trip. The message is built at render
  // time, so it can name the mentor account once the state has loaded.
  const [ghResult, setGhResult] = useState<{ code: string; params: URLSearchParams } | null>(null);
  const [repoName, setRepoName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [changing, setChanging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Read the result of the GitHub round trip once, then tidy the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("github");
    if (!code) return;
    setGhResult({ code, params: new URLSearchParams(params) });
    for (const k of ["github", "login", "repo", "owner"]) params.delete(k);
    const qs = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}#project`);
    document.getElementById("project")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
  const flash = ghResult ? githubMessage(ghResult.code, ghResult.params, state?.mentor_login ?? null) : null;

  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/courses/project/submit", { method: "POST" });
      const data = await res.json();
      if (!res.ok) setSubmitError(data.error ?? "Submission failed");
      else setState((prev) => (prev ? { ...prev, ...data.state } : data.state));
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const next = pathname || "/courses/agentic-ai";
  const certified = !!state?.certificate && !state.certificate.revoked_at;
  const check = state?.membership?.check_result ?? null;

  return (
    <div id="project" style={{ background: CARD, border: `1px solid ${BORDER}`, borderTop: `3px solid ${TEAL}`, borderRadius: 14, padding: "28px clamp(18px, 4vw, 36px)", marginTop: 32, boxShadow: SHADOW, scrollMarginTop: 90 }}>
      <div style={{ marginBottom: 18, paddingBottom: 14, borderBottom: `2px solid ${TEAL_LIGHT}` }}>
        <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 700, color: TEXT, margin: "0 0 4px" }}>
          {mode === "setup" ? "🗂️ Set Up Your Project Repository" : "🎓 Submit Your Project for the Certificate"}
        </h2>
        <p style={{ fontSize: 13, color: TEXT_LIGHT, margin: 0, lineHeight: 1.6 }}>
          {mode === "setup"
            ? "Your project lives in a GitHub repository that you own. bioERGOtech mentors are added as collaborators so they can review your work and give feedback."
            : "When your prototype, demo, README and ethics review are in your repository, submit it here. We check it automatically, then the bioERGOtech team reviews it and issues your certificate."}
        </p>
      </div>

      {flash && (
        <div role="status" style={{ marginBottom: 18, padding: "12px 16px", borderRadius: 8, fontSize: 13.5, lineHeight: 1.55, background: flash.ok ? TEAL_LIGHT : AMBER_BG, color: flash.ok ? TEAL_DARK : AMBER_TEXT }}>
          {flash.ok ? "✓ " : "⚠ "}{flash.text}
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: 14, color: TEXT_LIGHT }}>Loading your project…</p>
      ) : !state ? (
        <p style={{ fontSize: 14, color: TEXT_LIGHT }}>We could not load your project status. Refresh the page to try again.</p>
      ) : !state.github_enabled ? (
        <p style={{ fontSize: 14, color: TEXT_MID, lineHeight: 1.6 }}>
          GitHub project submission is being switched on. Until then, keep building and save your work in your own GitHub repository as the lesson describes.
        </p>
      ) : (
        <>
          {/* Step 1: GitHub account */}
          <Step n={1} title="Connect your GitHub account" done={!!state.github}>
            {state.github ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {state.github.avatar_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={state.github.avatar_url} alt="" width={28} height={28} style={{ borderRadius: "50%" }} />
                )}
                <span style={{ fontSize: 14, color: TEXT }}>
                  Connected as <a href={`https://github.com/${state.github.login}`} target="_blank" rel="noopener noreferrer" style={{ color: TEAL_DARK, fontWeight: 700 }}>@{state.github.login}</a>
                </span>
                {!certified && (
                  <a href={connectHref("connect", next)} style={{ fontSize: 12, color: TEXT_LIGHT }}>Use a different account</a>
                )}
              </div>
            ) : (
              <>
                <p style={{ fontSize: 14, color: TEXT_MID, lineHeight: 1.6, margin: "0 0 12px" }}>
                  We only read your public profile. No GitHub account yet? You can create a free one on the next screen (GitHub requires you to be 13 or older).
                </p>
                <a href={connectHref("connect", next)} style={btn(true)}>Connect GitHub</a>
              </>
            )}
          </Step>

          {/* Step 2: Repository */}
          <Step n={2} title="Your project repository" done={!!state.project} disabled={!state.github}>
            {state.project && !changing ? (
              <div style={{ fontSize: 14, color: TEXT_MID, lineHeight: 1.7 }}>
                <a href={state.project.html_url} target="_blank" rel="noopener noreferrer" style={{ color: TEAL_DARK, fontWeight: 700, overflowWrap: "anywhere" }}>
                  github.com/{state.project.full_name}
                </a>
                <div style={{ fontSize: 13, color: state.project.mentor_access ? TEAL_DARK : AMBER_TEXT }}>
                  {state.project.mentor_access
                    ? `✓ bioERGOtech mentors (@${state.mentor_login}) have access`
                    : `⚠ The mentors do not have access yet. Press "Use a different repository" and link this same repository again.`}
                </div>
                {!certified && (
                  <button onClick={() => setChanging(true)} style={{ ...linkBtn, marginTop: 6 }}>Use a different repository</button>
                )}
              </div>
            ) : state.github ? (
              <div style={{ display: "grid", gap: 14 }}>
                <Option title="Create a new repository from the bioERGOtech template">
                  <p style={hint}>
                    Created in your account (@{state.github.login}), so you own it. It starts with README and ethics review templates matching Lessons 6.2 and 8.2. GitHub will ask permission to create repositories for you.
                  </p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input
                      value={repoName}
                      onChange={(e) => setRepoName(e.target.value.replace(/\s+/g, "-"))}
                      placeholder="flu-sentinel-agent"
                      aria-label="New repository name"
                      style={input}
                    />
                    <a
                      href={repoName ? connectHref("create", next, repoName) : undefined}
                      aria-disabled={!repoName}
                      style={{ ...btn(true), opacity: repoName ? 1 : 0.5, pointerEvents: repoName ? "auto" : "none" }}
                    >
                      Create on GitHub
                    </a>
                  </div>
                </Option>
                <Option title="Link a repository you already have">
                  <p style={hint}>
                    It must be public, and you need write access. Working in a team? The owner links it first, then each teammate links the same repository.
                  </p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder="github.com/your-name/your-project"
                      aria-label="Existing repository link"
                      style={input}
                    />
                    <a
                      href={repoUrl ? connectHref("link", next, repoUrl) : undefined}
                      aria-disabled={!repoUrl}
                      style={{ ...btn(false), opacity: repoUrl ? 1 : 0.5, pointerEvents: repoUrl ? "auto" : "none" }}
                    >
                      Link repository
                    </a>
                  </div>
                </Option>
                {changing && (
                  <button onClick={() => setChanging(false)} style={linkBtn}>Keep my current repository</button>
                )}
              </div>
            ) : (
              <p style={hint}>Connect GitHub first.</p>
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
                    <button onClick={submit} disabled={submitting || !state.project} style={{ ...btn(true), border: "none", cursor: submitting ? "wait" : "pointer", opacity: submitting ? 0.7 : 1 }}>
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

function Option({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, background: "#FAFBFC" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 6 }}>{title}</div>
      {children}
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
