"use client";

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { NAVIGATOR_QUESTIONS, NavigatorQuestion } from "@/lib/navigator/questions";

type Answers = Record<string, string | string[]>;
type EligibleScheme = { scheme_name: string; scheme_description: string };

const inputClass =
  "w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 bg-white outline-none transition-all duration-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 placeholder:text-gray-400";

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
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${((stepIndex + 1) / visibleQuestions.length) * 100}%`,
                      background: "linear-gradient(135deg, #2EC4B6, #1A9E92)",
                    }}
                  />
                </div>
                <p className="text-xs text-gray-400 font-medium mb-6">
                  Step {stepIndex + 1} of {visibleQuestions.length}
                </p>

                <div style={{ minHeight: 220 }}>
                  {currentQuestion && (
                    <QuestionBlock
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
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
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
                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all flex items-center gap-2"
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
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">{question.prompt}</h2>
        {question.helpText && <p className="text-sm text-gray-500">{question.helpText}</p>}
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
                className="text-left rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-200"
                style={{
                  borderColor: selected ? "var(--primary)" : "#E8EDF3",
                  background: selected ? "#E8F8F6" : "#fff",
                  color: selected ? "#1A9E92" : "#1A2332",
                  boxShadow: selected ? "0 0 0 3px #2EC4B620" : "none",
                }}
              >
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
                className="flex items-center gap-3 text-left rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-200"
                style={{
                  borderColor: selected ? "var(--primary)" : "#E8EDF3",
                  background: selected ? "#E8F8F6" : "#fff",
                  color: selected ? "#1A9E92" : "#1A2332",
                }}
              >
                <span
                  className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                  style={{ background: selected ? "var(--primary)" : "#E8EDF3" }}
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
  return (
    <>
      <Navbar />
      <div style={{ paddingTop: "70px" }}>
        <section className="section bg-light-gray min-h-screen">
          <div className="container mx-auto px-6">
            <div className="max-w-xl mx-auto">
              <div className="card text-center" style={{ borderRadius: 24, padding: 40 }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "#E8F8F6" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2EC4B6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Your results</h1>
                <p className="text-sm text-gray-500 mb-8">We&apos;ve also sent a copy to {email}.</p>

                {schemes.length === 0 ? (
                  <p className="text-sm text-gray-600 text-left bg-gray-50 rounded-xl p-4">
                    We didn&apos;t find an exact match today — but our team may still be able to help.
                    Reply to the email we just sent and we&apos;ll take a closer look.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3 text-left mb-2">
                    {schemes.map((s) => (
                      <div key={s.scheme_name} className="rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4">
                        <div className="font-bold text-gray-800 mb-1">{s.scheme_name}</div>
                        <p className="text-sm text-gray-600">{s.scheme_description}</p>
                      </div>
                    ))}
                  </div>
                )}

                <a href="/contact" className="btn-primary inline-block mt-8" style={{ textDecoration: "none" }}>
                  Talk to our team
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
      <SiteFooter />
    </>
  );
}
