import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import type { Metadata } from "next";
import { COOKIE_POLICY } from "../content";
import { CookiePolicyBody } from "../CookiePolicyBody";

const t = COOKIE_POLICY.it;

export const metadata: Metadata = {
  title: t.titoloPagina,
  description: t.descrizionePagina,
  alternates: {
    canonical: "/cookie-policy/it",
    languages: { en: "/cookie-policy", it: "/cookie-policy/it" },
  },
};

export default function CookiePolicyIt() {
  return (
    <>
      <Navbar />
      <div style={{ paddingTop: "70px" }}>
        <section className="section">
          <CookiePolicyBody t={t} />
        </section>
      </div>
      <SiteFooter />
    </>
  );
}
