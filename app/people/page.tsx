import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { PEOPLE } from "./people";
import { publicationsFor } from "@/lib/publications";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "People: principal investigators at the bioERGOtech Foundation",
  description:
    "The people who lead research at the bioERGOtech Foundation, what each works on, and what they have published.",
  alternates: { canonical: "/people" },
};

export default function PeoplePage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <section className="section" style={{ paddingTop: 140 }}>
          <div className="container mx-auto px-6">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
              People
            </h1>
            <p className="text-lg text-gray-700 max-w-3xl mb-12">
              Principal investigators, with what each works on and what they
              have published. The Foundation&apos;s board, advisors and wider
              team are on the{" "}
              <Link
                href="/about-us#team"
                className="font-semibold"
                style={{ color: "var(--primary)" }}
              >
                About page
              </Link>
              .
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {PEOPLE.map((p) => {
                const count = publicationsFor(p.slug).length;
                return (
                  <Link
                    key={p.slug}
                    href={`/people/${p.slug}`}
                    className="card-sm block"
                    style={{ padding: 28 }}
                  >
                    <Image
                      src={p.photo}
                      alt={`${p.name}, ${p.role}`}
                      width={128}
                      height={128}
                      sizes="112px"
                      className="w-28 h-28 rounded-full object-cover mb-5"
                    />
                    <h2 className="text-xl font-semibold text-gray-800">
                      {p.name}
                    </h2>
                    <p
                      className="font-semibold mb-3"
                      style={{ color: "var(--primary)" }}
                    >
                      {p.role}
                    </p>
                    <p className="text-gray-600 text-sm mb-4">{p.summary}</p>
                    <span className="text-sm text-gray-500">
                      {count} {count === 1 ? "publication" : "publications"}
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
