import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'bioERGOtech Foundation - Making Research Smarter',
  description:
    'bioERGOtech Foundation develops Engineered Living Systems through synthetic biology, AI-driven automation, and multi-omics analytics across hubs in Taranto, Zurich, and Riyadh.',
  alternates: { canonical: 'https://bioergotech.org/' },
}

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="hero" id="home" style={{ paddingTop: 80 }}>
        <div className="animated-bg">
          <div className="circle" /><div className="circle" /><div className="circle" />
        </div>
        <div className="container mx-auto px-6 pt-28 pb-12 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6 text-gray-800">
                Making research <span className="gradient-text">smarter</span>, not just faster
              </h1>
              <p className="text-xl mb-8 text-gray-700">
                bioERGOtech is a foundation advancing{' '}
                <span className="highlight">Engineered Living Systems</span> — transforming living cells into precisely
                controllable therapeutic agents through the convergence of{' '}
                <span className="highlight">synthetic biology</span>, <span className="highlight">AI</span>, and{' '}
                <span className="highlight">automated biomanufacturing</span>.
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <a href="#approach" className="btn-primary text-center">
                  Discover Our Mission <span className="arrow-icon inline-block align-middle" />
                </a>
                <a href="#contact" className="btn-outline text-center">Contact Us</a>
              </div>
            </div>
            <div className="order-1 md:order-2 flex justify-center">
              <Image
                src="/assets/images/Home/Automation.webp"
                alt="AI in Biotech Research"
                width={480}
                height={360}
                className="featured-image rounded-lg shadow-xl w-full max-w-md"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Foundation Overview */}
      <section className="section">
        <div className="animated-bg"><div className="circle" /><div className="circle" /></div>
        <div className="container mx-auto px-6">
          <h2 className="section-title">Our Foundation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xl mb-6 text-gray-700">
                bioERGOtech is a foundation dedicated to bridging the critical gap between biotech&apos;s promises and
                tangible medical breakthroughs. We develop pioneering research projects that advance{' '}
                <span className="highlight">Engineered Living Systems</span> — turning cells into predictable,
                manufacturable, and controllable living medicines.
              </p>
              <p className="text-xl mb-6 text-gray-700">
                At its core, bioERGOtech transforms how biological research is conducted by developing{' '}
                <span className="highlight">&quot;digital scientists&quot;</span> — AI-powered systems that make
                experiments smarter, not just faster, across our four integrated scientific pillars.
              </p>
            </div>
            <div className="image-container w-full">
              <Image src="/assets/images/Home/AI-driven.webp" alt="AI-driven drug discovery" width={600} height={400} className="w-full" />
              <div className="image-overlay">
                <div className="image-overlay-text">Transforming biotech research through AI-driven innovation</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Approach */}
      <section className="section bg-light-gray" id="approach">
        <div className="container mx-auto px-6">
          <h2 className="section-title">Our Approach</h2>
          <p className="text-xl mb-12 max-w-3xl text-gray-700">
            We believe in a pragmatic, focused approach that delivers real impact for patients suffering from chronic diseases.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16 items-center">
            <div className="order-2 md:order-1">
              <h3 className="text-2xl font-semibold mb-4 text-gray-800">Intelligent Scientific Process</h3>
              <p className="text-lg mb-6 text-gray-700">
                Our approach combines cutting-edge AI technology with traditional scientific methods to create a more
                efficient research ecosystem. By implementing intelligent automation and optimisation algorithms, we
                make every experiment count.
              </p>
            </div>
            <div className="order-1 md:order-2 image-container">
              <Image src="/assets/images/Home/Approach.webp" alt="Advanced Scientific Laboratory Equipment" width={600} height={400} className="w-full" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: 'fa-chart-line', title: 'Long Tail', desc: 'We focus on building solutions that address specific research markets, fulfilling small niches efficiently and effectively.' },
              { icon: 'fa-rocket', title: 'Build Fast', desc: 'We prioritise projects with speedy iteration times of less than a year from idea to implementation.' },
              { icon: 'fa-globe', title: 'Earthshot', desc: 'Our "Earthshot" approach targets immediate human needs with practical solutions that make a tangible difference for patients today.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="approach-card">
                <div className="card-icon"><i className={`fas ${icon}`} /></div>
                <h3 className="text-2xl font-semibold mb-4 text-gray-800">{title}</h3>
                <p className="text-gray-700">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Working Principles */}
      <section className="section" id="principles">
        <div className="container mx-auto px-6">
          <h2 className="section-title">Working Principles</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-12">
            {[
              { icon: 'fa-lightbulb', title: 'Solve Real Problems', desc: 'We identify core challenges in laboratory research for chronic diseases and develop targeted solutions that address fundamental issues.' },
              { icon: 'fa-code-branch', title: 'Develop Algorithms', desc: 'We create sophisticated algorithms that optimise experiments and research processes for maximum efficiency and breakthrough potential.' },
              { icon: 'fa-share-alt', title: 'Distribute Platforms', desc: 'We enable other research organisations to adopt and integrate our systems, transforming how chronic disease research is conducted worldwide.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="card">
                <div className="flex items-center justify-center mb-6">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(19,214,176,.1)' }}>
                    <i className={`fas ${icon} text-3xl`} style={{ color: 'var(--primary)' }} />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-4 text-center text-gray-800">{title}</h3>
                <p className="text-gray-600 text-center">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Strategy */}
      <section className="section bg-light-gray" id="strategy">
        <div className="container mx-auto px-6">
          <h2 className="section-title">Our Strategy</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <h3 className="text-2xl font-semibold mb-4 text-gray-800">A Collaborative Vision</h3>
              <p className="text-lg mb-6 text-gray-700">
                Our strategy centres on building dedicated, interdisciplinary teams that collaborate closely with partners
                worldwide to address pressing research challenges. By nurturing focused expertise alongside broad
                connectivity, we aim to complement and strengthen existing research ecosystems.
              </p>
            </div>
            <div className="order-1 md:order-2 image-container">
              <Image src="/assets/images/Home/Strategy.webp" alt="Collaborative research strategy" width={600} height={400} className="w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Ecosystems */}
      <section className="section" id="ecosystems">
        <div className="container mx-auto px-6">
          <h2 className="section-title">Our Ecosystem</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xl mb-6 text-gray-700">
                bioERGOtech operates across three strategic hubs — Taranto, Zurich, and Riyadh — building a global
                network of researchers, clinicians, investors, and innovators united by a common mission.
              </p>
              <Link href="/build-with-us" className="btn-primary inline-block">
                Explore Our Ecosystem
              </Link>
            </div>
            <div className="image-container">
              <Image src="/assets/images/Home/Ecosystem.webp" alt="bioERGOtech Ecosystem" width={600} height={400} className="w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="section bg-light-gray" id="contact">
        <div className="container mx-auto px-6 text-center">
          <h2 className="section-title">Get In Touch</h2>
          <p className="text-xl mb-10 max-w-2xl mx-auto text-gray-700">
            Ready to collaborate, invest, or join our ecosystem? Reach out to the bioERGOtech team.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/partner-with-us" className="btn-primary">Partner with Us</Link>
            <Link href="/join-us" className="btn-outline">Join the Ecosystem</Link>
          </div>
        </div>
      </section>
    </>
  )
}
