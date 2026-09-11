/**
 * Areas the Foundation works in.
 *
 * An area with a `page` has a page of its own at /areas/<id>: what it works on,
 * how it works, its principal investigator and the people in it. An area
 * without one renders as a plain card on /build-with-us and links nowhere,
 * which is the honest state until there is something to read.
 *
 * Members are attached from the other side, in lib/team.ts, so adding somebody
 * to an area is one field on the person rather than an edit in two files.
 */
export type Area = {
  id: string;
  label: string;
  icon: string;
  page?: {
    /** One line, under the title. */
    lead: string;
    focus: string[];
    /** Model families this area works with, and what each is good for.
        Concrete beats a statement of philosophy: a reader wants to know what
        we run, not what we believe about running it. */
    methods: { name: string; useFor: string }[];
    methodsNote: string;
    /** Slug in app/people/people.ts. */
    piSlug: string;
    /** Figures from the area's own published work. */
    figure?: {
      src: string;
      width: number;
      height: number;
      alt: string;
      caption: string;
      /** Attribution. Reusing our own CC BY figure still gets a credit line. */
      credit: string;
      creditHref: string;
    };
    methodsFigure?: {
      src: string;
      width: number;
      height: number;
      alt: string;
      caption: string;
      credit: string;
      creditHref: string;
    };
  };
};

export const AREAS: Area[] = [
  { id: "ai-diagnostics", label: "AI-Powered Diagnostics", icon: "fa-laptop-medical" },
  { id: "therapeutics", label: "Therapeutic Technologies", icon: "fa-dna" },
  { id: "digital-health", label: "Digital Health Platforms", icon: "fa-mobile-alt" },
  { id: "devices-robotics", label: "Medical Devices & Robotics", icon: "fa-robot" },
  {
    id: "biotech-innovations",
    label: "Biotech Innovations",
    icon: "fa-flask",
    page: {
      lead: "Engineered biological systems, and the computational work that has to happen before anything is built.",
      focus: [
        "The question this group works on is which parts of a biological design can be settled in a model, and which still have to be settled at a bench.",
        "That covers engineered cell therapies, where the behaviour of a construct can be reasoned about mathematically long before it exists; digital twin approaches, where a model stands in for a system that cannot be observed directly; and the multi-omic and clinical data that tell you whether the model resembled anything real.",
      ],
      methods: [
        {
          name: "Ordinary differential equations",
          useFor: "Signalling pathways and cell population dynamics, where the mechanism matters more than the pattern, and where a parameter has a meaning you can argue about.",
        },
        {
          name: "Agent-based models",
          useFor: "Spatial interactions between a tumour and an immune system. Behaviour that emerges from many local rules rather than from one equation.",
        },
        {
          name: "Machine learning",
          useFor: "Complex patterns in data too large to read. Strong at prediction, weak at telling you why, which is why it is one method here and not the method.",
        },
        {
          name: "Bayesian methods",
          useFor: "Prediction that carries its own uncertainty, and population parameters estimated from small or uneven data. The method of choice when the honest answer is a range.",
        },
        {
          name: "Control theory",
          useFor: "Feedback systems, and asking what a therapy should do next given what it has done so far.",
        },
        {
          name: "Sensitivity analysis",
          useFor: "Which parameters actually move the result. Run first, because it tells you which of the others are worth the effort.",
        },
      ],
      methodsNote:
        "No method is right for every question, and picking the wrong one wastes the study rather than the afternoon. The matrix below is our own published mapping of model families to the kinds of question each can answer.",
      piSlug: "guido-putignano",
      figure: {
        src: "/assets/images/Research/car-t-modelling.jpg",
        width: 2563,
        height: 1236,
        alt: "A six stage map of where modelling enters CAR-T cell therapy, from antigen receptors and treatment specificity through combination therapy, time and dosage, cell dynamics and treatment efficacy, running from cancer to remission.",
        caption:
          "Where a model can carry weight in CAR-T cell therapy, stage by stage, from the receptor to the response. Each stage is a place where a question can be asked of a model before it is asked of a patient.",
        credit: "Putignano G et al., Frontiers in Immunology 2025. CC BY.",
        creditHref: "https://doi.org/10.3389/fimmu.2025.1581210",
      },
      methodsFigure: {
        src: "/assets/images/Research/model-selection-matrix.jpg",
        width: 2566,
        height: 1926,
        alt: "A matrix of six model families against four research question types: mechanistic understanding, outcome prediction, parameter estimation and system optimisation, each cell rated for how well that model family suits that kind of question.",
        caption:
          "Six model families against four kinds of research question. Reading a row tells you what a method is for. Reading a column tells you which method to reach for.",
        credit: "Putignano G et al., Frontiers in Immunology 2025. CC BY.",
        creditHref: "https://doi.org/10.3389/fimmu.2025.1581210",
      },
    },
  },
];

export const areaById = (id: string) => AREAS.find((a) => a.id === id);
export const areasWithPages = () => AREAS.filter((a) => a.page);
