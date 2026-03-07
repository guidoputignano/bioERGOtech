import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'Learn about the bioERGOtech Foundation — our mission, team, scientific advisory board, and vision for advancing Engineered Living Systems.',
  alternates: { canonical: 'https://bioergotech.org/about-us' },
}

export default function AboutUsPage() {
  return (
    <>
      {/* Hero */}
      <section className="hero bg-light-gray" id="home" style={{ paddingTop: 80 }}>
        <div className="container mx-auto px-6 pt-28 pb-12 relative z-10 text-center">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6 text-gray-800">
            Engineering the Future of Living Medicine
          </h1>
          <p className="text-xl max-w-3xl mx-auto text-gray-700">
            A foundation transforming living cells into precisely controllable therapeutic agents through the
            convergence of synthetic biology, AI, and automated biomanufacturing.
          </p>
        </div>
      </section>

      {/* Impact Metrics */}
      <section className="section">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { number: '3', label: 'Innovation Hubs', sub: 'Taranto · Zurich · Riyadh' },
              { number: '4', label: 'Portfolio Companies', sub: 'From diagnostics to robotics' },
              { number: '4', label: 'Scientific Pillars', sub: 'Integrated research domains' },
              { number: '6+', label: 'Countries', sub: 'Italy · Switzerland · Germany · US · China · Saudi Arabia' },
            ].map(({ number, label, sub }) => (
              <div key={label}>
                <span className="text-5xl md:text-6xl font-bold block mb-2" style={{ color: 'var(--primary)' }}>{number}</span>
                <p className="text-lg text-gray-700 font-medium">{label}</p>
                <p className="text-sm text-gray-500">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why We Exist */}
      <section className="section bg-light-gray">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="section-title">Why We Exist</h2>
              <p className="text-lg mb-6 text-gray-700">
                The healthcare industry faces a critical gap: while groundbreaking research happens in laboratories
                worldwide, too many life-saving innovations never reach the patients who need them.
              </p>
              <p className="text-lg mb-6 text-gray-700">
                bioERGOtech was founded to close that gap. We advance{' '}
                <strong>Engineered Living Systems</strong> — turning cells into predictable, manufacturable, and
                controllable living medicines — through four integrated scientific pillars: digital twin therapeutics,
                synthetic biology, automated biomanufacturing, and multi-omics analytics.
              </p>
              <p className="text-lg text-gray-700 font-semibold">
                We believe breakthrough science must become breakthrough medicine.
              </p>
            </div>
            <div className="flex justify-center">
              <Image src="/assets/images/About-us/1.png" alt="Lab research" width={480} height={360} className="rounded-lg shadow-xl w-full max-w-md" />
            </div>
          </div>
        </div>
      </section>

      {/* How We Work */}
      <section className="section">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <h2 className="section-title">How We Work</h2>
              <p className="text-lg mb-6 text-gray-700" style={{ borderLeft: '4px solid var(--primary)', paddingLeft: 16 }}>
                We are a not-for-profit foundation with commercial ambition — built to serve patients, powered by
                innovation.
              </p>
              <ul className="space-y-4 text-lg text-gray-700">
                <li className="flex items-start">
                  <i className="fas fa-check-circle mt-1 mr-3" style={{ color: 'var(--primary)' }} />
                  <span>
                    <strong>AI Development &amp; Spin-off:</strong> We partner with healthcare organisations to
                    develop and spin-off AI algorithms that address specific medical needs.
                  </span>
                </li>
                <li className="flex items-start">
                  <i className="fas fa-check-circle mt-1 mr-3" style={{ color: 'var(--primary)' }} />
                  <span>
                    <strong>Technology Acceleration:</strong> We accelerate existing patents and lab technologies to
                    market through strategic partnerships.
                  </span>
                </li>
              </ul>
            </div>
            <div className="order-1 md:order-2 flex justify-center">
              <Image src="/assets/images/About-us/2.png" alt="Team collaboration" width={480} height={360} className="rounded-lg shadow-xl w-full max-w-md" />
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="section bg-light-gray">
        <div className="container mx-auto px-6">
          <h2 className="section-title">Our Team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 mt-12">
            {[
              { name: 'Guido Putignano', img: 'Guido-Putignano.webp', role: 'CEO & Co-Founder' },
              { name: 'Mimma Leone', img: 'Mimma-Leone.webp', role: 'Chief Scientific Officer' },
              { name: 'Francesco Giuri', img: 'Francesco-Giuri.webp', role: 'Scientific Advisor' },
              { name: 'Carmine Pisano', img: 'Carmine-Pisano.webp', role: 'Scientific Advisor' },
              { name: 'Giacomo Ferrazzini', img: 'Giacomo-Ferrazzini.webp', role: 'Advisor' },
              { name: 'Sara Masella', img: 'Sara_Masella.webp', role: 'Research Associate' },
            ].map(({ name, img, role }) => (
              <div key={name} className="text-center">
                <div className="image-container rounded-full overflow-hidden w-40 h-40 mx-auto mb-4">
                  <Image src={`/assets/images/About-us/${img}`} alt={name} width={160} height={160} className="w-full h-full object-cover" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">{name}</h3>
                <p className="text-sm text-gray-500">{role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container mx-auto px-6 text-center">
          <h2 className="section-title">Join Our Mission</h2>
          <p className="text-xl mb-10 max-w-2xl mx-auto text-gray-700">
            Whether you are a researcher, investor, or innovator, there is a place for you in the bioERGOtech ecosystem.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/join-us" className="btn-primary">Join the Ecosystem</Link>
            <Link href="/partner-with-us" className="btn-outline">Partner with Us</Link>
          </div>
        </div>
      </section>
    </>
  )
}
