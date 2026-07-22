"use client";

import { useEffect, useRef, useState } from "react";
import {
  Building2,
  Globe2,
  TrendingUp,
  Sparkles,
  Coins,
  Target,
  Mail,
  Landmark,
  CheckCircle2,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { NAVIGATOR_QUESTIONS, NavigatorQuestion } from "@/lib/navigator/questions";

type Answers = Record<string, string | string[]>;
type EligibleScheme = { scheme_name: string; scheme_description: string };

const inputClass =
  "w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 bg-white outline-none transition-all duration-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 placeholder:text-gray-400";

// One small icon per question topic — purely a wayfinding cue, no meaning
// beyond "this is the org-type question" etc. Falls back to nothing if a
// question id isn't mapped, so new questions never break.
const QUESTION_ICONS: Record<string, typeof Building2> = {
  organisation_name: Building2,
  org_type: Landmark,
  region: Globe2,
  stage: TrendingUp,
  interest_areas: Sparkles,
  existing_support: Coins,
  existing_support_detail: Coins,
  goals: Target,
  email: Mail,
};

// Approved scheme copy sometimes carries a trailing status caveat after an
// em-dash or hyphen (e.g. "...for early-stage teams — application window
// currently closed"). This only changes how that existing, unedited text is
// laid out on screen (a distinct badge instead of blending into the
// paragraph) — it never alters, removes, or adds a single word.
const STATUS_HINTS = ["suspend", "closed", "paused", "reopen", "window", "currently"];
function splitSchemeDescription(desc: string): { main: string; status: string | null } {
  const parts = desc.split(/\s+[—-]\s+/);
  if (parts.length < 2) return { main: desc, status: null };
  const last = parts[parts.length - 1];
  const looksLikeStatus = STATUS_HINTS.some((hint) => last.toLowerCase().includes(hint));
  if (!looksLikeStatus) return { main: desc, status: null };
  // Trailing sentence punctuation reads oddly inside a pill — trimmed for
  // display only, the word content is untouched.
  return { main: parts.slice(0, -1).join(" — "), status: last.replace(/\.$/, "") };
}

export default function NavigatorPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<null | EligibleScheme[]>(null);
  const [error, setError] = useState<string | null>(null);

  const visibleQuestions = NAVIGATOR_QUESTIONS.filter((q) => {
    if (!q.showIf) return true;
    return answers[q.showIf.questionId] === q.showIf.equals;
  });

  const currentQuestion: NavigatorQuestion | undefined = visibleQuestions[stepIndex];
  const isLastStep = stepIndex === visibleQuestions.length - 1;

  function setAnswer(id: string, value: string | string[]) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function canAdvance() {
    if (!currentQuestion) return false;
    if (!currentQuestion.required) return true;
    const val = answers[currentQuestion.id];
    if (Array.isArray(val)) return val.length > 0;
    return Boolean(val && String(val).trim().length > 0);
  }

  async function handleNext() {
    if (isLastStep) {
      await handleSubmit();
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/navigator/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setResult(data.eligible);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return <NavigatorResults schemes={result} email={String(answers.email ?? "")} />;
  }

  return (
    <>
      <style>{`
        @keyframes navStepIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .nav-step-anim { animation: navStepIn 260ms ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .nav-step-anim { animation: none; }
        }
      `}</style>
      <Navbar />
      <div style={{ paddingTop: "70px" }}>
        <section className="bg-light-gray" style={{ padding: "60px 0 40px" }}>
          <div className="container mx-auto px-6 text-center">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4 text-gray-800">
              Grant &amp; Funding Eligibility Navigator
            </h1>
            <p className="text-lg max-w-2xl mx-auto text-gray-600">
              Answer a few questions about your organisation and get an instant, personalised readout
              of which funding and grant schemes you may be eligible for.
            </p>
          </div>
        </section>

        <section className="section" id="navigator">
          <div className="container mx-auto px-6">
            <div className="max-w-xl mx-auto">
              <div className="card" style={{ borderRadius: 24, padding: 40 }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Step
                  </span>
                  <span
                    className="text-[11px] font-bold uppercase tracking-wider"
                    style={{ fontFamily: "'DM Mono', monospace" }}
                  >
                    <span style={{ color: "var(--primary)" }}>{String(stepIndex + 1).padStart(2, "0")}</span>
                    <span className="text-gray-300"> / {String(visibleQuestions.length).padStart(2, "0")}</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mb-6">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out motion-reduce:transition-none"
                    style={{
                      width: `${((stepIndex + 1) / visibleQuestions.length) * 100}%`,
                      background: "linear-gradient(135deg, #2EC4B6, #1A9E92)",
                    }}
                  />
                </div>

                <div style={{ minHeight: 220 }}>
                  {currentQuestion && (
                    <QuestionBlock
                      key={currentQuestion.id}
                      question={currentQuestion}
                      value={answers[currentQuestion.id]}
                      onChange={(v) => setAnswer(currentQuestion.id, v)}
                    />
                  )}
                </div>

                {error && (
                  <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-100">
                  <button
                    onClick={() => stepIndex > 0 && setStepIndex((i) => i - 1)}
                    disabled={stepIndex === 0}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
                    style={{
                      background: stepIndex === 0 ? "#F3F5F8" : "#fff",
                      border: "1.5px solid #E8EDF3",
                      color: stepIndex === 0 ? "#C5CED8" : "#4A5568",
                      cursor: stepIndex === 0 ? "default" : "pointer",
                    }}
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={!canAdvance() || submitting}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 flex items-center gap-2"
                    style={{
                      background:
                        canAdvance() && !submitting ? "linear-gradient(135deg, #2EC4B6, #1A9E92)" : "#E8EDF3",
                      color: canAdvance() && !submitting ? "#fff" : "#C5CED8",
                      cursor: canAdvance() && !submitting ? "pointer" : "default",
                      boxShadow: canAdvance() && !submitting ? "0 2px 8px #2EC4B633" : "none",
                    }}
                  >
                    {submitting ? "Checking eligibility…" : isLastStep ? "See my results ✓" : "Next →"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      <SiteFooter />
    </>
  );
}

function QuestionBlock({
  question,
  value,
  onChange,
}: {
  question: NavigatorQuestion;
  value: string | string[] | undefined;
  onChange: (v: string | string[]) => void;
}) {
  const Icon = QUESTION_ICONS[question.id];

  return (
    <div className="flex flex-col gap-5 nav-step-anim">
      <div className="flex items-start gap-3">
        {Icon && (
          <div
            className="icon-circle icon-circle-primary flex-shrink-0"
            style={{ width: 40, height: 40, borderRadius: 12 }}
          >
            <Icon size={19} strokeWidth={2} />
          </div>
        )}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">{question.prompt}</h2>
          {question.helpText && <p className="text-sm text-gray-500">{question.helpText}</p>}
        </div>
      </div>

      {question.type === "single" && question.options && (
        <div className="flex flex-col gap-2.5">
          {question.options.map((opt) => {
            const selected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(opt.value)}
                className="flex items-center gap-3 text-left rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-200 active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100"
                style={{
                  borderColor: selected ? "var(--primary)" : "#E8EDF3",
                  background: selected ? "#E8F8F6" : "#fff",
                  color: selected ? "#1A9E92" : "#1A2332",
                  boxShadow: selected ? "0 0 0 3px #2EC4B620" : "none",
                }}
              >
                {/* Radio-style dot — signals "pick one, replaces the previous choice" */}
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all duration-200"
                  style={{ borderColor: selected ? "var(--primary)" : "#D5DAE3" }}
                >
                  <span
                    className="rounded-full transition-all duration-200"
                    style={{
                      width: selected ? 8 : 0,
                      height: selected ? 8 : 0,
                      background: "var(--primary)",
                    }}
                  />
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>
      )}

      {question.type === "multi" && question.options && (
        <div className="flex flex-col gap-2.5">
          {question.options.map((opt) => {
            const selected = Array.isArray(value) && value.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  const current = Array.isArray(value) ? value : [];
                  onChange(selected ? current.filter((v) => v !== opt.value) : [...current, opt.value]);
                }}
                className="flex items-center gap-3 text-left rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-200 active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100"
                style={{
                  borderColor: selected ? "var(--primary)" : "#E8EDF3",
                  background: selected ? "#E8F8F6" : "#fff",
                  color: selected ? "#1A9E92" : "#1A2332",
                }}
              >
                {/* Checkbox — signals "pick any, adds to a set" */}
                <span
                  className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all duration-200"
                  style={{
                    background: selected ? "var(--primary)" : "#fff",
                    border: selected ? "none" : "2px solid #D5DAE3",
                    transform: selected ? "scale(1)" : "scale(0.92)",
                  }}
                >
                  {selected && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>
      )}

      {(question.type === "text" || question.type === "email") && (
        <input
          type={question.type === "email" ? "email" : "text"}
          className={inputClass}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.type === "email" ? "you@organisation.org" : "Type your answer"}
        />
      )}

      {question.type === "select" && question.options && (
        <select
          className={inputClass}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="" disabled>
            Select a country…
          </option>
          {question.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function NavigatorResults({ schemes, email }: { schemes: EligibleScheme[]; email: string }) {
  const hasMatches = schemes.length > 0;

  // Fire the Google Ads conversion exactly once, when the visitor actually
  // reaches this screen after a successful submission — not on page load of
  // /navigator, not on the button click. Reaching results is the meaningful
  // completion regardless of whether any scheme matched, so this fires for
  // both the populated and empty-match states (see `hasMatches` above,
  // which only affects what's rendered below, not whether this fires).
  //
  // The `useRef` guard (on top of the empty dependency array) protects
  // against React Strict Mode's dev-only double-invocation of effects,
  // which would otherwise double-count this conversion in development.
  const hasFiredConversion = useRef(false);
  useEffect(() => {
    if (hasFiredConversion.current) return;
    hasFiredConversion.current = true;

    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", "conversion", { send_to: "AW-17391421551/WzWCCLW5-tEcEO-Q8ORA" });
    } else if (process.env.NODE_ENV !== "production") {
      console.warn("[Navigator] gtag is not available — conversion event was not sent.");
    }
  }, []);

  return (
    <>
      <Navbar />
      <div style={{ paddingTop: "70px" }}>
        <section className="section bg-light-gray min-h-screen">
          <div className="container mx-auto px-6">
            <div className="max-w-2xl mx-auto nav-step-anim">
              <div className="card" style={{ borderRadius: 24, padding: 40 }}>
                <div className="text-center mb-8">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                    style={{ background: hasMatches ? "#E8F8F6" : "#F3F5F8" }}
                  >
                    {hasMatches ? (
                      <CheckCircle2 size={30} color="#2EC4B6" strokeWidth={2} />
                    ) : (
                      <Mail size={26} color="#8896A6" strokeWidth={2} />
                    )}
                  </div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    {hasMatches ? "Your results" : "No exact match today"}
                  </h1>
                  <p className="text-sm text-gray-500">
                    {hasMatches
                      ? `${schemes.length} scheme${schemes.length > 1 ? "s" : ""} matched your profile. We've also sent a copy to ${email}.`
                      : `We've sent a copy of your answers to ${email}.`}
                  </p>
                </div>

                {hasMatches ? (
                  <div className="flex flex-col gap-4 text-left">
                    {schemes.map((s) => {
                      const { main, status } = splitSchemeDescription(s.scheme_description);
                      return (
                        <div
                          key={s.scheme_name}
                          className="rounded-2xl bg-white px-5 py-4 transition-shadow duration-200 hover:shadow-md"
                          style={{ border: "1px solid #E8EDF3", borderLeft: "3px solid var(--primary)" }}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className="icon-circle icon-circle-primary flex-shrink-0"
                              style={{ width: 36, height: 36, borderRadius: 10 }}
                            >
                              <Landmark size={17} strokeWidth={2} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-gray-800 text-base mb-1">{s.scheme_name}</div>
                              <p className="text-sm text-gray-600 leading-relaxed">{main}</p>
                              {status && (
                                <span
                                  className="inline-block mt-2 px-2.5 py-1 rounded-lg text-xs font-semibold"
                                  style={{ background: "#FEF3E2", color: "#B5720A" }}
                                >
                                  {status}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    className="rounded-2xl px-5 py-5 text-left"
                    style={{ background: "#F7F9FC", border: "1px solid #E8EDF3" }}
                  >
                    <p className="text-sm text-gray-700 leading-relaxed mb-3">
                      Nothing in our current scheme list lines up with your answers, but that doesn&apos;t
                      mean there&apos;s no fit — our team reviews every submission by hand.
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      Reply directly to the email we just sent, or talk to us below, and we&apos;ll take a
                      closer look at your specific situation.
                    </p>
                  </div>
                )}

                <div className="text-center mt-8">
                  <a href="/contact" className="btn-primary inline-block" style={{ textDecoration: "none" }}>
                    Talk to our team
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      <SiteFooter />
    </>
  );
}
