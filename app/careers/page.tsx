import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Careers",
  description: "Join bioERGOtech Foundation as a builder. We hire for what you've built, what you want to build, and why it matters.",
  alternates: { canonical: "/careers" },
};

export default function Careers() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="hero bg-light-gray" style={{ paddingTop: "70px" }}>
        <div className="container mx-auto px-6 pt-20 pb-12 relative z-10 text-center">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6 text-gray-800">
            Build a career that{" "}
            <span style={{ color: "var(--primary)" }}>reaches patients</span>
          </h1>
          <p className="text-xl max-w-3xl mx-auto text-gray-700">
            We don&apos;t just look at where you studied. We care about what you&apos;ve built, what you want to build next, and the patients your work could reach.
          </p>
        </div>
      </section>

      {/* Hiring Philosophy */}
      <section className="section" id="philosophy">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="section-title">Our Hiring Philosophy</h2>
              <p className="text-lg mb-6 text-gray-700">
                bioERGOtech is built by people who combine deep technical expertise with a genuine commitment to impact. We look for individuals who are self-directed, intellectually curious, and driven by the opportunity to turn science into solutions that reach patients.
              </p>
              <p className="text-lg mb-6 text-gray-700">
                We value demonstrated output over credentials. Show us what you&apos;ve shipped, published, built, or led, and tell us what you&apos;re determined to achieve next.
              </p>
              <p className="text-lg text-gray-700 font-semibold" style={{ borderLeft: "4px solid var(--primary)", paddingLeft: "16px" }}>
                &ldquo;We are looking for people who think like scientists and act like entrepreneurs.&rdquo;
              </p>
            </div>
            <div className="flex justify-center">
              <Image src="/assets/images/Careers/products.webp" alt="Careers at bioERGOtech" width={6000} height={4000} sizes="(max-width: 768px) 100vw, 448px" className="rounded-lg shadow-xl w-full h-auto max-w-md" />
            </div>
          </div>
        </div>
      </section>

      {/* Commitment */}
      <section className="section bg-light-gray" id="commitment">
        <div className="container mx-auto px-6 max-w-4xl mx-auto text-center">
          <h2 className="section-title block">Our Commitment to You</h2>
          <p className="text-xl text-gray-700 mb-8">
            We are committed to building an inclusive, diverse team that reflects the global nature of the challenges we are addressing. We believe that diverse perspectives make our science better and our solutions more robust.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left mt-8">
            {[
              { icon: "fa-globe", title: "International Environment", desc: "Work with colleagues across Europe, the Middle East, and beyond on challenges that matter globally." },
              { icon: "fa-lightbulb", title: "Autonomy & Ownership", desc: "We trust our people. You will own your work and have the freedom to pursue breakthrough ideas." },
              { icon: "fa-chart-line", title: "Growth & Development", desc: "Access to our global network of mentors, advisors, and partners to accelerate your professional growth." },
            ].map((c) => (
              <div key={c.title} className="card">
                <div className="mb-4"><i className={`fas ${c.icon} text-3xl`} style={{ color: "var(--primary)" }} /></div>
                <h3 className="text-xl font-semibold mb-2">{c.title}</h3>
                <p className="text-gray-600">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Areas of Interest */}
      <section className="section" id="areas">
        <div className="container mx-auto px-6">
          <h2 className="section-title text-center block">Areas of Interest</h2>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto text-center mb-12">
            We&apos;re always looking for exceptional talent in these areas. Even if we don&apos;t have a specific open role, we&apos;d love to hear from you.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { icon: "fa-code", title: "Computer Scientists & AI Engineers", desc: "Build the AI systems, computational pipelines, and digital twin models that power our research platform. Expertise in ML, bioinformatics, or scientific computing." },
              { icon: "fa-dna", title: "Biotech Entrepreneurs & Researchers", desc: "Scientists and innovators with expertise in synthetic biology, cell therapy, biomanufacturing, or multi-omics who want to translate research into real-world impact." },
              { icon: "fa-cogs", title: "Technical Leaders & Project Managers", desc: "Experienced professionals who can lead cross-functional teams, manage complex research programs, and drive projects from concept to completion." },
              { icon: "fa-handshake", title: "Partnership & Operations", desc: "Business development, communications, and operations professionals who can build relationships, manage partnerships, and ensure our organization runs effectively." },
            ].map((a) => (
              <div key={a.title} className="card">
                <div className="flex items-start">
                  <div className="mr-4 mt-1"><i className={`fas ${a.icon} text-2xl`} style={{ color: "var(--primary)" }} /></div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{a.title}</h3>
                    <p className="text-gray-600">{a.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-light-gray text-center">
        <div className="container mx-auto px-6">
          <h2 className="section-title block">Interested?</h2>
          <p className="text-xl max-w-3xl mx-auto text-gray-700 mb-8">
            Send us your CV and a short note on what you&apos;ve built and what you want to build next. We read every application.
          </p>
          <a href="mailto:careers@bioergotech.org" className="btn-primary">Apply at careers@bioergotech.org</a>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
