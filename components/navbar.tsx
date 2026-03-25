"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about-us", label: "About Us" },
  { href: "/build-with-us", label: "Build With Us" },
  { href: "/join-us", label: "Join Us" },
  { href: "/partner-with-us", label: "Partner With Us" },
  { href: "/articles", label: "Articles" },
  { href: "/careers", label: "Careers" },
  { href: "/member-portal", label: "Member Portal" },
];

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
              src="/assets/images/Logo/short_logo.webp"
              alt="bioERGOtech"
              width={36}
              height={36}
              style={{ objectFit: "contain" }}
            />
            <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--dark)", fontFamily: "'Poppins', sans-serif" }}>
              bioERGOtech
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) =>
              link.label === "Member Portal" ? (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "8px",
                    background: "var(--primary)",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    textDecoration: "none",
                    marginLeft: "8px",
                    transition: "opacity 0.2s",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.opacity = "0.85")}
                  onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  {link.label}
                </Link>
              ) : (
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
              )
            )}
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
                  color: link.label === "Member Portal" ? "var(--primary)" : "var(--dark)",
                  fontWeight: link.label === "Member Portal" ? 700 : 500,
                  fontSize: "1rem",
                  textDecoration: "none",
                  borderBottom: "1px solid rgba(0,0,0,0.05)",
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </>
  );
}
