"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
// The tiny module, not content.ts: the navbar is on every page and must not
// carry the whole event programme in its bundle.
import { ARCHIVE_MODE } from "@/app/eventi/vivere-piu-a-lungo/archivio";

// The Foundation trains students to build digital scientists, and the menu
// follows the programmes: the event first, then the school programme, the
// course and the talks. The startup and research pages (Research, For
// Innovators, For Partners, Careers, the grant navigator) are out of the
// menu but still online, linked from the footer under "More": their URLs
// are indexed and printed material may point to them.
const navLinks = [
  { href: "/eventi/vivere-piu-a-lungo", label: "The Event" },
  { href: "/eventi/vivere-piu-a-lungo/licei", label: "Schools" },
  { href: "/courses/agentic-ai", label: "AI Course" },
  { href: "/eventi/vivere-piu-a-lungo/talk", label: "Talks" },
  { href: "/about-us", label: "About Us" },
  { href: "/articles", label: "Articles" },
];

// A quiet link on the right: "Log in" for visitors (students, teachers and
// judges sign in there and land in their area), the account for whoever is
// already signed in, and their own area when they have one.
const accesso = { href: "/auth/login", label: "Log in" };
const account = { href: "/member-portal", label: "My account" };
// The one call to action on every page: registering for the event. On the
// event pages, which are in Italian, the same button speaks Italian. Once the
// event is archived registrations are closed, so the button only leads to
// the event page, without the #iscrizione anchor.
const joinCta = ARCHIVE_MODE
  ? { href: "/eventi/vivere-piu-a-lungo", label: "The event" }
  : { href: "/eventi/vivere-piu-a-lungo#iscrizione", label: "Join the event" };
const joinCtaEventi = { ...joinCta, label: ARCHIVE_MODE ? "L'evento" : "Iscriviti all'evento" };

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname() ?? "";
  const cta = pathname === "/eventi" || pathname.startsWith("/eventi/") ? joinCtaEventi : joinCta;
  // Students of the programmes do not use the portal: they see "Student
  // area", pointing to their area. Asked only when a Supabase session cookie
  // is there, so visitors make no request; the server decides from the
  // session (/api/account/area).
  const [portale, setPortale] = useState(accesso);

  useEffect(() => {
    if (!document.cookie.includes("-auth-token")) return;
    setPortale(account);
    let attivo = true;
    fetch("/api/account/area", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { area?: { href: string; etichetta: string } | null } | null) => {
        if (attivo && d?.area?.href?.startsWith("/")) setPortale({ href: d.area.href, label: d.area.etichetta });
      })
      .catch(() => {});
    return () => {
      attivo = false;
    };
  }, []);

  return (
    <>
      {/* Progress bar placeholder */}
      <div id="progressBar" style={{ position: "fixed", top: 0, left: 0, height: "3px", background: "var(--primary)", zIndex: 9999, width: "0%", transition: "width 0.2s" }} />

      <nav
        className="navbar"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(10px)",
          boxShadow: "0 2px 20px rgba(0,0,0,0.08)",
          transition: "all 0.3s ease",
        }}
      >
        <div className="container mx-auto px-6 flex items-center justify-between" style={{ height: "70px" }}>
          {/* Logo */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
            <Image
              src="/assets/images/Logo/full_bioergotech.webp"
              alt="bioERGOtech"
              width={160}
              height={36}
              style={{ objectFit: "contain" }}
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  padding: "8px 14px",
                  borderRadius: "6px",
                  color: "var(--dark)",
                  fontWeight: 500,
                  fontSize: "0.875rem",
                  textDecoration: "none",
                  transition: "color 0.2s, background 0.2s",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.color = "var(--primary)";
                  e.currentTarget.style.background = "rgba(19,214,176,0.08)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.color = "var(--dark)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {link.label}
              </Link>
            ))}

            {/* Log in, or the account / area of whoever is signed in */}
            <Link
              key={portale.href}
              href={portale.href}
              style={{
                padding: "8px 14px",
                borderRadius: "6px",
                color: "var(--primary)",
                fontWeight: 600,
                fontSize: "0.875rem",
                textDecoration: "none",
                marginLeft: "4px",
                transition: "background 0.2s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "rgba(19,214,176,0.08)")}
              onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {portale.label}
            </Link>

            {/* Primary CTA: register for the event */}
            <Link
              key={cta.href}
              href={cta.href}
              style={{
                padding: "9px 20px",
                borderRadius: "8px",
                background: "var(--primary)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "0.875rem",
                textDecoration: "none",
                marginLeft: "8px",
                transition: "opacity 0.2s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = "0.85")}
              onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
            >
              {cta.label} →
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "8px", color: "var(--dark)" }}
            aria-label="Toggle menu"
          >
            <i className={`fas ${mobileOpen ? "fa-times" : "fa-bars"} text-xl`} />
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div
            style={{
              background: "#fff",
              borderTop: "1px solid rgba(0,0,0,0.08)",
              padding: "16px 24px 24px",
            }}
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: "block",
                  padding: "12px 0",
                  color: "var(--dark)",
                  fontWeight: 500,
                  fontSize: "1rem",
                  textDecoration: "none",
                  borderBottom: "1px solid rgba(0,0,0,0.05)",
                }}
              >
                {link.label}
              </Link>
            ))}

            <Link
              href={portale.href}
              onClick={() => setMobileOpen(false)}
              style={{
                display: "block",
                padding: "12px 0",
                color: "var(--primary)",
                fontWeight: 600,
                fontSize: "1rem",
                textDecoration: "none",
                borderBottom: "1px solid rgba(0,0,0,0.05)",
              }}
            >
              {portale.label}
            </Link>

            <Link
              href={cta.href}
              onClick={() => setMobileOpen(false)}
              style={{
                display: "block",
                textAlign: "center",
                marginTop: "16px",
                padding: "12px 0",
                background: "var(--primary)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "1rem",
                textDecoration: "none",
                borderRadius: "8px",
              }}
            >
              {cta.label} →
            </Link>
          </div>
        )}
      </nav>
    </>
  );
}
