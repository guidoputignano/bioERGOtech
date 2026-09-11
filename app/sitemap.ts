import type { MetadataRoute } from "next";
import { articleMeta } from "./articles/[slug]/page";
import { PEOPLE } from "./people/people";
import { areasWithPages } from "@/lib/areas";
import { COURSE_LESSONS } from "./courses/course-data";
import { PROGRAMMES } from "@/lib/programmes";

const BASE = "https://www.bioergotech.org";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Core marketing and content pages, in rough order of importance.
  const staticRoutes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" },
    { path: "/eventi/vivere-piu-a-lungo", priority: 0.9, changeFrequency: "weekly" },
    { path: "/eventi/vivere-piu-a-lungo/bando", priority: 0.8, changeFrequency: "weekly" },
    { path: "/eventi/vivere-piu-a-lungo/licei", priority: 0.8, changeFrequency: "weekly" },
    { path: "/eventi/vivere-piu-a-lungo/licei/iscrizione", priority: 0.7, changeFrequency: "weekly" },
    { path: "/programmes", priority: 0.9, changeFrequency: "weekly" },
    { path: "/agents", priority: 0.8, changeFrequency: "monthly" },
    { path: "/about-us", priority: 0.9, changeFrequency: "monthly" },
    { path: "/people", priority: 0.8, changeFrequency: "monthly" },
    { path: "/taranto", priority: 0.8, changeFrequency: "monthly" },
    { path: "/partner-with-us", priority: 0.8, changeFrequency: "monthly" },
    { path: "/build-with-us", priority: 0.8, changeFrequency: "monthly" },
    { path: "/join-us", priority: 0.8, changeFrequency: "monthly" },
    { path: "/articles", priority: 0.8, changeFrequency: "weekly" },
    { path: "/courses/agentic-ai", priority: 0.7, changeFrequency: "monthly" },
    { path: "/navigator", priority: 0.6, changeFrequency: "monthly" },
    { path: "/careers", priority: 0.7, changeFrequency: "weekly" },
    { path: "/contact", priority: 0.6, changeFrequency: "yearly" },
    { path: "/legal/privacy", priority: 0.2, changeFrequency: "yearly" },
    { path: "/cookie-policy", priority: 0.2, changeFrequency: "yearly" },
  ];

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((r) => ({
    url: `${BASE}${r.path === "/" ? "" : r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // One entry per research programme case study.
  const programmeEntries: MetadataRoute.Sitemap = PROGRAMMES.map((p) => ({
    url: `${BASE}/programmes/${p.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // One entry per principal investigator page.
  const peopleEntries: MetadataRoute.Sitemap = PEOPLE.map((p) => ({
    url: `${BASE}/people/${p.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // One entry per research area that has a page of its own.
  const areaEntries: MetadataRoute.Sitemap = areasWithPages().map((a) => ({
    url: `${BASE}/areas/${a.id}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // One entry per course lesson. They render for logged out visitors, so they
  // are public pages and belong here. "introduction" is the exception: it is
  // still a "lesson coming soon" placeholder, and submitting a placeholder for
  // indexing costs more than the URL is worth.
  const lessonEntries: MetadataRoute.Sitemap = COURSE_LESSONS.filter(
    (l) => l.slug !== "introduction",
  ).map((l) => ({
    url: `${BASE}/courses/agentic-ai/lesson/${l.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  // One entry per article. articleMeta is the single source of truth for slugs.
  const articleEntries: MetadataRoute.Sitemap = Object.keys(articleMeta).map(
    (slug) => ({
      url: `${BASE}/articles/${slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    })
  );

  const standaloneArticles: MetadataRoute.Sitemap = [
    {
      url: `${BASE}/articles/newsletter-june-2026`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  return [
    ...staticEntries,
    ...programmeEntries,
    ...areaEntries,
    ...peopleEntries,
    ...lessonEntries,
    ...articleEntries,
    ...standaloneArticles,
  ];
}
