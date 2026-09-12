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
  PROGRAMMA_GIORNO1,
  ETICHETTA_VOCE,
  nomiVoce,
  relatoriVoce,
  RELATORI_PUBBLICI,
  partnerVoce,
  MODERATRICE,
  STATS,
  PERCHE_PARTECIPARE,
  FAQ,
} from "./content";
// Niente `statoCandidature()` qui: dipende dall'ora e congelerebbe questa
// pagina statica allo stato del giorno del deploy. FORZA_APERTURA invece e
// una costante di build, quindi si puo leggere senza perdere la staticita.
import {
  BANDO_PATH,
  CANDIDATURE_APERTURA_LABEL,
  CANDIDATURE_SCADENZA_LABEL,
  FORZA_APERTURA,
} from "./bando/content";
import { LICEI_PATH } from "./licei/content";
import { UNIVERSITA_PATH } from "./universita/content";

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

// Team organizzativo dell'evento.
type Organizzatore = {
  name: string;
  role: string;
  desc: string;
  img: string;
  imgPosition?: string;
  /**
   * La foto non è ancora in repository. La scheda resta qui, completa, ma non
   * compare nella griglia, così non pubblichiamo un'immagine rotta. Quando il
   * file arriva basta togliere questa riga.
   */
  daCaricare?: boolean;
};
const TEAM_ORGANIZZATIVO: Organizzatore[] = [
  {
    name: "Roberto Russo",
    role: "Studente Ambasciatore",
    desc: "Studente delle scuole superiori, segue l'organizzazione dell'evento nel team operativo.",
    img: "/assets/images/About-us/Roberto-Russo.jpeg",
  },
  {
    name: "Mimma Leone",
    role: "Membro del Consiglio",
    desc: "Esperta legale e imprenditrice, promuove progetti educativi e universitari.",
    img: "/assets/images/About-us/Mimma-Leone.webp",
  },
  {
    name: "Alessia Soru",
    role: "Responsabile Progetti Scientifici",
    desc: "Dottoranda in Oncologia, Ematologia e Patologia all'Università di Bologna, membro del consiglio di Women&Tech® ETS.",
    img: "/assets/images/About-us/Alessia-Soru.webp",
  },
  {
    name: "Saria Miccoli",
    role: "Responsabile Comunicazione",
    desc: "Designer, cura l'identità visiva e la comunicazione della Fondazione.",
    img: "/assets/images/About-us/Saria-Miccoli.webp",
  },
  {
    name: "Paola Cocozza",
    role: "Project Manager",
    desc: "Project manager per società sportive ed enti di formazione, segue progetti sociali nello sport su inclusione e parità di genere.",
    img: "/assets/images/About-us/Paola Cocozza.jpg",
    imgPosition: "center 15%",
  },
  {
    name: "Gianni Tartaglia",
    role: "Consigliere Comunale di Taranto",
    desc: "Consigliere comunale, si occupa di educazione, cultura, sport e inclusione per una Taranto più equa.",
    img: "/assets/images/About-us/Gianni Tartaglia.png",
    imgPosition: "center 15%",
  },
  {
    name: "Adriana Chirico",
    role: "Giurista",
    desc: "Docente presso il Dipartimento Jonico dell'Università degli Studi di Bari Aldo Moro.",
    img: "/assets/images/About-us/Adriana-Chirico.webp",
  },
  {
    name: "Giulia Chironi",
    role: "Avvocata",
    desc: "Avvocata del foro di Taranto e dottoressa di ricerca in diritto tributario. Si occupa di fiscalità ambientale e di tassazione degli alimenti salutistici.",
    img: "/assets/images/About-us/Giulia-Chironi.webp",
  },
];

/** Le schede del team che hanno già la foto, le uniche che la pagina pubblica. */
const TEAM_PUBBLICO = TEAM_ORGANIZZATIVO.filter((p) => !p.daCaricare);

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
      "@type": "ResearchOrganization",
      name: EVENT.organizzatore,
      url: SITE_URL,
    },
    performer: [...RELATORI_PUBBLICI.map((r) => r.nome), MODERATRICE.nome].map((name) => ({
      "@type": "Person",
      name,
    })),
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
        {/* La `.hero` del design system e' un blocco centrato alto 100vh. Qui
            serve un banner a tutta larghezza con il titolo sopra, quindi
            neutralizziamo flex e altezza minima e teniamo solo il gradiente,
            che prosegue sotto il banner dietro i box informativi. Il padding
            in alto e' l'altezza esatta della navbar fissa, 70px. */}
        <section className="hero" style={{ display: "block", minHeight: 0, paddingTop: 70 }}>
          {/* L'immagine e' un panorama 2.3:1: dentro mezza colonna diventava
              una striscia di poco piu' di 200px di altezza e la scena si
              perdeva. A tutta larghezza ha la forma per cui e' composta. */}
          <div className="relative" style={{ height: "min(56vh, 660px)", minHeight: 320 }}>
            <Image
              src="/assets/images/eventi/vivere-piu-a-lungo/hero.webp"
              alt="Illustrazione: un'atleta corre sul lungomare di Taranto davanti al Castello Aragonese, affiancata dalla figura luminosa di un corpo umano digitale e da una doppia elica del DNA"
              fill
              priority
              sizes="100vw"
              className="object-cover"
              /* Ancorata in alto. Su schermi larghi `object-cover` scala
                 sulla larghezza e sborda in altezza: con un'ancora centrale il
                 taglio arrivava dall'alto e tagliava le teste. Da qui in giu'
                 si perde semmai il lastricato in basso, che il velo scuro
                 copre comunque. */
              style={{ objectPosition: "center top" }}
            />
            {/* Due veli sovrapposti. Quello dal basso regge il contrasto del
                titolo; quello da sinistra scurisce la fascia dove cade il
                testo, che altrimenti finisce sulla parte chiara della scena.
                Insieme lasciano leggibile il cielo e il castello a destra. */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                background: [
                  "linear-gradient(to top, rgba(9,20,28,0.92) 0%, rgba(9,20,28,0.70) 30%, rgba(9,20,28,0.28) 58%, rgba(9,20,28,0) 92%)",
                  "linear-gradient(to right, rgba(9,20,28,0.66) 0%, rgba(9,20,28,0.30) 45%, rgba(9,20,28,0) 78%)",
                ].join(", "),
              }}
            />
            <div
              className="container mx-auto px-6 relative h-full flex flex-col justify-end"
              style={{ paddingBottom: 36 }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#7FE3D8",
                  marginBottom: 14,
                  textShadow: "0 1px 10px rgba(0,0,0,0.55)",
                }}
              >
                {EVENT.occhiello}
              </div>
              <h1
                className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight text-white"
                style={{
                  marginBottom: 12,
                  maxWidth: "min(100%, 680px)",
                  textShadow: "0 2px 18px rgba(0,0,0,0.55)",
                }}
              >
                {EVENT.titolo}
              </h1>
              <p
                className="text-base sm:text-lg md:text-xl"
                style={{
                  color: "rgba(255,255,255,0.92)",
                  maxWidth: "min(100%, 620px)",
                  textShadow: "0 1px 12px rgba(0,0,0,0.55)",
                }}
              >
                {EVENT.sottotitolo}
              </p>
            </div>
          </div>

          <div className="container mx-auto px-6 pt-10 pb-24 relative z-10">
            {/* Box informativi: tre colonne uguali su tutta la larghezza del
                contenitore. Prima stavano in una colonna da 768px allineata a
                sinistra, che sotto un banner a tutta larghezza lasciava mezzo
                schermo vuoto a destra. */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
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
              <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 mt-8">
                <Link
                  href="?cat=studente#iscrizione"
                  className="btn-primary text-center"
                  style={{ minWidth: 250 }}
                >
                  Iscriviti come studente/scuola
                </Link>
                <Link
                  href="?cat=startup#iscrizione"
                  className="btn-outline text-center"
                  style={{ minWidth: 250 }}
                >
                  Iscriviti come startup/partner
                </Link>
                <Link
                  href={BANDO_PATH}
                  className="btn-outline text-center"
                  style={{ minWidth: 250 }}
                >
                  Candidati con la tua startup
                </Link>
              </div>
            )}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
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
            <h2 className="section-title">Giorno 1 . Giovedì 10 dicembre . PalaMazzola, Taranto</h2>
            <p className="text-lg text-gray-700 max-w-3xl mb-10">
              Una giornata al PalaMazzola (9:00 . 16:00). Sette panel su sport, salute, robotica e intelligenza artificiale si alternano ai progetti dei ragazzi. Nel pomeriggio, il concerto aperto al pubblico.
            </p>

            {/* Moderatrice della giornata, prima del programma che conduce */}
            <div
              className="card-sm flex items-center gap-4 mb-10"
              style={{ padding: 18, maxWidth: 420, borderLeft: "4px solid var(--primary)" }}
            >
              <span style={{ position: "relative", width: 48, height: 48, flexShrink: 0 }}>
                <Image
                  src={MODERATRICE.img}
                  alt={MODERATRICE.nome}
                  fill
                  sizes="48px"
                  className="rounded-full object-cover"
                />
              </span>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-light)" }}>
                  Moderatrice
                </span>
                <h4 className="font-semibold text-gray-800" style={{ fontSize: 15, marginTop: 2 }}>{MODERATRICE.nome}</h4>
                <p className="text-gray-600" style={{ fontSize: 13 }}>{MODERATRICE.ruolo}</p>
              </div>
            </div>

            {/* Programma del giorno 1: una sola linea del tempo, con i volti nei panel */}
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Il programma della giornata</h3>
            <p className="text-sm text-gray-600 mb-8">
              Dalle 9:00, sette panel di dialogo si alternano ai progetti dei ragazzi, fino alla proclamazione del gruppo vincitore e al concerto. Per ogni panel trovi chi sale sul palco.
            </p>
            <ol style={{ listStyle: "none", padding: 0, margin: "0 0 3rem", maxWidth: 880 }}>
              {PROGRAMMA_GIORNO1.map((v, i) => {
                const isPanel = v.tipo === "panel";
                const last = i === PROGRAMMA_GIORNO1.length - 1;
                const relatori = relatoriVoce(v);
                const partner = partnerVoce(v);
                const ospiti = v.ospiti ?? [];
                return (
                  <li
                    key={i}
                    className="relative flex gap-4 sm:gap-5"
                    style={{ paddingBottom: last ? 0 : isPanel ? 26 : 20 }}
                  >
                    {/* Linea verticale che collega i nodi. */}
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        left: 22,
                        width: 2,
                        background: "var(--primary-light)",
                        zIndex: 0,
                        top: i === 0 ? 23 : 0,
                        ...(last ? { height: 23 } : { bottom: 0 }),
                      }}
                    />
                    {/* Nodo. I panel portano un disco pieno numerato, le voci di
                        raccordo un pallino piu piccolo, centrato nello stesso slot
                        da 46px per non spostare la linea verticale. */}
                    <span
                      aria-hidden="true"
                      style={{
                        position: "relative",
                        zIndex: 1,
                        flexShrink: 0,
                        width: 46,
                        height: 46,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isPanel ? (
                        <span
                          style={{
                            width: 46,
                            height: 46,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: 16,
                            background: "var(--primary)",
                            color: "#fff",
                            boxShadow: "0 4px 12px rgba(46,196,182,0.35)",
                          }}
                        >
                          {v.n}
                        </span>
                      ) : (
                        <span
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            background: "#fff",
                            color: "var(--primary)",
                            border: "2px solid var(--primary-light)",
                          }}
                        >
                          <i className={`fas ${v.icona}`} />
                        </span>
                      )}
                    </span>
                    {/* Contenuto. */}
                    <div
                      className={isPanel ? "card-sm flex-1" : "flex-1"}
                      style={isPanel ? { padding: "16px 20px 18px" } : { padding: "9px 2px" }}
                    >
                      {isPanel ? (
                        <span className="badge" style={{ background: "var(--primary-light)", color: "var(--primary-dark)", fontSize: "0.56rem" }}>
                          Panel {v.n}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-light)" }}>
                          {ETICHETTA_VOCE[v.tipo]}
                        </span>
                      )}
                      <h4 className="font-semibold text-gray-800 leading-tight" style={{ marginTop: isPanel ? 6 : 3, fontSize: 15 }}>
                        {v.titolo}
                      </h4>
                      <p className="text-gray-600" style={{ fontSize: 13, marginTop: 2 }}>{v.desc}</p>

                      {/* Nei panel i protagonisti hanno un volto. Nelle voci di
                          raccordo restano una riga di nomi, per non appesantire. */}
                      {isPanel && (relatori.length > 0 || partner.length > 0 || ospiti.length > 0) ? (
                        <ul
                          className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4"
                          style={{ listStyle: "none", padding: 0, margin: "16px 0 0" }}
                        >
                          {relatori.map((r) => (
                            <li key={r.id} className="flex items-center gap-3">
                              <span style={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
                                <Image
                                  src={r.img}
                                  alt={r.nome}
                                  fill
                                  sizes="52px"
                                  className="rounded-full object-cover"
                                />
                              </span>
                              <span>
                                <span className="block font-semibold text-gray-800" style={{ fontSize: 13, lineHeight: 1.25 }}>
                                  {r.nome}
                                </span>
                                <span className="block text-gray-600" style={{ fontSize: 11, lineHeight: 1.35, marginTop: 2 }}>
                                  {r.ruolo}
                                </span>
                              </span>
                            </li>
                          ))}
                          {partner.map((p) => (
                            <li key={p.id} className="flex items-center gap-3">
                              {/* Riquadro fisso e `object-contain`: i loghi hanno
                                  proporzioni diverse fra loro e non vanno
                                  ritagliati in tondo come i ritratti. */}
                              <span style={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
                                <Image
                                  src={p.img}
                                  alt=""
                                  fill
                                  sizes="52px"
                                  className="object-contain"
                                />
                              </span>
                              <span>
                                <span className="block font-semibold text-gray-800" style={{ fontSize: 13, lineHeight: 1.25 }}>
                                  {p.nome}
                                </span>
                                {p.ruolo && (
                                  <span className="block text-gray-600" style={{ fontSize: 11, lineHeight: 1.35, marginTop: 2 }}>
                                    {p.ruolo}
                                  </span>
                                )}
                              </span>
                            </li>
                          ))}
                          {ospiti.map((o) => (
                            <li key={o} className="flex items-center gap-3">
                              <span
                                className="icon-circle icon-circle-primary"
                                style={{ width: 52, height: 52, flexShrink: 0 }}
                                aria-hidden="true"
                              >
                                <i className="fas fa-users" />
                              </span>
                              <span className="font-semibold text-gray-800" style={{ fontSize: 13, lineHeight: 1.25 }}>
                                {o}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        nomiVoce(v).length > 0 && (
                          <p style={{ fontSize: 12, fontWeight: 500, marginTop: 6, color: "var(--primary-dark)" }}>
                            {nomiVoce(v).join(" . ")}
                          </p>
                        )
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="card" style={{ background: "var(--primary-light)" }}>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                I progetti dei ragazzi
              </h3>
              <p className="text-gray-700">
                Tra un panel e l&apos;altro, dieci gruppi di ragazzi presentano i loro progetti in tre blocchi: tre minuti a testa, due di pitch e uno di domande. Una commissione valuta le idee e proclama il gruppo vincitore.
              </p>
            </div>

            {/* Percorso formativo per i licei, che sfocia nei progetti qui sopra */}
            {!ARCHIVE_MODE && (
              <div
                className="card mt-6 flex flex-col md:flex-row md:items-center gap-6"
                style={{ borderLeft: "4px solid var(--primary)" }}
              >
                <div className="flex-1">
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--primary-dark)",
                    }}
                  >
                    Bando per gli istituti superiori
                  </span>
                  <h3 className="text-xl font-semibold text-gray-800 mt-2 mb-2">
                    I dieci progetti nascono qui
                  </h3>
                  <p className="text-gray-700 text-sm">
                    I gruppi che salgono sul palco arrivano da un percorso formativo gratuito su
                    biotecnologie e intelligenza artificiale, online e fuori dall&apos;orario
                    scolastico, riservato agli studenti del triennio degli istituti superiori di Taranto e
                    provincia.
                    Aderisce l&apos;istituto, tramite un docente referente.
                  </p>
                </div>
                <Link href={LICEI_PATH} className="btn-primary text-center whitespace-nowrap">
                  Aderisci con la scuola
                </Link>
              </div>
            )}

            {/* Bando per gli studenti universitari. A differenza dei licei qui
                si candida il singolo studente, non l'ateneo. */}
            {!ARCHIVE_MODE && (
              <div
                className="card mt-6 flex flex-col md:flex-row md:items-center gap-6"
                style={{ borderLeft: "4px solid var(--primary)" }}
              >
                <div className="flex-1">
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--primary-dark)",
                    }}
                  >
                    Bando per gli studenti universitari
                  </span>
                  <h3 className="text-xl font-semibold text-gray-800 mt-2 mb-2">
                    Biotecnologie e Intelligenza Artificiale
                  </h3>
                  <p className="text-gray-700 text-sm">
                    Un percorso formativo e progettuale gratuito, aperto agli studenti universitari
                    di triennale, magistrale, ciclo unico, dottorato e post-laurea, di atenei
                    italiani o stranieri. Si lavora con ricercatori e mentor a una proposta
                    scientifica originale che integri biotecnologie e intelligenza artificiale. Ci
                    si candida individualmente, i team si formano dopo.
                  </p>
                </div>
                <Link href={UNIVERSITA_PATH} className="btn-primary text-center whitespace-nowrap">
                  Scopri il bando
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* ── Giorno 2 ── */}
        <section className="section">
          <div className="container mx-auto px-6">
            <h2 className="section-title">Giorno 2 . Venerdì 11 dicembre . Teatro Fusco, Taranto</h2>
            <p className="text-lg text-gray-700 max-w-3xl mb-8">
              Uno showcase di innovazione: startup, spin-off universitari, centri di ricerca e progetti del territorio presentano le loro soluzioni a investitori, partner e istituzioni. A seguire la premiazione e il concerto di chiusura.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { icon: "fa-lightbulb", t: "Showcase di innovazione", d: "Startup, spin-off universitari, centri di ricerca e progetti del territorio in vetrina." },
                { icon: "fa-trophy", t: "Premiazione", d: "Tre premi assegnati da una commissione dedicata." },
                { icon: "fa-music", t: "Concerto", d: "Musica dal vivo per chiudere le due giornate." },
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

            {/* Bando di partecipazione allo Showcase */}
            {!ARCHIVE_MODE && (
              <div
                className="card mt-8 flex flex-col md:flex-row md:items-center gap-6"
                style={{ borderLeft: "4px solid var(--primary)" }}
              >
                <div className="flex-1">
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--primary-dark)",
                    }}
                  >
                    Bando di partecipazione
                  </span>
                  <h3 className="text-xl font-semibold text-gray-800 mt-2 mb-2">
                    Porta il tuo progetto sul palco dello Showcase
                  </h3>
                  <p className="text-gray-700 text-sm">
                    Startup, spin-off universitari, team di ricerca e imprese innovative possono
                    candidarsi alla selezione pubblica. Tre categorie, tre premi, fino a 15 progetti
                    sul palco. La partecipazione è gratuita.{" "}
                    {FORZA_APERTURA
                      ? `Candidature aperte fino al ${CANDIDATURE_SCADENZA_LABEL}.`
                      : `Candidature dal ${CANDIDATURE_APERTURA_LABEL} al ${CANDIDATURE_SCADENZA_LABEL}.`}
                  </p>
                </div>
                <Link href={BANDO_PATH} className="btn-primary text-center whitespace-nowrap">
                  {FORZA_APERTURA ? "Candidati ora" : "Leggi il bando"}
                </Link>
              </div>
            )}
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

        {/* ── Team Organizzativo ── */}
        <section className="section bg-light-gray">
          <div className="container mx-auto px-6">
            <h2 className="section-title text-center block">Il Team Organizzativo</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
              {TEAM_PUBBLICO.map((p) => (
                <div key={p.name} className="card text-center">
                  <Image
                    src={p.img}
                    width={128}
                    height={128}
                    className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
                    style={p.imgPosition ? { objectPosition: p.imgPosition } : undefined}
                    alt={p.role ? `${p.name}, ${p.role}` : p.name}
                  />
                  <h4 className="text-xl font-semibold text-gray-800">{p.name}</h4>
                  {p.role && <p style={{ color: "var(--primary)" }}>{p.role}</p>}
                  {p.desc && <p className="text-gray-600 mt-2 text-sm">{p.desc}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <SiteFooter />
    </>
  );
}
