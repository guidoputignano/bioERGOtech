import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Build with Us',
  description:
    'Build with the bioERGOtech Foundation. Access our acceleration programme, shared infrastructure, and global network to bring your biotech venture to market.',
  alternates: { canonical: 'https://bioergotech.org/build-with-us' },
}

export default function BuildWithUsPage() {
  return (
    <>
      {/* Hero */}
      <section className="hero bg-light-gray" style={{ paddingTop: 80 }}>
        <div className="container mx-auto px-6 pt-28 pb-12 text-center">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6 text-gray-800">
            Build <span className="gradient-text">with Us</span>
          </h1>
          <p className="text-xl max-w-3xl mx-auto text-gray-700">
            Access bioERGOtech&apos;s acceleration programme, shared infrastructure, and global network to bring your
            biotech idea to market.
          </p>
        </div>
      </section>

      {/* Acceleration Programme */}
      <section className="section">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="section-title">Acceleration Programme</h2>
              <p className="text-lg mb-6 text-gray-700">
                Our acceleration programme provides early-stage biotech ventures with the tools, mentorship, and
                funding connections needed to move from concept to clinical impact.
              </p>
              <ul className="space-y-3 text-lg text-gray-700">
                {[
                  'Access to shared lab infrastructure across our 3 hubs',
                  'Mentorship from our scientific advisory board',
                  'Connections to investors and strategic partners',
                  'IP support and spin-off framework',
                  'Go-to-market strategy and business development',
                ].map((item) => (
                  <li key={item} className="flex items-start">
                    <i className="fas fa-check-circle mt-1 mr-3" style={{ color: 'var(--primary)' }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="image-container">
              <Image src="/assets/images/Build-with-us/Acceleration_Program.webp" alt="Acceleration Programme" width={600} height={400} className="w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Ventures */}
      <section className="section bg-light-gray">
        <div className="container mx-auto px-6">
          <h2 className="section-title">Our Ventures</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="image-container">
              <Image src="/assets/images/Build-with-us/Build_with_us.webp" alt="bioERGOtech Ventures" width={600} height={400} className="w-full" />
            </div>
            <div>
              <p className="text-lg mb-6 text-gray-700">
                bioERGOtech has incubated and spun off four portfolio companies spanning diagnostics, robotics, digital
                health, and cell engineering — each addressing a distinct gap in the life sciences value chain.
              </p>
              <Link href="/member-portal" className="btn-primary inline-block">Apply to the Programme</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
