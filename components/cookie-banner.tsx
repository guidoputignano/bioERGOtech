"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type CookiePreferences = {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

const COOKIE_KEY = "bioergotech_cookie_consent";
const GA_ID = "G-GWKKXQ2S7M";

function getStoredPreferences(): CookiePreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(COOKIE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function savePreferences(prefs: CookiePreferences) {
  if (typeof window === "undefined") return;
  localStorage.setItem(COOKIE_KEY, JSON.stringify(prefs));
}

function loadGoogleAnalytics() {
  if (typeof window === "undefined") return;

  if (!document.getElementById("gtag-script")) {
    const script = document.createElement("script");
    script.id = "gtag-script";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);
  }

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]) {
    window.dataLayer.push(args);
  }
  window.gtag = gtag;

  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { anonymize_ip: true });
}

function removeGACookies() {
  if (typeof document === "undefined") return;

  const cookies = document.cookie.split(";");
  for (let i = 0; i < cookies.length; i++) {
    const name = cookies[i].split("=")[0].trim();
    if (
      name.indexOf("_ga") === 0 ||
      name.indexOf("_gid") === 0 ||
      name.indexOf("_gat") === 0
    ) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname}`;
    }
  }
}

function applyConsent(prefs: CookiePreferences) {
  if (prefs.analytics) {
    loadGoogleAnalytics();
  } else {
    removeGACookies();
  }
}

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [prefs, setPrefs] = useState<CookiePreferences>({
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const stored = getStoredPreferences();
    if (!stored) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }

    setPrefs(stored);
    applyConsent(stored);
  }, []);

  const acceptAll = () => {
    const all = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    };
    savePreferences(all);
    applyConsent(all);
    setVisible(false);
  };

  const rejectAll = () => {
    const minimal = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    };
    savePreferences(minimal);
    applyConsent(minimal);
    setVisible(false);
  };

  const saveCustom = () => {
    savePreferences(prefs);
    applyConsent(prefs);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: 24,
        right: 24,
        zIndex: 9999,
        maxWidth: 520,
        margin: "0 auto",
        background: "#fff",
        borderRadius: 20,
        boxShadow: "0 8px 40px rgba(0,0,0,0.14)",
        border: "1px solid #E8EDF3",
        padding: showDetails ? "28px" : "24px 28px",
        animation: "slideUpBanner 0.35s ease both",
      }}
    >
      <style>{`
        @keyframes slideUpBanner {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 22, lineHeight: 1 }}>🍪</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1A2332", fontFamily: "'Poppins', sans-serif" }}>
            We use cookies
          </div>
          <p style={{ fontSize: 13, color: "#4A5568", margin: "4px 0 0", lineHeight: 1.55, fontFamily: "'Poppins', sans-serif" }}>
            We use cookies to improve your experience and comply with EU privacy law.{" "}
            <Link href="/cookie-policy" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>
              Cookie Policy
            </Link>
            {" · "}
            <Link href="/legal/privacy" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>

      {showDetails && (
        <div style={{ margin: "16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            {
              key: "necessary" as const,
              label: "Strictly Necessary",
              desc: "Required for the site to function. Cannot be disabled.",
              locked: true,
            },
            {
              key: "functional" as const,
              label: "Functional",
              desc: "Remembers your preferences and settings.",
              locked: false,
            },
            {
              key: "analytics" as const,
              label: "Analytics",
              desc: "Helps us understand how visitors use the site.",
              locked: false,
            },
            {
              key: "marketing" as const,
              label: "Marketing",
              desc: "Used to deliver relevant content and track campaign performance.",
              locked: false,
            },
          ].map((item) => (
            <div
              key={item.key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                borderRadius: 12,
                background: "#F7F9FC",
                border: "1px solid #E8EDF3",
              }}
            >
              <div style={{ flex: 1, paddingRight: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2332", fontFamily: "'Poppins', sans-serif" }}>
                  {item.label}
                  {item.locked && (
                    <span style={{ fontSize: 10, marginLeft: 6, color: "#8896A6", fontWeight: 500 }}>
                      Always on
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "#8896A6", marginTop: 2, fontFamily: "'Poppins', sans-serif" }}>
                  {item.desc}
                </div>
              </div>

              <button
                onClick={() => !item.locked && setPrefs((p) => ({ ...p, [item.key]: !p[item.key] }))}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  border: "none",
                  background: item.locked || prefs[item.key] ? "var(--primary)" : "#D1D5DB",
                  cursor: item.locked ? "default" : "pointer",
                  position: "relative",
                  flexShrink: 0,
                  transition: "background 0.2s ease",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 3,
                    left: item.locked || prefs[item.key] ? 22 : 3,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "#fff",
                    transition: "left 0.2s ease",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                  }}
                />
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" as const }}>
        <button
          onClick={acceptAll}
          style={{
            flex: 2,
            padding: "10px 0",
            borderRadius: 12,
            border: "none",
            background: "linear-gradient(135deg, #2EC4B6, #1A9E92)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "'Poppins', sans-serif",
            boxShadow: "0 2px 8px #2EC4B633",
          }}
        >
          Accept All
        </button>

        {showDetails ? (
          <button
            onClick={saveCustom}
            style={{
              flex: 2,
              padding: "10px 0",
              borderRadius: 12,
              border: "1.5px solid #2EC4B6",
              background: "#E8F8F6",
              color: "#1A9E92",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            Save Preferences
          </button>
        ) : (
          <button
            onClick={() => setShowDetails(true)}
            style={{
              flex: 2,
              padding: "10px 0",
              borderRadius: 12,
              border: "1.5px solid #E8EDF3",
              background: "#F7F9FC",
              color: "#4A5568",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            Manage Preferences
          </button>
        )}

        <button
          onClick={rejectAll}
          style={{
            flex: 1,
            padding: "10px 0",
            borderRadius: 12,
            border: "1.5px solid #E8EDF3",
            background: "#fff",
            color: "#8896A6",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          Reject
        </button>
      </div>
    </div>
  );
}