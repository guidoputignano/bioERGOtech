import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { dataDocumento, type Documento } from "./documenti";
import { DOCUMENTI_PATH } from "./content";
import { StampaDocumento } from "./StampaDocumento";

/**
 * Impaginazione comune ai documenti pubblici del percorso (informative,
 * regolamento, moduli da firmare): stessi stili dell'informativa privacy del
 * sito, così chi passa dall'una all'altra non cambia lettura.
 *
 * Ogni pagina si stampa pulita: navbar, footer e banner hanno `no-print`. I
 * documenti da firmare mostrano le righe da compilare, che sullo schermo
 * dicono che cosa serve e sul foglio diventano gli spazi per la firma.
 */
export function DocumentoPagina({ doc, indice = true }: { doc: Documento; indice?: boolean }) {
  return (
    <>
      <div className="no-print">
        <Navbar />
      </div>
      <div className="doc-pagina" style={{ paddingTop: "70px" }}>
        <section className="section">
          <div className="container mx-auto px-6 max-w-3xl">
            <span className="badge mb-3" style={{ background: "var(--primary-light)", color: "var(--primary-dark)" }}>
              {doc.occhiello}
            </span>
            <h1 className="text-4xl font-bold mb-3 text-gray-800">{doc.titolo}</h1>
            <p className="text-gray-600 mb-4">{doc.intro}</p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 mb-10">
              <span className="text-sm text-gray-500">Ultimo aggiornamento: {dataDocumento(doc.aggiornato)}</span>
              <StampaDocumento />
            </div>

            {doc.modulo?.campiInizio && <Campi campi={doc.modulo.campiInizio} />}

            <div className="prose max-w-none text-gray-700 space-y-8">
              {doc.sezioni.map((s) => (
                <div key={s.h}>
                  <h2 className="text-xl font-semibold text-gray-800 mb-3">{s.h}</h2>
                  <div className="space-y-3">
                    {s.p?.map((x) => <p key={x}>{x}</p>)}
                    {s.ul && (
                      <ul className="list-disc pl-5 space-y-1">
                        {s.ul.map((x) => <li key={x}>{x}</li>)}
                      </ul>
                    )}
                    {s.dopo?.map((x) => <p key={x}>{x}</p>)}
                  </div>
                </div>
              ))}
            </div>

            {doc.modulo && (
              <div className="mt-10">
                <Campi campi={doc.modulo.campiFine} />
                {doc.modulo.nota && <p className="text-sm text-gray-600">{doc.modulo.nota}</p>}
              </div>
            )}

            {indice && (
              <p className="no-print text-sm text-gray-500 mt-12">
                Tutti i documenti del percorso, con chi li firma e come, sono nella pagina{" "}
                <Link href={DOCUMENTI_PATH} style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
                  Documenti del percorso
                </Link>
                .
              </p>
            )}
          </div>
        </section>
      </div>
      <div className="no-print">
        <SiteFooter />
      </div>
    </>
  );
}

/** Le righe da compilare a mano: etichetta e linea, una per riga. */
function Campi({ campi }: { campi: string[] }) {
  return (
    <dl className="doc-campi mb-10">
      {campi.map((c) => (
        <div key={c} className="doc-campo">
          <dt>{c}</dt>
          <dd aria-hidden="true" />
        </div>
      ))}
    </dl>
  );
}
