import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { areaById, areasWithPages } from "@/lib/areas";
import { teamForArea } from "@/lib/team";
import { personBySlug } from "@/app/people/people";
import { publicationsFor } from "@/lib/publications";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export function generateStaticParams() {
  return areasWithPages().map((a) => ({ slug: a.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const area = areaById(slug);
  if (!area?.page) return {};
  return {
    title: `${area.label}: research at the bioERGOtech Foundation`,
    description: area.page.lead,
    alternates: { canonical: `/areas/${area.id}` },
  };
}

export default async function AreaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const area = areaById(slug);
  if (!area?.page) notFound();

  const { lead, focus, approach, piSlug, figure } = area.page;
  const pi = personBySlug(piSlug);
  const team = teamForArea(area.id).filter((m) => m.name !== pi?.name);
  const papers = pi ? publicationsFor(pi.slug) : [];

  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        {/* ── Header ── */}
        <section className="section" style={{ paddingTop: 140, paddingBottom: 40 }}>
          <div className="container mx-auto px-6">
            <Link
              href="/build-with-us#ventures"
              className="text-sm font-semibold"
              style={{ color: "var(--primary)" }}
            >
              ← Areas we work in
            </Link>
            <div className="flex items-start gap-5 mt-6">
              <span
                className="icon-circle icon-circle-primary flex-shrink-0"
                style={{ width: 64, height: 64 }}
              >
                <i className={`fas ${area.icon} text-2xl`} />
              </span>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
                  {area.label}
                </h1>
                <p className="text-xl text-gray-700 max-w-3xl leading-relaxed">
                  {lead}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Figure from the area's own published work ── */}
        {figure && (
          <section className="section" style={{ paddingTop: 0, paddingBottom: 60 }}>
            <div className="container mx-auto px-6">
              <figure className="max-w-5xl">
                <Image
                  src={figure.src}
                  alt={figure.alt}
                  width={figure.width}
                  height={figure.height}
                  sizes="(max-width: 1024px) 100vw, 1000px"
                  className="w-full h-auto rounded-xl shadow-lg"
                  priority
                />
                <figcaption className="mt-4 text-gray-600 leading-relaxed">
                  {figure.caption}{" "}
                  <a
                    href={figure.creditHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold whitespace-nowrap"
                    style={{ color: "var(--primary)" }}
                  >
                    {figure.credit} &#8599;
                  </a>
                </figcaption>
              </figure>
            </div>
          </section>
        )}

        {/* ── Focus and approach ── */}
        <section className="section bg-light-gray">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <h2 className="section-title">What we work on</h2>
                <div className="flex flex-col gap-5">
                  {focus.map((para) => (
                    <p key={para.slice(0, 24)} className="text-lg text-gray-700 leading-relaxed">
                      {para}
                    </p>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="section-title">How we work</h2>
                <div className="flex flex-col gap-5">
                  {approach.map((para) => (
                    <p key={para.slice(0, 24)} className="text-lg text-gray-700 leading-relaxed">
                      {para}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Principal investigator ── */}
        {pi && (
          <section className="section">
            <div className="container mx-auto px-6">
              <h2 className="section-title">Principal investigator</h2>
              <Link
                href={`/people/${pi.slug}`}
                className="card block max-w-3xl"
                style={{ padding: 32 }}
              >
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <Image
                    src={pi.photo}
                    alt={`${pi.name}, ${pi.role}`}
                    width={224}
                    height={224}
                    sizes="112px"
                    className="w-28 h-28 rounded-full object-cover flex-shrink-0"
                  />
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-800">{pi.name}</h3>
                    <p className="font-semibold mb-3" style={{ color: "var(--primary)" }}>
                      {pi.role}
                    </p>
                    <p className="text-gray-600 mb-4">{pi.summary}</p>
                    <span className="font-semibold text-sm" style={{ color: "var(--primary)" }}>
                      {papers.length} {papers.length === 1 ? "publication" : "publications"}, and what he works on →
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          </section>
        )}

        {/* ── People ── */}
        {team.length > 0 && (
          <section className="section bg-light-gray">
            <div className="container mx-auto px-6">
              <h2 className="section-title">People in this area</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {team.map((m) => (
                  <div key={m.name} className="card-sm" style={{ padding: 28 }}>
                    <Image
                      src={m.img}
                      alt={`${m.name}, ${m.role}`}
                      width={192}
                      height={192}
                      sizes="96px"
                      className="w-24 h-24 rounded-full object-cover mb-4"
                    />
                    <h3 className="text-lg font-semibold text-gray-800">{m.name}</h3>
                    <p className="font-semibold text-sm mb-3" style={{ color: "var(--primary)" }}>
                      {m.role}
                    </p>
                    <p className="text-gray-600 text-sm">{m.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Next ── */}
        <section className="section" style={{ background: "var(--primary-light)" }}>
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-4 max-w-2xl mx-auto">
              Working on something close to this?
            </h2>
            <p className="text-lg text-gray-700 mb-8 max-w-2xl mx-auto">
              We are looking for collaborators, not customers. If one of the
              questions above is one you are already working on, write to us.
            </p>
            <Link href="/contact" className="btn-primary">
              Start a conversation →
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

export const dynamicParams = false;
