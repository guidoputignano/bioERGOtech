import type { Metadata } from "next";
import { Suspense } from "react";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { DiventaGiudice } from "./DiventaGiudice";

export const metadata: Metadata = {
  title: "Giudice della Commissione . Percorso licei",
  robots: { index: false, follow: false },
};

/** La pagina del pulsante "Si, partecipo come giudice" dell'email ai mentor. */
export default function DiventaGiudicePage() {
  return (
    <>
      <Navbar />
      <div style={{ paddingTop: "90px", minHeight: "80vh" }} className="bg-light-gray">
        <div className="container mx-auto px-6 py-10">
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <Suspense fallback={<p className="text-gray-600">Caricamento…</p>}>
              <DiventaGiudice />
            </Suspense>
          </div>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
