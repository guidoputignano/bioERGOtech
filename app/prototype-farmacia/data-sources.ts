export type DataSourceType = "internal" | "external-public" | "external-licensed";

export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  owner: string;
  cadence: string;
  feedsModules: string[];
  url?: string;
  note?: string;
}

// Structural reference only — documents intended data lineage for this
// prototype. No live integration, scraper, or scheduled job reads from
// any of these in the current build.
export const dataSources: DataSource[] = [
  {
    id: "asl-consumption-spend-extract",
    name: "ASL Consumption & Spend Extract",
    type: "internal",
    owner: "Hospital Pharmacy Directorate (per ASL)",
    cadence: "monthly",
    feedsModules: ["M1", "M4"],
    note: "Read-only, native export format, tied out against financial statements during onboarding.",
  },
  {
    id: "file-f-flow",
    name: "File F Flow",
    type: "internal",
    owner: "ASL statutory reporting officer",
    cadence: "monthly",
    feedsModules: ["M3"],
    note: "Mandatory reporting flow for drugs dispensed outside ordinary inpatient care.",
  },
  {
    id: "aifa-liste-trasparenza",
    name: "AIFA — Liste di Trasparenza",
    type: "external-public",
    owner: "AIFA",
    cadence: "monthly (verified)",
    feedsModules: ["M2"],
    note: "VERIFIED: real CSV/PDF/XLS, CC-BY. 'Confezione di riferimento' field is semi-structured (e.g. \"40 UNITA' 100 MG\") — helps solve the parsing gap for listed AICs. Retrospective, not forward-looking.",
  },
  {
    id: "egualia-scadenze-brevettuali",
    name: "Egualia — Scadenze Brevettuali",
    type: "external-public",
    owner: "Egualia",
    cadence: "annual report (verified)",
    feedsModules: ["M2"],
    note: "VERIFIED: narrative report, not a raw dataset. Sourced from UIBM + IQVIA. Egualia itself flags dates as 'theoretical' — Italy's patent-linkage rule means actual market entry can lag the nominal date.",
  },
  {
    id: "aifa-scadenza-monitoraggio",
    name: "AIFA — proprio monitoraggio scadenze brevettuali",
    type: "external-public",
    owner: "AIFA",
    cadence: "unknown",
    feedsModules: ["M2"],
    note: "NEW lead found during verification — AIFA's own patent-expiry monitoring, separate from Egualia. Format not yet confirmed — open item.",
  },
  {
    id: "aifa-carenti",
    name: "AIFA — Lista farmaci temporaneamente carenti",
    type: "external-public",
    owner: "AIFA",
    cadence: "near-continuous (verified)",
    feedsModules: ["M4"],
    note: "VERIFIED: real CSV, updated more often than assumed (two versions found 3 weeks apart). Fed by MA-holder self-reporting.",
  },
  {
    id: "who-atc-ddd",
    name: "WHO ATC/DDD Classification",
    type: "external-public",
    owner: "WHO Collaborating Centre",
    cadence: "static",
    feedsModules: ["M1", "M2", "M3", "M4", "M5", "M6"],
    note: "Underlies the taxonomy used across every module.",
  },
  {
    id: "farmadati",
    name: "Farmadati Italia",
    type: "external-licensed",
    owner: "Farmadati Italia",
    cadence: "monthly",
    feedsModules: ["M1", "M2", "M3", "M4", "M5", "M6"],
    note: "Drug master-data reference. Licensing terms not yet confirmed — open item.",
  },
  {
    id: "loe-commercial",
    name: "Commercial LOE Calendar (e.g. IQVIA)",
    type: "external-licensed",
    owner: "Commercial vendor",
    cadence: "periodic",
    feedsModules: ["M2"],
    note: "Fallback if the Egualia report's coverage proves too thin. Cost not yet evaluated — open item.",
  },
];
