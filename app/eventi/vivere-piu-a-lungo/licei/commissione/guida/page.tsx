import type { Metadata } from "next";
import { DocumentoPagina } from "../../DocumentoPagina";
import { GUIDA_COMMISSIONE, GUIDA_COMMISSIONE_PATH } from "./contenuto";

export const metadata: Metadata = {
  title: GUIDA_COMMISSIONE.titoloPagina,
  description: GUIDA_COMMISSIONE.descrizione,
  alternates: { canonical: GUIDA_COMMISSIONE_PATH },
  // Serve ai giudici, non a chi cerca: resta fuori dai motori di ricerca.
  robots: { index: false, follow: false },
};

/** La guida per i giudici, accanto alla loro area. Si stampa anche in PDF. */
export default function Page() {
  return <DocumentoPagina doc={GUIDA_COMMISSIONE} indice={false} />;
}
