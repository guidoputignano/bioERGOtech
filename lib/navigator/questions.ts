// Question flow for the Grant & Funding Eligibility Navigator.
// Kept as plain data so the flow/wording can be edited without touching component logic.

export type QuestionType = "single" | "multi" | "text" | "email";

export interface QuestionOption {
  value: string;
  label: string;
}

export interface NavigatorQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  helpText?: string;
  options?: QuestionOption[];
  required: boolean;
  // Only show this question if a previous answer matches (simple skip-logic support)
  showIf?: { questionId: string; equals: string };
}

export const NAVIGATOR_QUESTIONS: NavigatorQuestion[] = [
  {
    id: "organisation_name",
    type: "text",
    prompt: "What is the name of your organisation?",
    helpText: "This is how we'll identify you in our records.",
    required: true,
  },
  {
    id: "org_type",
    type: "single",
    prompt: "What type of organisation are you?",
    required: true,
    options: [
      { value: "hospital", label: "Hospital / Clinical institution" },
      { value: "university", label: "University / Research institution" },
      { value: "startup", label: "Startup / Company" },
      { value: "pharma", label: "Pharma / Biotech" },
      { value: "ngo", label: "NGO / Foundation" },
      { value: "government", label: "Government body" },
    ],
  },
  {
    id: "region",
    type: "text",
    prompt: "Which country or region do you primarily operate in?",
    helpText: "This affects eligibility for region-specific schemes (e.g. EU or Italy-specific incentives).",
    required: true,
  },
  {
    id: "stage",
    type: "single",
    prompt: "What stage are you at?",
    required: true,
    options: [
      { value: "idea", label: "Idea / pre-seed" },
      { value: "early", label: "Early-stage / piloting" },
      { value: "established", label: "Established / scaling" },
    ],
  },
  {
    id: "interest_areas",
    type: "multi",
    prompt: "Which areas are you most interested in?",
    required: true,
    options: [
      { value: "digital_twin", label: "Digital Twin Therapeutics" },
      { value: "synbio", label: "Synthetic Biology & Cell Engineering" },
      { value: "biomanufacturing", label: "Automated Biomanufacturing" },
      { value: "multiomics", label: "Multi-Omics Analytics" },
      { value: "other", label: "Other / not sure yet" },
    ],
  },
  {
    id: "existing_support",
    type: "single",
    prompt: "Do you currently hold any grants or tax incentives?",
    required: true,
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
  {
    id: "existing_support_detail",
    type: "text",
    prompt: "Which one(s)? (so we don't recommend something you already have)",
    required: false,
    showIf: { questionId: "existing_support", equals: "yes" },
  },
  {
    id: "goals",
    type: "multi",
    prompt: "What are you hoping to get from a partnership with bioERGOtech?",
    required: true,
    options: [
      { value: "funding", label: "Funding access" },
      { value: "clinical_validation", label: "Clinical validation" },
      { value: "technical_collab", label: "Technical collaboration" },
      { value: "talent_training", label: "Talent / training" },
    ],
  },
  {
    id: "email",
    type: "email",
    prompt: "Where should we send your results?",
    helpText: "We'll show your results on-screen and email you a copy.",
    required: true,
  },
];
