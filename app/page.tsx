import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { FaqSection } from "@/components/faq-section";
import { Countdown } from "@/components/home/countdown";
import { CountUp } from "@/components/home/count-up";
import { Reveal } from "@/components/home/reveal";
import {
  ARCHIVE_MODE,
  EVENT,
  MODERATRICE,
  PARTNER_PUBBLICI,
  RELATORI_PUBBLICI,
  SESSIONS,
  STATS,
} from "@/app/eventi/vivere-piu-a-lungo/content";
import { LICEI } from "@/app/eventi/vivere-piu-a-lungo/licei/content";
import { luogoTalk, prossimoTalk, talkPath } from "@/app/eventi/vivere-piu-a-lungo/talk/content";
import { numeriHome, vociNumeri } from "@/lib/home/numeri";
import { COPIA } from "@/lib/home/copia";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import s from "./home.module.css";

/*
 * The homepage. One message: we train students to build digital scientists,
 * and the place where it all comes together is the event "Vivere più a
 * lungo: sport e intelligenza artificiale". Every section ends in a way to
 * take part, and the main one is registering for the event.
 *
 * The event block is in Italian, like the event and its audience; the rest
 * of the page is in English, like the rest of the site. Event data comes
 * from the event's own content file (read only: the event pages are not
 * touched), the numbers from the database (lib/home/numeri.ts), the words
 * of the vision and the story from lib/home/copia.ts.
 */

const TITOLO = "bioERGOtech Foundation: we train students to build digital scientists";
const DESCRIZIONE = ARCHIVE_MODE
  ? "A non-profit foundation in Taranto. Free programmes where students learn agentic AI by building digital scientists."
  : "A non-profit foundation in Taranto. Free programmes where students learn agentic AI by building digital scientists. Join us on 10 and 11 December 2026.";
const IMMAGINE = "https://www.bioergotech.org/assets/images/og-home.jpg";

export const metadata: Metadata = {
  title: { absolute: TITOLO },
  description: DESCRIZIONE,
  alternates: { canonical: "/" },
  openGraph: {
    title: TITOLO,
    description: DESCRIZIONE,
    url: "https://www.bioergotech.org",
    images: [{ url: IMMAGINE, width: 1200, height: 630, alt: "We train students to build digital scientists. Vivere più a lungo, Taranto, 10 and 11 December 2026" }],
  },
  twitter: { card: "summary_large_image", title: TITOLO, description: DESCRIZIONE, images: [IMMAGINE] },
};

// The numbers, the next talk and the seats left change: rebuilt hourly.
export const revalidate = 3600;

const EVENTO = "/eventi/vivere-piu-a-lungo";
const ISCRIZIONE = `${EVENTO}#iscrizione`;
// After the event the event page shows a recap: the homepage follows it.
const CHIUSO = ARCHIVE_MODE;

/** "9:00 . 16:00" -> "dalle 9:00 alle 16:00". */
const orario = (o: string) => {
  const [da, a] = o.split(" . ");
  return a ? `dalle ${da} alle ${a}` : o;
};

/*
 * The faces in front: the best-known names first, then everyone else in
 * stage order. Built on RELATORI_PUBBLICI, so a speaker who is hidden or not
 * yet authorised on the event page never appears here either.
 */
const IN_PRIMO_PIANO = ["vezzali", "montano", "raffaeli", "bortuzzo", "abbagnale", "schettini", "montervino", "bianco", "siciliano", "botticelli", "loizzo", "tari"];
const RELATORI_HOME = [
  ...IN_PRIMO_PIANO.map((id) => RELATORI_PUBBLICI.find((r) => r.id === id)).filter((r): r is (typeof RELATORI_PUBBLICI)[number] => Boolean(r)),
  ...RELATORI_PUBBLICI.filter((r) => !IN_PRIMO_PIANO.includes(r.id)),
];
const VOLTI = 11;

const PASSI_AGENTE = [
  { icona: "fa-book-open-reader", titolo: "It reads", testo: "Papers, data and guidelines, and finds what actually matters for the question." },
  { icona: "fa-flask-vial", titolo: "It tests", testo: "Runs the analysis or the simulation, and checks the result against the evidence." },
  { icona: "fa-comment-dots", titolo: "It explains", testo: "Reports what it found and how sure it is, in words a doctor or a coach can use." },
];

const PERCHE = [
  { icona: "fa-seedling", titolo: "Students learn by building.", testo: "Not slides about AI: an agent of their own, around a real question about health, sport or longevity." },
  { icona: "fa-user-doctor", titolo: "Experts stay close.", testo: "Mentors from research and industry are there for the teams, and a committee of experts evaluates every project." },
  { icona: "fa-microphone-lines", titolo: "The work goes on stage.", testo: "The ten best school projects are presented in Taranto on 10 December, in front of the public and the speakers." },
];

const NEWS = [
  {
    href: "/articles/news-hands-on-experience-gap-2026",
    img: "/assets/images/Home/Automation.webp",
    data: "July 2026",
    titolo: "The hands-on experience gap",
    testo: "Are digital scientists replacing the field work young researchers need? Our answer: integration, not substitution.",
  },
  {
    href: "/articles/newsletter-june-2026",
    img: "/assets/images/Home/Ecosystem.webp",
    data: "June 2026",
    titolo: "A foundation is born",
    testo: "The founding edition of our newsletter: who we are, our hubs and our first two members.",
  },
  {
    href: "/articles/news-lorenzo-tarricone-2025",
    img: "/assets/images/News/Lorenzo_Tarricone/IMG_28041.jpg",
    data: "July 2025",
    titolo: "Lorenzo Tarricone: science, innovation and dreams",
    testo: "A DPhil researcher at Oxford who spoke to students at the Taranto Biotech Days, on bridging research and real-world impact.",
  },
];

export default async function Home() {
  const talk = prossimoTalk();
  const [giorno1, giorno2] = SESSIONS;
  const altriVolti = Math.max(0, RELATORI_HOME.length + 1 - VOLTI);
  const numeri = await numeriHome();
  const elenco = vociNumeri(numeri);
  const posti = new Map((numeri?.posti ?? []).map((p) => [p.slug, p]));

  /**
   * "300 posti"; "Restano 42 posti" when less than half is left; "Ultimi
   * posti" near the end (the page can be up to an hour old, so no exact
   * number there); the waiting list when full.
   */
  const postiLabel = (slug: string, capienza: number) => {
    const p = posti.get(slug);
    if (!p || CHIUSO) return `${capienza} posti`;
    if (p.rimanenti <= 0) return "Posti esauriti, lista d'attesa";
    if (p.rimanenti <= Math.max(10, p.capienza * 0.1)) return "Ultimi posti disponibili";
    if (p.rimanenti < p.capienza / 2) return `Restano ${p.rimanenti} posti`;
    return `${p.capienza} posti`;
  };

  return (
    <div className={s.page}>
      <Navbar />

      {/* ── Hero ── */}
      <header className={s.hero} id="home">
        <Image
          src="/assets/images/eventi/vivere-piu-a-lungo/hero.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className={s.heroImage}
        />
        <span className={s.heroGlow} aria-hidden="true" />
        <div className={`${s.wrap} ${s.heroInner}`}>
          <span className={`${s.eyebrow} ${s.eyebrowLight}`}>{COPIA.heroKicker}</span>
          <h1 className={s.heroTitle}>
            We train students to build <em>digital scientists</em>.
          </h1>
          <p className={s.heroLead}>
            Free programmes where high-school and university students learn agentic AI by building AI agents
            for health, sport and longevity, with experts at their side.
          </p>

          <div className={s.heroEvent} lang="it">
            <div>
              <div className={s.heroEventLabel}>{CHIUSO ? "Il grande evento · com'è andata" : "Il grande evento · ingresso gratuito"}</div>
              <div className={s.heroEventTitle}>{EVENT.titolo}</div>
              <div className={s.heroEventMeta}>
                <span>
                  <i className="fas fa-calendar-day" aria-hidden="true" />
                  {EVENT.dataLabel}
                </span>
                <span>
                  <i className="fas fa-location-dot" aria-hidden="true" />
                  PalaMazzola e Teatro Fusco, Taranto
                </span>
              </div>
              <div className={s.heroActions}>
                {CHIUSO ? (
                  <Link href={EVENTO} className={s.btnGlow}>
                    Rivivi l&apos;evento <i className="fas fa-arrow-right" aria-hidden="true" />
                  </Link>
                ) : (
                  <>
                    <Link href={ISCRIZIONE} className={s.btnGlow}>
                      Iscriviti gratis <i className="fas fa-arrow-right" aria-hidden="true" />
                    </Link>
                    <Link href="#evento" className={s.btnGhost}>
                      Scopri l&apos;evento
                    </Link>
                  </>
                )}
              </div>
            </div>
            {!CHIUSO && <Countdown inizio={EVENT.startDateISO} fine={EVENT.endDateISO} />}
          </div>
        </div>
        <span className={s.scrollHint} aria-hidden="true">
          <i className="fas fa-chevron-down" />
        </span>
      </header>

      {/* ── The event in numbers ── */}
      <section className={s.strip} aria-label="L'evento in numeri" lang="it">
        <div className={`${s.wrap} ${s.stripInner}`}>
          {STATS.map((x) => (
            <div key={x.label} className={s.stat}>
              <b>{x.num}</b>
              <span>{x.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── What a digital scientist is ── */}
      <section className={s.band} id="digital-scientists">
        <div className={`${s.wrap} ${s.split}`}>
          <Reveal>
            <span className={s.eyebrow}>What we do</span>
            <h2 className={s.h2}>What is a digital scientist?</h2>
            <p className={s.lead}>
              An AI agent that does part of a scientist&apos;s work, with a person always in charge. Our students design
              one around a real question, build it, and defend it in front of experts. The people who will use these
              tools should learn to build them, and to question them.
            </p>
            <ul className={s.points}>
              {PERCHE.map((p) => (
                <li key={p.icona}>
                  <i className={`fas ${p.icona}`} aria-hidden="true" />
                  <span>
                    <b>{p.titolo}</b> {p.testo}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal ritardo={120}>
            <div className={s.loop} aria-label="How a digital scientist works">
              <div className={s.loopTop}>
                <span className={s.agentAvatar}>
                  <i className="fas fa-robot" aria-hidden="true" />
                </span>
                <span>
                  An example question: <b style={{ color: "#fff" }}>does training load predict injuries in young athletes?</b>
                </span>
              </div>
              {PASSI_AGENTE.map((p) => (
                <div key={p.titolo} className={s.loopStep}>
                  <i className={`fas ${p.icona}`} aria-hidden="true" />
                  <div>
                    <h3>{p.titolo}</h3>
                    <p>{p.testo}</p>
                  </div>
                </div>
              ))}
              <div className={s.human}>
                <i className="fas fa-user-check" aria-hidden="true" />
                <span>A human decides. The agent shows its sources, its doubts and its limits.</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── The event ── */}
      <section className={s.eventBand} id="evento" lang="it">
        <div className={s.wrap}>
          <Reveal className={s.eventHead}>
            <div>
              <span className={`${s.eyebrow} ${s.eyebrowLight}`}>L&apos;evento · {EVENT.dataLabel} · Taranto</span>
              <h2 className={s.eventTitle}>
                Vivere più a lungo: <span>sport e intelligenza artificiale</span>
              </h2>
            </div>
            <p className={s.eventLead}>
              {EVENT.sottotitolo}{" "}
              {CHIUSO
                ? "Grazie a chi c'era: nella pagina dell'evento trovi com'è andata."
                : "La partecipazione è gratuita, l'iscrizione è obbligatoria perché i posti sono limitati."}
            </p>
          </Reveal>

          <div className={s.days}>
            {[giorno1, giorno2].filter(Boolean).map((g, i) => (
              <Reveal key={g.slug} ritardo={i * 120} as="article" className={s.day}>
                <span className={s.dayTag}>{g.giornoLabel}</span>
                <h3>{g.titolo.replace(/^Giorno \d\.\s*/, "")}</h3>
                <p>{g.descrizione}</p>
                <div className={s.dayMeta}>
                  <span>
                    <i className="fas fa-clock" aria-hidden="true" />
                    {orario(g.orario)}
                  </span>
                  <span>
                    <i className="fas fa-location-dot" aria-hidden="true" />
                    {g.luogo}
                  </span>
                  <span>
                    <i className="fas fa-chair" aria-hidden="true" />
                    {postiLabel(g.slug, g.capienza)}
                  </span>
                </div>
              </Reveal>
            ))}
          </div>

          <div className={s.speakersHead}>
            <div>
              <h3>Sul palco</h3>
              <p>Campioni dello sport, medici, scienziati e istituzioni, insieme ai progetti dei ragazzi.</p>
            </div>
            <Link href={EVENTO} className={s.btnGhost}>
              Il programma completo <i className="fas fa-arrow-right" aria-hidden="true" />
            </Link>
          </div>
          <div className={s.speakers}>
            <Reveal className={s.speaker}>
              <div className={s.speakerPhoto}>
                <Image src={MODERATRICE.img} alt={MODERATRICE.nome} fill sizes="(max-width: 560px) 45vw, 180px" />
              </div>
              <b>{MODERATRICE.nome}</b>
              <span>Giornalista Rai, modera la prima giornata</span>
            </Reveal>
            {RELATORI_HOME.slice(0, VOLTI - 1).map((r, i) => (
              <Reveal key={r.id} ritardo={((i + 1) % 6) * 70} className={s.speaker}>
                <div className={s.speakerPhoto}>
                  <Image src={r.img} alt={r.nome} fill sizes="(max-width: 560px) 45vw, 180px" />
                </div>
                <b>{r.nome}</b>
                <span>{r.ruolo}</span>
              </Reveal>
            ))}
            {altriVolti > 0 && (
              <Link href={EVENTO} className={s.speaker} style={{ textDecoration: "none", color: "#fff" }}>
                <div className={s.speakerPhoto} style={{ display: "grid", placeItems: "center", background: "rgba(46,196,182,0.12)" }}>
                  <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--teal)", marginTop: 0 }}>+{altriVolti}</span>
                </div>
                <b>Altri ospiti</b>
                <span>Tutti i relatori nella pagina dell&apos;evento</span>
              </Link>
            )}
          </div>

          <Reveal className={s.eventCta}>
            <div>
              <h3>{CHIUSO ? "Grazie a chi c'era" : "Ci vediamo a Taranto il 10 e l'11 dicembre"}</h3>
              <p>
                {CHIUSO
                  ? "Il racconto delle due giornate è nella pagina dell'evento."
                  : "Studenti, famiglie, scuole, appassionati: l'ingresso è gratuito, basta iscriversi."}
              </p>
            </div>
            <Link href={CHIUSO ? EVENTO : ISCRIZIONE} className={s.btnGlow}>
              {CHIUSO ? "Rivivi l'evento" : "Iscriviti gratis"} <i className="fas fa-arrow-right" aria-hidden="true" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── Programmes ── */}
      <section className={s.bandSoft} id="programmes">
        <div className={s.wrap}>
          <Reveal>
            <span className={s.eyebrow}>Our programmes</span>
            <h2 className={s.h2}>Four ways in, all free</h2>
            <p className={s.lead}>
              Each programme can be followed on its own. They meet at the event in Taranto, where on 10 December the
              best projects of the students are presented on stage.
            </p>
          </Reveal>

          <div className={s.programmes}>
            <Reveal className={`${s.programme} ${s.programmeFeatured}`} style={{ padding: 0 }}>
              <Link href={`${EVENTO}/licei`} className={s.programmeLink}>
                <span className={s.programmeIcon}>
                  <i className="fas fa-school" aria-hidden="true" />
                </span>
                <div className={s.tags}>
                  <span className={s.tag}>Free</span>
                  <span className={s.tag}>Last three years of secondary school</span>
                  <span className={s.tag}>Taranto and province</span>
                </div>
                <h3>School programme: Biotecnologie e Intelligenza Artificiale</h3>
                <p>
                  Teams of students build a project on health, environment or industry, with mentors from research and
                  industry. A committee of experts evaluates every project, and the {LICEI.progettiSulPalco} best are
                  presented on stage at the {LICEI.luogo}.
                </p>
                <div className={s.journey}>
                  {[
                    ["Learn", "online lessons and talks with experts"],
                    ["Build", "a team project, with mentors to turn to"],
                    ["Get evaluated", "by a committee of researchers and professionals"],
                    ["Present", "the ten best, on stage on 10 December"],
                  ].map(([t, d], i) => (
                    <div key={t} className={s.journeyStep}>
                      <span>{i + 1}</span>
                      <div>
                        <b>{t}</b>: {d}
                      </div>
                    </div>
                  ))}
                </div>
                <span className={s.programmeMore}>
                  The school programme <i className="fas fa-arrow-right" aria-hidden="true" />
                </span>
              </Link>
            </Reveal>

            <Reveal ritardo={100} className={s.programme} style={{ padding: 0 }}>
              <Link href="/courses/agentic-ai" className={s.programmeLink}>
                <span className={s.programmeIcon}>
                  <i className="fas fa-robot" aria-hidden="true" />
                </span>
                <div className={s.tags}>
                  <span className={s.tag}>Free</span>
                  <span className={s.tag}>Online</span>
                  <span className={s.tag}>10 weeks</span>
                </div>
                <h3>Agentic AI High School Innovation Program</h3>
                <p>
                  From what an AI agent is to a working prototype, in four phases: foundation, exploration, build and
                  showcase. No prior experience required, and what you build is yours.
                </p>
                <span className={s.programmeMore}>
                  Start the course <i className="fas fa-arrow-right" aria-hidden="true" />
                </span>
              </Link>
            </Reveal>

            <Reveal ritardo={200} className={s.programme} style={{ padding: 0 }}>
              <Link href={`${EVENTO}/universita`} className={s.programmeLink}>
                <span className={s.programmeIcon}>
                  <i className="fas fa-flask" aria-hidden="true" />
                </span>
                <div className={s.tags}>
                  <span className={s.tag}>Free</span>
                  <span className={s.tag}>University students</span>
                </div>
                <h3>University track</h3>
                <p>
                  A research project with mentors. The best project is supported towards submission to a peer-reviewed
                  scientific journal.
                </p>
                <span className={s.programmeMore}>
                  The university track <i className="fas fa-arrow-right" aria-hidden="true" />
                </span>
              </Link>
            </Reveal>
          </div>

          <Reveal className={s.programme} style={{ marginTop: 22, padding: 0 }}>
            <Link href={talk ? talkPath(talk.slug) : `${EVENTO}/talk`} className={s.programmeLink}>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 20, alignItems: "start" }}>
                <span className={s.programmeIcon}>
                  <i className="fas fa-video" aria-hidden="true" />
                </span>
                <div>
                  <h3 style={{ marginBottom: 6 }}>Talks with experts</h3>
                  <p>Online meetings with experts, for the students and teachers of the programmes. Some talks are open to everyone.</p>
                  {talk && (
                    <div className={s.talkBox} lang="it">
                      <span className={s.eyebrow}>Prossimo talk</span>
                      <b>{talk.titolo}</b>
                      {talk.relatore.nome} · {talk.dataLabel}, {talk.orarioLabel}, {luogoTalk(talk).toLowerCase()}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── Live numbers ── */}
      {elenco.length >= 3 && (
        <section className={s.band} id="numbers">
          <div className={s.wrap}>
            <Reveal className={s.headRow}>
              <div>
                <span className={s.eyebrow}>In numbers</span>
                <h2 className={s.h2}>The programmes, today</h2>
              </div>
              <span className={s.liveTag}>
                <i aria-hidden="true" /> Live data, updated every hour
              </span>
            </Reveal>
            <div className={s.numbers}>
              {elenco.map((x, i) => (
                <Reveal key={x.etichetta} ritardo={(i % 4) * 80} className={`${s.number} ${x.largo ? s.numberWide : ""}`}>
                  <b>
                    <CountUp valore={x.valore} />
                  </b>
                  <span className={s.numberLabel}>{x.etichetta}</span>
                </Reveal>
              ))}
            </div>
            <p className={s.numbersNote}>
              Counted from the registrations of the programmes. Only totals are shown, never names.
            </p>
          </div>
        </section>
      )}

      {/* ── Why a foundation ── */}
      <section className={s.vision} id="vision">
        <div className={`${s.wrap} ${s.visionGrid}`}>
          <Reveal className={s.visionText}>
            <span className={s.eyebrow}>Our vision</span>
            <h2 className={s.visionStatement}>{COPIA.visionTitle}</h2>
            {COPIA.visionParagraphs.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
            <div className={s.heroActions}>
              <Link href="/about-us" className={`${s.btnGhost} ${s.btnDark}`}>
                About us <i className="fas fa-arrow-right" aria-hidden="true" />
              </Link>
            </div>
          </Reveal>
          <div className={s.commitments}>
            {COPIA.commitments.map((c, i) => (
              <Reveal key={c.title} ritardo={i * 90} className={s.commitment}>
                <i className={`fas ${["fa-hand-holding-heart", "fa-key", "fa-user-graduate", "fa-user-check"][i % 4]}`} aria-hidden="true" />
                <h3>{c.title}</h3>
                <p>{c.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── The story ── */}
      <section id="story">
        <div className={s.storyPhoto}>
          <Image
            src="/assets/images/Taranto/Collaborative/IMG_2756.webp"
            alt="A hall full of school students at the Taranto Biotech Days 2024"
            fill
            sizes="100vw"
          />
          <div className={`${s.wrap} ${s.storyPhotoInner}`}>
            <Reveal>
              <span className={`${s.eyebrow} ${s.eyebrowPhoto}`}>Our story</span>
              <h2>{COPIA.storyTitle}</h2>
            </Reveal>
            <Reveal ritardo={120}>
              <p>{COPIA.storyIntro}</p>
              <div className={s.storyFacts} style={{ marginTop: 22 }}>
                <div>
                  <b>
                    <CountUp valore={1200} suffisso="+" />
                  </b>
                  <span className={s.storyFactLabel}>participants at the Taranto Biotech Days 2024</span>
                </div>
                <div>
                  <b>2025</b>
                  <span className={s.storyFactLabel}>the Foundation is established as an ETS</span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
        <div className={s.bandSoft} style={{ paddingTop: 24 }}>
          <div className={s.wrap}>
            <ol className={s.timeline} style={{ listStyle: "none", margin: 0 }}>
              {COPIA.timeline.map((m, i) => (
                <Reveal
                  key={m.title}
                  as="li"
                  ritardo={i * 70}
                  className={`${s.milestone} ${i === COPIA.timeline.length - 1 ? s.milestoneNow : ""}`}
                >
                  <small>{m.when}</small>
                  <h3>{m.title}</h3>
                  <p>{m.text}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ── Get involved ── */}
      <section className={s.band} id="get-involved">
        <div className={s.wrap}>
          <Reveal>
            <span className={s.eyebrow}>Get involved</span>
            <h2 className={s.h2}>There is a place for you</h2>
          </Reveal>
          <div className={s.roles}>
            {[
              { icona: "fa-graduation-cap", titolo: "Students", testo: "Start the free Agentic AI course, join a programme with your school, and come to Taranto to meet scientists and champions.", href: "/courses/agentic-ai", cta: "Start the course" },
              { icona: "fa-school", titolo: "Schools and teachers", testo: "Bring your classes to the event, free of charge, and follow your teams in the school programme.", href: CHIUSO ? EVENTO : ISCRIZIONE, cta: CHIUSO ? "The event" : "Register for the event" },
              { icona: "fa-user-doctor", titolo: "Experts", testo: "Mentor a team, sit on the committee that evaluates the projects, or give a talk to the students.", href: "mailto:info@bioergotech.org?subject=I%20would%20like%20to%20help", cta: "Write to us" },
              { icona: "fa-people-group", titolo: "Families and the public", testo: "Two days of sport, health and AI in Taranto, with a concert. Free entry, registration required.", href: CHIUSO ? EVENTO : ISCRIZIONE, cta: CHIUSO ? "The event" : "Register for free" },
            ].map((r, i) => (
              <Reveal key={r.titolo} ritardo={i * 90} className={s.role}>
                <i className={`fas ${r.icona}`} aria-hidden="true" />
                <h3>{r.titolo}</h3>
                <p>{r.testo}</p>
                {r.href.startsWith("mailto:") ? <a href={r.href}>{r.cta} →</a> : <Link href={r.href}>{r.cta} →</Link>}
              </Reveal>
            ))}
          </div>

          {PARTNER_PUBBLICI.length > 0 && (
            <div style={{ marginTop: 72 }}>
              <span className={s.eyebrow}>With us at the event</span>
              <div className={s.partners}>
                {PARTNER_PUBBLICI.map((p) => (
                  <div key={p.id} className={s.partner}>
                    <span className={s.partnerLogo}>
                      <Image src={p.img} alt={p.nome} fill sizes="56px" />
                    </span>
                    <div lang="it">
                      <b>{p.nome}</b>
                      {p.ruolo && <span>{p.ruolo}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── News ── */}
      <section className={s.bandSoft} id="news">
        <div className={s.wrap}>
          <Reveal className={s.headRow}>
            <div>
              <span className={s.eyebrow}>News</span>
              <h2 className={s.h2}>From the Foundation</h2>
            </div>
            <Link href="/articles" className={`${s.btnGhost} ${s.btnDark}`}>
              All articles <i className="fas fa-arrow-right" aria-hidden="true" />
            </Link>
          </Reveal>
          <div className={s.news}>
            {NEWS.map((n, i) => (
              <Reveal key={n.href} ritardo={i * 100} style={{ display: "flex" }}>
                <Link href={n.href} className={s.newsCard} style={{ flex: 1 }}>
                  <div className={s.newsImage}>
                    <Image src={n.img} alt="" fill sizes="(max-width: 860px) 100vw, 380px" />
                  </div>
                  <div className={s.newsBody}>
                    <small>{n.data}</small>
                    <h3>{n.titolo}</h3>
                    <p>{n.testo}</p>
                    <span className={s.newsMore}>Read →</span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <FaqSection />

      {/* ── Closing ── */}
      <section className={s.closing} lang="it">
        <div className={s.wrap}>
          <span className={`${s.eyebrow} ${s.eyebrowLight}`}>{EVENT.dataLabel} · Taranto</span>
          <h2>Il futuro della scienza lo costruiscono i ragazzi. Vieni a vederlo.</h2>
          <p>
            {CHIUSO
              ? "Due giornate con campioni, scienziati e i progetti degli studenti: rivivile nella pagina dell'evento."
              : "Due giornate con campioni, scienziati e i progetti degli studenti. Ingresso gratuito, posti limitati."}
          </p>
          <div className={s.closingActions}>
            <Link href={CHIUSO ? EVENTO : ISCRIZIONE} className={s.btnGlow}>
              {CHIUSO ? "Rivivi l'evento" : "Iscriviti gratis"} <i className="fas fa-arrow-right" aria-hidden="true" />
            </Link>
            {!CHIUSO && (
              <Link href={EVENTO} className={s.btnGhost}>
                Scopri il programma
              </Link>
            )}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
