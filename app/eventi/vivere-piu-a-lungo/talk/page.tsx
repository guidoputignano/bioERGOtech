import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { EVENT } from "../content";
import { LICEI_PATH } from "../licei/content";
import { UNIVERSITA_PATH } from "../universita/content";
import { RitrattoRelatore, VoltoRelatore } from "./Relatore";
import { STILE_TALK } from "./stile";
import {
  SITE_URL,
  TALKS,
  TALK_PATH,
  TALK_SERIE,
  iniziali,
  luogoTalk,
  occhielloTalk,
  talkOrdinati,
  talkPath,
  type Talk,
} from "./content";

/**
 * La pagina della serie: chi sono i talk, e l'elenco, prima i prossimi e
 * poi i passati.
 *
 * L'ordine dipende dalla data, quindi la pagina si rigenera ogni ora invece
 * di restare ferma al giorno del deploy. Nessun dato di chi la guarda: per
 * iscriversi si apre la pagina del talk.
 *
 * Nella scheda di un talk il relatore ha un ritratto medio se c'e la foto
 * (`relatore.foto`), altrimenti il monogramma nel cerchio.
 */

export const revalidate = 3600;

const immagine = TALKS[0]?.immagineOg ?? EVENT.ogImage;

export const metadata: Metadata = {
  // Il marchio lo aggiunge il template del layout ("%s | bioERGOtech Foundation").
  title: TALK_SERIE.titolo,
  description: TALK_SERIE.descrizione,
  alternates: { canonical: TALK_PATH },
  openGraph: {
    title: `${TALK_SERIE.titolo} . Fondazione bioERGOtech`,
    description: TALK_SERIE.intro,
    url: `${SITE_URL}${TALK_PATH}`,
    type: "website",
    locale: "it_IT",
    images: [{ url: immagine, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: TALK_SERIE.titolo,
    description: TALK_SERIE.intro,
    images: [immagine],
  },
};

function SchedaTalk({ t, passato }: { t: Talk; passato: boolean }) {
  return (
    <Link href={talkPath(t.slug)} className="card tk-scheda">
      <div className="flex flex-wrap items-center gap-2">
        <span className="tk-kicker">{occhielloTalk(t)}</span>
        {passato && (
          <span className="badge" style={{ background: "var(--bg-light)", color: "var(--text-light)" }}>
            Concluso
          </span>
        )}
      </div>
      <div>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-dark)", lineHeight: 1.3, margin: "0 0 6px" }}>
          {t.titolo}
        </h3>
        <p style={{ fontSize: 14.5, color: "var(--text-mid)", lineHeight: 1.65, margin: 0 }}>{t.sottotitolo}</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: t.relatore.foto ? 16 : 12 }}>
        {t.relatore.foto ? (
          <RitrattoRelatore
            nome={t.relatore.nome}
            foto={t.relatore.foto}
            sizes="(min-width: 480px) 136px, 104px"
            raggio={18}
            className="tk-ritratto-medio"
          />
        ) : (
          <VoltoRelatore nome={t.relatore.nome} iniziali={iniziali(t.relatore.nome)} foto={null} dimensione={52} />
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-dark)", lineHeight: 1.3 }}>{t.relatore.nome}</div>
          <div style={{ fontSize: 13, color: "var(--text-mid)", lineHeight: 1.5 }}>{t.relatore.ruolo}</div>
        </div>
      </div>
      <div className="tk-fatti">
        <span className="tk-fatto">
          <i className="fas fa-calendar-days" aria-hidden="true" /> {t.dataLabel}
        </span>
        <span className="tk-fatto">
          <i className="fas fa-clock" aria-hidden="true" /> {t.orarioLabel}
        </span>
        <span className="tk-fatto">
          <i className={`fas ${t.modalita === "online" ? "fa-laptop" : "fa-location-dot"}`} aria-hidden="true" />{" "}
          {luogoTalk(t)}
        </span>
      </div>
      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--tk-accento)" }}>
        {passato ? "Rileggi il programma" : "Scopri il talk e iscriviti"}{" "}
        <i className="fas fa-arrow-right" aria-hidden="true" style={{ fontSize: 12 }} />
      </span>
    </Link>
  );
}

export default function TalkIndicePage() {
  const { prossimi, passati } = talkOrdinati();

  return (
    <>
      <style>{STILE_TALK}</style>
      <Navbar />

      <div className="tk-page">
        <section className="tk-hero">
          <div className="container mx-auto px-6">
            <div style={{ maxWidth: 780 }}>
              <div className="tk-kicker">{TALK_SERIE.occhiello}</div>
              <h1 className="tk-h1">{TALK_SERIE.titolo}</h1>
              <p className="tk-sottotitolo" style={{ marginBottom: 18 }}>
                {TALK_SERIE.intro}
              </p>
              <p className="tk-nota" style={{ margin: 0 }}>
                Gratuiti e online, per gli studenti del percorso, dei{" "}
                <Link href={LICEI_PATH}>licei</Link>
                {" e dell'"}
                <Link href={UNIVERSITA_PATH}>università</Link>, e per i loro docenti.
              </p>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container mx-auto px-6">
            <h2 className="tk-titolo-sezione" style={{ marginTop: 0 }}>
              {prossimi.length === 1 ? "Il prossimo talk" : "I prossimi talk"}
            </h2>
            {prossimi.length > 0 ? (
              <div className="tk-elenco" style={{ marginTop: 20 }}>
                {prossimi.map((t) => (
                  <SchedaTalk key={t.slug} t={t} passato={false} />
                ))}
              </div>
            ) : (
              <p className="tk-testo">
                Il prossimo talk è in preparazione: lo annunciamo qui e nelle aree del percorso.
              </p>
            )}

            {passati.length > 0 && (
              <>
                <h2 className="tk-titolo-sezione" style={{ marginTop: 48 }}>
                  Talk passati
                </h2>
                <div className="tk-elenco" style={{ marginTop: 20 }}>
                  {passati.map((t) => (
                    <SchedaTalk key={t.slug} t={t} passato />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      <SiteFooter />
    </>
  );
}
