import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { JsonLd, breadcrumbs } from "@/components/json-ld";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { EVENT } from "../../content";
import {
  CONTATTI_UNIVERSITA,
  EVENT_SLUG,
  MENTOR,
  MENTOR_CANDIDATURA_PATH,
  MENTOR_COSA_CHIEDIAMO,
  MENTOR_INTRO,
  MENTOR_NOTA_APPROVAZIONE,
  MENTOR_NOTA_VUOTO,
  MENTOR_PATH,
  SITE_URL,
  UNIVERSITA,
  UNIVERSITA_PATH,
  areaLabel,
  ruoloMentorLabel,
} from "../content";

/**
 * L'elenco pubblico dei mentor del percorso universitario.
 *
 * E' pubblica e indicizzata perche serve a tre persone diverse, e due delle
 * tre non hanno un account: chi sta decidendo se candidarsi e vuole sapere
 * con chi lavorerebbe, chi e gia dentro e cerca la persona giusta per il suo
 * problema, e il ricercatore che scopre l'iniziativa e vuole darle una mano.
 * Metterla dietro l'accesso servirebbe solo la terza.
 *
 * L'elenco si legge a ogni richiesta e non a build time: un mentor approvato
 * di martedi comparirebbe altrimenti al primo rilascio utile del sito, cioe
 * quando capita, e l'approvazione tornerebbe a dipendere da chi sviluppa.
 * E' la stessa ragione per cui i mentor sono una tabella e non un array
 * versionato come `app/people/people.ts`.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${MENTOR.titolo} . Percorso universitario . Fondazione bioERGOtech`,
  description: MENTOR.sottotitolo,
  alternates: { canonical: MENTOR_PATH },
  openGraph: {
    title: `${MENTOR.titolo} . Percorso universitario`,
    description: MENTOR.sottotitolo,
    url: `${SITE_URL}${MENTOR_PATH}`,
    images: [{ url: EVENT.ogImage }],
    type: "website",
  },
};

/**
 * Le sole colonne che il consenso alla pubblicazione elenca.
 *
 * `competenze`, `telefono` ed `email` non sono qui e non e una dimenticanza:
 * CONSENSO_PUBBLICAZIONE_MENTOR_TESTO nomina nome, ruolo, organizzazione,
 * aree e profilo, e quello che il testo non nomina non si pubblica. Non
 * chiederle nemmeno alla query e il modo piu semplice di non pubblicarle per
 * sbaglio fra sei mesi, quando qualcuno aggiungera un campo alla scheda.
 */
type MentorPubblicato = {
  id: string;
  nome: string;
  cognome: string;
  ruolo: string;
  organizzazione: string;
  aree: string[] | null;
  bio: string | null;
  sito: string | null;
  linkedin: string | null;
  foto_url: string | null;
};

const STILE = `
/* /assets/css/main.css e' caricato nel layout dopo globals.css e ridefinisce
   .section, .section-title e .card. Le pagine gemelle del modulo lo
   neutralizzano sotto la propria classe, e questa fa lo stesso: senza i reset
   le schede dei mentor prenderebbero un'altra ombra e un altro titolo
   rispetto a quelle del bando, che e la pagina da cui si arriva qui. */
.mn-page .section { padding: 72px 0; overflow: visible; }
.mn-page .section-title {
  display: block; font-size: 2rem; line-height: 1.25;
  color: var(--text-dark); padding-bottom: 20px; margin: 0 0 16px;
}
.mn-page .section-title::after { width: 56px; height: 3px; }
.mn-page .section-title:hover::after { width: 56px; }
.mn-page .card {
  margin: 0; background: #fff; border: 1px solid var(--border-color);
  transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease;
}
.mn-page .card::before { display: none; }
.mn-page .card:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 34px rgba(26, 35, 50, .10);
  border-color: #CFE9E4;
}

/* Stessa testata in gradiente della pagina del bando: si arriva qui da li,
   e due gradienti diversi farebbero sembrare questa pagina un altro sito. */
.mn-page .hero {
  min-height: auto; display: block;
  background: linear-gradient(135deg, #F7F9FC 0%, #E8F8F6 55%, #EEF3FF 100%);
}
.mn-page .hero .container { padding-top: 26px; padding-bottom: 60px; }

.mn-kicker {
  font-size: 11.5px; font-weight: 700; letter-spacing: .12em;
  text-transform: uppercase; color: var(--primary-dark);
}
.mn-testo { font-size: 15.5px; line-height: 1.8; color: var(--text-mid); max-width: 820px; }
.mn-testo p { margin: 0 0 16px; }
.mn-testo p:last-child { margin-bottom: 0; }
.mn-nota { font-size: 13px; color: var(--text-light); line-height: 1.7; max-width: 860px; }
.mn-azioni { display: flex; flex-wrap: wrap; gap: 12px; }

/* ── Schede dei mentor ─────────────────────────────────────────────────── */
.mn-griglia { display: grid; grid-template-columns: 1fr; gap: 22px; }
@media (min-width: 760px) { .mn-griglia { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 1080px) { .mn-griglia { grid-template-columns: repeat(3, minmax(0, 1fr)); } }

/* ── Quattro schede corte, non tre: stanno in fila su desktop e a coppie
      sul telefono, e nessuna resta orfana in fondo. ─────────────────────── */
.mn-griglia-4 { display: grid; grid-template-columns: 1fr; gap: 20px; }
@media (min-width: 720px) { .mn-griglia-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 1040px) { .mn-griglia-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); } }

.mn-iniziali {
  display: flex; align-items: center; justify-content: center;
  width: 128px; height: 128px; margin: 0 auto 16px; border-radius: 50%;
  background: var(--primary-light); color: var(--primary-dark);
  font-size: 38px; font-weight: 700; letter-spacing: .02em;
}
.mn-org { font-size: 14px; color: var(--text-mid); margin: 2px 0 0; line-height: 1.6; }
.mn-aree { display: flex; flex-wrap: wrap; justify-content: center; gap: 7px; margin: 14px 0 0; }
.mn-pill {
  background: var(--bg-light); border: 1px solid var(--border-color); border-radius: 999px;
  padding: 5px 12px; font-size: 12px; color: var(--text-mid); line-height: 1.4;
}
.mn-bio { font-size: 14px; line-height: 1.7; color: var(--text-mid); margin: 14px 0 0; text-align: left; }
.mn-link { display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; margin-top: 16px; }
.mn-link a { font-size: 13.5px; font-weight: 600; color: var(--primary-dark); }
.mn-link i { margin-right: 6px; }

/* ── Cosa chiediamo ────────────────────────────────────────────────────── */
.mn-scheda-icona {
  display: inline-flex; align-items: center; justify-content: center;
  width: 46px; height: 46px; border-radius: 13px;
  background: var(--primary-light); color: var(--primary-dark); font-size: 18px;
}
.mn-scheda h3 { font-size: 16px; margin: 16px 0 6px; color: var(--text-dark); line-height: 1.35; }
.mn-scheda p { font-size: 14px; line-height: 1.65; color: var(--text-mid); margin: 0; }
`;

/** Le iniziali per chi non ha una foto. Due lettere, mai di piu. */
function iniziali(nome: string, cognome: string): string {
  return `${nome.trim().charAt(0)}${cognome.trim().charAt(0)}`.toUpperCase();
}

export default async function MentorPage() {
  // Client anonimo e non service role, di proposito. La policy "Anyone can
  // view published mentors" espone le sole righe approvate e consenzienti,
  // che sono esattamente quelle che questa pagina mostra: la chiave di
  // servizio non aggiungerebbe niente e toglierebbe la rete sotto, cioe il
  // fatto che una query distratta qui non puo comunque far uscire una
  // candidatura ancora da leggere.
  //
  // I due filtri ripetono la policy invece di affidarsi a lei perche questa
  // pagina la apre anche chi e autenticato: una sessione da staff ha una
  // seconda policy che le fa vedere tutti i mentor, e senza i filtri la
  // pagina mostrerebbe a chi amministra un elenco diverso da quello che
  // vedono gli altri, che e il modo piu efficace di non accorgersi di un
  // errore.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("universita_mentor")
    .select("id, nome, cognome, ruolo, organizzazione, aree, bio, sito, linkedin, foto_url")
    .eq("stato", "approvata")
    .eq("consenso_pubblicazione", true)
    .order("cognome", { ascending: true });

  // Una pagina pubblica non va in errore per un elenco che non risponde: chi
  // arriva qui dal bando deve comunque poter leggere che cosa fa un mentor e
  // come ci si candida. La nota di elenco vuoto copre il caso, ed e la stessa
  // che si vedra il primo giorno.
  if (error) console.error("Mentor universita: lettura elenco fallita:", error);
  const mentor = (data ?? []) as MentorPubblicato[];

  return (
    <>
      <JsonLd
        data={breadcrumbs([
          { name: EVENT.titolo, path: `/eventi/${EVENT_SLUG}` },
          { name: UNIVERSITA.titolo, path: UNIVERSITA_PATH },
          { name: MENTOR.titolo, path: MENTOR_PATH },
        ])}
      />
      {/* Niente nodo Person per i mentor, e non e una dimenticanza. Chi ha
          firmato il consenso ha acconsentito a comparire in questa pagina,
          non a diventare un record strutturato che i motori copiano, uniscono
          ad altri profili e ripubblicano altrove. La briciola di navigazione
          descrive la pagina; una Person descriverebbe la persona, ed e un
          passo piu in la di quello che il consenso copre. */}
      <style>{STILE}</style>
      <Navbar />

      <div className="mn-page">
        {/* ── Testata ── */}
        <section className="hero" style={{ paddingTop: 120 }}>
          <div className="container mx-auto px-6">
            <div style={{ maxWidth: 820 }}>
              <div className="mn-kicker" style={{ marginBottom: 16 }}>
                {MENTOR.occhiello}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-5 text-gray-800">
                {MENTOR.titolo}
              </h1>
              <p className="text-xl text-gray-700 mb-7">{MENTOR.sottotitolo}</p>

              <div className="mn-testo" style={{ marginBottom: 28 }}>
                {MENTOR_INTRO.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>

              <div className="mn-azioni">
                <Link href={MENTOR_CANDIDATURA_PATH} className="btn-primary text-center">
                  Candidarsi come mentor
                </Link>
                <Link href={UNIVERSITA_PATH} className="btn-outline text-center">
                  Il bando del percorso
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Elenco ── */}
        <section className="section" id="elenco">
          <div className="container mx-auto px-6">
            <h2 className="section-title">Chi accompagna i team</h2>

            {mentor.length > 0 ? (
              <>
                {/* Approvata e pubblicata sono due cose distinte, e dirlo qui
                    evita la lettura sbagliata piu probabile, cioe che questo
                    elenco sia tutto il mentoring del percorso. */}
                <p className="mn-nota" style={{ marginBottom: 32 }}>
                  {mentor.length === 1
                    ? "Una persona in elenco."
                    : `${mentor.length} persone in elenco.`}{" "}
                  Compaiono qui i mentor che hanno acconsentito alla pubblicazione del proprio
                  profilo: si può essere mentor del percorso senza essere in questa pagina.
                </p>

                <div className="mn-griglia">
                  {mentor.map((m) => {
                    const ruolo = ruoloMentorLabel(m.ruolo);
                    const aree = m.aree ?? [];
                    return (
                      <article key={m.id} className="card text-center">
                        {m.foto_url ? (
                          // La foto arriva da una colonna che riempie lo
                          // staff, quindi e un indirizzo qualunque e non un
                          // file del repository: `next/image` pretenderebbe
                          // che quel dominio fosse elencato in
                          // `next.config.ts`, e il primo mentor con la foto su
                          // un dominio nuovo farebbe cadere la pagina intera
                          // invece della sua immagine.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.foto_url}
                            alt={`${m.nome} ${m.cognome}, ${ruolo}`}
                            width={128}
                            height={128}
                            className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
                          />
                        ) : (
                          // Senza foto le iniziali, mai un'immagine rotta: un
                          // riquadro con la crocetta accanto a un nome fa
                          // sembrare trascurato chi non ha mandato la foto.
                          <span className="mn-iniziali" aria-hidden="true">
                            {iniziali(m.nome, m.cognome)}
                          </span>
                        )}

                        <h3 className="text-xl font-semibold text-gray-800">
                          {m.nome} {m.cognome}
                        </h3>
                        <p className="font-semibold" style={{ color: "var(--primary)" }}>
                          {ruolo}
                        </p>
                        <p className="mn-org">{m.organizzazione}</p>

                        {aree.length > 0 && (
                          <div className="mn-aree">
                            {aree.map((a) => (
                              <span key={a} className="mn-pill">
                                {areaLabel(a)}
                              </span>
                            ))}
                          </div>
                        )}

                        {m.bio && <p className="mn-bio">{m.bio}</p>}

                        {(m.sito || m.linkedin) && (
                          <div className="mn-link">
                            {m.sito && (
                              <a href={m.sito} target="_blank" rel="noopener noreferrer">
                                <i className="fas fa-link" aria-hidden="true" />
                                Sito
                              </a>
                            )}
                            {m.linkedin && (
                              <a href={m.linkedin} target="_blank" rel="noopener noreferrer">
                                <i className="fab fa-linkedin-in" aria-hidden="true" />
                                LinkedIn
                              </a>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </>
            ) : (
              // Una griglia vuota direbbe che qualcosa non ha funzionato. La
              // nota dice la verita, cioe che l'elenco si sta componendo, e
              // porta dove serve, cioe al modulo.
              <div className="card" style={{ maxWidth: 720 }}>
                <p className="mn-testo" style={{ margin: 0 }}>
                  {MENTOR_NOTA_VUOTO}
                </p>
                <div className="mn-azioni" style={{ marginTop: 22 }}>
                  <Link href={MENTOR_CANDIDATURA_PATH} className="btn-primary text-center">
                    Candidarsi come mentor
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Diventare mentor ── */}
        <section className="section bg-light-gray" id="diventare">
          <div className="container mx-auto px-6">
            <div className="mn-kicker" style={{ marginBottom: 14 }}>
              Art. 3 e 5 del bando
            </div>
            <h2 className="section-title">Diventare mentor</h2>
            <p className="mn-testo" style={{ marginBottom: 32 }}>
              Il percorso è aperto a ricercatori, docenti, clinici, professionisti e persone che
              lavorano nell&apos;innovazione. Non serve un impegno continuo e non serve essere
              legati alla Fondazione: quello che chiediamo sta in quattro punti.
            </p>

            <div className="mn-griglia-4" style={{ marginBottom: 32 }}>
              {MENTOR_COSA_CHIEDIAMO.map((c) => (
                <div key={c.titolo} className="card mn-scheda">
                  <span className="mn-scheda-icona" aria-hidden="true">
                    <i className={`fas ${c.icona}`} />
                  </span>
                  <h3>{c.titolo}</h3>
                  <p>{c.desc}</p>
                </div>
              ))}
            </div>

            <div className="mn-azioni">
              <Link href={MENTOR_CANDIDATURA_PATH} className="btn-primary text-center">
                Compilare la candidatura
              </Link>
              <a
                href={`mailto:${CONTATTI_UNIVERSITA.fondazione.email}`}
                className="btn-outline text-center"
              >
                Scrivere alla Fondazione
              </a>
            </div>

            <p className="mn-nota" style={{ marginTop: 24 }}>
              {MENTOR_NOTA_APPROVAZIONE}
            </p>
          </div>
        </section>
      </div>

      <SiteFooter />
    </>
  );
}
