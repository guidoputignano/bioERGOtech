"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

// Visitor-centred labels: speak to who you are and what you get,
// not to what the Foundation does. URLs are unchanged so nothing
// already indexed breaks.
const navLinks = [
  { href: "/about-us", label: "About Us" },
  { href: "/build-with-us", label: "For Innovators" },
  { href: "/partner-with-us", label: "For Partners" },
  { href: "/articles", label: "Articles" },
  { href: "/careers", label: "Careers" },
];

// Persistent calls to action, always visible on the right of the nav.
const memberPortal = { href: "/member-portal", label: "Member Portal" };
const joinCta = { href: "/join-us", label: "Join the Ecosystem" };

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

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
          <div className="hidden md:flex items-center gap-1">
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

            {/* Member Portal — quiet link for people already inside */}
            <Link
              key={memberPortal.href}
              href={memberPortal.href}
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
              {memberPortal.label}
            </Link>

            {/* Primary CTA — for everyone who isn't a member yet */}
            <Link
              key={joinCta.href}
              href={joinCta.href}
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
              {joinCta.label} →
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden"
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
              href={memberPortal.href}
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
              {memberPortal.label}
            </Link>

            <Link
              href={joinCta.href}
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
              {joinCta.label} →
            </Link>
          </div>
        )}
      </nav>
    </>
  );
}
