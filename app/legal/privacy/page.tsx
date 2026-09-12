import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import type { Metadata } from "next";
import { INFORMATIVA } from "./content";
import { InformativaBody } from "./InformativaBody";

const t = INFORMATIVA.en;

export const metadata: Metadata = {
  title: t.titoloPagina,
  description: t.descrizionePagina,
  alternates: {
    canonical: "/legal/privacy",
    languages: {
      en: "/legal/privacy",
      it: "/legal/informativa-privacy",
    },
  },
};

export default function PrivacyPolicy() {
  return (
    <>
      <Navbar />
      <div style={{ paddingTop: "70px" }}>
        <section className="section">
          <InformativaBody t={t} />
        </section>
      </div>
      <SiteFooter />
    </>
  );
}
