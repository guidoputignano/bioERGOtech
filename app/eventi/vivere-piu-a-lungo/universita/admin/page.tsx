import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { UniversitaAdminTabs } from "./UniversitaAdminTabs";
import { UNIVERSITA_PATH } from "../content";

/**
 * Il pannello staff del percorso universitario.
 *
 * Chi non e admin non viene rimandato altrove, come nel gemello dei licei e
 * per la stessa ragione: un redirect verso la pagina di accesso toglie di
 * mezzo l'unica riga che spiega dove si e finiti, e chi ci arriva da un
 * segnalibro vecchio si troverebbe davanti a un modulo di login senza
 * sapere a che cosa serve. Il riquadro dice prima che area e, poi offre il
 * bottone.
 *
 * Il controllo si fa qui e si rifa in ogni rotta che il pannello chiama:
 * questa pagina decide solo che cosa si vede, e nascondere una schermata
 * non e mai una difesa. Le difese vere sono i `getEventAdminClient` delle
 * cinque rotte sotto `/api/eventi/universita/admin`.
 */

// La sessione, la configurazione delle fasi e i contatori si leggono a ogni
// richiesta. Una pagina prerenderizzata mostrerebbe a chiunque i numeri
// congelati alla compilazione, che su un pannello di istruttoria e peggio
// che non mostrarli.
export const dynamic = "force-dynamic";

// Fuori dall'indice: qui dentro ci sono nomi, email e note interne su
// persone che si sono candidate a un bando, e nessun motore ha motivo di
// vederne nemmeno il titolo.
export const metadata: Metadata = {
  title: "Percorso universitario . Pannello staff",
  robots: { index: false, follow: false },
};

export default async function UniversitaAdminPage() {
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
          <div className="container mx-auto px-6 py-16">
            <div className="card max-w-md mx-auto text-center">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Accesso riservato</h1>
              <p className="text-gray-600 mb-3">
                Questa area è riservata allo staff della Fondazione. Accedi con un account
                amministratore.
              </p>
              {/* Un commissario e un mentor arrivano qui per errore piu spesso
                  di quanto sembri: hanno ricevuto un indirizzo del percorso e
                  provano quello che ricordano. La riga dice loro che la porta
                  giusta e un'altra, invece di lasciarli sul login. */}
              <p
                style={{ fontSize: 13, color: "var(--text-light)", lineHeight: 1.7 }}
                className="mb-6"
              >
                Se fai parte della Commissione o sei un mentor del percorso, la tua area è un
                altro indirizzo: lo trovi nell&apos;email con cui ti abbiamo scritto.
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
          <UniversitaAdminTabs />
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
