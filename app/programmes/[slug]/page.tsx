import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { PROGRAMMES, programmeBySlug, STAGE_STYLE, type Programme } from "@/lib/programmes";
import { PUBLICATIONS } from "@/lib/publications";
import { personBySlug } from "@/app/people/people";
import { JsonLd, breadcrumbs } from "@/components/json-ld";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export function generateStaticParams() {
  return PROGRAMMES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = programmeBySlug(slug);
  if (!p) return {};
  return {
    title: `${p.title} (${p.stage})`,
    description: p.summary,
    alternates: { canonical: `/programmes/${p.slug}` },
    openGraph: {
      title: p.title,
      description: p.summary,
      url: `https://www.bioergotech.org/programmes/${p.slug}`,
    },
  };
}

/** A prose block under a heading. */
function Block({
  title,
  paras,
  tone = "default",
}: {
  title: string;
  paras: string[];
  tone?: "default" | "limit";
}) {
  if (!paras.length) return null;
  return (
    <section className="mt-11">
      <h2
        className="text-xl font-bold mb-4"
        style={{ color: tone === "limit" ? "#8A4B2A" : "#1A2B4A" }}
      >
        {title}
      </h2>
      {paras.length === 1 ? (
        <p className="text-gray-700 leading-relaxed text-lg">{paras[0]}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {paras.map((t) => (
            <li key={t} className="flex gap-3 text-gray-700 leading-relaxed">
              <span
                aria-hidden
                className="flex-shrink-0 mt-2"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: tone === "limit" ? "#C97A4E" : "var(--primary)",
                }}
              />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Findings({ rows }: { rows: NonNullable<Programme["findings"]> }) {
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full text-left" style={{ borderCollapse: "collapse", minWidth: 480 }}>
        <thead>
          <tr>
            <th className="text-xs uppercase tracking-wider text-gray-500 pb-3 pr-6">Finding</th>
            <th className="text-xs uppercase tracking-wider text-gray-500 pb-3">Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} style={{ borderTop: "1px solid #E2E8F0" }}>
              <td className="py-3 pr-6 text-gray-700">{r.label}</td>
              <td className="py-3 font-semibold text-gray-800">{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ProgrammePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = programmeBySlug(slug);
  if (!p) notFound();

  const badge = STAGE_STYLE[p.stage];
  const paper = p.publicationDoi
    ? PUBLICATIONS.find((pub) => pub.doi === p.publicationDoi)
    : undefined;
  const people = (p.people ?? []).map(personBySlug).filter(Boolean);

  return (
    <>
      <JsonLd
        data={breadcrumbs([
          { name: "Research programmes", path: "/programmes" },
          { name: p.title, path: `/programmes/${p.slug}` },
        ])}
      />
      {/* Only the published work gets an article node. Nothing here is a
          SoftwareApplication: that type describes something on the market, and
          declaring it for a research prototype would say in markup what the
          page spends a section refusing to say in words. */}
      {paper && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ScholarlyArticle",
            headline: paper.title,
            name: paper.title,
            datePublished: paper.year,
            isPartOf: { "@type": "Periodical", name: paper.venue },
            sameAs: paper.href,
            identifier: paper.doi,
          }}
        />
      )}
      <Navbar />
      <main className="min-h-screen">
        <section className="section" style={{ paddingTop: 140, paddingBottom: 16 }}>
          <div className="container mx-auto px-6 max-w-3xl">
            <Link
              href="/programmes"
              className="text-sm font-semibold"
              style={{ color: "var(--primary)" }}
            >
              ← Research programmes
            </Link>

            <div className="flex items-center gap-3 mt-7 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                {p.field}
              </span>
              <span
                className="text-xs font-bold px-3 py-1 rounded-full"
                style={{ background: badge.bg, color: badge.color }}
              >
                {p.stage}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mt-4 leading-tight">
              {p.title}
            </h1>

            {p.regulatoryStatus && (
              <p
                className="text-sm leading-relaxed mt-6 p-4"
                style={{
                  background: "#FAFBFC",
                  border: "1px solid #E2E8F0",
                  borderLeft: "3px solid #C97A4E",
                  borderRadius: "0 10px 10px 0",
                  color: "#5A6B85",
                }}
              >
                <strong style={{ color: "#8A4B2A" }}>Status.</strong> {p.regulatoryStatus}
              </p>
            )}
          </div>
        </section>

        <section className="section" style={{ paddingTop: 8, paddingBottom: 72 }}>
          <div className="container mx-auto px-6 max-w-3xl">
            <Block title="The setting" paras={p.setting} />
            <Block title="What we did" paras={p.whatWeDid} />

            {p.pullQuote && (
              <blockquote
                className="mt-8 pl-6 text-lg leading-relaxed"
                style={{ borderLeft: "3px solid var(--primary)", color: "#334155" }}
              >
                {p.pullQuote}
              </blockquote>
            )}

            <Block title="What exists now" paras={p.whatExistsNow} />
            {p.findings && <Findings rows={p.findings} />}

            <Block title="What it does not do" paras={p.doesNotDo} tone="limit" />
            <Block title="What has not been established" paras={p.notEstablished} tone="limit" />
            {p.governance && <Block title="Governance" paras={p.governance} />}
            <Block title="Where it goes next" paras={p.whereNext} />

            {p.lookingFor && (
              <section
                className="mt-11 p-6"
                style={{
                  background: "var(--primary-light)",
                  borderRadius: 14,
                  border: "1px solid #BFE9E1",
                }}
              >
                <h2 className="text-lg font-bold text-gray-800 mb-3">
                  What we are looking for
                </h2>
                <p className="text-gray-700 leading-relaxed">{p.lookingFor}</p>
                <Link
                  href="/contact"
                  className="font-semibold mt-4 inline-block"
                  style={{ color: "#0F6E56" }}
                >
                  Get in touch →
                </Link>
              </section>
            )}

            {paper && (
              <section className="mt-11">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Reference</h2>
                <p className="text-gray-700 leading-relaxed">
                  {paper.authors}. <em>{paper.title}</em>. {paper.venue} {paper.year}.{" "}
                  <a
                    href={paper.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold"
                    style={{ color: "var(--primary)" }}
                  >
                    doi:{paper.doi}
                  </a>
                </p>
              </section>
            )}

            {people.length > 0 && (
              <section className="mt-11">
                <h2 className="text-xl font-bold text-gray-800 mb-4">People on this work</h2>
                <div className="flex flex-wrap gap-3">
                  {people.map((person) => (
                    <Link
                      key={person!.slug}
                      href={`/people/${person!.slug}`}
                      className="text-sm font-semibold px-4 py-2 rounded-full"
                      style={{
                        background: "#F3F5F8",
                        color: "#334155",
                        textDecoration: "none",
                      }}
                    >
                      {person!.name} →
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
