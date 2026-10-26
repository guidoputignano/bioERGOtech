import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { liceiAdminClient } from "@/lib/eventi/licei-server";
import {
  REFERENTE_PATH,
  STUDENTE_PATH as STUDENTE_LICEI_PATH,
} from "@/app/eventi/vivere-piu-a-lungo/licei/content";
import { STUDENTE_PATH as STUDENTE_UNIVERSITA_PATH } from "@/app/eventi/vivere-piu-a-lungo/universita/content";

export const dynamic = "force-dynamic";

/**
 * Where an account goes after setting its password or signing in without a
 * returnTo: its own area, not the research portal.
 *
 * Students of the high-school programme used to land on /member-portal, an
 * English page that shows their account level as "Viewer". Translated by the
 * browser that reads "Spettatore", and teachers reported students who
 * "become spectators, not pupils". Teachers landed there too.
 *
 * In order: staff stay on the portal; teachers (referente or active project
 * teacher) go to their console; high-school students with a registration in
 * progress or confirmed go to their area; university participants to theirs.
 * Anything else, a missing table or a failed read, falls back to the portal,
 * which is where everyone went before.
 */
export default async function DopoAccesso() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  redirect(await destinazione(user.id));
}

async function destinazione(userId: string): Promise<string> {
  const portale = "/member-portal";
  const client = liceiAdminClient();
  if (!client) return portale;

  try {
    const [profilo, referente, docente, studente, universita] = await Promise.all([
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
    const ce = (r: { data: unknown[] | null; error: unknown }) => !r.error && (r.data ?? []).length > 0;

    if (profilo.data?.partnership_level === "admin") return portale;
    if (ce(referente) || ce(docente)) return REFERENTE_PATH;
    if (ce(studente)) return STUDENTE_LICEI_PATH;
    if (ce(universita)) return STUDENTE_UNIVERSITA_PATH;
  } catch (err) {
    console.error("Dopo l'accesso: destinazione non letta:", err);
  }
  return portale;
}
