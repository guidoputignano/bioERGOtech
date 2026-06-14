import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { RegistrationForm } from "./RegistrationForm";
import {
  EVENT,
  EVENT_SLUG,
  SITE_URL,
  SESSIONS,
  ARCHIVE_MODE,
  RELATORI,
  RELATORI_COMING_SOON,
  MODERATORE,
  CONFRONTO,
  STATS,
  PERCHE_PARTECIPARE,
  FAQ,
} from "./content";

export const metadata: Metadata = {
  title: `${EVENT.titolo} . Fondazione bioERGOtech`,
  description: EVENT.sottotitolo,
  alternates: { canonical: `/eventi/${EVENT_SLUG}` },
  openGraph: {
    title: `${EVENT.titolo} . Fondazione bioERGOtech`,
    description: EVENT.sottotitolo,
    url: `${SITE_URL}/eventi/${EVENT_SLUG}`,
    images: [{ url: EVENT.ogImage }],
    type: "website",
  },
};

// Tinta morbida coerente con la homepage.
const SOFT_BRAND: CSSProperties = { "--primary-light": "#E1F5EE" } as CSSProperties;

function EventJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: EVENT.titolo,
    description: EVENT.sottotitolo,
    startDate: EVENT.startDateISO,
    endDate: EVENT.endDateISO,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    image: [`${SITE_URL}${EVENT.ogImage}`],
    location: SESSIONS.map((s) => ({
      "@type": "Place",
      name: s.luogo,
      address: { "@type": "PostalAddress", addressLocality: "Taranto", addressCountry: "IT" },
    })),
    organizer: {
      "@type": "Organization",
      name: EVENT.organizzatore,
      url: SITE_URL,
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/eventi/${EVENT_SLUG}`,
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default function EventPage() {
  return (
    <>
      <EventJsonLd />
      <style>{`
        .event-page .section-title { padding-bottom: 26px; margin-bottom: 2rem; }
        .event-page .section-title::after { width: 72px; height: 4px; }
      `}</style>
      <Navbar />

      <div style={SOFT_BRAND} className="event-page">
        {/* ── Hero ── */}
        <section className="hero" style={{ paddingTop: "120px" }}>
          <div className="container mx-auto px-6 pt-8 pb-28 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-10">
              <div className="order-2 md:order-1">
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--primary-dark)",
                    marginBottom: 16,
                  }}
                >
                  {EVENT.occhiello}
                </div>
                <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6 text-gray-800">
                  {EVENT.titolo}
                </h1>
                <p className="text-xl text-gray-700">{EVENT.sottotitolo}</p>
              </div>
              <div className="order-1 md:order-2 flex justify-center">
                <Image
                  src="/assets/images/eventi/vivere-piu-a-lungo/hero.webp"
                  alt="Il pubblico durante una giornata dell'evento della Fondazione bioERGOtech a Taranto"
                  width={1200}
                  height={800}
                  priority
                  sizes="(max-width: 768px) 100vw, 560px"
                  className="rounded-lg shadow-xl w-full h-auto"
                />
              </div>
            </div>

            <div className="max-w-3xl">
              {/* Box informativi */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {[
                  { icon: "fa-calendar", label: "Data", value: EVENT.dataLabel },
                  { icon: "fa-clock", label: "Orario", value: EVENT.orarioLabel },
                  { icon: "fa-location-dot", label: "Luogo", value: EVENT.luogoLabel },
                ].map((box) => (
                  <div key={box.label} className="card-sm" style={{ padding: 18 }}>
                    <div className="flex items-center gap-2 mb-1">
                      <i className={`fas ${box.icon}`} style={{ color: "var(--primary)" }} />
                      <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-light)" }}>
                        {box.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, color: "#1A2332", fontWeight: 500 }}>{box.value}</div>
                  </div>
                ))}
              </div>

              {!ARCHIVE_MODE && (
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="?cat=studente#iscrizione" className="btn-primary text-center">
                    Iscriviti come studente/scuola
                  </Link>
                  <Link href="?cat=startup#iscrizione" className="btn-outline text-center">
                    Iscriviti come startup/partner
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Tagline ── */}
        <section style={{ background: "var(--primary-light)", padding: "32px 0" }}>
          <div className="container mx-auto px-6">
            <p className="text-lg md:text-xl font-medium text-center" style={{ color: "var(--primary-dark)" }}>
              {EVENT.tagline}
            </p>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="section-sm">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {STATS.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="stat-number">{s.num}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Giorno 1 ── */}
        <section className="section bg-light-gray">
          <div className="container mx-auto px-6">
            <h2 className="section-title">Giorno 1 . Giovedì 11 dicembre . Iacovone, Taranto</h2>
            <p className="text-lg text-gray-700 max-w-3xl mb-4">
              Mattina, programma scientifico (9:00 . 13:00). Scienziati, medici e campioni dello sport a confronto.
            </p>
            <p className="text-sm mb-10" style={{ color: "var(--text-light)" }}>
              Programma in aggiornamento. Altri relatori sono in via di conferma.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-12">
              {RELATORI.map((r) => (
                <div key={r.nome} className="card-sm text-center" style={{ padding: 18 }}>
                  <div style={{ position: "relative", width: 96, height: 96, margin: "0 auto 12px" }}>
                    <Image
                      src={r.img}
                      alt={r.nome}
                      fill
                      sizes="96px"
                      className="rounded-full object-cover"
                      style={{ filter: r.confermato ? undefined : "grayscale(1)", opacity: r.confermato ? 1 : 0.85 }}
                    />
                  </div>
                  <h3 className="font-semibold text-gray-800 text-sm leading-tight">{r.nome}</h3>
                  {r.confermato ? (
                    <p className="text-xs text-gray-600 mt-1">{r.ruolo}</p>
                  ) : (
                    <span className="badge mt-2 inline-block" style={{ background: "#FEF3DC", color: "#B7791F", fontSize: "0.6rem" }}>
                      In attesa di conferma
                    </span>
                  )}
                </div>
              ))}

              {RELATORI_COMING_SOON && (
                <div
                  className="card-sm text-center flex flex-col items-center justify-center"
                  style={{ padding: 18, borderStyle: "dashed", background: "var(--bg-light)" }}
                >
                  <div
                    style={{
                      width: 96,
                      height: 96,
                      margin: "0 auto 12px",
                      borderRadius: "50%",
                      border: "2px dashed var(--primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <i className="fas fa-ellipsis text-2xl" style={{ color: "var(--primary)" }} />
                  </div>
                  <h3 className="font-semibold text-gray-800 text-sm">Coming soon</h3>
                  <p className="text-xs text-gray-600 mt-1">Altri relatori in arrivo</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              <div className="card flex items-center gap-4" style={{ borderTop: "4px solid var(--primary)" }}>
                <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
                  <Image src={MODERATORE.img} alt={MODERATORE.nome} fill sizes="72px" className="rounded-full object-cover" style={{ filter: MODERATORE.confermato ? undefined : "grayscale(1)", opacity: MODERATORE.confermato ? 1 : 0.85 }} />
                </div>
                <div>
                  <span className="badge" style={{ background: "var(--primary-light)", color: "var(--primary-dark)", fontSize: "0.6rem" }}>
                    Moderatore
                  </span>
                  <h3 className="font-semibold text-gray-800 mt-2">{MODERATORE.nome}</h3>
                  <p className="text-sm text-gray-600">{MODERATORE.ruolo}</p>
                  {!MODERATORE.confermato && (
                    <span className="badge mt-2 inline-block" style={{ background: "#FEF3DC", color: "#B7791F", fontSize: "0.6rem" }}>
                      In attesa di conferma
                    </span>
                  )}
                </div>
              </div>
              <div className="card flex items-center gap-4" style={{ borderTop: "4px solid var(--primary)" }}>
                <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
                  <Image src={CONFRONTO.img} alt="Francesco Montervino" fill sizes="72px" className="rounded-full object-cover" style={{ filter: CONFRONTO.confermato ? undefined : "grayscale(1)", opacity: CONFRONTO.confermato ? 1 : 0.85 }} />
                </div>
                <div>
                  <span className="badge" style={{ background: "var(--primary-light)", color: "var(--primary-dark)", fontSize: "0.6rem" }}>
                    {CONFRONTO.titolo}
                  </span>
                  <p className="text-sm text-gray-600 mt-2">{CONFRONTO.testo}</p>
                  {!CONFRONTO.confermato && (
                    <span className="badge mt-2 inline-block" style={{ background: "#FEF3DC", color: "#B7791F", fontSize: "0.6rem" }}>
                      In attesa di conferma
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="card" style={{ background: "var(--primary-light)" }}>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Pomeriggio . I progetti dei ragazzi
              </h3>
              <p className="text-gray-700">
                Dieci gruppi di ragazzi presentano i dieci migliori progetti. Una giuria, composta dagli sponsor dei progetti, valuta le idee e proclama il vincitore. Premio al miglior progetto: un viaggio a New York.
              </p>
            </div>
          </div>
        </section>

        {/* ── Giorno 2 ── */}
        <section className="section">
          <div className="container mx-auto px-6">
            <h2 className="section-title">Giorno 2 . Venerdì 12 dicembre . Camera di Commercio, Taranto</h2>
            <p className="text-lg text-gray-700 max-w-3xl mb-8">
              Le startup. Otto startup presentano i loro progetti a investitori, partner e istituzioni. Focus su pitch e networking.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { icon: "fa-rocket", t: "8 startup", d: "Progetti selezionati in pitch." },
                { icon: "fa-handshake", t: "Pitch & networking", d: "Investitori, partner e istituzioni." },
                { icon: "fa-building-columns", t: "Camera di Commercio", d: "Sede del giorno 2, Taranto." },
              ].map((c) => (
                <div key={c.t} className="card-sm" style={{ padding: 24 }}>
                  <span className="icon-circle icon-circle-primary" style={{ width: 48, height: 48 }}>
                    <i className={`fas ${c.icon} text-xl`} />
                  </span>
                  <h3 className="font-semibold text-gray-800 mt-4 mb-1">{c.t}</h3>
                  <p className="text-sm text-gray-600">{c.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Perché partecipare ── */}
        <section className="section bg-light-gray">
          <div className="container mx-auto px-6">
            <h2 className="section-title">Perché partecipare</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              {PERCHE_PARTECIPARE.map((p) => (
                <div key={p.titolo} className="card-sm flex items-start gap-4" style={{ padding: 24 }}>
                  <span className="icon-circle icon-circle-primary" style={{ width: 48, height: 48, flexShrink: 0 }}>
                    <i className={`fas ${p.icona} text-xl`} />
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">{p.titolo}</h3>
                    <p className="text-sm text-gray-600">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Iscrizione ── */}
        <section className="section" id="iscrizione">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              <div>
                <h2 className="section-title">{ARCHIVE_MODE ? "Evento concluso" : "Iscriviti all'evento"}</h2>
                {ARCHIVE_MODE ? (
                  <p className="text-lg text-gray-700">
                    Le iscrizioni sono chiuse. Grazie a tutte le persone che hanno partecipato. Per restare aggiornato sulle prossime iniziative della Fondazione, scrivi a info@bioergotech.org.
                  </p>
                ) : (
                  <>
                    <p className="text-lg text-gray-700 mb-6">
                      La partecipazione è gratuita e i posti sono limitati. Scegli la categoria e una o più sessioni. Riceverai un&apos;email di conferma con il codice e il QR per il check-in.
                    </p>
                    <ul className="space-y-3">
                      {SESSIONS.map((s) => (
                        <li key={s.slug} className="flex items-start gap-3 text-gray-700">
                          <i className="fas fa-circle-check mt-1" style={{ color: "var(--primary)" }} />
                          <span>
                            <strong>{s.titolo}</strong>
                            <br />
                            <span className="text-sm text-gray-600">
                              {s.giornoLabel}, {s.orario} . {s.luogo}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
              {!ARCHIVE_MODE && <RegistrationForm />}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="section bg-light-gray">
          <div className="container mx-auto px-6">
            <h2 className="section-title text-center">Domande frequenti</h2>
            <div className="max-w-3xl mx-auto mt-8 space-y-4">
              {FAQ.map((f) => (
                <details key={f.q} className="card group" style={{ padding: 0, overflow: "hidden" }}>
                  <summary className="flex items-center justify-between gap-4 cursor-pointer list-none p-6 font-semibold text-gray-800 [&::-webkit-details-marker]:hidden">
                    <span>{f.q}</span>
                    <i className="fas fa-chevron-down text-sm transition-transform group-open:rotate-180" style={{ color: "var(--primary)" }} aria-hidden="true" />
                  </summary>
                  <div className="px-6 pb-6 text-gray-700 leading-relaxed">{f.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>
      </div>

      <SiteFooter />
    </>
  );
}
