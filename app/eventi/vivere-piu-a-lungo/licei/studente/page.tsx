import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { StudenteConsole } from "./StudenteConsole";
import { ISCRIZIONE_PATH, LICEI_PATH } from "../content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "La tua area . Percorso licei",
  robots: { index: false, follow: false },
};

export default async function StudentePage() {
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
                Questa è l&apos;area degli studenti iscritti al percorso. Accedi con l&apos;email
                con cui ti sei iscritto: è la stessa con cui segui le lezioni.
              </p>
              <div className="flex flex-col gap-3">
                <Link href="/auth/login" className="btn-primary">
                  Accedi
                </Link>
                <Link href={ISCRIZIONE_PATH} className="btn-outline">
                  Non sei ancora iscritto?
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
      <div style={{ paddingTop: "90px", minHeight: "80vh" }} className="bg-light-gray">
        <div className="container mx-auto px-6 py-10">
          <div style={{ maxWidth: 820, margin: "0 auto" }}>
            <StudenteConsole />
          </div>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
