/**
 * Research programmes, as case studies.
 *
 * One source for the homepage cards, /programmes, /programmes/<slug> and the
 * software subset at /agents. A programme described in two places drifts, and
 * the fields that matter most here are the ones a reader would never notice
 * were missing.
 *
 * Two of them are deliberately NOT optional. `doesNotDo` and `notEstablished`
 * are required by the type, so a programme that omits either fails the build
 * rather than shipping a page that reads as a finished claim. That is the
 * cheapest possible enforcement: a required field on a typed object is checked
 * before anything reaches a reader, which a form validation is not.
 *
 * Anything a reader cannot check does not belong in here. No savings figures,
 * no partner names without a written agreement, no funding claim without a
 * public identifier behind it.
 */

export type Stage =
  | "Published"
  | "Completed"
  | "Awaiting approval"
  | "Prototype"
  | "In progress"
  | "In design";

export type Programme = {
  slug: string;
  /** Card and page title. */
  title: string;
  /** One line under the title: discipline and artefact kind. */
  field: string;
  stage: Stage;
  /** Card blurb. Kept in step with the homepage wording. */
  summary: string;
  /** True when the artefact is software. /agents lists exactly these. */
  isSoftware: boolean;
  /** Required on every software artefact, printed verbatim wherever it appears. */
  regulatoryStatus?: string;
  setting: string[];
  whatWeDid: string[];
  /** A pulled-out claim, where the claim is the contribution. */
  pullQuote?: string;
  whatExistsNow: string[];
  /** Results table. Every row must be in a cited source. */
  findings?: { label: string; value: string }[];
  /** Required. The scope boundary, stated as a boundary. */
  doesNotDo: string[];
  /** Required. What has not been measured, next to what has. */
  notEstablished: string[];
  /** Funding, ethics and legal basis, where a reader will look for it. */
  governance?: string[];
  whereNext: string[];
  /** The research ask. A collaboration ask, never a sales ask. */
  lookingFor?: string;
  /** DOI of the paper in lib/publications.ts, when the work is published. */
  publicationDoi?: string;
  /** People with a page, by slug in app/people/people.ts. */
  people?: string[];
};

export const PROGRAMMES: Programme[] = [
  {
    slug: "cancer-risk-after-inflammatory-disease",
    title: "Cancer risk after an inflammatory disease diagnosis",
    field: "Cohort study · oncology and rheumatology",
    stage: "Published",
    summary:
      "356,022 patients across five years of Italian hospital discharge records. Which cancers, how much more often, and when in the disease course.",
    isSoftware: false,
    setting: [
      "Rheumatologists have long suspected that patients with immune-mediated inflammatory disease carry a higher cancer risk. The suspicion had never been tested on Italian national data, so nobody could say how large the effect was, which cancers it involved, or when in the disease course it mattered.",
    ],
    whatWeDid: [
      "A nationwide retrospective cohort study on Italian Hospital Discharge Records. Adults hospitalised between 1 January and 31 December 2018, followed to 31 December 2023.",
      "The exposed group was patients with immune-mediated inflammatory disease, including rheumatoid arthritis and diffuse diseases of connective tissue. The unexposed group was patients admitted for injury and poisoning with no such history. Multivariable logistic regression, adjusted for demographics, geography, follow-up time and comorbidities.",
      "356,022 patients: 54,896 exposed, 301,126 unexposed.",
    ],
    whatExistsNow: [
      "A published, peer-reviewed result. Every figure in the table below is in the paper and checkable by anyone with the DOI.",
    ],
    findings: [
      { label: "Cancer association in the IMID group", value: "adjusted OR 1.32 (95% CI 1.27 to 1.38), p < 0.001" },
      { label: "Year one", value: "adjusted OR 1.83, p < 0.001" },
      { label: "From year five", value: "adjusted OR 1.20, p < 0.001" },
      { label: "Lung", value: "adjusted OR 1.74, p < 0.001" },
      { label: "Leukaemia and lymphoma", value: "adjusted OR 1.98, p < 0.001" },
      { label: "Bladder", value: "adjusted OR 1.48, p < 0.001" },
      { label: "Melanoma", value: "adjusted OR 1.48, p = 0.009" },
      { label: "Connective tissue disease vs rheumatoid arthritis", value: "OR 1.53 vs 1.20" },
    ],
    pullQuote:
      "The interesting result is the shape, not the headline. Risk is highest in the first year and falls year on year. That pattern is hard to explain by medication, which accumulates, and easier to explain by inflammation, which early treatment reduces. The paper states it as a hypothesis, which is the correct strength.",
    doesNotDo: [
      "It produces no individual risk score, and it cannot. The study used anonymised administrative records with no names, identifiers, addresses or telephone numbers.",
      "It is an association at population scale. It does not tell any clinician anything about any patient in front of them.",
    ],
    notEstablished: [
      "Causation.",
      "Whether the inflammation hypothesis is right.",
      "Whether early anti-inflammatory treatment actually lowers cancer incidence, which would need a different study design entirely.",
      "Whether the pattern holds outside hospitalised populations, since the cohort is built from discharge records.",
    ],
    governance: [
      "Funded by Ricerca Corrente from the Italian Ministry of Health, allocated to AGENAS, approved by the Technical Health Committee on 3 December 2025.",
      "Ethics committee approval was not required and informed consent was waived, because the study used anonymised administrative data under the AGENAS monitoring mandate in the Ministerial Decree of 19 December 2022, Article 4.",
      "Data are available from AGENAS on request.",
    ],
    whereNext: [
      "The paper's own answer: find inflammatory biomarkers that predict which patients are in the high-risk window. The temporal pattern makes that a sharper question than it looks, because whatever drives the effect is strongest in the first year and fades.",
    ],
    lookingFor:
      "Co-investigators with access to biomarker data on an immune-mediated inflammatory disease cohort.",
    publicationDoi: "10.3390/cancers18061027",
    people: ["guido-putignano", "daniela-marotto"],
  },

  {
    slug: "which-subgroups-carry-which-risk",
    title: "Which subgroups carry which cancer risk",
    field: "Algorithm · population oncology",
    stage: "Completed",
    summary:
      "Genotype, lifestyle and socioeconomic data read together at population level. One of the algorithms delivered under CODIGE. Population associations, never an individual risk score.",
    isSoftware: true,
    regulatoryStatus:
      "Research use. Population-level analysis. Not a medical device, and it produces no output about any individual.",
    setting: [
      "Whether someone develops a particular cancer is shaped by their genetics, how they live, and the circumstances they live in. Those three things are recorded in three different systems that were never designed to be read together, so the question of which subgroups carry which risk is rarely asked at population scale.",
    ],
    whatWeDid: [
      "Within CODIGE, a project funded under the AGE-IT extended partnership (PNRR M4C2, project code PE00000015), we developed one of the algorithms in the delivery. It links genotype, lifestyle and socioeconomic variables to cancer subgroup incidence at population level.",
    ],
    pullQuote:
      "That claim is deliberately narrow. It says what we built. It does not say the project was ours, and it invites a reader to check PE00000015, which identifies AGE-IT publicly.",
    whatExistsNow: [
      "A delivered algorithm within a completed project. There is no published evaluation of it.",
    ],
    doesNotDo: [
      "No individual risk score. No screening. No eligibility. No output that resolves to one person.",
      "This is the same boundary as the cohort study above, and for the same reason: a population-level association is a research finding, while individual stratification is a clinical claim carrying an entirely different regulatory and data-protection weight.",
    ],
    notEstablished: [
      "Whether the associations replicate outside the cohort they were built on.",
      "Whether any of them changes a decision anywhere.",
      "There is no published evaluation.",
    ],
    governance: [
      "Genotype combined with socioeconomic variables on identifiable people is Article 9 special-category processing, and at population scale it is squarely Article 35(3)(b) territory, which requires a data protection impact assessment.",
      "The legal basis sat with whoever held the data, not with us. Whoever that is should be the party describing it.",
    ],
    whereNext: [
      "The associations were built on one cohort and have not been tested anywhere else, which is the first thing a reader should ask about work of this kind.",
    ],
    lookingFor:
      "A second cohort to replicate the associations on, and co-authors to publish the result either way. A failed replication is a publishable finding here, and saying so up front is part of the ask.",
    people: ["guido-putignano"],
  },

  {
    slug: "evidence-brief-for-a-tumour-board",
    title: "An agent that prepares the evidence for a tumour board",
    field: "Agent · clinical decision support",
    stage: "Awaiting approval",
    summary:
      "A clinician enters a case, the agent searches published AIOM and ESMO guidance and returns one page the panel can read in the room. Built with an Italian local health authority. The pilot is waiting on regional approval and the agent is not in use in care.",
    isSoftware: true,
    regulatoryStatus:
      "Research use. Not in use in care. Treated as within the scope of EU MDR Annex VIII Rule 11, not CE marked, and no conformity assessment has been carried out.",
    setting: [
      "A tumour board has forty minutes and eleven cases. For each one, somebody has to have gone back to the guideline. Usually that somebody is whoever had the evening free.",
    ],
    whatWeDid: [
      "Built a working prototype with an Italian local health authority. A clinician enters a case: age, sex, diagnosis, stage, ECOG, comorbidities, histology, what has been done and what is missing. The system searches published AIOM and ESMO guidance and returns a formatted document for the Gruppo Interdisciplinare Cure to read in the room.",
      "The partner is not named here. There is no written agreement yet, and naming a public authority without one asserts something they would have to stand behind.",
    ],
    whatExistsNow: [
      "A prototype. The pilot is waiting on regional approval, and the agent is not in use in care.",
      "The public interface and its backend relay have been taken offline while that approval is outstanding. They were removed rather than left reachable behind a disclaimer, because a disclaimer does not change a stated intended purpose, and MDR Article 2(12) makes a website part of that statement.",
    ],
    pullQuote:
      "The output is organised into sections including a proposal and a recommendation, with investigations graded by necessity, over a signature line for a Dirigente Medico. That is patient-specific information used in a therapeutic decision. Rule 11 classifies software providing information used to take decisions with diagnostic or therapeutic purposes as at least class IIa, and a clinician reviewing the output afterwards does not remove it from scope. So we treat it as in scope, and it does not go into care while that assessment is open.",
    doesNotDo: [
      "It is not in use and it has never informed a clinical decision.",
      "It is not CE marked, it has no conformity assessment, and it is not a medical device on the market.",
    ],
    notEstablished: [
      "Whether its guideline retrieval was complete or correct.",
      "Whether it changed what a panel discussed.",
      "Whether it saved preparation time.",
      "Concordance with an unaided panel.",
      "None of it was measured. The honest reading is that the regulatory question arrived before the evaluation question did.",
    ],
    whereNext: [
      "The open research question was never answered, because the regulatory question arrived first: does a structured evidence brief change what a multidisciplinary panel discusses, or how long it takes to get there?",
      "Nobody has measured that, and answering it does not require deploying anything. Briefs can be prepared offline and sessions compared, which keeps the study entirely outside the question of what a product would need.",
      "If the answer turns out to be yes, then what to build becomes a live question, and that is a regulatory programme with a budget rather than a prototype. That is a later problem.",
    ],
    lookingFor:
      "Co-investigators to design that study, and a second tumour board willing to take part.",
    people: ["guido-putignano"],
  },

  {
    slug: "the-interval-between-visits",
    title: "An agent for the gap between rheumatology visits",
    field: "Agent · rheumatology",
    stage: "In design",
    summary:
      "Months pass between outpatient visits, and every visit begins from a reconstruction by memory. What is worth capturing in between, and does capturing it change the next one.",
    isSoftware: true,
    regulatoryStatus:
      "Design stage. Nothing is deployed. No symptom threshold, alert or flag, which is a design decision rather than an omission.",
    setting: [
      "Months pass between two rheumatology visits, and in that interval the system stops observing the patient. Every visit begins from a reconstruction by memory.",
      "The cohort study above is the reason this matters more than convenience. If cancer risk in these patients is highest in the first year after diagnosis and falls thereafter, then the first year is exactly the period in which the system currently observes them four times.",
    ],
    whatWeDid: ["Designed an interface for capturing symptoms between visits."],
    whatExistsNow: [
      "An interface prototype. No backend, no data collection, no participants, and no clinical site agreement.",
    ],
    doesNotDo: [
      "Nothing yet, and specifically: no symptom threshold, no alert, no flag.",
      "The moment software tells anyone to act on a change in a patient's symptoms it is monitoring software under Rule 11. That is a design-phase decision, made now rather than after a pilot.",
    ],
    notEstablished: ["Everything. There is nothing to evaluate."],
    whereNext: [
      "Two questions come before anything gets built, and they are the interesting part: what is actually worth capturing between visits, and does capturing it change what happens at the next one?",
      "The first is a design question a clinician answers, not an engineer. The second is a study.",
    ],
    lookingFor:
      "A rheumatology service to answer the first question with us, and later to host the second. There is no site agreement in place.",
    people: ["guido-putignano", "daniela-marotto"],
  },

  {
    slug: "hospital-medicines-spending",
    title: "A compass for hospital medicines spending",
    field: "Agent · health system economics",
    stage: "Prototype",
    summary:
      "A hospital already holds every figure it needs to see where value is leaking. It is not organised in a way that points anywhere. This reads the flows an authority already produces and points at the molecule, the channel and the ward where the money is going.",
    isSoftware: true,
    regulatoryStatus:
      "Research use. Management analytics. No patient-level output, no prescribing access, and no recommendation about any medicine for any patient.",
    setting: [
      "An Italian health authority already holds every figure it needs to see that a biosimilar has been available for eight months and it is still buying the originator. It sees it the following year, in a report.",
      "The problem is not missing data. It is that the data is not organised in a way that allows a decision while the financial year is still open.",
    ],
    whatWeDid: [
      "Built a read-only analytical layer over the pharmaceutical flows an authority already produces for other statutory obligations. Reconcile the totals against the balance sheet first, then normalise package prices to a comparable unit, then report.",
    ],
    pullQuote:
      "The tool does not generate the saving. A patent expiry generates the saving from loss of exclusivity, a clinician and a pharmacist generate the saving from a switch, a negotiated agreement generates a recovery. What a governance tool can defensibly cause is one thing only: a reduction in the delay with which the organisation reacts to an opportunity that already exists.",
    whatExistsNow: [
      "A working prototype, built and run against real expenditure records from Italian health authorities.",
      "No figures are published here. The record counts and expenditure totals sit in a commercial document, they are marked confidential there, and none of them is recomputable by a reader. The method is what is publishable, and it is the stronger asset anyway.",
    ],
    doesNotDo: [
      "It has no access to prescribing systems and produces no patient-level output. The minimum unit of aggregation is the dispensing structure.",
      "It makes no recommendation about any medicine for any patient. Clinical substitutability stays entirely with the pharmacist and the clinician.",
      "Biosimilar switching is a clinical decision, not a procurement one. If the tool ever touched switching, formulary preference or therapeutic substitution directly, the non-device framing would not hold.",
    ],
    notEstablished: [
      "Whether any authority actually acted faster.",
      "The reaction-time indicator is the thing that would prove the method, and it has not been measured on anybody.",
    ],
    whereNext: [
      "The attribution principle above is a testable hypothesis and it has not been tested: that making an already-existing opportunity visible shortens the time an organisation takes to act on it.",
      "That is a measurable claim about organisational behaviour, with a clean before-and-after design and an indicator a third party can verify.",
    ],
    lookingFor:
      "Research partners to test the hypothesis. This is a study, not a deployment: what it needs is a data-sharing agreement and an agreed baseline, not a procurement process.",
    people: ["guido-putignano"],
  },

  {
    slug: "cohorts-too-small-to-analyse",
    title: "A pipeline for patient groups too small to analyse",
    field: "Computational analysis · rare disease",
    stage: "In progress",
    summary:
      "When a disease affects a handful of people in a country, the statistics built for thousands stop working. We are testing what can still be learned from a cohort that small, starting with propionic acidemia in Saudi Arabia.",
    isSoftware: false,
    setting: [
      "Methods in population health assume enough people to average over. When a disease affects a handful of people in a country, the statistics built for thousands stop working, and the usual answer is that the question cannot be asked.",
    ],
    whatWeDid: [
      "Testing what can still be learned from a cohort that small, starting with propionic acidemia in Saudi Arabia.",
    ],
    whatExistsNow: [
      "Work in progress. There is no result yet and nothing has been published.",
    ],
    doesNotDo: [
      "It produces no diagnosis, no prognosis and no output about an individual patient.",
      "It is a methodological question about what small-cohort analysis can support, not a tool anyone uses in care.",
    ],
    notEstablished: [
      "Everything. No method has been validated, no result has been produced, and nothing has been peer reviewed.",
    ],
    whereNext: [
      "The question is which inferences a cohort of that size can actually support, and which ones only look supported because the method was borrowed from a larger population.",
    ],
    lookingFor:
      "Collaborators with rare disease cohorts, and statisticians interested in what is inferable at that scale.",
    people: ["guido-putignano"],
  },
];

export const programmeBySlug = (slug: string) =>
  PROGRAMMES.find((p) => p.slug === slug);

/** The software subset, which is what /agents lists. */
export const softwareProgrammes = () => PROGRAMMES.filter((p) => p.isSoftware);

export const STAGE_STYLE: Record<Stage, { bg: string; color: string }> = {
  Published: { bg: "#E1F5EE", color: "#0F6E56" },
  Completed: { bg: "#E1F5EE", color: "#0F6E56" },
  "Awaiting approval": { bg: "#FDF3E3", color: "#8A6212" },
  Prototype: { bg: "#E6F1FB", color: "#185FA5" },
  "In progress": { bg: "#E6F1FB", color: "#185FA5" },
  "In design": { bg: "#EEF1F5", color: "#5A6B7B" },
};
