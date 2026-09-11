import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { PreIscrizioneForm } from "./PreIscrizioneForm";
import { UniversitaIndice } from "./UniversitaIndice";
import {
  ADESIONE_NOTE,
  AREE_DISCIPLINARI,
  BANDO_DATA,
  CANDIDATURA_CONTENUTI,
  CANDIDATURA_INDIVIDUALE_NOTA,
  COMMISSIONE_COMPOSIZIONE,
  COMMISSIONE_PRINCIPI,
  CONTATTI_UNIVERSITA,
  CONTENUTI_PERCORSO,
  COSA_OFFRE,
  CRITERI_NOTE,
  CRITERI_UNIVERSITA,
  DESTINATARI_NOTE,
  DISPOSIZIONI_FINALI,
  EVENT_SLUG,
  FAQ_UNIVERSITA,
  LIVELLI_STUDIO,
  MAILTO_INFORMAZIONI,
  PARTECIPAZIONE_GRATUITA_NOTA,
  PREMESSA,
  PREMIO_CONDIZIONI,
  PREMIO_NON_GARANZIA,
  PREMIO_SUPPORTO,
  PREMIO_TESTO,
  PREMIO_ULTERIORI,
  PUBBLICAZIONE_INTEGRITA,
  PUBBLICAZIONE_INTRO,
  PUBBLICAZIONE_PROPRIETA,
  PUBBLICAZIONE_SUPPORTO,
  PUNTEGGIO_MASSIMO,
  REGOLA_PARITA,
  SCADENZA_CANDIDATURE_UNIVERSITARI,
  SITE_URL,
  SVOLGIMENTO_NOTE,
  UNIVERSITA,
  UNIVERSITA_PATH,
  statoCandidatureUniversita,
} from "./content";

export const metadata: Metadata = {
  title: `${UNIVERSITA.titolo} . Bando per gli studenti universitari . Fondazione bioERGOtech`,
  description: UNIVERSITA.sottotitolo,
  alternates: { canonical: UNIVERSITA_PATH },
  openGraph: {
    title: `${UNIVERSITA.titolo} . Bando per gli studenti universitari`,
    description: UNIVERSITA.sottotitolo,
    url: `${SITE_URL}${UNIVERSITA_PATH}`,
    type: "website",
  },
};

const STILE = `
/* Le due barre appiccicate in cima, navbar 70px piu indice 58px, coprirebbero
   la testata della sezione a cui si e appena saltati. Stessa misura usata
   dalle pagine gemelle del bando startup e dei licei. */
.un-page section[id] { scroll-margin-top: 138px; }

.un-page .hero {
  min-height: auto; display: block;
  background: linear-gradient(135deg, #F7F9FC 0%, #E8F8F6 55%, #EEF3FF 100%);
}
.un-page .hero .container { padding-top: 26px; padding-bottom: 64px; }

/* ── Testate di sezione ────────────────────────────────────────────────── */
.un-head { max-width: 800px; margin-bottom: 36px; }
.un-head-riga { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
.un-kicker { font-size: 11.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--primary-dark); }
.un-art {
  font-size: 10.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
  color: var(--text-light); background: #fff;
  border: 1px solid var(--border-color); border-radius: 999px; padding: 4px 10px;
}
.un-testo { font-size: 15.5px; line-height: 1.8; color: var(--text-mid); max-width: 820px; }
.un-testo p { margin: 0 0 16px; }
.un-testo p:last-child { margin-bottom: 0; }
.un-nota { font-size: 13px; color: var(--text-light); line-height: 1.7; max-width: 860px; }

.un-fatti { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
.un-fatto {
  display: inline-flex; align-items: center; gap: 8px;
  background: #fff; border: 1px solid var(--border-color); border-radius: 999px;
  padding: 7px 15px; font-size: 12.5px; font-weight: 600; color: var(--text-dark);
}
.un-fatto i { color: var(--primary-dark); font-size: 12px; }

.un-stato {
  display: flex; align-items: flex-start; gap: 11px;
  border: 1px solid; border-radius: 12px; padding: 13px 16px;
  font-size: 14px; line-height: 1.6; margin-bottom: 28px; max-width: 680px;
}
.un-stato i { margin-top: 3px; flex-shrink: 0; }
.un-stato-aperto { background: #ECFAF6; border-color: #B4E3D8; color: #08594A; }
.un-stato-attesa { background: #FFF8E8; border-color: #F0DFAE; color: #75570F; }
.un-stato-chiuso { background: #F4F6F9; border-color: var(--border-color); color: var(--text-mid); }

.un-azioni { display: flex; flex-wrap: wrap; gap: 12px; }

/* ── Indice ────────────────────────────────────────────────────────────── */
.un-indice {
  position: sticky; top: 70px; z-index: 40;
  background: rgba(255, 255, 255, .93);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color);
}
.un-indice-riga { display: flex; align-items: center; gap: 16px; height: 58px; }
.un-indice-voci {
  display: flex; align-items: center; gap: 4px; flex: 1; min-width: 0;
  overflow-x: auto; scrollbar-width: none;
}
.un-indice-voci::-webkit-scrollbar { display: none; }
.un-voce {
  white-space: nowrap; font-size: 13px; font-weight: 600; color: var(--text-mid);
  padding: 7px 12px; border-radius: 8px; transition: background .2s ease, color .2s ease;
}
.un-voce:hover { background: var(--bg-light); color: var(--text-dark); }
.un-voce-attiva, .un-voce-attiva:hover { background: var(--primary-light); color: var(--primary-dark); }
.un-indice-cta { display: none; }
@media (min-width: 1040px) {
  .un-indice-cta {
    display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0;
    background: var(--primary); color: #fff; font-size: 13px; font-weight: 700;
    padding: 10px 20px; border-radius: 8px;
    box-shadow: 0 4px 14px rgba(19, 214, 176, .3);
    transition: background .2s ease, transform .2s ease;
  }
  .un-indice-cta:hover { background: var(--primary-dark); color: #fff; transform: translateY(-1px); }
}

/* ── Schede ────────────────────────────────────────────────────────────── */
.un-griglia { display: grid; grid-template-columns: 1fr; gap: 20px; }
@media (min-width: 720px) { .un-griglia-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 980px) { .un-griglia-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.un-scheda {
  background: #fff; border: 1px solid var(--border-color); border-radius: 16px;
  padding: 24px; box-shadow: 0 6px 20px rgba(26, 35, 50, .05);
  transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease;
}
.un-scheda:hover { transform: translateY(-3px); box-shadow: 0 16px 38px rgba(26, 35, 50, .10); border-color: #CFE9E4; }
.un-scheda-icona {
  display: inline-flex; align-items: center; justify-content: center;
  width: 46px; height: 46px; border-radius: 13px;
  background: var(--primary-light); color: var(--primary-dark); font-size: 18px;
}
.un-scheda h3 { font-size: 16px; margin: 16px 0 6px; color: var(--text-dark); line-height: 1.35; }
.un-scheda p { font-size: 14px; line-height: 1.65; color: var(--text-mid); margin: 0; }

/* ── Elenchi ───────────────────────────────────────────────────────────── */
.un-elenco { list-style: none; padding: 0; margin: 0; display: grid; gap: 11px; max-width: 860px; }
.un-elenco li { display: flex; gap: 11px; font-size: 15px; line-height: 1.65; color: var(--text-mid); }
.un-elenco i { color: var(--primary); margin-top: 5px; font-size: 12px; flex-shrink: 0; }
@media (min-width: 860px) { .un-elenco-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 32px; } }

.un-pill-griglia { display: flex; flex-wrap: wrap; gap: 9px; max-width: 900px; }
.un-pill {
  background: #fff; border: 1px solid var(--border-color); border-radius: 999px;
  padding: 8px 16px; font-size: 13.5px; color: var(--text-dark);
}

/* ── Premio ────────────────────────────────────────────────────────────── */
.un-premio {
  background: #fff; border: 1px solid #B4E3D8; border-left: 4px solid var(--primary);
  border-radius: 16px; padding: 28px; max-width: 880px;
}
.un-premio-testo { font-size: 16.5px; line-height: 1.75; color: var(--text-dark); margin: 0 0 18px; }
.un-condizioni {
  background: #FFF8E8; border: 1px solid #F0DFAE; border-radius: 14px;
  padding: 22px 24px; max-width: 880px; margin-top: 22px;
}
.un-condizioni h3 { font-size: 15.5px; color: #75570F; margin: 0 0 6px; }
.un-condizioni p { font-size: 14.5px; line-height: 1.7; color: #6B5210; margin: 0 0 14px; }
.un-condizioni ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 9px; }
.un-condizioni li { display: flex; gap: 10px; font-size: 14px; line-height: 1.6; color: #6B5210; }
.un-condizioni i { margin-top: 5px; font-size: 11px; flex-shrink: 0; }

/* ── Criteri ───────────────────────────────────────────────────────────── */
.un-tabella { width: 100%; border-collapse: collapse; max-width: 900px; }
.un-tabella th {
  text-align: left; font-size: 11px; font-weight: 700; letter-spacing: .08em;
  text-transform: uppercase; color: var(--text-light);
  padding: 0 14px 10px 0; border-bottom: 1px solid var(--border-color);
}
.un-tabella th:last-child, .un-tabella td:last-child { text-align: right; padding-right: 0; }
.un-tabella td { padding: 15px 14px 15px 0; border-bottom: 1px solid var(--border-color); vertical-align: top; }
.un-crit-nome { font-size: 15px; font-weight: 600; color: var(--text-dark); display: block; margin-bottom: 4px; }
.un-crit-desc { font-size: 13.5px; line-height: 1.6; color: var(--text-mid); }
.un-crit-punti { font-size: 19px; font-weight: 800; color: var(--primary-dark); white-space: nowrap; }
.un-tabella tfoot td { border-bottom: none; padding-top: 16px; font-weight: 700; color: var(--text-dark); }

/* ── Modulo ────────────────────────────────────────────────────────────── */
.un-form-box {
  background: #fff; border: 1px solid var(--border-color); border-radius: 18px;
  padding: 28px; max-width: 680px; box-shadow: 0 10px 30px rgba(26, 35, 50, .06);
}
.un-form { display: grid; gap: 18px; }
.un-form-griglia { display: grid; grid-template-columns: 1fr; gap: 18px; }
@media (min-width: 560px) { .un-form-griglia { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.un-form-aiuto { font-size: 12.5px; color: var(--text-light); margin: 7px 0 0; line-height: 1.55; }
.un-consensi { display: grid; gap: 13px; padding-top: 4px; }
.un-errore {
  display: flex; gap: 10px; align-items: flex-start;
  background: #FDF2F2; border: 1px solid #F3C9C9; border-radius: 10px;
  padding: 12px 14px; font-size: 13.5px; line-height: 1.6; color: #96272A;
}
.un-esito {
  background: #ECFAF6; border: 1px solid #B4E3D8; border-radius: 18px;
  padding: 30px; max-width: 680px;
}
.un-esito-icona {
  display: inline-flex; align-items: center; justify-content: center;
  width: 48px; height: 48px; border-radius: 14px;
  background: #fff; color: var(--primary-dark); font-size: 21px; margin-bottom: 16px;
}
.un-esito h3 { font-size: 19px; color: #08594A; margin: 0 0 10px; }
.un-esito p { font-size: 15px; line-height: 1.7; color: #0B6B58; margin: 0 0 12px; }
.un-esito-nota { font-size: 13.5px !important; color: #12796A !important; margin-bottom: 0 !important; }

/* ── Contatti ──────────────────────────────────────────────────────────── */
.un-contatti { display: grid; grid-template-columns: 1fr; gap: 18px; max-width: 940px; }
@media (min-width: 820px) { .un-contatti { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.un-contatto { background: #fff; border: 1px solid var(--border-color); border-radius: 14px; padding: 22px; }
.un-contatto-ruolo { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--text-light); margin-bottom: 9px; }
.un-contatto b { display: block; font-size: 15.5px; color: var(--text-dark); margin-bottom: 5px; }
.un-contatto a { font-size: 14px; color: var(--primary-dark); font-weight: 600; word-break: break-word; }
.un-contatto span { font-size: 13px; color: var(--text-mid); line-height: 1.6; display: block; margin-top: 7px; }
`;

function Testata({
  numero,
  articolo,
  kicker,
  titolo,
  intro,
}: {
  numero: string;
  articolo: string;
  kicker: string;
  titolo: string;
  intro?: string;
}) {
  return (
    <div className="un-head">
      <div className="un-head-riga">
        <span className="un-kicker">
          {numero}. {kicker}
        </span>
        <span className="un-art">{articolo}</span>
      </div>
      <h2 className="section-title">{titolo}</h2>
      {intro && <p className="un-testo">{intro}</p>}
    </div>
  );
}

export default function UniversitaPage() {
  const stato = statoCandidatureUniversita();

  return (
    <>
      <style>{STILE}</style>
      <Navbar />

      <div className="un-page">
        {/* ── Hero ── */}
        <section className="hero" style={{ paddingTop: 120 }}>
          <div className="container mx-auto px-6">
            <div style={{ maxWidth: 820 }}>
              <div className="un-kicker" style={{ marginBottom: 16 }}>
                {UNIVERSITA.occhiello}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-5 text-gray-800">
                {UNIVERSITA.titolo}
              </h1>
              <p className="text-xl text-gray-700 mb-7">{UNIVERSITA.sottotitolo}</p>

              <div className="un-fatti">
                <span className="un-fatto">
                  <i className="fas fa-euro-sign" aria-hidden="true" /> Gratuito
                </span>
                <span className="un-fatto">
                  <i className="fas fa-laptop" aria-hidden="true" /> Online e in presenza
                </span>
                <span className="un-fatto">
                  <i className="fas fa-users-gear" aria-hidden="true" /> Team interdisciplinari
                </span>
              </div>

              {stato === "aperte" ? (
                <div className="un-stato un-stato-aperto">
                  <i className="fas fa-circle-check" aria-hidden="true" />
                  <span>
                    Le candidature sono aperte.{" "}
                    {SCADENZA_CANDIDATURE_UNIVERSITARI
                      ? `C'e tempo fino al ${SCADENZA_CANDIDATURE_UNIVERSITARI.label}.`
                      : "Il bando non fissa ancora un termine: i tempi saranno comunicati sui canali ufficiali, e candidarsi adesso non costa nulla."}
                  </span>
                </div>
              ) : stato === "chiuse" ? (
                <div className="un-stato un-stato-chiuso">
                  <i className="fas fa-flag-checkered" aria-hidden="true" />
                  <span>
                    Le candidature sono chiuse. Per informazioni scrivi a{" "}
                    {CONTATTI_UNIVERSITA.fondazione.email}.
                  </span>
                </div>
              ) : (
                <div className="un-stato un-stato-attesa">
                  <i className="fas fa-clock" aria-hidden="true" />
                  <span>
                    Le modalita e la scadenza per le candidature saranno comunicate a breve sui
                    canali ufficiali.
                  </span>
                </div>
              )}

              <div className="un-azioni">
                <Link href="#candidatura" className="btn-primary text-center">
                  {stato === "aperte" ? "Candidati" : "Resta aggiornato"}
                </Link>
                <Link href={`/eventi/${EVENT_SLUG}`} className="btn-outline text-center">
                  L&apos;evento del 10 dicembre
                </Link>
              </div>
            </div>
          </div>
        </section>

        <UniversitaIndice ctaLabel={stato === "aperte" ? "Candidati" : "Informazioni"} />

        {/* ── Art. 1. Premessa ── */}
        <section className="section" id="premessa">
          <div className="container mx-auto px-6">
            <Testata
              numero="01"
              articolo="Art. 1"
              kicker="Premessa e finalita"
              titolo="Un ponte tra universita, ricerca e impresa"
            />
            <div className="un-testo">
              {PREMESSA.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        </section>

        {/* ── Art. 2. Destinatari ── */}
        <section className="section bg-light-gray" id="destinatari">
          <div className="container mx-auto px-6">
            <Testata
              numero="02"
              articolo="Art. 2"
              kicker="Destinatari"
              titolo="Chi puo candidarsi"
              intro={DESTINATARI_NOTE[0]}
            />

            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-dark)", margin: "0 0 14px" }}>
              Livelli ammessi
            </h3>
            <div className="un-pill-griglia" style={{ marginBottom: 32 }}>
              {LIVELLI_STUDIO.map((l) => (
                <span key={l.value} className="un-pill">
                  {l.label}
                </span>
              ))}
            </div>

            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-dark)", margin: "0 0 6px" }}>
              Aree disciplinari
            </h3>
            <p className="un-nota" style={{ marginBottom: 14 }}>
              L&apos;elenco e indicato dal bando a titolo esemplificativo.
            </p>
            <div className="un-pill-griglia" style={{ marginBottom: 32 }}>
              {AREE_DISCIPLINARI.map((a) => (
                <span key={a.value} className="un-pill">
                  {a.label}
                </span>
              ))}
            </div>

            <div className="un-testo">
              <p>{DESTINATARI_NOTE[1]}</p>
              <p>
                <strong>{CANDIDATURA_INDIVIDUALE_NOTA}</strong>
              </p>
            </div>
          </div>
        </section>

        {/* ── Art. 3. Svolgimento ── */}
        <section className="section" id="svolgimento">
          <div className="container mx-auto px-6">
            <Testata
              numero="03"
              articolo="Art. 3"
              kicker="Modalita di svolgimento"
              titolo="Come funziona il percorso"
              intro={SVOLGIMENTO_NOTE[0]}
            />
            <p className="un-testo" style={{ marginBottom: 28 }}>
              {SVOLGIMENTO_NOTE[1]}
            </p>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-dark)", margin: "0 0 16px" }}>
              Il percorso potra comprendere
            </h3>
            <ul className="un-elenco un-elenco-2">
              {CONTENUTI_PERCORSO.map((c) => (
                <li key={c}>
                  <i className="fas fa-circle-check" aria-hidden="true" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Art. 5. Cosa offre ── */}
        <section className="section bg-light-gray" id="offre">
          <div className="container mx-auto px-6">
            <Testata
              numero="04"
              articolo="Art. 5"
              kicker="Cosa offre il progetto"
              titolo="Che cosa ci metti e che cosa ci trovi"
              intro={PARTECIPAZIONE_GRATUITA_NOTA}
            />
            <div className="un-griglia un-griglia-2 un-griglia-4">
              {COSA_OFFRE.map((o) => (
                <div key={o.titolo} className="un-scheda">
                  <span className="un-scheda-icona" aria-hidden="true">
                    <i className={`fas ${o.icona}`} />
                  </span>
                  <h3>{o.titolo}</h3>
                  <p>{o.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Art. 6. Premio ── */}
        <section className="section" id="premio">
          <div className="container mx-auto px-6">
            <Testata
              numero="05"
              articolo="Art. 6"
              kicker="Premio e valorizzazione scientifica"
              titolo="Il premio, e che cosa non e"
            />
            <div className="un-premio">
              <p className="un-premio-testo">{PREMIO_TESTO}</p>
              <p className="un-testo" style={{ margin: 0 }}>
                {PREMIO_SUPPORTO}
              </p>
            </div>

            <div className="un-condizioni">
              <h3>La selezione non garantisce la pubblicazione</h3>
              <p>{PREMIO_NON_GARANZIA}</p>
              <p style={{ marginBottom: 10 }}>La pubblicazione resta subordinata:</p>
              <ul>
                {PREMIO_CONDIZIONI.map((c) => (
                  <li key={c}>
                    <i className="fas fa-circle" aria-hidden="true" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="un-nota" style={{ marginTop: 20 }}>
              {PREMIO_ULTERIORI}
            </p>
          </div>
        </section>

        {/* ── Art. 7. Criteri ── */}
        <section className="section bg-light-gray" id="criteri">
          <div className="container mx-auto px-6">
            <Testata
              numero="06"
              articolo="Art. 7"
              kicker="Criteri di valutazione"
              titolo={`Come si arriva a ${PUNTEGGIO_MASSIMO} punti`}
            />
            <div style={{ overflowX: "auto" }}>
              <table className="un-tabella">
                <thead>
                  <tr>
                    <th>Criterio</th>
                    <th>Punti</th>
                  </tr>
                </thead>
                <tbody>
                  {CRITERI_UNIVERSITA.map((c) => (
                    <tr key={c.nome}>
                      <td>
                        <span className="un-crit-nome">{c.nome}</span>
                        <span className="un-crit-desc">{c.desc}</span>
                      </td>
                      <td>
                        <span className="un-crit-punti">{c.punti}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Punteggio massimo complessivo</td>
                    <td style={{ textAlign: "right" }}>{PUNTEGGIO_MASSIMO}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="un-testo" style={{ marginTop: 26 }}>
              {REGOLA_PARITA}
            </p>
            <ul className="un-elenco" style={{ marginTop: 18 }}>
              {CRITERI_NOTE.map((n) => (
                <li key={n}>
                  <i className="fas fa-circle-info" aria-hidden="true" />
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Art. 4. Candidatura ── */}
        <section className="section" id="candidatura">
          <div className="container mx-auto px-6">
            <Testata
              numero="07"
              articolo="Art. 4"
              kicker="Modalita di adesione"
              titolo="Candidati"
            />

            <div className="un-griglia un-griglia-2" style={{ alignItems: "start" }}>
              <div>
                <p className="un-testo" style={{ marginBottom: 20 }}>
                  La candidatura e individuale. In questa fase non serve un progetto: bastano due
                  minuti e i dati essenziali. Il progetto si costruisce durante il percorso, con il
                  supporto dei mentor.
                </p>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-dark)", margin: "0 0 6px" }}>
                  Piu avanti potra essere richiesto
                </h3>
                <p className="un-nota" style={{ marginBottom: 14 }}>
                  L&apos;art. 4 elenca a titolo esemplificativo quello che la candidatura potra
                  prevedere nelle fasi successive.
                </p>
                <ul className="un-elenco">
                  {CANDIDATURA_CONTENUTI.map((c) => (
                    <li key={c}>
                      <i className="fas fa-circle-check" aria-hidden="true" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: 22 }}>
                  {ADESIONE_NOTE.map((n) => (
                    <p key={n} className="un-nota" style={{ marginBottom: 10 }}>
                      {n}
                    </p>
                  ))}
                </div>
              </div>

              <div>
                {stato === "aperte" ? (
                  <div className="un-form-box">
                    <PreIscrizioneForm />
                  </div>
                ) : (
                  <div className="un-form-box">
                    <h3 style={{ fontSize: 18, color: "var(--text-dark)", margin: "0 0 10px" }}>
                      {stato === "chiuse" ? "Candidature chiuse" : "Candidature non ancora aperte"}
                    </h3>
                    <p className="un-testo" style={{ marginBottom: 20 }}>
                      Le modalita e la scadenza per le candidature saranno comunicate a breve sui
                      canali ufficiali.
                    </p>
                    <a href={MAILTO_INFORMAZIONI} className="btn-primary" style={{ display: "inline-block" }}>
                      Chiedi informazioni
                    </a>
                  </div>
                )}
                <p className="un-nota" style={{ marginTop: 16 }}>
                  Candidarsi al bando e iscriversi alla giornata del 10 dicembre sono due cose
                  distinte.{" "}
                  <Link
                    href={`/eventi/${EVENT_SLUG}#iscrizione`}
                    style={{ color: "var(--primary-dark)", fontWeight: 600 }}
                  >
                    Iscriviti anche all&apos;evento
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Art. 8. Commissione ── */}
        <section className="section bg-light-gray" id="commissione">
          <div className="container mx-auto px-6">
            <Testata
              numero="08"
              articolo="Art. 8"
              kicker="Commissione"
              titolo="Chi valuta i progetti"
              intro="La Commissione e nominata congiuntamente da Fondazione bioERGOtech e SafesPro."
            />
            <div className="un-griglia un-griglia-2">
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-dark)", margin: "0 0 14px" }}>
                  Composizione
                </h3>
                <ul className="un-elenco">
                  {COMMISSIONE_COMPOSIZIONE.map((c) => (
                    <li key={c}>
                      <i className="fas fa-user-tie" aria-hidden="true" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-dark)", margin: "0 0 14px" }}>
                  Principi di funzionamento
                </h3>
                <ul className="un-elenco">
                  {COMMISSIONE_PRINCIPI.map((p) => (
                    <li key={p}>
                      <i className="fas fa-scale-balanced" aria-hidden="true" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Art. 9. Pubblicazione ── */}
        <section className="section" id="pubblicazione">
          <div className="container mx-auto px-6">
            <Testata
              numero="09"
              articolo="Art. 9"
              kicker="Presentazione e pubblicazione"
              titolo="Dal palco alla rivista"
              intro={PUBBLICAZIONE_INTRO}
            />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-dark)", margin: "0 0 16px" }}>
              Gli organizzatori potranno fornire supporto su
            </h3>
            <ul className="un-elenco un-elenco-2">
              {PUBBLICAZIONE_SUPPORTO.map((s) => (
                <li key={s}>
                  <i className="fas fa-circle-check" aria-hidden="true" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
            <div className="un-testo" style={{ marginTop: 28 }}>
              <p>{PUBBLICAZIONE_INTEGRITA}</p>
              <p>
                <strong>{PUBBLICAZIONE_PROPRIETA}</strong>
              </p>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="section bg-light-gray" id="faq">
          <div className="container mx-auto px-6">
            <h2 className="section-title text-center">Domande frequenti</h2>
            <div className="max-w-3xl mx-auto mt-8 space-y-4">
              {FAQ_UNIVERSITA.map((f) => (
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

        {/* ── Art. 10 e 11. Contatti e disposizioni finali ── */}
        <section className="section" id="contatti">
          <div className="container mx-auto px-6">
            <Testata
              numero="10"
              articolo="Art. 10"
              kicker="Referenti e contatti"
              titolo="A chi scrivere"
            />
            <div className="un-contatti">
              <div className="un-contatto">
                <div className="un-contatto-ruolo">{CONTATTI_UNIVERSITA.fondazione.ruolo}</div>
                <b>{CONTATTI_UNIVERSITA.fondazione.nome}</b>
                <a href={`mailto:${CONTATTI_UNIVERSITA.fondazione.email}`}>
                  {CONTATTI_UNIVERSITA.fondazione.email}
                </a>
              </div>
              <div className="un-contatto">
                <div className="un-contatto-ruolo">{CONTATTI_UNIVERSITA.organizzazione.ruolo}</div>
                <b>SafesPro</b>
                <a href={`mailto:${CONTATTI_UNIVERSITA.organizzazione.email}`}>
                  {CONTATTI_UNIVERSITA.organizzazione.email}
                </a>
              </div>
              <div className="un-contatto">
                <div className="un-contatto-ruolo">Contatti telefonici</div>
                <b>{CONTATTI_UNIVERSITA.telefono.nome}</b>
                <a href={`tel:${CONTATTI_UNIVERSITA.telefono.numero.replace(/\s/g, "")}`}>
                  {CONTATTI_UNIVERSITA.telefono.numero}
                </a>
                <span>{CONTATTI_UNIVERSITA.telefono.ruolo}</span>
              </div>
            </div>

            <div style={{ marginTop: 44, paddingTop: 32, borderTop: "1px solid var(--border-color)" }}>
              <div className="un-head-riga">
                <span className="un-kicker">11. Disposizioni finali</span>
                <span className="un-art">Art. 11</span>
              </div>
              <p className="un-testo">{DISPOSIZIONI_FINALI}</p>
              <p className="un-nota" style={{ marginTop: 18 }}>
                {BANDO_DATA}
              </p>
            </div>
          </div>
        </section>
      </div>

      <SiteFooter />
    </>
  );
}
