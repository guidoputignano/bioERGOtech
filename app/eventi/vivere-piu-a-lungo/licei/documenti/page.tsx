import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { DOCUMENTI_PATH, LICEI, LICEI_PATH } from "../content";
import { dataDocumento, GUIDA_DOCUMENTI, type VoceGuida } from "../documenti";
import { StampaDocumento } from "../StampaDocumento";

/**
 * Tutti i documenti del percorso in un posto solo, con chi li legge, chi li
 * firma e come. Il primo gruppo riprende la «Guida operativa per scuole e
 * docenti referenti». I testi sono in `../documenti.ts`, accanto ai documenti
 * a cui rimandano, e le date vengono dai documenti stessi: quando un testo
 * cambia, l'indice lo dice da solo.
 */

export const metadata: Metadata = {
  title: `Documenti del percorso | ${LICEI.titolo}`,
  description:
    "Informative privacy, regolamento e moduli del percorso online Biotecnologie e Intelligenza Artificiale: che cosa si legge, che cosa si firma e chi lo firma.",
  alternates: { canonical: DOCUMENTI_PATH },
};

const COLORE_COME: Record<VoceGuida["come"], { bg: string; fg: string }> = {
  "Da leggere": { bg: "#F1F4F8", fg: "#4A5568" },
  "Da firmare": { bg: "var(--primary-light)", fg: "var(--primary-dark)" },
  "Si accetta online": { bg: "#EEF3FF", fg: "#28456F" },
};

export default function Page() {
  return (
    <>
      <div className="no-print">
        <Navbar />
      </div>
      <div className="doc-pagina" style={{ paddingTop: "70px" }}>
        <section className="section">
          <div className="container mx-auto px-6 max-w-3xl">
            <span className="badge mb-3" style={{ background: "var(--primary-light)", color: "var(--primary-dark)" }}>
              Documenti
            </span>
            <h1 className="text-4xl font-bold mb-3 text-gray-800">Documenti del percorso</h1>
            <p className="text-gray-600 mb-4">
              Percorso online «Biotecnologie e Intelligenza Artificiale». Qui trovi tutti i
              documenti nella versione in vigore e, per ognuno, che cosa fare: leggerlo, firmarlo
              o accettarlo online.
            </p>
            <div className="mb-12">
              <StampaDocumento etichetta="Stampa questa guida" />
            </div>

            <div className="space-y-12">
              {GUIDA_DOCUMENTI.map((g) => (
                <div key={g.gruppo}>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">{g.gruppo}</h2>
                  <p className="text-gray-600 mb-5">{g.sommario}</p>
                  <ol className="space-y-4" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {g.voci.map((v) => (
                      <li key={v.href} className="card-sm" style={{ breakInside: "avoid" }}>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-2">
                          <span
                            className="badge"
                            style={{ background: COLORE_COME[v.come].bg, color: COLORE_COME[v.come].fg }}
                          >
                            {v.come}
                          </span>
                          {v.aggiornato && (
                            <span className="text-xs text-gray-500">
                              Aggiornato il {dataDocumento(v.aggiornato)}
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold mb-2">
                          <Link href={v.href} style={{ color: "var(--text-dark)" }}>
                            {v.titolo}
                          </Link>
                        </h3>
                        <ul className="list-disc pl-5 space-y-1 text-gray-700">
                          {v.passi.map((x) => (
                            <li key={x}>{x}</li>
                          ))}
                        </ul>
                        <Link
                          href={v.href}
                          className="no-print inline-block mt-3 text-sm"
                          style={{ color: "var(--primary-dark)", fontWeight: 600 }}
                        >
                          Apri il documento
                        </Link>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>

            <p className="text-sm text-gray-500 mt-12">
              Ogni documento riporta la data dell&apos;ultimo aggiornamento. Per domande sui dati
              personali scrivi a{" "}
              <a href="mailto:info@bioergotech.org" style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
                info@bioergotech.org
              </a>
              .{" "}
              <Link href={LICEI_PATH} className="no-print" style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
                Torna al percorso
              </Link>
            </p>
          </div>
        </section>
      </div>
      <div className="no-print">
        <SiteFooter />
      </div>
    </>
  );
}
