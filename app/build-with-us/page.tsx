import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Build With Us - bioERGOtech Foundation",
  description: "Build breakthrough biotech projects with the bioERGOtech Foundation. We provide infrastructure, mentorship, funding access, and partnerships.",
  alternates: { canonical: "/build-with-us" },
};

export default function BuildWithUs() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="hero bg-light-gray" style={{ paddingTop: "70px" }}>
        <div className="container mx-auto px-6 pt-20 pb-12 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6 text-gray-800">
                Go from idea to company,{" "}
                <span style={{ color: "var(--primary)" }}>without going it alone</span>
              </h1>
              <p className="text-xl mb-4 text-gray-700">
                Shared infrastructure, a clinical network to validate your work, hands-on funding support and mentorship, so you can focus on the science while we help carry the rest.
              </p>
              <p className="text-lg mb-8 text-gray-600 italic">
                Nothing is too early stage. If you have an idea that can improve patient lives, we&apos;re all ears.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a href="mailto:build@bioergotech.org" className="btn-primary text-center">Apply Now</a>
                <Link href="/contact" className="btn-outline text-center">Talk to the team</Link>
              </div>
            </div>
            <div className="order-1 md:order-2 flex justify-center">
              <div className="order-1 md:order-2 flex justify-center">
  <div style={{ width: "100%", maxWidth: "520px" }}>
    <div className="order-1 md:order-2 flex justify-center">
  <div style={{ width: "100%", maxWidth: "520px" }}>
    <Image
      src="/assets/images/Build-with-us/Build_with_us.webp"
      alt="Build With Us"
      width={6240}
      height={4160}
      priority
      sizes="(max-width: 768px) 100vw, 520px"
      className="rounded-lg shadow-xl w-full h-auto object-cover"
    />
  </div>
</div>
  </div>
</div>
            </div>
          </div>
        </div>
      </section>

      {/* Staged Programs */}
      <section className="section" id="programs">
        <div className="container mx-auto px-6">
          <h2 className="section-title text-center block">Your Journey With Us</h2>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto text-center mb-12">
            A staged progression from idea to company. Enter at whatever stage matches where you are today.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                num: "1", title: "Validate", duration: "3 to 6 months",
                desc: "Test your concept against real clinical needs. We help you determine whether your idea solves a meaningful problem before you commit to building a company.",
                items: ["Clinical need assessment with our healthcare network", "Technical feasibility review by our scientific team", "Market landscape analysis and competitive positioning", "Mentorship from domain experts and entrepreneurs"],
                note: "For: researchers with promising ideas, academics exploring commercialization, teams at concept stage.",
              },
              {
                num: "2", title: "Incubate", duration: "6 to 12 months",
                desc: "Build your company with dedicated resources. We provide the infrastructure, team, and strategic support to go from validated concept to minimum viable product.",
                items: ["Access to laboratory facilities and technical infrastructure", "Dedicated mentorship from biotech and AI experts", "Regulatory and compliance guidance", "Introductions to our investor network", "Spin-off support and company formation"],
                note: "For: validated teams ready to build, spin-offs from our research partnerships, BioShot competition winners.",
              },
              {
                num: "3", title: "Accelerate", duration: "12+ months",
                desc: "Scale to market with strategic partnerships and follow-on funding. We help portfolio companies expand internationally and reach commercial milestones.",
                items: ["Strategic partnerships with hospitals and pharma companies", "Follow-on funding support from VCs and strategic investors", "International expansion across our hub network", "Clinical validation and pilot programme facilitation"],
                note: "For: portfolio companies with product-market fit, ventures seeking scale and international expansion.",
              },
            ].map((stage) => (
              <div key={stage.num} className="card" style={{ borderTop: "4px solid var(--primary)" }}>
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3" style={{ background: "var(--primary)", color: "#fff" }}>
                    <span className="font-bold">{stage.num}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800">{stage.title}</h3>
                </div>
                <p className="text-sm font-semibold mb-3" style={{ color: "var(--primary)" }}>{stage.duration}</p>
                <p className="text-gray-600 mb-4">{stage.desc}</p>
                <ul className="space-y-2 text-gray-700">
                  {stage.items.map((item) => (
                    <li key={item} className="flex items-start">
                      <i className="fas fa-check mt-1 mr-2 text-sm" style={{ color: "var(--primary)" }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-gray-500 italic mt-4">{stage.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Provide */}
      <section className="section bg-light-gray" id="support">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="flex justify-center">
              <Image src="/assets/images/Build-with-us/Acceleration_Program.webp" alt="Our Support" width={3464} height={2309} sizes="(max-width: 768px) 100vw, 448px" className="rounded-lg shadow-xl w-full h-auto max-w-md" />
            </div>
            <div>
              <h2 className="section-title">What We Provide</h2>
              <div className="space-y-6">
                {[
                  { icon: "fa-building", title: "Infrastructure", desc: "Access to innovation hubs in Taranto, Zurich, and Riyadh with laboratory space, automated systems, and co-working facilities." },
                  { icon: "fa-user-tie", title: "Mentorship", desc: "Direct guidance from biotech industry veterans, successful entrepreneurs, AI and biotechnology experts, and regulatory specialists." },
                  { icon: "fa-coins", title: "Funding Access", desc: "Seed funding for promising ventures, connections to our investor network across Europe, US, and Asia, and support securing follow-on capital." },
                  { icon: "fa-network-wired", title: "Strategic Network", desc: "Introductions to hospitals, pharmaceutical companies, universities, and healthcare systems including partners like Gilead Sciences and Fondazione Telethon." },
                ].map((item) => (
                  <div key={item.title}>
                    <h3 className="text-xl font-semibold text-gray-800 mb-1">
                      <i className={`fas ${item.icon} mr-2`} style={{ color: "var(--primary)" }} /> {item.title}
                    </h3>
                    <p className="text-gray-600">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Portfolio */}
      <section className="section" id="portfolio">
        <div className="container mx-auto px-6">
          <h2 className="section-title text-center block">Our Portfolio</h2>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto text-center mb-12">
            Four companies across diagnostics, digital health, medical devices, and robotics, spanning three continents.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: "fa-microscope", name: "OncoTarget", type: "Diagnostics", desc: "UZH Zurich spin-off targeting Asian markets with organoid-based cancer diagnostics." },
              { icon: "fa-brain", name: "CranioTech", type: "Medical Devices", desc: "Italian startup developing physiological pattern measurement technology." },
              { icon: "fa-laptop-medical", name: "pluracure", type: "Digital Health", desc: "TUM-incubated AI platform for chronic disease management." },
              { icon: "fa-robot", name: "Xperbot", type: "Robotics & Physical AI", desc: "European distributor for robotics technology and Physical AI development." },
            ].map((c) => (
              <div key={c.name} className="card text-center">
                <div className="mb-3"><i className={`fas ${c.icon} text-3xl`} style={{ color: "var(--primary)" }} /></div>
                <h3 className="text-xl font-semibold mb-1">{c.name}</h3>
                <p className="text-sm font-semibold mb-2" style={{ color: "var(--primary)" }}>{c.type}</p>
                <p className="text-gray-600 text-sm">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Look For */}
      <section className="section bg-light-gray" id="looking-for">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="section-title">What We Look For</h2>
              <ul className="space-y-4 text-lg text-gray-700">
                {[
                  { title: "Patient-Focused Innovation", desc: "Solutions that directly improve patient outcomes or healthcare delivery." },
                  { title: "Strong Technical Foundation", desc: "Proven technology with clear competitive advantages and scientific rigour." },
                  { title: "Committed Founders", desc: "Teams ready to commit fully to building something meaningful." },
                  { title: "Scalable Models", desc: "Ventures with potential for significant growth and multi-market impact." },
                ].map((item) => (
                  <li key={item.title} className="flex items-start">
                    <i className="fas fa-check-circle mt-1 mr-3" style={{ color: "var(--primary)" }} />
                    <span><strong>{item.title}:</strong> {item.desc}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-center">
              <Image src="/assets/images/Build-with-us/ventures.jpg" alt="Types of Ventures" width={1920} height={1080} sizes="(max-width: 768px) 100vw, 448px" className="rounded-lg shadow-xl w-full h-auto max-w-md" />
            </div>
          </div>
        </div>
      </section>

      {/* Venture Focus Areas */}
      <section className="section" id="ventures">
        <div className="container mx-auto px-6">
          <h2 className="section-title text-center block">Venture Focus Areas</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mt-12 text-center">
            {[
              { icon: "fa-laptop-medical", label: "AI-Powered Diagnostics" },
              { icon: "fa-dna", label: "Therapeutic Technologies" },
              { icon: "fa-mobile-alt", label: "Digital Health Platforms" },
              { icon: "fa-robot", label: "Medical Devices & Robotics" },
              { icon: "fa-flask", label: "Biotech Innovations" },
            ].map((f) => (
              <div key={f.label} className="card py-6">
                <div className="mb-3"><i className={`fas ${f.icon} text-2xl`} style={{ color: "var(--primary)" }} /></div>
                <p className="font-semibold text-gray-800">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-light-gray text-center" id="apply">
        <div className="container mx-auto px-6">
          <h2 className="section-title block">Ready to Build?</h2>
          <p className="text-xl max-w-3xl mx-auto text-gray-700 mb-8">
            Email us at <a href="mailto:build@bioergotech.org" className="font-semibold" style={{ color: "var(--primary)" }}>build@bioergotech.org</a> with your background, the problem you&apos;re solving, your current stage, and why you want to build this breakthrough. We review every submission personally.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <a href="mailto:build@bioergotech.org" className="btn-primary">Apply Now</a>
            <Link href="/join-us" className="btn-outline">Not ready yet? Join our community first →</Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
