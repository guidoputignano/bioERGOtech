/**
 * Homepage FAQ section with FAQPage structured data.
 *
 * The visible accordion and the JSON-LD are generated from the same FAQS
 * array, so the structured data always matches the on-page content (a Google
 * requirement for FAQ rich results). Answers target the questions a student,
 * a parent or a school asks before joining a programme or the event.
 */
const LINK = "color:#127A71;font-weight:600;text-decoration:underline";
const EVENTO = "/eventi/vivere-piu-a-lungo";

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is the bioERGOtech Foundation?",
    a: `A non-profit foundation based in Taranto, Italy. We train high-school and university students to build digital scientists: AI agents that read, test and explain science, with a person in charge. Our programmes are free, and the best projects of the students are presented on stage at <a href="${EVENTO}" style="${LINK}">Vivere più a lungo: sport e intelligenza artificiale</a>.`,
  },
  {
    q: "What is a digital scientist?",
    a: "An AI agent that does part of a scientist's work: it reads papers and data, runs an analysis or a simulation, and explains what it found and how sure it is. A person always stays in charge of the decision. Our students design one around a real question about health, sport or longevity.",
  },
  {
    q: "When and where is the event?",
    a: `On 10 and 11 December 2026 in Taranto: day 1 at the PalaMazzola, from 9:00 to 16:00, and day 2 at the Teatro Fusco, from 9:00 to 13:00. Taking part is free, but registration is required because seats are limited: <a href="${EVENTO}#iscrizione" style="${LINK}">register here</a>.`,
  },
  {
    q: "Who can take part in the programmes?",
    a: `Students in the last three years of upper-secondary school in Taranto and its province, through their school (<a href="${EVENTO}/licei" style="${LINK}">school programme</a>); university students (<a href="${EVENTO}/universita" style="${LINK}">university track</a>); and any high-school student who wants to learn on their own with the free online <a href="/courses/agentic-ai" style="${LINK}">Agentic AI course</a>. No prior experience with AI is required.`,
  },
  {
    q: "How much does it cost?",
    a: "Nothing. The programmes, the course, the talks with experts and the event are free for students, schools and the public.",
  },
  {
    q: "I am a researcher, doctor or professional. How can I help?",
    a: `You can mentor a team, sit on the committee that evaluates the projects, or give a talk to the students. Write to <a href="mailto:info@bioergotech.org" style="${LINK}">info@bioergotech.org</a> and tell us what you would like to do.`,
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
        {/* main.css makes .section-title an inline block: the wrapper centres it. */}
        <div style={{ textAlign: "center" }}>
          <h2 className="section-title text-center" style={{ color: "var(--text-dark)" }}>
            Frequently asked questions
          </h2>
        </div>
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
