import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { leggiChiusuraPercorso, liceiAdminClient } from "@/lib/eventi/licei-server";
import { leggiFirmaInvito, leggiInvito } from "@/lib/eventi/licei-questionario";
import { STILE_MODULO } from "../../modulo-utils";
import { LICEI } from "../content";
import { QUESTIONARIO_CHIUDE_LABEL, questionarioAperto, type RuoloQuestionario } from "./domande";
import { QuestionarioForm } from "./QuestionarioForm";
import { STILE_QUESTIONARIO } from "./stile";

/**
 * Il questionario di fine percorso, dal link personale dell'email
 * (`?t=<token firmato>`): nessun accesso, nessun nome sulla pagina. Il
 * server controlla la firma e l'invito e passa al modulo solo il ruolo.
 *
 * Il token e nell'indirizzo: la pagina non va indicizzata, non passa
 * l'indirizzo ai siti esterni ed e esclusa da Analytics e Ads
 * (components/cookie-banner.tsx).
 *
 * `?anteprima=studente` o `?anteprima=docente`: le domande come le vede chi
 * risponde, senza salvare niente. Per lo staff, dal pannello.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Questionario di fine percorso . Percorso licei",
  description: `Il questionario anonimo di fine percorso di ${LICEI.titolo}.`,
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  referrer: "same-origin",
};

type Stato =
  | { tipo: "modulo"; ruolo: RuoloQuestionario; token: string | null; anteprima: boolean }
  | { tipo: "non_valido" }
  | { tipo: "gia_risposto"; ruolo: RuoloQuestionario }
  | { tipo: "chiuso"; ruolo: RuoloQuestionario | null }
  | { tipo: "errore" };

async function carica(token: string | null): Promise<Stato> {
  const id = leggiFirmaInvito(token);
  if (!id || !token) return { tipo: "non_valido" };
  const db = liceiAdminClient();
  if (!db) return { tipo: "errore" };
  try {
    const letto = await leggiInvito(db, id);
    if (!letto.presente) return { tipo: "errore" };
    const invito = letto.invito;
    if (!invito) return { tipo: "non_valido" };
    if (invito.risposto) return { tipo: "gia_risposto", ruolo: invito.ruolo };
    if (!questionarioAperto() || (await leggiChiusuraPercorso(db)).chiusoAt) return { tipo: "chiuso", ruolo: invito.ruolo };
    return { tipo: "modulo", ruolo: invito.ruolo, token: token.trim(), anteprima: false };
  } catch (err) {
    console.error("Questionario licei: invito non letto:", err instanceof Error ? err.message : String(err));
    return { tipo: "errore" };
  }
}

export default async function QuestionarioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = await searchParams;
  const anteprima = q.anteprima === "studente" || q.anteprima === "docente" ? q.anteprima : null;
  const stato: Stato = anteprima
    ? { tipo: "modulo", ruolo: anteprima, token: null, anteprima: true }
    : await carica(typeof q.t === "string" ? q.t : null);

  return (
    <>
      <Navbar />
      <main className="vpq-pagina" translate="no">
        <style>{STILE_MODULO}</style>
        <style>{STILE_QUESTIONARIO}</style>
        <div className="vpq-contenitore">
          {stato.tipo === "modulo" ? (
            <QuestionarioForm ruolo={stato.ruolo} token={stato.token} anteprima={stato.anteprima} />
          ) : (
            <Avviso stato={stato} />
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

const CONTATTO = (
  <a href="mailto:info@bioergotech.org">info@bioergotech.org</a>
);

function Avviso({ stato }: { stato: Exclude<Stato, { tipo: "modulo" }> }) {
  const lei = "ruolo" in stato && stato.ruolo === "docente";
  let icona = "fa-link-slash";
  let titolo = "Il link non è valido";
  let testo: React.ReactNode = (
    <>
      Il questionario si apre dal pulsante dell&apos;email ricevuta, con il link completo. Se il problema resta, scrivere a{" "}
      {CONTATTO}.
    </>
  );
  if (stato.tipo === "gia_risposto") {
    icona = "fa-check";
    titolo = lei ? "Ha già risposto, grazie" : "Hai già risposto, grazie";
    testo = lei
      ? "Le sue risposte sono arrivate: il questionario si compila una volta sola."
      : "Le tue risposte sono arrivate: il questionario si compila una volta sola.";
  } else if (stato.tipo === "chiuso") {
    icona = "fa-lock";
    titolo = "Il questionario è chiuso";
    testo = `Si poteva rispondere fino a ${QUESTIONARIO_CHIUDE_LABEL}. Grazie comunque per ${lei ? "la sua attenzione" : "la tua attenzione"}.`;
  } else if (stato.tipo === "errore") {
    icona = "fa-triangle-exclamation";
    titolo = "Non riusciamo ad aprire il questionario";
    testo = "Riprova tra qualche minuto, con lo stesso link. Se il problema resta, scrivi a info@bioergotech.org.";
  }
  return (
    <div className="vpq-avviso">
      <span className="icon-circle icon-circle-primary" aria-hidden="true">
        <i className={`fas ${icona}`} />
      </span>
      <h1 className="vpq-avviso-titolo">{titolo}</h1>
      <p className="vpq-avviso-testo">{testo}</p>
    </div>
  );
}
