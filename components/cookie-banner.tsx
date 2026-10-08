"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { EVENTO_APRI_COOKIE } from "@/app/cookie-policy/content";

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

const ADS_ID = "AW-17391421551";

/**
 * Pagine in cui il tag pubblicitario non si carica mai, nemmeno con il
 * consenso "marketing": il corso e le aree riservate dei percorsi sono usati
 * anche da studenti minorenni, e lì non facciamo remarketing.
 */
const PERCORSI_SENZA_ADS = [
  "/courses",
  "/eventi/vivere-piu-a-lungo/licei",
  "/eventi/vivere-piu-a-lungo/universita",
  "/member-portal",
  "/auth",
];

function adsConsentiti(): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  return !PERCORSI_SENZA_ADS.some((p) => path === p || path.startsWith(p + "/"));
}

/**
 * Carica gtag.js una volta sola e invia le configurazioni consentite.
 *
 * Prima il layout caricava gtag.js e il tag Ads su ogni pagina, prima di
 * qualsiasi scelta nel banner: il consenso decideva solo se configurare
 * Analytics. Ora lo script parte soltanto da qui, cioè dopo il consenso, e
 * la configurazione di ciascun tag dipende dalla sua categoria. La config
 * parte a script caricato, altrimenti al primo caricamento con consenso già
 * dato non arriverebbe mai.
 */
function loadGoogleTags(prefs: { analytics: boolean; marketing: boolean }) {
  if (typeof window === "undefined") return;
  const conAds = prefs.marketing && adsConsentiti();
  if (!prefs.analytics && !conAds) return;

  const configura = () => {
    if (prefs.analytics) window.gtag?.("config", GA_ID, { anonymize_ip: true });
    if (conAds) window.gtag?.("config", ADS_ID);
  };

  if (window.gtag && document.getElementById("gtag-script")) {
    configura();
    return;
  }

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  }
  window.gtag = gtag as (...args: unknown[]) => void;
  window.gtag("js", new Date());

  if (!document.getElementById("gtag-script")) {
    const script = document.createElement("script");
    script.id = "gtag-script";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    script.onload = configura;
    document.head.appendChild(script);
  } else {
    configura();
  }
}

function removeGACookies(prefissi: string[]) {
  if (typeof document === "undefined") return;
  const cookies = document.cookie.split(";");
  for (let i = 0; i < cookies.length; i++) {
    const name = cookies[i].split("=")[0].trim();
    if (prefissi.some((p) => name.startsWith(p))) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname}`;
    }
  }
}

function applyConsent(prefs: CookiePreferences) {
  loadGoogleTags(prefs);
  if (!prefs.analytics) removeGACookies(["_ga", "_gid", "_gat"]);
  // Revocato il marketing, via anche i cookie di conversione di Google Ads.
  if (!prefs.marketing) removeGACookies(["_gcl"]);
}

/**
 * Testi del banner. Il sito è in inglese, ma le pagine dei percorsi, degli
 * eventi e delle informative italiane le leggono scuole, famiglie e studenti:
 * lì il banner parla italiano, perché un consenso dato su un testo che non si
 * capisce non è un consenso informato.
 */
const TESTI = {
  en: {
    titolo: "We use cookies",
    testo: "Technical cookies keep the site working. With your consent we also use Google Analytics to measure visits and Google Ads to measure our campaigns.",
    policy: "Cookie Policy",
    policyHref: "/cookie-policy",
    privacy: "Privacy Policy",
    privacyHref: "/legal/privacy",
    accetta: "Accept all",
    rifiuta: "Reject all",
    gestisci: "Manage preferences",
    salva: "Save preferences",
    sempre: "Always on",
    voci: {
      necessary: ["Strictly necessary", "Sign-in to the reserved areas and your cookie choice. Cannot be disabled."],
      analytics: ["Analytics (Google Analytics)", "Helps us understand how visitors use the site."],
      marketing: ["Marketing (Google Ads)", "Measures the results of our campaigns. Never used on course pages."],
    },
  },
  it: {
    titolo: "Usiamo i cookie",
    testo: "I cookie tecnici servono al funzionamento del sito. Con il tuo consenso usiamo anche Google Analytics per misurare le visite e Google Ads per misurare le nostre campagne.",
    policy: "Cookie policy",
    policyHref: "/cookie-policy/it",
    privacy: "Informativa privacy",
    privacyHref: "/legal/informativa-privacy",
    accetta: "Accetta tutti",
    rifiuta: "Rifiuta tutti",
    gestisci: "Gestisci preferenze",
    salva: "Salva preferenze",
    sempre: "Sempre attivi",
    voci: {
      necessary: ["Tecnici necessari", "Accesso alle aree riservate e ricordo della tua scelta. Non disattivabili."],
      analytics: ["Analisi (Google Analytics)", "Ci aiuta a capire come viene usato il sito."],
      marketing: ["Marketing (Google Ads)", "Misura i risultati delle nostre campagne. Mai nelle pagine del corso."],
    },
  },
} as const;

const PERCORSI_ITALIANI = ["/eventi", "/legal/informativa-privacy", "/cookie-policy/it"];

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export default function CookieBanner() {
  const pathname = usePathname() ?? "";
  const t = PERCORSI_ITALIANI.some((p) => pathname === p || pathname.startsWith(p + "/")) ? TESTI.it : TESTI.en;
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
      // No prior consent: show banner after short delay
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
    // Prior consent exists: apply immediately (this is the reload path)
    setPrefs(stored);
    applyConsent(stored);
  }, []);

  // "Impostazioni dei cookie" dal piè di pagina o dalla cookie policy: riapre
  // il banner con le scelte attuali, così il consenso si cambia o si revoca
  // in qualsiasi momento.
  useEffect(() => {
    const apri = () => {
      const stored = getStoredPreferences();
      if (stored) setPrefs(stored);
      setShowDetails(true);
      setVisible(true);
    };
    window.addEventListener(EVENTO_APRI_COOKIE, apri);
    return () => window.removeEventListener(EVENTO_APRI_COOKIE, apri);
  }, []);

  const acceptAll = () => {
    const all: CookiePreferences = { necessary: true, functional: true, analytics: true, marketing: true };
    savePreferences(all);
    applyConsent(all);
    setVisible(false);
  };

  const rejectAll = () => {
    const minimal: CookiePreferences = { necessary: true, functional: false, analytics: false, marketing: false };
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
            {t.titolo}
          </div>
          <p style={{ fontSize: 13, color: "#4A5568", margin: "4px 0 0", lineHeight: 1.55, fontFamily: "'Poppins', sans-serif" }}>
            {t.testo}{" "}
            <Link href={t.policyHref} style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>
              {t.policy}
            </Link>
            {" · "}
            <Link href={t.privacyHref} style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>
              {t.privacy}
            </Link>
          </p>
        </div>
      </div>

      {showDetails && (
        <div style={{ margin: "16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { key: "necessary" as const, label: t.voci.necessary[0], desc: t.voci.necessary[1], locked: true },
            { key: "analytics" as const, label: t.voci.analytics[0], desc: t.voci.analytics[1], locked: false },
            { key: "marketing" as const, label: t.voci.marketing[0], desc: t.voci.marketing[1], locked: false },
          ].map((item) => (
            <div
              key={item.key}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 12, background: "#F7F9FC", border: "1px solid #E8EDF3" }}
            >
              <div style={{ flex: 1, paddingRight: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2332", fontFamily: "'Poppins', sans-serif" }}>
                  {item.label}
                  {item.locked && <span style={{ fontSize: 10, marginLeft: 6, color: "#8896A6", fontWeight: 500 }}>{t.sempre}</span>}
                </div>
                <div style={{ fontSize: 11, color: "#8896A6", marginTop: 2, fontFamily: "'Poppins', sans-serif" }}>{item.desc}</div>
              </div>
              <button
                onClick={() => !item.locked && setPrefs((p) => ({ ...p, [item.key]: !p[item.key] }))}
                style={{ width: 44, height: 24, borderRadius: 12, border: "none", background: item.locked || prefs[item.key] ? "var(--primary)" : "#D1D5DB", cursor: item.locked ? "default" : "pointer", position: "relative", flexShrink: 0, transition: "background 0.2s ease" }}
              >
                <div
                  style={{ position: "absolute", top: 3, left: item.locked || prefs[item.key] ? 22 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }}
                />
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" as const }}>
        <button
          onClick={acceptAll}
          style={{ flex: 2, padding: "10px 0", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #2EC4B6, #1A9E92)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Poppins', sans-serif", boxShadow: "0 2px 8px #2EC4B633" }}
        >
          {t.accetta}
        </button>

        {showDetails ? (
          <button
            onClick={saveCustom}
            style={{ flex: 2, padding: "10px 0", borderRadius: 12, border: "1.5px solid #2EC4B6", background: "#E8F8F6", color: "#1A9E92", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Poppins', sans-serif" }}
          >
            {t.salva}
          </button>
        ) : (
          <button
            onClick={() => setShowDetails(true)}
            style={{ flex: 2, padding: "10px 0", borderRadius: 12, border: "1.5px solid #E8EDF3", background: "#F7F9FC", color: "#4A5568", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Poppins', sans-serif" }}
          >
            {t.gestisci}
          </button>
        )}

        {/* Rifiutare deve essere facile quanto accettare (linee guida del
            Garante, 10 giugno 2021): stesso peso, stessa dimensione. */}
        <button
          onClick={rejectAll}
          style={{ flex: 2, padding: "10px 0", borderRadius: 12, border: "1.5px solid #2EC4B6", background: "#fff", color: "#1A9E92", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Poppins', sans-serif" }}
        >
          {t.rifiuta}
        </button>
      </div>
    </div>
  );
}
