import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";
import type { Metadata } from "next";
import { giornataDiOggi } from "../content";
import { AdminPanel } from "./AdminPanel";
import { PERCORSO_PANNELLO, leggiFiltri, schedaValida } from "./PannelloComune";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Iscrizioni evento",
  robots: { index: false, follow: false },
};

/**
 * Il pannello iscrizioni dell'evento: riservato agli account admin. La
 * guardia vera sta nelle rotte /api/eventi/admin/*, che rispondono solo agli
 * admin; questa pagina si limita a non mostrare il pannello agli altri.
 *
 * La scheda e i filtri iniziali arrivano dall'indirizzo (?tab=iscritti&
 * giornata=giorno-1&stato=attesa), così il pannello si apre già nel punto
 * giusto, senza un passaggio dalla scheda predefinita.
 */
export default async function EventAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("partnership_level")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = profile?.partnership_level === "admin";
  }

  if (!isAdmin) {
    return (
      <>
        <Navbar />
        <div style={{ paddingTop: "110px", minHeight: "70vh" }} className="bg-light-gray">
          <div className="container mx-auto px-4 md:px-6 py-16">
            <div className="card max-w-md mx-auto text-center">
              <span className="icon-circle icon-circle-primary" style={{ width: 56, height: 56, margin: "0 auto" }}>
                <i className="fas fa-lock text-2xl" aria-hidden="true" />
              </span>
              <h1 className="text-2xl font-bold text-gray-800 mt-5 mb-2">Accesso riservato</h1>
              <p className="text-gray-600 mb-6">
                {user
                  ? "Questo account non ha l'accesso staff. Se dovrebbe averlo, scrivi a chi gestisce il sito."
                  : "Questa area è riservata allo staff della Fondazione. Accedi con l'account admin per continuare."}
              </p>
              <div className="flex flex-col gap-3">
                <Link href={`/auth/login?returnTo=${encodeURIComponent(PERCORSO_PANNELLO)}`} className="btn-primary">
                  {user ? "Accedi con un altro account" : "Accedi"}
                </Link>
                {user && (
                  // I volontari dell'ingresso non hanno il pannello: hanno la loro pagina.
                  <Link href="/eventi/vivere-piu-a-lungo/admin/ingresso" className="btn-outline">
                    Sei all&apos;ingresso? Apri il check-in
                  </Link>
                )}
                <Link href="/eventi/vivere-piu-a-lungo" className="btn-outline">
                  Torna all&apos;evento
                </Link>
              </div>
            </div>
          </div>
        </div>
        <SiteFooter />
      </>
    );
  }

  const params = await searchParams;
  const tab = typeof params.tab === "string" ? params.tab : Array.isArray(params.tab) ? params.tab[0] : "";

  return (
    <>
      <Navbar />
      <div style={{ paddingTop: "90px", minHeight: "80vh" }} className="bg-light-gray">
        <div className="container mx-auto px-4 md:px-6 py-8 md:py-10">
          <AdminPanel
            schedaIniziale={schedaValida(tab)}
            filtriIniziali={{ ...leggiFiltri(params), q: "" }}
            oggi={giornataDiOggi()?.slug ?? null}
          />
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
