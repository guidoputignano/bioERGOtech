/**
 * The Foundation's people, in one place.
 *
 * /about-us renders the full grids. /build-with-us shows, under each area it
 * works in, the people who work there. They had been two hand-maintained
 * arrays, which is how a person ends up with two different job titles on the
 * same site.
 *
 * This is not the same list as app/people/people.ts. That file holds principal
 * investigators, who have a research record and a page of their own. Being on
 * the team does not make someone a principal investigator.
 */
export type Member = {
  name: string;
  role: string;
  desc: string;
  img: string;
  /** Area ids from AREAS in app/build-with-us. Optional. */
  areas?: string[];
  /** Set only for people with a principal investigator page. */
  href?: string;
};

export const TEAM: Member[] = [
  {
    name: "Guido Putignano",
    role: "President",
    desc: "Specialized in computational biology, with experience in engineering and AI-driven biomedical solutions.",
    img: "/assets/images/About-us/Guido-Putignano.webp",
    href: "/people/guido-putignano",
  },
  {
    name: "Mimma Leone",
    role: "Board Member",
    desc: "Legal expert and entrepreneur focused on advancing educational and university projects.",
    img: "/assets/images/About-us/Mimma-Leone.webp",
  },
  {
    name: "Carmine Pisano",
    role: "Board Member",
    desc: "Expert in public administration and urban development, specializing in digital transformation.",
    img: "/assets/images/About-us/Carmine-Pisano.webp",
  },
  {
    name: "Giacomo Ferrazzini",
    role: "Scientific Projects Lead",
    desc: "Medical student at ETH Zurich and USI, combining advanced medical training with leadership in health science initiatives.",
    img: "/assets/images/About-us/Giacomo-Ferrazzini.webp",
  },
  {
    name: "Alessia Soru",
    role: "Scientific Projects Lead",
    desc: "PhD student in Oncology, Hematology and Pathology at the University of Bologna, and Board Member of Women&Tech® ETS.",
    img: "/assets/images/About-us/Alessia-Soru.webp",
    areas: ["biotech-innovations"],
  },
  {
    name: "Saria Miccoli",
    role: "Communication Lead",
    desc: "Experienced designer who shapes the Foundation's visual identity and communications.",
    img: "/assets/images/About-us/Saria-Miccoli.webp",
  },
  {
    name: "Olufemi Olusola",
    role: "Scientific Projects Lead",
    desc: "Biostatistician working at the intersection of agentic AI, clinical data, and digital twin therapeutics.",
    img: "/assets/images/About-us/Olufemi-Olusola.webp",
    areas: ["biotech-innovations"],
  },
  {
    name: "Roberto Russo",
    role: "Student Ambassador",
    desc: "High school student, working with the Foundation's operational team.",
    img: "/assets/images/About-us/Roberto-Russo.jpeg",
    areas: ["biotech-innovations"],
  },
  {
    name: "Luigi Fantini",
    role: "Strategy Lead",
    desc: "Sales and outreach specialist who has built a career on connecting with people and reaching new markets.",
    img: "/assets/images/About-us/Luigi-Fantini.webp",
  },
  {
    name: "Oscar Carrisi",
    role: "Strategy Lead",
    desc: "CEO at Priver and a strategy expert focused on growth and market positioning.",
    img: "/assets/images/About-us/Oscar-Carrisi.webp",
  },
  {
    name: "Margherita Basile",
    role: "Lawyer",
    desc: "Lawyer advising the Foundation on governance, contracts, and regulatory compliance.",
    img: "/assets/images/About-us/Margherita-Basile.webp",
  },
  {
    name: "Mario Tagarelli",
    role: "Auditor",
    desc: "Career auditor responsible for the Foundation's financial oversight and compliance.",
    img: "/assets/images/About-us/Mario-Tagarelli.webp",
  },
];

export const ADVISORS: Member[] = [
  {
    name: "Daniela Marotto",
    role: "Doctor",
    desc: "Rheumatologist and leader in Italian health science, recognized for her commitment to multidisciplinary care.",
    img: "/assets/images/About-us/Daniela-Marotto.webp",
  },
  {
    name: "Pasquale Persico",
    role: "Market Access",
    desc: "Market access and pharma strategy expertise at Gilead Sciences, covering regulatory and reimbursement pathways.",
    img: "/assets/images/About-us/Pasquale-Persico.webp",
  },
  {
    name: "Roberto De Ponti",
    role: "Investor",
    desc: "Managing Director and General Partner at 3B Future Health Fund, a healthcare and biotech venture fund investing in pharmaceuticals and therapeutics at seed and Series A stages.",
    img: "/assets/images/About-us/Roberto-De-Ponti.webp",
  },
  {
    name: "Domenico Amalfitano",
    role: "Policy",
    desc: "Politician working at the intersection of complex systems and society.",
    img: "/assets/images/About-us/Domenico-Amalfitano.webp",
  },
];

export const teamForArea = (areaId: string) =>
  TEAM.filter((m) => m.areas?.includes(areaId));
