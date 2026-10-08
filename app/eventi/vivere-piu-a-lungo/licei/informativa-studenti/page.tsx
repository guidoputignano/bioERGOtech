import type { Metadata } from "next";
import { DocumentoPagina } from "../DocumentoPagina";
import { INFORMATIVA_STUDENTI } from "../documenti";
import { INFORMATIVA_STUDENTI_PATH } from "../content";

export const metadata: Metadata = {
  title: INFORMATIVA_STUDENTI.titoloPagina,
  description: INFORMATIVA_STUDENTI.descrizione,
  alternates: { canonical: INFORMATIVA_STUDENTI_PATH },
};

export default function Page() {
  return <DocumentoPagina doc={INFORMATIVA_STUDENTI} />;
}
