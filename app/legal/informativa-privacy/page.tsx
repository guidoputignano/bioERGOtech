import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import type { Metadata } from "next";
import { INFORMATIVA } from "../privacy/content";
import { InformativaBody } from "../privacy/InformativaBody";

/**
 * L'informativa in italiano.
 *
 * Pagina separata e non traduzione della stessa rotta: `/legal/privacy` e
 * gia indicizzata e non va toccata. Qui rimandano i moduli in italiano, cioe
 * adesione dell'istituto, iscrizione dello studente e i due bandi, perche il
 * consenso lo prestano scuole, ragazzi in larga parte minorenni e le loro
 * famiglie, e rimandarli a un documento in inglese renderebbe informato solo
 * a meta un consenso che deve esserlo del tutto.
 *
 * I testi stanno in `../privacy/content.ts` insieme a quelli inglesi: due
 * informative mantenute a mano divergono, e una che dice due cose diverse in
 * due lingue e peggio di una in una lingua sola.
 */

const t = INFORMATIVA.it;

export const metadata: Metadata = {
  title: t.titoloPagina,
  description: t.descrizionePagina,
  alternates: {
    canonical: "/legal/informativa-privacy",
    languages: {
      it: "/legal/informativa-privacy",
      en: "/legal/privacy",
    },
  },
};

export default function InformativaPrivacy() {
  return (
    <>
      <Navbar />
      <div style={{ paddingTop: "70px" }} lang="it">
        <section className="section">
          <InformativaBody t={t} />
        </section>
      </div>
      <SiteFooter />
    </>
  );
}
