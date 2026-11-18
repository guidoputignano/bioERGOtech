import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { googleCalendarUrl, icsUrl } from "@/lib/eventi/calendario";
import { eventoAdminClient } from "@/lib/eventi/evento-server";
import { caricaClasse, postiClassi, pulisciCodiceClasse } from "@/lib/eventi/classi-server";
import {
  PAGINA_CLASSI,
  descriviPersone,
  isCodiceClasse,
  urlClasse,
  type GiornataClasse,
  type PrenotazioneClasse,
} from "@/lib/eventi/classi";
import {
  ARCHIVE_MODE,
  CLASSI_PRIMA_DI_PARTIRE,
  EVENT,
  EVENT_SLUG,
  SESSIONS,
  sessionBySlug,
  type EventSession,
} from "../../content";
import { STILE_MODULO } from "../../modulo-utils";
import { STILE_MODULO_CLASSI } from "../../classi/stile";
import { laClasse, persone } from "../../classi/classi-utils";
import { GestisciClasse, StampaClasse, type GiornataGestibileClasse } from "./GestisciClasse";
import { STILE_CLASSE } from "./stile";

/**
 * La pagina di una classe prenotata: scuola, classe, docente, quante
 * persone, il QR e il codice per entrare insieme, e le giornate con data,
 * orario, luogo, stato e settore (se lo staff l'ha deciso). In fondo,
 * "Gestisci": cambiare i numeri, annullare o aggiungere una giornata, farsi
 * rimandare l'email.
 *
 * L'indirizzo /eventi/vivere-piu-a-lungo/classe/<codice> è nelle email: il
 * codice fa da chiave, quindi la pagina non va indicizzata, non passa
 * l'indirizzo ai siti esterni ed è esclusa da Analytics e Ads
 * (components/cookie-banner.tsx).
 *
 * Stampa: restano QR, classe, codice e giornate; navbar, footer, pulsanti e
 * Gestisci spariscono.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "La prenotazione della classe",
  description: `La prenotazione della classe per ${EVENT.titolo}.`,
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  // Il codice è nell'indirizzo: ai siti esterni (mappe, calendario) non lo si passa.
  referrer: "same-origin",
};

const PAGINA_EVENTO = `/eventi/${EVENT_SLUG}`;

const oraRoma = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" });

const maiuscola = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Una giornata della classe con la sua sessione: solo quelle che il sito conosce. */
type GiornataMostrata = { g: GiornataClasse; s: EventSession };

type Stato =
  | { tipo: "ok"; p: PrenotazioneClasse; rimanenti: Record<string, number> }
  | { tipo: "non_trovato" }
  | { tipo: "errore" };

async function carica(codice: string): Promise<Stato> {
  // Un indirizzo che non ha la forma di un codice di classe non va nemmeno al database.
  if (!isCodiceClasse(codice)) return { tipo: "non_trovato" };
  const client = eventoAdminClient();
  if (!client) {
    console.error("Pagina della classe: configurazione Supabase mancante (URL o service role).");
    return { tipo: "errore" };
  }
  let p: PrenotazioneClasse | null;
  try {
    p = await caricaClasse(client, { codice });
  } catch (err) {
    console.error("Pagina della classe: lettura non riuscita:", err instanceof Error ? err.message : err);
    return { tipo: "errore" };
  }
  if (!p) return { tipo: "non_trovato" };
  // I posti servono solo all'etichetta di "Aggiungi": senza, la pagina si vede lo stesso.
  const rimanenti: Record<string, number> = {};
  try {
    for (const r of await postiClassi(client)) rimanenti[r.slug] = r.rimanenti_classi;
  } catch (err) {
    console.error("Pagina della classe: posti per le classi non letti:", err instanceof Error ? err.message : err);
  }
  return { tipo: "ok", p, rimanenti };
}

export default async function PaginaClasse({
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
  // Maiuscolo, senza spazi, con il trattino rimesso se si è perso copiando
  // il link ("vpc abcd2345"); stringa vuota se non ha la forma di un codice.
  const codice = pulisciCodiceClasse(grezzo);
  const primo = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  // "1": la classe aveva posti confermati; "attesa": era solo in lista d'attesa.
  const annullataDa = primo(query.annullata);
  const annullata = annullataDa === "1" || annullataDa === "attesa";

  const stato = await carica(codice);

  const linkProgramma = (principale: boolean) => (
    <Link href={PAGINA_EVENTO} className={`${principale ? "btn-primary" : "btn-outline"} vcl-btn`}>
      {principale && <i className="fas fa-calendar-days" aria-hidden="true" />}{" "}Il programma dell&apos;evento
    </Link>
  );

  return (
    <>
      <Navbar />
      <main className="vcl-pagina">
        <style>{STILE_CLASSE}</style>
        <style>{STILE_MODULO}</style>
        <style>{STILE_MODULO_CLASSI}</style>
        <div className="vcl-contenitore">
          {stato.tipo === "ok" ? (
            <Classe p={stato.p} rimanenti={stato.rimanenti} />
          ) : stato.tipo === "errore" ? (
            <Avviso
              icona="fa-plug-circle-exclamation"
              titolo="La prenotazione non si carica"
              testo={
                // Il codice si ripete solo se ha la forma giusta.
                isCodiceClasse(codice)
                  ? `In questo momento non riusciamo a leggere la prenotazione. Riprova tra qualche minuto. All'ingresso basta comunque il codice della classe: ${codice}.`
                  : "In questo momento non riusciamo a leggere la prenotazione. Riprova tra qualche minuto."
              }
            >
              <a href={urlClasse(codice)} className="btn-primary vcl-btn">
                <i className="fas fa-rotate-right" aria-hidden="true" /> Riprova
              </a>
              <a href="mailto:info@bioergotech.org" className="btn-outline vcl-btn">
                <i className="fas fa-envelope" aria-hidden="true" /> Scrivici
              </a>
            </Avviso>
          ) : annullata ? (
            <Avviso
              icona="fa-circle-check"
              titolo="Prenotazione annullata"
              testo={
                annullataDa === "attesa"
                  ? ARCHIVE_MODE
                    ? "La classe non è più in lista d'attesa."
                    : "La classe non è più in lista d'attesa. Se cambi idea puoi prenotare di nuovo."
                  : ARCHIVE_MODE
                    ? "Hai liberato i posti della classe: grazie."
                    : "Hai liberato i posti della classe: grazie, così possono partecipare altre persone. Se cambi idea puoi prenotare di nuovo, finché ci sono posti."
              }
              stato
            >
              {ARCHIVE_MODE ? (
                linkProgramma(true)
              ) : (
                <>
                  <Link href={PAGINA_CLASSI} className="btn-primary vcl-btn">
                    <i className="fas fa-school" aria-hidden="true" /> Prenota di nuovo
                  </Link>
                  {linkProgramma(false)}
                </>
              )}
            </Avviso>
          ) : (
            <Avviso
              icona="fa-school"
              titolo="Prenotazione non trovata"
              testo={
                ARCHIVE_MODE
                  ? "Il link potrebbe essere incompleto: apri di nuovo quello dell'email, senza modificarlo. Per qualsiasi necessità scrivi a info@bioergotech.org."
                  : "Il link potrebbe essere incompleto: apri di nuovo quello dell'email, senza modificarlo. Se non trovi l'email, prenota di nuovo con la stessa email e con scuola e classe scritte allo stesso modo: non si crea un doppione, e ti rimandiamo la prenotazione."
              }
            >
              {ARCHIVE_MODE ? (
                linkProgramma(true)
              ) : (
                <Link href={PAGINA_CLASSI} className="btn-primary vcl-btn">
                  <i className="fas fa-school" aria-hidden="true" />{" "}Vai alla prenotazione per le classi
                </Link>
              )}
              <a href="mailto:info@bioergotech.org" className="btn-outline vcl-btn">
                <i className="fas fa-envelope" aria-hidden="true" /> Scrivici
              </a>
            </Avviso>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

/* ── La classe ───────────────────────────────────────────────────────── */

function Classe({ p, rimanenti }: { p: PrenotazioneClasse; rimanenti: Record<string, number> }) {
  const adesso = Date.now();
  const giornate: GiornataMostrata[] = p.giornate
    .map((g) => ({ g, s: sessionBySlug(g.slug) }))
    .filter((x): x is GiornataMostrata => Boolean(x.s));
  const iniziate = SESSIONS.filter((s) => adesso >= Date.parse(s.inizioISO)).map((s) => s.slug as string);
  const finite = new Set(SESSIONS.filter((s) => adesso >= Date.parse(s.fineISO)).map((s) => s.slug as string));
  const tutteInAttesa = giornate.length > 0 && giornate.every((x) => x.g.status === "lista_attesa");
  const gestibili: GiornataGestibileClasse[] = giornate.map(({ g }) => ({
    slug: g.slug,
    status: g.status,
    entrata: g.presenti !== null,
  }));
  const docente = `${p.docente_nome} ${p.docente_cognome}`.trim();
  const qr = `/api/eventi/qr/${encodeURIComponent(p.codice)}`;

  return (
    <>
      <article className="vcl-biglietto" aria-labelledby="vcl-nome">
        <header className="vcl-testa">
          <p className="vcl-occhiello">{EVENT.organizzatore}</p>
          <p className="vcl-evento">{EVENT.titolo}</p>
          <p className="vcl-quando">
            {EVENT.dataLabel}, {EVENT.citta}. Ingresso gratuito.
          </p>
        </header>

        <div className="vcl-corpo">
          <p className="vcl-etichetta">Prenotazione per la classe</p>
          <h1 id="vcl-nome" className="vcl-nome">
            {laClasse(p.classe, true)}
          </h1>
          <p className="vcl-scuola">
            {p.istituto}
            {p.comune ? `, ${p.comune}` : ""}
          </p>

          <dl className="vcl-fatti">
            <div className="vcl-fatto">
              <dt>Docente</dt>
              <dd>{docente}</dd>
            </div>
            <div className="vcl-fatto">
              <dt>Persone</dt>
              <dd>
                {descriviPersone(p.studenti, p.accompagnatori)}, {persone(p.posti)} in tutto
              </dd>
            </div>
          </dl>

          {tutteInAttesa && (
            <p className="vcl-nota vcl-nota-attesa">
              <i className="fas fa-hourglass-half" aria-hidden="true" />
              <span>
                La classe è in lista d&apos;attesa: il QR vale per l&apos;ingresso solo se si liberano posti per tutta la
                classe. In quel caso ti scriviamo noi.
              </span>
            </p>
          )}

          <div className="vcl-qr">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt={`QR code della classe, codice ${p.codice}`} width={240} height={240} decoding="async" />
          </div>
          <p className="vcl-codice-etichetta" id="vcl-codice-etichetta">
            Codice della classe
          </p>
          <p className="vcl-codice" aria-describedby="vcl-codice-etichetta">
            {p.codice}
          </p>
          <p className="vcl-aiuto">
            {tutteInAttesa ? (
              <strong>Il QR vale per l&apos;ingresso solo se la classe viene confermata.</strong>
            ) : (
              <>
                <strong>Mostra questo QR all&apos;ingresso: la classe entra insieme.</strong> Dal telefono o stampato; se
                non si legge, basta il codice.
              </>
            )}
          </p>
        </div>

        <div className="vcl-strappo" aria-hidden="true" />

        <section className="vcl-giornate" aria-labelledby="vcl-giornate-titolo">
          <h2 id="vcl-giornate-titolo" className="vcl-giornate-titolo">
            {giornate.length > 1 ? "Le giornate della classe" : "La giornata della classe"}
          </h2>
          {giornate.length === 0 ? (
            <p className="vcl-nota">
              <i className="fas fa-circle-info" aria-hidden="true" />
              {ARCHIVE_MODE ? (
                <span>Nella prenotazione non c&apos;è nessuna giornata.</span>
              ) : (
                <span>
                  Nella prenotazione non c&apos;è nessuna giornata. Puoi aggiungerne una qui sotto, nella sezione{" "}
                  <a href="#gestisci">Gestisci</a>.
                </span>
              )}
            </p>
          ) : (
            <ul className="vcl-elenco">
              {giornate.map(({ g, s }) => (
                <SchedaGiornata
                  key={g.id}
                  g={g}
                  s={s}
                  codice={p.codice}
                  postiClasse={p.posti}
                  finita={finite.has(s.slug)}
                />
              ))}
            </ul>
          )}
        </section>

        {!tutteInAttesa && (
          <p className="vcl-nota vcl-partire">
            <i className="fas fa-bus" aria-hidden="true" />
            <span>{CLASSI_PRIMA_DI_PARTIRE}</span>
          </p>
        )}
      </article>

      <div className="vcl-azioni no-print">
        <StampaClasse />
        <Link href={PAGINA_EVENTO} className="vcl-link">
          Il programma dell&apos;evento <i className="fas fa-arrow-right" aria-hidden="true" />
        </Link>
      </div>

      <section id="gestisci" className="vcl-gestisci no-print" aria-labelledby="vcl-gestisci-titolo">
        <h2 id="vcl-gestisci-titolo" className="vcl-gestisci-titolo">
          <span className="icon-circle icon-circle-primary vcl-gestisci-icona" aria-hidden="true">
            <i className="fas fa-sliders" />
          </span>{" "}
          Gestisci la prenotazione
        </h2>
        <p className="vcl-gestisci-testo">
          {ARCHIVE_MODE
            ? "L'evento si è concluso: la prenotazione non si può più modificare."
            : "Cambia il numero di persone, annulla o aggiungi una giornata, o fatti rimandare l'email. Se liberi dei posti, li diamo a chi è in lista d'attesa."}
        </p>
        <GestisciClasse
          codice={p.codice}
          giornate={gestibili}
          studenti={p.studenti}
          accompagnatori={p.accompagnatori}
          rimanenti={rimanenti}
          iniziate={iniziate}
          archivio={ARCHIVE_MODE}
        />
      </section>

      <p className="vcl-contatti no-print">
        Hai bisogno di aiuto? Scrivi a <a href="mailto:info@bioergotech.org">info@bioergotech.org</a>.
      </p>
    </>
  );
}

function SchedaGiornata({
  g,
  s,
  codice,
  postiClasse,
  finita,
}: {
  g: GiornataClasse;
  s: EventSession;
  codice: string;
  postiClasse: number;
  finita: boolean;
}) {
  const entrata = g.presenti !== null;
  const attesa = g.status === "lista_attesa";
  const ora = entrata && g.checkin_ts ? oraRoma.format(new Date(g.checkin_ts)) : null;
  const settore = g.settore?.trim() || null;

  return (
    <li className="vcl-giornata">
      <div className="vcl-giornata-testa">
        <h3 className="vcl-giornata-data">{s.giornoLabel}</h3>
        {entrata ? (
          <span className="vcl-stato vcl-stato-presente">
            <i className="fas fa-door-open" aria-hidden="true" />
            {`Entrati ${g.presenti} di ${postiClasse}${ora ? `, alle ${ora}` : ""}`}
          </span>
        ) : attesa ? (
          <span className="vcl-stato vcl-stato-attesa">
            <i className="fas fa-hourglass-half" aria-hidden="true" />{" "}
            In lista d&apos;attesa
          </span>
        ) : (
          <span className="vcl-stato vcl-stato-ok">
            <i className="fas fa-circle-check" aria-hidden="true" />{" "}
            Confermata
          </span>
        )}
      </div>
      <p className="vcl-giornata-titolo">{s.titolo}</p>
      <ul className="vcl-dettagli">
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
        {settore && (
          <li>
            <i className="fas fa-chair" aria-hidden="true" />
            <span>
              Settore: <span className="vcl-settore">{settore}</span>
            </span>
          </li>
        )}
      </ul>
      {attesa && !entrata && (
        <p className="vcl-giornata-nota">
          Al momento non ci sono abbastanza posti per tutta la classe: se si liberano, ti scriviamo noi.
        </p>
      )}
      {!attesa && !entrata && !finita && (
        <div className="vcl-calendario no-print">
          <span className="vcl-calendario-etichetta">Aggiungi al calendario</span>
          <a href={googleCalendarUrl(s, codice)} target="_blank" rel="noopener noreferrer" className="vcl-pill">
            <i className="fab fa-google" aria-hidden="true" /> Google<span className="sr-only"> Calendar, {s.etichetta} (si apre in una nuova scheda)</span>
          </a>
          {/* Con il codice: il calendario punta alla pagina della classe (lib/eventi/calendario.ts). */}
          <a href={icsUrl([s.slug], codice, false)} className="vcl-pill" download>
            <i className="fas fa-calendar-plus" aria-hidden="true" /> Apple, Outlook<span className="sr-only">, file del calendario per {s.etichetta}</span>
          </a>
        </div>
      )}
    </li>
  );
}

/* ── Gli stati senza prenotazione: non trovata, annullata, errore ────── */

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
    <div className="vcl-avviso" role={stato ? "status" : undefined}>
      <span className="icon-circle icon-circle-primary vcl-avviso-icona" aria-hidden="true">
        <i className={`fas ${icona}`} />
      </span>
      <h1 className="vcl-avviso-titolo">{titolo}</h1>
      <p className="vcl-avviso-testo">{testo}</p>
      <div className="vcl-avviso-azioni">{children}</div>
    </div>
  );
}
