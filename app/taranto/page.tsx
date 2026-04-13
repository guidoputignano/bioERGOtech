import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Taranto Hub - bioERGOtech Foundation",
  description: "The bioERGOtech Foundation's founding innovation hub in Taranto, Southern Italy — developing core technologies at the intersection of biotech and industrial heritage.",
};

export default function Taranto() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="hero bg-light-gray" style={{ paddingTop: "70px" }}>
        <div className="container mx-auto px-6 pt-20 pb-12 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-sm font-semibold mb-4" style={{ color: "var(--primary)" }}>
                <i className="fas fa-map-marker-alt mr-2" /> Taranto, Italy
              </p>
              <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6 text-gray-800">
                The Taranto Innovation Hub
              </h1>
              <p className="text-xl mb-8 text-gray-700">
                Our founding innovation hub in Southern Italy — where we are developing and testing our core technologies at the intersection of biotech and industrial heritage.
              </p>
              <a href="mailto:info@bioergotech.org" className="btn-primary">Get Involved</a>
            </div>
            <div className="flex justify-center">
              <img src="/assets/images/Taranto/Main/first.webp" alt="Taranto Hub" className="rounded-lg shadow-xl w-full max-w-md" />
            </div>
          </div>
        </div>
      </section>

      {/* About the Hub */}
      <section className="section">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="flex justify-center">
              <img src="/assets/images/Taranto/Collaborative/IMG_2756.webp" alt="Taranto Biotech Hub" className="rounded-lg shadow-xl w-full max-w-md" />
            </div>
            <div>
              <h2 className="section-title">A City Reinventing Itself</h2>
              <p className="text-lg mb-6 text-gray-700">
                Taranto has long been known for its industrial past. Today, it is becoming a symbol of transformation — from heavy industry to knowledge economy, from environmental challenge to scientific opportunity.
              </p>
              <p className="text-lg mb-6 text-gray-700">
                The bioERGOtech Taranto Hub is at the heart of this transformation. By establishing a world-class biotechnology centre in Southern Italy, we are creating jobs, training talent, attracting investment, and positioning Taranto as a European hub for life sciences innovation.
              </p>
              <p className="text-lg text-gray-700">
                Our hub is home to the annual <strong>Taranto Biotech Days</strong> and the <strong>BioShot</strong> competition — bringing together over 1,200 participants including world-class researchers from Stanford, ETH Zürich, EPFL, and dozens of other institutions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Stats */}
      <section className="section bg-light-gray">
        <div className="container mx-auto px-6">
          <h2 className="section-title text-center block">Hub Highlights</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center mt-12">
            {[
              { num: "1,200+", label: "Event Participants" },
              { num: "50+", label: "Partner Institutions" },
              { num: "9", label: "BioShot Startups" },
              { num: "3", label: "Countries Represented" },
            ].map((s) => (
              <div key={s.label}>
                <span className="text-5xl font-bold block mb-2" style={{ color: "var(--primary)" }}>{s.num}</span>
                <p className="text-lg text-gray-700 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Taranto Biotech Days */}
      <section className="section">
        <div className="container mx-auto px-6">
          <h2 className="section-title">Taranto Biotech Days</h2>
          <p className="text-xl max-w-3xl text-gray-700 mb-8">
            An annual international conference bringing together researchers, entrepreneurs, clinicians, and innovators to advance the life sciences ecosystem in Southern Italy.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: "fa-microphone", title: "World-Class Speakers", desc: "Experts from Stanford, ETH Zürich, EPFL, and leading institutions worldwide." },
              { icon: "fa-trophy", title: "BioShot Competition", desc: "A startup pitching competition supporting the next generation of biotech entrepreneurs." },
              { icon: "fa-network-wired", title: "Ecosystem Building", desc: "Networking events, workshops, and partnership opportunities across the life sciences." },
            ].map((item) => (
              <div key={item.title} className="card text-center">
                <div className="mb-4"><i className={`fas ${item.icon} text-3xl`} style={{ color: "var(--primary)" }} /></div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-light-gray text-center">
        <div className="container mx-auto px-6">
          <h2 className="section-title block">Get Involved with Taranto</h2>
          <p className="text-xl max-w-3xl mx-auto text-gray-700 mb-8">
            Whether you want to collaborate on research, attend our events, or support the hub — we&apos;d love to hear from you.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a href="mailto:info@bioergotech.org" className="btn-primary">Contact Us</a>
            <Link href="/articles/launch-event" className="btn-outline">Read Launch Event Recap</Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
