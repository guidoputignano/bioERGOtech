import type { MetadataRoute } from "next";
import { articleMeta } from "./articles/[slug]/page";

const BASE = "https://www.bioergotech.org";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Core marketing and content pages, in rough order of importance.
  const staticRoutes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" },
    { path: "/eventi/vivere-piu-a-lungo", priority: 0.9, changeFrequency: "weekly" },
    { path: "/eventi/vivere-piu-a-lungo/bando", priority: 0.8, changeFrequency: "weekly" },
    { path: "/eventi/vivere-piu-a-lungo/licei", priority: 0.8, changeFrequency: "weekly" },
    { path: "/about-us", priority: 0.9, changeFrequency: "monthly" },
    { path: "/taranto", priority: 0.8, changeFrequency: "monthly" },
    { path: "/partner-with-us", priority: 0.8, changeFrequency: "monthly" },
    { path: "/build-with-us", priority: 0.8, changeFrequency: "monthly" },
    { path: "/join-us", priority: 0.8, changeFrequency: "monthly" },
    { path: "/articles", priority: 0.8, changeFrequency: "weekly" },
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

  return [...staticEntries, ...articleEntries, ...standaloneArticles];
}
