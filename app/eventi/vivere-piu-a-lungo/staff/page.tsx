import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import {
  ACCESSI,
  FASI,
  GRUPPI,
  PRIMA_DI_TUTTO,
  STAFF_PATH,
  type Accesso,
  type Voce,
} from "./content";
import { CONTATTI_LICEI } from "../licei/content";

/**
 * La mappa dello staff.
 *
 * I percorsi sono cresciuti fino a ventuno pagine fra due bandi, un corso e
 * tre livelli di accesso, e chi li gestisce non deve tenerle a mente ne
 * ritrovarle in una conversazione vecchia di settimane. Questa pagina e
 * l'indice: ogni pagina del percorso, chi la puo aprire, a che cosa serve, e
 * le poche cose che vanno fatte a mano e che non si deducono da nessuna
 * schermata.
 *
 * Sta sul sito e non in un documento a parte per la stessa ragione per cui
 * ci sta la guida dei docenti: un documento si perde, un indirizzo si
 * ritrova. Ed e `noindex`, perche elenca aree riservate: non deve comparire
 * in una ricerca.
 *
 * Non e una terza guardia. Ogni pagina elencata qui si protegge da sola, e
 * questa mappa si limita a non mostrare a chi non e staff un elenco di porte
 * che non puo aprire.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mappa dei percorsi . Staff . Fondazione bioERGOtech",
  description:
    "Ogni pagina dei percorsi su biotecnologie e intelligenza artificiale, chi la puo aprire e a che cosa serve.",
  alternates: { canonical: STAFF_PATH },
  robots: { index: false, follow: false },
};

const STILE = `
.st-page { --primary-dark: #0A7A66; --text-light: #64748B; }
.st-page .section { padding: 56px 0; overflow: visible; }
.st-page .card { margin: 0; background: #fff; border: 1px solid var(--border-color); }
.st-page .card::before { display: none; }
.st-page .card:hover { transform: none; box-shadow: none; }
.st-page section[id] { scroll-margin-top: 96px; }

.st-hero {
  background: linear-gradient(135deg, #F7F9FC 0%, #E8F8F6 55%, #EEF3FF 100%);
  padding: 112px 0 48px;
}
.st-kicker {
  font-size: 11.5px; font-weight: 700; letter-spacing: .12em;
  text-transform: uppercase; color: var(--primary-dark);
}
.st-nota { font-size: 13.5px; color: var(--text-light); line-height: 1.7; }

/* ── Indice in cima, cosi la pagina si usa anche da telefono ── */
.st-ancore { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 26px; }
.st-ancora {
  font-size: 12.5px; font-weight: 600; padding: 7px 14px; border-radius: 999px;
  background: #fff; border: 1px solid var(--border-color); color: var(--text-dark);
  transition: border-color .2s ease, color .2s ease;
}
.st-ancora:hover { border-color: var(--primary); color: var(--primary-dark); }

/* ── Una riga per pagina ── */
.st-voce {
  display: block; padding: 18px 20px; border-radius: 12px;
  border: 1px solid var(--border-color); background: #fff;
  transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease;
}
.st-voce:hover {
  border-color: #CFE9E4; box-shadow: 0 8px 22px rgba(26, 35, 50, .07);
  transform: translateY(-1px);
}
.st-voce-riga {
  display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 6px;
}
.st-voce-titolo { font-size: 15.5px; font-weight: 700; color: var(--text-dark); }
.st-badge {
  font-size: 10.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
  padding: 3px 9px; border-radius: 999px;
}
.st-riservata {
  font-size: 10.5px; font-weight: 600; color: var(--text-light);
  border: 1px solid var(--border-color); border-radius: 999px; padding: 3px 9px;
}
.st-voce-desc { font-size: 14px; line-height: 1.65; color: var(--text-mid); margin: 0 0 8px; }
.st-url {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12.5px; color: var(--primary-dark); word-break: break-all;
}
.st-elenco { display: grid; gap: 12px; }

/* ── Passi e fasi ── */
.st-passo { display: flex; gap: 14px; align-items: flex-start; }
.st-num {
  flex-shrink: 0; width: 26px; height: 26px; border-radius: 8px;
  background: var(--primary-light); color: var(--primary-dark);
  font-size: 12.5px; font-weight: 800;
  display: inline-flex; align-items: center; justify-content: center;
}
.st-chiave {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px; background: #F4F6F9; border: 1px solid var(--border-color);
  border-radius: 6px; padding: 2px 7px; color: var(--text-dark);
}
`;

function Badge({ accesso }: { accesso: Accesso }) {
  const a = ACCESSI[accesso];
  return (
    <span className="st-badge" style={{ background: `${a.colore}1A`, color: a.colore }}>
      {a.label}
    </span>
  );
}

function RigaVoce({ voce }: { voce: Voce }) {
  return (
    <Link href={voce.href} className="st-voce">
      <div className="st-voce-riga">
        <span className="st-voce-titolo">{voce.titolo}</span>
        <Badge accesso={voce.accesso} />
        {voce.riservata && <span className="st-riservata">non indicizzata</span>}
      </div>
      <p className="st-voce-desc">{voce.desc}</p>
      <span className="st-url">bioergotech.org{voce.href}</span>
    </Link>
  );
}

export default async function StaffPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("partnership_level")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = profile?.partnership_level === "admin";
  }

  if (!isAdmin) {
    return (
      <>
        <Navbar />
        <div style={{ paddingTop: "110px", minHeight: "70vh" }} className="bg-light-gray">
          <div className="container mx-auto px-6 py-16">
            <div className="card max-w-md mx-auto text-center">
              <span
                className="icon-circle icon-circle-primary"
                style={{ width: 56, height: 56, margin: "0 auto" }}
              >
                <i className="fas fa-lock text-2xl" />
              </span>
              <h1 className="text-2xl font-bold text-gray-800 mt-5 mb-2">Accesso riservato</h1>
              <p className="text-gray-600 mb-6">
                Questa mappa e riservata allo staff della Fondazione. Se dovrebbe vederla, entri
                con l&apos;indirizzo email a cui e associato il suo profilo.
              </p>
              <div className="flex flex-col gap-3">
                <Link href="/auth/login" className="btn-primary">
                  Accedi
                </Link>
                <Link href="/eventi/vivere-piu-a-lungo" className="btn-outline">
                  Torna all&apos;evento
                </Link>
              </div>
            </div>
          </div>
        </div>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <style>{STILE}</style>
      <Navbar />

      <div className="st-page">
        <section className="st-hero">
          <div className="container mx-auto px-6">
            <span className="st-kicker">Fondazione bioERGOtech . Area staff</span>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mt-3 mb-3">
              La mappa dei percorsi
            </h1>
            <p className="text-lg text-gray-700" style={{ maxWidth: 760 }}>
              Ogni pagina dei due percorsi e del corso, con chi la puo aprire e a che cosa serve.
              In fondo, le poche cose che vanno fatte a mano e che non si deducono da nessuna
              schermata.
            </p>
            <nav className="st-ancore" aria-label="Sezioni della mappa">
              {GRUPPI.map((g) => (
                <a key={g.id} href={`#${g.id}`} className="st-ancora">
                  {g.occhiello}
                </a>
              ))}
              <a href="#operativo" className="st-ancora">
                Da fare a mano
              </a>
            </nav>
          </div>
        </section>

        {GRUPPI.map((g, i) => (
          <section
            key={g.id}
            id={g.id}
            className={i % 2 === 0 ? "section" : "section bg-light-gray"}
          >
            <div className="container mx-auto px-6">
              <div style={{ maxWidth: 820, marginBottom: 26 }}>
                <span className="st-kicker">{g.occhiello}</span>
                <h2 className="text-2xl font-bold text-gray-800 mt-2 mb-3">{g.titolo}</h2>
                <p className="text-gray-700" style={{ lineHeight: 1.7 }}>
                  {g.intro}
                </p>
              </div>
              <div className="st-elenco" style={{ maxWidth: 820 }}>
                {g.voci.map((v) => (
                  <RigaVoce key={v.href} voce={v} />
                ))}
              </div>
            </div>
          </section>
        ))}

        <section
          id="operativo"
          className={GRUPPI.length % 2 === 0 ? "section" : "section bg-light-gray"}
        >
          <div className="container mx-auto px-6">
            <div style={{ maxWidth: 820, marginBottom: 26 }}>
              <span className="st-kicker">Da fare a mano</span>
              <h2 className="text-2xl font-bold text-gray-800 mt-2 mb-3">
                Le quattro cose che il sito non fa da solo
              </h2>
              <p className="text-gray-700" style={{ lineHeight: 1.7 }}>
                Tutto il resto funziona senza che nessuno tocchi niente. Queste no, e conviene
                saperlo prima di scoprirlo.
              </p>
            </div>

            <div className="st-elenco" style={{ maxWidth: 820, marginBottom: 34 }}>
              {PRIMA_DI_TUTTO.map((p, i) => (
                <div key={p.titolo} className="card" style={{ padding: 20 }}>
                  <div className="st-passo">
                    <span className="st-num">{i + 1}</span>
                    <div>
                      <h3
                        style={{
                          fontSize: 15.5,
                          fontWeight: 700,
                          color: "var(--text-dark)",
                          margin: "2px 0 6px",
                        }}
                      >
                        {p.titolo}
                      </h3>
                      <p
                        style={{
                          fontSize: 14,
                          lineHeight: 1.7,
                          color: "var(--text-mid)",
                          margin: 0,
                        }}
                      >
                        {p.testo}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ maxWidth: 820 }}>
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--text-dark)",
                  margin: "0 0 6px",
                }}
              >
                Gli interruttori, nell&apos;ordine in cui accenderli
              </h3>
              <p className="st-nota" style={{ marginBottom: 16 }}>
                Valgono per tutti e due i percorsi, ognuno dal proprio pannello. L&apos;ordine
                conta piu dei nomi: i nomi si leggono anche dal pannello.
              </p>
              <div className="st-elenco">
                {FASI.map((f, i) => (
                  <div key={f.chiave} className="card" style={{ padding: 18 }}>
                    <div className="st-voce-riga">
                      <span className="st-num">{i + 1}</span>
                      <span className="st-voce-titolo">{f.titolo}</span>
                      <code className="st-chiave">{f.chiave}</code>
                    </div>
                    <p
                      style={{
                        fontSize: 14,
                        lineHeight: 1.65,
                        color: "var(--text-mid)",
                        margin: "6px 0 0",
                      }}
                    >
                      {f.quando}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <p className="st-nota" style={{ maxWidth: 820, marginTop: 28 }}>
              Se qualcosa non torna, o se una pagina elencata qui risponde in un modo che non vi
              aspettavate, scrivete a{" "}
              <a
                href={`mailto:${CONTATTI_LICEI.fondazione.email}`}
                style={{ color: "var(--primary-dark)", fontWeight: 600 }}
              >
                {CONTATTI_LICEI.fondazione.email}
              </a>
              .
            </p>
          </div>
        </section>
      </div>

      <SiteFooter />
    </>
  );
}
