import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { PEOPLE, personBySlug } from "../people";
import { publicationsFor } from "@/lib/publications";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export function generateStaticParams() {
  return PEOPLE.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const person = personBySlug(slug);
  if (!person) return {};
  return {
    title: `${person.name}: ${person.role}, bioERGOtech Foundation`,
    description: person.summary,
    alternates: { canonical: `/people/${person.slug}` },
  };
}

export default async function PersonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const person = personBySlug(slug);
  if (!person) notFound();

  const papers = publicationsFor(person.slug);

  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        {/* ── Header ── */}
        <section className="section" style={{ paddingTop: 140 }}>
          <div className="container mx-auto px-6">
            <Link
              href="/people"
              className="text-sm font-semibold"
              style={{ color: "var(--primary)" }}
            >
              ← People
            </Link>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-10 items-start mt-6">
              <div className="md:col-span-1">
                <Image
                  src={person.photo}
                  alt={`${person.name}, ${person.role} at the bioERGOtech Foundation`}
                  width={320}
                  height={320}
                  sizes="(max-width: 768px) 60vw, 260px"
                  className="w-full max-w-[260px] rounded-xl object-cover shadow-lg"
                  priority
                />
              </div>
              <div className="md:col-span-3">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">
                  {person.name}
                </h1>
                <p
                  className="text-lg font-semibold mb-6"
                  style={{ color: "var(--primary)" }}
                >
                  {person.role}
                </p>
                <ul className="flex flex-col gap-1 mb-8">
                  {person.affiliations.map((a) => (
                    <li key={a} className="text-gray-600">
                      {a}
                    </li>
                  ))}
                </ul>
                {person.email && (
                  <a
                    href={`mailto:${person.email}`}
                    className="btn-outline inline-block"
                  >
                    {person.email}
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── What I work on ── */}
        <section className="section bg-light-gray">
          <div className="container mx-auto px-6">
            <h2 className="section-title">What I work on</h2>
            <div className="max-w-3xl flex flex-col gap-5">
              {person.focus.map((para, i) => (
                <p
                  key={para.slice(0, 24)}
                  className={
                    i === 0
                      ? "text-xl text-gray-800 leading-relaxed"
                      : "text-lg text-gray-700 leading-relaxed"
                  }
                >
                  {para}
                </p>
              ))}
            </div>
            <Link
              href="/#research"
              className="font-semibold inline-block mt-8"
              style={{ color: "var(--primary)" }}
            >
              The Foundation&apos;s research programmes →
            </Link>
          </div>
        </section>

        {/* ── Publications ── */}
        {papers.length > 0 && (
          <section className="section">
            <div className="container mx-auto px-6">
              <h2 className="section-title">Publications</h2>
              <div className="flex flex-col gap-4 max-w-4xl">
                {papers.map((pub) => (
                  <a
                    key={pub.doi}
                    href={pub.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="card-sm block"
                    style={{ padding: 24, borderLeft: "3px solid var(--primary)" }}
                  >
                    <div className="flex flex-wrap items-baseline gap-x-3 mb-2">
                      <span
                        className="font-semibold"
                        style={{ color: "var(--primary-dark)" }}
                      >
                        {pub.venue}
                      </span>
                      <span className="text-sm text-gray-500">{pub.year}</span>
                    </div>
                    <h3 className="text-base font-semibold text-gray-800 leading-snug mb-2">
                      {pub.title}
                    </h3>
                    <p className="text-xs text-gray-500 mb-3">{pub.authors}</p>
                    <span
                      className="text-xs font-semibold"
                      style={{ color: "var(--primary)" }}
                    >
                      doi:{pub.doi} ↗
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
