import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { FaqSection } from "@/components/faq-section";
import { Countdown } from "@/components/home/countdown";
import {
  EVENT,
  MODERATRICE,
  PARTNER_PUBBLICI,
  RELATORI_PUBBLICI,
  SESSIONS,
  STATS,
} from "@/app/eventi/vivere-piu-a-lungo/content";
import { LICEI } from "@/app/eventi/vivere-piu-a-lungo/licei/content";
import { luogoTalk, prossimoTalk, talkPath } from "@/app/eventi/vivere-piu-a-lungo/talk/content";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import s from "./home.module.css";

/*
 * The homepage. One message: we train students to build digital scientists,
 * and the place where all of it comes together is the event "Vivere più a
 * lungo: sport e intelligenza artificiale". Every section ends in a way to
 * take part, and the main one is registering for the event.
 *
 * The event block is in Italian, like the event and its audience; the rest
 * of the page is in English, like the rest of the site. The event data comes
 * from the event's own content file (read only: the event pages are not
 * touched), so dates, speakers and partners cannot drift from it.
 */

const TITOLO = "bioERGOtech Foundation: we train students to build digital scientists";
const DESCRIZIONE =
  "Free programmes in Taranto and online where high-school and university students learn agentic AI by building digital scientists: AI agents for health, sport and longevity. Join us at Vivere più a lungo, 10 and 11 December 2026.";

export const metadata: Metadata = {
  title: { absolute: TITOLO },
  description: DESCRIZIONE,
  alternates: { canonical: "/" },
  openGraph: {
    title: TITOLO,
    description: DESCRIZIONE,
    url: "https://www.bioergotech.org",
    images: [{ url: "https://www.bioergotech.org/assets/images/eventi/vivere-piu-a-lungo/hero.webp", width: 1600, height: 694, alt: "Vivere più a lungo: sport e intelligenza artificiale, Taranto" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITOLO,
    description: DESCRIZIONE,
    images: ["https://www.bioergotech.org/assets/images/eventi/vivere-piu-a-lungo/hero.webp"],
  },
};

// The next talk and the event state change with the calendar: rebuilt hourly.
export const revalidate = 3600;

const EVENTO = "/eventi/vivere-piu-a-lungo";
const ISCRIZIONE = `${EVENTO}#iscrizione`;

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
  { icona: "fa-seedling", testo: "<b>Students learn by building.</b> Not slides about AI: an agent of their own, around a real question about health, sport or longevity." },
  { icona: "fa-user-doctor", testo: "<b>Experts stay close.</b> Mentors from research and industry follow the teams, and a committee of experts evaluates every project." },
  { icona: "fa-microphone-lines", testo: "<b>The work goes on stage.</b> The ten best school projects are presented in front of the public, the speakers and the press on 10 December." },
];

export default function Home() {
  const talk = prossimoTalk();
  const [giorno1, giorno2] = SESSIONS;
  const altriVolti = Math.max(0, RELATORI_HOME.length + 1 - VOLTI);

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
        <div className={`${s.wrap} ${s.heroInner}`}>
          <span className={`${s.eyebrow} ${s.eyebrowLight}`}>bioERGOtech Foundation · Taranto</span>
          <h1 className={s.heroTitle}>
            We train students to build <em>digital scientists</em>.
          </h1>
          <p className={s.heroLead}>
            Free programmes where high-school and university students learn agentic AI by building AI agents
            for health, sport and longevity, with experts at their side and a stage at the end.
          </p>

          <div className={s.heroEvent} lang="it">
            <div>
              <div className={s.heroEventLabel}>Il grande evento · ingresso gratuito</div>
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
                <Link href={ISCRIZIONE} className={s.btnGlow}>
                  Iscriviti gratis <i className="fas fa-arrow-right" aria-hidden="true" />
                </Link>
                <Link href="#evento" className={s.btnGhost}>
                  Scopri l&apos;evento
                </Link>
              </div>
            </div>
            <Countdown inizio={EVENT.startDateISO} fine={EVENT.endDateISO} />
          </div>
        </div>
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
          <div>
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
                  <span dangerouslySetInnerHTML={{ __html: p.testo }} />
                </li>
              ))}
            </ul>
          </div>

          <div className={s.loop} aria-label="How a digital scientist works">
            <div className={s.loopTop}>
              <span className={s.agentAvatar}>
                <i className="fas fa-robot" aria-hidden="true" />
              </span>
              <span>
                A question from a team: <b style={{ color: "#fff" }}>does training load predict injuries in young athletes?</b>
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
        </div>
      </section>

      {/* ── The event ── */}
      <section className={s.eventBand} id="evento" lang="it">
        <div className={s.wrap}>
          <div className={s.eventHead}>
            <div>
              <span className={`${s.eyebrow} ${s.eyebrowLight}`}>L&apos;evento · {EVENT.dataLabel} · Taranto</span>
              <h2 className={s.eventTitle}>
                Vivere più a lungo: <span>sport e intelligenza artificiale</span>
              </h2>
            </div>
            <p className={s.eventLead}>
              {EVENT.sottotitolo}{" "}
              La partecipazione è gratuita, l&apos;iscrizione è obbligatoria perché i posti sono limitati.
            </p>
          </div>

          <div className={s.days}>
            {[giorno1, giorno2].filter(Boolean).map((g) => (
              <article key={g.slug} className={s.day}>
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
                    {g.capienza} posti
                  </span>
                </div>
              </article>
            ))}
          </div>

          <div className={s.speakersHead}>
            <div>
              <h3>Sul palco</h3>
              <p>Campioni dello sport, medici, scienziati e divulgatori, insieme ai progetti dei ragazzi.</p>
            </div>
            <Link href={EVENTO} className={s.btnGhost}>
              Il programma completo <i className="fas fa-arrow-right" aria-hidden="true" />
            </Link>
          </div>
          <div className={s.speakers}>
            <div className={s.speaker}>
              <div className={s.speakerPhoto}>
                <Image src={MODERATRICE.img} alt={MODERATRICE.nome} fill sizes="(max-width: 560px) 45vw, 180px" />
              </div>
              <b>{MODERATRICE.nome}</b>
              <span>Giornalista Rai, modera la prima giornata</span>
            </div>
            {RELATORI_HOME.slice(0, VOLTI - 1).map((r) => (
              <div key={r.id} className={s.speaker}>
                <div className={s.speakerPhoto}>
                  <Image src={r.img} alt={r.nome} fill sizes="(max-width: 560px) 45vw, 180px" />
                </div>
                <b>{r.nome}</b>
                <span>{r.ruolo}</span>
              </div>
            ))}
            {altriVolti > 0 && (
              <Link href={EVENTO} className={s.speaker} style={{ textDecoration: "none", color: "#fff" }}>
                <div className={s.speakerPhoto} style={{ display: "grid", placeItems: "center", background: "rgba(46,196,182,0.12)" }}>
                  <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--primary)", marginTop: 0 }}>+{altriVolti}</span>
                </div>
                <b>e altri ospiti</b>
                <span>Tutti i relatori nella pagina dell&apos;evento</span>
              </Link>
            )}
          </div>

          <div className={s.eventCta}>
            <div>
              <h3>Ci vediamo a Taranto il 10 e l&apos;11 dicembre</h3>
              <p>Studenti, famiglie, scuole, appassionati: l&apos;ingresso è gratuito, basta iscriversi.</p>
            </div>
            <Link href={ISCRIZIONE} className={s.btnGlow}>
              Iscriviti gratis <i className="fas fa-arrow-right" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Programmes ── */}
      <section className={s.bandSoft} id="programmes">
        <div className={s.wrap}>
          <span className={s.eyebrow}>Our programmes</span>
          <h2 className={s.h2}>Four ways in, one stage</h2>
          <p className={s.lead}>
            Everything is free. Each programme can be followed on its own, and they all lead to the same place: the
            projects of the students, presented in Taranto on 10 December.
          </p>

          <div className={s.programmes}>
            <Link href={`${EVENTO}/licei`} className={`${s.programme} ${s.programmeFeatured}`}>
              <span className={s.programmeIcon}>
                <i className="fas fa-school" aria-hidden="true" />
              </span>
              <div className={s.tags}>
                <span className={s.tag}>Free</span>
                <span className={s.tag}>Upper-secondary schools</span>
                <span className={s.tag}>Taranto and province</span>
              </div>
              <h3>School programme: Biotecnologie e Intelligenza Artificiale</h3>
              <p>
                Teams of students build a project on health, environment or industry, guided by mentors from research
                and industry. A committee of experts evaluates every project, and the {LICEI.progettiSulPalco} best are
                presented on stage at the {LICEI.luogo}.
              </p>
              <div className={s.journey}>
                {[
                  ["Learn", "online lessons and talks with experts"],
                  ["Build", "a team project, with a mentor"],
                  ["Get evaluated", "by a committee of researchers and professionals"],
                  ["Present", "on stage on 10 December, in front of the public"],
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

            <Link href="/courses/agentic-ai" className={s.programme}>
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
                showcase. No prior experience required.
              </p>
              <span className={s.programmeMore}>
                Start the course <i className="fas fa-arrow-right" aria-hidden="true" />
              </span>
            </Link>

            <Link href={`${EVENTO}/universita`} className={s.programme}>
              <span className={s.programmeIcon}>
                <i className="fas fa-flask" aria-hidden="true" />
              </span>
              <div className={s.tags}>
                <span className={s.tag}>Free</span>
                <span className={s.tag}>University students</span>
              </div>
              <h3>University track</h3>
              <p>
                A research project with mentors, and support towards submitting it to a scientific journal.
              </p>
              <span className={s.programmeMore}>
                The university track <i className="fas fa-arrow-right" aria-hidden="true" />
              </span>
            </Link>
          </div>

          <Link href={talk ? talkPath(talk.slug) : `${EVENTO}/talk`} className={s.programme} style={{ marginTop: 22 }}>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 20, alignItems: "start" }}>
              <span className={s.programmeIcon}>
                <i className="fas fa-video" aria-hidden="true" />
              </span>
              <div>
                <h3 style={{ marginBottom: 6 }}>Talks with experts</h3>
                <p>Online meetings with scientists, doctors and innovators, open to the students of every programme.</p>
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
        </div>
      </section>

      {/* ── Get involved ── */}
      <section className={s.band} id="get-involved">
        <div className={s.wrap}>
          <span className={s.eyebrow}>Get involved</span>
          <h2 className={s.h2}>There is a place for you</h2>
          <div className={s.roles}>
            <div className={s.role}>
              <i className="fas fa-graduation-cap" aria-hidden="true" />
              <h3>Students</h3>
              <p>Start the free Agentic AI course today, and come to Taranto to meet scientists and champions.</p>
              <Link href="/courses/agentic-ai">Start the course →</Link>
            </div>
            <div className={s.role}>
              <i className="fas fa-school" aria-hidden="true" />
              <h3>Schools and teachers</h3>
              <p>Bring your classes to the event, free of charge, and follow your teams in the school programme.</p>
              <Link href={ISCRIZIONE}>Register your class →</Link>
            </div>
            <div className={s.role}>
              <i className="fas fa-user-doctor" aria-hidden="true" />
              <h3>Experts</h3>
              <p>Mentor a team, sit on the committee that evaluates the projects, or give a talk to the students.</p>
              <a href="mailto:info@bioergotech.org?subject=I%20would%20like%20to%20help">Write to us →</a>
            </div>
            <div className={s.role}>
              <i className="fas fa-people-group" aria-hidden="true" />
              <h3>Families and the public</h3>
              <p>Two days of sport, health and AI in Taranto, with a concert. Free entry, registration required.</p>
              <Link href={ISCRIZIONE}>Register for free →</Link>
            </div>
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

      {/* ── Who we are ── */}
      <section className={s.bandSoft} id="about">
        <div className={`${s.wrap} ${s.about}`}>
          <div className={s.aboutImage}>
            <Image src="/assets/images/Home/lab_team.webp" alt="The bioERGOtech team" fill sizes="(max-width: 860px) 100vw, 560px" />
          </div>
          <div>
            <span className={s.eyebrow}>Who we are</span>
            <h2 className={s.h2}>A foundation that bets on students</h2>
            <p className={s.lead}>
              bioERGOtech is a non-profit foundation based in Taranto, in the south of Italy. We work with scientists,
              doctors and companies, and we put that network at the service of students: the programmes for young
              people are where our work gives back the most, so that is where we focus.
            </p>
            <div className={s.heroActions}>
              <Link href="/about-us" className={`${s.btnGhost} ${s.btnDark}`}>
                About us <i className="fas fa-arrow-right" aria-hidden="true" />
              </Link>
              <Link href="/articles" className={`${s.btnGhost} ${s.btnDark}`}>
                Articles
              </Link>
            </div>
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
            Due giornate con campioni, scienziati e i progetti degli studenti. Ingresso gratuito, posti limitati.
          </p>
          <div className={s.closingActions}>
            <Link href={ISCRIZIONE} className={s.btnGlow}>
              Iscriviti gratis <i className="fas fa-arrow-right" aria-hidden="true" />
            </Link>
            <Link href={EVENTO} className={s.btnGhost}>
              Scopri il programma
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
