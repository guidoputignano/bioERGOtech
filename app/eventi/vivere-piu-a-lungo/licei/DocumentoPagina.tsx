import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import type { Documento } from "./documenti";

/**
 * Impaginazione comune ai documenti pubblici del percorso (informative e
 * regolamento): stessi stili dell'informativa privacy del sito, così chi passa
 * dall'una all'altra non cambia lettura.
 */
export function DocumentoPagina({ doc }: { doc: Documento }) {
  return (
    <>
      <Navbar />
      <div style={{ paddingTop: "70px" }}>
        <section className="section">
          <div className="container mx-auto px-6 max-w-3xl">
            <span className="badge mb-3" style={{ background: "var(--primary-light)", color: "var(--primary-dark)" }}>
              {doc.occhiello}
            </span>
            <h1 className="text-4xl font-bold mb-3 text-gray-800">{doc.titolo}</h1>
            <p className="text-gray-600 mb-10">{doc.intro}</p>

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
          </div>
        </section>
      </div>
      <SiteFooter />
    </>
  );
}
