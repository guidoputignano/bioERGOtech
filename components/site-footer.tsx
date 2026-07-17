import Link from "next/link";
import Image from "next/image";

export function SiteFooter() {
  return (
    <footer style={{ background: "var(--dark)", color: "#fff", padding: "60px 0 30px" }}>
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", marginBottom: "16px" }}>
              <Image
                src="/assets/images/Logo/short_logo.webp"
                alt="bioERGOtech"
                width={36}
                height={36}
                style={{ objectFit: "contain" }}
              />
              <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#fff" }}>bioERGOtech</span>
            </Link>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.875rem", lineHeight: 1.7 }}>
              Making research smarter, not just faster.
            </p>
            <div style={{ marginTop: "16px" }}>
              <a
                href="https://www.linkedin.com/company/bioergotech"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.1)",
                  color: "#fff",
                  textDecoration: "none",
                  transition: "background 0.2s",
                }}
              >
                <i className="fab fa-linkedin-in" />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 style={{ fontWeight: 700, fontSize: "0.9rem", color: "#fff", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Navigation
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {[
                { href: "/", label: "Home" },
                { href: "/about-us", label: "About Us" },
                { href: "/articles", label: "Articles" },
                { href: "/member-portal", label: "Member Portal" },
              ].map((l) => (
                <li key={l.href} style={{ marginBottom: "10px" }}>
                  <Link href={l.href} style={{ color: "rgba(255,255,255,0.65)", textDecoration: "none", fontSize: "0.9rem", transition: "color 0.2s" }}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Get Involved */}
          <div>
            <h4 style={{ fontWeight: 700, fontSize: "0.9rem", color: "#fff", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Get Involved
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {[
                { href: "/join-us", label: "Join Us" },
                { href: "/partner-with-us", label: "Partner With Us" },
                { href: "/build-with-us", label: "Build With Us" },
                { href: "/navigator", label: "Grant & Funding Navigator" },
                { href: "/careers", label: "Careers" },
              ].map((l) => (
                <li key={l.href} style={{ marginBottom: "10px" }}>
                  <Link href={l.href} style={{ color: "rgba(255,255,255,0.65)", textDecoration: "none", fontSize: "0.9rem", transition: "color 0.2s" }}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ fontWeight: 700, fontSize: "0.9rem", color: "#fff", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Contact
            </h4>
            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.9rem", lineHeight: 1.7 }}>
              <p style={{ marginBottom: "8px" }}>
                <i className="fas fa-envelope" style={{ marginRight: "8px", color: "var(--primary)" }} />
                <Link href="/contact" style={{ color: "rgba(255,255,255,0.65)", textDecoration: "none" }}>
                  Contact Us
                </Link>
              </p>
              <p style={{ marginBottom: "8px" }}>
                <i className="fas fa-envelope" style={{ marginRight: "8px", color: "var(--primary)" }} />
                <a href="mailto:info@bioergotech.org" style={{ color: "rgba(255,255,255,0.65)", textDecoration: "none" }}>
                  info@bioergotech.org
                </a>
              </p>
              <p>
                <i className="fas fa-map-marker-alt" style={{ marginRight: "8px", color: "var(--primary)" }} />
                Via Ciro Giovinazzi 70,<br />
                <span style={{ paddingLeft: "22px" }}>74123 Taranto, Italy</span>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", textAlign: "center" }}>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.8rem" }}>
            &copy; 2025 bioERGOtech Foundation. All rights reserved.
          </p>
          <Link href="/cookie-policy" style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.8rem", textDecoration: "none" }}>
            Cookie Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
