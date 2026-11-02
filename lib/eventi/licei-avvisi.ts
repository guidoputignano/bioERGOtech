/**
 * Le email una tantum che lo staff manda da un bottone del pannello dei
 * licei: l'avviso agli studenti sulle riflessioni, l'avviso ai docenti sulle
 * squadre. Ognuna parte una volta sola.
 *
 * Ogni avviso ha due chiavi in `licei_config`, fuori da `CONFIG_CHIAVI`: la
 * data dell'invio, che fa anche da prenotazione, e l'esito in soli numeri
 * (la tabella e leggibile da chiunque). La rotta generica della
 * configurazione non le puo scrivere ne cancellare, quindi un avviso non si
 * rimanda per errore.
 *
 * Qui c'e la parte comune: chi ha gia ricevuto cosa, la prenotazione,
 * l'invio a blocchi con Resend e la registrazione dell'esito. Quali
 * controlli fare prima e a chi scrivere li decide la rotta. Solo server.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Resend } from "resend";
import { STATI_ADESIONE_CHE_ACCETTANO } from "@/app/eventi/vivere-piu-a-lungo/licei/content";
import { erroreSchemaMancante } from "@/lib/eventi/licei-server";

export type EsitoAvviso = {
  /** Persone a cui si e provato a scrivere, un indirizzo per persona. */
  destinatari: number;
  inviate: number;
  /** Non partite, indirizzi non validi compresi: i dettagli sono nei log. */
  fallite: number;
};

/** Lo stato di un avviso, come lo vede il pannello. */
export type StatoAvviso = {
  /** Quando e partito. Null: non ancora. */
  inviato_at: string | null;
  esito: EsitoAvviso | null;
};

/** Un destinatario. `rif` va nei log al posto dell'email, per esempio "iscrizione <id>". */
export type Destinatario = { rif: string; nome: string; email: string };

export const MITTENTE_AVVISI = "Fondazione bioERGOtech <noreply@bioergotech.org>";
export const RISPOSTE_AVVISI = "info@bioergotech.org";

/** Quanti indirizzi per chiamata all'API di invio a blocchi di Resend. */
const BLOCCO = 50;
/** Pausa fra un blocco e il successivo, sotto il limite di richieste al secondo. */
const PAUSA_MS = 600;
const EMAIL_VALIDA = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Lo stato di un avviso dalle righe di `licei_config` gia lette. */
export function statoAvviso(
  config: { chiave: string; valore: string | null }[],
  chiave: string,
  chiaveEsito: string,
): StatoAvviso {
  const valore = (k: string) => (config.find((c) => c.chiave === k)?.valore ?? "").trim();
  let esito: EsitoAvviso | null = null;
  const grezzo = valore(chiaveEsito);
  if (grezzo) {
    try {
      esito = JSON.parse(grezzo) as EsitoAvviso;
    } catch {
      esito = null;
    }
  }
  return { inviato_at: valore(chiave) || null, esito };
}

/** La data dell'invio, se l'avviso e gia partito. */
export async function giaInviato(client: SupabaseClient, chiave: string): Promise<string | null> {
  const { data, error } = await client.from("licei_config").select("valore").eq("chiave", chiave).maybeSingle();
  if (error) throw new Error(`licei_config: ${error.message}`);
  return (data?.valore ?? "").trim() || null;
}

/**
 * Un indirizzo per persona, nell'ordine dato: chi compare due volte riceve
 * un'email sola, con il nome della prima riga. Gli indirizzi non validi si
 * contano e, con un'etichetta, si registrano nei log con `rif`, non con
 * l'email. Senza etichetta (il conteggio per il pannello) non si registra
 * niente.
 */
export function destinatariUnici(
  righe: Destinatario[],
  etichetta: string | null,
): { destinatari: Destinatario[]; scartate: number } {
  const visti = new Set<string>();
  const destinatari: Destinatario[] = [];
  let scartate = 0;
  for (const r of righe) {
    const email = (r.email ?? "").trim();
    const chiave = email.toLowerCase();
    if (!EMAIL_VALIDA.test(email)) {
      scartate += 1;
      if (etichetta) console.error(`Licei ${etichetta}: ${r.rif}: indirizzo non valido, non inviato.`);
      continue;
    }
    if (visti.has(chiave)) continue;
    visti.add(chiave);
    destinatari.push({ rif: r.rif, nome: (r.nome ?? "").trim(), email });
  }
  return { destinatari, scartate };
}

const PAGINA = 1000;

/**
 * I docenti a cui scrive l'avviso sulle squadre: i referenti delle adesioni
 * che accettano iscrizioni (confermate e attive) e i docenti del progetto di
 * quelle stesse adesioni, invitati o attivi. Prima i referenti, cosi chi e
 * tutte e due le cose riceve un'email sola, con il nome da referente. Senza
 * la tabella dei docenti del progetto (prima della migrazione
 * 20261215000000) restano i referenti. Le letture vanno a pagine: PostgREST
 * tronca oltre il suo tetto senza dirlo.
 */
export async function righeDocentiAvviso(client: SupabaseClient): Promise<Destinatario[]> {
  type Adesione = {
    id: string;
    referente_nome: string | null;
    referente_cognome: string | null;
    referente_email: string | null;
  };
  type Docente = { id: string; adesione_id: string; nome: string | null; cognome: string | null; email: string | null };

  const adesioni: Adesione[] = [];
  for (let da = 0; ; da += PAGINA) {
    const { data, error } = await client
      .from("licei_adesioni")
      .select("id, referente_nome, referente_cognome, referente_email")
      .in("stato", [...STATI_ADESIONE_CHE_ACCETTANO])
      .order("id", { ascending: true })
      .range(da, da + PAGINA - 1);
    if (error) throw new Error(`licei_adesioni: ${error.message}`);
    adesioni.push(...((data ?? []) as Adesione[]));
    if ((data ?? []).length < PAGINA) break;
  }

  const nome = (n: string | null, c: string | null) => `${n ?? ""} ${c ?? ""}`.trim();
  const righe: Destinatario[] = adesioni.map((a) => ({
    rif: `adesione ${a.id}`,
    nome: nome(a.referente_nome, a.referente_cognome),
    email: a.referente_email ?? "",
  }));

  const accettate = new Set(adesioni.map((a) => a.id));
  for (let da = 0; ; da += PAGINA) {
    const { data, error } = await client
      .from("licei_docenti")
      .select("id, adesione_id, nome, cognome, email")
      .in("stato", ["invitato", "attivo"])
      .order("id", { ascending: true })
      .range(da, da + PAGINA - 1);
    if (error) {
      if (erroreSchemaMancante(error, "tabella")) break;
      throw new Error(`licei_docenti: ${error.message}`);
    }
    for (const d of (data ?? []) as Docente[]) {
      if (!accettate.has(d.adesione_id)) continue;
      righe.push({ rif: `docente ${d.id}`, nome: nome(d.nome, d.cognome), email: d.email ?? "" });
    }
    if ((data ?? []).length < PAGINA) break;
  }
  return righe;
}

/**
 * Prenota l'invio scrivendo la chiave con la data, PRIMA di mandare
 * qualsiasi email. Due clic, o due persone dello staff nello stesso
 * momento, arrivano qui insieme: la chiave primaria di `licei_config` fa
 * passare solo il primo. Una chiave gia presente ma vuota (svuotata a mano
 * dal database) si prenota solo se e ancora vuota, con lo stesso effetto.
 */
async function prenota(
  client: SupabaseClient,
  chiave: string,
  adesso: string,
  autore: string,
): Promise<"prenotato" | "gia_inviato"> {
  const riga = { chiave, valore: adesso, aggiornato_at: adesso, aggiornato_by: autore };
  const { error } = await client.from("licei_config").insert(riga);
  if (!error) return "prenotato";
  if (error.code !== "23505") throw new Error(`licei_config: ${error.message}`);

  for (const vuota of ["", null] as const) {
    const base = client.from("licei_config").update(riga).eq("chiave", chiave);
    const { data, error: erroreVuota } = await (vuota === null
      ? base.is("valore", null)
      : base.eq("valore", vuota)
    ).select("chiave");
    if (erroreVuota) throw new Error(`licei_config: ${erroreVuota.message}`);
    if ((data ?? []).length > 0) return "prenotato";
  }
  return "gia_inviato";
}

export type RisultatoAvviso =
  | { stato: "gia_inviato" }
  | { stato: "prenotazione_fallita" }
  /** Non e partita nessuna email: la prenotazione e stata tolta, si puo riprovare. */
  | { stato: "nessuna_partita"; esito: EsitoAvviso }
  | { stato: "inviato"; inviato_at: string; esito: EsitoAvviso };

/**
 * Prenota e invia, a blocchi. Un indirizzo che non parte si registra nei log
 * con il suo `rif`; i conteggi restano in `chiaveEsito`. Se non parte
 * nessuna email, la prenotazione si toglie.
 */
export async function inviaAvvisoUnaVolta(
  client: SupabaseClient,
  resend: Pick<Resend, "batch">,
  opzioni: {
    chiave: string;
    chiaveEsito: string;
    autore: string;
    /** Per i log e per la chiave di idempotenza, per esempio "avviso-riflessioni". */
    etichetta: string;
    destinatari: Destinatario[];
    /** Indirizzi non validi gia scartati da `destinatariUnici`: contano fra le fallite. */
    scartate: number;
    subject: string;
    html: (d: Destinatario) => string;
  },
): Promise<RisultatoAvviso> {
  const { chiave, chiaveEsito, autore, etichetta, destinatari, scartate, subject, html } = opzioni;
  const log = `Licei ${etichetta.replace(/-/g, " ")}`;

  const adesso = new Date().toISOString();
  try {
    if ((await prenota(client, chiave, adesso, autore)) === "gia_inviato") return { stato: "gia_inviato" };
  } catch (err) {
    console.error(`${log}: prenotazione non riuscita:`, err);
    return { stato: "prenotazione_fallita" };
  }

  let inviate = 0;
  let fallite = scartate;

  for (let i = 0; i < destinatari.length; i += BLOCCO) {
    const blocco = destinatari.slice(i, i + BLOCCO);
    if (i > 0) await pausa(PAUSA_MS);
    const messaggi = blocco.map((d) => ({
      from: MITTENTE_AVVISI,
      to: d.email,
      replyTo: RISPOSTE_AVVISI,
      subject,
      html: html(d),
    }));
    // La chiave di idempotenza e legata a questa prenotazione e a questo
    // blocco: se la rete cade dopo che Resend ha accettato, il secondo
    // tentativo non manda una seconda copia.
    const opzioniInvio = {
      batchValidation: "permissive" as const,
      idempotencyKey: `licei-${etichetta}-${adesso}-${i / BLOCCO}`,
    };

    let esito: Awaited<ReturnType<typeof resend.batch.send<typeof opzioniInvio>>> | null = null;
    for (let tentativo = 0; tentativo < 2; tentativo++) {
      try {
        esito = await resend.batch.send(messaggi, opzioniInvio);
      } catch (err) {
        esito = {
          data: null,
          error: { message: err instanceof Error ? err.message : String(err), statusCode: null, name: "application_error" },
          headers: null,
        } as typeof esito;
      }
      // Si riprova una volta sola, e solo per un rifiuto passeggero.
      const codice = esito?.error?.statusCode ?? null;
      if (!esito?.error || (codice !== null && codice !== 429 && codice < 500) || tentativo > 0) break;
      await pausa(1500);
    }

    if (!esito || esito.error) {
      fallite += blocco.length;
      for (const d of blocco) {
        console.error(`${log}: ${d.rif}: non inviato (${esito?.error?.message ?? "errore sconosciuto"}).`);
      }
      continue;
    }
    const errori = esito.data?.errors ?? [];
    for (const e of errori) {
      console.error(`${log}: ${blocco[e.index]?.rif ?? "?"}: non inviato (${e.message}).`);
    }
    fallite += errori.length;
    inviate += blocco.length - errori.length;
  }

  const esito: EsitoAvviso = { destinatari: destinatari.length + scartate, inviate, fallite };

  if (inviate === 0) {
    // Non e partito niente: la prenotazione si toglie, cosi lo staff puo
    // riprovare quando il problema e risolto. Solo la propria: il filtro
    // sulla data non tocca un invio partito nel frattempo.
    const { error } = await client.from("licei_config").delete().eq("chiave", chiave).eq("valore", adesso);
    if (error) console.error(`${log}: prenotazione non tolta:`, error.message);
    return { stato: "nessuna_partita", esito };
  }

  const { error: erroreEsito } = await client.from("licei_config").upsert(
    { chiave: chiaveEsito, valore: JSON.stringify(esito), aggiornato_at: new Date().toISOString(), aggiornato_by: autore },
    { onConflict: "chiave" },
  );
  if (erroreEsito) console.error(`${log}: esito non registrato:`, erroreEsito.message);

  return { stato: "inviato", inviato_at: adesso, esito };
}
