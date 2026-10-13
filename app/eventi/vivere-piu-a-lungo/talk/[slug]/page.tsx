import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { googleCalendarUrl } from "@/lib/eventi/talk";
import { EVENT } from "../../content";
import { INFORMATIVA_SCUOLE_PATH, INFORMATIVA_STUDENTI_PATH, LICEI_PATH } from "../../licei/content";
import { UNIVERSITA_PATH } from "../../universita/content";
import { IscrizioneTalk } from "../IscrizioneTalk";
import { VoltoRelatore } from "../Relatore";
import { STILE_TALK } from "../stile";
import {
  SITE_URL,
  TALKS,
  TALK_PATH,
  TALK_SERIE,
  iniziali,
  luogoTalk,
  occhielloTalk,
  talkPath,
  trovaTalk,
  type Talk,
} from "../content";

/**
 * La pagina di un talk. Statica, una per voce di `TALKS`: quello che
 * dipende da chi la guarda (iscritto o no, link della riunione) lo chiede
 * il riquadro dell'iscrizione alla rotta, e non passa mai dall'HTML.
 *
 * Ai componenti client va solo quello che serve, gia calcolato qui: lo
 * slug, la fine del talk, le URL del calendario. Il link della riunione non
 * esce da questa pagina.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return TALKS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const t = trovaTalk(slug);
  if (!t) return {};
  const titolo = `${t.titolo}, con ${t.relatore.nome} . ${TALK_SERIE.titolo}`;
  const descrizione = `${t.dataLabel}, ${t.orarioLabel}, ${luogoTalk(t).toLowerCase()}. ${t.sottotitolo}`;
  return {
    // Il marchio lo aggiunge il template del layout ("%s | bioERGOtech Foundation").
    title: titolo,
    description: descrizione,
    alternates: { canonical: talkPath(t.slug) },
    openGraph: {
      title: titolo,
      description: descrizione,
      url: `${SITE_URL}${talkPath(t.slug)}`,
      type: "website",
      locale: "it_IT",
      images: [
        {
          url: t.immagineOg,
          width: 1200,
          height: 630,
          alt: `${occhielloTalk(t)}: ${t.titolo}, con ${t.relatore.nome}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: titolo,
      description: descrizione,
      images: [t.immagineOg],
    },
  };
}

/** I dati strutturati dell'evento. Il luogo e la pagina, mai il link della riunione. */
function TalkJsonLd({ t }: { t: Talk }) {
  const url = `${SITE_URL}${talkPath(t.slug)}`;
  const online = t.modalita === "online";
  const evento = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: `${t.titolo}, con ${t.relatore.nome}`,
    description: t.sottotitolo,
    startDate: t.inizio,
    endDate: t.fine,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: online
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    location: online
      ? { "@type": "VirtualLocation", url }
      : {
          "@type": "Place",
          name: t.luogo ?? "",
          address: { "@type": "PostalAddress", addressLocality: "Taranto", addressCountry: "IT" },
        },
    isAccessibleForFree: true,
    inLanguage: "it",
    image: [`${SITE_URL}${t.immagineOg}`],
    url,
    organizer: { "@type": "Organization", name: EVENT.organizzatore, url: SITE_URL },
    performer: { "@type": "Person", name: t.relatore.nome, jobTitle: t.relatore.ruolo },
    superEvent: { "@type": "EventSeries", name: TALK_SERIE.titolo, url: `${SITE_URL}${TALK_PATH}` },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url,
    },
  };
  const briciole = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: TALK_SERIE.titolo, item: `${SITE_URL}${TALK_PATH}` },
      { "@type": "ListItem", position: 2, name: t.titolo, item: url },
    ],
  };
  // `<` come <: un testo che contenesse "</script>" non chiuderebbe il blocco.
  const json = (x: unknown) => JSON.stringify(x).replace(/</g, "\\u003c");
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json(evento) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json(briciole) }} />
    </>
  );
}

export default async function TalkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = trovaTalk(slug);
  if (!t) notFound();

  const path = talkPath(t.slug);
  const url = `${SITE_URL}${path}`;
  const sigla = iniziali(t.relatore.nome);

  return (
    <>
      <TalkJsonLd t={t} />
      <style>{STILE_TALK}</style>
      <Navbar />

      <div className="tk-page">
        {/* ── Hero ── */}
        <section className="tk-hero">
          <div className="container mx-auto px-6">
            <nav className="tk-briciole" aria-label="Percorso di navigazione">
              <Link href={TALK_PATH}>
                <i className="fas fa-arrow-left" aria-hidden="true" style={{ marginRight: 6, fontSize: 11 }} />
                Tutti i talk
              </Link>
            </nav>

            <div className="tk-griglia">
              <div>
                <div className="tk-kicker">{occhielloTalk(t)}</div>
                <h1 className="tk-h1">{t.titolo}</h1>
                <p className="tk-sottotitolo">{t.sottotitolo}</p>

                <div className="tk-relatore">
                  <VoltoRelatore nome={t.relatore.nome} iniziali={sigla} foto={t.relatore.foto} dimensione={76} />
                  <div style={{ minWidth: 0 }}>
                    <div className="tk-relatore-nome">{t.relatore.nome}</div>
                    <div className="tk-relatore-ruolo">{t.relatore.ruolo}</div>
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
                  <span className="tk-fatto">
                    <i className="fas fa-euro-sign" aria-hidden="true" /> Gratuito
                  </span>
                </div>
              </div>

              <div id="iscrizione" style={{ scrollMarginTop: 96 }}>
                <IscrizioneTalk
                  slug={t.slug}
                  fine={t.fine}
                  googleUrl={googleCalendarUrl(t, url)}
                  icsUrl={`/api/eventi/talk/${t.slug}/ics`}
                  loginHref={`/auth/login?returnTo=${encodeURIComponent(path)}`}
                  liceiPath={LICEI_PATH}
                  universitaPath={UNIVERSITA_PATH}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Di cosa parleremo ── */}
        <section className="section" id="temi">
          <div className="container mx-auto px-6">
            <p className="tk-intro">{t.intro}</p>
            <div className="tk-kicker">Il talk</div>
            <h2 className="tk-titolo-sezione">Di cosa parleremo</h2>
            <div className="tk-temi" style={{ marginTop: 22 }}>
              {t.temi.map((tema) => (
                <div key={tema.titolo} className="card tk-tema" style={{ padding: 22 }}>
                  <span className="icon-circle icon-circle-primary" style={{ width: 44, height: 44, borderRadius: 12 }} aria-hidden="true">
                    <i className={`fas ${tema.icona ?? "fa-lightbulb"}`} />
                  </span>
                  <h3>{tema.titolo}</h3>
                  <p>{tema.testo}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Spunti ── */}
        <section className="section bg-light-gray" id="spunti">
          <div className="container mx-auto px-6">
            <div className="tk-kicker">Per i vostri progetti</div>
            <h2 className="tk-titolo-sezione">Spunti per i vostri progetti</h2>
            <p className="tk-testo" style={{ margin: "0 0 18px" }}>
              Qualche esempio di progetto che potrebbe nascere da questo incontro:
            </p>
            <ul className="tk-spunti">
              {t.spunti.map((s) => (
                <li key={s}>
                  <i className="fas fa-lightbulb" aria-hidden="true" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
            <p className="tk-testo" style={{ margin: 0, fontWeight: 600, color: "var(--text-dark)" }}>
              {t.spuntiNota}
            </p>
          </div>
        </section>

        {/* ── Per chi è ── */}
        <section className="section" id="per-chi">
          <div className="container mx-auto px-6">
            <div className="tk-kicker">Partecipare</div>
            <h2 className="tk-titolo-sezione">Per chi è</h2>
            <p className="tk-testo" style={{ margin: "0 0 22px" }}>
              {t.perChi}
            </p>
            <div className="flex flex-wrap gap-3" style={{ marginBottom: 28 }}>
              {/* Neutro di proposito: la pagina e statica e non sa se il talk
                  e gia passato. Il riquadro in alto lo sa, e lo dice. */}
              <a href="#iscrizione" className="btn-primary">
                <i className="fas fa-arrow-up" aria-hidden="true" /> Iscrizione e calendario
              </a>
              <Link href={TALK_PATH} className="btn-outline">
                Tutti i talk
              </Link>
            </div>
            <p className="tk-nota" style={{ maxWidth: 780, margin: 0 }}>
              <i className="fas fa-shield-halved" aria-hidden="true" style={{ marginRight: 6, color: "var(--primary)" }} />
              Registriamo solo la tua iscrizione, collegata al tuo account.{" "}
              <Link href={INFORMATIVA_STUDENTI_PATH}>Informativa privacy per studenti</Link>. Per i
              docenti vale l&apos;<Link href={INFORMATIVA_SCUOLE_PATH}>informativa per scuole e docenti</Link>,
              per gli studenti universitari l&apos;
              <Link href="/legal/informativa-privacy">informativa del sito</Link>.
            </p>
          </div>
        </section>
      </div>

      <SiteFooter />
    </>
  );
}
