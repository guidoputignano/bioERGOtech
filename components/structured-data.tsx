/**
 * Organisation and WebSite structured data (JSON-LD).
 *
 * Helps Google understand that bioERGOtech Foundation is a single,
 * named organisation, which supports brand search results and
 * knowledge-panel eligibility. Rendered once, in the root layout.
 */
import { SOCIAL } from "@/lib/social";

const BASE = "https://www.bioergotech.org";

const organisation = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "bioERGOtech Foundation",
  url: BASE,
  logo: `${BASE}/favicon.png`,
  description:
    "bioERGOtech Foundation trains high-school and university students to build digital scientists: AI agents for health, sport and longevity. Its programmes are free and end at the event Vivere più a lungo: sport e intelligenza artificiale, in Taranto.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Taranto",
    addressRegion: "Puglia",
    addressCountry: "IT",
  },
  foundingLocation: {
    "@type": "Place",
    name: "Taranto, Italy",
  },
  contactPoint: {
    "@type": "ContactPoint",
    email: "info@bioergotech.org",
    contactType: "general inquiries",
    areaServed: "Europe",
  },
  knowsAbout: [
    "Agentic AI",
    "AI agents for science",
    "Artificial intelligence education",
    "Biotechnology",
    "Sport and health",
    "Longevity",
  ],
  areaServed: "Europe",
  sameAs: [SOCIAL.linkedin, SOCIAL.instagram],
};

const website = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "bioERGOtech Foundation",
  url: BASE,
};

export function StructuredData() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organisation) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
    </>
  );
}
