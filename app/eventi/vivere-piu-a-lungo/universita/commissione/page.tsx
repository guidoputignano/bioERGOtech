import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { CommissioneUniversitaConsole } from "./CommissioneUniversitaConsole";
import { UNIVERSITA_PATH } from "../content";

/**
 * L'area della Commissione del percorso universitario.
 *
 * Chi arriva qui senza sessione non viene rimandato alla pagina di accesso.
 * Un commissario riceve questo indirizzo in una email di nomina, spesso lo
 * apre dal telefono e su un browser dove non e mai entrato: un redirect gli
 * toglierebbe di mezzo l'unica riga che spiega dove e finito, e si
 * troverebbe davanti a un modulo di login senza sapere a che cosa serve. Il
 * riquadro dice prima che area e, e solo dopo offre il bottone.
 *
 * Il rimando e al bando e non all'area del partecipante: un commissario non
 * ha una candidatura, e mandarlo li vorrebbe dire mandarlo su una schermata
 * che gli risponde che non risulta iscritto a niente.
 */

// La sessione, le schede e lo stato della fase di valutazione si leggono a
// ogni richiesta. Una pagina prerenderizzata mostrerebbe a tutti i
// commissari le schede del primo che l'ha aperta, che qui non e un
// dettaglio di prestazioni ma il contrario esatto del modulo.
export const dynamic = "force-dynamic";

// Fuori dall'indice: quello che si valuta qui non e ancora pubblico, e
// l'art. 9 chiede che dati, risultati e materiali tutelabili siano valutati
// prima di essere divulgati.
export const metadata: Metadata = {
  title: "Commissione di valutazione . Percorso universitario",
  robots: { index: false, follow: false },
};

export default async function CommissioneUniversitaPage() {
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
                Questa area è riservata ai membri della Commissione di valutazione del percorso
                universitario. Acceda con l&apos;email a cui ha ricevuto la nomina.
              </p>
              <div className="flex flex-col gap-3">
                <Link href="/auth/login" className="btn-primary">
                  Accedi
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
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <CommissioneUniversitaConsole />
          </div>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
