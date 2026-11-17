/**
 * The live numbers of the homepage: how many schools, students, teams,
 * projects, experts and people take part in the programmes, read from the
 * database every hour (the homepage revalidates hourly).
 *
 * Only counts leave this file: no names, no school-level breakdowns, no
 * scores. Every count uses the same filters the staff panels use to mean
 * "active" (see the comments next to each query), so the homepage and the
 * panels never disagree.
 *
 * The page must render without the database: local builds use a
 * placeholder Supabase URL, and a missing table (a migration not applied)
 * or a slow answer must not take the homepage down. Every count is
 * optional; a count that fails, times out or is zero is left out, and the
 * section disappears when nothing is left.
 *
 * Lifespan: the closure of the school programme deletes its rows (licei_*)
 * within a month of the course ending. After the event, freeze the final
 * figures in content (or read them from licei_config "dati_cancellati_esito")
 * before running the closure, or these numbers will fall to zero and be
 * hidden.
 *
 * Server only.
 */

import { liceiAdminClient } from "@/lib/eventi/licei-server";

export type NumeriHome = {
  scuole: number | null;
  comuni: number | null;
  studenti: number | null;
  squadre: number | null;
  progetti: number | null;
  giudici: number | null;
  mentor: number | null;
  universitari: number | null;
  iscrittiTalk: number | null;
  iscrittiEvento: number | null;
  lezioni: number | null;
  certificati: number | null;
  /** Seats left per day of the event, from event_seats_remaining(). */
  posti: { slug: string; capienza: number; rimanenti: number }[];
};

const TEMPO_MASSIMO_MS = 5000;

/** A promise that gives up after a while: the homepage never waits on a slow database. */
function entro<T>(p: PromiseLike<T>, fallback: T): Promise<T> {
  return Promise.race([
    Promise.resolve(p).catch(() => fallback),
    new Promise<T>((r) => setTimeout(() => r(fallback), TEMPO_MASSIMO_MS)),
  ]);
}

type Conteggio = { count: number | null; error: unknown };
type Righe<T> = { data: T[] | null; error: unknown };

/** A head count, or null when the table is missing or the query fails. */
async function conta(q: PromiseLike<Conteggio>): Promise<number | null> {
  const r = await entro<Conteggio>(q, { count: null, error: "timeout" });
  return r.error || typeof r.count !== "number" ? null : r.count;
}

export async function numeriHome(): Promise<NumeriHome | null> {
  const db = liceiAdminClient();
  if (!db) return null;
  const h = { count: "exact" as const, head: true };

  const [
    scuole,
    comuniRighe,
    studenti,
    squadre,
    progetti,
    giudici,
    mentor,
    universitari,
    iscrittiTalk,
    iscrittiEvento,
    lezioni,
    certificati,
    posti,
  ] = await Promise.all([
    // Schools confirmed by the staff: STATI_ADESIONE_CHE_ACCETTANO.
    conta(db.from("licei_adesioni").select("id", h).in("stato", ["confermata", "attiva"])),
    // The towns of those schools, to count the distinct ones.
    entro<Righe<{ istituto_comune: string | null }>>(
      db.from("licei_adesioni").select("istituto_comune").in("stato", ["confermata", "attiva"]).limit(1000) as unknown as PromiseLike<Righe<{ istituto_comune: string | null }>>,
      { data: null, error: "timeout" },
    ),
    // Students still in the programme: STATI_ISCRIZIONE_ATTIVI.
    conta(db.from("licei_iscrizioni").select("id", h).in("stato", ["in_attesa", "confermata"])),
    // Teams: open ones (a dissolved team is "sciolta").
    conta(db.from("licei_squadre").select("id", h).eq("stato", "aperta")),
    // Projects handed in.
    conta(db.from("licei_progetti").select("id", h).eq("stato", "consegnato")),
    // Experts on the committee (applications waiting for approval are attivo = false).
    conta(db.from("licei_commissari").select("id", h).eq("attivo", true)),
    // Mentors approved for the programmes.
    conta(db.from("universita_mentor").select("id", h).eq("stato", "approvata")),
    // University students admitted.
    conta(db.from("universita_candidature").select("id", h).eq("stato", "confermata")),
    // Registrations to the talks with experts, staff excluded.
    conta(db.from("talk_iscrizioni").select("id", h).neq("ruolo", "staff")),
    // People registered for the event (one row per email).
    conta(db.from("event_registrations").select("id", h)),
    // Lessons completed in the Agentic AI course (a row only when the closing reflection is submitted).
    conta(db.from("lesson_submissions").select("user_id", h)),
    // Certificates that verify on /verify: not revoked, and legacy ones only once confirmed.
    conta(db.from("course_certificates").select("cert_id", h).is("revoked_at", null).or("legacy.eq.false,confirmed_at.not.is.null")),
    entro<Righe<{ slug: string; capienza_max: number; rimanenti: number }>>(
      db.rpc("event_seats_remaining") as unknown as PromiseLike<Righe<{ slug: string; capienza_max: number; rimanenti: number }>>,
      { data: null, error: "timeout" },
    ),
  ]);

  const comuni =
    comuniRighe.error || !comuniRighe.data
      ? null
      : new Set(comuniRighe.data.map((r) => (r.istituto_comune ?? "").trim().toLowerCase()).filter(Boolean)).size;

  return {
    scuole,
    comuni,
    studenti,
    squadre,
    progetti,
    giudici,
    mentor,
    universitari,
    iscrittiTalk,
    iscrittiEvento,
    lezioni,
    certificati,
    posti:
      posti.error || !posti.data
        ? []
        : posti.data.map((p) => ({ slug: String(p.slug), capienza: Number(p.capienza_max), rimanenti: Number(p.rimanenti) })),
  };
}

export type VoceNumero = { valore: number; etichetta: string; largo: boolean };

/**
 * The numbers worth showing, in order, laid out to fill whole rows of the
 * four-column grid (a wide card takes two columns).
 *
 * A count is left out when it is missing or below its minimum: "1 mentors"
 * reads wrong, and a small figure next to large ones says nothing. Projects
 * and university students start counting once there are ten, the event
 * registrations once there are fifty.
 */
export function vociNumeri(n: NumeriHome | null): VoceNumero[] {
  if (!n) return [];
  const v: VoceNumero[] = [];
  const add = (valore: number | null, etichetta: string, minimo = 3, largo = false) => {
    if (valore !== null && valore >= minimo) v.push({ valore, etichetta, largo });
  };
  add(n.iscrittiEvento, "people already registered for Vivere più a lungo", 50, true);
  add(n.studenti, "students enrolled in the school programme");
  add(n.scuole, "schools taking part");
  add(n.comuni, "towns in the province of Taranto");
  add(n.squadre, "student teams");
  add(n.progetti, "projects submitted so far", 10);
  add(n.giudici, "experts on the evaluation committee");
  add(n.mentor, "mentors from research and industry");
  add(n.universitari, "university students in the university track", 10);
  add(n.iscrittiTalk, "registrations to the talks with experts");
  add(n.lezioni, "lessons completed in the Agentic AI course", 20);
  add(n.certificati, "course certificates issued", 5);

  // At most two rows, and no row left half empty.
  const unita = () => v.reduce((t, x) => t + (x.largo ? 2 : 1), 0);
  while (unita() > 8) v.pop();
  for (let giri = 0; giri < 4 && unita() % 4 !== 0; giri++) {
    const resto = unita() % 4;
    const stretto = v.find((x) => !x.largo);
    if (resto === 1 && v.length > 4) v.pop();
    else if (stretto) stretto.largo = true;
    else v.pop();
  }
  return v;
}
