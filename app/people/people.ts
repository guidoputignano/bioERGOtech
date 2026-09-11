/**
 * Principal investigator pages.
 *
 * One entry per person with a research record of their own. This is
 * deliberately not the same list as the Leadership grid on /about-us: a board
 * member is not a principal investigator, and conflating the two is how a
 * research page stops meaning anything.
 *
 * Everything in an entry has to be checkable. Affiliations come from published
 * author lines, publications come from lib/publications.ts, and nothing is
 * written here that a reader could not confirm from a paper or a register.
 */
export type Person = {
  slug: string;
  name: string;
  role: string;
  photo: string;
  /** Institutional affiliations, as they appear on published work. */
  affiliations: string[];
  /** One line for the index card. */
  summary: string;
  /** What the person works on, in their own voice. */
  focus: string[];
  email?: string;
};

export const PEOPLE: Person[] = [
  {
    slug: "guido-putignano",
    name: "Guido Putignano",
    role: "President and Founder",
    photo: "/assets/images/About-us/Guido-Putignano.webp",
    affiliations: [
      "bioERGOtech Foundation, Taranto",
      "Department of Biosystems Science and Engineering, ETH Zurich, Basel",
    ],
    summary:
      "Computational biology, from engineered cell therapies to population studies on administrative health data.",
    focus: [
      "I work on where computation can stand in for an experiment that is too slow, too small or too expensive to run.",
      "That has meant mathematical models of engineered cell therapies, in vitro models that treat sex as a biological variable rather than a footnote, and population studies built on hospital administrative data. The through line is the same question each time: what can still be learned when you cannot simply run the study you would like to run.",
      "At the Foundation that question turns into software. An agent is worth building when a clinician, a pharmacist or a discovery scientist already has a problem, owns it, and could not solve it with the time and the data in front of them.",
    ],
    email: "guido.putignano@bioergotech.org",
  },
  {
    slug: "daniela-marotto",
    name: "Daniela Marotto",
    role: "Advisory Board, rheumatology",
    photo: "/assets/images/About-us/Daniela-Marotto.webp",
    affiliations: [
      "Azienda Socio-Sanitaria Locale della Gallura, Olbia",
      "Advisory Board, bioERGOtech Foundation",
    ],
    summary:
      "Rheumatology, and the question of what else a patient with an inflammatory disease is carrying.",
    // Third person, and strictly what the published paper supports. See the
    // note in the PR: her own page text is hers to approve before it is public.
    focus: [
      "A rheumatologist whose work sits where rheumatology meets oncology.",
      "She is co-senior author on the first nationwide Italian study of cancer risk in immune-mediated inflammatory disease, which followed 356,022 patients across five years of hospital discharge records and found the association strongest in the first year after diagnosis. The study was conducted on behalf of the Onco-Rheumatology Study Group of the CREI Executive Board.",
      "That temporal pattern is the part that matters clinically: it is difficult to explain by medication, which accumulates, and easier to explain by inflammation, which early treatment reduces. The paper states it as a hypothesis, and testing it is the work that follows.",
    ],
  },
];

export const personBySlug = (slug: string) =>
  PEOPLE.find((p) => p.slug === slug);
