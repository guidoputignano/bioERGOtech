"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CATEGORIE, SESSIONS, categoriaLabel } from "../content";

type Bridge = {
  id: string;
  is_waitlist: boolean;
  stato_checkin: "registrato" | "presente" | "assente";
  checkin_ts: string | null;
  event_sessions: { slug: string; titolo: string } | null;
};

type Registration = {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  telefono: string | null;
  categoria: string;
  organizzazione: string | null;
  codice_univoco: string;
  consenso_marketing: boolean;
  event_registration_sessions: Bridge[];
};

type Seat = { slug: string; capienza_max: number; confermati: number; rimanenti: number };

const STATE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  presente: { bg: "#E1F5EE", color: "#0F6E56", label: "Presente" },
  assente: { bg: "#FDECEF", color: "#C0344E", label: "Assente" },
  registrato: { bg: "#EEF1F5", color: "#5A6B7B", label: "Registrato" },
};

export function AdminPanel() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [q, setQ] = useState("");
  const [session, setSession] = useState("");
  const [categoria, setCategoria] = useState("");
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (session) params.set("session", session);
    if (categoria) params.set("categoria", categoria);
    const res = await fetch(`/api/eventi/admin/registrations?${params.toString()}`, { cache: "no-store" });
    const data = await res.json();
    setRegistrations(data.registrations ?? []);
    setSeats(data.seats ?? []);
    setLoading(false);
  }, [q, session, categoria]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const setStato = async (bridgeId: string, stato: string) => {
    await fetch("/api/eventi/admin/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registration_session_id: bridgeId, stato }),
    });
    load();
  };

  // ── Scanner QR tramite fotocamera (BarcodeDetector dove disponibile) ──
  const stopScan = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const startScan = async () => {
    setScanError(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Detector = (window as any).BarcodeDetector;
    if (!Detector) {
      setScanError("Lo scanner non è supportato da questo browser. Cerca il codice manualmente.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setScanning(true);
      const detector = new Detector({ formats: ["qr_code"] });
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      const tick = async () => {
        if (!streamRef.current) return;
        try {
          const codes = await detector.detect(video);
          if (codes.length > 0 && codes[0].rawValue) {
            setQ(codes[0].rawValue.trim());
            stopScan();
            return;
          }
        } catch {
          /* frame ignorato */
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch {
      setScanError("Impossibile accedere alla fotocamera.");
      stopScan();
    }
  };

  useEffect(() => () => stopScan(), [stopScan]);

  const seatBySlug = (slug: string) => seats.find((s) => s.slug === slug);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Check-in evento</h1>
        <a href="/api/eventi/admin/export" className="btn-outline">
          <i className="fas fa-download mr-2" /> Export CSV
        </a>
      </div>

      {/* Conteggi live per sessione */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {SESSIONS.map((s) => {
          const seat = seatBySlug(s.slug);
          return (
            <div key={s.slug} className="card-sm" style={{ padding: 20 }}>
              <div className="text-sm font-semibold text-gray-800 mb-2">{s.titolo}</div>
              <div className="flex gap-4">
                <div>
                  <div className="stat-number" style={{ fontSize: 28 }}>{seat?.confermati ?? 0}</div>
                  <div className="stat-label">Iscritti</div>
                </div>
                <div>
                  <div className="stat-number" style={{ fontSize: 28 }}>{seat?.rimanenti ?? s.capienza}</div>
                  <div className="stat-label">Posti liberi</div>
                </div>
                <div>
                  <div className="stat-number" style={{ fontSize: 28 }}>{seat?.capienza_max ?? s.capienza}</div>
                  <div className="stat-label">Capienza</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filtri + scanner */}
      <div className="card mb-6" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <input
          placeholder="Cerca per nome, email o codice…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: "1 1 240px", height: 40, borderRadius: 8, border: "1px solid var(--border-color)", padding: "0 12px", fontSize: 14 }}
        />
        <select value={session} onChange={(e) => setSession(e.target.value)} style={{ height: 40, borderRadius: 8, border: "1px solid var(--border-color)", padding: "0 10px", fontSize: 14 }}>
          <option value="">Tutte le sessioni</option>
          {SESSIONS.map((s) => (
            <option key={s.slug} value={s.slug}>{s.titolo}</option>
          ))}
        </select>
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={{ height: 40, borderRadius: 8, border: "1px solid var(--border-color)", padding: "0 10px", fontSize: 14 }}>
          <option value="">Tutte le categorie</option>
          {CATEGORIE.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <button type="button" onClick={scanning ? stopScan : startScan} className="btn-primary" style={{ padding: "9px 16px" }}>
          <i className="fas fa-qrcode mr-2" /> {scanning ? "Ferma scanner" : "Scansiona QR"}
        </button>
      </div>

      {scanError && <p style={{ color: "#C0344E", fontSize: 14, marginBottom: 12 }}>{scanError}</p>}
      {scanning && (
        <div className="card mb-6" style={{ textAlign: "center" }}>
          <video ref={videoRef} style={{ width: "100%", maxWidth: 380, borderRadius: 12, margin: "0 auto" }} muted playsInline />
          <p style={{ fontSize: 13, color: "var(--text-light)", marginTop: 8 }}>Inquadra il QR del biglietto.</p>
        </div>
      )}

      {/* Lista iscritti */}
      {loading ? (
        <p className="text-gray-600">Caricamento…</p>
      ) : registrations.length === 0 ? (
        <p className="text-gray-600">Nessun iscritto trovato.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {registrations.map((r) => (
            <div key={r.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-semibold text-gray-800">
                    {r.nome} {r.cognome}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {r.email}
                    {r.telefono ? ` . ${r.telefono}` : ""} . {categoriaLabel(r.categoria)}
                    {r.organizzazione ? ` . ${r.organizzazione}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {r.consenso_marketing && (
                    <span className="badge" style={{ background: "#E1F5EE", color: "#0F6E56", fontSize: "0.65rem" }}>
                      Marketing OK
                    </span>
                  )}
                  <span style={{ fontFamily: "monospace", fontSize: 13, color: "var(--text-light)" }}>{r.codice_univoco}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {r.event_registration_sessions.map((b) => {
                  const st = STATE_STYLE[b.stato_checkin];
                  return (
                    <div
                      key={b.id}
                      className="flex flex-wrap items-center justify-between gap-2"
                      style={{ background: "var(--bg-light)", borderRadius: 10, padding: "10px 14px" }}
                    >
                      <div className="text-sm text-gray-800">
                        {b.event_sessions?.titolo}
                        {b.is_waitlist && <span style={{ color: "#B7791F", fontWeight: 600 }}> . lista d&apos;attesa</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="badge" style={{ background: st.bg, color: st.color, fontSize: "0.65rem" }}>
                          {st.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => setStato(b.id, "presente")}
                          style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #0F6E56", background: b.stato_checkin === "presente" ? "#0F6E56" : "#fff", color: b.stato_checkin === "presente" ? "#fff" : "#0F6E56", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                        >
                          Presente
                        </button>
                        <button
                          type="button"
                          onClick={() => setStato(b.id, "assente")}
                          style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #C0344E", background: b.stato_checkin === "assente" ? "#C0344E" : "#fff", color: b.stato_checkin === "assente" ? "#fff" : "#C0344E", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                        >
                          Assente
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
