/**
 * The Foundation's peer-reviewed output, in one place.
 *
 * The homepage, the About page and every principal investigator page read from
 * here. A citation duplicated across three files drifts, and a wrong DOI is
 * worse than no DOI: it is the one claim on the site a reader can falsify in
 * ten seconds.
 */
export type Publication = {
  venue: string;
  year: string;
  title: string;
  authors: string;
  doi: string;
  href: string;
  /** Foundation people who are on the author line, by slug. */
  people: string[];
};

export const PUBLICATIONS: Publication[] = [
  {
    venue: "Nature Reviews Bioengineering",
    year: "2026",
    title: "Modelling sex differences of neurological disorders in vitro",
    authors:
      "Castro-Aldrete L, Einsiedler M, ... Putignano G, ... Santuccione Chadha A",
    doi: "10.1038/s44222-025-00355-w",
    href: "https://doi.org/10.1038/s44222-025-00355-w",
    people: ["guido-putignano"],
  },
  {
    venue: "Cancers",
    year: "2026",
    title:
      "Cancer Association in Patients with Immune-Mediated Inflammatory Diseases: A Five-Year Nationwide Italian Cohort Study",
    authors: "Giordani B, Pirtoli L, Putignano G, Giordano A, Marotto D, Baglio G",
    doi: "10.3390/cancers18061027",
    href: "https://doi.org/10.3390/cancers18061027",
    people: ["guido-putignano"],
  },
  {
    venue: "Frontiers in Immunology",
    year: "2025",
    title:
      "Mathematical models and computational approaches in CAR-T therapeutics",
    authors:
      "Putignano G, Ruiperez-Campillo S, Yuan Z, Millet J, Guerrero-Aspizua S",
    doi: "10.3389/fimmu.2025.1581210",
    href: "https://doi.org/10.3389/fimmu.2025.1581210",
    people: ["guido-putignano"],
  },
];

export const publicationsFor = (slug: string) =>
  PUBLICATIONS.filter((p) => p.people.includes(slug));
