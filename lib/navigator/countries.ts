// Canonical country list for the Navigator's region/country question.
// Base set reused from the existing country datalist in the member portal
// (app/member-portal/portal-dashboard.tsx, "country-list" datalist used for
// member/project location editing), extended with any EU member state not
// already present so that "EU"-scoped navigator_rules rows can always match.

export const COUNTRIES: string[] = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Australia", "Austria",
  "Belgium", "Brazil", "Bulgaria", "Canada", "Chile", "China", "Colombia",
  "Croatia", "Cyprus", "Czech Republic", "Denmark", "Egypt", "Estonia",
  "Ethiopia", "Finland", "France", "Germany", "Ghana", "Greece", "Hungary",
  "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Japan", "Jordan", "Kenya", "Kuwait", "Latvia", "Lebanon", "Lithuania",
  "Luxembourg", "Malaysia", "Malta", "Mexico", "Morocco", "Netherlands",
  "New Zealand", "Nigeria", "Norway", "Pakistan", "Peru", "Philippines",
  "Poland", "Portugal", "Qatar", "Romania", "Russia", "Saudi Arabia",
  "Senegal", "Singapore", "Slovakia", "Slovenia", "South Africa",
  "South Korea", "Spain", "Sweden", "Switzerland", "Tanzania", "Thailand",
  "Tunisia", "Turkey", "UAE", "Uganda", "Ukraine", "United Kingdom",
  "United States", "Vietnam",
];

// EU member states as of 2026 (27 members; UK is not included post-Brexit).
// Every one of these is guaranteed to be present in COUNTRIES above.
// Lower-cased for case-insensitive matching against the visitor's selection
// in lib/navigator/rules-engine.ts.
export const EU_MEMBER_STATES: string[] = [
  "austria", "belgium", "bulgaria", "croatia", "cyprus", "czech republic",
  "denmark", "estonia", "finland", "france", "germany", "greece", "hungary",
  "ireland", "italy", "latvia", "lithuania", "luxembourg", "malta",
  "netherlands", "poland", "portugal", "romania", "slovakia", "slovenia",
  "spain", "sweden",
];
