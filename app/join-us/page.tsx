import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Join Us',
  description:
    'Join the bioERGOtech Foundation ecosystem. Connect with researchers, clinicians, entrepreneurs, and investors advancing Engineered Living Systems.',
  alternates: { canonical: 'https://bioergotech.org/join-us' },
}

export default function JoinUsPage() {
  return (
    <>
      {/* Hero */}
      <section className="hero bg-light-gray" style={{ paddingTop: 80 }}>
        <div className="container mx-auto px-6 pt-28 pb-12 text-center">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6 text-gray-800">
            Join the <span className="gradient-text">Ecosystem</span>
          </h1>
          <p className="text-xl max-w-3xl mx-auto text-gray-700">
            Connect with researchers, clinicians, entrepreneurs, and investors shaping the future of Engineered Living
            Systems.
          </p>
        </div>
      </section>

      {/* Community Section */}
      <section className="section">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="section-title">Who We Welcome</h2>
              <p className="text-lg mb-6 text-gray-700">
                The bioERGOtech ecosystem is open to anyone who shares our mission: translating scientific breakthroughs
                into real patient impact.
              </p>
              <ul className="space-y-4 text-lg text-gray-700">
                {[
                  { icon: 'fa-flask', label: 'Researchers & Scientists' },
                  { icon: 'fa-hospital', label: 'Clinicians & Healthcare Professionals' },
                  { icon: 'fa-rocket', label: 'Entrepreneurs & Founders' },
                  { icon: 'fa-chart-line', label: 'Investors & Funders' },
                  { icon: 'fa-university', label: 'Universities & Research Institutions' },
                ].map(({ icon, label }) => (
                  <li key={label} className="flex items-center">
                    <i className={`fas ${icon} mr-3`} style={{ color: 'var(--primary)' }} />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="image-container">
              <Image src="/assets/images/Join-us/Community.webp" alt="bioERGOtech Community" width={600} height={400} className="w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Apply CTA */}
      <section className="section bg-light-gray">
        <div className="container mx-auto px-6 text-center">
          <h2 className="section-title">Ready to Join?</h2>
          <p className="text-xl mb-10 max-w-2xl mx-auto text-gray-700">
            Create your member account to access the full ecosystem — projects, resources, events, and more.
          </p>
          <Link href="/member-portal" className="btn-primary inline-block">
            Apply Now
          </Link>
        </div>
      </section>
    </>
  )
}
