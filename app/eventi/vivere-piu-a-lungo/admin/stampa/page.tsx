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
  confrontaPerCognome,
  dataOraRoma,
  normalizza,
  oraRoma,
  urlStampa,
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
 * lista d'attesa. Solo staff (requireAdmin): elenca dati personali.
 */

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
  const sessione = sessionBySlug(slug);
  const qui = sessione ? urlStampa(sessione.slug) : PERCORSO_STAMPA;

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

  const iniziale = (r: RigaIscritto) => normalizza(r.cognome).charAt(0).toUpperCase() || "#";
  const adesso = new Date();
  const giornoStampa = dataOraRoma(adesso).split(" ")[0];
  const oraStampa = oraRoma(adesso);

  return (
    <Cornice>
      <div className="stp-barra no-print">
        <Link href={`${PERCORSO_PANNELLO}?tab=iscritti&giornata=${sessione.slug}`} className="eva-btn-link">
          <i className="fas fa-arrow-left" aria-hidden="true" />
          Torna al pannello
        </Link>
        <nav className="stp-scelta" aria-label="Giornata e contenuto della lista">
          {SESSIONS.map((s) => (
            <Link
              key={s.slug}
              href={`${urlStampa(s.slug)}${soloConfermati ? "&solo=confermati" : ""}`}
              aria-current={s.slug === sessione.slug ? "true" : undefined}
            >
              {s.etichetta}
            </Link>
          ))}
          <Link href={urlStampa(sessione.slug)} aria-current={!soloConfermati ? "true" : undefined}>
            Con la lista d&apos;attesa
          </Link>
          <Link href={`${urlStampa(sessione.slug)}&solo=confermati`} aria-current={soloConfermati ? "true" : undefined}>
            Solo confermati
          </Link>
        </nav>
        <PannelloStampaPulsante />
      </div>

      <article className="stp-foglio">
        <header>
          <p className="stp-kicker">{NOME_EVENTO}, lista per la porta</p>
          <h1 className="stp-titolo">
            {sessione.giornoLabel} {sessione.dataISO.slice(0, 4)}
          </h1>
          <p className="stp-luogo">
            {sessione.luogo}, {sessione.orario}
          </p>
          <dl className="stp-conti">
            <div>
              <dt>Confermati</dt>
              <dd>{info.confermati}</dd>
            </div>
            <div>
              <dt>Lista d&apos;attesa</dt>
              <dd>{info.attesa}</dd>
            </div>
            <div>
              <dt>Capienza</dt>
              <dd>{info.capienza ?? "non nel database"}</dd>
            </div>
            <div>
              <dt>Già entrati</dt>
              <dd>{info.entrati}</dd>
            </div>
            <div>
              <dt>In questa lista</dt>
              <dd>{righe.length}</dd>
            </div>
          </dl>
          <p className="stp-nota">
            In ordine di cognome.{" "}
            {soloConfermati
              ? "Solo i posti confermati."
              : "Chi è in lista d'attesa è segnato: entra solo se ci sono posti."}{" "}
            Stampata il {giornoStampa} alle {oraStampa}: chi si iscrive dopo non compare.
          </p>
        </header>

        {righe.length === 0 ? (
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
                  <th scope="col">Codice</th>
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
                      <td className="stp-cod">{r.codice}</td>
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

        <p className="stp-piede">
          {EVENT.organizzatore}. Documento interno con dati personali: non lasciarlo incustodito e distruggilo dopo
          l&apos;evento.
        </p>
      </article>
    </Cornice>
  );
}
