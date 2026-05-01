import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";

const NEWS_ITEMS = [
  {
    img: "/assets/images/Home/News/Guido_Walter.webp",
    alt: "GenoGra",
    date: "February 16, 2026",
    title: "GenoGra Closes €1M Pre-Seed Round",
    desc: "The Italian startup targets the non-human market first before expanding into clinical genomics.",
    href: "/articles/news-genogra-preseed-2026",
  },
  {
    img: "/assets/images/News/Interview-Guido-Putignano/Guido Putignano.jpg",
    alt: "Guido Putignano",
    date: "August 7, 2025",
    title: "Thinking Like a Researcher, Acting Like an Entrepreneur",
    desc: "A Conversation with Guido Putignano on Navigating Academia and Entrepreneurship.",
    href: "/articles/news-interview-guido-putignano-2025",
  },
  {
    img: "/assets/images/News/Lorenzo_Tarricone/IMG_28041.jpg",
    alt: "Lorenzo Tarricone",
    date: "July 23, 2025",
    title: "Lorenzo Tarricone: A Journey of Science, Innovation, and Dreams",
    desc: "The Bridge Between Research and Real-World Impact.",
    href: "/articles/news-lorenzo-tarricone-2025",
  },
  {
    img: "/assets/images/launch_event/first_image.webp",
    alt: "Launch Event",
    date: "October 29, 2025",
    title: "bioERGOtech Launch Event",
    desc: "A recap of our successful launch event for the Taranto Biotech Hub.",
    href: "/articles/launch-event",
  },
  {
    img: "/assets/images/Home/News/Alessia.webp",
    alt: "Alessia Soru",
    date: "June 4, 2025",
    title: "From Sardinian Dreams to Scientific Pursuit: Alessia Soru",
    desc: "How a young scientist explores connections between traditional medicine and modern technology.",
    href: "/articles/news-alessia-soru-2025",
  },
  {
    img: "/assets/images/Home/News/News_celltherapies.webp",
    alt: "Cell Therapies",
    date: "December 19, 2024",
    title: "Cell Therapy Breakthroughs: Academic-Industry Collaboration",
    desc: "Innovation in the sector.",
    href: "/articles/news-cell-therapies-2024",
  },
];

const WORKING_PRINCIPLES = [
  {
    icon: "fa-lightbulb",
    title: "Solve Real Problems",
    desc: "We identify core challenges in laboratory research for chronic diseases and develop targeted solutions that address fundamental issues rather than symptoms.",
  },
  {
    icon: "fa-code-branch",
    title: "Develop Algorithms",
    desc: "We create sophisticated algorithms that optimize experiments and research processes for maximum efficiency and breakthrough potential.",
  },
  {
    icon: "fa-share-alt",
    title: "Distribute Platforms",
    desc: "We enable other research organizations to adopt and integrate our systems, transforming how chronic disease research is conducted worldwide.",
  },
];

const STRATEGY_ITEMS = [
  {
    icon: "fa-star",
    title: "Innovation-Led",
    desc: "We embrace emerging technologies and reimagine research processes from the ground up.",
  },
  {
    icon: "fa-seedling",
    title: "Ownership & Accountability",
    desc: "When projects demonstrate viability, we support their growth into independent ventures with fair recognition for their creators.",
  },
  {
    icon: "fa-bolt",
    title: "Agile & Focused",
    desc: "We value lean, empowered teams supported by intelligent automation, allowing us to respond swiftly to evolving scientific needs.",
  },
];

const SCIENTIFIC_AREAS = [
  {
    icon: "fa-laptop-medical",
    title: "Digital Twin Therapeutics",
    desc: "Patient-specific computational models that predict therapeutic outcomes and enable real-time treatment optimization.",
  },
  {
    icon: "fa-dna",
    title: "Synthetic Biology & Cell Engineering",
    desc: "Design and construction of programmable cellular systems with precise control over therapeutic function, safety, and persistence.",
  },
  {
    icon: "fa-robot",
    title: "Automated Biomanufacturing",
    desc: "Fully integrated robotic platforms that manufacture cell therapies with minimal human intervention and AI-driven process optimization.",
  },
  {
    icon: "fa-project-diagram",
    title: "Integrated Multi-Omics Analytics",
    desc: "Comprehensive molecular profiling throughout manufacturing and treatment to predict product quality and patient response.",
  },
];

const HUBS = [
  {
    city: "Taranto",
    desc: "Our founding innovation hub in Southern Italy, developing and testing our core technologies at the intersection of biotech and industrial heritage.",
    href: "/taranto",
    cta: "Know More",
  },
  {
    city: "Zurich",
    desc: "Our Swiss hub, embedded in one of Europe's leading life sciences and technology ecosystems.",
    href: null,
    cta: "Coming Soon",
  },
  {
    city: "Riyadh",
    desc: "Our Middle Eastern hub, contributing to the region's growing commitment to healthcare innovation and knowledge-based economic development.",
    href: null,
    cta: "Coming Soon",
  },
];

export default function Home() {
  return (
    <>
      <style>{`
        .course-card-hover { transition: transform 0.2s, box-shadow 0.2s; }
        .course-card-hover:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,196,180,0.2); }
      `}</style>
      <Navbar />

      {/* ── Hero ── */}
      <section className="hero" id="home" style={{ paddingTop: "120px" }}>
        <div className="container mx-auto px-6 pt-8 pb-12 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6 text-gray-800">
                Making research{" "}
                <span style={{ color: "var(--primary)" }}>smarter</span>, not
                just faster
              </h1>
              <p className="text-xl mb-8 text-gray-700">
                bioERGOtech is a foundation advancing{" "}
                <span className="highlight">Engineered Living Systems</span> —
                transforming living cells into precisely controllable therapeutic
                agents through the convergence of{" "}
                <span className="highlight">synthetic biology</span>,{" "}
                <span className="highlight">AI</span>, and{" "}
                <span className="highlight">automated biomanufacturing</span>.
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Link href="/about-us" className="btn-primary text-center">
                  Discover Our Mission
                </Link>
                <a
                  href="mailto:info@bioergotech.org"
                  className="btn-outline text-center"
                >
                  Contact Us
                </a>
              </div>
            </div>
            <div className="order-1 md:order-2 flex justify-center">
              <img
                src="/assets/images/Home/Automation.webp"
                alt="AI in Biotech Research"
                className="featured-image rounded-lg shadow-xl w-full max-w-md"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Foundation Overview ── */}
      <section className="section">
        <div className="container mx-auto px-6">
          <h2 className="section-title">Our Foundation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xl mb-6 text-gray-700">
                bioERGOtech is a foundation dedicated to bridging the critical
                gap between biotech&apos;s promises and tangible medical
                breakthroughs. We develop pioneering research projects that
                advance{" "}
                <span className="highlight">Engineered Living Systems</span> —
                turning cells into predictable, manufacturable, and controllable
                living medicines.
              </p>
              <p className="text-xl mb-6 text-gray-700">
                At its core, bioERGOtech transforms how biological research is
                conducted by developing{" "}
                <span className="highlight">&ldquo;digital scientists&rdquo;</span> —
                AI-powered systems that make experiments smarter, not just
                faster, across our four integrated scientific pillars.
              </p>
              <p className="text-xl mb-6 text-gray-700">
                The foundation initiates and nurtures new research projects
                spanning digital twin therapeutics, synthetic biology and cell
                engineering, automated biomanufacturing, and integrated
                multi-omics analytics — all focused on translating scientific
                potential into real patient impact.
              </p>
            </div>
            <div className="flex justify-center">
              <div className="image-container w-full">
                <img
                  src="/assets/images/Home/AI-driven.webp"
                  alt="AI-driven drug discovery"
                  className="w-full"
                />
                <div className="image-overlay">
                  <div className="image-overlay-text">
                    Transforming biotech research through AI-driven innovation
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Approach ── */}
      <section className="section bg-light-gray" id="approach">
        <div className="container mx-auto px-6">
          <h2 className="section-title">Our Approach</h2>
          <p className="text-xl mb-12 max-w-3xl text-gray-700">
            We believe in a pragmatic, focused approach that delivers real
            impact for patients suffering from chronic diseases.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16 items-center">
            <div className="order-2 md:order-1">
              <h3 className="text-2xl font-semibold mb-4 text-gray-800">
                Intelligent Scientific Process
              </h3>
              <p className="text-lg mb-6 text-gray-700">
                Our approach combines cutting-edge AI technology with
                traditional scientific methods to create a more efficient
                research ecosystem.
              </p>
              <p className="text-lg text-gray-700">
                Instead of randomly exploring possibilities, our systems analyze
                data in real-time to determine the most promising pathways for
                further investigation.
              </p>
            </div>
            <div className="order-1 md:order-2 image-container">
              <img
                src="/assets/images/Home/Approach.webp"
                alt="Advanced Scientific Laboratory Equipment"
                className="w-full"
              />
              <div className="image-overlay">
                <div className="image-overlay-text">
                  Advanced laboratory equipment for intelligent experimentation
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: "fa-chart-line",
                title: "Long Tail",
                desc: "We focus on building solutions that address specific research markets.",
              },
              {
                icon: "fa-rocket",
                title: "Build Fast",
                desc: "We prioritize projects with speedy iteration times of less than a year from idea to implementation.",
              },
              {
                icon: "fa-globe",
                title: "Earthshot",
                desc: "We target immediate human needs with practical solutions, focusing on day-to-day challenges that make a tangible difference for patients today.",
              },
            ].map((item) => (
              <div key={item.title} className="approach-card shadow-box">
                <div className="card-icon">
                  <i className={`fas ${item.icon}`} />
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-gray-800">
                  {item.title}
                </h3>
                <p className="text-gray-700">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Working Principles ── */}
      <section className="section" id="principles">
        <div className="container mx-auto px-6">
          <h2 className="section-title">Working Principles</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-12">
            {WORKING_PRINCIPLES.map((item) => (
              <div key={item.title} className="card shadow-box">
                <div className="flex items-center justify-center mb-6">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(19,214,176,0.15)" }}
                  >
                    <i
                      className={`fas ${item.icon} text-3xl`}
                      style={{ color: "var(--primary)" }}
                    />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-4 text-center text-gray-800">
                  {item.title}
                </h3>
                <div
                  className="w-full h-[3px] mb-4"
                  style={{
                    background:
                      "linear-gradient(to right, var(--primary), transparent)",
                  }}
                />
                <p className="text-gray-600 text-center">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Strategy ── */}
      <section className="section bg-light-gray" id="strategy">
        <div className="container mx-auto px-6">
          <h2 className="section-title">Our Strategy</h2>
          <p className="text-xl mb-12 max-w-3xl text-gray-700">
            Our foundation is guided by principles that foster meaningful
            collaboration and sustainable advancement across the global research
            landscape.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16 items-center">
            <div className="order-2 md:order-1">
              <h3 className="text-2xl font-semibold mb-4 text-gray-800">
                A Collaborative Vision
              </h3>
              <p className="text-lg mb-6 text-gray-700">
                Our strategy centres on building dedicated, interdisciplinary
                teams that collaborate closely with partners worldwide. Through
                the development of foundational technologies applicable across
                therapeutic domains, we aspire to create an environment where
                progress in one scientific area naturally enriches neighbouring
                fields.
              </p>
            </div>
            <div className="order-1 md:order-2 image-container">
              <img
                src="/assets/images/Home/Strategy.webp"
                alt="Strategy"
                className="w-full"
              />
              <div className="image-overlay">
                <div className="image-overlay-text">
                  Laboratory automation enhancing research capabilities
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STRATEGY_ITEMS.map((item) => (
              <div key={item.title} className="strategy-card shadow-box">
                <div className="card-icon">
                  <i className={`fas ${item.icon}`} />
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-gray-800">
                  {item.title}
                </h3>
                <p className="text-gray-700">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Scientific Areas ── */}
      <section className="section" id="research">
        <div className="container mx-auto px-6">
          <h2 className="section-title">Scientific Areas of Interest</h2>
          <p className="text-xl mb-12 max-w-3xl text-gray-700">
            We advance four integrated scientific pillars to transform living
            cells into precisely controllable therapeutic agents.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {SCIENTIFIC_AREAS.map((area) => (
              <div key={area.title} className="card shadow-box">
                <div className="flex justify-center">
                  <div className="card-icon">
                    <i className={`fas ${area.icon}`} />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-center text-gray-800">
                  {area.title}
                </h3>
                <p className="text-gray-600 text-center">{area.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Hubs ── */}
      <section className="section bg-light-gray" id="hubs">
        <div className="container mx-auto px-6">
          <h2 className="section-title">Our Hubs</h2>
          <p className="text-xl mb-12 max-w-3xl text-gray-700">
            We are building a network of innovation hubs across Europe and the
            Middle East.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HUBS.map((hub) => (
              <div key={hub.city} className="hub-card shadow-box">
                <div className="flex items-center justify-center mb-6">
                  <div className="card-icon">
                    <i className="fas fa-map-marker-alt" />
                  </div>
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-center text-gray-800">
                  {hub.city}
                </h3>
                <p className="text-gray-700 text-center mb-4">{hub.desc}</p>
                <div className="flex justify-center">
                  {hub.href ? (
                    <Link
                      href={hub.href}
                      className="text-sm px-4 py-2 rounded-full transition-all"
                      style={{
                        background: "rgba(19,214,176,0.1)",
                        color: "var(--primary)",
                      }}
                    >
                      {hub.cta}
                    </Link>
                  ) : (
                    <div className="text-sm bg-gray-200 text-gray-600 px-4 py-2 rounded-full">
                      {hub.cta}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Latest News + Course Card ── */}
      <section className="section" id="news">
        <div className="container mx-auto px-6">
          <h2 className="section-title">Latest News</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* ── Agentic AI Course Card ── */}
            <Link
              href="/courses/agentic-ai"
              style={{ textDecoration: "none" }}
            >
              <div
                className="rounded-lg overflow-hidden h-full course-card-hover"
                style={{
                  background:
                    "linear-gradient(135deg, #0D1B32 0%, #1a3a5c 100%)",
                  border: "1px solid rgba(0,196,180,0.3)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Top teal accent bar */}
                <div
                  style={{ height: 4, background: "#00C4B4", flexShrink: 0 }}
                />

                <div style={{ padding: "24px", flex: 1, display: "flex", flexDirection: "column" }}>
                  {/* Badge */}
                  <div
                    style={{
                      display: "inline-block",
                      background: "rgba(0,196,180,0.15)",
                      border: "1px solid rgba(0,196,180,0.35)",
                      color: "#00C4B4",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      padding: "3px 10px",
                      borderRadius: 20,
                      marginBottom: 14,
                      width: "fit-content",
                    }}
                  >
                    🆓 Free Program · New
                  </div>

                  {/* Title */}
                  <h3
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#fff",
                      lineHeight: 1.25,
                      marginBottom: 10,
                      fontFamily: "'Sora', sans-serif",
                    }}
                  >
                    Agentic AI{" "}
                    <span style={{ color: "#00C4B4" }}>
                      High School Innovation Program
                    </span>
                  </h3>

                  {/* Description */}
                  <p
                    style={{
                      fontSize: 13,
                      color: "rgba(255,255,255,0.62)",
                      lineHeight: 1.65,
                      marginBottom: 20,
                      flex: 1,
                    }}
                  >
                    Go from understanding AI agents to building a working
                    prototype — no prior experience required. 10 weeks, 21+
                    lessons, 3 technical tracks.
                  </p>

                  {/* Stats */}
                  <div
                    style={{
                      display: "flex",
                      gap: 20,
                      marginBottom: 20,
                    }}
                  >
                    {[
                      ["10", "Weeks"],
                      ["21+", "Lessons"],
                      ["3", "Tracks"],
                    ].map(([num, label]) => (
                      <div key={label} style={{ textAlign: "center" }}>
                        <div
                          style={{
                            fontSize: 20,
                            fontWeight: 800,
                            color: "#00C4B4",
                            fontFamily: "'Sora', sans-serif",
                          }}
                        >
                          {num}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "rgba(255,255,255,0.5)",
                          }}
                        >
                          {label}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "#00C4B4",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 700,
                      padding: "9px 16px",
                      borderRadius: 8,
                      width: "fit-content",
                    }}
                  >
                    Start Learning →
                  </div>
                </div>
              </div>
            </Link>

            {/* ── News Cards ── */}
            {NEWS_ITEMS.map((item) => (
              <div
                key={item.href}
                className="bg-white rounded-lg shadow-lg overflow-hidden"
              >
                <img
                  src={item.img}
                  alt={item.alt}
                  className="w-full h-48 object-cover"
                />
                <div className="p-6">
                  <div
                    className="text-sm mb-2"
                    style={{ color: "var(--primary)" }}
                  >
                    {item.date}
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 mb-4 text-sm">{item.desc}</p>
                  <Link
                    href={item.href}
                    className="font-semibold"
                    style={{ color: "var(--primary)" }}
                  >
                    Know More →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link href="/articles" className="btn-outline">
              View All Articles
            </Link>
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section className="section bg-light-gray" id="contact">
        <div className="container mx-auto px-6">
          <h2 className="section-title">Contact Us</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-start mb-6">
                <div
                  className="text-2xl mr-4"
                  style={{ color: "var(--primary)" }}
                >
                  <i className="fas fa-envelope" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-800">
                    Email
                  </h3>
                  <a
                    href="mailto:info@bioergotech.org"
                    className="text-gray-700"
                  >
                    info@bioergotech.org
                  </a>
                </div>
              </div>
              <div className="flex items-start">
                <div
                  className="text-2xl mr-4"
                  style={{ color: "var(--primary)" }}
                >
                  <i className="fas fa-map-marker-alt" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-800">
                    Address
                  </h3>
                  <p className="text-gray-700">
                    Via Ciro Giovinazzi 70, 74123 Taranto
                  </p>
                </div>
              </div>
              <div className="flex space-x-4 mt-8">
                <a
                  href="https://www.linkedin.com/company/bioergotech"
                  target="_blank"
                  rel="noreferrer"
                  className="w-12 h-12 rounded-full flex items-center justify-center transition"
                  style={{
                    background: "rgba(19,214,176,0.15)",
                    color: "var(--primary)",
                  }}
                >
                  <i className="fab fa-linkedin-in" />
                </a>
              </div>
            </div>
            <div>
              <a
                href="mailto:info@bioergotech.org"
                className="btn-primary w-full block text-center"
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
