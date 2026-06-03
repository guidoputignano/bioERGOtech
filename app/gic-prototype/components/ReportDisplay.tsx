"use client";

import { ReportData } from "../GicPrototypeClient";

interface ReportDisplayProps {
  data: ReportData;
  onReset: () => void;
}

const HOSPITAL_NAME = "ASL VCO — Rete Oncologica";
const HOSPITAL_SUBTITLE = "Gruppo Interdisciplinare Cure (GIC)";

export default function ReportDisplay({ data, onReset }: ReportDisplayProps) {

  const cleanReport = (text: string): string => {
    return text
      .replace(/<details[^>]*>/gi, "")
      .replace(/<\/details>/gi, "")
      .replace(/<summary[^>]*>([\s\S]*?)<\/summary>/gi, "")
      .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "$1")
      .replace(/<sub[^>]*>([\s\S]*?)<\/sub>/gi, "$1")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\(pag\.\s*XX\)/gi, "")
      .replace(/\(p\.\s*XX\)/gi, "")
      .replace(/\(pp\.\s*XX[–\-]XX\)/gi, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };

  const handleSavePDF = () => {
    fetch("/api/gic", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        report: data.report,
        timestamp: data.timestamp,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("PDF generation failed");
        }
        return response.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "GIC_Report.pdf";
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch((err) => {
        console.error("PDF error:", err);
        alert("PDF generation failed. Please try again.");
      });
  };

  const renderReport = (text: string) => {
    const clean = cleanReport(text);
    const lines = clean.split("\n");
    const elements: React.ReactNode[] = [];

    lines.forEach((line, i) => {
      const raw = line.trim();

      if (!raw) {
        elements.push(<div key={i} className="h-3" />);
        return;
      }

      if (
        raw.match(/^[\d]+\.\s*(SINTESI CLINICA|PROPOSTA TERAPEUTICA|INDAGINI MANCANTI|NOTE PER LA DISCUSSIONE)/i) ||
        raw.match(/^(SINTESI CLINICA|PROPOSTA TERAPEUTICA|INDAGINI MANCANTI|NOTE PER LA DISCUSSIONE)/i)
      ) {
        elements.push(
          <div key={i} className="mt-8 mb-3">
            <h3 className="text-sm font-bold text-[#0B2545] uppercase tracking-widest pb-2 border-b-2 border-[#0D7E8A]">
              {raw.replace(/^[\d]+\.\s+/, "").replace(/\*+/g, "").trim()}
            </h3>
          </div>
        );
        return;
      }

      if (raw.match(/SCHEDA GIC/i) || (raw.startsWith("#") && raw.length > 3)) {
        elements.push(
          <h2
            key={i}
            className="text-lg font-bold text-[#0B2545] text-center mb-2 mt-2"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            {raw.replace(/^#+\s*/, "").replace(/\*+/g, "").trim()}
          </h2>
        );
        return;
      }

      if (raw.match(/^#{2,4}\s/)) {
        elements.push(
          <h4 key={i} className="text-sm font-semibold text-[#0B2545] mt-4 mb-1">
            {raw.replace(/^#+\s*/, "").replace(/\*+/g, "").trim()}
          </h4>
        );
        return;
      }

      if (raw.startsWith("|") && raw.endsWith("|")) {
        if (raw.match(/^\|[\s\-\|]+\|$/)) return;
        const cells = raw.split("|").filter((c) => c.trim()).map((c) => c.trim());
        const isHeader = cells.every((c) =>
          c.match(/^(Indagine|Necessità|Riferimento|Investigation|Obbligatorio)/i)
        );
        elements.push(
          <div
            key={i}
            className={`grid gap-2 text-sm py-1.5 border-b border-gray-100 ${
              cells.length === 3 ? "grid-cols-3" : "grid-cols-2"
            }`}
          >
            {cells.map((c, j) => (
              <span
                key={j}
                className={
                  isHeader
                    ? "text-xs font-semibold text-[#0B2545] uppercase tracking-wide"
                    : "text-gray-700 leading-relaxed"
                }
              >
                {c}
              </span>
            ))}
          </div>
        );
        return;
      }

      if (raw.startsWith(">")) {
        const content = raw.replace(/^>\s*[-–]?\s*/, "").trim();
        if (!content) return;
        const isWarning = !!content.match(/[⚠❗]/);
        const isSuccess = !!content.match(/[✅📌🔔]/);
        elements.push(
          <div
            key={i}
            className={`px-4 py-2 my-1.5 text-sm rounded-r-lg border-l-4 ${
              isWarning
                ? "bg-amber-50 border-amber-400 text-amber-800"
                : isSuccess
                ? "bg-[#0D7E8A]/5 border-[#0D7E8A] text-gray-700"
                : "bg-gray-50 border-gray-300 text-gray-600"
            }`}
          >
            {content.replace(/\*+/g, "")}
          </div>
        );
        return;
      }

      if (
        raw.match(/^[•\-\*]\s/) ||
        raw.match(/^\d+\.\s/) ||
        raw.match(/^[✅⚠🔹📌]\s/)
      ) {
        const content = raw
          .replace(/^[•\-\*✅⚠🔹📌]\s+/, "")
          .replace(/^\d+\.\s+/, "")
          .replace(/\*+/g, "");
        elements.push(
          <div key={i} className="flex gap-2 text-sm text-gray-700 mb-1.5 ml-2">
            <span className="text-[#0D7E8A] flex-shrink-0 mt-0.5">{"→"}</span>
            <span className="leading-relaxed">{content}</span>
          </div>
        );
        return;
      }

      if (raw.match(/^[-=]{3,}/)) {
        elements.push(<hr key={i} className="my-4 border-gray-200" />);
        return;
      }

      elements.push(
        <p key={i} className="text-sm text-gray-700 leading-relaxed mb-1.5">
          {raw.replace(/\*+/g, "").trim()}
        </p>
      );
    });

    return elements;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-sm text-gray-600">Report generated successfully</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSavePDF}
            className="text-sm bg-[#0D7E8A] hover:bg-[#0D7E8A]/80 text-white px-4 py-2 rounded-lg transition flex items-center gap-2 font-medium"
          >
            <i className="fas fa-file-pdf" />
            Save as PDF
          </button>
          <button
            onClick={onReset}
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-lg transition flex items-center gap-2"
          >
            <i className="fas fa-plus" />
            New case
          </button>
        </div>
      </div>

      <div
        id="gic-report-container"
        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
      >
        <div className="bg-[#0B2545] px-8 py-6 text-white">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs text-[#0D7E8A] font-semibold uppercase tracking-widest mb-1">
                {HOSPITAL_NAME}
              </p>
              <h2
                className="text-xl font-bold text-white"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                {HOSPITAL_SUBTITLE}
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Scheda di Pre-Analisi AI — Supporto Decisionale
              </p>
            </div>
            <div className="text-right">
              <p className="text-white font-medium text-sm">
                {new Date(data.timestamp).toLocaleDateString("it-IT", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <p className="text-xs mt-1 text-[#0D7E8A]">AIOM 2024 · ESMO Guidelines</p>
            </div>
          </div>
        </div>

        <div className="px-8 py-6">{renderReport(data.report)}</div>

        <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <i className="fas fa-shield-alt text-[#0D7E8A]" />
            Generato da bioERGOtech GIC AI · AIOM 2024 + ESMO
          </span>
          <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
            <i className="fas fa-exclamation-triangle" />
            Supporto decisionale — autorità clinica al panel GIC
          </span>
        </div>
      </div>
    </div>
  );
}
