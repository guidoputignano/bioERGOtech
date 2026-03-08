import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { notFound } from "next/navigation";
import fs from "fs";
import path from "path";
import type { Metadata } from "next";

const articleMeta: Record<string, { title: string; description: string }> = {
  "news-genogra-preseed-2026": {
    title: "GenoGra Closes €1M Pre-Seed Round - bioERGOtech",
    description: "GenoGra, the B2B startup redefining genomic analysis, closes a €1M pre-seed round.",
  },
  "news-interview-guido-putignano-2025": {
    title: "Thinking Like a Researcher, Acting Like an Entrepreneur - bioERGOtech",
    description: "A Conversation with Guido Putignano on Navigating Academia and Entrepreneurship.",
  },
  "news-lorenzo-tarricone-2025": {
    title: "Lorenzo Tarricone: A Journey of Science, Innovation, and Dreams - bioERGOtech",
    description: "The Bridge Between Research and Real-World Impact.",
  },
  "launch-event": {
    title: "bioERGOtech Launch Event - bioERGOtech",
    description: "A recap of our successful launch event for the Taranto Biotech Hub.",
  },
  "news-alessia-soru-2025": {
    title: "From Sardinian Dreams to Scientific Pursuit: Alessia Soru - bioERGOtech",
    description: "How a young scientist explores connections between traditional medicine and modern technology.",
  },
  "news-cell-therapies-2024": {
    title: "Cell Therapy Breakthroughs: Academic-Industry Collaboration - bioERGOtech",
    description: "How the Taranto Biotech Days event fostered groundbreaking collaborations.",
  },
  "news-project-to-product": {
    title: "From Project to Product: BioShot Success Stories - bioERGOtech",
    description: "BioShot success stories from the Taranto Biotech Days.",
  },
  "news-bioshot-2024": {
    title: "Beyond the Competition: How BioShot is Transforming Southern Italy - bioERGOtech",
    description: "The systemic impact of BioShot and the Taranto Biotech Days on territorial innovation.",
  },
  "bioshot-2024": {
    title: "BioShot 2024 - bioERGOtech",
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
  if (!meta) return { title: "Article - bioERGOtech" };
  return { title: meta.title, description: meta.description };
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

  return (
    <>
      <Navbar />
      <div style={{ paddingTop: "70px" }}>
        <link rel="stylesheet" href="/assets/css/index.css" />
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </div>
      <SiteFooter />
    </>
  );
}
