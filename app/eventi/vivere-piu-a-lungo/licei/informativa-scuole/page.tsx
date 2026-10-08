import type { Metadata } from "next";
import { DocumentoPagina } from "../DocumentoPagina";
import { INFORMATIVA_SCUOLE } from "../documenti";
import { INFORMATIVA_SCUOLE_PATH } from "../content";

export const metadata: Metadata = {
  title: INFORMATIVA_SCUOLE.titoloPagina,
  description: INFORMATIVA_SCUOLE.descrizione,
  alternates: { canonical: INFORMATIVA_SCUOLE_PATH },
};

export default function Page() {
  return <DocumentoPagina doc={INFORMATIVA_SCUOLE} />;
}
