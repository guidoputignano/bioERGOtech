import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { RiflessioniPassatePagina } from "../RiflessioniPassate";
import { LICEI_PATH, RIFLESSIONI_STUDENTE_PATH, TITOLO_RIFLESSIONI_PASSATE } from "../../content";

/**
 * Il link diretto all'avviso sulle riflessioni inviate prima dell'avviso
 * della lezione: i docenti lo danno agli studenti dalla loro console, e lo
 * studente lo legge e, se vuole, sceglie qui, senza email. Mostra solo la
 * card dell'avviso, la stessa dell'area: l'avviso conta come mostrato
 * quando e davvero a schermo, come nell'area. Riservata e fuori dai motori
 * di ricerca, come l'area.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${TITOLO_RIFLESSIONI_PASSATE} . Percorso licei`,
  robots: { index: false, follow: false },
};

export default async function RiflessioniStudentePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <Navbar />
        <div style={{ paddingTop: "110px", minHeight: "70vh" }} className="bg-light-gray">
          <div className="container mx-auto px-6 py-16">
            <div className="card max-w-md mx-auto text-center">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Area riservata</h1>
              <p className="text-gray-600 mb-6">
                Questa pagina è per gli studenti iscritti al percorso. Accedi con l&apos;email con
                cui ti sei iscritto: è la stessa con cui segui le lezioni.
              </p>
              <div className="flex flex-col gap-3">
                <Link
                  href={`/auth/login?returnTo=${encodeURIComponent(RIFLESSIONI_STUDENTE_PATH)}`}
                  className="btn-primary"
                >
                  Accedi
                </Link>
                <Link href={LICEI_PATH} className="btn-outline">
                  Torna al bando
                </Link>
              </div>
            </div>
          </div>
        </div>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div style={{ paddingTop: "90px", minHeight: "70vh" }} className="bg-light-gray">
        <div className="container mx-auto px-6 py-10">
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <h1 className="sr-only">{TITOLO_RIFLESSIONI_PASSATE}</h1>
            <RiflessioniPassatePagina />
          </div>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
