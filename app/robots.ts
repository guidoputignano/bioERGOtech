import type { MetadataRoute } from "next";

const BASE = "https://www.bioergotech.org";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep functional and private areas out of the index.
      disallow: [
        "/api/",
        "/auth/",
        "/protected/",
        "/member-portal/",
        "/contact/thank-you",
      ],
    },
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
