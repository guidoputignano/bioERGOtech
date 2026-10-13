import type { Metadata } from "next";
import { DocumentoPagina } from "../DocumentoPagina";
import { ISTRUZIONI_DOCENTE } from "../documenti";
import { ISTRUZIONI_DOCENTE_PATH } from "../content";

export const metadata: Metadata = {
  title: ISTRUZIONI_DOCENTE.titoloPagina,
  description: ISTRUZIONI_DOCENTE.descrizione,
  alternates: { canonical: ISTRUZIONI_DOCENTE_PATH },
};

export default function Page() {
  return <DocumentoPagina doc={ISTRUZIONI_DOCENTE} />;
}
