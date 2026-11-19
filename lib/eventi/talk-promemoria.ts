/**
 * A chi va il promemoria del giorno di un talk (il passo `talk_oggi` del
 * calendario dei licei, `lib/eventi/licei-commissione-auto.ts`):
 *
 *  - agli studenti dei licei (iscrizioni in attesa e confermate, come gli
 *    altri avvisi) e agli universitari con la candidatura confermata che
 *    non sono ancora iscritti al talk: l'invito a iscriversi;
 *  - a chi è iscritto e vede il link sul sito (la regola di
 *    `iscrittiTalkConContatti`, la stessa dell'export dello staff):
 *    studenti, universitari e ospiti in una versione, docenti in un'altra
 *    (con il Lei). Lo staff no.
 *
 * Una persona riceve una sola delle email: chi è iscritto (per account o
 * per indirizzo) non riceve l'invito a iscriversi, e chi è nei licei non
 * riceve anche quello degli universitari.
 *
 * Solo server: usa il client con service role.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { erroreSchemaMancante } from "@/lib/eventi/licei-server";
import { STATI_ISCRIZIONE_ATTIVI } from "@/app/eventi/vivere-piu-a-lungo/licei/content";
import type { Talk } from "@/app/eventi/vivere-piu-a-lungo/talk/content";
import type { Destinatario } from "@/lib/eventi/licei-avvisi";
import { iscrittiTalkConContatti } from "@/lib/eventi/talk-iscritti";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, "public", any>;

const PAGINA = 1000;

export type DestinatariPromemoriaTalk =
  | { presente: false }
  | {
      presente: true;
      nonIscrittiLicei: Destinatario[];
      nonIscrittiUniversita: Destinatario[];
      iscritti: Destinatario[];
      iscrittiDocenti: Destinatario[];
    };

type Riga = { id: string; user_id: string | null; nome: string | null; email: string | null };

/** Tutte le righe, a pagine: PostgREST tronca oltre il suo tetto senza dirlo. */
async function aPagine(
  cosa: string,
  query: (da: number, a: number) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>,
): Promise<Riga[] | null> {
  const righe: Riga[] = [];
  for (let da = 0; ; da += PAGINA) {
    const { data, error } = await query(da, da + PAGINA - 1);
    if (error) {
      if (erroreSchemaMancante(error)) return null;
      throw new Error(`${cosa}: ${error.message ?? "lettura non riuscita"}`);
    }
    const pagina = (data ?? []) as Riga[];
    righe.push(...pagina);
    if (pagina.length < PAGINA) break;
  }
  return righe;
}

const minuscola = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();

export async function destinatariPromemoriaTalk(
  db: Db,
  talk: Pick<Talk, "slug" | "apertoATutti">,
): Promise<DestinatariPromemoriaTalk> {
  const elenco = await iscrittiTalkConContatti(db, talk);
  if (!elenco.presente) return { presente: false };

  const iscrittiPerAccount = new Set(elenco.account);
  const iscrittiPerEmail = new Set(elenco.iscritti.map((r) => minuscola(r.email)).filter(Boolean));

  const iscritti: Destinatario[] = [];
  const iscrittiDocenti: Destinatario[] = [];
  for (const r of elenco.iscritti) {
    if (r.ruolo === "staff") continue;
    const d: Destinatario = { rif: `talk ${r.user_id}`, nome: `${r.nome} ${r.cognome}`.trim(), email: r.email };
    if (r.ruolo === "docente") iscrittiDocenti.push(d);
    else iscritti.push(d);
  }

  const giaIscritto = (r: Riga) =>
    (r.user_id !== null && iscrittiPerAccount.has(r.user_id)) || iscrittiPerEmail.has(minuscola(r.email));

  const licei =
    (await aPagine("licei_iscrizioni", (da, a) =>
      db
        .from("licei_iscrizioni")
        .select("id, user_id, nome, email")
        .in("stato", [...STATI_ISCRIZIONE_ATTIVI])
        .order("id", { ascending: true })
        .range(da, a),
    )) ?? [];
  const nonIscrittiLicei = licei
    .filter((r) => !giaIscritto(r))
    .map((r) => ({ rif: `iscrizione ${r.id}`, nome: r.nome ?? "", email: r.email ?? "" }));
  const emailLicei = new Set(licei.map((r) => minuscola(r.email)).filter(Boolean));

  // Senza la tabella delle candidature (un ambiente senza la fase 2
  // dell'università) non c'è nessun universitario a cui scrivere.
  const universita =
    (await aPagine("universita_candidature", (da, a) =>
      db
        .from("universita_candidature")
        .select("id, user_id, nome, email")
        .eq("stato", "confermata")
        .order("id", { ascending: true })
        .range(da, a),
    )) ?? [];
  const nonIscrittiUniversita = universita
    .filter((r) => !giaIscritto(r) && !emailLicei.has(minuscola(r.email)))
    .map((r) => ({ rif: `candidatura ${r.id}`, nome: r.nome ?? "", email: r.email ?? "" }));

  return { presente: true, nonIscrittiLicei, nonIscrittiUniversita, iscritti, iscrittiDocenti };
}
