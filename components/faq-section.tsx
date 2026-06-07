/**
 * Homepage FAQ section with FAQPage structured data.
 *
 * The visible accordion and the JSON-LD are generated from the same FAQS
 * array, so the structured data always matches the on-page content (a Google
 * requirement for FAQ rich results). Answers target question-style searches
 * around the ecosystem, location, membership, and synthetic biology.
 */
const LINK = "color:#2EC4B6;font-weight:600";

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is the bioERGOtech Foundation?",
    a: "bioERGOtech is a foundation and biotech ecosystem that helps medical and life-science solutions move from the lab to the market. We build Engineered Living Systems through synthetic biology, AI-driven automation, and human-centred design, with innovation hubs in Taranto, Zurich, and Riyadh.",
  },
  {
    q: "Where is bioERGOtech based?",
    a: `Our founding biotech hub is in <a href="/taranto" style="${LINK}">Taranto</a>, in the Puglia region of Southern Italy, with further innovation hubs in Zurich and Riyadh. We work with members across Europe and beyond.`,
  },
  {
    q: "Who can join the ecosystem?",
    a: `Startups, companies, hospitals and clinical centres, universities, and investors. Whether you are an early-stage founder or an established organisation, we map what you can access and how you can contribute. You can <a href="/join-us" style="${LINK}">join the ecosystem</a> in a few steps.`,
  },
  {
    q: "How much does it cost to join?",
    a: `Membership is free for seed-stage startups. For other members, the level of engagement and any contribution depend on your goals. The first step is a short <a href="/contact" style="${LINK}">exploratory call</a>, with no commitment.`,
  },
  {
    q: "What do members get access to?",
    a: "Shared lab infrastructure and equipment, GPU computing, a validated clinical network, hands-on support with regional and European funding, mentorship, and introductions across the ecosystem.",
  },
  {
    q: "What is an Engineered Living System?",
    a: "An Engineered Living System is a biological system designed and built to perform a defined function, combining synthetic biology, automation, and data. They sit at the core of our work, from digital twin therapeutics to automated biomanufacturing.",
  },
  {
    q: "What are the Taranto Biotech Days?",
    a: "The Taranto Biotech Days are our annual event in Southern Italy, home to the BioShot startup competition. They bring together researchers, founders, clinicians, and investors from leading institutions worldwide.",
  },
];

export function FaqSection() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <section className="section" id="faq">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container mx-auto px-6">
        <h2 className="section-title text-center">Frequently asked questions</h2>
        <div className="max-w-3xl mx-auto mt-8 space-y-4">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="card group"
              style={{ padding: 0, overflow: "hidden" }}
            >
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none p-6 font-semibold text-gray-800 [&::-webkit-details-marker]:hidden">
                <span>{f.q}</span>
                <i
                  className="fas fa-chevron-down text-sm transition-transform group-open:rotate-180"
                  style={{ color: "var(--primary)" }}
                  aria-hidden="true"
                />
              </summary>
              <div
                className="px-6 pb-6 text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: f.a }}
              />
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
