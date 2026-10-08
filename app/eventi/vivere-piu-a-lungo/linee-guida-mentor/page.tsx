import type { Metadata } from "next";
import { DocumentoPagina } from "../licei/DocumentoPagina";
import { DOCUMENTO_LINEE_GUIDA_MENTOR, LINEE_GUIDA_MENTOR_PATH } from "./content";

/**
 * Le linee guida per i mentor, pubbliche.
 *
 * Stanno a livello dell'evento e non dentro `universita/` o `licei/` perche
 * valgono per entrambi i percorsi: lo stesso mentor puo essere contattato da
 * un liceale e da uno studente universitario, e le regole non cambiano con
 * chi scrive. L'impaginazione e quella dei documenti dei licei (informative
 * e regolamento), cosi chi passa dall'uno all'altro non cambia lettura.
 */

export const metadata: Metadata = {
  title: DOCUMENTO_LINEE_GUIDA_MENTOR.titoloPagina,
  description: DOCUMENTO_LINEE_GUIDA_MENTOR.descrizione,
  alternates: { canonical: LINEE_GUIDA_MENTOR_PATH },
};

export default function Page() {
  return <DocumentoPagina doc={DOCUMENTO_LINEE_GUIDA_MENTOR} />;
}
