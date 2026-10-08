import type { Metadata } from "next";
import { DocumentoPagina } from "../DocumentoPagina";
import { REGOLAMENTO } from "../documenti";
import { REGOLAMENTO_PATH } from "../content";

export const metadata: Metadata = {
  title: REGOLAMENTO.titoloPagina,
  description: REGOLAMENTO.descrizione,
  alternates: { canonical: REGOLAMENTO_PATH },
};

export default function Page() {
  return <DocumentoPagina doc={REGOLAMENTO} />;
}
