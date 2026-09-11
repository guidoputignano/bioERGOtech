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
    approach: string[];
    /** Slug in app/people/people.ts. */
    piSlug: string;
    /** A figure from the area's own published work. */
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
      approach: [
        "Models come first, because they are cheap to be wrong in. A mathematical model of an engineered cell therapy can be falsified in an afternoon. The experiment it replaces costs months.",
        "So the order is fixed: state the design question, build the smallest model that could answer it, try to break the model, and only then commit to building. What survives that sequence is what gets made.",
        "The same discipline applies to what we claim. A model that has not been tested against data is a hypothesis, and it is described as one.",
      ],
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
    },
  },
];

export const areaById = (id: string) => AREAS.find((a) => a.id === id);
export const areasWithPages = () => AREAS.filter((a) => a.page);
