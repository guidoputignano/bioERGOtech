import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { ReferenteConsole } from "./ReferenteConsole";
import { LICEI_PATH, REFERENTE_PATH } from "../content";
import { prossimoTalk, schedaTalk } from "../../talk/content";
import { TalkAreaCard } from "../../talk/TalkAreaCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Area del docente referente . Percorso licei",
  robots: { index: false, follow: false },
};

export default async function ReferentePage() {
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
                Questa area è del docente referente dell&apos;istituto e dei docenti del progetto
                che il referente indica. Acceda con l&apos;email con cui ha trasmesso l&apos;adesione,
                o con quella a cui è arrivato l&apos;invito.
              </p>
              <div className="flex flex-col gap-3">
                <Link href={`/auth/login?returnTo=${encodeURIComponent(REFERENTE_PATH)}`} className="btn-primary">
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

  // Il prossimo talk, gia ripulito del link della riunione: la console e un
  // componente client.
  const talk = prossimoTalk();

  return (
    <>
      <Navbar />
      <div style={{ paddingTop: "90px", minHeight: "80vh" }} className="bg-light-gray">
        <div className="container mx-auto px-6 py-10">
          <ReferenteConsole
            talk={talk ? <TalkAreaCard talk={schedaTalk(talk)} contesto="docente" /> : null}
          />
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
