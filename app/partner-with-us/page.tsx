import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Partner With Us | Biotech and Healthcare Innovation in Italy" },
  description: "Partner with the bioERGOtech Foundation. Hospitals, universities, pharma, and investors gain early access to vetted biotech ventures, shared infrastructure, and clinical research collaborations.",
  alternates: { canonical: "/partner-with-us" },
};

export default function PartnerWithUs() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="hero bg-light-gray" style={{ paddingTop: "70px" }}>
        <div className="container mx-auto px-6 pt-20 pb-12 relative z-10 text-center">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6 text-gray-800">
            Plug into a{" "}
            <span style={{ color: "var(--primary)" }}>validated innovation pipeline</span>
          </h1>
          <p className="text-xl max-w-3xl mx-auto text-gray-700 mb-8">
            Hospitals, universities, pharma and investors work with us on shared infrastructure and on research collaborations that reach patients faster.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/join-us" className="btn-primary text-center">Become a partner</Link>
            <Link href="/contact" className="btn-outline text-center">Start a conversation</Link>
          </div>
        </div>
      </section>

      {/* How partnerships work */}
      <section className="section" id="tiers">
        <div className="container mx-auto px-6">
          <h2 className="section-title text-center block">How partnerships work</h2>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto text-center mb-12">
            Three shapes a collaboration takes. They are not levels, nothing here is
            bought, and which one fits depends on the question you bring rather than on
            the size of your organisation.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                shape: "Stay in touch",
                icon: "fa-users",
                desc:
                  "You follow the work: events, publications and the people doing it. " +
                  "Useful when you want to understand what we do before deciding whether " +
                  "there is anything to do together.",
                needs: "No agreement, and nothing owed on either side.",
              },
              {
                shape: "Work on one problem",
                icon: "fa-project-diagram",
                desc:
                  "We run a defined piece of work together: a stated question, a scope, a " +
                  "timeline and named people on both sides. Shared infrastructure and data " +
                  "access are arranged around that work, not offered as a standing benefit.",
                needs:
                  "A written agreement covering IP and authorship, signed before the work starts.",
              },
              {
                shape: "Work across programmes",
                icon: "fa-handshake",
                desc:
                  "A standing relationship spanning more than one programme, usually with " +
                  "joint funding applications and a voice in what we take on next. This is " +
                  "the same work as above, repeated, not a higher grade of it.",
                needs:
                  "A written agreement, plus an agreed way of deciding together what gets picked up.",
              },
            ].map((t) => (
              <div key={t.shape} className="card" style={{ borderTop: "4px solid var(--primary)" }}>
                <div className="text-center mb-4">
                  <i className={`fas ${t.icon} text-3xl`} style={{ color: "var(--primary)" }} />
                </div>
                <h3 className="text-2xl font-bold text-center text-gray-800 mb-3">{t.shape}</h3>
                <p className="text-gray-600 mb-4">{t.desc}</p>
                <p className="text-sm text-gray-700 pt-4" style={{ borderTop: "1px solid #E2E8F0" }}>
                  <strong>What it needs:</strong> {t.needs}
                </p>
              </div>
            ))}
          </div>
          <p className="text-center text-gray-700 mt-10">
            If you are not sure which of these you are asking for, that is normal and it is
            the right thing to start a conversation about.{" "}
            <Link href="/contact" className="font-semibold" style={{ color: "var(--primary)" }}>
              Talk to us
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Types of Partners */}
      <section className="section bg-light-gray" id="types">
        <div className="container mx-auto px-6">
          <h2 className="section-title text-center block">Who We Partner With</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
            {[
              { icon: "fa-hospital", title: "Healthcare & Clinical", desc: "Hospitals, clinical research centres, and patient organizations seeking to integrate advanced therapies and AI diagnostics into practice." },
              { icon: "fa-university", title: "Academic & Research", desc: "Universities and research institutions advancing fundamental science and seeking pathways from discovery to clinical application." },
              { icon: "fa-pills", title: "Pharmaceutical & Biotech", desc: "Industry partners developing next-generation therapeutics who need advanced AI, cell engineering, and biomanufacturing capabilities." },
              { icon: "fa-microchip", title: "Technology Companies", desc: "Tech companies providing platforms, instruments, or infrastructure that can accelerate our research and our portfolio companies." },
              { icon: "fa-landmark", title: "Government & Institutional", desc: "Public bodies and international organizations supporting innovation ecosystems, funding research, and shaping regulatory frameworks." },
              { icon: "fa-heart", title: "Patient Organizations", desc: "Patient advocacy groups whose communities benefit from accelerated development of cell and gene therapies." },
            ].map((p) => (
              <div key={p.title} className="card">
                <div className="mb-4"><i className={`fas ${p.icon} text-3xl`} style={{ color: "var(--primary)" }} /></div>
                <h3 className="text-xl font-semibold mb-2">{p.title}</h3>
                <p className="text-gray-600">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Bring */}
      <section className="section" id="what-we-bring">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="flex justify-center">
              <Image
                src="/assets/images/Partner-With-Us/Partner.webp"
                alt="Healthcare and research partnership at the bioERGOtech Foundation"
                width={6240}
                height={4160}
                sizes="(max-width: 768px) 100vw, 448px"
                className="rounded-lg shadow-xl w-full h-auto max-w-md"
              />
            </div>
            <div>
              <h2 className="section-title">What We Bring to Partnerships</h2>
              <ul className="space-y-4 text-lg text-gray-700">
                {[
                  { title: "Scientific Depth", desc: "Four integrated research pillars: digital twin therapeutics, synthetic biology, automated biomanufacturing, and multi-omics analytics." },
                  { title: "AI & Automation Expertise", desc: "In-house AI development capabilities and access to cutting-edge automated laboratory platforms." },
                  { title: "Clinical Connectivity", desc: "Established relationships with hospitals, patient groups, and clinical research centres across Europe and the Middle East." },
                  { title: "Ecosystem Access", desc: "A global network of investors, entrepreneurs, regulators, and scientific leaders." },
                  { title: "Agile Structure", desc: "A lean, focused foundation that moves quickly and delivers high-quality results without bureaucratic delays." },
                ].map((b) => (
                  <li key={b.title} className="flex items-start">
                    <i className="fas fa-check-circle mt-1 mr-3" style={{ color: "var(--primary)" }} />
                    <span><strong>{b.title}:</strong> {b.desc}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Partnership Process */}
      <section className="section bg-light-gray" id="process">
        <div className="container mx-auto px-6">
          <h2 className="section-title text-center block">How We Partner</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mt-12 text-center">
            {[
              { num: "1", title: "Connect", desc: "Reach out to start a conversation about shared goals and potential areas of collaboration." },
              { num: "2", title: "Explore", desc: "We work together to identify the right partnership model and scope for your needs." },
              { num: "3", title: "Design", desc: "We co-design a partnership agreement with clear objectives, timelines, and responsibilities." },
              { num: "4", title: "Deliver", desc: "We execute together with regular communication, milestone tracking, and transparent reporting." },
            ].map((s) => (
              <div key={s.num}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold text-white" style={{ background: "var(--primary)" }}>{s.num}</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{s.title}</h3>
                <p className="text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section text-center">
        <div className="container mx-auto px-6">
          <h2 className="section-title block">Ready to Join the Ecosystem?</h2>
          <p className="text-xl max-w-3xl mx-auto text-gray-700 mb-8">
            Tell us about your organization and the challenges you&apos;re working on. Apply through our Join Us form and we&apos;ll explore how a partnership could create shared value.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/join-us" className="btn-primary" style={{ textDecoration: "none" }}>
              Apply to Join Us
            </Link>
            <a href="mailto:partners@bioergotech.org" className="btn-outline">
              Contact Our Partnerships Team
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
