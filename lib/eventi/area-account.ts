/**
 * Which area of the site an account belongs to.
 *
 * Students of the programmes (high-school students with a registration in
 * progress or confirmed, university participants) have their own area and
 * do not use the research portal: there they read "Viewer" ("Spettatore"
 * in a translated browser) and land among the Foundation's members.
 * Teachers of the high-school programme have their console. Staff, and
 * accounts that are members or partners of the Foundation, keep the portal.
 *
 * Used after sign-in (`app/auth/dopo-accesso`), by the portal itself, which
 * sends students to their area, and by the navbar, which shows them
 * "Student area" instead of "Research Portal". Server only: it reads with
 * the service role, always for the account of the session.
 */

import { liceiAdminClient } from "@/lib/eventi/licei-server";
import {
  REFERENTE_PATH,
  STUDENTE_PATH as STUDENTE_LICEI_PATH,
} from "@/app/eventi/vivere-piu-a-lungo/licei/content";
import { STUDENTE_PATH as STUDENTE_UNIVERSITA_PATH } from "@/app/eventi/vivere-piu-a-lungo/universita/content";

export type AreaAccount = {
  /** Staff of the Foundation (`partnership_level = admin`). */
  staff: boolean;
  /** Staff, member or partner of the Foundation: the portal stays theirs. */
  portale: boolean;
  /** Teacher of the high-school programme: referente, or project teacher not revoked. */
  docente: boolean;
  /** The student area, if the account is a student of a programme; otherwise null. */
  studente: string | null;
};

/** Levels that make the portal theirs, whatever else the account is. */
const LIVELLI_PORTALE = new Set(["admin", "member", "partner"]);

/**
 * The area of an account. Missing tables count as empty; any other failed
 * read gives null, and the callers fall back to what the site did before:
 * the portal, for everyone.
 */
export async function areaAccount(userId: string): Promise<AreaAccount | null> {
  const client = liceiAdminClient();
  if (!client) return null;
  try {
    const [profilo, referente, docente, licei, universita] = await Promise.all([
      client.from("profiles").select("partnership_level").eq("id", userId).maybeSingle(),
      client.from("licei_adesioni").select("id").eq("user_id", userId).neq("stato", "ritirata").limit(1),
      client.from("licei_docenti").select("id").eq("user_id", userId).in("stato", ["invitato", "attivo"]).limit(1),
      client
        .from("licei_iscrizioni")
        .select("id")
        .eq("user_id", userId)
        .in("stato", ["in_attesa", "confermata"])
        .limit(1),
      client.from("universita_candidature").select("id").eq("user_id", userId).limit(1),
    ]);
    if (profilo.error) throw new Error(profilo.error.message);
    const ce = (r: { data: unknown[] | null; error: unknown }) => !r.error && (r.data ?? []).length > 0;

    const livello = profilo.data?.partnership_level ?? "";
    const portale = LIVELLI_PORTALE.has(livello);
    const isDocente = ce(referente) || ce(docente);
    const studente = isDocente
      ? null
      : ce(licei)
        ? STUDENTE_LICEI_PATH
        : ce(universita)
          ? STUDENTE_UNIVERSITA_PATH
          : null;
    return { staff: livello === "admin", portale, docente: isDocente, studente };
  } catch (err) {
    console.error("Area dell'account non letta:", err);
    return null;
  }
}

/**
 * Where to go after signing in. Staff to the portal, even when testing the
 * programmes with a registration of their own; teachers to their console;
 * students to their area (a member who is also a student can still open
 * the portal); everyone else to the portal.
 */
export function destinazioneDopoAccesso(area: AreaAccount | null): string {
  if (!area || area.staff) return "/member-portal";
  if (area.docente) return REFERENTE_PATH;
  return area.studente ?? "/member-portal";
}

/** The student area the portal sends this account to, or null if the portal is theirs. */
export function areaAlPostoDelPortale(area: AreaAccount | null): string | null {
  if (!area || area.portale || area.docente) return null;
  return area.studente;
}
