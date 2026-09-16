import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, breadcrumbs } from "@/components/json-ld";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { MentorForm } from "../MentorForm";
import { EVENT } from "../../../content";
import {
  CONTATTI_UNIVERSITA,
  EVENT_SLUG,
  MENTOR,
  MENTOR_CANDIDATURA_PATH,
  MENTOR_COSA_CHIEDIAMO,
  MENTOR_NOTA_APPROVAZIONE,
  MENTOR_PATH,
  SITE_URL,
  UNIVERSITA,
  UNIVERSITA_PATH,
} from "../../content";

/**
 * Il modulo di candidatura a mentor, su una pagina sua.
 *
 * Sta fuori dall'elenco e non in fondo a quella pagina perche i due lettori
 * sono diversi: chi apre l'elenco sta guardando chi c'e, chi apre questa ha
 * gia deciso di proporsi. Una pagina sola costringerebbe il secondo a
 * scorrere venti schede per arrivare al modulo, e darebbe al primo un modulo
 * che non ha chiesto.
 *
 * La pagina e statica di proposito, a differenza dell'elenco. Non legge
 * l'elenco dei mentor e non dipende dalle fasi del percorso: la rotta che
 * riceve la candidatura non ha nessun cancello, perche l'art. 4 fissa una
 * finestra per gli studenti mentre l'art. 5 mette il mentoring lungo tutto il
 * percorso, e un ricercatore che scopre l'iniziativa a fase avanzata resta
 * utile. Se un giorno il cancello arrivasse sulla rotta, questa pagina
 * dovrebbe chiudersi di conseguenza e tornare dinamica.
 */

export const metadata: Metadata = {
  title: `Candidarsi come mentor . Percorso universitario . Fondazione bioERGOtech`,
  description:
    "Il modulo per proporsi come mentor del percorso universitario su biotecnologie e intelligenza artificiale. Aperto a ricercatori, docenti, clinici, professionisti e persone che lavorano nell'innovazione.",
  alternates: { canonical: MENTOR_CANDIDATURA_PATH },
  openGraph: {
    title: "Candidarsi come mentor . Percorso universitario",
    description: MENTOR.sottotitolo,
    url: `${SITE_URL}${MENTOR_CANDIDATURA_PATH}`,
    images: [{ url: EVENT.ogImage }],
    type: "website",
  },
};

export default function CandidaturaMentorPage() {
  return (
    <>
      {/* La stessa briciola dell'elenco con un anello in piu. Anche qui
          nessun nodo Person: questa pagina non descrive nessuno, raccoglie
          soltanto. */}
      <JsonLd
        data={breadcrumbs([
          { name: EVENT.titolo, path: `/eventi/${EVENT_SLUG}` },
          { name: UNIVERSITA.titolo, path: UNIVERSITA_PATH },
          { name: MENTOR.titolo, path: MENTOR_PATH },
          { name: "Candidarsi come mentor", path: MENTOR_CANDIDATURA_PATH },
        ])}
      />
      <Navbar />

      <div style={{ paddingTop: 100 }} className="bg-light-gray">
        <div className="container mx-auto px-6 py-12">
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            <div style={{ marginBottom: 26 }}>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--primary-dark)",
                }}
              >
                {MENTOR.occhiello}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mt-3 mb-3">
                Candidarsi come mentor
              </h1>
              <p className="text-lg text-gray-700">{MENTOR.sottotitolo}</p>
            </div>

            {/* Le quattro cose che chiediamo, in forma corta e prima del
                modulo. Per esteso stanno nell'elenco dei mentor: qui servono
                a far decidere in dieci secondi se vale la pena compilare, non
                a essere lette una per una. */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3" style={{ marginBottom: 26 }}>
              {MENTOR_COSA_CHIEDIAMO.map((c) => (
                <div key={c.titolo} className="card-sm" style={{ padding: 14 }}>
                  <i
                    className={`fas ${c.icona}`}
                    style={{ color: "var(--primary-dark)", fontSize: 15 }}
                    aria-hidden="true"
                  />
                  <div
                    className="font-semibold text-gray-800"
                    style={{ fontSize: 13, marginTop: 7, lineHeight: 1.4 }}
                  >
                    {c.titolo}
                  </div>
                </div>
              ))}
            </div>

            <p
              style={{
                fontSize: 13.5,
                color: "var(--text-mid)",
                lineHeight: 1.75,
                margin: "0 0 22px",
              }}
            >
              Il percorso lo prevede il bando: l&apos;art. 3 affida le attività al supporto di
              ricercatori, docenti, esperti e professionisti, e l&apos;art. 5 mette il mentoring fra
              le cose che il progetto offre ai team. Compilare richiede qualche minuto.{" "}
              <Link href={MENTOR_PATH} style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
                Chi c&apos;è già è in elenco qui
              </Link>
              .
            </p>

            <MentorForm />

            {/* L'avviso sull'approvazione sta dopo il modulo e non prima: e
                la cosa giusta da sapere una volta inviato, e in cima
                scoraggerebbe proprio chi non sa di essere il profilo che
                serve. */}
            <div
              style={{
                background: "#FFF8E6",
                border: "1px solid #F0D89B",
                borderRadius: 10,
                padding: "12px 16px",
                fontSize: 13.5,
                color: "#75570F",
                lineHeight: 1.6,
                marginTop: 22,
              }}
            >
              {MENTOR_NOTA_APPROVAZIONE}
            </div>

            <p
              style={{
                fontSize: 12.5,
                color: "var(--text-light)",
                lineHeight: 1.7,
                marginTop: 22,
                textAlign: "center",
              }}
            >
              È uno studente e cerca il percorso?{" "}
              <Link href={UNIVERSITA_PATH} style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
                Il bando è qui
              </Link>
              . Per qualsiasi dubbio: {CONTATTI_UNIVERSITA.fondazione.email}
            </p>
          </div>
        </div>
      </div>

      <SiteFooter />
    </>
  );
}
