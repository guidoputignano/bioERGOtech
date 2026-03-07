import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Careers',
  description:
    'Explore career opportunities at the bioERGOtech Foundation. Join a team advancing Engineered Living Systems.',
  alternates: { canonical: 'https://bioergotech.org/careers' },
}

export default function CareersPage() {
  return (
    <>
      {/* Hero */}
      <section className="hero bg-light-gray" style={{ paddingTop: 80 }}>
        <div className="container mx-auto px-6 pt-28 pb-12 text-center">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6 text-gray-800">
            Build the Future <span className="gradient-text">with Us</span>
          </h1>
          <p className="text-xl max-w-3xl mx-auto text-gray-700">
            Join the bioERGOtech team and work at the intersection of biology, AI, and medicine.
          </p>
        </div>
      </section>

      {/* Open Roles */}
      <section className="section">
        <div className="container mx-auto px-6">
          <h2 className="section-title">Open Positions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mt-12">
            <div>
              <p className="text-lg mb-8 text-gray-700">
                We are always looking for curious, driven people who want to contribute to advancing Engineered Living
                Systems. Whether you are a scientist, engineer, or business developer, there is a role for you.
              </p>
              <div className="space-y-4">
                {[
                  { title: 'Research Scientist – Synthetic Biology', loc: 'Taranto, Italy' },
                  { title: 'Machine Learning Engineer – Bioinformatics', loc: 'Zurich, Switzerland (Remote)' },
                  { title: 'Business Development Manager', loc: 'Remote' },
                ].map(({ title, loc }) => (
                  <div key={title} className="card">
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">{title}</h3>
                    <p className="text-sm text-gray-500"><i className="fas fa-map-marker-alt mr-2" style={{ color: 'var(--primary)' }} />{loc}</p>
                  </div>
                ))}
              </div>
              <p className="text-gray-600 mt-8">
                Don&apos;t see a matching role?{' '}
                <Link href="/member-portal" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                  Send us an open application
                </Link>
              </p>
            </div>
            <div className="image-container">
              <Image src="/assets/images/Careers/products.webp" alt="Working at bioERGOtech" width={600} height={400} className="w-full" />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
