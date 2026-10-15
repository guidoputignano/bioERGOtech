/** The site's canonical address, for links in emails. */
export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.bioergotech.org").replace(/\/+$/, "");
}
