/**
 * Renders one JSON-LD block.
 *
 * The root layout already emits the Organization and WebSite nodes for the
 * whole site. This is for the per-page nodes that only a route can know:
 * who a person page is about, where a page sits in the hierarchy.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

const BASE = "https://www.bioergotech.org";

/** A trail from the site root to the current page. */
export function breadcrumbs(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${BASE}${item.path}`,
    })),
  };
}
