import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { EVENT, SESSIONS, categoriaLabel, giornateConArticolo, sessionBySlug } from "../../content";
import { caricaDatiPannello, type DatiPannello } from "../PannelloDati";
import {
  PERCORSO_PANNELLO,
  PERCORSO_STAMPA,
  confrontaClassiPerScuola,
  confrontaPerCognome,
  dataOraRoma,
  normalizza,
  oraRoma,
  urlStampa,
  type GiornataRigaClasse,
  type RigaClasse,
  type RigaIscritto,
} from "../PannelloComune";
import { STILE_PANNELLO } from "../PannelloStile";
import { PannelloStampaPulsante } from "../PannelloStampaPulsante";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lista per la porta",
  robots: { index: false, follow: false },
};

const NOME_EVENTO = EVENT.titolo.split(":")[0];

/**
 * La lista per la porta: chi è iscritto a una giornata, dalla A alla Z, con
 * una casella da spuntare all'ingresso. Pensata per la carta (A4, intestazione
 * della tabella ripetuta su ogni pagina, niente menu del sito), ma leggibile
 * anche sullo schermo. Chi è già entrato ha la casella già spuntata, così la
 * lista si può ristampare a evento iniziato.
 *
 * ?giornata=giorno-1 sceglie il giorno; &solo=confermati lascia fuori la
 * lista d'attesa; &parte=persone o &parte=classi stampa una sola delle due
 * parti (per esempio per il banco delle scuole). Le classi hanno una sezione
 * loro, in ordine di scuola, con il docente, il telefono, le persone e il
 * settore, se c'è (la colonna compare solo quando almeno una classe della
 * giornata ne ha uno). Solo staff (requireAdmin): elenca dati personali.
 *
 * Del codice del biglietto si stampano solo gli ultimi 4 caratteri: il
 * codice intero apre il biglietto e la sua gestione, e il foglio resta per
 * ore su un tavolo. Per confrontarlo con il telefono bastano quelli; il
 * codice completo resta nel pannello e nel CSV.
 */

/** "…7XQ2": la coda del codice, quanto basta a confrontarlo con il biglietto. */
const codiceBreve = (codice: string) => (codice.length > 4 ? `…${codice.slice(-4)}` : codice);

const STILE_STAMPA = `
.stp { max-width: 1040px; margin: 0 auto; }
.stp-barra { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.stp-scelta { display: inline-flex; flex-wrap: wrap; gap: 6px; }
.stp-scelta a {
  min-height: 44px; display: inline-flex; align-items: center; padding: 0 14px; border-radius: 999px;
  border: 1.5px solid var(--border-color); background: #fff; color: var(--text-mid);
  font-size: 13.5px; font-weight: 600; text-decoration: none;
}
.stp-scelta a[aria-current="true"] { border-color: var(--primary); background: var(--primary-light); color: var(--text-dark); }
.stp-foglio { background: #fff; border: 1px solid var(--border-color); border-radius: 16px; padding: 20px; box-shadow: 0 2px 10px rgba(26,35,50,.05); }
@media (min-width: 768px) { .stp-foglio { padding: 32px 36px; } }
.stp-kicker { font-size: 11.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #0F766E; margin: 0; }
.stp-titolo { font-size: 26px; font-weight: 800; color: var(--text-dark); margin: 4px 0 2px; line-height: 1.2; }
.stp-luogo { font-size: 15px; color: var(--text-mid); margin: 0; }
.stp-conti { display: flex; flex-wrap: wrap; gap: 8px 28px; margin: 16px 0 6px; padding: 12px 0; border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); }
.stp-conti div { display: flex; align-items: baseline; gap: 8px; }
.stp-conti dt { font-size: 13px; color: var(--text-mid); font-weight: 600; }
.stp-conti dd { margin: 0; font-size: 20px; font-weight: 800; color: var(--text-dark); font-variant-numeric: tabular-nums; }
.stp-nota { font-size: 12.5px; color: var(--text-mid); margin: 8px 0 16px; }
.stp-scorri { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.stp-tabella { width: 100%; border-collapse: collapse; font-size: 14px; }
.stp-tabella thead th {
  text-align: left; font-size: 11px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase;
  color: var(--text-mid); padding: 8px 8px; border-bottom: 2px solid var(--text-dark); white-space: nowrap; background: #fff;
}
.stp-tabella td { padding: 8px 8px; border-bottom: 1px solid #E5E9F0; vertical-align: middle; }
.stp-tabella .stp-n { color: var(--text-light); font-size: 12px; font-variant-numeric: tabular-nums; width: 1%; white-space: nowrap; }
.stp-tabella .stp-chi { font-weight: 600; color: var(--text-dark); min-width: 170px; }
.stp-tabella .stp-chi strong { font-weight: 800; text-transform: uppercase; letter-spacing: .01em; }
.stp-tabella .stp-cod { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; white-space: nowrap; }
.stp-tabella .stp-min { color: var(--text-mid); font-size: 13px; }
.stp-casella {
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; border: 1.5px solid var(--text-dark); border-radius: 3px; font-size: 11px; color: var(--text-dark);
}
.stp-attesa { display: inline-block; font-size: 11.5px; font-weight: 700; color: #92400E; background: #FEF3C7; border: 1px solid #F3D58A; border-radius: 999px; padding: 1px 8px; white-space: nowrap; }
.stp-riga-attesa td { background: #FFFBEB; }
.stp-lettera th {
  text-align: left; font-size: 13px; font-weight: 800; color: #0F766E; padding: 12px 8px 4px; border-bottom: 1px solid var(--border-color);
}
.stp-piede { margin-top: 18px; font-size: 11.5px; color: var(--text-light); }
.stp-sezione { margin-top: 28px; }
.stp-sezione-titolo { font-size: 19px; font-weight: 800; color: var(--text-dark); margin: 4px 0 8px; }
.stp-tabella .stp-sotto { display: block; font-size: 12px; font-weight: 500; color: var(--text-mid); }
.stp-tabella .stp-tel { white-space: nowrap; font-variant-numeric: tabular-nums; }
.stp-tabella .stp-num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; font-weight: 700; }
.stp-settore { font-weight: 700; color: var(--text-dark); }
.stp-vuoto { padding: 28px 0; text-align: center; color: var(--text-mid); }

@media print {
  @page { size: A4 portrait; margin: 12mm 10mm 14mm; }
  @page { @bottom-center { content: "Pagina " counter(page) " di " counter(pages); font-size: 8pt; color: #555; } }
  html, body { background: #fff !important; }
  .stp-pagina { padding: 0 !important; min-height: 0 !important; background: #fff !important; }
  .stp-pagina > .container { padding: 0 !important; max-width: none !important; }
  .stp { max-width: none; }
  .stp-foglio { border: 0; box-shadow: none; padding: 0; border-radius: 0; }
  .stp-scorri { overflow: visible; }
  .stp-titolo { font-size: 17pt; }
  .stp-luogo { font-size: 10.5pt; }
  .stp-conti { margin: 8pt 0 4pt; padding: 6pt 0; }
  .stp-conti dd { font-size: 13pt; }
  .stp-conti dt, .stp-nota { font-size: 8.5pt; }
  .stp-nota { margin: 4pt 0 8pt; }
  .stp-tabella { font-size: 9.5pt; }
  .stp-tabella thead { display: table-header-group; }
  .stp-tabella tr { break-inside: avoid; page-break-inside: avoid; }
  .stp-tabella td { padding: 4pt 5pt; }
  .stp-tabella thead th { padding: 4pt 5pt; font-size: 7.5pt; color: #000; }
  .stp-tabella .stp-chi { min-width: 0; }
  .stp-lettera th { padding: 6pt 5pt 2pt; font-size: 9pt; color: #000; break-after: avoid; page-break-after: avoid; }
  .stp-riga-attesa td { background: none; }
  .stp-attesa { background: none; border-color: #000; color: #000; }
  .stp-casella { width: 12pt; height: 12pt; border-color: #000; }
  .stp-piede { font-size: 7.5pt; }
  .stp-sezione { margin-top: 0; }
  .stp-sezione-nuova-pagina { break-before: page; page-break-before: always; }
  .stp-sezione-titolo { font-size: 14pt; }
  .stp-tabella .stp-sotto { font-size: 8pt; }
  a { color: inherit !important; text-decoration: none !important; }
}
`;

function Cornice({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{STILE_PANNELLO + STILE_STAMPA}</style>
      <div className="no-print">
        <Navbar />
      </div>
      <div className="bg-light-gray stp-pagina" style={{ paddingTop: "90px", minHeight: "80vh" }}>
        <div className="container mx-auto px-4 md:px-6 py-8">
          <div className="eva stp">{children}</div>
        </div>
      </div>
      <div className="no-print">
        <SiteFooter />
      </div>
    </>
  );
}

function Messaggio({ titolo, testo, children }: { titolo: string; testo: string; children?: ReactNode }) {
  return (
    <Cornice>
      <div className="card max-w-md mx-auto text-center" style={{ marginTop: 24 }}>
        <span className="icon-circle icon-circle-primary" style={{ width: 56, height: 56, margin: "0 auto" }}>
          <i className="fas fa-print text-2xl" aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-bold text-gray-800 mt-5 mb-2">{titolo}</h1>
        <p className="text-gray-600 mb-6">{testo}</p>
        <div className="flex flex-col gap-3">{children}</div>
      </div>
    </Cornice>
  );
}

export default async function StampaListaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const primo = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const slug = primo(params.giornata);
  const soloConfermati = primo(params.solo) === "confermati";
  const parteLetta = primo(params.parte);
  const parte: Parte = parteLetta === "persone" || parteLetta === "classi" ? parteLetta : "";
  const sessione = sessionBySlug(slug);
  const qui = sessione ? urlStampa(sessione.slug) : PERCORSO_STAMPA;
  /** L'indirizzo di questa lista con una scelta cambiata. */
  const link = (o: { slug?: string; solo?: boolean; parte?: Parte }) => {
    const s2 = o.slug ?? sessione?.slug ?? "";
    const solo = o.solo ?? soloConfermati;
    const p2 = o.parte ?? parte;
    return `${urlStampa(s2)}${solo ? "&solo=confermati" : ""}${p2 ? `&parte=${p2}` : ""}`;
  };

  const guardia = await requireAdmin();
  if (guardia.error !== null) {
    if (guardia.status === 401 || guardia.status === 403) {
      return (
        <Messaggio
          titolo="Accesso riservato"
          testo="La lista per la porta contiene dati personali: è riservata allo staff della Fondazione."
        >
          <Link href={`/auth/login?returnTo=${encodeURIComponent(qui)}`} className="btn-primary">
            {guardia.status === 403 ? "Accedi con un altro account" : "Accedi"}
          </Link>
        </Messaggio>
      );
    }
    return (
      <Messaggio
        titolo="Lista non disponibile"
        testo="Il server non è configurato per leggere le iscrizioni. Avvisa chi gestisce il sito."
      />
    );
  }

  if (!sessione) {
    return (
      <Messaggio titolo="Quale giornata?" testo="Scegli la giornata di cui stampare la lista per la porta.">
        {SESSIONS.map((s) => (
          <Link key={s.slug} href={urlStampa(s.slug)} className="btn-outline">
            {s.giornoLabel}, {s.luogoBreve}
          </Link>
        ))}
      </Messaggio>
    );
  }

  let dati: DatiPannello;
  try {
    dati = await caricaDatiPannello(guardia.client);
  } catch (err) {
    console.error("[eventi/admin/stampa]", err instanceof Error ? err.message : err);
    return (
      <Messaggio
        titolo="Lista non disponibile"
        testo="Non riesco a leggere le iscrizioni dal database. Riprova tra poco ricaricando la pagina."
      >
        <Link href={qui} className="btn-primary">
          Riprova
        </Link>
      </Messaggio>
    );
  }

  const art = giornateConArticolo([sessione.slug]);
  if (dati.mancanti.includes(sessione.slug)) {
    return (
      <Messaggio
        titolo="Giornata non nel database"
        testo={`${art.charAt(0).toUpperCase()}${art.slice(1)} non esiste nel database: non c'è una lista da stampare. Il Riepilogo del pannello spiega come sistemarlo.`}
      >
        <Link href={PERCORSO_PANNELLO} className="btn-primary">
          Torna al pannello
        </Link>
      </Messaggio>
    );
  }

  const info = dati.giornate.find((g) => g.slug === sessione.slug)!;
  const righe: { r: RigaIscritto; g: RigaIscritto["giornate"][number] }[] = dati.iscritti
    .map((r) => ({ r, g: r.giornate.find((x) => x.slug === sessione.slug) }))
    .filter((x): x is { r: RigaIscritto; g: RigaIscritto["giornate"][number] } => Boolean(x.g))
    .filter((x) => !soloConfermati || x.g.status === "confermato")
    .sort((a, b) => confrontaPerCognome(a.r, b.r));

  const classi: { c: RigaClasse; g: GiornataRigaClasse }[] = dati.classi.classi
    .map((c) => ({ c, g: c.giornate.find((x) => x.slug === sessione.slug) }))
    .filter((x): x is { c: RigaClasse; g: GiornataRigaClasse } => Boolean(x.g))
    .filter((x) => !soloConfermati || x.g.status === "confermato")
    .sort((a, b) => confrontaClassiPerScuola(a.c, b.c));
  const gc = info.classi;
  const conPersone = parte !== "classi";
  const conClassi = parte !== "persone";

  const iniziale = (r: RigaIscritto) => normalizza(r.cognome).charAt(0).toUpperCase() || "#";
  const adesso = new Date();
  const giornoStampa = dataOraRoma(adesso).split(" ")[0];
  const oraStampa = oraRoma(adesso);

  return (
    <Cornice>
      <div className="stp-barra no-print">
        <Link
          href={`${PERCORSO_PANNELLO}?tab=${parte === "classi" ? "classi" : "iscritti"}&giornata=${sessione.slug}`}
          className="eva-btn-link"
        >
          <i className="fas fa-arrow-left" aria-hidden="true" />{" "}
          Torna al pannello
        </Link>
        <nav className="stp-scelta" aria-label="Giornata e contenuto della lista">
          {SESSIONS.map((s) => (
            <Link key={s.slug} href={link({ slug: s.slug })} aria-current={s.slug === sessione.slug ? "true" : undefined}>
              {s.etichetta}
            </Link>
          ))}
          <Link href={link({ solo: false })} aria-current={!soloConfermati ? "true" : undefined}>
            Con la lista d&apos;attesa
          </Link>
          <Link href={link({ solo: true })} aria-current={soloConfermati ? "true" : undefined}>
            Solo confermati
          </Link>
          <Link href={link({ parte: "" })} aria-current={parte === "" ? "true" : undefined}>
            Persone e classi
          </Link>
          <Link href={link({ parte: "persone" })} aria-current={parte === "persone" ? "true" : undefined}>
            Solo persone
          </Link>
          <Link href={link({ parte: "classi" })} aria-current={parte === "classi" ? "true" : undefined}>
            Solo classi
          </Link>
        </nav>
        <PannelloStampaPulsante />
      </div>

      <article className="stp-foglio">
        <header>
          <p className="stp-kicker">
            {NOME_EVENTO}, {parte === "classi" ? "classi per la porta" : "lista per la porta"}
          </p>
          <h1 className="stp-titolo">
            {sessione.giornoLabel} {sessione.dataISO.slice(0, 4)}
          </h1>
          <p className="stp-luogo">
            {sessione.luogo}, {sessione.orario}
          </p>
          <dl className="stp-conti">
            <div>
              <dt>Posti occupati</dt>
              <dd>{info.confermati}</dd>
            </div>
            <div>
              <dt>Capienza</dt>
              <dd>{info.capienza ?? "non nel database"}</dd>
            </div>
            {conPersone && (
              <>
                <div>
                  <dt>Persone confermate</dt>
                  <dd>{info.persone}</dd>
                </div>
                <div>
                  <dt>Persone in attesa</dt>
                  <dd>{info.attesa}</dd>
                </div>
              </>
            )}
            {conClassi && gc && (
              <>
                <div>
                  <dt>Classi confermate</dt>
                  <dd>
                    {gc.classiConfermate} <small style={{ fontSize: "0.6em", fontWeight: 600 }}>({gc.postiClassi} persone)</small>
                  </dd>
                </div>
                {gc.classiAttesa > 0 && (
                  <div>
                    <dt>Classi in attesa</dt>
                    <dd>{gc.classiAttesa}</dd>
                  </div>
                )}
              </>
            )}
            <div>
              <dt>Già entrati</dt>
              <dd>{parte === "persone" ? info.entratiPersone : parte === "classi" ? (gc?.presenti ?? 0) : info.entrati}</dd>
            </div>
          </dl>
          <p className="stp-nota">
            {conPersone && "Le persone in ordine di cognome. "}
            {conClassi && "Le classi in ordine di scuola. "}
            {soloConfermati
              ? "Solo i posti confermati."
              : "Chi è in lista d'attesa è segnato: entra solo se ci sono posti."}{" "}
            Dei codici ci sono solo gli ultimi 4 caratteri. Stampata il {giornoStampa} alle {oraStampa}: chi si
            iscrive o prenota dopo non compare.
          </p>
        </header>

        {conPersone && <h2 className="stp-sezione-titolo">Persone ({righe.length})</h2>}
        {!conPersone ? null : righe.length === 0 ? (
          <p className="stp-vuoto">Nessuna persona iscritta {art}.</p>
        ) : (
          <div className="stp-scorri">
            <table className="stp-tabella">
              <thead>
                <tr>
                  <th scope="col" style={{ width: 1 }}>
                    <span className="sr-only">Entrato</span>
                    <span aria-hidden="true">
                      <i className="fas fa-check" />
                    </span>
                  </th>
                  <th scope="col">N.</th>
                  <th scope="col">Cognome e nome</th>
                  <th scope="col">Categoria</th>
                  <th scope="col">Organizzazione, classe</th>
                  <th scope="col">Fine codice</th>
                  <th scope="col">Stato</th>
                </tr>
              </thead>
              <tbody>
                {righe.flatMap(({ r, g }, i) => {
                  const lettera = iniziale(r);
                  const nuovaLettera = i === 0 || iniziale(righe[i - 1].r) !== lettera;
                  const out = [];
                  if (nuovaLettera) {
                    out.push(
                      <tr key={`lettera-${lettera}-${i}`} className="stp-lettera">
                        <th colSpan={7} scope="rowgroup">
                          {lettera}
                        </th>
                      </tr>,
                    );
                  }
                  const entrato = g.stato_checkin === "presente";
                  out.push(
                    <tr key={g.id} className={g.status === "lista_attesa" ? "stp-riga-attesa" : undefined}>
                      <td>
                        <span className="stp-casella" aria-label={entrato ? "Ingresso già registrato" : "Da spuntare"}>
                          {entrato ? <i className="fas fa-check" aria-hidden="true" /> : null}
                        </span>
                      </td>
                      <td className="stp-n">{i + 1}</td>
                      <td className="stp-chi">
                        <strong>{r.cognome.trim()}</strong> {r.nome.trim()}
                      </td>
                      <td className="stp-min">{categoriaLabel(r.categoria)}</td>
                      <td className="stp-min">
                        {[r.organizzazione ?? r.startup_name, r.classe ? `classe ${r.classe}` : null]
                          .filter(Boolean)
                          .join(", ")}
                      </td>
                      <td className="stp-cod">{codiceBreve(r.codice)}</td>
                      <td>
                        {g.status === "lista_attesa" ? (
                          <span className="stp-attesa">
                            Lista d&apos;attesa{g.posizione_attesa ? `, n. ${g.posizione_attesa}` : ""}
                          </span>
                        ) : (
                          <span className="stp-min">Confermato</span>
                        )}
                      </td>
                    </tr>,
                  );
                  return out;
                })}
              </tbody>
            </table>
          </div>
        )}

        {conClassi && (
          <SezioneClassi
            classi={classi}
            disponibili={dati.classi.disponibili}
            art={art}
            nuovaPagina={conPersone && righe.length > 0}
          />
        )}

        <p className="stp-piede">
          {EVENT.organizzatore}. Documento interno con dati personali: non lasciarlo incustodito e distruggilo dopo
          l&apos;evento.
        </p>
      </article>
    </Cornice>
  );
}

type Parte = "" | "persone" | "classi";

/**
 * Le classi della giornata: una riga per classe, con il docente, il telefono
 * e il settore. I settori non si assegnano per forza: senza nessun settore
 * la colonna non c'è, e una classe senza settore ha la casella vuota.
 */
function SezioneClassi({
  classi,
  disponibili,
  art,
  nuovaPagina,
}: {
  classi: { c: RigaClasse; g: GiornataRigaClasse }[];
  disponibili: boolean;
  art: string;
  nuovaPagina: boolean;
}) {
  const persone = classi.reduce((t, x) => t + x.c.posti, 0);
  const conSettore = classi.some((x) => Boolean(x.g.settore));
  return (
    <section className={`stp-sezione${nuovaPagina ? " stp-sezione-nuova-pagina" : ""}`} aria-labelledby="stp-classi">
      <h2 id="stp-classi" className="stp-sezione-titolo">
        Classi ({classi.length}
        {classi.length > 0 ? `, ${persone} persone` : ""})
      </h2>
      <p className="stp-nota">
        Ogni classe entra con un solo QR: segna quante persone entrano. Il docente di riferimento ha il telefono
        accanto al nome.
      </p>
      {!disponibili ? (
        <p className="stp-vuoto">Le prenotazioni per classe non sono nel database.</p>
      ) : classi.length === 0 ? (
        <p className="stp-vuoto">Nessuna classe prenotata {art}.</p>
      ) : (
        <div className="stp-scorri">
          <table className="stp-tabella">
            <thead>
              <tr>
                <th scope="col" style={{ width: 1 }}>
                  <span className="sr-only">Entrata</span>
                  <span aria-hidden="true">
                    <i className="fas fa-check" />
                  </span>
                </th>
                <th scope="col">N.</th>
                <th scope="col">Classe e scuola</th>
                <th scope="col">Docente e telefono</th>
                <th scope="col" style={{ textAlign: "right" }}>
                  Persone
                </th>
                {conSettore && <th scope="col">Settore</th>}
                <th scope="col">Fine codice</th>
                <th scope="col">Stato</th>
              </tr>
            </thead>
            <tbody>
              {classi.map(({ c, g }, i) => {
                const entrata = g.presenti !== null;
                return (
                  <tr key={g.id} className={g.status === "lista_attesa" ? "stp-riga-attesa" : undefined}>
                    <td>
                      <span className="stp-casella" aria-label={entrata ? "Ingresso già registrato" : "Da spuntare"}>
                        {entrata ? <i className="fas fa-check" aria-hidden="true" /> : null}
                      </span>
                    </td>
                    <td className="stp-n">{i + 1}</td>
                    <td className="stp-chi">
                      <strong>{c.classe.trim()}</strong>
                      <span className="stp-sotto">
                        {c.istituto.trim()}
                        {c.comune ? `, ${c.comune.trim()}` : ""}
                      </span>
                    </td>
                    <td className="stp-min">
                      {`${c.docente_cognome.trim()} ${c.docente_nome.trim()}`}
                      <span className="stp-sotto stp-tel">{c.docente_telefono}</span>
                    </td>
                    <td className="stp-num">
                      {c.posti}
                      <span className="stp-sotto">
                        {c.studenti}+{c.accompagnatori}
                        {entrata ? `, entrati ${g.presenti}` : ""}
                      </span>
                    </td>
                    {conSettore && <td>{g.settore ? <span className="stp-settore">{g.settore}</span> : null}</td>}
                    <td className="stp-cod">{codiceBreve(c.codice)}</td>
                    <td>
                      {g.status === "lista_attesa" ? (
                        <span className="stp-attesa">
                          Lista d&apos;attesa{g.posizione_attesa ? `, n. ${g.posizione_attesa}` : ""}
                        </span>
                      ) : (
                        <span className="stp-min">Confermata</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
