import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { SegmentTabs } from "@/components/segment-tabs";
import Link from "next/link";

/* ── Hero traction stats — keep these reflecting real, current numbers ── */
const HERO_STATS = [
  { num: "4", label: "Active projects" },
  { num: "3", label: "Startups in the portfolio" },
  { num: "ZES", label: "Taranto tax benefits" },
  { num: "2026", label: "Mediterranean Games" },
];

/* ── How it works — three low-friction steps ── */
const STEPS = [
  {
    num: "1",
    title: "Book an exploratory call",
    desc: "15 minutes with the Foundation team. No commitment — we simply work out together whether there's a fit.",
  },
  {
    num: "2",
    title: "We shape your profile",
    desc: "Based on who you are — startup, company, hospital, investor — we map what you can get and what you could bring to the ecosystem.",
  },
  {
    num: "3",
    title: "You enter the ecosystem",
    desc: "Onboarding, access to resources, introductions to the members who matter to you. Operational from day one, not after months of paperwork.",
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
    desc: "Our headquarters, with a physical Startup Hub and the Distributed Lab. A Special Economic Zone with real tax benefits.",
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

/* ── Momentum — most recent real outputs. Update as new ones ship. ── */
const MOMENTUM = [
  {
    date: "June 2026",
    category: "Publication",
    title: "Founding Edition newsletter is live",
    desc: "Our launch, research pillars, first members and upcoming events.",
    href: "/articles/newsletter-june-2026",
  },
  {
    date: "May 2026",
    category: "Project",
    title: "Predict Healthcare joins the Foundation",
    desc: "The Apulian leader in in-vivo diagnostics and imaging joins the ecosystem.",
    href: "/articles/news-predict-healthcare-joins-2026",
  },
  {
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
      <Navbar />

      {/* ── Hero ── */}
      <section className="hero" id="home" style={{ paddingTop: "120px" }}>
        <div className="container mx-auto px-6 pt-8 pb-12 relative z-10">
          <div className="max-w-4xl">
            <p
              className="text-sm font-bold uppercase mb-5"
              style={{ color: "var(--primary)", letterSpacing: "0.08em" }}
            >
              bioERGOtech Foundation ETS · Taranto, Puglia
            </p>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6 text-gray-800">
              The ecosystem that takes your medical solution{" "}
              <span style={{ color: "var(--primary)" }}>from the lab to the market</span>
            </h1>
            <p className="text-xl mb-8 text-gray-700 max-w-3xl">
              Shared infrastructure, a validated clinical network and access to
              regional and European funding — without the cost of doing it all on
              your own.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-14">
              <Link href="#for-you" className="btn-primary text-center">
                See what you get →
              </Link>
              <Link href="/about-us" className="btn-outline text-center">
                Explore active projects
              </Link>
            </div>

            {/* Traction stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {HERO_STATS.map((s) => (
                <div key={s.label}>
                  <div className="stat-number">{s.num}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>
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
            Three steps to go from curious to part of the ecosystem.
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
            Concrete resources you can put to work. The badges show what is
            guaranteed by the Foundation versus what the community makes
            available.
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
          <h2 className="section-title">Where the ecosystem lives</h2>
          <p className="text-lg text-gray-700 max-w-3xl mb-12">
            One operational home and two strategic frontiers — described honestly
            for what they are today.
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

      {/* ── Momentum ── */}
      <section className="section" id="momentum">
        <div className="container mx-auto px-6">
          <h2 className="section-title">Momentum</h2>
          <p className="text-lg text-gray-700 max-w-3xl mb-12">
            Proof the Foundation ships real output — projects, publications and
            new members.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {MOMENTUM.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="card-sm"
                style={{ padding: 24, display: "block" }}
              >
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

      {/* ── Who's already part of it ── */}
      <section className="section bg-light-gray" id="community">
        <div className="container mx-auto px-6">
          <h2 className="section-title">Who&apos;s already part of it</h2>
          <p className="text-lg text-gray-700 max-w-3xl mb-12">
            Real members and partners — each shown with the kind of relationship
            we have, because honest social proof is the only kind worth showing.
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

      {/* ── Final CTA ── */}
      <section className="section" style={{ background: "var(--primary-light)" }}>
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4 max-w-3xl mx-auto">
            2026 founding memberships are open — free for seed-stage startups.
          </h2>
          <p className="text-lg text-gray-700 mb-8 max-w-2xl mx-auto">
            Book a 15-minute call. We&apos;ll work out together whether there&apos;s a
            fit — no commitment, no pressure.
          </p>
          <Link href="/contact" className="btn-primary">
            Book an exploratory call →
          </Link>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
