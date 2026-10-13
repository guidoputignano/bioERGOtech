import type { Metadata } from "next";
import { DocumentoPagina } from "../DocumentoPagina";
import { ADESIONE_SCUOLA } from "../documenti";
import { ADESIONE_SCUOLA_PATH } from "../content";

export const metadata: Metadata = {
  title: ADESIONE_SCUOLA.titoloPagina,
  description: ADESIONE_SCUOLA.descrizione,
  alternates: { canonical: ADESIONE_SCUOLA_PATH },
};

export default function Page() {
  return <DocumentoPagina doc={ADESIONE_SCUOLA} />;
}
