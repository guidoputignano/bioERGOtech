import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { BandoForm } from "./BandoForm";
import {
  ALLEGATI,
  AMBITI,
  BANDO,
  BANDO_PATH,
  CALENDARIO,
  CANDIDATURE_APERTURA_LABEL,
  CANDIDATURE_SCADENZA_LABEL,
  CATEGORIE_BANDO,
  COMMISSIONE,
  CONTATTI,
  COSA_OFFRE,
  CRITERI,
  CRITERIO_DIRIMENTE,
  EVENT_SLUG,
  FAQ_BANDO,
  MAX_FILE_LABEL,
  PREMI,
  PUNTEGGIO_MASSIMO,
  PUNTEGGIO_MINIMO,
  REQUISITI,
  SITE_URL,
  SOGLIA_RACCOLTA_EUR,
  VIDEO_DURATA_MAX,
  statoCandidature,
} from "./content";

// La finestra di candidatura si valuta a ogni richiesta: una pagina generata
// a build time resterebbe ferma allo stato del giorno del deploy.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${BANDO.titolo} . Bando . Fondazione bioERGOtech`,
  description:
    "Bando di partecipazione allo Showcase di Innovazione dell'11 dicembre 2026 al Teatro Fusco di Taranto. Tre categorie, tre premi, candidatura gratuita per startup, spin-off, team di ricerca e imprese innovative.",
  alternates: { canonical: BANDO_PATH },
  openGraph: {
    title: `${BANDO.titolo} . Fondazione bioERGOtech`,
    description: BANDO.sottotitolo,
    url: `${SITE_URL}${BANDO_PATH}`,
    type: "website",
  },
};

const SOFT_BRAND: CSSProperties = { "--primary-light": "#E1F5EE" } as CSSProperties;

const EURO = (n: number) => `${n.toLocaleString("it-IT")} euro`;

function SezioneTitolo({ occhiello, children }: { occhiello: string; children: React.ReactNode }) {
  return (
    <>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--primary-dark)",
        }}
      >
        {occhiello}
      </span>
      <h2 className="section-title" style={{ marginTop: 8 }}>
        {children}
      </h2>
    </>
  );
}

function FaqJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_BANDO.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />;
}

export default async function BandoPage() {
  const stato = statoCandidature();

  // Lo staff vede il form anche prima dell'apertura, per provare il flusso.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let staff = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("partnership_level")
      .eq("id", user.id)
      .maybeSingle();
    staff = profile?.partnership_level === "admin";
  }

  const formVisibile = stato === "aperto" || staff;
  const anteprimaStaff = staff && stato !== "aperto";

  return (
    <>
      <FaqJsonLd />
      <style>{`
        .bando-page .section-title { padding-bottom: 26px; margin-bottom: 2rem; }
        .bando-page .section-title::after { width: 72px; height: 4px; }
        .bando-table { width: 100%; border-collapse: collapse; }
        .bando-table th { text-align: left; font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--text-light); padding: 0 0 10px; }
        .bando-table td { padding: 12px 0; border-top: 1px solid var(--border-color);
          font-size: 14px; color: var(--text-mid); vertical-align: top; }
        .bando-table td:first-child { color: var(--text-dark); font-weight: 600; padding-right: 18px; }
      `}</style>
      <Navbar />

      <div style={SOFT_BRAND} className="bando-page">
        {/* ── Hero ── */}
        <section className="hero" style={{ paddingTop: "120px" }}>
          <div className="container mx-auto px-6 pt-8 pb-20 relative z-10">
            <div className="max-w-3xl">
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
                {BANDO.occhiello} . Bando di partecipazione
              </div>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6 text-gray-800">
                {BANDO.titolo}
              </h1>
              <p className="text-xl text-gray-700 mb-8">{BANDO.sottotitolo}</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {[
                  { icon: "fa-calendar", label: "Showcase", value: `${BANDO.dataLabel}, ${BANDO.orarioLabel}` },
                  { icon: "fa-location-dot", label: "Luogo", value: BANDO.luogo },
                  { icon: "fa-hourglass-half", label: "Scadenza", value: CANDIDATURE_SCADENZA_LABEL },
                ].map((box) => (
                  <div key={box.label} className="card-sm" style={{ padding: 18 }}>
                    <div className="flex items-center gap-2 mb-1">
                      <i className={`fas ${box.icon}`} style={{ color: "var(--primary)" }} />
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: "var(--text-light)",
                        }}
                      >
                        {box.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, color: "var(--text-dark)", fontWeight: 500 }}>{box.value}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                {stato === "aperto" ? (
                  <Link href="#candidatura" className="btn-primary text-center">
                    Candida il tuo progetto
                  </Link>
                ) : (
                  <span
                    className="btn-primary text-center"
                    style={{ opacity: 0.55, pointerEvents: "none" }}
                    aria-disabled="true"
                  >
                    {stato === "non_aperto"
                      ? `Candidature dal ${CANDIDATURE_APERTURA_LABEL}`
                      : "Candidature chiuse"}
                  </span>
                )}
                <Link href={`/eventi/${EVENT_SLUG}`} className="btn-outline text-center">
                  Torna all&apos;evento
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stato delle candidature ── */}
        <section style={{ background: "var(--primary-light)", padding: "26px 0" }}>
          <div className="container mx-auto px-6">
            <p
              className="text-base md:text-lg font-medium text-center"
              style={{ color: "var(--primary-dark)", margin: 0 }}
            >
              {stato === "aperto" && (
                <>
                  <i className="fas fa-circle-check" style={{ marginRight: 8 }} />
                  Le candidature sono aperte fino al {CANDIDATURE_SCADENZA_LABEL}. La partecipazione è
                  gratuita.
                </>
              )}
              {stato === "non_aperto" && (
                <>
                  <i className="fas fa-clock" style={{ marginRight: 8 }} />
                  Le candidature aprono il {CANDIDATURE_APERTURA_LABEL} e si chiudono il{" "}
                  {CANDIDATURE_SCADENZA_LABEL}. Intanto puoi leggere il bando e preparare i materiali.
                </>
              )}
              {stato === "chiuso" && (
                <>
                  <i className="fas fa-flag-checkered" style={{ marginRight: 8 }} />
                  Le candidature sono chiuse. Per le prossime iniziative scrivi a{" "}
                  {CONTATTI.fondazione.email}.
                </>
              )}
            </p>
          </div>
        </section>

        {/* ── Premessa ── */}
        <section className="section">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl">
              <SezioneTitolo occhiello="Art. 1 . Premessa e finalità">Perché questo bando</SezioneTitolo>
              <p className="text-lg text-gray-700 mb-4">
                Fondazione bioERGOtech, con la direzione scientifica, e SafesPro, in qualità di ente
                organizzatore, selezionano i progetti imprenditoriali che partecipano allo Showcase di
                Innovazione della seconda giornata dell&apos;evento &quot;Vivere più a lungo: sport e
                intelligenza artificiale&quot;.
              </p>
              <p className="text-gray-700 mb-4">
                L&apos;iniziativa prosegue il percorso avviato con i Taranto Biotech Days 2024 e con
                l&apos;evento di Roma dell&apos;ottobre 2025 alla Sala della Regina di Palazzo
                Montecitorio, e l&apos;azione della Fondazione per l&apos;insediamento di un centro di
                ricerca a Taranto e la nascita di un ecosistema di impresa sul territorio.
              </p>
              <p className="text-gray-700">
                L&apos;obiettivo è dare visibilità e sostegno concreto ai progetti che applicano
                biotecnologie, robotica e intelligenza artificiale alla salute, alla longevità e allo
                sport, lungo le tre fasi in cui la Fondazione articola il proprio percorso: ideazione,
                produzione, distribuzione. Progetti in stadi diversi hanno bisogni diversi, e per
                questo le categorie di partecipazione sono tre, con criteri e premi distinti.
              </p>
            </div>
          </div>
        </section>

        {/* ── Categorie ── */}
        <section className="section bg-light-gray">
          <div className="container mx-auto px-6">
            <SezioneTitolo occhiello="Art. 2 . Destinatari">Le tre categorie</SezioneTitolo>
            <p className="text-lg text-gray-700 max-w-3xl mb-10">
              Il bando è rivolto a team di ricerca, spin-off universitari, startup, PMI innovative e
              imprese, senza limiti di provenienza geografica. Si sceglie una sola categoria. Nel
              computo della raccolta rientrano equity, venture debt, strumenti convertibili e
              sovvenzioni competitive già erogate o deliberate.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {CATEGORIE_BANDO.map((c) => (
                <div key={c.id} className="card" style={{ borderTop: "4px solid var(--primary)" }}>
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className="icon-circle icon-circle-primary"
                      style={{ width: 44, height: 44, fontWeight: 800, fontSize: 18 }}
                    >
                      {c.id}
                    </span>
                    <h3 className="font-semibold text-gray-800" style={{ fontSize: 17 }}>
                      {c.stadio}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{c.chiPuoCandidarsi}</p>
                  <div
                    style={{
                      borderTop: "1px solid var(--border-color)",
                      paddingTop: 12,
                      fontSize: 13,
                      color: "var(--text-mid)",
                    }}
                  >
                    <div>
                      <strong style={{ color: "var(--primary-dark)" }}>{c.progettiAmmessi}</strong> progetti
                      ammessi al palco
                    </div>
                    <div>
                      Pitch di {c.durataPitch}, più {c.domande} di domande
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-600 mt-6 max-w-3xl">
              La soglia dei {EURO(SOGLIA_RACCOLTA_EUR)} riprende la struttura di membership della
              Fondazione, che distingue le realtà seed-stage da quelle in fase Series A e successive.
              La Commissione può riassegnare d&apos;ufficio una candidatura a una categoria diversa
              da quella indicata, quando ne ricorrano manifestamente i presupposti, dandone
              comunicazione all&apos;interessato prima della valutazione.
            </p>
          </div>
        </section>

        {/* ── Ambiti tematici ── */}
        <section className="section">
          <div className="container mx-auto px-6">
            <SezioneTitolo occhiello="Art. 4 . Ambiti tematici">Su che cosa lavoriamo</SezioneTitolo>
            <p className="text-lg text-gray-700 max-w-3xl mb-10">
              Sono ammessi i progetti che intervengono, con approccio scientifico o tecnologico, su
              uno o più di questi ambiti.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {AMBITI.map((a) => (
                <div key={a.value} className="card-sm" style={{ padding: 24 }}>
                  <span className="icon-circle icon-circle-primary" style={{ width: 46, height: 46 }}>
                    <i className={`fas ${a.icona} text-lg`} />
                  </span>
                  <h3 className="font-semibold text-gray-800 mt-4 mb-1" style={{ fontSize: 15 }}>
                    {a.label}
                  </h3>
                  <p className="text-sm text-gray-600">{a.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Cosa offre ── */}
        <section className="section bg-light-gray">
          <div className="container mx-auto px-6">
            <SezioneTitolo occhiello="Art. 7 . Cosa offre il bando">Che cosa ottieni</SezioneTitolo>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              {COSA_OFFRE.map((o) => (
                <div key={o.titolo} className="card-sm flex items-start gap-4" style={{ padding: 24 }}>
                  <span
                    className="icon-circle icon-circle-primary"
                    style={{ width: 48, height: 48, flexShrink: 0 }}
                  >
                    <i className={`fas ${o.icona} text-xl`} />
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">{o.titolo}</h3>
                    <p className="text-sm text-gray-600">{o.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Premi ── */}
        <section className="section">
          <div className="container mx-auto px-6">
            <SezioneTitolo occhiello="Art. 8 . Premi">Un vincitore per categoria</SezioneTitolo>
            <p className="text-lg text-gray-700 max-w-3xl mb-10">
              I premi hanno natura di servizi e di accesso a infrastrutture. Sono personali, non
              cedibili e non convertibili in denaro. La Commissione può assegnare menzioni speciali,
              prive di dotazione.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {PREMI.map((p) => (
                <div key={p.categoria} className="card" style={{ background: "var(--primary-light)" }}>
                  <span className="icon-circle icon-circle-primary" style={{ width: 46, height: 46, background: "#fff" }}>
                    <i className="fas fa-trophy text-lg" />
                  </span>
                  <h3 className="font-semibold text-gray-800 mt-4 mb-2">
                    Categoria {p.categoria} . {p.stadio}
                  </h3>
                  <p className="text-sm text-gray-700">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Criteri di valutazione ── */}
        <section className="section bg-light-gray">
          <div className="container mx-auto px-6">
            <SezioneTitolo occhiello="Art. 9 . Criteri di valutazione">Come si assegnano i punti</SezioneTitolo>
            <p className="text-lg text-gray-700 max-w-3xl mb-10">
              La valutazione si articola in due momenti: l&apos;istruttoria sulla documentazione, che
              determina l&apos;ammissione allo Showcase, e la valutazione finale dopo la presentazione
              dal vivo. Il punteggio massimo è di {PUNTEGGIO_MASSIMO} punti. Il premio di categoria
              non viene assegnato se nessuna candidatura raggiunge almeno {PUNTEGGIO_MINIMO} punti.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {CATEGORIE_BANDO.map((c) => (
                <div key={c.id} className="card">
                  <h3 className="font-semibold text-gray-800 mb-4">
                    Categoria {c.id} . {c.stadio}
                  </h3>
                  <table className="bando-table">
                    <tbody>
                      {CRITERI[c.id].map((k) => (
                        <tr key={k.criterio}>
                          <td style={{ width: "100%" }}>
                            {k.criterio}
                            <span
                              style={{
                                display: "block",
                                fontWeight: 400,
                                fontSize: 12.5,
                                color: "var(--text-mid)",
                                marginTop: 3,
                              }}
                            >
                              {k.desc}
                            </span>
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              whiteSpace: "nowrap",
                              fontWeight: 700,
                              color: "var(--primary-dark)",
                            }}
                          >
                            {k.punti}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p style={{ fontSize: 12.5, color: "var(--text-light)", marginTop: 14 }}>
                    A parità di punteggio prevale il progetto con il punteggio più alto in
                    &quot;{CRITERIO_DIRIMENTE[c.id]}&quot;.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Come candidarsi ── */}
        <section className="section">
          <div className="container mx-auto px-6">
            <SezioneTitolo occhiello="Art. 3 e 5 . Come candidarsi">Requisiti e documentazione</SezioneTitolo>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-8">
              <div>
                <h3 className="font-semibold text-gray-800 mb-4">Requisiti di ammissibilità</h3>
                <ul className="space-y-3">
                  {REQUISITI.map((r) => (
                    <li key={r} className="flex items-start gap-3 text-gray-700">
                      <i className="fas fa-circle-check mt-1" style={{ color: "var(--primary)" }} />
                      <span className="text-sm">{r}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-gray-600 mt-5">
                  Non sono ammessi progetti già presentati in edizioni precedenti dello stesso evento
                  in assenza di avanzamenti sostanziali documentabili. La partecipazione è gratuita.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-4">Documentazione da allegare</h3>
                <ul className="space-y-3">
                  {ALLEGATI.map((a) => (
                    <li key={a.campo} className="flex items-start gap-3 text-gray-700">
                      <i className="fas fa-file-pdf mt-1" style={{ color: "var(--primary)" }} />
                      <span className="text-sm">
                        <strong>{a.titolo}.</strong> {a.desc}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-gray-600 mt-5">
                  Tutti gli allegati vanno caricati in formato PDF, fino a {MAX_FILE_LABEL} ciascuno.
                  È possibile indicare anche un video dimostrativo di durata non superiore a{" "}
                  {VIDEO_DURATA_MAX}. Il modulo di candidatura previsto dal bando è il form qui sotto:
                  non serve allegarlo a parte.
                </p>
              </div>
            </div>

            <h3 className="font-semibold text-gray-800 mt-12 mb-4">Il calendario della procedura</h3>
            <div className="card" style={{ maxWidth: 760 }}>
              <table className="bando-table">
                <thead>
                  <tr>
                    <th>Fase</th>
                    <th style={{ textAlign: "right" }}>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {CALENDARIO.map((c) => (
                    <tr key={c.fase}>
                      <td>{c.fase}</td>
                      <td style={{ textAlign: "right" }}>{c.data}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Lo Showcase ── */}
        <section className="section bg-light-gray">
          <div className="container mx-auto px-6">
            <SezioneTitolo occhiello="Art. 6 . Svolgimento">La giornata dello Showcase</SezioneTitolo>
            <p className="text-lg text-gray-700 max-w-3xl mb-8">
              Lo Showcase si svolge {BANDO.dataLabel.toLowerCase()}, dalle {BANDO.orarioLabel}, al{" "}
              {BANDO.luogo}, davanti a investitori, partner industriali, istituzioni e pubblico. Sono
              ammessi alla presentazione dal vivo fino a {BANDO.postiTotali} progetti. Gli
              organizzatori possono rimodulare il numero per categoria in funzione della qualità e
              del numero delle candidature, fermo restando il massimo complessivo. Ai progetti non
              ammessi al palco può essere offerta, ove disponibile, la partecipazione all&apos;area
              espositiva.
            </p>
            <div className="card" style={{ maxWidth: 760 }}>
              <table className="bando-table">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Progetti</th>
                    <th>Pitch</th>
                    <th>Domande</th>
                  </tr>
                </thead>
                <tbody>
                  {CATEGORIE_BANDO.map((c) => (
                    <tr key={c.id}>
                      <td>
                        {c.id} . {c.stadio}
                      </td>
                      <td>{c.progettiAmmessi}</td>
                      <td>{c.durataPitch}</td>
                      <td>{c.domande}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Commissione, proprietà intellettuale ── */}
        <section className="section">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div>
                <SezioneTitolo occhiello="Art. 10 . Commissione">Chi valuta</SezioneTitolo>
                <p className="text-gray-700 mb-5">
                  La Commissione è nominata congiuntamente da Fondazione bioERGOtech e SafesPro ed è
                  composta da un numero dispari di membri, non inferiore a 5 e non superiore a 9.
                </p>
                <ul className="space-y-3">
                  {COMMISSIONE.map((m) => (
                    <li key={m} className="flex items-start gap-3 text-gray-700">
                      <i className="fas fa-user-check mt-1" style={{ color: "var(--primary)" }} />
                      <span className="text-sm">{m}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-gray-600 mt-5">
                  Le sedute sono valide con la maggioranza dei membri con diritto di voto e le
                  decisioni si assumono a maggioranza dei presenti. Ogni componente dichiara eventuali
                  conflitti di interesse e si astiene dalla relativa valutazione. Le valutazioni della
                  Commissione sono insindacabili e non sono ammessi ricorsi.
                </p>
              </div>
              <div>
                <SezioneTitolo occhiello="Art. 11 . Riservatezza">Le tue idee restano tue</SezioneTitolo>
                <p className="text-gray-700 mb-4">
                  La partecipazione non comporta alcun trasferimento di diritti di proprietà
                  intellettuale in favore di Fondazione bioERGOtech, di SafesPro o dei membri della
                  Commissione. Ogni proponente resta titolare esclusivo delle proprie idee, dei propri
                  dati e dei propri titoli di privativa.
                </p>
                <div className="card" style={{ background: "var(--primary-light)" }}>
                  <p className="text-sm text-gray-700 m-0">
                    Lo Showcase si svolge in seduta pubblica e può essere ripreso e diffuso. Non
                    divulgare dal palco informazioni coperte da segreto industriale o suscettibili di
                    pregiudicare la brevettabilità delle tue soluzioni. Gli organizzatori non
                    sottoscrivono accordi di riservatezza per la fase di presentazione pubblica.
                  </p>
                </div>
                <p className="text-sm text-gray-600 mt-5">
                  La documentazione trasmessa in sede di candidatura è trattata in via riservata dai
                  componenti della Commissione e utilizzata ai soli fini della valutazione. I dati
                  personali sono trattati ai sensi del Regolamento (UE) 2016/679, per le sole finalità
                  connesse alla gestione del bando e dell&apos;evento.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Candidatura ── */}
        <section className="section bg-light-gray" id="candidatura">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              <div>
                <SezioneTitolo occhiello="Modulo di candidatura">
                  {stato === "aperto" ? "Candida il tuo progetto" : "Il modulo di candidatura"}
                </SezioneTitolo>
                {stato === "aperto" ? (
                  <>
                    <p className="text-lg text-gray-700 mb-6">
                      Sei passi, dieci minuti se hai i materiali pronti. La candidatura è gratuita e
                      resta modificabile fino al {CANDIDATURE_SCADENZA_LABEL}.
                    </p>
                    <ul className="space-y-3">
                      {[
                        "Scegli la categoria: A ideazione, B creazione d'impresa, C raccolta di capitale.",
                        "Racconta il progetto: problema, soluzione, avanzamento, impatto e aspetti etici.",
                        "Carica descrizione e pitch deck in PDF, più la documentazione richiesta dalla tua categoria.",
                        "Ricevi il codice della candidatura via email, con il calendario della procedura.",
                      ].map((t) => (
                        <li key={t} className="flex items-start gap-3 text-gray-700">
                          <i className="fas fa-circle-check mt-1" style={{ color: "var(--primary)" }} />
                          <span className="text-sm">{t}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : stato === "non_aperto" ? (
                  <p className="text-lg text-gray-700">
                    Il modulo si apre il {CANDIDATURE_APERTURA_LABEL} e resta disponibile fino al{" "}
                    {CANDIDATURE_SCADENZA_LABEL}. Nel frattempo puoi preparare la descrizione del
                    progetto e il pitch deck: sono i due allegati richiesti a tutte le categorie.
                  </p>
                ) : (
                  <p className="text-lg text-gray-700">
                    Le candidature si sono chiuse il {CANDIDATURE_SCADENZA_LABEL}. Per informazioni
                    sulle prossime iniziative scrivi a {CONTATTI.fondazione.email}.
                  </p>
                )}
              </div>

              {formVisibile ? (
                <BandoForm anteprimaStaff={anteprimaStaff} />
              ) : (
                <div className="card" style={{ textAlign: "center", padding: 40 }}>
                  <span className="icon-circle icon-circle-primary" style={{ width: 56, height: 56, margin: "0 auto" }}>
                    <i className={`fas ${stato === "non_aperto" ? "fa-hourglass-half" : "fa-flag-checkered"} text-2xl`} />
                  </span>
                  <h3 className="text-xl font-bold text-gray-800 mt-5 mb-2">
                    {stato === "non_aperto" ? "Non è ancora il momento" : "Candidature chiuse"}
                  </h3>
                  <p className="text-gray-600">
                    {stato === "non_aperto"
                      ? `Torna dal ${CANDIDATURE_APERTURA_LABEL} per inviare la tua candidatura.`
                      : "Grazie a tutti i progetti che si sono candidati."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="section">
          <div className="container mx-auto px-6">
            <h2 className="section-title text-center">Domande frequenti</h2>
            <div className="max-w-3xl mx-auto mt-8 space-y-4">
              {FAQ_BANDO.map((f) => (
                <details key={f.q} className="card group" style={{ padding: 0, overflow: "hidden" }}>
                  <summary className="flex items-center justify-between gap-4 cursor-pointer list-none p-6 font-semibold text-gray-800 [&::-webkit-details-marker]:hidden">
                    <span>{f.q}</span>
                    <i
                      className="fas fa-chevron-down text-sm transition-transform group-open:rotate-180"
                      style={{ color: "var(--primary)" }}
                      aria-hidden="true"
                    />
                  </summary>
                  <div className="px-6 pb-6 text-gray-700 leading-relaxed">{f.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Contatti ── */}
        <section className="section bg-light-gray">
          <div className="container mx-auto px-6">
            <SezioneTitolo occhiello="Art. 12 . Contatti">Chi risponde</SezioneTitolo>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 max-w-4xl">
              <div className="card-sm" style={{ padding: 24 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--text-light)",
                  }}
                >
                  {CONTATTI.fondazione.ruolo}
                </span>
                <h3 className="font-semibold text-gray-800 mt-2">{CONTATTI.fondazione.nome}</h3>
                <a
                  href={`mailto:${CONTATTI.fondazione.email}`}
                  className="text-sm"
                  style={{ color: "var(--primary-dark)", fontWeight: 600 }}
                >
                  {CONTATTI.fondazione.email}
                </a>
              </div>
              <div className="card-sm" style={{ padding: 24 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--text-light)",
                  }}
                >
                  {CONTATTI.organizzazione.ruolo}
                </span>
                <a
                  href={`mailto:${CONTATTI.organizzazione.email}`}
                  className="text-sm block mt-2"
                  style={{ color: "var(--primary-dark)", fontWeight: 600 }}
                >
                  {CONTATTI.organizzazione.email}
                </a>
                <p className="text-sm text-gray-600 mt-3">
                  Telefono {CONTATTI.telefono.numero}. {CONTATTI.telefono.riferimento}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-8 max-w-3xl">
              Sede della Fondazione: {CONTATTI.sede}. La partecipazione al bando implica
              l&apos;accettazione integrale delle sue disposizioni. Gli organizzatori si riservano di
              modificare i termini del calendario, il numero dei progetti ammessi e le modalità di
              svolgimento dello Showcase per ragioni organizzative, di prorogarne i termini o di non
              dare corso alla procedura, dandone comunicazione tramite i canali ufficiali.{" "}
              {BANDO.emanato}.
            </p>
          </div>
        </section>
      </div>

      <SiteFooter />
    </>
  );
}
