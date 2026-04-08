"use client";

import { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";

type Step = 0 | 1 | 2 | 3 | 4;

interface OrgResult {
  id: string;
  name: string;
  org_type: string;
  city: string;
  country: string;
}

interface FormData {
  partnership_type: string;
  full_name: string;
  contact_role: string;
  email: string;
  organisation_id: string;
  organisation_name: string;
  organisation_type: string;
  organisation_website: string;
  country: string;
  city: string;
  areas_of_interest: string[];
  what_you_bring: string;
  what_you_seek: string;
  collaboration_type: string;
  expected_timeline: string;
  mobile_phone: string;
  strategic_email: string;
  tax_id: string;
  newsletter_consent: boolean;
}

const EMPTY_FORM: FormData = {
  partnership_type: "",
  full_name: "",
  contact_role: "",
  email: "",
  organisation_id: "",
  organisation_name: "",
  organisation_type: "",
  organisation_website: "",
  country: "",
  city: "",
  areas_of_interest: [],
  what_you_bring: "",
  what_you_seek: "",
  collaboration_type: "",
  expected_timeline: "",
  mobile_phone: "",
  strategic_email: "",
  tax_id: "",
  newsletter_consent: true,
};

const ORG_TYPES = [
  { value: "startup", label: "Startup" },
  { value: "sme", label: "SME / Company" },
  { value: "hospital", label: "Hospital / Clinic" },
  { value: "university", label: "University / Research Institute" },
  { value: "investor", label: "Investor / VC" },
  { value: "international_partner", label: "International Partner" },
  { value: "other", label: "Other" },
];

const PARTNERSHIP_TYPES = [
  { value: "community_partner", label: "Community Partner", desc: "Join the ecosystem, connect with others, and contribute to innovation activities." },
  { value: "project_partner", label: "Project Partner", desc: "Take part in scientific or operational projects and collaborate on specific initiatives." },
  { value: "strategic_partner", label: "Strategic Partner", desc: "Build a deeper long-term collaboration with broader strategic and organisational contribution." },
];

const SCIENTIFIC_PILLARS = [
  {
    value: "scientific_innovation",
    label: "Scientific Research and Innovation",
    desc: "Research projects, scientific exploration, and new ideas.",
  },
  {
    value: "education_dissemination",
    label: "Training and Scientific Dissemination",
    desc: "Education, public engagement, and knowledge-sharing activities.",
  },
  {
    value: "technology_transfer",
    label: "Technology Development and Transfer",
    desc: "Turning ideas into practical tools, products, and startup support.",
  },
  {
    value: "biotech_collaboration",
    label: "Biotech Collaboration and Research Networks",
    desc: "Cross-organisation and interdisciplinary biotech collaboration.",
  },
  {
    value: "sustainability_social_impact",
    label: "Sustainability and Social Responsibility",
    desc: "Responsible innovation and long-term societal value.",
  },
  {
    value: "clinical_validation",
    label: "Clinical Trials and Therapeutic Validation",
    desc: "Clinical relevance, validation, and therapeutic application.",
  },
  {
    value: "support_services",
    label: "Support Services",
    desc: "Operational, technical, or enabling support for the ecosystem.",
  },
  {
    value: "other",
    label: "Other",
    desc: "Any other area not captured above.",
  },
];

const STEPS = [
  { num: 0 as Step, label: "Partnership" },
  { num: 1 as Step, label: "Your Details" },
  { num: 2 as Step, label: "Organisation" },
  { num: 3 as Step, label: "Interests" },
  { num: 4 as Step, label: "Review" },
];

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {STEPS.map((s, i) => {
        const done = current > s.num;
        const active = current === s.num;
        return (
          <div key={s.num} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300"
                style={{
                  background: done ? "var(--primary)" : active ? "var(--primary)" : "#E8EDF3",
                  color: done || active ? "#fff" : "#8896A6",
                  boxShadow: active ? "0 0 0 4px #2EC4B620" : "none",
                }}
              >
                {done ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  s.num + 1
                )}
              </div>
              <span className="text-xs font-semibold hidden sm:block" style={{ color: active ? "var(--primary)" : "#8896A6" }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="w-16 h-0.5 mx-1 mb-5 transition-all duration-300" style={{ background: done ? "var(--primary)" : "#E8EDF3" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Field({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-gray-700">
        {label}
        {required && <span style={{ color: "var(--primary)" }}> *</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

const inputClass =
  "w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 bg-white outline-none transition-all duration-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 placeholder:text-gray-400";

function Step0({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (k: keyof FormData, v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Choose your partnership path</h2>
        <p className="text-sm text-gray-500">Tell us how you would like to engage with bioERGOtech.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PARTNERSHIP_TYPES.map((type) => {
          const selected = data.partnership_type === type.value;
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => onChange("partnership_type", type.value)}
              className="text-left rounded-2xl border p-5 transition-all duration-200"
              style={{
                borderColor: selected ? "var(--primary)" : "#E8EDF3",
                background: selected ? "#E8F8F6" : "#fff",
                boxShadow: selected ? "0 0 0 3px #2EC4B620" : "none",
              }}
            >
              <div className="text-lg font-bold text-gray-800 mb-2">{type.label}</div>
              <div className="text-sm text-gray-600 leading-6">{type.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Step1({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (k: keyof FormData, v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Tell us about yourself</h2>
        <p className="text-sm text-gray-500">Who will be the primary contact for this application?</p>
      </div>

      <Field label="Full Name" required>
        <input className={inputClass} placeholder="e.g. Maria Rossi" value={data.full_name} onChange={(e) => onChange("full_name", e.target.value)} />
      </Field>

      <Field label="Your Role / Title" required>
        <input className={inputClass} placeholder="e.g. Chief Scientific Officer" value={data.contact_role} onChange={(e) => onChange("contact_role", e.target.value)} />
      </Field>

      <Field label="Email Address" required>
        <input type="email" className={inputClass} placeholder="e.g. maria@example.com" value={data.email} onChange={(e) => onChange("email", e.target.value)} />
      </Field>

      {data.partnership_type === "strategic_partner" && (
        <>
          <Field label="Mobile Phone" hint="Optional for strategic partnerships">
            <input className={inputClass} placeholder="e.g. +39 320 123 4567" value={data.mobile_phone} onChange={(e) => onChange("mobile_phone", e.target.value)} />
          </Field>

          <Field label="Additional Contact Email" hint="Optional for strategic partnerships">
            <input type="email" className={inputClass} placeholder="Optional second contact email" value={data.strategic_email} onChange={(e) => onChange("strategic_email", e.target.value)} />
          </Field>

          <Field label="Codice Fiscale / P.IVA" hint="Optional for strategic partnerships">
            <input className={inputClass} placeholder="Optional tax identifier" value={data.tax_id} onChange={(e) => onChange("tax_id", e.target.value)} />
          </Field>
        </>
      )}
    </div>
  );
}

function OrgSearch({
  data,
  onSelectOrg,
  onChange,
}: {
  data: FormData;
  onSelectOrg: (org: OrgResult | null) => void;
  onChange: (k: keyof FormData, v: string) => void;
}) {
  const [query, setQuery] = useState(data.organisation_name);
  const [results, setResults] = useState<OrgResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isNewOrg, setIsNewOrg] = useState(!data.organisation_id);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/organisations/search?q=${encodeURIComponent(query)}`);
        const d = await res.json();
        setResults(d.organisations || []);
        setShowDropdown(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (org: OrgResult) => {
    setQuery(org.name);
    setShowDropdown(false);
    setIsNewOrg(false);
    onSelectOrg(org);
  };

  const handleClear = () => {
    setQuery("");
    setIsNewOrg(true);
    onSelectOrg(null);
  };

  const handleType = (val: string) => {
    setQuery(val);
    onChange("organisation_name", val);
    onChange("organisation_id", "");
    setIsNewOrg(true);
  };

  const typeColors: Record<string, string> = {
    startup: "#00B894",
    sme: "#F0A500",
    hospital: "#E74C6F",
    university: "#7C5CFC",
    investor: "#4A7DFF",
    international_partner: "#F0A500",
    other: "#8896A6",
  };

  const typeBgs: Record<string, string> = {
    startup: "#E6F9F5",
    sme: "#FFF8E6",
    hospital: "#FDECF1",
    university: "#F0EDFF",
    investor: "#EBF1FF",
    international_partner: "#FFF8E6",
    other: "#F3F5F8",
  };

  const typeLabels: Record<string, string> = {
    startup: "Startup",
    sme: "SME",
    hospital: "Hospital",
    university: "University",
    investor: "Investor",
    international_partner: "Int. Partner",
    other: "Other",
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Your Organisation</h2>
        <p className="text-sm text-gray-500">Search for your organisation or add a new one.</p>
      </div>

      <Field label="Organisation Name" required>
        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <input
              className={inputClass}
              placeholder="Search by organisation name..."
              value={query}
              onChange={(e) => handleType(e.target.value)}
              onFocus={() => {
                if (results.length > 0) setShowDropdown(true);
              }}
            />

            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg className="animate-spin w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              </div>
            )}

            {data.organisation_id && (
              <button onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {data.organisation_id && (
            <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl border text-sm" style={{ borderColor: "#2EC4B6", background: "#E8F8F6" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1A9E92" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="font-semibold" style={{ color: "#1A9E92" }}>
                Linked to existing organisation
              </span>
              <span className="text-gray-500 text-xs ml-1">— details pre-filled below</span>
            </div>
          )}

          {showDropdown && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-100 shadow-lg z-50 overflow-hidden">
              {results.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleSelect(org)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                  type="button"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{ background: typeBgs[org.org_type] || "#F3F5F8", color: typeColors[org.org_type] || "#8896A6" }}
                  >
                    {org.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800 truncate">{org.name}</div>
                    <div className="text-xs text-gray-500">{[org.city, org.country].filter(Boolean).join(", ")}</div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-lg flex-shrink-0" style={{ background: typeBgs[org.org_type] || "#F3F5F8", color: typeColors[org.org_type] || "#8896A6" }}>
                    {typeLabels[org.org_type] || org.org_type}
                  </span>
                </button>
              ))}
              <div className="px-4 py-2 text-xs text-gray-400 bg-gray-50">Not finding your organisation? Keep typing to add a new one.</div>
            </div>
          )}
        </div>
      </Field>

      {(isNewOrg || data.organisation_id) && query.trim().length > 0 && (
        <>
          <Field label="Organisation Type" required>
            <select className={inputClass} value={data.organisation_type} onChange={(e) => onChange("organisation_type", e.target.value)} disabled={!!data.organisation_id}>
              <option value="">Select a type...</option>
              {ORG_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Country" required>
              <input className={inputClass} placeholder="e.g. Italy" value={data.country} onChange={(e) => onChange("country", e.target.value)} disabled={!!data.organisation_id} />
            </Field>

            <Field label="City" required>
              <input className={inputClass} placeholder="e.g. Taranto" value={data.city} onChange={(e) => onChange("city", e.target.value)} disabled={!!data.organisation_id} />
            </Field>
          </div>

          <Field label="Website" hint="Optional — helps us learn more about your organisation.">
            <input className={inputClass} placeholder="https://yourorganisation.com" value={data.organisation_website} onChange={(e) => onChange("organisation_website", e.target.value)} />
          </Field>

          {data.organisation_id && (
            <p className="text-xs text-gray-400 -mt-2">
              Fields are pre-filled from the existing organisation record.{" "}
              <button onClick={handleClear} className="underline text-teal-600" type="button">
                Not your organisation? Search again.
              </button>
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Step3({
  data,
  onTogglePillar,
  onChange,
}: {
  data: FormData;
  onTogglePillar: (v: string) => void;
  onChange: (k: keyof FormData, v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Your Interests & Contribution</h2>
        <p className="text-sm text-gray-500">Help us understand how you fit into the ecosystem.</p>
      </div>

      <Field label="Areas of Interest" required hint="Select one or more areas relevant to your interest in the Foundation.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
          {SCIENTIFIC_PILLARS.map((p) => {
            const selected = data.areas_of_interest.includes(p.value);
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => onTogglePillar(p.value)}
                className="flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-200"
                style={{
                  borderColor: selected ? "var(--primary)" : "#E8EDF3",
                  background: selected ? "#E8F8F6" : "#fff",
                  color: selected ? "#1A9E92" : "#4A5568",
                }}
              >
                <div
                  className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                  style={{ background: selected ? "var(--primary)" : "#E8EDF3" }}
                >
                  {selected && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium">{p.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{p.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="What do you bring to the ecosystem?" required hint="Skills, resources, networks, equipment, expertise — be specific.">
        <textarea className={inputClass} rows={4} placeholder="e.g. We bring a clinical network of 12 hospitals in Puglia..." value={data.what_you_bring} onChange={(e) => onChange("what_you_bring", e.target.value)} />
      </Field>

      <Field label="What are you looking for?" required hint="Collaborators, resources, funding, expertise — what does success look like for you?">
        <textarea className={inputClass} rows={4} placeholder="e.g. We are looking for computational biology partners..." value={data.what_you_seek} onChange={(e) => onChange("what_you_seek", e.target.value)} />
      </Field>

      {data.partnership_type === "strategic_partner" && (
        <>
          <Field label="Type of Strategic Contribution" hint="Optional. Describe whether the contribution is financial, in-kind, advisory, technical, or other.">
            <input className={inputClass} placeholder="e.g. Financial support, in-kind resources, advisory support" value={data.collaboration_type} onChange={(e) => onChange("collaboration_type", e.target.value)} />
          </Field>

          <Field label="Expected Timeline" hint="Optional. Indicate expected timeline or periodicity for collaboration.">
            <input className={inputClass} placeholder="e.g. Annual, 6 months, project-based" value={data.expected_timeline} onChange={(e) => onChange("expected_timeline", e.target.value)} />
          </Field>
        </>
      )}
    </div>
  );
}

function Step4({
  data,
  onToggleNewsletter,
}: {
  data: FormData;
  onToggleNewsletter: (v: boolean) => void;
}) {
  const orgLabel = ORG_TYPES.find((t) => t.value === data.organisation_type)?.label ?? "—";
  const partnershipLabel = PARTNERSHIP_TYPES.find((t) => t.value === data.partnership_type)?.label ?? "—";
  const pillars = SCIENTIFIC_PILLARS.filter((p) => data.areas_of_interest.includes(p.value)).map((p) => p.label);

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-3 border-b border-gray-100 last:border-0">
      <span className="text-xs font-bold text-gray-400 uppercase tracking-wide w-40 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800">{value || "—"}</span>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Review your application</h2>
        <p className="text-sm text-gray-500">Please check everything is correct before submitting.</p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-gray-50 px-5 py-2">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-3 pb-1">Partnership</p>
        <Row label="Type" value={partnershipLabel} />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-gray-50 px-5 py-2">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-3 pb-1">Contact</p>
        <Row label="Name" value={data.full_name} />
        <Row label="Role" value={data.contact_role} />
        <Row label="Email" value={data.email} />
        {data.partnership_type === "strategic_partner" && (
          <>
            <Row label="Mobile Phone" value={data.mobile_phone} />
            <Row label="Additional Email" value={data.strategic_email} />
            <Row label="Codice Fiscale / P.IVA" value={data.tax_id} />
          </>
        )}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-gray-50 px-5 py-2">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-3 pb-1">Organisation</p>
        <Row label="Name" value={data.organisation_name} />
        <Row label="Type" value={orgLabel} />
        <Row label="Location" value={[data.city, data.country].filter(Boolean).join(", ")} />
        <Row label="Website" value={data.organisation_website} />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-gray-50 px-5 py-2">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-3 pb-1">Interests & Contribution</p>
        <Row label="Areas of Interest" value={pillars.join(", ") || "—"} />
        <Row label="What you bring" value={data.what_you_bring} />
        <Row label="What you seek" value={data.what_you_seek} />
        {data.partnership_type === "strategic_partner" && (
          <>
            <Row label="Strategic Contribution" value={data.collaboration_type} />
            <Row label="Timeline" value={data.expected_timeline} />
          </>
        )}
      </div>

      <div
        className="flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all"
        style={{
          borderColor: data.newsletter_consent ? "#2EC4B6" : "#E8EDF3",
          background: data.newsletter_consent ? "#E8F8F6" : "#FAFBFC",
        }}
        onClick={() => onToggleNewsletter(!data.newsletter_consent)}
      >
        <div
          className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
          style={{
            background: data.newsletter_consent ? "var(--primary)" : "#E8EDF3",
            border: `2px solid ${data.newsletter_consent ? "var(--primary)" : "#D1D5DB"}`,
          }}
        >
          {data.newsletter_consent && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: data.newsletter_consent ? "#1A9E92" : "#4A5568" }}>
            Subscribe to bioERGOtech newsletter
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Receive updates, news and insights from the Foundation. You can unsubscribe at any time.</p>
        </div>
      </div>
    </div>
  );
}

export default function JoinUs() {
  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleNewsletter = (value: boolean) =>
    setForm((prev) => ({ ...prev, newsletter_consent: value }));

  const togglePillar = (value: string) =>
    setForm((prev) => ({
      ...prev,
      areas_of_interest: prev.areas_of_interest.includes(value)
        ? prev.areas_of_interest.filter((v) => v !== value)
        : [...prev.areas_of_interest, value],
    }));

  const ORG_TYPE_MAP: Record<string, string> = {
    Foundation: "other",
    University: "university",
    Startup: "startup",
    SME: "sme",
    "Clinical Center": "hospital",
    Investor: "investor",
    "International Partner": "international_partner",
  };

  const handleSelectOrg = (org: OrgResult | null) => {
    if (org) {
      setForm((prev) => ({
        ...prev,
        organisation_id: org.id,
        organisation_name: org.name,
        organisation_type: ORG_TYPE_MAP[org.org_type] || org.org_type.toLowerCase(),
        city: org.city || "",
        country: org.country || "",
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        organisation_id: "",
        organisation_name: "",
        organisation_type: "",
        city: "",
        country: "",
        organisation_website: "",
      }));
    }
  };

  const canAdvance = (): boolean => {
    if (step === 0) return !!form.partnership_type;
    if (step === 1) return !!(form.full_name.trim() && form.contact_role.trim() && form.email.trim());
    if (step === 2) return !!(form.organisation_name.trim() && form.organisation_type && form.country.trim() && form.city.trim());
    if (step === 3) return !!(form.areas_of_interest.length > 0 && form.what_you_bring.trim() && form.what_you_seek.trim());
    return true;
  };

  const handleNext = () => {
    if (step < 4) setStep((s) => (s + 1) as Step);
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => (s - 1) as Step);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again or email join@bioergotech.org.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <>
        <Navbar />
        <div style={{ paddingTop: "70px" }}>
          <section className="section bg-light-gray min-h-screen flex items-center justify-center">
            <div className="max-w-md mx-auto px-6 text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "#E8F8F6" }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2EC4B6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-3">Application Submitted!</h1>
              <p className="text-gray-600 mb-2">
                Thank you, <strong>{form.full_name}</strong>. Your application for <strong>{form.organisation_name}</strong> has been received.
              </p>
              <p className="text-gray-500 text-sm mb-2">
                We&apos;ll review your application and get back to you at <strong>{form.email}</strong> within 5 business days.
              </p>
              {form.newsletter_consent && <p className="text-sm mb-8" style={{ color: "#1A9E92" }}>✓ You&apos;re subscribed to our newsletter.</p>}
              <a href="/" className="btn-primary" style={{ textDecoration: "none" }}>
                Back to Homepage
              </a>
            </div>
          </section>
        </div>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div style={{ paddingTop: "70px" }}>
        <section className="bg-light-gray" style={{ padding: "60px 0 40px" }}>
          <div className="container mx-auto px-6 text-center">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4 text-gray-800">Join the Ecosystem</h1>
            <p className="text-lg max-w-2xl mx-auto text-gray-600">
              Apply for membership to bioERGOtech Foundation. We review every application personally and aim to respond within 5 business days.
            </p>
          </div>
        </section>

        <section className="section" id="apply">
          <div className="container mx-auto px-6">
            <div className="text-center mb-10">
              <h2 className="section-title block">Apply for Membership</h2>
              <p className="text-gray-600 max-w-xl mx-auto">Complete the form below. All applications are reviewed by the Foundation team.</p>
            </div>

            <div className="max-w-2xl mx-auto">
              <div className="card" style={{ borderRadius: 24, padding: "40px" }}>
                <StepIndicator current={step} />
                <div style={{ minHeight: 340 }}>
                  {step === 0 && <Step0 data={form} onChange={update} />}
                  {step === 1 && <Step1 data={form} onChange={update} />}
                  {step === 2 && <OrgSearch data={form} onSelectOrg={handleSelectOrg} onChange={update} />}
                  {step === 3 && <Step3 data={form} onTogglePillar={togglePillar} onChange={update} />}
                  {step === 4 && <Step4 data={form} onToggleNewsletter={toggleNewsletter} />}
                </div>

                {error && <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">{error}</div>}

                <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-100">
                  <button
                    onClick={handleBack}
                    disabled={step === 0}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: step === 0 ? "#F3F5F8" : "#fff",
                      border: "1.5px solid #E8EDF3",
                      color: step === 0 ? "#C5CED8" : "#4A5568",
                      cursor: step === 0 ? "default" : "pointer",
                    }}
                  >
                    ← Back
                  </button>

                  <span className="text-xs text-gray-400 font-medium">Step {step + 1} of 5</span>

                  {step < 4 ? (
                    <button
                      onClick={handleNext}
                      disabled={!canAdvance()}
                      className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                      style={{
                        background: canAdvance() ? "linear-gradient(135deg, #2EC4B6, #1A9E92)" : "#E8EDF3",
                        color: canAdvance() ? "#fff" : "#C5CED8",
                        cursor: canAdvance() ? "pointer" : "default",
                        boxShadow: canAdvance() ? "0 2px 8px #2EC4B633" : "none",
                      }}
                    >
                      Continue →
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all flex items-center gap-2"
                      style={{
                        background: submitting ? "#E8EDF3" : "linear-gradient(135deg, #2EC4B6, #1A9E92)",
                        color: submitting ? "#C5CED8" : "#fff",
                        cursor: submitting ? "default" : "pointer",
                        boxShadow: submitting ? "none" : "0 2px 8px #2EC4B633",
                      }}
                    >
                      {submitting ? "Submitting..." : "Submit Application ✓"}
                    </button>
                  )}
                </div>
              </div>

              <p className="text-center text-sm text-gray-500 mt-6">
                Already a member?{" "}
                <a href="/member-portal" style={{ color: "var(--primary)", fontWeight: 600 }}>
                  Sign in to your portal →
                </a>
              </p>
            </div>
          </div>
        </section>
      </div>
      <SiteFooter />
    </>
  );
}