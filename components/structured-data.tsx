/**
 * Organisation and WebSite structured data (JSON-LD).
 *
 * Helps Google understand that bioERGOtech Foundation is a single,
 * named organisation, which supports brand search results and
 * knowledge-panel eligibility. Rendered once, in the root layout.
 */
const BASE = "https://www.bioergotech.org";

const organisation = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "bioERGOtech Foundation",
  url: BASE,
  logo: `${BASE}/favicon.png`,
  description:
    "bioERGOtech Foundation develops Engineered Living Systems through synthetic biology, AI-driven automation, and human-centred design.",
  sameAs: [
    "https://www.linkedin.com/company/bioergotech",
  ],
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
