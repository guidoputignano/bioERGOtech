import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { areaAccount, destinazioneDopoAccesso } from "@/lib/eventi/area-account";

export const dynamic = "force-dynamic";

/**
 * Where an account goes after setting its password or signing in without a
 * returnTo: its own area, not the research portal.
 *
 * Students of the high-school programme used to land on /member-portal, an
 * English page that shows their account level as "Viewer". Translated by the
 * browser that reads "Spettatore", and teachers reported students who
 * "become spectators, not pupils". Teachers landed there too. The rule is in
 * `lib/eventi/area-account.ts`; a failed read falls back to the portal,
 * which is where everyone went before.
 */
export default async function DopoAccesso() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  redirect(destinazioneDopoAccesso(await areaAccount(user.id)));
}
