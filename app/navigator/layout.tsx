import type { Metadata } from "next";

/**
 * page.tsx is a client component and cannot export metadata, so it lives here.
 * Same pattern as /contact and /join-us.
 */
export const metadata: Metadata = {
  title: "Grant and funding eligibility navigator",
  description:
    "Answer a few questions about your organisation and see which Italian and European funding schemes you may be eligible for, including NIDI, Mini-PIA, PIA, ZES, Horizon Europe and the EIC Accelerator.",
  alternates: { canonical: "/navigator" },
  openGraph: {
    title: "Grant and funding eligibility navigator | bioERGOtech Foundation",
    description:
      "Which Italian and European funding schemes is your organisation eligible for? A free check, including Puglia and Taranto schemes most tools miss.",
    url: "https://www.bioergotech.org/navigator",
  },
};

export default function NavigatorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
