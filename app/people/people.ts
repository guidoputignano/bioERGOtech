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
];

export const personBySlug = (slug: string) =>
  PEOPLE.find((p) => p.slug === slug);
