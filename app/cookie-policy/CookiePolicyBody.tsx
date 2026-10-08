import Link from "next/link";
import { CookieSettingsButton } from "@/components/cookie-settings-button";
import { GUIDE_BROWSER, type CookiePolicy } from "./content";

/** Corpo della cookie policy, uguale nelle due lingue: cambia solo il testo. */
export function CookiePolicyBody({ t }: { t: CookiePolicy }) {
  return (
    <div className="container mx-auto px-6 max-w-3xl">
      <h1 className="text-4xl font-bold mb-2 text-gray-800">{t.titolo}</h1>
      <p className="text-sm text-gray-500 mb-3">{t.aggiornamento}</p>
      <p className="mb-10">
        <Link href={t.altraLingua.href} style={{ color: "var(--primary)", fontWeight: 600, fontSize: 14 }}>
          {t.altraLingua.etichetta}
        </Link>
      </p>

      <div className="prose max-w-none text-gray-700 space-y-8">
        {t.intro.map((p) => (
          <p key={p}>{p}</p>
        ))}

        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">{t.chiSiamo.h}</h2>
          <p>{t.chiSiamo.testo}</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">{t.categorie.h}</h2>
          <p>{t.categorie.intro}</p>
          <div className="space-y-5 mt-4">
            {t.categorie.elenco.map((c) => (
              <div key={c.titolo} className="rounded-2xl border border-gray-100 p-5 bg-gray-50">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h3 className="text-base font-semibold text-gray-800">{c.titolo}</h3>
                  <span className="badge" style={{ background: "var(--primary-light)", color: "var(--primary-dark)", fontSize: 11 }}>
                    {c.stato}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{c.descrizione}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        {[t.colonne.nome, t.colonne.fornitore, t.colonne.scopo, t.colonne.durata].map((h) => (
                          <th key={h} className="text-left py-2 pr-4 font-semibold text-gray-700 text-xs uppercase tracking-wide">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {c.voci.map((v) => (
                        <tr key={v.nome} className="border-b border-gray-100 last:border-0 align-top">
                          <td className="py-2 pr-4 font-mono text-xs text-gray-700">{v.nome}</td>
                          <td className="py-2 pr-4 text-gray-600">{v.fornitore}</td>
                          <td className="py-2 pr-4 text-gray-600">{v.scopo}</td>
                          <td className="py-2 text-gray-600">{v.durata}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {c.nota && <p className="text-xs text-gray-500 mt-3">{c.nota}</p>}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">{t.terzeParti.h}</h2>
          <ul className="list-disc pl-5 space-y-2">
            {t.terzeParti.voci.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">{t.gestione.h}</h2>
          {t.gestione.paragrafi.map((p) => (
            <p key={p} className="mb-3">{p}</p>
          ))}
          <CookieSettingsButton label={t.gestione.pulsante} style={{ color: "var(--primary-dark)", fontWeight: 700 }} />
          <p className="mt-4 text-sm">{t.gestione.browser}</p>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            {GUIDE_BROWSER.map((b) => (
              <li key={b.nome}>
                <a href={b.href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>
                  {b.nome}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {[t.base, t.aggiornamenti, t.contatti].map((s) => (
          <div key={s.h}>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">{s.h}</h2>
            <p>{s.testo}</p>
          </div>
        ))}

        <div className="pt-4 border-t border-gray-100">
          <Link href={t.privacy.href} style={{ color: "var(--primary)", fontWeight: 600, fontSize: 14 }}>
            {t.privacy.etichetta}
          </Link>
        </div>
      </div>
    </div>
  );
}
