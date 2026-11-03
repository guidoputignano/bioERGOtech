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
  // The account whose password this page changes. Shown on screen: on a
  // shared school computer the browser may already be signed in as someone
  // else (a teacher, a classmate), and "change password" would change
  // theirs. It happened: a student changed a password and still could not
  // sign in, because it was not her account.
  const [account, setAccount] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const router = useRouter();

  // Exchange the invite token from the URL hash for a session
  useEffect(() => {
    const supabase = createClient();

    // A link Supabase rejected (expired, or already used) comes back with an
    // error in the hash or the query. Say so, and never fall back to whoever
    // is already signed in on this browser: on a shared computer that is
    // someone else.
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const queryParams = new URLSearchParams(window.location.search);
    if (hashParams.get("error") || hashParams.get("error_description") || queryParams.get("error") || queryParams.get("error_description")) {
      setSessionError("This link has expired or has already been used. Request a new one: it takes a minute.");
      return;
    }

    // Handle hash-based tokens (invite links use #access_token=...&type=invite)
    const hash = window.location.hash;
    if (hash) {
      const params = hashParams;
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const type = params.get("type");

      if (accessToken && (type === "invite" || type === "recovery" || type === "magiclink")) {
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || "",
        }).then(({ data, error }) => {
          if (error) {
            setSessionError("This link has expired or is invalid. Please request a new one.");
          } else {
            setAccount(data.session?.user?.email ?? null);
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
        setAccount(session.user?.email ?? null);
        setSessionReady(true);
      } else {
        setSessionError("No valid session found. Please use the link from your invitation email.");
      }
    });
  }, []);

  // Not your account: sign out on this device only, then ask for a link of
  // your own. The other person's other devices stay signed in.
  const signOut = async () => {
    setSigningOut(true);
    setError(null);
    // signOut reports a failure in its result, and then keeps the session:
    // saying "signed out" here would leave the other account on this device.
    const { error: signOutError } = await createClient()
      .auth.signOut({ scope: "local" })
      .catch((e: unknown) => ({ error: e instanceof Error ? e : new Error(String(e)) }));
    setSigningOut(false);
    if (signOutError) {
      setError("Could not sign out. Reload the page and try again.");
      return;
    }
    setSessionReady(false);
    setAccount(null);
    setSignedOut(true);
    setSessionError(
      "You are signed out on this device. Open the link from your own email again, or request a new one with your email.",
    );
  };

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
      // Each account to its own area: students and teachers of the
      // programmes, the portal for everyone else (app/auth/dopo-accesso).
      setTimeout(() => router.push("/auth/dopo-accesso"), 2500);
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
        <p style={{ fontSize: 14, color: "#8896A6", fontFamily: "'DM Sans', sans-serif" }}>Taking you to your area…</p>
      </div>
    );
  }

  if (sessionError) {
    return (
      <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#1A2332", fontFamily: "'Sora', sans-serif" }}>bio<span style={{ color: TEAL }}>ERGO</span>tech</div>
          <div style={{ fontSize: 11, color: "#8896A6", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginTop: 4 }}>Your account</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 20, padding: "36px 32px", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", border: "1px solid #E8EDF3", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#FDECF1", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E74C6F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1A2332", fontFamily: "'Sora', sans-serif", marginBottom: 8 }}>{signedOut ? "Signed out" : "Link expired or invalid"}</h2>
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
        <div style={{ fontSize: 11, color: "#8896A6", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginTop: 4 }}>Your account</div>
      </div>

      <div style={{ background: "#fff", borderRadius: 20, padding: "36px 32px", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", border: "1px solid #E8EDF3" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1A2332", fontFamily: "'Sora', sans-serif", marginBottom: 6, marginTop: 0 }}>Welcome to the Foundation</h1>
        <p style={{ fontSize: 14, color: "#8896A6", marginBottom: account ? 16 : 28, marginTop: 0, lineHeight: 1.6 }}>Choose the password for your bioERGOtech account. You will use it with your email to sign in.</p>

        {account && (
          <div style={{ marginBottom: 24, padding: "12px 14px", borderRadius: 12, background: "#F2FBFA", border: "1px solid #CDEFEB", fontSize: 13.5, color: "#1A2332", lineHeight: 1.6 }}>
            You are setting the password for{" "}
            <strong style={{ overflowWrap: "anywhere" }}>{account}</strong>. Sign in with exactly this email.
            <div style={{ marginTop: 8, fontSize: 13, color: "#4A5568" }}>
              Not your account?{" "}
              <button
                type="button"
                onClick={signOut}
                disabled={signingOut}
                style={{ background: "none", border: "none", padding: 0, color: TEAL_DARK, fontWeight: 700, cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}
              >
                {signingOut ? "Signing out…" : "Sign out on this device"}
              </button>
            </div>
          </div>
        )}

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
            {isLoading ? "Setting password…" : "Set password and continue"}
          </button>
        </form>
      </div>

      <p style={{ textAlign: "center", fontSize: 13, color: "#8896A6", marginTop: 20 }}>
        Already set a password?{" "}<a href="/auth/login" style={{ color: TEAL, fontWeight: 600, textDecoration: "none" }}>Sign in →</a>
      </p>
    </div>
  );
}
