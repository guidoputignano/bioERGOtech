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
    },
  },
];

export const areaById = (id: string) => AREAS.find((a) => a.id === id);
export const areasWithPages = () => AREAS.filter((a) => a.page);
