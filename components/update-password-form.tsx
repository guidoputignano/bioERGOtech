"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const router = useRouter();

  // Exchange the invite token from the URL hash for a session
  useEffect(() => {
    const supabase = createClient();

    // Handle hash-based tokens (invite links use #access_token=...&type=invite)
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const type = params.get("type");

      if (accessToken && (type === "invite" || type === "recovery" || type === "magiclink")) {
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || "",
        }).then(({ error }) => {
          if (error) {
            setSessionError("This link has expired or is invalid. Please request a new one.");
          } else {
            setSessionReady(true);
            // Clean up the hash from the URL
            window.history.replaceState(null, "", window.location.pathname);
          }
        });
        return;
      }
    }

    // No hash token — check if user already has a session (e.g. navigated directly)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      } else {
        setSessionError("No valid session found. Please use the link from your invitation email.");
      }
    });
  }, []);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setIsLoading(true); setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => router.push("/member-portal"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const TEAL = "#2EC4B6";
  const TEAL_DARK = "#1A9E92";

  if (done) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#E8F8F6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2EC4B6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1A2332", fontFamily: "'Sora', sans-serif", marginBottom: 8 }}>Password set!</h2>
        <p style={{ fontSize: 14, color: "#8896A6", fontFamily: "'DM Sans', sans-serif" }}>Taking you to the Member Portal…</p>
      </div>
    );
  }

  if (sessionError) {
    return (
      <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#1A2332", fontFamily: "'Sora', sans-serif" }}>bio<span style={{ color: TEAL }}>ERGO</span>tech</div>
          <div style={{ fontSize: 11, color: "#8896A6", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginTop: 4 }}>Member Portal</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 20, padding: "36px 32px", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", border: "1px solid #E8EDF3", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#FDECF1", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E74C6F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1A2332", fontFamily: "'Sora', sans-serif", marginBottom: 8 }}>Link expired or invalid</h2>
          <p style={{ fontSize: 14, color: "#8896A6", lineHeight: 1.6, marginBottom: 24 }}>{sessionError}</p>
          <a href="/auth/forgot-password" style={{ display: "inline-block", padding: "11px 24px", borderRadius: 12, background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>Request a new link →</a>
        </div>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${TEAL}`, borderTopColor: "transparent", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: "#8896A6", fontSize: 14 }}>Verifying your invitation…</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sora:wght@600;700;800&display=swap');`}</style>

      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#1A2332", fontFamily: "'Sora', sans-serif" }}>bio<span style={{ color: TEAL }}>ERGO</span>tech</div>
        <div style={{ fontSize: 11, color: "#8896A6", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginTop: 4 }}>Member Portal</div>
      </div>

      <div style={{ background: "#fff", borderRadius: 20, padding: "36px 32px", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", border: "1px solid #E8EDF3" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1A2332", fontFamily: "'Sora', sans-serif", marginBottom: 6, marginTop: 0 }}>Welcome to the Foundation</h1>
        <p style={{ fontSize: 14, color: "#8896A6", marginBottom: 28, marginTop: 0, lineHeight: 1.6 }}>Your application has been approved. Set a password to access your member portal.</p>

        <form onSubmit={handle} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#4A5568", marginBottom: 6 }}>New Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" required style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #E8EDF3", fontSize: 14, color: "#1A2332", outline: "none", boxSizing: "border-box" as const, fontFamily: "'DM Sans', sans-serif" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#4A5568", marginBottom: 6 }}>Confirm Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat your password" required style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #E8EDF3", fontSize: 14, color: "#1A2332", outline: "none", boxSizing: "border-box" as const, fontFamily: "'DM Sans', sans-serif" }} />
          </div>

          {error && <div style={{ padding: "10px 14px", borderRadius: 10, background: "#FDECF1", border: "1px solid #F9C3CE", color: "#D63563", fontSize: 13 }}>{error}</div>}

          <button type="submit" disabled={isLoading} style={{ padding: "12px 0", borderRadius: 12, border: "none", background: isLoading ? "#E8EDF3" : `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, color: isLoading ? "#8896A6" : "#fff", fontSize: 14, fontWeight: 700, cursor: isLoading ? "default" : "pointer", fontFamily: "'DM Sans', sans-serif", boxShadow: isLoading ? "none" : `0 2px 8px ${TEAL}33`, marginTop: 4 }}>
            {isLoading ? "Setting password…" : "Set Password & Enter Portal"}
          </button>
        </form>
      </div>

      <p style={{ textAlign: "center", fontSize: 13, color: "#8896A6", marginTop: 20 }}>
        Already set a password?{" "}<a href="/auth/login" style={{ color: TEAL, fontWeight: 600, textDecoration: "none" }}>Sign in →</a>
      </p>
    </div>
  );
}
