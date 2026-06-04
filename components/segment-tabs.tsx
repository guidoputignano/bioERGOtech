"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * "You're in the right place if…" — the section that answers
 * "is this for me?" in about 20 seconds. Each segment shows a context
 * card (who you are + what to do) next to a "what you get" card.
 *
 * Per the Foundation's direction, we deliberately do NOT show fees here —
 * the focus is the value a member receives, not the price of entry.
 */

type Segment = {
  id: string;
  tab: string;
  title: string;
  destination: string; // matching nav label, so people know where this lives
  scenario: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  benefits: { icon: string; text: string }[];
};

const SEGMENTS: Segment[] = [
  {
    id: "startup",
    tab: "Startup / Innovator",
    title: "You're building a healthcare venture",
    destination: "For Innovators",
    scenario:
      "You have an idea or an early-stage company and need infrastructure, clinical validation, and capital to grow — without burning your runway on overhead.",
    primaryCta: { label: "Start building", href: "/build-with-us" },
    secondaryCta: { label: "Apply now", href: "/join-us" },
    benefits: [
      { icon: "fa-flask", text: "Shared lab space and bookable equipment" },
      { icon: "fa-hospital", text: "A clinical network to validate your solution" },
      { icon: "fa-coins", text: "Hands-on support for NIDI, Mini-PIA, ZES & EU grants" },
      { icon: "fa-user-tie", text: "Mentorship and a Board of Advisors" },
      { icon: "fa-toolbox", text: "Email, 1TB storage, Google Ads credit & Canva Pro" },
      { icon: "fa-handshake", text: "Warm introductions to our investor network" },
    ],
  },
  {
    id: "company",
    tab: "Established Company",
    title: "You want to innovate beyond your core",
    destination: "For Innovators",
    scenario:
      "You're an established company or SME looking to open a new health-tech line, tap external R&D capacity, or connect with startups and talent.",
    primaryCta: { label: "Build with us", href: "/build-with-us" },
    secondaryCta: { label: "Talk to the team", href: "/contact" },
    benefits: [
      { icon: "fa-diagram-project", text: "Co-development projects with defined scope" },
      { icon: "fa-flask", text: "Access to shared infrastructure and datasets" },
      { icon: "fa-seedling", text: "A pipeline of vetted startups and talent" },
      { icon: "fa-coins", text: "Guidance on regional and European incentives" },
      { icon: "fa-store", text: "New distribution and commercial channels" },
      { icon: "fa-user-tie", text: "Strategic advisory across the ecosystem" },
    ],
  },
  {
    id: "hospital",
    tab: "Hospital / Clinic",
    title: "You want early access to what's next",
    destination: "For Partners",
    scenario:
      "You're a hospital or clinical center that wants first access to validated innovations and meaningful research collaborations.",
    primaryCta: { label: "Become a partner", href: "/partner-with-us" },
    secondaryCta: { label: "Start a conversation", href: "/contact" },
    benefits: [
      { icon: "fa-vial-circle-check", text: "Pilot programmes with vetted ventures" },
      { icon: "fa-file-lines", text: "Co-authored research and publications" },
      { icon: "fa-laptop-medical", text: "Access to shared digital health tools" },
      { icon: "fa-coins", text: "Joint grant and funding applications" },
      { icon: "fa-route", text: "Visibility into the innovation pipeline" },
      { icon: "fa-magnifying-glass", text: "Clinical needs matched to real solutions" },
    ],
  },
  {
    id: "university",
    tab: "University / Research",
    title: "You want research to reach patients",
    destination: "For Partners",
    scenario:
      "You're a university or research institute seeking to translate discoveries into impact and to connect academia with industry.",
    primaryCta: { label: "Become a partner", href: "/partner-with-us" },
    secondaryCta: { label: "Start a conversation", href: "/contact" },
    benefits: [
      { icon: "fa-arrows-turn-to-dots", text: "Technology transfer and spin-off support" },
      { icon: "fa-rocket", text: "A clear commercialization pathway" },
      { icon: "fa-flask", text: "Shared infrastructure and datasets" },
      { icon: "fa-file-lines", text: "Co-authorship on publications" },
      { icon: "fa-user-graduate", text: "Opportunities for students and researchers" },
      { icon: "fa-coins", text: "Joint funding and grant applications" },
    ],
  },
  {
    id: "investor",
    tab: "Investor",
    title: "You want vetted, de-risked deal flow",
    destination: "For Partners",
    scenario:
      "You're an impact investor looking for curated, de-risked opportunities in European health-tech — backed by real validation.",
    primaryCta: { label: "Explore the ecosystem", href: "/partner-with-us" },
    secondaryCta: { label: "Request a briefing", href: "/contact" },
    benefits: [
      { icon: "fa-folder-open", text: "Curated access to the active portfolio" },
      { icon: "fa-magnifying-glass-chart", text: "Due-diligence support from our team" },
      { icon: "fa-hand-holding-dollar", text: "Co-investment opportunities" },
      { icon: "fa-user-tie", text: "An advisory role in the ecosystem" },
      { icon: "fa-star", text: "Early access to portfolio companies" },
      { icon: "fa-calendar-check", text: "Invitations to ecosystem events" },
    ],
  },
  {
    id: "pharma",
    tab: "Pharma / CRO",
    title: "You want a research and validation partner",
    destination: "For Partners",
    scenario:
      "You're a pharma, biotech, or CRO seeking research partnerships, added validation capacity, or a direct line into emerging innovation.",
    primaryCta: { label: "Become a partner", href: "/partner-with-us" },
    secondaryCta: { label: "Start a conversation", href: "/contact" },
    benefits: [
      { icon: "fa-diagram-project", text: "Project-based research collaborations" },
      { icon: "fa-lightbulb", text: "Access to validated ventures and IP" },
      { icon: "fa-hospital", text: "A connected clinical validation network" },
      { icon: "fa-flask", text: "Shared infrastructure and computing capacity" },
      { icon: "fa-scale-balanced", text: "Regulatory and advisory expertise" },
      { icon: "fa-store", text: "Distribution and commercial channels" },
    ],
  },
];

export function SegmentTabs() {
  const [active, setActive] = useState(SEGMENTS[0].id);
  const segment = SEGMENTS.find((s) => s.id === active) ?? SEGMENTS[0];

  return (
    <section className="section" id="for-you">
      <div className="container mx-auto px-6">
        <h2 className="section-title">You&apos;re in the right place if…</h2>
        <p className="text-lg text-gray-700 max-w-3xl mb-8">
          Whoever you are, the ecosystem is built around what you need. Pick the
          profile that fits you best.
        </p>

        {/* Tab pills */}
        <div className="pill-nav mb-10">
          {SEGMENTS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`pill-btn ${active === s.id ? "active" : ""}`}
              onClick={() => setActive(s.id)}
              aria-pressed={active === s.id}
            >
              {s.tab}
            </button>
          ))}
        </div>

        {/* Two cards: context (left) + what you get (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Left — context + CTAs */}
          <div className="card" style={{ borderTop: "4px solid var(--primary)" }}>
            <span
              className="text-xs font-bold uppercase tracking-wide"
              style={{ color: "var(--primary)", letterSpacing: "0.08em" }}
            >
              {segment.destination}
            </span>
            <h3 className="text-2xl font-bold text-gray-800 mt-3 mb-4">
              {segment.title}
            </h3>
            <p className="text-gray-600 mb-8 text-lg leading-relaxed">
              {segment.scenario}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href={segment.primaryCta.href} className="btn-primary text-center">
                {segment.primaryCta.label}
              </Link>
              <Link href={segment.secondaryCta.href} className="btn-outline text-center">
                {segment.secondaryCta.label}
              </Link>
            </div>
          </div>

          {/* Right — what you get */}
          <div
            className="card"
            style={{ background: "var(--primary-light)", borderColor: "transparent" }}
          >
            <span
              className="text-xs font-bold uppercase text-gray-500"
              style={{ letterSpacing: "0.08em" }}
            >
              What you get
            </span>
            <ul className="mt-5 space-y-4">
              {segment.benefits.map((b) => (
                <li key={b.text} className="flex items-start gap-3">
                  <span
                    className="icon-circle icon-circle-primary"
                    style={{ width: 38, height: 38, borderRadius: 10, background: "#fff" }}
                  >
                    <i className={`fas ${b.icon}`} style={{ color: "var(--primary)" }} />
                  </span>
                  <span className="text-gray-700 pt-1.5">{b.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
