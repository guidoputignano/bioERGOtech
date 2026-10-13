"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { githubMessage, useCourseState } from "./CourseProjectBox";

const TEAL = "#00C4B4";
const TEAL_DARK = "#009688";
const TEAL_LIGHT = "#E6F9F7";
const NAVY = "#0D1B32";
const TEXT_MID = "#4A5568";
const TEXT_LIGHT = "#718096";

const SNOOZE_KEY = "bt_github_prompt_snooze_until";
const SNOOZE_DAYS = 3;

/**
 * The "connect GitHub" prompt a signed-in student sees when they start the
 * course and on later lessons, until they connect.
 *
 * It can be put off for a few days rather than dismissed for good: the
 * account is needed by Lesson 4.4, and a student who chose "later" in week
 * one should be reminded before they get there. It is a prompt, not a gate.
 * Track A students in particular may not have an account yet, and nothing
 * in Phase 1 needs one.
 */
export default function GitHubConnectPrompt() {
  const pathname = usePathname();
  const { state, loading } = useCourseState();
  const [snoozed, setSnoozed] = useState(true);
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    try {
      const until = Number(localStorage.getItem(SNOOZE_KEY) ?? 0);
      setSnoozed(Date.now() < until);
    } catch {
      setSnoozed(false);
    }
    const params = new URLSearchParams(window.location.search);
    const code = params.get("github");
    if (code) {
      setFlash(githubMessage(code, params, null));
      // Coming back from GitHub, failed or not, is not "later": show the
      // prompt again so a cancelled or refused connect can be retried.
      setSnoozed(false);
      for (const k of ["github", "login", "repo", "owner"]) params.delete(k);
      const qs = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
    }
  }, []);

  const later = () => {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 24 * 3600 * 1000));
    } catch {
      // Private mode: the prompt simply comes back next visit.
    }
    setSnoozed(true);
  };

  if (flash?.ok) {
    return (
      <div role="status" style={{ ...box, background: TEAL_LIGHT, borderColor: TEAL }}>
        <span style={{ fontSize: 14, color: TEAL_DARK, fontWeight: 600 }}>✓ {flash.text}</span>
        <button onClick={() => setFlash(null)} style={laterBtn} aria-label="Close">×</button>
      </div>
    );
  }

  const warning = flash && (
    <div role="status" style={{ ...box, background: "#FFF8E6", borderColor: "#F0A500", marginBottom: 8 }}>
      <span style={{ fontSize: 14, color: "#7D5A00" }}>⚠ {flash.text}</span>
      <button onClick={() => setFlash(null)} style={laterBtn} aria-label="Close">×</button>
    </div>
  );

  if (loading || !state || !state.github_enabled || state.separate_track || state.github || snoozed) {
    // A failed switch of account for someone already connected still says why.
    return warning || null;
  }

  const href = `/api/courses/github/connect?${new URLSearchParams({ intent: "connect", next: pathname || "/courses/agentic-ai" })}`;

  return (
    <>
    {warning}
    <div style={box}>
      <div style={{ fontSize: 26, lineHeight: 1 }} aria-hidden>🐙</div>
      <div style={{ flex: "1 1 260px", minWidth: 0 }}>
        <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 4 }}>
          Connect your GitHub account
        </div>
        <p style={{ fontSize: 13.5, color: TEXT_MID, lineHeight: 1.6, margin: 0 }}>
          Your final project and certificate submission live in a GitHub repository you own. Connect now so it is ready by Lesson 4.4. We only read your public profile.
          No account? You can create a free one on the next screen.
        </p>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <a href={href} style={{ background: TEAL, color: "#fff", padding: "10px 18px", borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
          Connect GitHub
        </a>
        <button onClick={later} style={laterBtn}>Later</button>
      </div>
    </div>
    </>
  );
}

const box: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap",
  background: "#fff",
  border: "1px solid #E2E8F0",
  borderLeft: `4px solid ${TEAL}`,
  borderRadius: 12,
  padding: "16px 20px",
  marginBottom: 24,
  boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
};

const laterBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: TEXT_LIGHT,
  fontSize: 14,
  cursor: "pointer",
  padding: "6px 8px",
  marginLeft: "auto",
};
