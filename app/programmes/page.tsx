import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { PROGRAMMES, STAGE_STYLE } from "@/lib/programmes";
import { JsonLd, breadcrumbs } from "@/components/json-ld";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Research programmes",
  description:
    "Every programme the bioERGOtech Foundation is running, at the stage it has actually reached, with what each one does not do and what has not been established stated on its own page.",
  alternates: { canonical: "/programmes" },
  openGraph: {
    title: "Research programmes | bioERGOtech Foundation",
    description:
      "Six programmes, from a published cohort study to work with nothing built yet. Each one states its own limits.",
    url: "https://www.bioergotech.org/programmes",
  },
};

export default function ProgrammesPage() {
  return (
    <>
      <JsonLd data={breadcrumbs([{ name: "Research programmes", path: "/programmes" }])} />
      <Navbar />
      <main className="min-h-screen">
        <section className="section" style={{ paddingTop: 140, paddingBottom: 32 }}>
          <div className="container mx-auto px-6">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-5">
              Research programmes
            </h1>
            <p className="text-lg text-gray-700 max-w-3xl leading-relaxed">
              Each one starts from a problem somebody already had. Each page says what
              exists, what it does not do, and what has not been established, because a
              reader cannot tell those apart from the outside.
            </p>
            <p className="text-base text-gray-600 max-w-3xl leading-relaxed mt-4">
              The stage label is the real one. One programme is published, one is
              waiting on a regional approval and is not in use in care, and one has
              nothing built yet.
            </p>
          </div>
        </section>

        <section className="section bg-light-gray" style={{ paddingTop: 40, paddingBottom: 72 }}>
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
              {PROGRAMMES.map((p) => {
                const badge = STAGE_STYLE[p.stage];
                return (
                  <Link
                    key={p.slug}
                    href={`/programmes/${p.slug}`}
                    className="card"
                    style={{ textDecoration: "none", display: "flex", flexDirection: "column" }}
                  >
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        {p.field}
                      </span>
                      <span
                        className="text-xs font-bold px-3 py-1 rounded-full flex-shrink-0"
                        style={{ background: badge.bg, color: badge.color }}
                      >
                        {p.stage}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-3 leading-snug">
                      {p.title}
                    </h2>
                    <p className="text-gray-600 leading-relaxed flex-1">{p.summary}</p>
                    <span
                      className="font-semibold mt-5 inline-block"
                      style={{ color: "var(--primary)" }}
                    >
                      Read the case study →
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section" style={{ paddingTop: 56, paddingBottom: 80 }}>
          <div className="container mx-auto px-6 max-w-3xl">
            <h2 className="section-title block">Bringing us a problem</h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              Every programme above began with somebody who owned the problem and could
              not solve it. If that is you, the useful first message is the question
              itself rather than a proposal.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-7">
              <Link href="/contact" className="btn-primary text-center">
                Start a conversation
              </Link>
              <Link href="/agents" className="btn-outline text-center">
                See the software we have built
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
