import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import GicPrototypeClient from "./GicPrototypeClient";

export const metadata = {
  title: "GIC Decision Support, Prototype",
  description:
    "AI-assisted pre-analysis for GIC oncology tumour board sessions. Powered by AIOM and ESMO guidelines.",
  // Internal prototype tool: keep it out of search results.
  robots: { index: false, follow: false },
};

export default function GicPrototypePage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50">

        {/* ── HERO ─────────────────────────────────────── */}
        <section className="bg-[#0D7E8A] text-white py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/15 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-widest">
              <span className="w-2 h-2 bg-[#C8A951] rounded-full animate-pulse" />
              Prototype — ASL VCO Pilot
            </div>
            <h1
              className="text-3xl md:text-5xl font-bold mb-4 text-white"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              GIC Clinical Decision Support
            </h1>
            <p className="text-white/85 text-lg max-w-2xl mx-auto">
              AI-assisted pre-analysis for multidisciplinary oncology tumour
              board sessions. Grounded in AIOM 2024 and ESMO guidelines.
              Fully local — no patient data leaves the system.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mt-6 text-sm text-white/75">
              <span className="flex items-center gap-1">
                <i className="fas fa-shield-alt text-white" />
                Privacy-first architecture
              </span>
              <span className="flex items-center gap-1">
                <i className="fas fa-book-medical text-white" />
                AIOM 2024 + ESMO guidelines
              </span>
              <span className="flex items-center gap-1">
                <i className="fas fa-robot text-white" />
                Agentic AI — Qwen3 30B
              </span>
            </div>
          </div>
        </section>

        {/* ── MAIN CONTENT ──────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-4 py-12">
          <GicPrototypeClient />
        </section>

        {/* ── DISCLAIMER ────────────────────────────────── */}
        <section className="no-print bg-amber-50 border-t border-amber-200 py-6 px-4">
          <div className="max-w-4xl mx-auto flex items-start gap-3">
            <i className="fas fa-exclamation-triangle text-amber-500 mt-1 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              <strong>Clinical Disclaimer:</strong> This system is a
              decision-support tool only. All AI-generated proposals must be
              reviewed and validated by the GIC panel. Final clinical authority
              rests with the treating multidisciplinary team. This prototype
              uses synthetic de-identified data only.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
