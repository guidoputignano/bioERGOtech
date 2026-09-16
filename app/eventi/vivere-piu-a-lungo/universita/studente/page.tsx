import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { StudenteUniversitaConsole } from "./StudenteUniversitaConsole";
import { NOTA_ACCESSO_CORSO_STUDENTE, UNIVERSITA_PATH } from "../content";

/**
 * La pagina autonoma dell'area del partecipante.
 *
 * Le stesse schede compaiono dentro il corso, una per lezione, nel punto in
 * cui la lezione le chiede. Questa pagina e il posto dove trovarle tutte
 * insieme quando non si sta seguendo una lezione, ed e per questo che la
 * console vive in un componente a parte: qui si monta intera, nel corso a
 * una sezione alla volta.
 *
 * Chi non ha una sessione non viene rimandato altrove. Un redirect verso la
 * pagina di accesso perderebbe per strada il motivo per cui e finito qui, e
 * chi non si e mai candidato si troverebbe davanti a un modulo di login
 * senza sapere a che cosa serve: i tre bottoni del riquadro coprono i tre
 * casi veri, cioe ho un account, non mi sono ancora candidato, sono
 * capitato qui per sbaglio.
 */

// La sessione e la configurazione delle fasi si leggono a ogni richiesta:
// una pagina prerenderizzata mostrerebbe a tutti lo stato di chi l'ha
// compilata per primo.
export const dynamic = "force-dynamic";

// Fuori dall'indice: e l'area di una persona, e le uniche schermate che i
// motori possono raggiungere sono quelle del bando.
export const metadata: Metadata = {
  title: "La tua area . Percorso universitario",
  robots: { index: false, follow: false },
};

export default async function StudenteUniversitaPage() {
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
              <p className="text-gray-600 mb-3">
                Questa è l&apos;area dei partecipanti al percorso universitario. Accedi con
                l&apos;email con cui ti sei candidato: è la stessa con cui segui il corso.
              </p>
              {/* Il caso piu frequente di chi non entra non e essere nel posto
                  sbagliato: e aver rimandato la scelta della password quando e
                  arrivata l'email di conferma. */}
              <p style={{ fontSize: 13, color: "var(--text-light)", lineHeight: 1.7 }} className="mb-6">
                {NOTA_ACCESSO_CORSO_STUDENTE}
              </p>
              <div className="flex flex-col gap-3">
                <Link href="/auth/login" className="btn-primary">
                  Accedi
                </Link>
                <Link href={`${UNIVERSITA_PATH}#candidatura`} className="btn-outline">
                  Non ti sei ancora candidato?
                </Link>
                <Link href={UNIVERSITA_PATH} className="btn-outline">
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
            <StudenteUniversitaConsole />
          </div>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
