import { NextResponse } from "next/server";
import { getEventAdminClient } from "@/lib/eventi/admin-guard";
import { SESSIONS, categoriaLabel, giornateConArticolo, sessionBySlug } from "@/app/eventi/vivere-piu-a-lungo/content";
import { caricaDatiPannello } from "@/app/eventi/vivere-piu-a-lungo/admin/PannelloDati";
import {
  confrontaPerCognome,
  dataOraRoma,
  filtraIscritti,
  giornoRoma,
  leggiFiltri,
  type GiornataRiga,
  type RigaIscritto,
} from "@/app/eventi/vivere-piu-a-lungo/admin/PannelloComune";

export const dynamic = "force-dynamic";

/** Il separatore di Excel in italiano: con la virgola aprirebbe tutto in una colonna. */
const SEP = ";";

/** Un valore che è solo un numero di telefono internazionale: "+39 333 123 4567", "+39 (080) 12.34". */
const SOLO_TELEFONO = /^\+[\d\s().\/-]+$/;

/**
 * Una cella CSV (RFC 4180): tra virgolette, con le virgolette raddoppiate.
 * Un testo scritto da chi si iscrive che comincia con = + - @ diventerebbe
 * una formula in Excel: gli si mette davanti un apostrofo. Per un numero di
 * telefono con il prefisso (+39) basta uno spazio: Excel e LibreOffice
 * mostrerebbero l'apostrofo, e il numero copiato non si potrebbe chiamare.
 * Un valore fatto solo di cifre e segni non può contenere una funzione.
 */
function cella(valore: unknown): string {
  let s = valore == null ? "" : String(valore);
  if (SOLO_TELEFONO.test(s)) {
    // Tutto attaccato ("+393331234567") Excel lo legge come numero: toglie il
    // + e lo mostra come 3,93E+11. Uno spazio dopo il prefisso lo tiene testo;
    // le cifre non cambiano, quindi il numero si chiama lo stesso.
    if (/^\+\d+$/.test(s)) s = `${s.slice(0, 3)} ${s.slice(3)}`;
    s = ` ${s}`;
  }
  else if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

const riga = (valori: unknown[]) => valori.map(cella).join(SEP);

const statoGiornata = (g: GiornataRiga | undefined) =>
  !g ? "" : g.status === "lista_attesa" ? "Lista d'attesa" : "Confermato";

const presenza = (g: GiornataRiga | undefined) =>
  !g ? "" : g.stato_checkin === "presente" ? "Presente" : g.stato_checkin === "assente" ? "Assente" : "";

/** "10 dicembre" -> "10-dicembre", per il nome del file. */
const perFile = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** La lista di una giornata: chi c'è quel giorno, con presenza e ora d'ingresso. */
function csvGiornata(righe: RigaIscritto[], slug: string): string[] {
  const out = [
    riga([
      "Cognome", "Nome", "Categoria", "Organizzazione", "Classe", "Stato", "Presenza",
      "Ora ingresso", "Codice", "Email", "Telefono", "Note", "Iscritto il",
    ]),
  ];
  for (const r of righe) {
    const g = r.giornate.find((x) => x.slug === slug);
    if (!g) continue;
    out.push(
      riga([
        r.cognome, r.nome, categoriaLabel(r.categoria), r.organizzazione ?? r.startup_name, r.classe,
        statoGiornata(g), presenza(g), dataOraRoma(g.checkin_ts), r.codice, r.email, r.telefono,
        r.note, dataOraRoma(r.created_at),
      ]),
    );
  }
  return out;
}

/** L'elenco completo: una riga per persona, una colonna per giornata. */
function csvCompleto(righe: RigaIscritto[]): string[] {
  // Le sessioni che il sito non usa più compaiono solo se qualcuno ci è collegato.
  const sconosciute = righe.some((r) => r.giornate.some((g) => !sessionBySlug(g.slug)));
  const out = [
    riga([
      "Cognome", "Nome", "Categoria", "Organizzazione", "Classe",
      ...SESSIONS.map((s) => s.etichetta),
      ...SESSIONS.map((s) => `Presenza ${s.etichetta}`),
      ...(sconosciute ? ["Sessioni non riconosciute"] : []),
      "Email", "Telefono", "Startup", "Sito startup", "Note", "Codice",
      "Consenso comunicazioni", "Data consenso comunicazioni", "Iscritto il",
    ]),
  ];
  for (const r of righe) {
    const perSlug = (slug: string) => r.giornate.find((g) => g.slug === slug);
    out.push(
      riga([
        r.cognome, r.nome, categoriaLabel(r.categoria), r.organizzazione, r.classe,
        ...SESSIONS.map((s) => statoGiornata(perSlug(s.slug))),
        ...SESSIONS.map((s) => presenza(perSlug(s.slug))),
        ...(sconosciute
          ? [r.giornate.filter((g) => !sessionBySlug(g.slug)).map((g) => g.slug || "senza nome").join(", ")]
          : []),
        r.email, r.telefono, r.startup_name, r.startup_url, r.note, r.codice,
        r.consenso_marketing ? "Sì" : "No", dataOraRoma(r.consenso_marketing_ts), dataOraRoma(r.created_at),
      ]),
    );
  }
  return out;
}

/**
 * Export CSV degli iscritti, per Excel in italiano: separatore ";", BOM
 * UTF-8, righe CRLF, celle tra virgolette.
 *
 * - ?giornata=giorno-1: la lista di quel giorno, una riga per persona, in
 *   ordine di cognome, con stato, presenza e ora d'ingresso.
 * - senza giornata: tutti, una colonna per giornata, con i consensi.
 *
 * Accetta gli stessi filtri dell'elenco (q, categoria, stato): quello che si
 * vede nel pannello è quello che si scarica. Solo staff (requireAdmin).
 */
export async function GET(request: Request) {
  const { error, status, client } = await getEventAdminClient();
  if (error || !client) return NextResponse.json({ error }, { status });

  const params = new URL(request.url).searchParams;
  const slug = params.get("giornata") ?? "";
  const sessione = slug ? sessionBySlug(slug) : undefined;
  if (slug && !sessione) {
    return NextResponse.json({ error: "Giornata sconosciuta." }, { status: 400 });
  }
  // Il filtro per giornata dell'elenco non si applica qui: la giornata la
  // sceglie il pulsante ("Scarica 10 dicembre"), oppure si scarica tutto.
  const filtri = { ...leggiFiltri(params), giornata: sessione ? sessione.slug : "" };
  if (sessione && filtri.stato === "senza") filtri.stato = "";

  let righe: RigaIscritto[];
  try {
    const dati = await caricaDatiPannello(client);
    if (sessione && dati.mancanti.includes(sessione.slug)) {
      return NextResponse.json(
        {
          error: `${giornateConArticolo([sessione.slug]).replace(/^./, (c) => c.toUpperCase())} non esiste nel database: non c'è niente da scaricare.`,
        },
        { status: 409 },
      );
    }
    righe = filtraIscritti(dati.iscritti, filtri).sort(confrontaPerCognome);
  } catch (err) {
    console.error("[eventi/admin/export]", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Non riesco a leggere le iscrizioni dal database. Riprova tra poco." },
      { status: 500 },
    );
  }

  const linee = sessione ? csvGiornata(righe, sessione.slug) : csvCompleto(righe);
  const csv = "\uFEFF" + linee.join("\r\n") + "\r\n";

  const oggi = giornoRoma(new Date());
  const filtrato = filtri.q.trim() || filtri.categoria || filtri.stato ? "-filtrati" : "";
  const nome = `iscritti-${sessione ? perFile(sessione.etichetta) : "tutti"}${filtrato}-${oggi}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Cache-Control": "no-store",
    },
  });
}
