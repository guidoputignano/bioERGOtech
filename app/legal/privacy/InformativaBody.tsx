import Link from "next/link";
import type { Informativa } from "./content";

/**
 * Il corpo dell'informativa, uguale nelle due lingue.
 *
 * Prende i testi e non li conosce: la pagina inglese e quella italiana
 * passano il proprio blocco e ottengono la stessa struttura. Cosi una
 * sezione aggiunta compare in entrambe, e non c'e modo di aggiornarne una
 * sola per distrazione.
 */
export function InformativaBody({ t }: { t: Informativa }) {
  return (
    <div className="container mx-auto px-6 max-w-3xl">
      <h1 className="text-4xl font-bold mb-2 text-gray-800">{t.titolo}</h1>
      <p className="text-sm text-gray-500 mb-3">{t.aggiornamento}</p>
      <p className="mb-10">
        <Link
          href={t.altraLingua.href}
          style={{ color: "var(--primary)", fontWeight: 600, fontSize: 14 }}
        >
          {t.altraLingua.etichetta}
        </Link>
      </p>

      <div className="prose max-w-none text-gray-700 space-y-8">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">{t.titolare.h}</h2>
          <p>{t.titolare.intro}</p>
          <div className="mt-3 p-4 rounded-xl bg-gray-50 border border-gray-100 text-sm">
            <p><strong>Fondazione bioERGOtech ETS</strong></p>
            <p>Via Ciro Giovinazzi 70, 74123 Taranto, Italy</p>
            <p>C.F. 90287640735</p>
            <p className="mt-2">
              <a href="mailto:info@bioergotech.org" style={{ color: "var(--primary)" }}>
                info@bioergotech.org
              </a>
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">{t.raccolta.h}</h2>
          <p className="mb-3">{t.raccolta.intro}</p>
          <div className="space-y-3">
            {t.raccolta.gruppi.map((g) => (
              <div key={g.titolo} className="rounded-xl border border-gray-100 p-4 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">{g.titolo}</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                  {g.voci.map((v) => <li key={v}>{v}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">{t.finalita.h}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 pr-4 font-semibold text-gray-700">{t.finalita.colFinalita}</th>
                  <th className="text-left py-3 pr-4 font-semibold text-gray-700">{t.finalita.colBase}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {t.finalita.righe.map((r) => (
                  <tr key={r.finalita}>
                    <td className="py-3 pr-4 text-gray-700">{r.finalita}</td>
                    <td className="py-3 text-gray-600">{r.base}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm">{t.finalita.nota}</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">{t.conservazione.h}</h2>
          <p>{t.conservazione.intro}</p>
          <ul className="list-disc pl-6 space-y-2 mt-3 text-sm">
            {t.conservazione.righe.map((r) => (
              <li key={r.categoria}>
                <strong>{r.categoria}:</strong>{" "}
                {r.periodo ?? t.conservazione.senzaTermine}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">{t.condivisione.h}</h2>
          <p className="mb-3">{t.condivisione.intro}</p>
          <ul className="list-disc pl-6 space-y-2 text-sm">
            {t.condivisione.voci.map((v) => <li key={v}>{v}</li>)}
          </ul>
          <p className="mt-3 text-sm">{t.condivisione.nota}</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">{t.trasferimenti.h}</h2>
          <p>{t.trasferimenti.testo}</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">{t.diritti.h}</h2>
          <p className="mb-3">{t.diritti.intro}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {t.diritti.voci.map((item) => (
              <div key={item.diritto} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="text-sm font-semibold text-gray-800">{item.diritto}</div>
                <div className="text-xs text-gray-600 mt-1">{item.desc}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm">{t.diritti.nota}</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">{t.sicurezza.h}</h2>
          <p>{t.sicurezza.testo}</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">{t.minori.h}</h2>
          {t.minori.paragrafi.map((p, i) => (
            <p key={p.slice(0, 40)} className={i === 0 ? undefined : "mt-3"}>{p}</p>
          ))}
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">{t.aggiornamenti.h}</h2>
          <p>{t.aggiornamenti.testo}</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">{t.autorita.h}</h2>
          <p>{t.autorita.intro}</p>
          <div className="mt-3 p-4 rounded-xl bg-gray-50 border border-gray-100 text-sm">
            <p><strong>Garante per la protezione dei dati personali</strong></p>
            <p>Piazza Venezia 11, 00187 Roma, Italy</p>
            <p>
              <a
                href="https://www.garanteprivacy.it"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--primary)" }}
              >
                www.garanteprivacy.it
              </a>
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <Link href="/cookie-policy" style={{ color: "var(--primary)", fontWeight: 600, fontSize: 14 }}>
            → {t.cookie}
          </Link>
        </div>
      </div>
    </div>
  );
}
