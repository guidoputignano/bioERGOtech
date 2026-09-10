import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import GicPrototypeClient from "./GicPrototypeClient";

export const metadata = {
  title: "Tumour Board Brief, Prototype",
  description:
    "Research prototype. Assembles published guideline evidence ahead of a multidisciplinary oncology meeting. Not a medical device and not for clinical use.",
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
              Prototype · ASL VCO pilot
            </div>
            <h1
              className="text-3xl md:text-5xl font-bold mb-4 text-white"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              Tumour Board Brief
            </h1>
            <p className="text-white/85 text-lg max-w-2xl mx-auto">
              A research prototype. It assembles the published guideline
              evidence for a case ahead of a multidisciplinary oncology meeting,
              so the panel starts from a shared reference rather than from a
              search. It does not recommend treatment.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mt-6 text-sm text-white/75">
              <span className="flex items-center gap-1">
                <i className="fas fa-shield-alt text-white" />
                Research use, not a medical device
              </span>
              <span className="flex items-center gap-1">
                <i className="fas fa-book-medical text-white" />
                AIOM 2024 + ESMO guidelines
              </span>
              <span className="flex items-center gap-1">
                <i className="fas fa-robot text-white" />
                Agentic AI · Qwen3 30B
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
              <strong>Research prototype.</strong> This is not a medical
              device, it is not CE marked, and it must not be used to inform a
              decision about a patient. Everything it produces has to be
              checked against the source guideline by the treating
              multidisciplinary team, which holds sole clinical authority. Do
              not enter identifiable patient data: cases are sent to a
              processing backend for analysis.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
