import type { Metadata } from "next";
import PrototypeFarmaciaDashboard from "./PharmacyDashboard";

// Keeps this out of search engines and off the public sitemap — it's a
// prototype for a specific conversation with Guido, shared only via direct link.
export const metadata: Metadata = {
  title: "bioERGOtech — Prototype: Governance Farmaceutica",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <main style={{ minHeight: "100vh" }}>
      <PrototypeFarmaciaDashboard />
    </main>
  );
}
