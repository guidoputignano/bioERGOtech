import type { Metadata } from "next";

/**
 * Sign-in, sign-up and password flows.
 *
 * robots.txt already disallows /auth/, but a disallowed URL can still be
 * indexed if something links to it: a crawler that is told not to fetch a page
 * can still list it from the link alone. noindex is the instruction that
 * actually keeps it out, and it only works if the crawler is allowed to read
 * the page and see it.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
