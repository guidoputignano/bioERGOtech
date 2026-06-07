import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { notFound } from "next/navigation";
import fs from "fs";
import path from "path";
import type { Metadata } from "next";

export const articleMeta: Record<string, { title: string; description: string }> = {
  "news-predict-healthcare-joins-2026": {
    title: "Predict Healthcare Joins the Foundation",
    description: "Predict Healthcare, the Apulian leader in in-vivo diagnostics and medical imaging, joins the bioERGOtech Foundation.",
  },
  "news-priver-joins-2026": {
    title: "Priver Joins the Foundation",
    description: "Priver, the Taranto engineering company, joins the bioERGOtech ecosystem, bringing four decades of motion control, fluid power, and computing-infrastructure expertise.",
  },
  "news-genogra-preseed-2026": {
    title: "GenoGra Closes €1M Pre-Seed Round",
    description: "GenoGra, the B2B startup redefining genomic analysis, closes a €1M pre-seed round.",
  },
  "news-interview-guido-putignano-2025": {
    title: "Thinking Like a Researcher, Acting Like an Entrepreneur",
    description: "A Conversation with Guido Putignano on Navigating Academia and Entrepreneurship.",
  },
  "news-lorenzo-tarricone-2025": {
    title: "Lorenzo Tarricone: A Journey of Science, Innovation, and Dreams",
    description: "The Bridge Between Research and Real-World Impact.",
  },
  "launch-event": {
    title: "bioERGOtech Launch Event",
    description: "A recap of our successful launch event for the Taranto Biotech Hub.",
  },
  "news-alessia-soru-2025": {
    title: "From Sardinian Dreams to Scientific Pursuit: Alessia Soru",
    description: "How a young scientist explores connections between traditional medicine and modern technology.",
  },
  "news-cell-therapies-2024": {
    title: "Cell Therapy Breakthroughs: Academic-Industry Collaboration",
    description: "How the Taranto Biotech Days event fostered groundbreaking collaborations.",
  },
  "news-project-to-product": {
    title: "From Project to Product: BioShot Success Stories",
    description: "BioShot success stories from the Taranto Biotech Days.",
  },
  "news-bioshot-2024": {
    title: "Beyond the Competition: How BioShot is Transforming Southern Italy",
    description: "The systemic impact of BioShot and the Taranto Biotech Days on territorial innovation.",
  },
  "bioshot-2024": {
    title: "BioShot 2024",
    description: "Beyond the Competition: How BioShot is Transforming the Biotech Ecosystem of Southern Italy.",
  },
};

export async function generateStaticParams() {
  return Object.keys(articleMeta).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const meta = articleMeta[slug];
  if (!meta) return { title: "Article" };
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `/articles/${slug}` },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `https://www.bioergotech.org/articles/${slug}`,
      type: "article",
    },
  };
}

function getArticleContent(slug: string): string | null {
  const filePath = path.join(
    process.cwd(),
    "bioERGOtech-saved-before",
    "articles",
    `${slug}.html`
  );
  if (!fs.existsSync(filePath)) return null;

  const html = fs.readFileSync(filePath, "utf-8");

  // Extract body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return null;

  let body = bodyMatch[1];
  // Remove site-header/footer placeholders
  body = body.replace(/<div id="site-header"><\/div>/gi, "");
  body = body.replace(/<div id="site-footer"><\/div>/gi, "");
  // Remove script tags
  body = body.replace(/<script[\s\S]*?<\/script>/gi, "");
  return body.trim();
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!articleMeta[slug]) {
    notFound();
  }

  const content = getArticleContent(slug);
  if (!content) {
    notFound();
  }

  const meta = articleMeta[slug];
  const url = `https://www.bioergotech.org/articles/${slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: meta.title,
    description: meta.description,
    mainEntityOfPage: url,
    url,
    image: "https://www.bioergotech.org/assets/images/og-image-v2.jpg",
    author: { "@type": "Organization", name: "bioERGOtech Foundation" },
    publisher: {
      "@type": "Organization",
      name: "bioERGOtech Foundation",
      logo: {
        "@type": "ImageObject",
        url: "https://www.bioergotech.org/favicon.png",
      },
    },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.bioergotech.org",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Articles",
        item: "https://www.bioergotech.org/articles",
      },
      { "@type": "ListItem", position: 3, name: meta.title, item: url },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <Navbar />
      <div style={{ paddingTop: "70px" }}>
        <link rel="stylesheet" href="/assets/css/index.css" />
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </div>
      <SiteFooter />
    </>
  );
}
