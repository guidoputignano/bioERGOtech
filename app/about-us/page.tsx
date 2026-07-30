import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "About bioERGOtech | A Synthetic Biology Foundation" },
  description: "bioERGOtech is a foundation building Engineered Living Systems through synthetic biology, AI-driven automation, and human-centred design, with innovation hubs in Taranto, Zurich, and Riyadh.",
  alternates: { canonical: "/about-us" },
};

export default function AboutUs() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="hero bg-light-gray" id="home" style={{ paddingTop: "70px" }}>
        <div className="container mx-auto px-6 pt-20 pb-12 relative z-10 text-center">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6 text-gray-800">
            We turn biotech&apos;s promise into care that{" "}
            <span style={{ color: "var(--primary)" }}>reaches people</span>
          </h1>
          <p className="text-xl max-w-3xl mx-auto text-gray-700">
            bioERGOtech is a foundation, and an ecosystem of researchers, founders, clinicians and partners, building Engineered Living Systems through synthetic biology and AI-driven automation that move from the lab to real patient impact.
          </p>
        </div>
      </section>

      {/* Impact Metrics */}
      <section className="section" id="metrics">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { num: "3", label: "Innovation Hubs", sub: "Taranto · Zurich · Riyadh" },
              { num: "4", label: "Portfolio Companies", sub: "From diagnostics to robotics" },
              { num: "4", label: "Scientific Pillars", sub: "Integrated research domains" },
              { num: "6+", label: "Countries", sub: "Italy · Switzerland · Germany · US · China · Saudi Arabia" },
            ].map((m) => (
              <div key={m.label}>
                <span className="text-5xl md:text-6xl font-bold block mb-2" style={{ color: "var(--primary)" }}>{m.num}</span>
                <p className="text-lg text-gray-700 font-medium">{m.label}</p>
                <p className="text-sm text-gray-500">{m.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why We Exist */}
      <section className="section bg-light-gray" id="mission">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="section-title">Why We Exist</h2>
              <p className="text-lg mb-6 text-gray-700">
                The healthcare industry faces a critical gap: while groundbreaking research happens in laboratories worldwide, too many life-saving innovations never reach the patients who need them. Promising technologies remain trapped in academic settings instead of transforming lives.
              </p>
              <p className="text-lg mb-6 text-gray-700">
                bioERGOtech was founded to close that gap. We advance <strong>Engineered Living Systems</strong>, turning cells into predictable, manufacturable, and controllable living medicines, through four integrated scientific pillars: digital twin therapeutics, synthetic biology, automated biomanufacturing, and multi-omics analytics.
              </p>
              <p className="text-lg text-gray-700 font-semibold">
                We believe breakthrough science must become breakthrough medicine.
              </p>
            </div>
            <div className="flex justify-center">
              <Image src="/assets/images/About-us/1.png" alt="Researchers at work in a bioERGOtech synthetic biology lab" width={1920} height={1080} sizes="(max-width: 768px) 100vw, 448px" className="rounded-lg shadow-xl w-full h-auto max-w-md" />
            </div>
          </div>
        </div>
      </section>

      {/* How We Work */}
      <section className="section" id="how-we-work">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <h2 className="section-title">How We Work</h2>
              <p className="text-lg mb-6 text-gray-700" style={{ borderLeft: "4px solid var(--primary)", paddingLeft: "16px" }}>
                We are a not-for-profit foundation with commercial ambition, built to serve patients, powered by innovation.
              </p>
              <p className="text-lg mb-4 text-gray-700">bioERGOtech operates through a dual model designed to bridge the lab-to-market gap:</p>
              <ul className="space-y-4 text-lg text-gray-700">
                <li className="flex items-start">
                  <i className="fas fa-check-circle mt-1 mr-3" style={{ color: "var(--primary)" }} />
                  <span><strong>AI Development &amp; Spin-off:</strong> We partner with healthcare organizations to develop and spin-off AI algorithms that address specific medical needs.</span>
                </li>
                <li className="flex items-start">
                  <i className="fas fa-check-circle mt-1 mr-3" style={{ color: "var(--primary)" }} />
                  <span><strong>Technology Acceleration:</strong> We accelerate existing patents and lab technologies to market through strategic partnerships.</span>
                </li>
              </ul>
            </div>
            <div className="order-1 md:order-2 flex justify-center">
              <Image src="/assets/images/About-us/2.png" alt="Scientists and founders collaborating in the bioERGOtech ecosystem" width={1920} height={1080} sizes="(max-width: 768px) 100vw, 448px" className="rounded-lg shadow-xl w-full h-auto max-w-md" />
            </div>
          </div>
        </div>
      </section>

      {/* Founder Quote */}
      <section className="section bg-light-gray" id="founder">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-center">
              <div className="md:col-span-1 flex justify-center">
                <Image src="/assets/images/About-us/Guido-Putignano.webp" width={160} height={160} className="w-40 h-40 rounded-full shadow-lg object-cover" alt="Guido Putignano" />
              </div>
              <div className="md:col-span-3">
                <i className="fas fa-quote-left text-3xl mb-4 block opacity-50" style={{ color: "var(--primary)" }} />
                <p className="text-xl md:text-2xl text-gray-700 italic leading-relaxed mb-4">
                  We founded bioERGOtech because we saw too many life-saving innovations trapped between the lab bench and the patient bedside. Our mission is not to make research incrementally better. It is to make it fundamentally smarter, so that breakthroughs reach the people who need them most.
                </p>
                <p className="text-lg font-semibold text-gray-800">Guido Putignano</p>
                <p style={{ color: "var(--primary)" }}>President &amp; Founder, bioERGOtech Foundation</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="section" id="values">
        <div className="container mx-auto px-6">
          <h2 className="section-title text-center block">Our 6 Core Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
            {[
              { icon: "fa-heart", title: "Servant Ambition", desc: "We pursue breakthroughs to serve humanity, matching our ambition with humility." },
              { icon: "fa-lightbulb", title: "Intelligent Agency", desc: "We act with autonomy and responsibility to solve problems and seize opportunities." },
              { icon: "fa-seedling", title: "Sustainable Impact", desc: "We build solutions that are both scientifically sound and economically viable." },
              { icon: "fa-handshake", title: "Generous Excellence", desc: "We share knowledge freely while demanding the highest standards from ourselves." },
              { icon: "fa-brain", title: "Proximity to Genius", desc: "We bring together exceptional people to spark breakthrough discoveries." },
              { icon: "fa-water", title: "Adaptive Resilience", desc: "We reframe every setback as a redirection toward a better solution." },
            ].map((v) => (
              <div key={v.title} className="card text-center">
                <div className="mb-4"><i className={`fas ${v.icon} text-4xl`} style={{ color: "var(--primary)" }} /></div>
                <h3 className="text-2xl font-semibold mb-2">{v.title}</h3>
                <p className="text-gray-600">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who We Are */}
      <section className="section bg-light-gray" id="team">
        <div className="container mx-auto px-6">
          <h2 className="section-title">Who We Are</h2>

          {/* Leadership */}
          <div className="mb-16">
            <h3 className="text-3xl font-bold text-center text-gray-800 mb-8">Leadership</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { img: "/assets/images/About-us/Guido-Putignano.webp", name: "Guido Putignano", role: "President", desc: "Specialized in computational biology, with experience in engineering and AI-driven biomedical solutions." },
                { img: "/assets/images/About-us/Mimma-Leone.webp", name: "Mimma Leone", role: "Board Member", desc: "Legal expert and entrepreneur focused on advancing educational and university projects." },
                { img: "/assets/images/About-us/Carmine-Pisano.webp", name: "Carmine Pisano", role: "Board Member", desc: "Expert in public administration and urban development, specializing in digital transformation." },
                { img: "/assets/images/About-us/Giacomo-Ferrazzini.webp", name: "Giacomo Ferrazzini", role: "Scientific Projects Lead", desc: "Medical student at ETH Zurich and USI, combining advanced medical training with leadership in health science initiatives." },
                { img: "/assets/images/About-us/Alessia-Soru.webp", name: "Alessia Soru", role: "Scientific Projects Lead", desc: "PhD student in Oncology, Hematology and Pathology at the University of Bologna, and Board Member of Women&Tech® ETS." },
                { img: "/assets/images/About-us/Saria-Miccoli.webp", name: "Saria Miccoli", role: "Communication Lead", desc: "Experienced designer who shapes the Foundation's visual identity and communications." },
                { img: "/assets/images/About-us/Olufemi-Olusola.webp", name: "Olufemi Olusola", role: "Scientific Projects Lead", desc: "Biostatistician working at the intersection of agentic AI, clinical data, and digital twin therapeutics." },
                { img: "/assets/images/About-us/Luigi-Fantini.webp", name: "Luigi Fantini", role: "Strategy Lead", desc: "Sales and outreach specialist who has built a career on connecting with people and reaching new markets." },
                { img: "/assets/images/About-us/Oscar-Carrisi.webp", name: "Oscar Carrisi", role: "Strategy Lead", desc: "CEO at Priver and a strategy expert focused on growth and market positioning." },
                { img: "/assets/images/About-us/Margherita-Basile.webp", name: "Margherita Basile", role: "Lawyer", desc: "Lawyer advising the Foundation on governance, contracts, and regulatory compliance." },
                { img: "/assets/images/About-us/Mario-Tagarelli.webp", name: "Mario Tagarelli", role: "Auditor", desc: "Career auditor responsible for the Foundation's financial oversight and compliance." },
              ].map((p) => (
                <div key={p.name} className="card text-center">
                  <Image src={p.img} width={128} height={128} className="w-32 h-32 rounded-full mx-auto mb-4 object-cover" alt={`${p.name}, ${p.role}`} />
                  <h4 className="text-xl font-semibold">{p.name}</h4>
                  <p style={{ color: "var(--primary)" }}>{p.role}</p>
                  <p className="text-gray-600 mt-2">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Advisory Board */}
          <div className="mb-16">
            <h3 className="text-3xl font-bold text-center text-gray-800 mb-8">Advisory Board</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { img: "/assets/images/About-us/Daniela-Marotto.webp", name: "Daniela Marotto", role: "Doctor", desc: "Rheumatologist and leader in Italian health science, recognized for her commitment to multidisciplinary care." },
                { img: "/assets/images/About-us/Pasquale-Persico.webp", name: "Pasquale Persico", role: "Market Access", desc: "Market access and pharma strategy expertise at Gilead Sciences, covering regulatory and reimbursement pathways." },
                { img: "/assets/images/About-us/Roberto-De-Ponti.webp", name: "Roberto De Ponti", role: "Investor", desc: "Managing Director and General Partner at 3B Future Health Fund, a healthcare and biotech venture fund investing in pharmaceuticals and therapeutics at seed and Series A stages." },
                { img: "/assets/images/About-us/Domenico-Amalfitano.webp", name: "Domenico Amalfitano", role: "Policy", desc: "Politician working at the intersection of complex systems and society." },
              ].map((p) => (
                <div key={p.name} className="card text-center">
                  <Image src={p.img} width={128} height={128} className="w-32 h-32 rounded-full mx-auto mb-4 object-cover" alt={`${p.name}, ${p.role}`} />
                  <h4 className="text-xl font-semibold">{p.name}</h4>
                  <p style={{ color: "var(--primary)" }}>{p.role}</p>
                  <p className="text-gray-600 mt-2">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Partners, Supporters, Donors */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              { icon: "fa-handshake", title: "Our Partners", desc: "Strategic research partnerships, healthcare collaborators, portfolio companies, and industry partners." },
              { icon: "fa-users", title: "Our Supporters", desc: "Advisory board members, industry mentors, institutional endorsers, and key community voices." },
              { icon: "fa-hand-holding-heart", title: "Our Donors", desc: "Founding donors, institutional funders, and individual contributors who fuel our mission." },
            ].map((item) => (
              <div key={item.title}>
                <div className="mb-4"><i className={`fas ${item.icon} text-3xl`} style={{ color: "var(--primary)" }} /></div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section text-center" id="get-involved">
        <div className="container mx-auto px-6">
          <h2 className="section-title block">Be Part of What We&apos;re Building</h2>
          <p className="text-xl max-w-3xl mx-auto text-gray-700 mb-8">
            Whether you&apos;re a researcher, innovator, healthcare professional, or supporter, there&apos;s a place for you in the bioERGOtech ecosystem.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link href="/join-us" className="btn-primary">Join Us</Link>
            <Link href="/partner-with-us" className="btn-outline">Partner With Us</Link>
            <Link href="/build-with-us" className="btn-outline">Build With Us</Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
