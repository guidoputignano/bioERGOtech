import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join Us - bioERGOtech Foundation",
  description: "Join the bioERGOtech Foundation community. Collaborate with scientists, engineers, and innovators working on synthetic biology, biomanufacturing, and multi-omics analytics.",
};

export default function JoinUs() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="hero bg-light-gray" style={{ paddingTop: "70px" }}>
        <div className="container mx-auto px-6 pt-20 pb-12 relative z-10 text-center">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6 text-gray-800">
            We&apos;re Here for the Changemakers
          </h1>
          <p className="text-xl max-w-3xl mx-auto text-gray-700">
            Whether you&apos;re a researcher pursuing a breakthrough, a clinician bridging science and care, or a supporter committed to human health — there&apos;s a place for you here. Everybody is welcome.
          </p>
        </div>
      </section>

      {/* Find Your Path */}
      <section className="section" id="your-path">
        <div className="container mx-auto px-6">
          <h2 className="section-title text-center block">Find Your Path</h2>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto text-center mb-12">
            We work with diverse communities across the life sciences ecosystem. Choose the path that fits you best.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: "fa-flask", title: "Researchers & Scientists", desc: "Co-lead projects across our four scientific pillars, contribute to publications, and access unique datasets from clinical partners.", href: "mailto:join@bioergotech.org?subject=Researcher%20Inquiry", cta: "Get in touch →" },
              { icon: "fa-stethoscope", title: "Healthcare Professionals", desc: "Bridge clinical practice with innovation. Help validate research against real patient needs and co-develop AI diagnostic tools.", href: "mailto:join@bioergotech.org?subject=Healthcare%20Professional%20Inquiry", cta: "Get in touch →" },
              { icon: "fa-rocket", title: "Innovators & Startups", desc: "Access infrastructure, mentorship, and a collaborative ecosystem to launch and scale your biotech venture.", href: "/build-with-us", cta: "Explore Build With Us →" },
              { icon: "fa-industry", title: "Industry & SMEs", desc: "Integrate advanced AI and biotech capabilities into your operations. Co-develop solutions and access our research network.", href: "/partner-with-us", cta: "Explore partnerships →" },
              { icon: "fa-chart-line", title: "Investors", desc: "Discover high-potential biotech ventures emerging from our portfolio. Access early-stage deal flow across diagnostics, therapeutics, digital health, and medical devices.", href: "mailto:partners@bioergotech.org?subject=Investor%20Inquiry", cta: "Connect with us →" },
              { icon: "fa-hand-holding-heart", title: "Supporters & Philanthropists", desc: "Make a direct contribution to advancing human health. Support specific research projects, fund training programs, or become a founding donor.", href: "mailto:join@bioergotech.org?subject=Supporter%20Inquiry", cta: "Learn how to support →" },
            ].map((p) => (
              <div key={p.title} className="card">
                <div className="mb-4"><i className={`fas ${p.icon} text-4xl`} style={{ color: "var(--primary)" }} /></div>
                <h3 className="text-2xl font-semibold mb-2">{p.title}</h3>
                <p className="text-gray-600 mb-4">{p.desc}</p>
                <a href={p.href} className="font-semibold" style={{ color: "var(--primary)" }}>{p.cta}</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Join */}
      <section className="section bg-light-gray" id="why-join">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="flex justify-center">
              <img src="/assets/images/Join-us/Community.webp" alt="Our Community" className="rounded-lg shadow-xl w-full max-w-md" />
            </div>
            <div>
              <h2 className="section-title">Why Join bioERGOtech</h2>
              <ul className="space-y-4 text-lg text-gray-700">
                {[
                  { title: "Purpose-Driven Work", desc: "Every project connects directly to improving patient outcomes for chronic diseases." },
                  { title: "Global Network", desc: "Direct connections across Italy, Switzerland, Germany, the US, China, and Saudi Arabia." },
                  { title: "Interdisciplinary Collaboration", desc: "Work alongside biologists, engineers, clinicians, and AI specialists on integrated projects." },
                  { title: "Resource Access", desc: "Laboratory facilities, computational resources, clinical datasets, and our global partner network." },
                  { title: "Ownership & Recognition", desc: "Contributions are credited. Projects can become ventures. Excellence is rewarded." },
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

      {/* Ways to Contribute */}
      <section className="section" id="contribute">
        <div className="container mx-auto px-6">
          <h2 className="section-title text-center block">6 Ways to Contribute</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
            {[
              { icon: "fa-microscope", title: "Research Collaboration", desc: "Join as a co-investigator, contribute experiments, co-author publications, and access unique clinical datasets." },
              { icon: "fa-chalkboard-teacher", title: "Advisory Role", desc: "Provide expert guidance on scientific direction, business development, regulatory strategy, or clinical translation." },
              { icon: "fa-calendar-alt", title: "Events & Education", desc: "Speak at or attend our events including Taranto Biotech Days, BioShot, and ecosystem workshops." },
              { icon: "fa-project-diagram", title: "Project-Based Engagement", desc: "Work on specific projects for a defined period — from a few weeks to several months — without a long-term commitment." },
              { icon: "fa-donate", title: "Financial Support", desc: "Fund research projects, sponsor training programs, contribute to equipment acquisition, or support our hub operations." },
              { icon: "fa-users", title: "Mentorship", desc: "Guide early-stage ventures and researchers through our programs, sharing your expertise in biotech, AI, or clinical development." },
            ].map((c) => (
              <div key={c.title} className="card text-center">
                <div className="mb-4"><i className={`fas ${c.icon} text-3xl`} style={{ color: "var(--primary)" }} /></div>
                <h3 className="text-xl font-semibold mb-2">{c.title}</h3>
                <p className="text-gray-600">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-light-gray text-center">
        <div className="container mx-auto px-6">
          <h2 className="section-title block">Ready to Join?</h2>
          <p className="text-xl max-w-3xl mx-auto text-gray-700 mb-8">
            Tell us about yourself, what drives you, and how you want to contribute. We&apos;ll find the right way for you to engage.
          </p>
          <a href="mailto:join@bioergotech.org" className="btn-primary">Get in Touch</a>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
