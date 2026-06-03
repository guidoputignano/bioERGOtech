"use client";

import { useState } from "react";
import CaseForm from "./components/CaseForm";
import ReportDisplay from "./components/ReportDisplay";

export type CaseData = {
  patient_age: string;
  patient_sex: string;
  diagnosis: string;
  stage: string;
  ecog: string;
  comorbidities: string;
  available_tests: string;
  missing_tests: string;
  surgery: string;
  histology: string;
  request: string;
};

export type ReportData = {
  report: string;
  tool_calls: string[];
  model: string;
  duration_seconds: number;
  timestamp: string;
  case_data?: CaseData;
};

export default function GicPrototypeClient() {
  const [step, setStep] = useState<"form" | "loading" | "report">("form");
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (caseData: CaseData) => {
    setStep("loading");
    setError(null);

    try {
      const response = await fetch("/api/gic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(caseData),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to generate report");
      }

      const data = await response.json();
      // Attach original case data so PDF generator has full context
      setReportData({ ...data, case_data: caseData });
      setStep("report");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setStep("form");
    }
  };

  const handleReset = () => {
    setStep("form");
    setReportData(null);
    setError(null);
  };

  return (
    <div>
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <i className="fas fa-exclamation-circle text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700">
              Error generating report
            </p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {step === "form" && <CaseForm onSubmit={handleSubmit} />}

      {step === "loading" && (
        <div className="flex flex-col items-center justify-center py-24 gap-6">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-[#0D7E8A]/20 rounded-full" />
            <div className="w-20 h-20 border-4 border-t-[#0D7E8A] rounded-full animate-spin absolute top-0 left-0" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-[#0B2545]">
              Generating GIC Pre-Analysis Report
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Searching AIOM and ESMO guidelines · Checking investigation
              completeness · Drafting clinical proposal
            </p>
            <p className="text-xs text-gray-400 mt-3">
              This may take 30–120 seconds
            </p>
          </div>
        </div>
      )}

      {step === "report" && reportData && (
        <ReportDisplay data={reportData} onReset={handleReset} />
      )}
    </div>
  );
}
