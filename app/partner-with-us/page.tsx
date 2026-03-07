import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Partner with Us',
  description:
    'Partner with the bioERGOtech Foundation. Collaborate on research, technology transfer, and innovation to advance Engineered Living Systems.',
  alternates: { canonical: 'https://bioergotech.org/partner-with-us' },
}

export default function PartnerWithUsPage() {
  return (
    <>
      {/* Hero */}
      <section className="hero bg-light-gray" style={{ paddingTop: 80 }}>
        <div className="container mx-auto px-6 pt-28 pb-12 text-center">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6 text-gray-800">
            Partner <span className="gradient-text">with Us</span>
          </h1>
          <p className="text-xl max-w-3xl mx-auto text-gray-700">
            Collaborate with bioERGOtech to advance research, develop technology, and create lasting patient impact.
          </p>
        </div>
      </section>

      {/* Partnership Types */}
      <section className="section">
        <div className="container mx-auto px-6">
          <h2 className="section-title">Partnership Models</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            {[
              { icon: 'fa-handshake', title: 'Research Collaboration', desc: 'Co-develop AI algorithms, run joint studies, and share expertise to tackle pressing biotech challenges.' },
              { icon: 'fa-industry', title: 'Technology Transfer', desc: 'Accelerate your existing patents and laboratory technologies to market through our network and infrastructure.' },
              { icon: 'fa-coins', title: 'Investment Partnership', desc: 'Support groundbreaking research with measurable outcomes and co-invest in spin-off ventures from our ecosystem.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="approach-card">
                <div className="card-icon"><i className={`fas ${icon}`} /></div>
                <h3 className="text-xl font-semibold mb-4 text-gray-800">{title}</h3>
                <p className="text-gray-700">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="section bg-light-gray">
        <div className="container mx-auto px-6 text-center">
          <h2 className="section-title">Start a Conversation</h2>
          <p className="text-xl mb-10 max-w-2xl mx-auto text-gray-700">
            Tell us about your organisation and how you see a potential collaboration with bioERGOtech.
          </p>
          <Link href="/member-portal" className="btn-primary inline-block">Get in Touch</Link>
        </div>
      </section>
    </>
  )
}
