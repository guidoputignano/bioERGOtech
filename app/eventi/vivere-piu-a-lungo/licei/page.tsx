import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { AdesioneForm } from "./AdesioneForm";
import { LiceiIndice } from "./LiceiIndice";
import { EVENT } from "../content";
import { leggiConfigLicei } from "@/lib/eventi/licei-server";
import {
  ANNI_CORSO,
  COMMISSIONE_LICEI,
  CONTATTI_LICEI,
  COSA_OFFRE_SCUOLE,
  CRITERI_LICEI,
  CRITERIO_DIRIMENTE_LICEI,
  EVENT_SLUG,
  FAQ_LICEI,
  IMPEGNI_ISTITUTO,
  LICEI,
  LICEI_PATH,
  MODALITA,
  PREMI_LICEI,
  PROVINCIA,
  SITE_URL,
  adesioniAperte,
} from "./content";

// Lo stato della raccolta vive a database e cambia dal pannello: una pagina
// generata a build time resterebbe ferma allo stato del giorno del deploy.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${LICEI.titolo} . Percorso per i licei . Fondazione bioERGOtech`,
  description:
    "Percorso formativo gratuito su biotecnologie e intelligenza artificiale per gli studenti del triennio dei licei di Taranto e provincia. Online, fuori orario scolastico, con mentor dalla ricerca e dall'impresa. I dieci progetti migliori sul palco del PalaMazzola il 10 dicembre 2026.",
  alternates: { canonical: LICEI_PATH },
  openGraph: {
    title: `${LICEI.titolo} . Fondazione bioERGOtech`,
    description: LICEI.sottotitolo,
    url: `${SITE_URL}${LICEI_PATH}`,
    images: [{ url: EVENT.ogImage }],
    type: "website",
  },
};

const PUNTI_MAX = Math.max(...CRITERI_LICEI.map((c) => c.punti));

/**
 * Foglio di stile della pagina, sulla stessa impostazione del bando startup:
 * vive qui perche serve solo a questa pagina, e perche `/assets/css/main.css`
 * viene caricato dopo il design system e ne riscrive `.section` e
 * `.section-title`. Qui rimettiamo le cose come le vuole `globals.css`, sotto
 * `.licei-page`, senza toccare il resto del sito.
 */
const STILE = `
.licei-page {
  --primary-dark: #0A7A66;
  --primary-light: #E1F5EE;
  --text-light: #64748B;
}
.licei-page .section { padding: 76px 0; overflow: visible; }
.licei-page section[id] { scroll-margin-top: 138px; }

.licei-page .section-title {
  display: block; font-size: 2rem; line-height: 1.25;
  color: var(--text-dark); padding-bottom: 20px; margin: 0 0 20px;
}
.licei-page .section-title::after { width: 56px; height: 3px; }
.licei-page .section-title:hover::after { width: 56px; }

.licei-page .card {
  margin: 0; background: #fff; border: 1px solid var(--border-color);
  transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease;
}
.licei-page .card::before { display: none; }
.licei-page .card:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 34px rgba(26, 35, 50, .10);
  border-color: #CFE9E4;
}

/* ── Testate di sezione ────────────────────────────────────────────────── */
.lc-head { max-width: 800px; margin-bottom: 36px; }
.lc-head-riga { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
.lc-num {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 9px;
  background: var(--primary-light); color: var(--primary-dark);
  font-size: 12px; font-weight: 800;
}
.lc-kicker { font-size: 11.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--primary-dark); }
.lc-art {
  font-size: 10.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
  color: var(--text-light); background: #fff;
  border: 1px solid var(--border-color); border-radius: 999px; padding: 4px 10px;
}
.lc-intro { font-size: 17px; line-height: 1.75; color: var(--text-mid); max-width: 800px; margin: 0 0 34px; }
.lc-testo { font-size: 15.5px; line-height: 1.8; color: var(--text-mid); max-width: 800px; }
.lc-testo p { margin: 0 0 16px; }
.lc-testo p:last-child { margin-bottom: 0; }
.lc-nota { font-size: 13px; color: var(--text-light); line-height: 1.7; max-width: 860px; }

/* ── Hero ──────────────────────────────────────────────────────────────── */
.licei-page .hero {
  min-height: auto; display: block;
  background: linear-gradient(135deg, #F7F9FC 0%, #E8F8F6 55%, #EEF3FF 100%);
}
.licei-page .hero .container { padding-top: 26px; padding-bottom: 64px; }
.lc-fatti { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
.lc-fatto {
  display: inline-flex; align-items: center; gap: 8px;
  background: #fff; border: 1px solid var(--border-color); border-radius: 999px;
  padding: 7px 15px; font-size: 12.5px; font-weight: 600; color: var(--text-dark);
}
.lc-fatto i { color: var(--primary-dark); font-size: 12px; }

.lc-stato {
  display: flex; align-items: flex-start; gap: 11px;
  border: 1px solid; border-radius: 12px; padding: 13px 16px;
  font-size: 14px; line-height: 1.6; margin-bottom: 28px; max-width: 660px;
}
.lc-stato i { margin-top: 3px; flex-shrink: 0; }
.lc-stato-aperto { background: #ECFAF6; border-color: #B4E3D8; color: #08594A; }
.lc-stato-attesa { background: #FFF8E8; border-color: #F0DFAE; color: #75570F; }
.lc-stato-chiuso { background: #F4F6F9; border-color: var(--border-color); color: var(--text-mid); }

.lc-azioni { display: flex; flex-wrap: wrap; gap: 12px; }

/* ── Indice ────────────────────────────────────────────────────────────── */
.lc-indice {
  position: sticky; top: 71px; z-index: 40;
  background: rgba(255, 255, 255, .93);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color);
}
.lc-indice-riga { display: flex; align-items: center; gap: 16px; height: 58px; }
.lc-indice-voci {
  display: flex; align-items: center; gap: 4px; flex: 1; min-width: 0;
  overflow-x: auto; scrollbar-width: none;
}
.lc-indice-voci::-webkit-scrollbar { display: none; }
.lc-voce {
  white-space: nowrap; font-size: 13px; font-weight: 600; color: var(--text-mid);
  padding: 7px 12px; border-radius: 8px; transition: background .2s ease, color .2s ease;
}
.lc-voce:hover { background: var(--bg-light); color: var(--text-dark); }
.lc-voce-attiva, .lc-voce-attiva:hover { background: var(--primary-light); color: var(--primary-dark); }
.lc-indice-cta { display: none; }
@media (min-width: 1040px) {
  .lc-indice-cta {
    display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0;
    background: var(--primary); color: #fff; font-size: 13px; font-weight: 700;
    padding: 10px 20px; border-radius: 8px;
    box-shadow: 0 4px 14px rgba(19, 214, 176, .3);
    transition: background .2s ease, transform .2s ease;
  }
  .lc-indice-cta:hover { background: var(--primary-dark); color: #fff; transform: translateY(-1px); }
}

/* ── Numeri ────────────────────────────────────────────────────────────── */
.lc-numeri {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 26px 18px;
  margin-top: 46px; padding-top: 36px; border-top: 1px solid var(--border-color);
}
@media (min-width: 780px) { .lc-numeri { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.lc-numero { font-size: 2.4rem; font-weight: 800; color: var(--primary-dark); line-height: 1; }
.lc-numero-et { font-size: 13px; color: var(--text-mid); margin-top: 9px; line-height: 1.45; }

/* ── Griglie di schede ─────────────────────────────────────────────────── */
.lc-griglia { display: grid; grid-template-columns: 1fr; gap: 20px; }
@media (min-width: 720px) { .lc-griglia-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 920px) { .lc-griglia-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (min-width: 920px) { .lc-griglia-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.lc-scheda {
  background: #fff; border: 1px solid var(--border-color); border-radius: 16px;
  padding: 24px; box-shadow: 0 6px 20px rgba(26, 35, 50, .05);
  transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease;
}
.lc-scheda:hover { transform: translateY(-3px); box-shadow: 0 16px 38px rgba(26, 35, 50, .10); border-color: #CFE9E4; }
.lc-scheda-icona {
  display: inline-flex; align-items: center; justify-content: center;
  width: 46px; height: 46px; border-radius: 13px;
  background: var(--primary-light); color: var(--primary-dark); font-size: 18px;
}
.lc-scheda h3 { font-size: 16px; margin: 16px 0 6px; color: var(--text-dark); line-height: 1.35; }
.lc-scheda p { font-size: 14px; line-height: 1.65; color: var(--text-mid); margin: 0; }

/* ── Anni di corso ─────────────────────────────────────────────────────── */
.lc-anni { display: grid; grid-template-columns: 1fr; gap: 14px; max-width: 860px; }
@media (min-width: 720px) { .lc-anni { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.lc-anno {
  border: 1px solid var(--border-color); border-radius: 14px; padding: 20px; background: #fff;
}
.lc-anno-prio { border-color: #B4E3D8; background: #F4FCFA; }
.lc-anno b { display: block; font-size: 15px; color: var(--text-dark); margin-bottom: 5px; }
.lc-anno span { font-size: 13px; color: var(--text-mid); line-height: 1.6; }
.lc-badge-prio {
  display: inline-block; font-size: 10px; font-weight: 800; letter-spacing: .08em;
  text-transform: uppercase; color: var(--primary-dark); background: var(--primary-light);
  border-radius: 999px; padding: 3px 9px; margin-bottom: 9px;
}

/* ── Premi ─────────────────────────────────────────────────────────────── */
.lc-premio { display: flex; gap: 16px; align-items: flex-start; }
.lc-premio-pos {
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
  width: 46px; height: 46px; border-radius: 14px;
  background: var(--primary-light); color: var(--primary-dark); font-size: 18px; font-weight: 800;
}
.lc-premio-rap {
  display: inline-block; margin-top: 10px; font-size: 12px; font-weight: 600;
  color: var(--primary-dark); background: var(--primary-light);
  border-radius: 999px; padding: 4px 11px;
}

/* ── Criteri ───────────────────────────────────────────────────────────── */
.lc-criteri { display: flex; flex-direction: column; gap: 4px; max-width: 900px; }
.lc-criterio { padding: 16px 0; border-bottom: 1px solid var(--border-color); }
.lc-criterio:last-child { border-bottom: none; }
.lc-criterio-riga { display: flex; align-items: baseline; gap: 14px; margin-bottom: 7px; }
.lc-criterio-riga b { font-size: 15px; color: var(--text-dark); flex: 1; }
.lc-criterio-punti { font-size: 15px; font-weight: 800; color: var(--primary-dark); flex-shrink: 0; }
.lc-barra { height: 6px; border-radius: 99px; background: var(--border-color); overflow: hidden; margin-bottom: 8px; max-width: 420px; }
.lc-barra span { display: block; height: 100%; border-radius: 99px; background: var(--primary); }
.lc-criterio p { font-size: 13.5px; line-height: 1.6; color: var(--text-mid); margin: 0; }

/* ── Impegni ───────────────────────────────────────────────────────────── */
.lc-impegni { display: grid; grid-template-columns: 1fr; gap: 14px; max-width: 900px; }
@media (min-width: 780px) { .lc-impegni { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.lc-impegno {
  display: flex; gap: 12px; align-items: flex-start;
  background: #fff; border: 1px solid var(--border-color); border-radius: 14px; padding: 18px;
}
.lc-impegno i { color: var(--primary-dark); margin-top: 3px; flex-shrink: 0; }
.lc-impegno b { display: block; font-size: 14.5px; color: var(--text-dark); margin-bottom: 4px; }
.lc-impegno span { font-size: 13.5px; line-height: 1.65; color: var(--text-mid); }

/* ── Elenchi puntati ───────────────────────────────────────────────────── */
.lc-lista { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 13px; max-width: 820px; }
.lc-lista li { display: flex; gap: 12px; align-items: flex-start; font-size: 14.5px; line-height: 1.7; color: var(--text-mid); }
.lc-lista i { color: var(--primary); margin-top: 5px; flex-shrink: 0; font-size: 12px; }

/* ── Contatti ──────────────────────────────────────────────────────────── */
.lc-contatti { display: grid; grid-template-columns: 1fr; gap: 18px; max-width: 900px; }
@media (min-width: 780px) { .lc-contatti { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.lc-contatto { background: #fff; border: 1px solid var(--border-color); border-radius: 14px; padding: 22px; }
.lc-contatto-et { font-size: 10.5px; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; color: var(--text-light); }
.lc-contatto h3 { font-size: 16px; margin: 7px 0 4px; color: var(--text-dark); }
.lc-contatto a { color: var(--primary-dark); font-weight: 600; font-size: 14px; }
.lc-contatto p { font-size: 13px; line-height: 1.65; color: var(--text-mid); margin: 8px 0 0; }

/* ── Adesione ──────────────────────────────────────────────────────────── */
.lc-adesione { display: grid; grid-template-columns: 1fr; gap: 40px; align-items: start; }
@media (min-width: 1000px) { .lc-adesione { grid-template-columns: .9fr 1.1fr; gap: 52px; } }
`;

/** Testata di sezione: numero, filo narrativo, riferimento all'articolo. */
function Testata({
  n,
  kicker,
  articolo,
  titolo,
  children,
}: {
  n: number;
  kicker: string;
  articolo: string;
  titolo: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="lc-head">
      <div className="lc-head-riga">
        <span className="lc-num" aria-hidden="true">
          {String(n).padStart(2, "0")}
        </span>
        <span className="lc-kicker">{kicker}</span>
        <span className="lc-art">{articolo}</span>
      </div>
      <h2 className="section-title">{titolo}</h2>
      {children ? <p className="lc-intro">{children}</p> : null}
    </div>
  );
}

function FaqJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_LICEI.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />;
}

export default async function LiceiPage() {
  const config = await leggiConfigLicei();
  const aperte = adesioniAperte(config.stato_adesioni);

  // Lo staff vede il modulo anche a raccolta chiusa, per provare il flusso.
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

  const formVisibile = aperte || staff;
  const anteprimaStaff = staff && !aperte;

  const numeri = [
    { n: String(LICEI.progettiSulPalco), et: "Progetti sul palco" },
    { n: "3", et: "Premi" },
    { n: "0 €", et: "Costo per scuole e famiglie" },
    { n: "3", et: "Anni del triennio ammessi" },
  ];

  return (
    <>
      <FaqJsonLd />
      <style>{STILE}</style>
      <Navbar />

      <div className="licei-page">
        {/* ── Hero ── */}
        <section className="hero" style={{ paddingTop: 120 }}>
          <div className="container mx-auto px-6">
            <div style={{ maxWidth: 820 }}>
              <div className="lc-kicker" style={{ marginBottom: 16 }}>
                {LICEI.occhiello} . Bando per i licei
              </div>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-5 text-gray-800">
                {LICEI.titolo}
              </h1>
              <p className="text-xl text-gray-700 mb-7">{LICEI.sottotitolo}</p>

              <div className="lc-fatti">
                <span className="lc-fatto">
                  <i className="fas fa-laptop" aria-hidden="true" /> Interamente online
                </span>
                <span className="lc-fatto">
                  <i className="fas fa-euro-sign" aria-hidden="true" /> Gratuito
                </span>
                <span className="lc-fatto">
                  <i className="fas fa-clock" aria-hidden="true" /> Fuori orario scolastico
                </span>
                <span className="lc-fatto">
                  <i className="fas fa-location-dot" aria-hidden="true" /> {LICEI.dataLabel}, {LICEI.luogo}
                </span>
              </div>

              {config.avviso ? (
                <div className="lc-stato lc-stato-attesa">
                  <i className="fas fa-circle-info" aria-hidden="true" />
                  <span>{config.avviso}</span>
                </div>
              ) : config.stato_adesioni === "chiuse" ? (
                <div className="lc-stato lc-stato-chiuso">
                  <i className="fas fa-flag-checkered" aria-hidden="true" />
                  <span>
                    La raccolta delle adesioni è chiusa. Per informazioni scrivi a{" "}
                    {CONTATTI_LICEI.fondazione.email}.
                  </span>
                </div>
              ) : config.scadenza_adesioni_label ? (
                <div className="lc-stato lc-stato-aperto">
                  <i className="fas fa-circle-check" aria-hidden="true" />
                  <span>
                    Le adesioni degli istituti sono aperte fino al {config.scadenza_adesioni_label}.
                  </span>
                </div>
              ) : (
                <div className="lc-stato lc-stato-attesa">
                  <i className="fas fa-clock" aria-hidden="true" />
                  <span>
                    Il bando non fissa un termine: i tempi per la trasmissione delle adesioni saranno
                    comunicati dal referente del consorzio dei licei. Il modulo è già aperto, e
                    aderire adesso vi porta avanti.
                  </span>
                </div>
              )}

              <div className="lc-azioni">
                <Link href="#adesione" className="btn-primary text-center">
                  Aderisci con il tuo istituto
                </Link>
                <Link href={`/eventi/${EVENT_SLUG}`} className="btn-outline text-center">
                  L&apos;evento del 10 dicembre
                </Link>
              </div>
            </div>
          </div>
        </section>

        <LiceiIndice ctaLabel="Aderisci" />

        {/* ── Premessa ── */}
        <section className="section" id="premessa">
          <div className="container mx-auto px-6">
            <Testata n={1} kicker="Premessa e finalità" articolo="Art. 1" titolo="Perché questo percorso" />
            <div className="lc-testo">
              <p>
                Fondazione bioERGOtech, con la direzione scientifica, e SafesPro, in qualità di ente
                organizzatore, aprono agli istituti di istruzione secondaria di secondo grado della
                provincia di {PROVINCIA} un percorso formativo gratuito su biotecnologie e
                intelligenza artificiale, rivolto agli studenti del triennio.
              </p>
              <p>
                Il progetto prosegue il cammino avviato con i Taranto Biotech Days 2024 e con
                l&apos;evento di Roma dell&apos;ottobre 2025 alla Sala della Regina di Palazzo
                Montecitorio, e si inserisce nell&apos;iniziativa &quot;Vivere più a lungo: sport e
                intelligenza artificiale&quot;, nell&apos;ottica di favorire nel lungo periodo
                l&apos;insediamento di un centro di ricerca a Taranto.
              </p>
              <p>
                L&apos;obiettivo è formare i ragazzi in due campi che decideranno molto del loro
                futuro, orientarli con cognizione di causa verso la scelta universitaria, e metterli
                in condizione di sviluppare, in team, un proprio progetto, prototipo o idea di
                impresa. I {LICEI.progettiSulPalco} progetti migliori li presentano loro stessi, dal
                palco, davanti a scienziati e a una commissione scientifica.
              </p>
            </div>

            <div className="lc-numeri">
              {numeri.map((s) => (
                <div key={s.et}>
                  <div className="lc-numero">{s.n}</div>
                  <div className="lc-numero-et">{s.et}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Destinatari ── */}
        <section className="section bg-light-gray" id="destinatari">
          <div className="container mx-auto px-6">
            <Testata n={2} kicker="Destinatari" articolo="Art. 2" titolo="Chi può partecipare">
              Gli studenti del triennio delle scuole secondarie di secondo grado di {PROVINCIA} e
              provincia. Le classi quarte e quinte hanno la priorità, per la maggiore vicinanza alla
              scelta universitaria e perché il percorso si valorizza anche come orientamento in
              uscita. Le terze concorrono ai posti eventualmente residui.
            </Testata>

            <div className="lc-anni">
              {ANNI_CORSO.map((a) => (
                <div key={a.anno} className={`lc-anno${a.priorita ? " lc-anno-prio" : ""}`}>
                  {a.priorita && <span className="lc-badge-prio">Prioritaria</span>}
                  <b>{a.label}</b>
                  <span>
                    {a.priorita
                      ? "Vicine alla scelta universitaria: la partecipazione è considerata prioritaria."
                      : "Ammesse, concorrono ai posti eventualmente residui."}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Come funziona ── */}
        <section className="section" id="corso">
          <div className="container mx-auto px-6">
            <Testata n={3} kicker="Svolgimento" articolo="Art. 3" titolo="Come funziona il percorso">
              Un corso online, fuori dall&apos;orario scolastico, con il supporto di mentor
              provenienti dal mondo della ricerca e dell&apos;impresa. Non sottrae ore alle lezioni e
              non costa nulla, né alla scuola né alle famiglie.
            </Testata>

            <div className="lc-griglia lc-griglia-4">
              {MODALITA.map((m) => (
                <div key={m.titolo} className="lc-scheda">
                  <span className="lc-scheda-icona">
                    <i className={`fas ${m.icona}`} aria-hidden="true" />
                  </span>
                  <h3>{m.titolo}</h3>
                  <p>{m.desc}</p>
                </div>
              ))}
            </div>

            <div className="lc-testo" style={{ marginTop: 34 }}>
              <p>
                L&apos;obiettivo finale è l&apos;ideazione e lo sviluppo, in team, di un progetto
                concreto e innovativo che integri intelligenza artificiale e biotecnologie per
                rispondere a una sfida reale in ambito sanitario, ambientale o industriale, con
                evidenza di fattibilità, impatto potenziale e aspetti etici connessi.
              </p>
            </div>

            <p className="lc-nota" style={{ marginTop: 22 }}>
              Le squadre non si formano adesso e non si iscrivono a parte. Il lavoro in team è uno
              dei contenuti del percorso: i ragazzi si conoscono nelle prime settimane e formano la
              squadra quando hanno un&apos;idea da sviluppare.
            </p>
          </div>
        </section>

        {/* ── Cosa offre alle scuole ── */}
        <section className="section bg-light-gray" id="scuole">
          <div className="container mx-auto px-6">
            <Testata
              n={4}
              kicker="Cosa offre agli istituti"
              articolo="Art. 5"
              titolo="Che cosa ne ricava la scuola"
            />

            <div className="lc-griglia lc-griglia-3" style={{ marginBottom: 44 }}>
              {COSA_OFFRE_SCUOLE.map((o) => (
                <div key={o.titolo} className="lc-scheda">
                  <span className="lc-scheda-icona">
                    <i className={`fas ${o.icona}`} aria-hidden="true" />
                  </span>
                  <h3>{o.titolo}</h3>
                  <p>{o.desc}</p>
                </div>
              ))}
            </div>

            <h3 className="font-semibold text-gray-800 mb-4" style={{ fontSize: 18 }}>
              Che cosa chiede in cambio
            </h3>
            <div className="lc-impegni">
              {IMPEGNI_ISTITUTO.map((i) => (
                <div key={i.campo} className="lc-impegno">
                  <i className="fas fa-circle-check" aria-hidden="true" />
                  <div>
                    <b>{i.titolo}</b>
                    <span>{i.testo}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Premi ── */}
        <section className="section" id="premi">
          <div className="container mx-auto px-6">
            <Testata n={5} kicker="Evento finale e premi" articolo="Art. 6" titolo="I tre premi">
              I {LICEI.progettiSulPalco} progetti migliori vengono selezionati ed esposti dagli stessi
              studenti sul palco dell&apos;evento finale del {LICEI.dataLabel.toLowerCase()}, al{" "}
              {LICEI.luogo}, davanti a scienziati di primo piano e a una commissione scientifica. Al
              termine della conferenza vengono premiati i migliori progetti.
            </Testata>

            <div className="lc-griglia lc-griglia-3">
              {PREMI_LICEI.map((p) => (
                <div key={p.posizione} className="lc-scheda">
                  <div className="lc-premio">
                    <span className="lc-premio-pos">{p.posizione}</span>
                    <div>
                      <h3 style={{ margin: "2px 0 6px" }}>{p.titolo}</h3>
                      <p>{p.desc}</p>
                      <span className="lc-premio-rap">Rappresentanza {p.rappresentanza}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Criteri ── */}
        <section className="section bg-light-gray" id="criteri">
          <div className="container mx-auto px-6">
            <Testata
              n={6}
              kicker="Criteri di valutazione"
              articolo="Art. 7"
              titolo="Come si assegnano i punti"
            >
              I progetti sono valutati dalla Commissione su sei criteri, per un punteggio massimo
              complessivo di {LICEI.punteggioMassimo} punti. I {LICEI.progettiSulPalco} progetti con
              il punteggio più alto accedono alla presentazione dal palco.
            </Testata>

            <div className="lc-criteri">
              {CRITERI_LICEI.map((c) => (
                <div key={c.criterio} className="lc-criterio">
                  <div className="lc-criterio-riga">
                    <b>{c.criterio}</b>
                    <span className="lc-criterio-punti">{c.punti}</span>
                  </div>
                  <div className="lc-barra" aria-hidden="true">
                    <span style={{ width: `${(c.punti / PUNTI_MAX) * 100}%` }} />
                  </div>
                  <p>{c.desc}</p>
                </div>
              ))}
            </div>

            <p className="lc-nota" style={{ marginTop: 26 }}>
              A parità di punteggio complessivo prevale il progetto con il punteggio più alto in
              &quot;{CRITERIO_DIRIMENTE_LICEI}&quot;; in caso di ulteriore parità decide il voto
              insindacabile del Presidente della Commissione. Le valutazioni della Commissione sono
              insindacabili e non sono ammessi ricorsi.
            </p>
          </div>
        </section>

        {/* ── Adesione ── */}
        <section className="section" id="adesione">
          <div className="container mx-auto px-6">
            <Testata
              n={7}
              kicker="Adesione dell'istituto"
              articolo="Art. 4"
              titolo="Come aderisce la scuola"
            />

            <div className="lc-adesione">
              <div>
                <div className="lc-testo" style={{ marginBottom: 26 }}>
                  <p>
                    Il modulo lo compila il <strong>docente referente</strong>, non lo studente:
                    aderisce l&apos;istituto. Tre passi e pochi minuti.
                  </p>
                </div>

                <ul className="lc-lista">
                  <li>
                    <i className="fas fa-circle" aria-hidden="true" />
                    <span>
                      <strong>Ora.</strong> Il referente trasmette l&apos;adesione dell&apos;istituto
                      e riceve via email il codice della scuola.
                    </span>
                  </li>
                  <li>
                    <i className="fas fa-circle" aria-hidden="true" />
                    <span>
                      <strong>Poi.</strong> Quando apriamo le iscrizioni, il referente diffonde il
                      codice fra gli studenti del triennio. Sono i ragazzi a iscriversi: nessun
                      elenco da trascrivere a mano, solo da confermare.
                    </span>
                  </li>
                  <li>
                    <i className="fas fa-circle" aria-hidden="true" />
                    <span>
                      <strong>Durante.</strong> Gli studenti seguono il corso, formano le squadre e
                      sviluppano il progetto, seguiti dai mentor.
                    </span>
                  </li>
                  <li>
                    <i className="fas fa-circle" aria-hidden="true" />
                    <span>
                      <strong>Il 10 dicembre.</strong> I {LICEI.progettiSulPalco} progetti migliori
                      salgono sul palco del {LICEI.luogo}.
                    </span>
                  </li>
                </ul>

                <p className="lc-nota" style={{ marginTop: 26 }}>
                  In questa fase non chiediamo i nomi degli studenti, solo quanti prevedete di
                  coinvolgere. Le autorizzazioni dei genitori restano cartacee e in custodia
                  all&apos;istituto: il sito non le raccoglie e non le conserva.
                </p>
              </div>

              {formVisibile ? (
                <AdesioneForm anteprimaStaff={anteprimaStaff} />
              ) : (
                <div className="card" style={{ textAlign: "center", padding: 40 }}>
                  <span className="icon-circle icon-circle-primary" style={{ width: 56, height: 56, margin: "0 auto" }}>
                    <i className="fas fa-flag-checkered text-2xl" />
                  </span>
                  <h3 className="text-xl font-bold text-gray-800 mt-5 mb-2">Adesioni chiuse</h3>
                  <p className="text-gray-600">
                    Grazie agli istituti che hanno aderito. Per informazioni scrivete a{" "}
                    {CONTATTI_LICEI.fondazione.email}.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Commissione ── */}
        <section className="section bg-light-gray" id="regole">
          <div className="container mx-auto px-6">
            <Testata n={8} kicker="Commissione" articolo="Art. 8" titolo="Chi valuta i progetti">
              La Commissione è nominata congiuntamente da Fondazione bioERGOtech e SafesPro ed è
              composta da un numero dispari di membri, non inferiore a 5 e non superiore a 9.
            </Testata>

            <ul className="lc-lista">
              {COMMISSIONE_LICEI.map((m) => (
                <li key={m}>
                  <i className="fas fa-user-check" aria-hidden="true" />
                  <span>{m}</span>
                </li>
              ))}
            </ul>

            <p className="lc-nota" style={{ marginTop: 26 }}>
              Le sedute sono valide con la maggioranza dei membri con diritto di voto e le decisioni
              si assumono a maggioranza dei presenti. Ogni componente dichiara eventuali conflitti di
              interesse rispetto a singoli progetti o team e si astiene dalla relativa valutazione.
              La Commissione può avvalersi in fase istruttoria del supporto dei mentor e dei tutor
              che hanno seguito i team, i quali non partecipano però all&apos;attribuzione dei
              punteggi finali. I lavori si svolgono nelle settimane precedenti l&apos;evento.
            </p>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="section" id="faq">
          <div className="container mx-auto px-6">
            <h2 className="section-title text-center">Domande frequenti</h2>
            <div className="max-w-3xl mx-auto mt-8 space-y-4">
              {FAQ_LICEI.map((f) => (
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
            <Testata n={9} kicker="Referenti e contatti" articolo="Art. 9" titolo="Chi risponde" />

            <div className="lc-contatti">
              <div className="lc-contatto">
                <span className="lc-contatto-et">{CONTATTI_LICEI.consorzio.ruolo}</span>
                <h3>{CONTATTI_LICEI.consorzio.nome}</h3>
                <p>{CONTATTI_LICEI.consorzio.dettaglio}</p>
              </div>
              <div className="lc-contatto">
                <span className="lc-contatto-et">{CONTATTI_LICEI.fondazione.ruolo}</span>
                <h3>{CONTATTI_LICEI.fondazione.nome}</h3>
                <a href={`mailto:${CONTATTI_LICEI.fondazione.email}`}>
                  {CONTATTI_LICEI.fondazione.email}
                </a>
              </div>
              <div className="lc-contatto">
                <span className="lc-contatto-et">{CONTATTI_LICEI.organizzazione.ruolo}</span>
                <h3 style={{ marginBottom: 8 }}>SafesPro</h3>
                <a href={`mailto:${CONTATTI_LICEI.organizzazione.email}`}>
                  {CONTATTI_LICEI.organizzazione.email}
                </a>
              </div>
              <div className="lc-contatto">
                <span className="lc-contatto-et">Contatti telefonici</span>
                <h3>{CONTATTI_LICEI.telefono.numero}</h3>
                <p>{CONTATTI_LICEI.telefono.riferimento}</p>
              </div>
            </div>

            <p className="lc-nota" style={{ marginTop: 30 }}>
              Il bando ha finalità informativa e di invito alla partecipazione. Ulteriori modalità
              operative, termini di scadenza per la presentazione delle candidature e documentazione
              di adesione saranno comunicati dagli organizzatori tramite il referente del consorzio
              dei licei e i canali ufficiali di Fondazione bioERGOtech e SafesPro. {LICEI.emanato}.
            </p>
          </div>
        </section>
      </div>

      <SiteFooter />
    </>
  );
}
