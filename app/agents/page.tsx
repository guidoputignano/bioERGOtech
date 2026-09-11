import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { softwareProgrammes, STAGE_STYLE } from "@/lib/programmes";
import { JsonLd, breadcrumbs } from "@/components/json-ld";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Software we have built",
  description:
    "The software artefacts from bioERGOtech Foundation research programmes, each with its stage, what it does not do, and its regulatory status. None is a medical device and none is in use in care.",
  alternates: { canonical: "/agents" },
  openGraph: {
    title: "Software we have built | bioERGOtech Foundation",
    description:
      "Research artefacts, not products. Each one states its stage and its limits.",
    url: "https://www.bioergotech.org/agents",
  },
};

/**
 * The software subset of /programmes.
 *
 * This reads from lib/programmes.ts rather than carrying records of its own.
 * A separate registry would mean the same artefact described in two places,
 * and the description that drifts is always the one with the limits in it.
 *
 * Every card carries its regulatory status, because a list of software is
 * exactly where a reader is most likely to read research artefacts as a
 * catalogue of things they could buy or use.
 */
export default function AgentsPage() {
  const items = softwareProgrammes();

  return (
    <>
      <JsonLd
        data={breadcrumbs([
          { name: "Research programmes", path: "/programmes" },
          { name: "Software we have built", path: "/agents" },
        ])}
      />
      <Navbar />
      <main className="min-h-screen">
        <section className="section" style={{ paddingTop: 140, paddingBottom: 32 }}>
          <div className="container mx-auto px-6">
            <Link
              href="/programmes"
              className="text-sm font-semibold"
              style={{ color: "var(--primary)" }}
            >
              ← Research programmes
            </Link>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mt-6 mb-5">
              Software we have built
            </h1>
            <p className="text-lg text-gray-700 max-w-3xl leading-relaxed">
              The {items.length} programmes whose artefact is software. Each one is a
              research artefact at the stage it has actually reached, and each links to
              the full case study behind it.
            </p>

            <div
              className="max-w-3xl mt-8 p-5"
              style={{
                background: "#FAFBFC",
                border: "1px solid #E2E8F0",
                borderLeft: "3px solid #C97A4E",
                borderRadius: "0 12px 12px 0",
              }}
            >
              <p className="text-base leading-relaxed" style={{ color: "#5A6B85" }}>
                <strong style={{ color: "#8A4B2A" }}>None of this is a product.</strong>{" "}
                Nothing listed here is CE marked, none of it has been through a
                conformity assessment, and none of it is in use in patient care. Where
                a build turned out to sit inside EU MDR Annex VIII Rule 11, we say so
                on its page and we stopped there rather than deploying behind a
                disclaimer.
              </p>
            </div>
          </div>
        </section>

        <section className="section bg-light-gray" style={{ paddingTop: 40, paddingBottom: 72 }}>
          <div className="container mx-auto px-6">
            <div className="flex flex-col gap-6">
              {items.map((p) => {
                const badge = STAGE_STYLE[p.stage];
                return (
                  <Link
                    key={p.slug}
                    href={`/programmes/${p.slug}`}
                    className="card"
                    style={{ textDecoration: "none" }}
                  >
                    <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
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
                    <p className="text-gray-600 leading-relaxed">{p.summary}</p>

                    {p.regulatoryStatus && (
                      <p
                        className="text-sm leading-relaxed mt-4 pt-4"
                        style={{ borderTop: "1px solid #E2E8F0", color: "#5A6B85" }}
                      >
                        <strong style={{ color: "#8A4B2A" }}>Status.</strong>{" "}
                        {p.regulatoryStatus}
                      </p>
                    )}

                    <p className="text-sm mt-4" style={{ color: "#64748B" }}>
                      <strong>What it does not do.</strong> {p.doesNotDo[0]}
                    </p>

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
      </main>
      <SiteFooter />
    </>
  );
}
