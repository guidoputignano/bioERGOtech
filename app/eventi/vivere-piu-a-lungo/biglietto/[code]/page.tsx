import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { googleCalendarUrl, icsUrl } from "@/lib/eventi/calendario";
import {
  caricaIscrizione,
  eventoAdminClient,
  postiPerGiornata,
  pulisciCodice,
  type GiornataIscritto,
  type IscrizioneEvento,
} from "@/lib/eventi/evento-server";
import { EVENT, EVENT_SLUG, SESSIONS, categoriaLabel, sessionBySlug, type EventSession } from "../../content";
import { GestisciBiglietto, InvitoAggiungi, StampaBiglietto, type GiornataGestibile } from "./GestisciBiglietto";

/**
 * Il biglietto online: nome, QR, codice e le giornate con data, orario,
 * luogo e stato del posto. In fondo, "Gestisci": aggiungere una giornata,
 * liberare un posto, farsi rimandare il biglietto.
 *
 * L'indirizzo /eventi/vivere-piu-a-lungo/biglietto/<codice> è nelle email
 * già inviate: non cambia. Il codice fa da chiave, quindi la pagina non va
 * indicizzata.
 *
 * Stampa: restano QR, nome, codice e giornate; navbar, footer, pulsanti e
 * la sezione Gestisci spariscono.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Il tuo biglietto",
  description: `Il biglietto per ${EVENT.titolo}.`,
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  // Il codice è nell'indirizzo: ai siti esterni (mappe, calendario) non lo si passa.
  referrer: "same-origin",
};

const PAGINA_EVENTO = `/eventi/${EVENT_SLUG}`;

const oraRoma = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" });

const maiuscola = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Una giornata del biglietto con la sua sessione: solo quelle che il sito conosce. */
type GiornataMostrata = { g: GiornataIscritto; s: EventSession };

type Stato =
  | { tipo: "ok"; iscr: IscrizioneEvento; rimanenti: Record<string, number> }
  | { tipo: "non_trovato" }
  | { tipo: "errore" };

async function carica(codice: string): Promise<Stato> {
  if (!codice) return { tipo: "non_trovato" };
  const client = eventoAdminClient();
  if (!client) {
    console.error("Biglietto online: configurazione Supabase mancante (URL o service role).");
    return { tipo: "errore" };
  }
  try {
    const iscr = await caricaIscrizione(client, { codice });
    if (!iscr) return { tipo: "non_trovato" };
    const posti = await postiPerGiornata(client);
    const rimanenti: Record<string, number> = {};
    for (const p of posti) rimanenti[p.slug] = p.rimanenti;
    return { tipo: "ok", iscr, rimanenti };
  } catch (err) {
    console.error("Biglietto online: lettura non riuscita:", err instanceof Error ? err.message : err);
    return { tipo: "errore" };
  }
}

export default async function TicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ code }, query] = await Promise.all([params, searchParams]);
  let grezzo = code;
  try {
    grezzo = decodeURIComponent(code);
  } catch {
    // Un "%" spaiato nell'indirizzo: si tiene il testo com'è e lo si pulisce.
  }
  const codice = pulisciCodice(grezzo);
  const primo = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const annullato = primo(query.annullato) === "1";
  const aggiungi = sessionBySlug(primo(query.aggiungi))?.slug ?? null;

  const stato = await carica(codice);

  return (
    <>
      <Navbar />
      <main className="vpb-pagina">
        <style>{STILE}</style>
        <div className="vpb-contenitore">
          {stato.tipo === "ok" ? (
            <Biglietto iscr={stato.iscr} rimanenti={stato.rimanenti} aggiungi={aggiungi} />
          ) : stato.tipo === "errore" ? (
            <Avviso
              icona="fa-plug-circle-exclamation"
              titolo="Il biglietto non si carica"
              testo={
                codice
                  ? `In questo momento non riusciamo a leggere il biglietto. Riprova tra qualche minuto. All'ingresso basta comunque il tuo codice: ${codice}.`
                  : "In questo momento non riusciamo a leggere il biglietto. Riprova tra qualche minuto."
              }
            >
              <a href={`${PAGINA_EVENTO}/biglietto/${encodeURIComponent(codice)}`} className="btn-primary vpb-btn">
                <i className="fas fa-rotate-right" aria-hidden="true" /> Riprova
              </a>
              <a href="mailto:info@bioergotech.org" className="btn-outline vpb-btn">
                <i className="fas fa-envelope" aria-hidden="true" /> Scrivi a info@bioergotech.org
              </a>
            </Avviso>
          ) : annullato ? (
            <Avviso
              icona="fa-circle-check"
              titolo="Iscrizione annullata"
              testo="Hai liberato il tuo posto: grazie, così può partecipare un'altra persona. Se cambi idea puoi iscriverti di nuovo, finché ci sono posti."
              stato
            >
              <Link href={`${PAGINA_EVENTO}#iscrizione`} className="btn-primary vpb-btn">
                <i className="fas fa-ticket" aria-hidden="true" /> Iscriviti di nuovo
              </Link>
              <Link href={PAGINA_EVENTO} className="btn-outline vpb-btn">
                Il programma dell&apos;evento
              </Link>
            </Avviso>
          ) : (
            <Avviso
              icona="fa-ticket"
              titolo="Biglietto non trovato"
              testo="Il link potrebbe essere incompleto: apri di nuovo quello dell'email di conferma, senza modificarlo. Se non trovi l'email, iscriviti di nuovo con la stessa email e lo stesso nome: non si crea un doppione, e ti rimandiamo il biglietto con le tue giornate."
            >
              <Link href={`${PAGINA_EVENTO}#iscrizione`} className="btn-primary vpb-btn">
                <i className="fas fa-ticket" aria-hidden="true" /> Vai all&apos;iscrizione
              </Link>
              <a href="mailto:info@bioergotech.org" className="btn-outline vpb-btn">
                <i className="fas fa-envelope" aria-hidden="true" /> Scrivi a info@bioergotech.org
              </a>
            </Avviso>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

/* ── Il biglietto ────────────────────────────────────────────────────── */

function Biglietto({
  iscr,
  rimanenti,
  aggiungi,
}: {
  iscr: IscrizioneEvento;
  rimanenti: Record<string, number>;
  aggiungi: string | null;
}) {
  const adesso = Date.now();
  const giornate: GiornataMostrata[] = iscr.giornate
    .map((g) => ({ g, s: sessionBySlug(g.slug) }))
    .filter((x): x is GiornataMostrata => Boolean(x.s));
  const iniziate = SESSIONS.filter((s) => adesso >= Date.parse(s.inizioISO)).map((s) => s.slug as string);
  const finite = new Set(SESSIONS.filter((s) => adesso >= Date.parse(s.fineISO)).map((s) => s.slug as string));
  const tutteInAttesa = giornate.length > 0 && giornate.every((x) => x.g.status === "lista_attesa");
  const gestibili: GiornataGestibile[] = giornate.map(({ g }) => ({
    slug: g.slug,
    status: g.status,
    presente: g.stato_checkin === "presente",
  }));
  const nome = `${iscr.nome} ${iscr.cognome}`.trim();
  const qr = `/api/eventi/qr/${encodeURIComponent(iscr.codice)}`;

  return (
    <>
      {aggiungi && (
        <InvitoAggiungi
          codice={iscr.codice}
          slug={aggiungi}
          giaNelBiglietto={giornate.some((x) => x.s.slug === aggiungi)}
          iniziata={iniziate.includes(aggiungi)}
          piena={rimanenti[aggiungi] !== undefined && rimanenti[aggiungi] <= 0}
        />
      )}

      <article className="vpb-biglietto" aria-labelledby="vpb-nome">
        <header className="vpb-testa">
          <p className="vpb-occhiello">{EVENT.organizzatore}</p>
          <p className="vpb-evento">{EVENT.titolo}</p>
          <p className="vpb-quando">
            {EVENT.dataLabel}, {EVENT.citta}. Ingresso gratuito.
          </p>
        </header>

        <div className="vpb-corpo">
          <p className="vpb-etichetta">Biglietto personale</p>
          <h1 id="vpb-nome" className="vpb-nome">
            {nome}
          </h1>
          {iscr.categoria && <span className="badge badge-primary vpb-categoria">{categoriaLabel(iscr.categoria)}</span>}

          {tutteInAttesa && (
            <p className="vpb-nota vpb-nota-attesa">
              <i className="fas fa-hourglass-half" aria-hidden="true" />
              <span>
                Sei in lista d&apos;attesa: il biglietto vale per l&apos;ingresso solo se si libera un posto. In quel caso ti
                scriviamo noi.
              </span>
            </p>
          )}

          <div className="vpb-qr">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt={`QR code del biglietto, codice ${iscr.codice}`} width={240} height={240} decoding="async" />
          </div>
          <p className="vpb-codice-etichetta" id="vpb-codice-etichetta">
            Codice
          </p>
          <p className="vpb-codice" aria-describedby="vpb-codice-etichetta">
            {iscr.codice}
          </p>
          <p className="vpb-aiuto">Mostra il QR all&apos;ingresso, dal telefono o stampato. Se non si legge, basta il codice.</p>
        </div>

        <div className="vpb-strappo" aria-hidden="true" />

        <section className="vpb-giornate" aria-labelledby="vpb-giornate-titolo">
          <h2 id="vpb-giornate-titolo" className="vpb-giornate-titolo">
            {giornate.length > 1 ? "Le tue giornate" : "La tua giornata"}
          </h2>
          {giornate.length === 0 ? (
            <p className="vpb-nota">
              <i className="fas fa-circle-info" aria-hidden="true" />
              <span>
                Nel biglietto non c&apos;è nessuna giornata. Puoi aggiungerne una qui sotto, nella sezione{" "}
                <a href="#gestisci">Gestisci</a>.
              </span>
            </p>
          ) : (
            <ul className="vpb-elenco">
              {giornate.map(({ g, s }) => (
                <SchedaGiornata key={g.id} g={g} s={s} codice={iscr.codice} finita={finite.has(s.slug)} />
              ))}
            </ul>
          )}
        </section>
      </article>

      <div className="vpb-azioni no-print">
        <StampaBiglietto />
        <Link href={PAGINA_EVENTO} className="vpb-link">
          Il programma dell&apos;evento <i className="fas fa-arrow-right" aria-hidden="true" />
        </Link>
      </div>

      <section id="gestisci" className="vpb-gestisci no-print" aria-labelledby="vpb-gestisci-titolo">
        <h2 id="vpb-gestisci-titolo" className="vpb-gestisci-titolo">
          <span className="icon-circle icon-circle-primary vpb-gestisci-icona" aria-hidden="true">
            <i className="fas fa-sliders" />
          </span>
          Gestisci la tua iscrizione
        </h2>
        <p className="vpb-gestisci-testo">
          Aggiungi una giornata, libera un posto che non userai o fatti rimandare il biglietto. Se liberi un posto, lo diamo a
          chi è in lista d&apos;attesa.
        </p>
        <GestisciBiglietto codice={iscr.codice} giornate={gestibili} rimanenti={rimanenti} iniziate={iniziate} />
      </section>

      <p className="vpb-contatti no-print">
        Hai bisogno di aiuto? Scrivi a <a href="mailto:info@bioergotech.org">info@bioergotech.org</a>.
      </p>
    </>
  );
}

function SchedaGiornata({
  g,
  s,
  codice,
  finita,
}: {
  g: GiornataIscritto;
  s: EventSession;
  codice: string;
  finita: boolean;
}) {
  const presente = g.stato_checkin === "presente";
  const attesa = g.status === "lista_attesa";
  const ora = presente && g.checkin_ts ? oraRoma.format(new Date(g.checkin_ts)) : null;

  return (
    <li className="vpb-giornata">
      <div className="vpb-giornata-testa">
        <h3 className="vpb-giornata-data">{s.giornoLabel}</h3>
        {presente ? (
          <span className="vpb-stato vpb-stato-presente">
            <i className="fas fa-door-open" aria-hidden="true" />
            {ora ? `Ingresso registrato alle ${ora}` : "Ingresso registrato"}
          </span>
        ) : attesa ? (
          <span className="vpb-stato vpb-stato-attesa">
            <i className="fas fa-hourglass-half" aria-hidden="true" />
            Lista d&apos;attesa
          </span>
        ) : (
          <span className="vpb-stato vpb-stato-ok">
            <i className="fas fa-circle-check" aria-hidden="true" />
            Confermato
          </span>
        )}
      </div>
      <p className="vpb-giornata-titolo">{s.titolo}</p>
      <ul className="vpb-dettagli">
        <li>
          <i className="fas fa-clock" aria-hidden="true" />
          <span>{maiuscola(s.orario)}</span>
        </li>
        <li>
          <i className="fas fa-location-dot" aria-hidden="true" />
          <a href={s.mappaUrl} target="_blank" rel="noopener noreferrer">
            {s.luogo}
            <span className="sr-only"> (mappa, si apre in una nuova scheda)</span>
          </a>
        </li>
      </ul>
      {attesa && !presente && (
        <p className="vpb-giornata-nota">I posti sono al momento esauriti: se se ne libera uno ti scriviamo noi.</p>
      )}
      {!attesa && !presente && !finita && (
        <div className="vpb-calendario no-print">
          <span className="vpb-calendario-etichetta">Aggiungi al calendario</span>
          <a href={googleCalendarUrl(s, codice)} target="_blank" rel="noopener noreferrer" className="vpb-pill">
            <i className="fab fa-google" aria-hidden="true" /> Google
            <span className="sr-only"> Calendar, {s.etichetta} (si apre in una nuova scheda)</span>
          </a>
          <a href={icsUrl([s.slug], codice, false)} className="vpb-pill" download>
            <i className="fas fa-calendar-plus" aria-hidden="true" /> Apple, Outlook
            <span className="sr-only">, file del calendario per {s.etichetta}</span>
          </a>
        </div>
      )}
    </li>
  );
}

/* ── Gli stati senza biglietto: non trovato, annullato, errore ───────── */

function Avviso({
  icona,
  titolo,
  testo,
  stato = false,
  children,
}: {
  icona: string;
  titolo: string;
  testo: string;
  /** Annunciato ai lettori di schermo all'arrivo (l'annullamento appena fatto). */
  stato?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="vpb-avviso" role={stato ? "status" : undefined}>
      <span className="icon-circle icon-circle-primary vpb-avviso-icona" aria-hidden="true">
        <i className={`fas ${icona}`} />
      </span>
      <h1 className="vpb-avviso-titolo">{titolo}</h1>
      <p className="vpb-avviso-testo">{testo}</p>
      <div className="vpb-avviso-azioni">{children}</div>
    </div>
  );
}

/* ── Stile: prefisso vpb- per la pagina, vpg- per Gestisci ───────────── */

const STILE = `
.vpb-pagina { background: var(--bg-light); padding: 96px 16px 56px; min-height: 70vh; }
.vpb-contenitore { max-width: 600px; margin: 0 auto; }
.vpb-btn { min-height: 44px; }
.vpb-pagina a:focus-visible, .vpb-pagina button:focus-visible { outline: 3px solid var(--primary-dark); outline-offset: 2px; }

/* Il biglietto */
.vpb-biglietto {
  background: #fff; border: 1px solid var(--border-color); border-top: 4px solid var(--primary);
  border-radius: 18px; box-shadow: var(--shadow); overflow: hidden;
}
.vpb-testa { padding: 20px 24px 0; text-align: center; }
.vpb-occhiello { margin: 0; color: var(--primary-dark); font-size: 0.75rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
.vpb-evento { margin: 6px 0 0; color: var(--text-dark); font-size: 1rem; font-weight: 700; line-height: 1.4; }
.vpb-quando { margin: 2px 0 0; color: var(--text-light); font-size: 0.8125rem; }
.vpb-corpo { padding: 20px 24px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; }
.vpb-etichetta { margin: 0; color: var(--text-light); font-size: 0.75rem; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
.vpb-nome { margin: 4px 0 8px; color: var(--text-dark); font-size: 1.625rem; line-height: 1.25; font-weight: 700; overflow-wrap: anywhere; }
.vpb-categoria { margin-bottom: 4px; }
.vpb-qr {
  margin-top: 18px; padding: 12px; background: #fff; border: 1px solid var(--border-color); border-radius: 16px;
  width: 266px; max-width: 100%; aspect-ratio: 1 / 1; display: flex; align-items: center; justify-content: center;
}
.vpb-qr img { display: block; width: 240px; height: auto; max-width: 100%; aspect-ratio: 1 / 1; }
.vpb-codice-etichetta { margin: 16px 0 0; color: var(--text-light); font-size: 0.75rem; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
.vpb-codice {
  margin: 2px 0 0; color: var(--text-dark); font-size: 1.5rem; font-weight: 800; letter-spacing: .12em;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; overflow-wrap: anywhere;
}
.vpb-aiuto { margin: 8px 0 0; color: var(--text-mid); font-size: 0.875rem; line-height: 1.55; max-width: 34ch; }

.vpb-nota {
  display: flex; gap: 10px; align-items: flex-start; text-align: left; margin: 14px 0 0;
  padding: 12px 14px; border-radius: 10px; background: var(--bg-light); color: var(--text-mid);
  font-size: 0.875rem; line-height: 1.55;
}
.vpb-nota i { color: var(--primary-dark); margin-top: 3px; }
.vpb-nota a { color: var(--primary-dark); font-weight: 600; text-decoration: underline; text-underline-offset: 2px; }
.vpb-nota-attesa { background: #FEF6E7; color: #7A4B00; }
.vpb-nota-attesa i { color: #B7791F; }

/* La linea da strappare, con le due tacche */
.vpb-strappo { position: relative; height: 0; border-top: 2px dashed var(--border-color); margin: 0 18px; }
.vpb-strappo::before, .vpb-strappo::after {
  content: ""; position: absolute; top: -12px; width: 22px; height: 22px; border-radius: 50%;
  background: var(--bg-light); border: 1px solid var(--border-color);
}
.vpb-strappo::before { left: -31px; }
.vpb-strappo::after { right: -31px; }

/* Le giornate */
.vpb-giornate { padding: 20px 24px 24px; }
.vpb-giornate-titolo { margin: 0 0 12px; color: var(--text-light); font-size: 0.75rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.vpb-elenco { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.vpb-giornata { border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; break-inside: avoid; }
.vpb-giornata-testa { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 12px; }
.vpb-giornata-data { margin: 0; color: var(--text-dark); font-size: 1.125rem; font-weight: 700; line-height: 1.3; }
.vpb-stato {
  display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 999px;
  font-size: 0.8125rem; font-weight: 700; line-height: 1.4;
}
.vpb-stato-ok { background: var(--primary-light); color: #0F5F57; }
.vpb-stato-attesa { background: #FEF3C7; color: #92400E; }
.vpb-stato-presente { background: #E8F0FE; color: #1E3A8A; }
.vpb-giornata-titolo { margin: 6px 0 10px; color: var(--text-mid); font-size: 0.9375rem; line-height: 1.5; }
.vpb-dettagli { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.vpb-dettagli li { display: flex; gap: 10px; align-items: baseline; color: var(--text-dark); font-size: 0.9375rem; line-height: 1.5; }
.vpb-dettagli i { color: var(--primary); width: 16px; text-align: center; flex-shrink: 0; }
.vpb-dettagli a { color: var(--text-dark); text-decoration: underline; text-decoration-color: var(--primary); text-underline-offset: 3px; }
.vpb-dettagli a:hover { color: var(--primary-dark); }
.vpb-giornata-nota { margin: 10px 0 0; color: #7A4B00; font-size: 0.875rem; line-height: 1.5; }
.vpb-calendario { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border-color); }
.vpb-calendario-etichetta { color: var(--text-mid); font-size: 0.8125rem; font-weight: 600; margin-right: 4px; }
.vpb-pill {
  display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 8px 16px; border-radius: 999px;
  border: 1.5px solid var(--border-color); color: var(--text-dark); font-size: 0.875rem; font-weight: 600;
  text-decoration: none; background: #fff; transition: border-color .2s ease, color .2s ease;
}
.vpb-pill i { color: var(--primary); }
.vpb-pill:hover { border-color: var(--primary); color: var(--primary-dark); }

/* Sotto il biglietto */
.vpb-azioni { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin: 20px 0 28px; }
.vpb-link { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; color: var(--primary-dark); font-weight: 600; font-size: 0.9375rem; text-decoration: none; }
.vpb-link:hover { text-decoration: underline; text-underline-offset: 3px; }

.vpb-gestisci {
  background: #fff; border: 1px solid var(--border-color); border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  padding: 24px; scroll-margin-top: 96px;
}
.vpb-gestisci-titolo { display: flex; align-items: center; gap: 12px; margin: 0 0 8px; color: var(--text-dark); font-size: 1.25rem; font-weight: 700; line-height: 1.3; }
.vpb-gestisci-icona { width: 40px; height: 40px; border-radius: 12px; font-size: 1rem; }
.vpb-gestisci-testo { margin: 0 0 18px; color: var(--text-mid); font-size: 0.9375rem; line-height: 1.6; }
.vpb-contatti { margin: 20px 0 0; text-align: center; color: var(--text-mid); font-size: 0.875rem; }
.vpb-contatti a { color: var(--primary-dark); font-weight: 600; }

/* Non trovato, annullato, errore */
.vpb-avviso {
  background: #fff; border: 1px solid var(--border-color); border-radius: 18px; box-shadow: var(--shadow);
  padding: 32px 24px; text-align: center; display: flex; flex-direction: column; align-items: center;
}
.vpb-avviso-icona { font-size: 1.375rem; margin-bottom: 14px; }
.vpb-avviso-titolo { margin: 0 0 8px; color: var(--text-dark); font-size: 1.5rem; font-weight: 700; line-height: 1.3; }
.vpb-avviso-testo { margin: 0 0 22px; color: var(--text-mid); font-size: 0.9375rem; line-height: 1.65; max-width: 46ch; overflow-wrap: anywhere; }
.vpb-avviso-azioni { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }

@media (min-width: 640px) {
  .vpb-pagina { padding: 120px 24px 72px; }
  .vpb-testa { padding: 24px 32px 0; }
  .vpb-corpo, .vpb-giornate { padding-left: 32px; padding-right: 32px; }
  .vpb-strappo { margin: 0 24px; }
  .vpb-strappo::before { left: -37px; }
  .vpb-strappo::after { right: -37px; }
  .vpb-nome { font-size: 1.875rem; }
  .vpb-gestisci { padding: 28px 32px; }
}
@media (max-width: 520px) {
  .vpb-avviso-azioni .vpb-btn, .vpb-azioni > .vpg-btn { width: 100%; }
  .vpb-azioni { justify-content: center; }
}

${stileGestisci()}

@media print {
  .navbar, footer, #progressBar, .no-print { display: none !important; }
  @page { margin: 12mm; }
  html, body { background: #fff !important; }
  .vpb-pagina { padding: 0 !important; background: #fff !important; min-height: 0; }
  .vpb-contenitore { max-width: none; }
  .vpb-biglietto { box-shadow: none; border: 1px solid #9AA5B1; border-top: 4px solid #1A9E92; break-inside: avoid; }
  .vpb-strappo::before, .vpb-strappo::after { background: #fff; }
  .vpb-qr { border-color: #9AA5B1; width: auto; aspect-ratio: auto; padding: 3mm; }
  .vpb-qr img { width: 62mm; max-width: none; }
  .vpb-corpo, .vpb-giornate { padding-top: 12px; padding-bottom: 12px; }
  .vpb-giornata { border-color: #9AA5B1; }
  .vpb-dettagli a { text-decoration: none; }
  .vpb-stato { border: 1px solid currentColor; }
}
`;

/** Lo stile di GestisciBiglietto: sta qui perché un modulo client non può passarlo al server. */
function stileGestisci(): string {
  return `
.vpg { display: grid; gap: 16px; }
.vpg-elenco { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.vpg-riga { border: 1px solid var(--border-color); border-radius: 12px; padding: 14px 16px; background: #fff; }
.vpg-riga-aggiungi { background: var(--bg-light); border-style: dashed; }
.vpg-riga-testa { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
.vpg-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1 1 200px; }
.vpg-data { font-weight: 700; color: var(--text-dark); font-size: 1rem; }
.vpg-sotto { color: var(--text-mid); font-size: 0.875rem; line-height: 1.5; }
.vpg-motivo { margin: 10px 0 0; color: var(--text-mid); font-size: 0.875rem; }
.vpg-motivo i { color: var(--text-light); }

.vpg-btn {
  min-height: 44px; font-size: 0.9375rem; font-family: inherit; line-height: 1.25;
  padding: 10px 20px; text-align: center; white-space: normal;
}
.vpg-btn i { font-size: 0.95em; }
.vpg-btn:focus-visible { outline: 3px solid var(--primary-dark); outline-offset: 2px; }
.vpg-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none !important; box-shadow: none; }
.vpg-btn-tenue {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  background: #fff; color: var(--text-mid); font-weight: 600; border-radius: 50px;
  border: 1.5px solid var(--border-color); cursor: pointer; transition: border-color .2s ease, color .2s ease;
}
.vpg-btn-tenue:hover:not(:disabled) { border-color: var(--text-light); color: var(--text-dark); }
.vpg-btn-pericolo {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  background: #B42318; color: #fff; font-weight: 700; border-radius: 50px; border: none; cursor: pointer;
  transition: background-color .2s ease;
}
.vpg-btn-pericolo:hover:not(:disabled) { background: #912018; }

.vpg-conferma { margin-top: 12px; padding: 14px 16px; border-radius: 10px; background: #FFF8F1; border: 1px solid #F5D9BF; }
.vpg-conferma p { margin: 0 0 12px; color: var(--text-dark); font-size: 0.9375rem; line-height: 1.6; }
.vpg-azioni { display: flex; flex-wrap: wrap; gap: 10px; }

.vpg-reinvio { display: grid; gap: 10px; padding-top: 4px; }
.vpg-reinvio p { margin: 0; color: var(--text-mid); font-size: 0.9375rem; line-height: 1.6; }
.vpg-reinvio .vpg-btn { justify-self: start; }

.vpg-annuncio-vuoto { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.vpg-annuncio { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 10px; font-size: 0.9375rem; line-height: 1.55; outline: none; }
.vpg-annuncio i { margin-top: 3px; }
.vpg-annuncio:focus-visible { outline: 3px solid var(--primary-dark); outline-offset: 2px; }
.vpg-annuncio-ok { background: var(--primary-light); color: #0F5F57; }
.vpg-annuncio-ok i { color: var(--primary-dark); }
.vpg-annuncio-errore { background: #FEF3F2; color: #912018; }

.vpg-invito {
  background: #fff; border: 1px solid var(--border-color); border-left: 4px solid var(--primary);
  border-radius: 16px; padding: 20px; box-shadow: var(--shadow); display: grid; gap: 10px; margin-bottom: 20px;
}
.vpg-invito-fatto { padding: 14px 16px; }
.vpg-invito-occhiello { margin: 0; color: var(--primary-dark); font-size: 0.75rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.vpg-invito-titolo { margin: 0; font-size: 1.25rem; line-height: 1.35; font-weight: 700; color: var(--text-dark); }
.vpg-invito-testo { margin: 0; color: var(--text-mid); font-size: 0.9375rem; line-height: 1.6; }
.vpg-invito-btn { justify-self: start; }
.vpg-invito-piccolo { margin: 0; color: var(--text-light); font-size: 0.8125rem; }
.vpg-invito-nota { margin: 0; color: var(--text-mid); font-size: 0.9375rem; display: flex; gap: 8px; align-items: baseline; }
.vpg-invito-nota i { color: var(--primary-dark); }

@media (max-width: 520px) {
  .vpg-riga-testa > .vpg-btn, .vpg-reinvio .vpg-btn, .vpg-invito-btn { width: 100%; justify-self: stretch; }
  .vpg-azioni .vpg-btn { flex: 1 1 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .vpb-pagina *, .vpg *, .vpg-invito * { transition: none !important; }
  .vpb-pagina .fa-spin { animation: none; }
}
`;
}
