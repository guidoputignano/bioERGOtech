import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { SegmentTabs } from "@/components/segment-tabs";
import { FaqSection } from "@/components/faq-section";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute:
      "bioERGOtech Foundation: The Biotech Ecosystem From Lab to Market",
  },
  description:
    "bioERGOtech Foundation is the biotech ecosystem that takes your medical solution from the lab to the market. Synthetic biology, shared lab infrastructure, a validated clinical network, and access to regional and European funding.",
  alternates: { canonical: "/" },
  openGraph: {
    title:
      "bioERGOtech Foundation: The Biotech Ecosystem From Lab to Market",
    description:
      "Shared lab infrastructure, a validated clinical network, and access to regional and European funding. The ecosystem that takes your medical solution from the lab to the market.",
    url: "https://www.bioergotech.org",
  },
};

/* The global main.css overrides --primary-light with a harsh saturated mint
   (#61ffe0). We pin it back to a soft, on-brand tint for the homepage so every
   tinted surface (tabs, icon tiles, tags, the closing CTA) stays gentle. */
const SOFT_BRAND: CSSProperties = { "--primary-light": "#E1F5EE" } as CSSProperties;

/* ── Hero traction stats — keep these reflecting real, current numbers ── */
const HERO_STATS = [
  { num: "4", label: "Active projects" },
  { num: "3", label: "Startups in the portfolio" },
  { num: "3", label: "Innovation hubs" },
  { num: "6+", label: "Countries reached" },
];

/* ── How it works — three low-friction steps ── */
const STEPS = [
  {
    num: "1",
    title: "Book an exploratory call",
    desc: "Fifteen minutes with the Foundation team, with no commitment. Together we understand whether there is a fit.",
  },
  {
    num: "2",
    title: "We shape your profile",
    desc: "Based on who you are, whether a startup, company, hospital or investor, we map what you can access and what you might contribute to the ecosystem.",
  },
  {
    num: "3",
    title: "You enter the ecosystem",
    desc: "Onboarding, access to resources and introductions to the members most relevant to you. Operational from the first day, not after months of paperwork.",
  },
];

/* ── Badge legend for the infrastructure section ── */
type BadgeKind = "foundation" | "community" | "coming";
const BADGE_STYLE: Record<BadgeKind, { label: string; bg: string; color: string }> = {
  foundation: { label: "Foundation", bg: "#E1F5EE", color: "#0F6E56" },
  community: { label: "Community", bg: "#E6F1FB", color: "#185FA5" },
  coming: { label: "Coming soon", bg: "#EEF1F5", color: "#5A6B7B" },
};

const BENEFITS: { icon: string; title: string; desc: string; badges: BadgeKind[] }[] = [
  {
    icon: "fa-flask",
    title: "Distributed lab",
    desc: "Shared equipment and spaces you can book online.",
    badges: ["foundation", "community", "coming"],
  },
  {
    icon: "fa-microchip",
    title: "GPU computing",
    desc: "Compute capacity for AI and biomedical data analysis.",
    badges: ["community", "coming"],
  },
  {
    icon: "fa-building",
    title: "Shared physical spaces",
    desc: "Offices, meeting rooms and operational space opened up by members.",
    badges: ["foundation", "community"],
  },
  {
    icon: "fa-toolbox",
    title: "Digital tools",
    desc: "@bioergotech.org email, 1TB storage, €120k/yr Google Ads and Canva Pro.",
    badges: ["foundation"],
  },
  {
    icon: "fa-hospital",
    title: "Clinical validation network",
    desc: "Direct connections to hospitals, clinicians and research centers.",
    badges: ["foundation", "community"],
  },
  {
    icon: "fa-coins",
    title: "Access to funding",
    desc: "Active support on NIDI, Mini-PIA, PIA, ZES benefits and European grants.",
    badges: ["foundation", "community"],
  },
  {
    icon: "fa-user-tie",
    title: "Board of Advisors",
    desc: "Advisors across regulatory, clinical development, IP and commercialization.",
    badges: ["foundation", "community"],
  },
  {
    icon: "fa-store",
    title: "Commercial channels",
    desc: "Distribution through the commercial platforms of our members.",
    badges: ["community", "coming"],
  },
];

/* ── Hubs — honest about the current stage of each ── */
const HUBS = [
  {
    city: "Taranto",
    status: "Operational",
    operational: true,
    desc: "Our founding home, with a physical Startup Hub and the Distributed Lab. A Special Economic Zone with real tax benefits.",
    tags: ["Startup Hub", "Distributed Lab", "ZES", "Med Games 2026"],
    href: "/taranto",
  },
  {
    city: "Zurich",
    status: "In development",
    operational: false,
    desc: "A strategic hub for European and international partnerships, embedded in one of the world's leading life-sciences ecosystems.",
    tags: ["Life sciences", "EU pharma", "Partnerships"],
    href: null,
  },
  {
    city: "Riyadh",
    status: "In development",
    operational: false,
    desc: "A strategic presence aligned with Vision 2030, opening access to a fast-growing Saudi healthcare market.",
    tags: ["Vision 2030", "KSA healthcare", "Partnerships"],
    href: null,
  },
];

/* ── Recent updates — most recent real outputs. Update as new ones ship. ── */
type Update = {
  img: string;
  date: string;
  category: string;
  title: string;
  desc: string;
  href: string;
  cover?: "newsletter";
};
const UPDATES: Update[] = [
  {
    img: "/assets/images/Home/News/newsletter_june2026.webp",
    date: "June 2026",
    category: "Publication",
    title: "Founding Edition newsletter is live",
    desc: "Our launch, research pillars, first members and upcoming events.",
    href: "/articles/newsletter-june-2026",
    cover: "newsletter",
  },
  {
    img: "/assets/images/News/Predict/predict-welcome.webp",
    date: "May 2026",
    category: "Project",
    title: "Predict Healthcare joins the Foundation",
    desc: "The Apulian leader in in-vivo diagnostics and imaging joins the ecosystem.",
    href: "/articles/news-predict-healthcare-joins-2026",
  },
  {
    img: "/assets/images/Home/News/Guido_Walter.webp",
    date: "February 2026",
    category: "Project",
    title: "GenoGra closes €1M pre-seed round",
    desc: "An Italian portfolio startup scaling toward clinical genomics.",
    href: "/articles/news-genogra-preseed-2026",
  },
];

/* ── Who's already part of it — named, with the type of relationship ── */
const COMMUNITY = [
  { name: "Predict Healthcare", relation: "Active member", color: "#0F6E56", bg: "#E1F5EE" },
  { name: "Priver", relation: "Active member", color: "#0F6E56", bg: "#E1F5EE" },
  { name: "GenoGra", relation: "Portfolio startup", color: "#5A6B7B", bg: "#EEF1F5" },
];

export default function Home() {
  return (
    <>
      <style>{`
        .course-card-hover { transition: transform 0.2s, box-shadow 0.2s; }
        .course-card-hover:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(46,196,182,0.18); }
      `}</style>
      <Navbar />

      <div style={SOFT_BRAND}>
      {/* ── Hero ── */}
      <section className="hero" id="home" style={{ paddingTop: "120px" }}>
        <div className="container mx-auto px-6 pt-8 pb-40 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6 text-gray-800">
                The ecosystem that takes your medical solution{" "}
                <span style={{ color: "var(--primary)" }}>from the lab to the market</span>
              </h1>
              <p className="text-xl mb-8 text-gray-700">
                Shared infrastructure, a validated clinical network and access to
                regional and European funding, without the cost of doing it all
                on your own.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="#for-you" className="btn-primary text-center">
                  See what you get →
                </Link>
                <Link href="/about-us" className="btn-outline text-center">
                  Explore active projects
                </Link>
              </div>
            </div>
            <div className="order-1 md:order-2 flex justify-center">
              <Image
                src="/assets/images/Home/Automation.webp"
                alt="Automated biomanufacturing inside the bioERGOtech ecosystem"
                width={1536}
                height={1024}
                priority
                sizes="(max-width: 768px) 100vw, 448px"
                className="rounded-lg shadow-xl w-full h-auto max-w-md"
              />
            </div>
          </div>

          {/* Traction stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-14">
            {HERO_STATS.map((s) => (
              <div key={s.label}>
                <div className="stat-number">{s.num}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── You're in the right place if… (segment tabs) ── */}
      <SegmentTabs />

      {/* ── How it works ── */}
      <section className="section bg-light-gray" id="how-it-works">
        <div className="container mx-auto px-6">
          <h2 className="section-title">How it works</h2>
          <p className="text-lg text-gray-700 max-w-3xl mb-12">
            Three steps, from a first conversation to full membership.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step) => (
              <div key={step.num} className="card" style={{ borderTop: "4px solid var(--primary)" }}>
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-5 font-bold text-lg"
                  style={{ background: "var(--primary)", color: "#fff" }}
                >
                  {step.num}
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-800">{step.title}</h3>
                <p className="text-gray-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Infrastructure & benefits with badges ── */}
      <section className="section" id="infrastructure">
        <div className="container mx-auto px-6">
          <h2 className="section-title">What you find inside the ecosystem</h2>
          <p className="text-lg text-gray-700 max-w-3xl mb-8">
            Concrete resources you can put to work. The badges indicate what the
            Foundation provides directly and what the community makes available.
          </p>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mb-12">
            {(Object.keys(BADGE_STYLE) as BadgeKind[]).map((k) => (
              <span
                key={k}
                className="badge"
                style={{ background: BADGE_STYLE[k].bg, color: BADGE_STYLE[k].color }}
              >
                {BADGE_STYLE[k].label}
              </span>
            ))}
          </div>

          {/* 2×4 grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {BENEFITS.map((b) => (
              <div key={b.title} className="card-sm flex items-start gap-4" style={{ padding: 24 }}>
                <span
                  className="icon-circle icon-circle-primary"
                  style={{ width: 48, height: 48 }}
                >
                  <i className={`fas ${b.icon} text-xl`} />
                </span>
                <div>
                  <h3 className="text-lg font-semibold mb-1 text-gray-800">{b.title}</h3>
                  <p className="text-gray-600 mb-3 text-sm">{b.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {b.badges.map((kind) => (
                      <span
                        key={kind}
                        className="badge"
                        style={{
                          background: BADGE_STYLE[kind].bg,
                          color: BADGE_STYLE[kind].color,
                          fontSize: "0.65rem",
                        }}
                      >
                        {BADGE_STYLE[kind].label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Hubs ── */}
      <section className="section bg-light-gray" id="hubs">
        <div className="container mx-auto px-6">
          <h2 className="section-title">Where the ecosystem grows</h2>
          <p className="text-lg text-gray-700 max-w-3xl mb-12">
            Our network spans one operational home today, with two strategic
            frontiers in development. Taranto is where we started. Our ambitions
            reach further.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HUBS.map((hub) => (
              <div key={hub.city} className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-semibold text-gray-800">{hub.city}</h3>
                  <span
                    className="badge"
                    style={
                      hub.operational
                        ? { background: "#E1F5EE", color: "#0F6E56" }
                        : { background: "#EEF1F5", color: "#5A6B7B" }
                    }
                  >
                    {hub.status}
                  </span>
                </div>
                <p className="text-gray-600 mb-5">{hub.desc}</p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {hub.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-3 py-1 rounded-full"
                      style={{ background: "var(--primary-light)", color: "var(--primary-dark)" }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                {hub.href && (
                  <Link href={hub.href} className="font-semibold" style={{ color: "var(--primary)" }}>
                    Learn more →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Recent updates ── */}
      <section className="section" id="updates">
        <div className="container mx-auto px-6">
          <h2 className="section-title">Recent updates</h2>
          <p className="text-lg text-gray-700 max-w-3xl mb-12">
            A selection of recent milestones from across the ecosystem.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {UPDATES.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="bg-white rounded-lg shadow-lg overflow-hidden block course-card-hover"
              >
                {item.cover === "newsletter" ? (
                  <div
                    className="w-full h-44 relative overflow-hidden flex flex-col items-center justify-center"
                    style={{
                      background:
                        "radial-gradient(120% 120% at 100% 0%, #D8FBF1 0%, #F4FFFC 45%, #ffffff 100%)",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        right: -70,
                        top: -70,
                        width: 200,
                        height: 200,
                        borderRadius: "50%",
                        background:
                          "radial-gradient(circle, rgba(16,216,176,0.18) 0%, rgba(16,216,176,0) 70%)",
                      }}
                    />
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        color: "#088A74",
                        marginBottom: 16,
                        zIndex: 1,
                      }}
                    >
                      Issue #1 · Founding Edition
                    </div>
                    <Image
                      src="/assets/images/Logo/full_bioergotech.webp"
                      alt="bioERGOtech"
                      width={196}
                      height={48}
                      style={{ width: 196, maxWidth: "70%", height: "auto", zIndex: 1 }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: 4,
                        background: "linear-gradient(90deg, #10D8B0 0%, #088A74 100%)",
                      }}
                    />
                  </div>
                ) : (
                  <div className="relative w-full h-44">
                    <Image src={item.img} alt={item.title} fill sizes="(max-width: 768px) 100vw, 400px" className="object-cover" />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3 text-sm">
                    <span style={{ color: "var(--text-light)" }}>{item.date}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "var(--primary-light)", color: "var(--primary-dark)" }}
                    >
                      {item.category}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-800">{item.title}</h3>
                  <p className="text-gray-600 text-sm mb-3">{item.desc}</p>
                  <span className="font-semibold text-sm" style={{ color: "var(--primary)" }}>
                    Read more →
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/articles" className="btn-outline">
              View all articles
            </Link>
          </div>
        </div>
      </section>


      {/* ── Agentic AI Course ── */}
      <section className="section" id="courses">
        <div className="container mx-auto px-6">
          <h2 className="section-title">Learn to build AI agents</h2>
          <p className="text-lg text-gray-700 max-w-3xl mb-12">
            A free 10-week programme for high school students. Go from understanding what AI agents are to building and demonstrating a working prototype — no prior coding experience required.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div className="md:col-span-2 bg-white rounded-xl shadow-lg overflow-hidden block course-card-hover">
              <div className="w-full h-48 flex flex-col justify-end p-8" style={{ background: "linear-gradient(135deg, #00C896 0%, #1D9E75 100%)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.78)", marginBottom: 8 }}>Free Program · Open Enrollment</div>
                <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1.2, margin: 0 }}>
                  Agentic AI <span style={{ color: "#0A1628" }}>High School</span> Innovation Program
                </h3>
              </div>
              <div className="p-6">
                <div className="flex gap-6 mb-4">
                  {[["10", "Weeks"], ["21+", "Lessons"], ["3", "Technical Tracks"], ["100%", "Free"]].map(([num, label]) => (
                    <div key={label} className="text-center">
                      <div style={{ fontSize: 20, fontWeight: 800, color: "var(--primary)", fontFamily: "'Sora', sans-serif" }}>{num}</div>
                      <div style={{ fontSize: 11, color: "#718096" }}>{label}</div>
                    </div>
                  ))}
                </div>
                <p className="text-gray-600 text-sm mb-4">Build real AI agents that solve genuine problems. Choose your track — no-code, low-code, or full-code. Earn a verified certificate on completion.</p>
                <Link href="/courses/agentic-ai" className="btn-primary inline-block">Start learning →</Link>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              {[
                { icon: "🧠", title: "AI Foundations", desc: "Understand how LLMs and agents actually work." },
                { icon: "🛠", title: "Build a prototype", desc: "Ship a working agent in your chosen domain." },
                { icon: "🎓", title: "Verified certificate", desc: "Earn a certificate issued by the Foundation." },
              ].map((item) => (
                <div key={item.title} className="bg-white rounded-xl p-5 shadow" style={{ borderLeft: "3px solid var(--primary)" }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{item.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#1A2332", marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: "#4A5568" }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Upcoming event callout ── */}
      <section className="section bg-light-gray" id="event">
        <div className="container mx-auto px-6">
          <div
            className="rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-2"
            style={{ background: "#fff", boxShadow: "var(--shadow)" }}
          >
            <div
              className="p-8 md:p-10 flex flex-col justify-center"
              style={{ background: "linear-gradient(135deg, #00C896 0%, #1D9E75 100%)" }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.82)", marginBottom: 10 }}>
                Evento · Taranto · 11 e 12 dicembre 2026
              </div>
              <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 24, fontWeight: 800, color: "#fff", lineHeight: 1.2, margin: 0 }}>
                Vivere più a lungo: sport e intelligenza artificiale
              </h3>
              <p style={{ color: "rgba(255,255,255,0.92)", fontSize: 15, marginTop: 12, lineHeight: 1.6 }}>
                Due giornate con scienziati, medici e campioni dello sport. Iscrizione gratuita, posti limitati.
              </p>
            </div>
            <div className="p-8 md:p-10 flex flex-col justify-center">
              <div className="flex flex-wrap gap-6 mb-6">
                {[["8", "Relatori"], ["10", "Progetti"], ["8", "Startup"]].map(([num, label]) => (
                  <div key={label}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: "var(--primary)", fontFamily: "'Sora', sans-serif" }}>{num}</div>
                    <div style={{ fontSize: 12, color: "#718096" }}>{label}</div>
                  </div>
                ))}
              </div>
              <Link href="/eventi/vivere-piu-a-lungo" className="btn-primary inline-block text-center">
                Scopri l&apos;evento e iscriviti →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Who's already part of it ── */}
      <section className="section bg-light-gray" id="community">
        <div className="container mx-auto px-6">
          <h2 className="section-title">Who&apos;s already part of it</h2>
          <p className="text-lg text-gray-700 max-w-3xl mb-12">
            Organisations already building alongside us, each shown with the
            nature of our relationship.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {COMMUNITY.map((m) => (
              <div key={m.name} className="card-sm text-center" style={{ padding: 28 }}>
                <h3 className="text-xl font-bold text-gray-800 mb-3">{m.name}</h3>
                <span className="badge" style={{ background: m.bg, color: m.color }}>
                  {m.relation}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <FaqSection />

      {/* ── Final CTA ── */}
      <section className="section" style={{ background: "var(--primary-light)" }}>
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4 max-w-3xl mx-auto">
            Founding memberships for 2026 are now open.
          </h2>
          <p className="text-lg text-gray-700 mb-8 max-w-2xl mx-auto">
            Membership is free for seed-stage startups. Book a fifteen-minute
            call and we will explore together whether there is a fit, with no
            commitment.
          </p>
          <Link href="/contact" className="btn-primary">
            Book an exploratory call →
          </Link>
        </div>
      </section>
      </div>

      <SiteFooter />
    </>
  );
}
