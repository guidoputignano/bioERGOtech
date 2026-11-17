import type { Metadata } from "next";
import { Suspense } from "react";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { CandidaturaGiudice } from "./CandidaturaGiudice";

export const metadata: Metadata = {
  title: "Candidatura alla Commissione . Percorso licei",
  robots: { index: false, follow: false },
};

/** La pagina del link di invito per i giudici. La Fondazione approva ogni candidatura. */
export default function CandidaturaPage() {
  return (
    <>
      <Navbar />
      <div style={{ paddingTop: "90px", minHeight: "80vh" }} className="bg-light-gray">
        <div className="container mx-auto px-6 py-10">
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <Suspense fallback={<p className="text-gray-600">Caricamento…</p>}>
              <CandidaturaGiudice />
            </Suspense>
          </div>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
