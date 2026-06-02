"use client";

import { useState } from "react";
import { CaseData } from "../GicPrototypeClient";

interface CaseFormProps {
  onSubmit: (data: CaseData) => void;
}

const DEMO_CASE: CaseData = {
  patient_age: "68",
  patient_sex: "Maschio",
  diagnosis: "Adenocarcinoma del colon-sigma",
  stage: "III (T3 N2 M0)",
  ecog: "1",
  comorbidities: "Ipertensione arteriosa, diabete tipo 2",
  available_tests:
    "TC torace-addome-pelvi con mdc (negativa per metastasi), colonscopia con biopsia (diagnosi confermata), CEA pre-operatorio 12.4 ng/mL, emicolectomia sinistra laparoscopica eseguita, istologia: 18 linfonodi esaminati 4 positivi",
  missing_tests: "PET-TC, profilo molecolare RAS/BRAF",
  surgery: "Emicolectomia sinistra laparoscopica",
  histology: "18 linfonodi esaminati, 4 positivi",
  request: "Definizione del trattamento adiuvante post-chirurgico",
};

export default function CaseForm({ onSubmit }: CaseFormProps) {
  const [form, setForm] = useState<CaseData>({
    patient_age: "",
    patient_sex: "Maschio",
    diagnosis: "",
    stage: "",
    ecog: "",
    comorbidities: "",
    available_tests: "",
    missing_tests: "",
    surgery: "",
    histology: "",
    request: "",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const loadDemo = () => setForm(DEMO_CASE);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const inputClass =
    "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0D7E8A] focus:border-transparent bg-white transition";
  const labelClass = "block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-[#0B2545] px-6 py-4 flex items-center justify-between">
        <div>
          <h2
            className="text-white font-semibold text-lg"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            Case Input Form
          </h2>
          <p className="text-gray-400 text-xs mt-0.5">
            Enter patient data for GIC pre-analysis — all fields are de-identified
          </p>
        </div>
        <button
          type="button"
          onClick={loadDemo}
          className="text-xs bg-[#0D7E8A] hover:bg-[#0D7E8A]/80 text-white px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
        >
          <i className="fas fa-flask" />
          Load demo case
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Patient Info */}
        <div>
          <h3 className="text-sm font-semibold text-[#0B2545] mb-3 flex items-center gap-2">
            <i className="fas fa-user-circle text-[#0D7E8A]" />
            Patient Information
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>Age</label>
              <input
                name="patient_age"
                value={form.patient_age}
                onChange={handleChange}
                placeholder="e.g. 68"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Sex</label>
              <select
                name="patient_sex"
                value={form.patient_sex}
                onChange={handleChange}
                className={inputClass}
              >
                <option>Maschio</option>
                <option>Femmina</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>ECOG PS</label>
              <select
                name="ecog"
                value={form.ecog}
                onChange={handleChange}
                className={inputClass}
                required
              >
                <option value="">Select</option>
                <option>0</option>
                <option>1</option>
                <option>2</option>
                <option>3</option>
                <option>4</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Stage</label>
              <input
                name="stage"
                value={form.stage}
                onChange={handleChange}
                placeholder="e.g. III (T3 N2 M0)"
                className={inputClass}
                required
              />
            </div>
          </div>
        </div>

        {/* Diagnosis */}
        <div>
          <h3 className="text-sm font-semibold text-[#0B2545] mb-3 flex items-center gap-2">
            <i className="fas fa-microscope text-[#0D7E8A]" />
            Diagnosis & Surgery
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Diagnosis</label>
              <input
                name="diagnosis"
                value={form.diagnosis}
                onChange={handleChange}
                placeholder="e.g. Adenocarcinoma del colon-sigma"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Surgery performed</label>
              <input
                name="surgery"
                value={form.surgery}
                onChange={handleChange}
                placeholder="e.g. Emicolectomia sinistra laparoscopica"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Comorbidities</label>
              <input
                name="comorbidities"
                value={form.comorbidities}
                onChange={handleChange}
                placeholder="e.g. Ipertensione arteriosa, diabete tipo 2"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Histology findings</label>
              <input
                name="histology"
                value={form.histology}
                onChange={handleChange}
                placeholder="e.g. 18 linfonodi, 4 positivi"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Investigations */}
        <div>
          <h3 className="text-sm font-semibold text-[#0B2545] mb-3 flex items-center gap-2">
            <i className="fas fa-vials text-[#0D7E8A]" />
            Investigations
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Available tests / results</label>
              <textarea
                name="available_tests"
                value={form.available_tests}
                onChange={handleChange}
                placeholder="List all completed investigations..."
                className={`${inputClass} h-28 resize-none`}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Missing / pending tests</label>
              <textarea
                name="missing_tests"
                value={form.missing_tests}
                onChange={handleChange}
                placeholder="List investigations not yet available..."
                className={`${inputClass} h-28 resize-none`}
              />
            </div>
          </div>
        </div>

        {/* GIC Request */}
        <div>
          <h3 className="text-sm font-semibold text-[#0B2545] mb-3 flex items-center gap-2">
            <i className="fas fa-comments text-[#0D7E8A]" />
            GIC Request
          </h3>
          <textarea
            name="request"
            value={form.request}
            onChange={handleChange}
            placeholder="What decision or recommendation is the GIC being asked to make?"
            className={`${inputClass} h-24 resize-none`}
            required
          />
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            <i className="fas fa-lock mr-1" />
            Data processed locally · Not stored · De-identified
          </p>
          <button
            type="submit"
            className="bg-[#0B2545] hover:bg-[#0D7E8A] text-white font-semibold px-6 py-2.5 rounded-lg transition flex items-center gap-2 text-sm"
          >
            <i className="fas fa-brain" />
            Generate GIC Report
          </button>
        </div>
      </form>
    </div>
  );
}
