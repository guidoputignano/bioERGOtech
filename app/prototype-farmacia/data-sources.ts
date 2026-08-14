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
    owner: "Hospital Pharmacy Directorate",
    cadence: "monthly",
    feedsModules: ["M1", "M4"],
  },
  {
    id: "file-f-flow",
    name: "File F Flow",
    type: "internal",
    owner: "ASL statutory reporting officer",
    cadence: "monthly",
    feedsModules: ["M3"],
  },
  {
    id: "aifa-liste-trasparenza",
    name: "AIFA — Liste di Trasparenza",
    type: "external-public",
    owner: "AIFA",
    cadence: "monthly",
    feedsModules: ["M2"],
    url: "https://www.aifa.gov.it",
    note: "Retrospective: lists molecules that already have an equivalent/biosimilar, plus reference pricing. Not forward-looking.",
  },
  {
    id: "egualia-loe-generics",
    name: "Egualia — Scadenze Brevettuali (generics)",
    type: "external-public",
    owner: "Egualia",
    cadence: "periodic",
    feedsModules: ["M2"],
    url: "https://www.egualia.it",
    note: "Forward-looking patent/exclusivity expiry calendar for generics. Coverage depth not yet verified, diligence item.",
  },
  {
    id: "egualia-loe-biosimilars",
    name: "Egualia — Scadenze Brevettuali (biosimilars)",
    type: "external-public",
    owner: "Egualia",
    cadence: "periodic",
    feedsModules: ["M2"],
    url: "https://www.egualia.it",
    note: "Forward-looking patent/exclusivity expiry calendar for biosimilars.",
  },
  {
    id: "aifa-carenze",
    name: "AIFA — Lista dei farmaci temporaneamente carenti",
    type: "external-public",
    owner: "AIFA",
    cadence: "updated regularly",
    feedsModules: ["M4"],
    url: "https://www.aifa.gov.it",
    note: "National medicine shortage list.",
  },
  {
    id: "who-atc-ddd",
    name: "WHO ATC/DDD classification",
    type: "external-public",
    owner: "WHO Collaborating Centre for Drug Statistics Methodology",
    cadence: "static",
    feedsModules: ["M1", "M2", "M3", "M4", "M6"],
    url: "https://www.whocc.no",
    note: "Underlies the ATC taxonomy used across all modules.",
  },
  {
    id: "farmadati-italia",
    name: "Farmadati Italia",
    type: "external-licensed",
    owner: "Farmadati Italia",
    cadence: "TBC",
    feedsModules: ["M1", "M4"],
    note: "Drug master-data reference (AIC codes, packaging, active-substance mapping) needed to cross-reference ASL product codes. Licensing terms not yet confirmed, open item.",
  },
  {
    id: "iqvia-loe-calendar",
    name: "Commercial LOE calendar (e.g. IQVIA)",
    type: "external-licensed",
    owner: "IQVIA (or equivalent commercial provider)",
    cadence: "TBC",
    feedsModules: ["M2"],
    note: "Fallback/supplement if Egualia's coverage proves too thin. Cost not yet evaluated, open item.",
  },
];
