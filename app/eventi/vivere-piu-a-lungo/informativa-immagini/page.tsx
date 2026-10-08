import Link from "next/link";
import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import {
  CONTITOLARI,
  INFORMATIVA_IMMAGINI as t,
  INFORMATIVA_IMMAGINI_PATH,
  SCELTE_IMMAGINI,
} from "./content";
import { REFERENTE_PATH } from "../licei/content";

export const metadata: Metadata = {
  title: t.titoloPagina,
  description: t.descrizionePagina,
  alternates: { canonical: INFORMATIVA_IMMAGINI_PATH },
};

function Sezione({ h, p }: { h: string; p: readonly string[] }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-3">{h}</h2>
      <div className="space-y-3">
        {p.map((x) => (
          <p key={x}>{x}</p>
        ))}
      </div>
    </div>
  );
}

export default function InformativaImmaginiPage() {
  return (
    <>
      <Navbar />
      <div style={{ paddingTop: "70px" }}>
        <section className="section">
          <div className="container mx-auto px-6 max-w-3xl">
            <span className="badge mb-3" style={{ background: "var(--primary-light)", color: "var(--primary-dark)" }}>
              Privacy
            </span>
            <h1 className="text-4xl font-bold mb-2 text-gray-800">{t.titolo}</h1>
            <p className="text-sm text-gray-500 mb-10">{t.sottotitolo}</p>

            <div className="prose max-w-none text-gray-700 space-y-8">
              {t.intro.map((x) => (
                <p key={x}>{x}</p>
              ))}

              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">{t.chi.h}</h2>
                <p className="mb-3">{t.chi.intro}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {CONTITOLARI.map((c) => (
                    <div key={c.nome} className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-sm">
                      <p><strong>{c.nome}</strong></p>
                      <p>{c.indirizzo}</p>
                      <p>{c.fiscale}</p>
                      <p className="mt-2">
                        <a href={`mailto:${c.email}`} style={{ color: "var(--primary)" }}>
                          {c.email}
                        </a>
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-sm">{t.chi.nota}</p>
              </div>

              {t.sezioniPrima.map((s) => (
                <Sezione key={s.h} h={s.h} p={s.p} />
              ))}

              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">{t.finalita.h}</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 pr-4 font-semibold text-gray-700">Scelta</th>
                        <th className="text-left py-3 pr-4 font-semibold text-gray-700">Dove possono comparire</th>
                        <th className="text-left py-3 pr-4 font-semibold text-gray-700">Base giuridica</th>
                        <th className="text-left py-3 font-semibold text-gray-700">Durata</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {SCELTE_IMMAGINI.map((s) => (
                        <tr key={s.id}>
                          <td className="py-3 pr-4 text-gray-800 font-semibold">
                            {s.id}. {s.titolo}
                          </td>
                          <td className="py-3 pr-4 text-gray-600">{s.dove}</td>
                          <td className="py-3 pr-4 text-gray-600">{s.base}</td>
                          <td className="py-3 text-gray-600 whitespace-nowrap">{s.durata}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-sm">{t.finalita.nota}</p>
              </div>

              {t.sezioniDopo.map((s) => (
                <Sezione key={s.h} h={s.h} p={s.p} />
              ))}

              <div className="card" style={{ background: "var(--primary-light)" }}>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">{t.moduli.h}</h2>
                <p className="mb-3">{t.moduli.p}</p>
                <Link href={REFERENTE_PATH} style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
                  Vai all&apos;area del docente referente
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
      <SiteFooter />
    </>
  );
}
