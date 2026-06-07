import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Articles - bioERGOtech Foundation",
  description: "News, stories, and insights from the bioERGOtech Foundation, covering biotech innovation, team journeys, and ecosystem milestones.",
  alternates: { canonical: "/articles" },
};

const articles = [
  {
    slug: "news-predict-healthcare-joins-2026",
    img: "/assets/images/News/Predict/predict-welcome.webp",
    date: "May 31, 2026",
    title: "Predict Healthcare Joins the Foundation",
    desc: "The Apulian leader in in-vivo diagnostics and medical imaging joins the ecosystem, bringing clinical depth, imaging technology, and a clear ambition to move closer to biotech.",
    author: "bioERGOtech Foundation",
    readTime: "4 min read",
  },
  {
    slug: "news-priver-joins-2026",
    img: "/assets/images/News/Priver/priver-welcome.webp",
    date: "May 31, 2026",
    title: "Priver Joins the Foundation",
    desc: "The Taranto engineering company joins the bioERGOtech ecosystem, bringing four decades of motion control, fluid power, and the thermal and computing-infrastructure expertise a digital workforce depends on.",
    author: "bioERGOtech Foundation",
    readTime: "5 min read",
  },
  {
    slug: "news-genogra-preseed-2026",
    img: "/assets/images/Home/News/Guido_Walter.webp",
    date: "February 16, 2026",
    title: "GenoGra Closes €1M Pre-Seed Round and Launches First Pangenomic Analysis Platform",
    desc: "The Italian startup targets the non-human market first before expanding into clinical genomics applications — a bold, strategic bet on where genomics goes next.",
    author: "bioERGOtech Foundation",
    readTime: "5 min read",
  },
  {
    slug: "news-interview-guido-putignano-2025",
    img: "/assets/images/News/Interview-Guido-Putignano/Guido Putignano.jpg",
    date: "August 7, 2025",
    title: "Thinking Like a Researcher, Acting Like an Entrepreneur",
    desc: "A Conversation with Guido Putignano on Navigating Academia and Entrepreneurship.",
    author: "Davide Galluzzo",
    readTime: "8 min read",
  },
  {
    slug: "news-lorenzo-tarricone-2025",
    img: "/assets/images/News/Lorenzo_Tarricone/IMG_28041.jpg",
    date: "July 23, 2025",
    title: "Lorenzo Tarricone: A Journey of Science, Innovation, and Dreams",
    desc: "The Bridge Between Research and Real-World Impact.",
    author: "bioERGOtech Foundation",
    readTime: "7 min read",
  },
  {
    slug: "launch-event",
    img: "/assets/images/launch_event/first_image.webp",
    date: "October 29, 2025",
    title: "bioERGOtech Launch Event: Innovation Summit Recap",
    desc: "A recap of our successful launch event for the Taranto Biotech Hub, celebrating the foundation's official launch.",
    author: "bioERGOtech Foundation",
    readTime: "6 min read",
  },
  {
    slug: "news-alessia-soru-2025",
    img: "/assets/images/Home/News/Alessia.webp",
    date: "June 4, 2025",
    title: "From Sardinian Dreams to Scientific Pursuit: The Academic Journey of Alessia Soru",
    desc: "How a young scientist is exploring connections between traditional medicine and modern technology in cancer treatment.",
    author: "Luca Fusar Bassini",
    readTime: "6 min read",
  },
  {
    slug: "news-cell-therapies-2024",
    img: "/assets/images/Home/News/News_celltherapies.webp",
    date: "December 19, 2024",
    title: "Cell Therapy Breakthroughs: Academic-Industry Collaboration",
    desc: "Discover how the Taranto Biotech Days event fostered groundbreaking collaborations between academia and industry.",
    author: "bioERGOtech Foundation",
    readTime: "8 min read",
  },
  {
    slug: "news-project-to-product",
    img: "/assets/images/Home/News/product_pitch.webp",
    date: "November 20, 2024",
    title: "From Project to Product: BioShot Success Stories",
    desc: "Success stories from the BioShot competition at Taranto Biotech Days.",
    author: "bioERGOtech Foundation",
    readTime: "7 min read",
  },
  {
    slug: "news-bioshot-2024",
    img: "/assets/images/Home/News/beyond.webp",
    date: "November 10, 2024",
    title: "Beyond the Competition: How BioShot is Transforming the Biotech Ecosystem of Southern Italy",
    desc: "The systemic impact of BioShot and the Taranto Biotech Days on territorial innovation.",
    author: "bioERGOtech Foundation",
    readTime: "8 min read",
  },
  {
    slug: "bioshot-2024",
    img: "/assets/images/Home/News/beyond.webp",
    date: "December 2024",
    title: "BioShot 2024: The Full Story",
    desc: "BioShot is a startup competition within the Taranto Biotech Days, and it is transforming the biotech ecosystem of Southern Italy.",
    author: "bioERGOtech Foundation",
    readTime: "8 min read",
  },
];

export default function Articles() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="hero bg-light-gray" style={{ paddingTop: "70px" }}>
        <div className="container mx-auto px-6 pt-20 pb-12 relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6 text-gray-800">
            Articles &amp; News
          </h1>
          <p className="text-xl max-w-2xl mx-auto text-gray-700">
            Stories, insights, and updates from the bioERGOtech ecosystem.
          </p>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="section">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((a) => (
              <article key={a.slug} className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col">
                <div className="relative w-full h-52">
                  <Image src={a.img} alt={a.title} fill sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <span style={{ color: "var(--primary)" }}>{a.date}</span>
                    <span>·</span>
                    <span>{a.readTime}</span>
                  </div>
                  <h2 className="text-lg font-bold text-gray-800 mb-2 flex-1">{a.title}</h2>
                  <p className="text-gray-600 text-sm mb-4">{a.desc}</p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-sm text-gray-500">By {a.author}</span>
                    <Link href={`/articles/${a.slug}`} className="font-semibold text-sm" style={{ color: "var(--primary)" }}>
                      Read More →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
