import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  AlignmentType, BorderStyle, Document, LevelFormat, Packer,
  Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType,
} from "docx";

const getDB = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

interface MoUContact {
  id: string;
  name: string;
  country: string | null;
  type: string | null;
  city: string | null;
  field_of_interest: string | null;
  contact_person: string | null;
  email: string | null;
  category: string | null;
}

function detectTemplateKey(contact: MoUContact): string {
  const cat = ((contact.category || contact.type || "")).toLowerCase();
  if (cat.includes("universit") || cat.includes("college") || cat.includes("faculty")) return "university";
  if (cat.includes("hospital") || cat.includes("clinic") || cat.includes("chu") || cat.includes("clcc") || cat.includes("archet")) return "hospital";
  if (cat.includes("patient")) return "patient_association";
  if (cat.includes("medical") || cat.includes("society") || cat.includes("order")) return "medical_association";
  return "research_centre";
}

// docx imports are at the top of the file
/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Colour constants ────────────────────────────────────────
const DARK_BLUE = "003366";
const MID_GRAY  = "646464";
const LT_GRAY   = "E6E6E6";

// A4 with 3 cm margins (1701 DXA)
const PAGE_W = 11906;
const MARGIN = 1701;
const CONTENT_W = PAGE_W - 2 * MARGIN; // 8504

// ── Text helpers ────────────────────────────────────────────
const R = (text: string, opts: Record<string, unknown> = {}) =>
  new TextRun({ text, font: "Times New Roman", size: 24, ...opts });

const RBlue = (text: string, bold = false) =>
  R(text, { color: DARK_BLUE, bold });

const RGray = (text: string) => R(text, { color: MID_GRAY });

const RBold = (text: string) => R(text, { bold: true });

const RBlank = (chars = 20): TextRun =>
  R("_".repeat(chars), { underline: {} });

const RFilled = (text: string) =>
  R(text, { underline: {} });

const P = (children: string | TextRun[], opts: Record<string, unknown> = {}) =>
  new Paragraph({
    children: Array.isArray(children) ? children : [R(children)],
    spacing: { after: 120 },
    ...opts,
  });

const PCentered = (children: string | TextRun[], opts: Record<string, unknown> = {}) =>
  P(children, { alignment: AlignmentType.CENTER, ...opts });

const PEmpty = (): Paragraph =>
  new Paragraph({ children: [R("")], spacing: { after: 80 } });

// Article heading with dark blue bottom border
const ArticleHeading = (num: number, title: string) =>
  new Paragraph({
    children: [RBlue(`Article ${num}.  ${title.toUpperCase()}`, true)],
    spacing: { before: 280, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: DARK_BLUE, space: 4 } },
  });

const SectionHeading = (title: string) =>
  new Paragraph({
    children: [RBlue(title.toUpperCase(), true)],
    spacing: { before: 280, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: DARK_BLUE, space: 4 } },
  });

// ── Horizontal rule (simulated with bottom border) ──────────
const HRule = (color = DARK_BLUE, size = 10): Paragraph =>
  new Paragraph({
    children: [],
    spacing: { before: 0, after: 0 },
    border: { bottom: { style: BorderStyle.SINGLE, size, color, space: 1 } },
  });

// ── Table helpers ───────────────────────────────────────────
const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

const TC = (children: string | Paragraph[], width: number, opts: Record<string, unknown> = {}) =>
  new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: Array.isArray(children) ? children : [P(children)],
    ...opts,
  });

const TCHeader = (text: string, width: number) =>
  new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    shading: { fill: LT_GRAY, type: ShadingType.CLEAR },
    children: [P([RBold(text)])],
  });

const TCNo = (children: string | Paragraph[], width: number, opts: Record<string, unknown> = {}) =>
  new TableCell({
    borders: noBorders,
    width: { size: width, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 0, right: 120 },
    children: Array.isArray(children) ? children : [P(children)],
    ...opts,
  });

// ── Numbered config refs ─────────────────────────────────────
const NUM_ALPHA   = "num-alpha";
const NUM_NUMERIC = "num-numeric";
const NUM_ROMAN   = "num-roman";
const NUM_BULLET  = "num-bullet";

const numberingConfig = [
  { reference: NUM_BULLET,
    levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022",
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
  { reference: NUM_ALPHA,
    levels: [{ level: 0, format: LevelFormat.LOWER_LETTER, text: "%1)",
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 900, hanging: 400 }, spacing: { after: 80 } } } }] },
  { reference: NUM_NUMERIC,
    levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.",
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 900, hanging: 400 }, spacing: { after: 80 } } } }] },
  { reference: NUM_ROMAN,
    levels: [{ level: 0, format: LevelFormat.LOWER_ROMAN, text: "(%1)",
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 1200, hanging: 480 }, spacing: { after: 60 } } } }] },
];

// ── List paragraph helpers ───────────────────────────────────
const Alpha = (children: string | TextRun[]) =>
  new Paragraph({
    numbering: { reference: NUM_ALPHA, level: 0 },
    children: Array.isArray(children) ? children : [R(children)],
    spacing: { after: 80 },
  });

const Num = (children: string | TextRun[]) =>
  new Paragraph({
    numbering: { reference: NUM_NUMERIC, level: 0 },
    children: Array.isArray(children) ? children : [R(children)],
    spacing: { after: 80 },
  });

const Roman = (children: string | TextRun[]) =>
  new Paragraph({
    numbering: { reference: NUM_ROMAN, level: 0 },
    children: Array.isArray(children) ? children : [R(children)],
    spacing: { after: 60 },
  });

const Bullet = (children: string | TextRun[]) =>
  new Paragraph({
    numbering: { reference: NUM_BULLET, level: 0 },
    children: Array.isArray(children) ? children : [R(children)],
    spacing: { after: 80 },
  });

// ════════════════════════════════════════════════════════════
// TEMPLATE CONFIGURATIONS
// ════════════════════════════════════════════════════════════

const TEMPLATES = {

  // ── UNIVERSITY ─────────────────────────────────────────────
  university: {
    subtitle: "for Academic and Research Collaboration",
    partyLabel: "the University",
    tableHeader: "University",
    preambleDesc: (_field?: string) => [
      R("(hereinafter "), RBold('"the University"'), R("), established\n    under the laws of "),
      RBlank(15), R(", with registered office at "), RBlank(20), R(",\n    represented by "), RBlank(16),
      R(", in his/her capacity as "), RBlank(15), R("."),
    ],
    preambleWhereas: (_field?: string) => [
      P([RBold("Whereas,"), R(" bioERGOtech is a foundation pursuing civic and social-utility purposes in the fields of scientific research, higher education, professional training, technological development, and healthcare innovation;")]),
      P([RBold("Whereas,"), R(" the University is an academic institution with recognised expertise in "), RBlank(20), R(", committed to education, research, and societal impact;")]),
      P([RBold("Whereas,"), R(" both Parties wish to establish a framework for cooperation based on principles of mutual benefit, reciprocity, and respect for each other's autonomy and regulatory obligations;")]),
      P([RBold("Now, therefore,"), R(" the Parties agree as follows.")]),
    ],
    art1: (): Paragraph[] => [
      Alpha("promote joint scientific research and applied research projects;"),
      Alpha("support the mobility of researchers, faculty, and students between the two institutions;"),
      Alpha("develop joint educational activities, including courses, workshops, seminars, and summer/winter schools;"),
      Alpha("facilitate co-supervised doctoral and postdoctoral research;"),
      Alpha("prepare and submit joint applications for competitive research funding at national, European, and international levels;"),
      Alpha("promote the exchange of scientific publications, data, and research methodologies;"),
      Alpha("explore technology transfer, valorisation of research results, and co-development of intellectual property where applicable;"),
      Alpha("organise joint public events, conferences, and dissemination activities."),
    ],
    art2: (): Paragraph[] => [
      Alpha("biomedical and biotechnological research;"),
      Alpha("digital health and health informatics;"),
      Alpha("artificial intelligence and data science applied to medicine;"),
      Alpha("clinical and translational research;"),
      Alpha("public health and health policy;"),
      Alpha("professional and continuing education in health-related disciplines;"),
      Alpha("interdisciplinary innovation at the intersection of technology and healthcare."),
    ],
    art3extra: (): Paragraph[] => [
      Num("Both Parties shall make reasonable efforts to provide their personnel with adequate time and resources to fulfil commitments undertaken within the framework of this MoU."),
    ],
    art7Title: "Student and Staff Mobility",
    art7: (): Paragraph[] => [
      Num("The Parties may facilitate the exchange of students, researchers, and academic staff for study visits, research stays, and teaching assignments."),
      Num("The conditions of each exchange, including duration, financial support, academic recognition, and applicable regulations, shall be agreed in writing in advance."),
      Num("The hosting institution shall provide exchanged persons with reasonable access to its facilities and academic resources, in accordance with its own internal regulations."),
      Num("Each Party remains responsible for its own personnel in matters of employment law, social security, and insurance."),
    ],
    art4extra: null as (() => Paragraph[]) | null,
    addendumTypes: ["Joint Research", "Student/Staff Exchange", "Educational Programme", "Grant Application", "Technology Transfer", "Conference/Event"],
    addendumFunding: ["No external funding", "Horizon Europe", "Erasmus+", "National grants", "Regional programmes"],
    addendumLeadLabel: "University Lead",
  },

  // ── RESEARCH CENTRE ────────────────────────────────────────
  research_centre: {
    subtitle: "for Scientific and Applied Research Collaboration",
    partyLabel: "the Research Center",
    tableHeader: "Research Center",
    preambleDesc: () => [
      R("(hereinafter "), RBold('"the Research Center"'), R("), established under the laws of "),
      RBlank(15), R(", with registered office at "), RBlank(20), R(",\n    represented by "), RBlank(16),
      R(", in his/her capacity as "), RBlank(15), R("."),
    ],
    preambleWhereas: (_field?: string) => [
      P([RBold("Whereas,"), R(" bioERGOtech is a foundation pursuing civic and social-utility purposes in the fields of scientific research, technological development, digital health, and healthcare innovation;")]),
      P([RBold("Whereas,"), R(" the Research Center is a recognised institution with established expertise in "), RBlank(20), R(", dedicated to scientific discovery, applied research, and knowledge transfer to benefit society;")]),
      P([RBold("Whereas,"), R(" both Parties wish to establish a framework for cooperation based on principles of mutual benefit, reciprocity, open science, and respect for each other's autonomy and regulatory obligations;")]),
      P([RBold("Now, therefore,"), R(" the Parties agree as follows.")]),
    ],
    art1: () => [
      Alpha("promote joint scientific and applied research projects in shared thematic areas;"),
      Alpha("support the mobility of researchers, postdoctoral fellows, and technical staff between the two institutions;"),
      Alpha("facilitate the co-supervision of doctoral and postdoctoral researchers, including co-tutoring arrangements for PhD candidates;"),
      Alpha("prepare and submit joint applications for competitive research funding at national, European, and international levels;"),
      Alpha("develop shared research infrastructures, methodologies, datasets, and computational resources where mutually beneficial;"),
      Alpha("promote the exchange of scientific publications, preprints, and research methodologies in the spirit of open science;"),
      Alpha("explore technology transfer, valorisation of research results, and co-development of intellectual property, including software and data tools;"),
      Alpha("organise joint scientific events, workshops, and dissemination activities addressing the research community and the wider public."),
    ],
    art2: () => [
      Alpha("biomedical and biotechnological research;"),
      Alpha("digital health, biomedical informatics, and health data science;"),
      Alpha("artificial intelligence and machine learning applied to medicine and biology;"),
      Alpha("translational and clinical research, from bench to bedside;"),
      Alpha("omics sciences, including genomics, proteomics, and metabolomics;"),
      Alpha("development and validation of diagnostic, therapeutic, or monitoring tools;"),
      Alpha("public health, epidemiology, and health systems research;"),
      Alpha("interdisciplinary innovation at the intersection of engineering, biology, and healthcare."),
    ],
    art3extra: () => [
      Num("Both Parties shall make reasonable efforts to provide their personnel with adequate time and resources to fulfil commitments undertaken within the framework of this MoU."),
      Num("Where activities involve the use of shared research infrastructure or equipment, conditions of access and liability shall be agreed in a dedicated addendum."),
    ],
    art7Title: "Researcher Mobility and Exchange",
    art7: () => [
      Num("The Parties may facilitate the exchange of researchers, postdoctoral fellows, and technical staff for research stays, joint experiments, and scientific training visits."),
      Num("Co-tutoring arrangements for doctoral candidates may be established, whereby a researcher enrolled in a PhD programme at a partner university is supervised by qualified personnel from both the Research Center and bioERGOtech, under a dedicated addendum specifying academic and administrative terms."),
      Num("The conditions of each exchange or co-tutoring arrangement, including duration, financial support, applicable regulations, and recognition of outputs, shall be agreed in writing in advance."),
      Num("The hosting institution shall provide exchanged persons with reasonable access to its facilities and scientific resources, in accordance with its own internal regulations."),
      Num("Each Party remains responsible for its own personnel in matters of employment law, social security, and insurance."),
    ],
    art4extra: null,
    addendumTypes: ["Joint Research", "Researcher Exchange", "PhD Co-tutoring", "Grant Application", "Shared Infrastructure", "Conference/Workshop", "Software/Tool Development"],
    addendumFunding: ["No external funding", "Horizon Europe", "PNRR", "National grants", "Regional programmes"],
    addendumLeadLabel: "Research Center Lead",
  },

  // ── HOSPITAL ───────────────────────────────────────────────
  hospital: {
    subtitle: "for Clinical Research Collaboration and Healthcare Innovation",
    partyLabel: "the Hospital",
    tableHeader: "Hospital",
    preambleDesc: () => [
      R("(hereinafter "), RBold('"the Hospital"'), R("), a healthcare institution established under the laws of "),
      RBlank(15), R(", with registered office at "), RBlank(20), R(", represented by "), RBlank(16),
      R(", in his/her capacity as "), RBlank(15), R("."),
    ],
    preambleWhereas: () => [
      P([RBold("Whereas,"), R(" bioERGOtech is a foundation pursuing civic and social-utility purposes in the fields of scientific research, technological development, digital health, and healthcare innovation;")]),
      P([RBold("Whereas,"), R(" the Hospital is a recognised healthcare institution with established clinical expertise in "), RBlank(20), R(", dedicated to delivering high-quality patient care, clinical research, and the adoption of innovative medical solutions;")]),
      P([RBold("Whereas,"), R(" both Parties recognise that meaningful collaboration between technology developers, researchers, and clinical institutions is essential to translate innovation into practice and to address real-world healthcare challenges;")]),
      P([RBold("Whereas,"), R(" both Parties wish to establish a framework for cooperation based on principles of clinical rigour, mutual benefit, patient safety, and respect for each other's regulatory and ethical obligations;")]),
      P([RBold("Now, therefore,"), R(" the Parties agree as follows.")]),
    ],
    art1: () => [
      Alpha("identify and document current clinical and operational challenges faced by the Hospital, in order to orient joint research and innovation activities towards concrete solutions;"),
      Alpha("develop and evaluate technological tools, software systems, diagnostic methods, and clinical workflows that address identified challenges;"),
      Alpha("conduct joint clinical and translational research, including analysis of retrospective and prospective patient data, subject to applicable ethics approvals;"),
      Alpha("facilitate the transfer of biological materials, including biopsies and other biological samples, between clinical and research settings under formal agreements compliant with all applicable legal and ethical requirements;"),
      Alpha("promote the training and professional development of clinical staff in digital health, biomedical informatics, and emerging healthcare technologies;"),
      Alpha("prepare and submit joint applications for competitive research funding at national, European, and international levels;"),
      Alpha("facilitate access of bioERGOtech members to clinical expertise and operational knowledge of the Hospital's staff for research and innovation purposes."),
    ],
    art2: () => [
      Alpha("clinical and translational research, from bench to bedside and back;"),
      Alpha("digital health tools, clinical decision-support systems, and health informatics;"),
      Alpha("artificial intelligence and machine learning applied to clinical imaging, diagnostics, or patient monitoring;"),
      Alpha("analysis of clinical datasets, electronic health records, and patient cohort studies, subject to ethics approval and data-protection compliance;"),
      Alpha("development and validation of novel diagnostics, biomarkers, or therapeutic tools;"),
      Alpha("logistics and regulatory frameworks for the transport of biological materials, including biopsies, blood samples, and tissue specimens, under dedicated material transfer agreements;"),
      Alpha("patient safety, quality of care, and healthcare process optimisation;"),
      Alpha("continuing medical education and professional training in health technology."),
    ],
    art3extra: () => [
      Num("All activities involving patient data, biological materials, or clinical trials shall require prior authorisation from the relevant ethics committee or institutional review board (IRB), as applicable under Italian and international law."),
      Num("Both Parties shall ensure compliance with applicable healthcare regulations, including, where relevant, the European Clinical Trials Regulation (Reg. EU 536/2014), the GDPR, and national healthcare law."),
    ],
    art7Title: "Biological Material Transfer",
    art7: () => [
      Num("Any transfer of biological materials (including biopsies, blood samples, tissue specimens, or derived products) between the Hospital and bioERGOtech or its research partners shall be governed exclusively by a dedicated Material Transfer Agreement (MTA), concluded as a specific addendum to this MoU or as a standalone agreement."),
      Num("Each MTA shall specify, at minimum: the nature and quantity of the material, the permitted uses, storage and handling conditions, liability, applicable ethics authorisations, applicable regulatory framework, and the duration of the transfer."),
      Num("No biological material shall be transferred until all required ethics committee approvals, patient consents, and regulatory authorisations have been obtained in writing."),
      Num("Biological materials transferred under this MoU shall not be used for purposes other than those specified in the relevant MTA without express written consent of both Parties."),
      Num("Costs associated with packaging, transport, storage, and processing of biological materials shall be allocated as specified in the relevant MTA."),
    ],
    art4extra: (): Paragraph[] => [
      Num("Where activities involve the transfer of biological materials or clinical datasets, any associated costs shall be governed by a dedicated material transfer agreement or data-sharing agreement, which shall specify charges, liability, and permitted uses."),
    ],
    addendumTypes: ["Joint Clinical Research", "Data-Sharing Agreement", "Material Transfer Agreement", "Software/Tool Validation", "Clinical Training", "Grant Application"],
    addendumFunding: ["No external funding", "Horizon Europe", "PNRR", "National grants", "Regional programmes"],
    addendumLeadLabel: "Hospital Clinical Lead",
  },

  // ── MEDICAL ASSOCIATION ────────────────────────────────────
  medical_association: {
    subtitle: "for Professional Collaboration, Consortium Development, and Healthcare Innovation",
    partyLabel: "the Association",
    tableHeader: "Medical Association",
    preambleDesc: () => [
      R("(hereinafter "), RBold('"the Association"'), R("), a medical or scientific professional association established under the laws of "),
      RBlank(15), R(", with registered office at "), RBlank(20), R(", representing healthcare professionals in the field of "),
      RBlank(15), R(", represented by "), RBlank(16), R(", in his/her capacity as "), RBlank(15), R("."),
    ],
    preambleWhereas: () => [
      P([RBold("Whereas,"), R(" bioERGOtech is a foundation pursuing civic and social-utility purposes in the fields of scientific research, technological development, digital health, and healthcare innovation, with a mission to bridge research, technology, and clinical practice;")]),
      P([RBold("Whereas,"), R(" the Association is a recognised professional body representing healthcare professionals specialised in "), RBlank(20), R(", committed to the advancement of medical knowledge, professional standards, continuing education, and the improvement of patient care;")]),
      P([RBold("Whereas,"), R(" both Parties recognise that structured collaboration between innovative foundations and medical professional organisations is essential to accelerate the uptake of evidence-based technology in clinical practice and to build interdisciplinary consortia capable of addressing complex healthcare challenges;")]),
      P([RBold("Whereas,"), R(" both Parties wish to establish a framework for cooperation based on principles of professional integrity, mutual benefit, and respect for each other's regulatory and ethical obligations;")]),
      P([RBold("Now, therefore,"), R(" the Parties agree as follows.")]),
    ],
    art1: () => [
      Alpha("build and co-lead multi-institutional research and innovation consortia bringing together hospitals, universities, industry, and civil-society organisations on topics of shared interest;"),
      Alpha("jointly develop, promote, and disseminate clinical practice guidelines, position statements, and consensus documents incorporating evidence from emerging technologies;"),
      Alpha("design and deliver continuing medical education (CME) programmes, workshops, and scientific conferences that support the professional development of the Association's members;"),
      Alpha("prepare and submit joint applications for competitive funding at national, European, and international levels, leveraging the Association's clinical network;"),
      Alpha("facilitate structured access by bioERGOtech members to the clinical expertise, institutional networks, and professional community of the Association's membership;"),
      Alpha("organise joint scientific events, symposia, and roundtables addressing technological innovation in clinical practice;"),
      Alpha("promote the development and adoption of clinical and digital health standards within the Association's professional community;"),
      Alpha("explore joint advocacy activities on health policy, digital health regulation, and research funding priorities."),
    ],
    art2: () => [
      Alpha("development and leadership of multi-partner research consortia, including preparation of consortium agreements, roles, and governance structures;"),
      Alpha("co-development of clinical guidelines, best-practice documents, and consensus statements on digital health, AI in medicine, and related topics;"),
      Alpha("continuing medical education and professional training in health technology, data science, and digital therapeutics;"),
      Alpha("joint scientific publications, systematic reviews, and meta-analyses informed by the Association's clinical expertise;"),
      Alpha("joint organisation of congresses, symposia, and scientific sessions, including dedicated tracks on innovation and technology;"),
      Alpha("clinical validation and real-world evidence generation for digital health tools developed or supported by bioERGOtech;"),
      Alpha("health policy engagement, regulatory affairs, and position papers on matters of shared professional interest;"),
      Alpha("member engagement programmes enabling individual clinicians affiliated with the Association to collaborate with bioERGOtech on specific projects."),
    ],
    art3extra: () => [
      Num("A joint steering committee, composed of at least two representatives from each Party, shall meet at least once per year to review ongoing activities, assess outcomes, and plan forthcoming initiatives."),
      Num("The Association may communicate bioERGOtech collaboration opportunities to its members via its official channels, provided that participation remains entirely voluntary and non-binding for individual members."),
    ],
    art7Title: "Consortium Development",
    art7: () => [
      Num("The Parties may jointly lead or participate in multi-institutional research or innovation consortia, serving complementary roles based on their respective competencies. bioERGOtech may contribute technological, research, and project management expertise. The Association may contribute clinical leadership, professional networks, and dissemination reach."),
      Num("When building a consortium for a specific funded project, the Parties shall jointly identify potential additional partners from among the Association's institutional members, affiliated hospitals, and other relevant stakeholders."),
      Num("The governance structure of each consortium, including roles, decision rights, financial flows, and IP ownership, shall be established in a dedicated consortium agreement prior to the submission of any joint funding application."),
      Num("The Association may facilitate introductions between bioERGOtech and individual member institutions or clinicians interested in participating in consortium activities, provided that such participation is non-binding unless formalised in writing."),
      Num("The Parties shall coordinate their positioning and communications regarding any jointly led consortium to ensure consistency and avoid conflicts of interest."),
    ],
    art4extra: () => [
      Num("Where the Association acts as a dissemination or engagement partner for a funded project led by bioERGOtech, or vice versa, the associated costs and deliverables shall be governed by a dedicated participation agreement."),
    ],
    addendumTypes: ["Consortium Development", "Clinical Guidelines / Position Paper", "CME Programme", "Conference / Symposium", "Grant Application", "Member Engagement Programme", "Policy / Advocacy"],
    addendumFunding: ["No external funding", "Horizon Europe", "EU4Health", "National grants", "Private foundation"],
    addendumLeadLabel: "Association Lead",
  },

  // ── PATIENT ASSOCIATION ─────────────────────────────────────
  patient_association: {
    subtitle: "for Patient-Centred Collaboration and Co-Development of Health Solutions",
    partyLabel: "the Association",
    tableHeader: "Patient Association",
    preambleDesc: () => [
      R("(hereinafter "), RBold('"the Association"'), R("), a patient association established under the laws of "),
      RBlank(15), R(", with registered office at "), RBlank(20), R(", represented by "), RBlank(16),
      R(", in his/her capacity as "), RBlank(15), R("."),
    ],
    preambleWhereas: () => [
      P([RBold("Whereas,"), R(" bioERGOtech is a foundation pursuing civic and social-utility purposes in the fields of scientific research, technological development, digital health, and healthcare innovation, with a strong commitment to placing patients at the centre of its activities;")]),
      P([RBold("Whereas,"), R(" the Association is a recognised patient organisation representing persons affected by "), RBlank(20), R(", dedicated to improving the quality of life, rights, and healthcare access of its members and the broader patient community;")]),
      P([RBold("Whereas,"), R(" both Parties share the conviction that meaningful collaboration between technologists, researchers, and patient communities is essential to develop tools, knowledge, and initiatives that genuinely respond to patients' lived needs;")]),
      P([RBold("Whereas,"), R(" both Parties wish to establish a framework for cooperation based on principles of co-design, mutual benefit, transparency, and respect for patient autonomy and privacy;")]),
      P([RBold("Now, therefore,"), R(" the Parties agree as follows.")]),
    ],
    art1: () => [
      Alpha("identify, through structured dialogue, the concrete needs, priorities, and challenges experienced by patients and caregivers in their daily lives;"),
      Alpha("co-develop digital tools, software applications, and technology-based solutions that address identified patient needs and improve quality of life;"),
      Alpha("involve patient representatives meaningfully in the design, testing, and evaluation of any jointly developed tools, ensuring true co-design rather than mere consultation;"),
      Alpha("organise joint events, workshops, and conferences that place the patient perspective at the centre, bringing together patients, researchers, clinicians, and technology developers;"),
      Alpha("develop joint educational and awareness-raising materials for patients, caregivers, and the general public;"),
      Alpha("support the Association's institutional capacity in areas such as digital literacy, health data rights, and engagement with scientific processes;"),
      Alpha("explore joint advocacy activities and public communications on topics of shared concern;"),
      Alpha("facilitate access of bioERGOtech members to the expertise and lived experience of the Association's membership, in a structured and respectful manner."),
    ],
    art2: () => [
      Alpha("co-development of patient-facing software, mobile applications, and digital health tools to support self-management, monitoring, and communication;"),
      Alpha("collection and structured analysis of patient-reported outcomes, experiences, and preferences, with full informed consent and data-protection compliance;"),
      Alpha("design and facilitation of patient advisory processes to inform research agendas and technology development priorities;"),
      Alpha("development of plain-language scientific communication and health literacy resources tailored to the patient community;"),
      Alpha("organisation of patient-centred conferences, focus groups, and participatory workshops;"),
      Alpha("joint applications for public funding that includes patient and civil-society involvement as a requirement or an added value;"),
      Alpha("promotion of patient data rights, digital inclusion, and access to innovative diagnostics or therapies."),
    ],
    art3extra: () => [
      Num("A joint coordination meeting shall take place at least once every six months to review ongoing activities, assess outcomes, and plan forthcoming initiatives."),
      Num("All interactions involving patients or their personal data shall comply with applicable data protection law, including the EU General Data Protection Regulation (GDPR), and shall be conducted with full respect for patient dignity and autonomy."),
    ],
    art7Title: "Patient Engagement and Co-Design",
    art7: () => [
      Num("The Parties shall jointly establish a Patient Advisory Group (PAG) or equivalent participatory structure, composed of patient and caregiver representatives nominated by the Association, to guide the co-development of any tools or initiatives under this MoU."),
      Num("The PAG shall be consulted at key stages of any project: needs identification, design, prototype testing, and evaluation of outcomes."),
      Num("Participation in the PAG shall be voluntary. Participants shall be informed of their role, rights, and any applicable data-processing activities before engagement."),
      Num("The Parties shall jointly produce accessible reports or summaries of project outcomes for the benefit of the Association's membership."),
      Num("Joint events and conferences shall be designed to be accessible and inclusive, with plain-language communication and, where feasible, provision for persons with disabilities or limited digital access."),
    ],
    art4extra: () => [
      Num("Any reimbursement of patient representatives for time or expenses shall follow applicable ethical and legal standards and shall not constitute commercial compensation for patient data."),
    ],
    addendumTypes: ["Software/App Co-development", "Patient Needs Assessment", "Patient Advisory Group", "Joint Conference/Event", "Educational/Awareness Campaign", "Grant Application"],
    addendumFunding: ["No external funding", "Horizon Europe", "National grants", "Regional programmes"],
    addendumLeadLabel: "Association Lead",
  },
};

// ════════════════════════════════════════════════════════════
// SHARED ARTICLES (identical or near-identical across templates)
// ════════════════════════════════════════════════════════════

function art4Financial(tpl: Record<string, unknown> & { art4extra: (() => Paragraph[]) | null }) {
  const items = [
    Num("This MoU does not, in itself, create any financial obligation for either Party."),
    Num("Financial arrangements related to specific activities, including cost-sharing, grants management, personnel costs, or travel reimbursements, shall be defined in separate written agreements or activity-specific addenda."),
    Num("Each Party shall bear its own administrative costs associated with the general implementation of this MoU, unless otherwise agreed in writing."),
    Num("The Parties may jointly seek external funding for collaborative activities. In such cases, financial roles and responsibilities shall be specified in the relevant project agreement."),
  ];
  if (tpl.art4extra) items.push(...tpl.art4extra());
  return items;
}

function art5IP(): Paragraph[] {
  return [
    Num("Pre-existing intellectual property of each Party remains the exclusive property of the originating Party and shall not be affected by this MoU."),
    Num("Any intellectual property created jointly in the course of activities under this MoU shall be jointly owned. The terms of its management, use, commercialisation, and revenue sharing shall be agreed in writing prior to the commencement of the relevant activity."),
    Num("Each Party shall promptly notify the other of any potentially jointly developed intellectual property and shall negotiate in good faith the terms of its protection and exploitation."),
    Num("Open-source licensing of jointly developed software tools may be agreed by the Parties as an alternative to commercial exploitation, consistent with the non-profit mission of bioERGOtech."),
  ];
}

function art6Confidentiality(): Paragraph[] {
  return [
    Num("Each Party shall treat as confidential all non-public information received from the other Party in connection with this MoU (\"Confidential Information\") and shall not disclose it to third parties without prior written consent."),
    Num("Confidential Information shall be used solely for the purposes of this MoU."),
    Num([RBold("This obligation survives the expiry or termination of this MoU for a period of three (3) years.")]),
    Num("The confidentiality obligation does not apply to information that:"),
    Roman("is or becomes publicly available through no fault of the receiving Party;"),
    Roman("was already known to the receiving Party prior to disclosure;"),
    Roman("is independently developed by the receiving Party without use of the Confidential Information;"),
    Roman("is required to be disclosed by law or order of a competent authority, provided that the other Party is given prior notice where permitted."),
  ];
}

function art8Publications(): Paragraph[] {
  return [
    Num("Both Parties are encouraged to publish the results of joint work in peer-reviewed journals and open-access repositories, subject to applicable confidentiality obligations and IP agreements."),
    Num("Each Party shall appropriately acknowledge the contribution of the other in any publications, presentations, or other dissemination outputs arising from collaborative activities."),
    Num([R("Prior to submission of any joint publication, the submitting Party shall provide the other Party with a draft for review, with a reasonable response time of no less than "), RBold("fifteen (15) working days"), R(".")]),
    Num("The Parties shall mutually agree on author order and corresponding authorship prior to submission, following recognised scientific integrity standards."),
  ];
}

function art9Addenda(): Paragraph[] {
  return [
    Num("Individual projects, exchange programmes, or activities carried out under this MoU may be governed by specific written agreements or addenda, which shall form an integral part of this MoU."),
    Num("Each addendum shall specify, at minimum: the objectives of the activity, the roles and responsibilities of each Party, the timeline, any financial arrangements, and applicable IP or data-protection provisions."),
    Num("Addenda shall be signed by duly authorised representatives of both Parties and shall prevail over this MoU in the event of conflict, with respect to the specific activity they govern."),
  ];
}

function art10Contacts(contact: MoUContact, tpl: Record<string, unknown>): (Paragraph | Table)[] {
  const partnerName    = contact.contact_person || "_______________";
  const partnerTitle   = "_______________";
  const partnerEmail   = contact.email          || "_______________";
  const partnerPhone   = "_______________";

  const colL = Math.round(CONTENT_W * 0.28);
  const colM = Math.round(CONTENT_W * 0.36);
  const colR = CONTENT_W - colL - colM;

  return [
    P("Each Party designates a primary point of contact responsible for coordinating activities under this MoU:"),
    PEmpty(),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [colL, colM, colR],
      rows: [
        new TableRow({ children: [
          TCHeader("", colL),
          TCHeader("Fondazione bioERGOtech ETS", colM),
          TCHeader(tpl.tableHeader as string, colR),
        ]}),
        new TableRow({ children: [
          TC([P([RBold("Name")])], colL),
          TC([P("Dott. Guido Putignano")], colM),
          TC([P([R(partnerName)])], colR),
        ]}),
        new TableRow({ children: [
          TC([P([RBold("Title")])], colL),
          TC([P("President")], colM),
          TC([P([RBlank(15)])], colR),
        ]}),
        new TableRow({ children: [
          TC([P([RBold("Email")])], colL),
          TC([P("info@bioergotech.org")], colM),
          TC([P([R(partnerEmail)])], colR),
        ]}),
        new TableRow({ children: [
          TC([P([RBold("Telephone")])], colL),
          TC([P("+393405258406")], colM),
          TC([P([RBlank(15)])], colR),
        ]}),
      ],
    }),
    PEmpty(),
    P("Either Party may change its designated point of contact by giving written notice to the other Party."),
  ];
}

function art11Duration(): Paragraph[] {
  return [
    Num([R("This MoU enters into force on the date of the last signature below and shall remain valid for "), RBold("three (3) years"), R(", unless terminated earlier in accordance with Article 12.")]),
    Num([R("Before expiry, the Parties may renew this MoU by mutual written agreement for successive periods of "), RBold("two (2) years"), R(" each, with any proposed amendments agreed at least sixty (60) days before expiry.")]),
    Num("Activities ongoing at the time of expiry shall continue to be governed by this MoU until their natural conclusion, unless the Parties agree otherwise."),
  ];
}

function art12Termination(): Paragraph[] {
  return [
    Num([R("Either Party may terminate this MoU by giving "), RBold("sixty (60) days'"), R(" written notice to the other Party, without the need to state reasons.")]),
    Num("Termination shall not affect the completion of activities already underway under a specific agreement or addendum, unless the Parties agree otherwise in writing."),
    Num("Obligations of confidentiality (Article 6) and any IP arrangements already formalised remain in effect after termination."),
  ];
}

function art13Logos(): Paragraph[] {
  return [
    Num("The Parties recognise that mutual promotion of this collaboration and its results is in their shared interest and is actively encouraged. Each Party is therefore expressly authorised to display the other Party's name and logo in materials that present the partnership, its activities, or its results, including but not limited to: institutional websites (e.g., under a \"Partners\" or \"Collaborations\" section), press releases, event programmes, conference presentations, social media, and co-authored publications. No prior written consent is required for these uses."),
    Num([RBold("The following uses remain subject to prior written consent:"), R("")]),
    Roman("any use that implies the other Party endorses a specific product, service, technology, or commercial offering, as opposed to the partnership itself;"),
    Roman("use of the other Party's name or logo in paid advertising or commercially sponsored content;"),
    Roman("any modification, adaptation, or derivative use of the other Party's logo that alters its colours, proportions, or visual identity."),
    Num("Each Party shall ensure that any display of the other Party's logo conforms to the visual identity guidelines provided by the logo owner. In the absence of such guidelines, the logo shall be reproduced faithfully and without distortion."),
    Num([R("Upon expiry or termination of this MoU, each Party shall cease prospective uses of the other Party's name and logo within "), RBold("thirty (30) days"), R(". References to the collaboration in already-published or archived materials may remain, provided they accurately describe the period and nature of the partnership.")]),
    Num("Each Party warrants that it holds or is duly authorised to grant the rights necessary for the other Party to display its logo in accordance with this Article."),
  ];
}

function art14DataProtection(): Paragraph[] {
  return [
    Num("The Parties shall process any personal data exchanged or generated in connection with this MoU in full compliance with applicable data protection legislation, including Regulation (EU) 2016/679 (GDPR) and, where applicable, Italian Legislative Decree No. 196/2003 as amended by Legislative Decree No. 101/2018."),
    Num("Each Party acts as an independent data controller with respect to the personal data it processes for the purposes of this MoU, unless otherwise agreed in writing."),
    Num("Where activities under this MoU involve the joint processing of personal data, or the transfer of personal data between the Parties, the Parties shall enter into a dedicated Data Processing Agreement or Joint Controllership Agreement prior to the commencement of such activities, as required by Article 26 or Article 28 GDPR."),
    Num("Given the biomedical nature of the collaboration, the Parties acknowledge that health data (Article 9 GDPR) may be involved in certain activities. The processing of such data shall be subject to enhanced safeguards, including appropriate legal bases, data minimisation, and security measures, to be specified in the relevant addendum or data processing agreement."),
    Num("The Parties shall implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk, in accordance with Article 32 GDPR."),
    Num([R("In the event of a personal data breach involving data exchanged under this MoU, the Party that becomes aware of the breach shall notify the other Party without undue delay and, in any event, within "), RBold("forty-eight (48) hours"), R(" of becoming aware, to enable both Parties to comply with their respective notification obligations.")]),
  ];
}

function art15ForceMajeure(): Paragraph[] {
  return [
    Num([R("Neither Party shall be liable for any failure or delay in performing its obligations under this MoU if such failure or delay is caused by circumstances beyond its reasonable control, including but not limited to: acts of God, pandemics, war, civil unrest, fire, flood, earthquake, governmental or regulatory actions, or failure of third-party infrastructure essential to the performance of the relevant activity ("), RBold('"Force Majeure Event"'), R(").")]),
    Num("The Party affected by a Force Majeure Event shall notify the other Party as soon as reasonably practicable, describing the nature and expected duration of the event and its impact on the affected obligations."),
    Num([R("If a Force Majeure Event continues for more than "), RBold("ninety (90) days"), R(", either Party may terminate this MoU by giving written notice to the other, without liability to either Party, save for obligations already accrued prior to the Force Majeure Event.")]),
  ];
}

function art16Liability(): Paragraph[] {
  return [
    Num("Given the non-commercial, collaborative, and exploratory nature of this MoU, neither Party shall be liable to the other for any indirect, incidental, consequential, or punitive damages arising out of or in connection with this MoU, including loss of revenue, loss of data, or loss of scientific opportunity, however caused."),
    Num("Each Party's aggregate liability to the other under or in connection with this MoU shall not exceed the total direct costs actually incurred by the claiming Party in connection with the specific activity giving rise to the claim, as documented in the relevant addendum."),
    Num("Nothing in this Article limits liability for: (i) death or personal injury caused by negligence; (ii) fraud or fraudulent misrepresentation; (iii) wilful misconduct; or (iv) any other liability that cannot be limited or excluded by applicable law."),
  ];
}

function art17General(): Paragraph[] {
  return [
    Num([RBold("Non-binding nature. "), R("This MoU expresses the mutual intention of the Parties to cooperate and does not create legally binding obligations beyond those expressly stated herein. It is not a contract for services, employment, or financial transfer.")]),
    Num([RBold("Non-exclusivity. "), R("This MoU is non-exclusive. Each Party retains the right to enter into similar agreements with other institutions.")]),
    Num([RBold("No employment or agency. "), R("Nothing in this MoU creates any employment, partnership, agency, or joint-venture relationship between the Parties.")]),
    Num([RBold("Amendments. "), R("Any modification to this MoU must be agreed in writing and signed by duly authorised representatives of both Parties.")]),
    Num([RBold("Entire agreement. "), R("This MoU, together with its addenda, constitutes the entire agreement between the Parties with respect to its subject matter.")]),
    Num([RBold("Governing law. "), R("This MoU shall be governed by and construed in accordance with Italian law.")]),
    Num([RBold("Dispute resolution. "), R("Any dispute arising from this MoU shall first be referred to the respective points of contact for amicable settlement. If no resolution is reached within thirty (30) days, the matter shall be submitted to the competent courts of Taranto, Italy.")]),
    Num([RBold("Language. "), R("This MoU is executed in English. If a translation is provided for convenience, the English version shall prevail in case of discrepancy.")]),
    Num([RBold("Severability. "), R("If any provision of this MoU is found invalid or unenforceable, the remaining provisions shall continue in full force and effect.")]),
  ];
}

// ════════════════════════════════════════════════════════════
// SIGNATURE BLOCK
// ════════════════════════════════════════════════════════════

function signatureBlock(contact: MoUContact, tpl: Record<string, unknown>): (Paragraph | Table)[] {
  const instName = contact.name || "_______________";
  const colL = Math.round(CONTENT_W * 0.48);
  const colS = Math.round(CONTENT_W * 0.04);
  const colR = CONTENT_W - colL - colS;
  const blk = () => P([RBlank(30)]);
  const blank12 = () => P([RBlank(20)]);
  return [
    PEmpty(), PEmpty(),
    HRule(),
    PEmpty(),
    P("IN WITNESS WHEREOF, the duly authorised representatives of the Parties have executed this Memorandum of Understanding."),
    PEmpty(), PEmpty(),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [colL, colS, colR],
      rows: [
        new TableRow({ children: [
          TCNo([P([RBold("Fondazione bioERGOtech ETS")])], colL),
          TCNo([], colS),
          TCNo([P([RBold(instName)])], colR),
        ]}),
        new TableRow({ children: [
          TCNo([], colL),
          TCNo([], colS),
          TCNo([], colR),
        ]}),
        new TableRow({ children: [
          TCNo([blk()], colL),
          TCNo([], colS),
          TCNo([blk()], colR),
        ]}),
        new TableRow({ children: [
          TCNo([P("Dott. Guido Putignano")], colL),
          TCNo([], colS),
          TCNo([blank12()], colR),
        ]}),
        new TableRow({ children: [
          TCNo([P("President")], colL),
          TCNo([], colS),
          TCNo([blank12()], colR),
        ]}),
        new TableRow({ children: [
          TCNo([P([R("Place: "), RBlank(12)])], colL),
          TCNo([], colS),
          TCNo([P([R("Place: "), RBlank(12)])], colR),
        ]}),
        new TableRow({ children: [
          TCNo([P([R("Date:  "), RBlank(12)])], colL),
          TCNo([], colS),
          TCNo([P([R("Date:  "), RBlank(12)])], colR),
        ]}),
      ],
    }),
    PEmpty(), PEmpty(),
    HRule(),
  ];
}

// ════════════════════════════════════════════════════════════
// ADDENDUM TEMPLATE
// ════════════════════════════════════════════════════════════

function addendumTemplate(contact: MoUContact, tpl: Record<string, unknown> & { addendumTypes: string[]; addendumFunding: string[]; addendumLeadLabel: string }): (Paragraph | Table)[] {
  const instName = contact.name || "_______________";
  const col1 = Math.round(CONTENT_W * 0.30);
  const col2 = CONTENT_W - col1;
  const blankRow = (label: string) =>
    new TableRow({ children: [
      TC([P([RBold(label)])], col1),
      TC([PEmpty()], col2),
    ]});

  const typeItems = (tpl.addendumTypes as string[]).map(t => `${t}   `).join("  ");
  const fundItems = (tpl.addendumFunding as string[]).map(f => `${f}   `).join("  ");

  return [
    new Paragraph({ children: [], pageBreakBefore: true }),
    PEmpty(),
    HRule(DARK_BLUE, 12),
    PEmpty(),
    PCentered([RBlue("ADDENDUM No. ", true), RBlank(8)]),
    PCentered([RGray("to the Memorandum of Understanding of "), RBlank(14)]),
    PEmpty(),
    HRule(DARK_BLUE, 12),
    PEmpty(),
    P([R("This Addendum is concluded pursuant to Article 9 of the MoU signed between "),
       RBold("Fondazione bioERGOtech ETS"), R(" and "), RBlank(20),
       R(" and forms an integral part thereof.")]),
    PEmpty(),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [col1, col2],
      rows: [
        new TableRow({ children: [
          new TableCell({
            borders: cellBorders,
            columnSpan: 2,
            width: { size: CONTENT_W, type: WidthType.DXA },
            shading: { fill: LT_GRAY, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [P([RBold("Activity Details")], { alignment: AlignmentType.CENTER })],
          }),
        ]}),
        blankRow("Title of Activity"),
        new TableRow({ children: [
          TC([P([RBold("Type of Activity")])], col1),
          TC([P(typeItems)], col2),
        ]}),
        blankRow("Start Date"),
        blankRow("End Date"),
        blankRow("bioERGOtech Lead"),
        blankRow(tpl.addendumLeadLabel as string),
        new TableRow({ children: [
          TC([P([RBold("Funding")])], col1),
          TC([P(fundItems)], col2),
        ]}),
        new TableRow({ children: [
          TC([P([RBold("Budget")])], col1),
          TC([P([R("Total: €"), RBlank(8), R("   bioERGOtech share: €"), RBlank(8), R("   Partner share: €"), RBlank(8)])], col2),
        ]}),
      ],
    }),
    PEmpty(),
    P([RBold("Description of the Activity:")]),
    P([RBlank(60)]), P([RBlank(60)]), P([RBlank(60)]),
    PEmpty(),
    P([RBold("Roles and Responsibilities:")]),
    P([RBlank(60)]), P([RBlank(60)]),
    PEmpty(),
    P([RBold("Expected Outputs and Dissemination:")]),
    P([RBlank(60)]), P([RBlank(60)]),
    PEmpty(),
    P([RBold("Specific IP and Data-Protection Provisions (if any):")]),
    P([RBlank(60)]), P([RBlank(60)]),
    PEmpty(), PEmpty(),
    ...signatureBlock(contact, tpl).slice(2),
    PEmpty(), PEmpty(),
    P([RGray("Fondazione bioERGOtech ETS  ·  C.F. 90287640735  ·  Via Ciro Giovinazzi 70, 74123 Taranto, Italy  ·  info@bioergotech.org  ·  bioergotech.org")],
      { alignment: AlignmentType.CENTER }),
  ];
}

// ════════════════════════════════════════════════════════════
// MAIN DOCUMENT BUILDER
// ════════════════════════════════════════════════════════════

function buildMoU(contact: MoUContact, templateKey: string): Document {
  const tpl = (TEMPLATES as Record<string, typeof TEMPLATES[keyof typeof TEMPLATES]>)[templateKey];
  if (!tpl) throw new Error(`Unknown template: ${templateKey}`);

  const instName    = contact.name           || "_______________";
  const instCountry = contact.country        || "_______________";
  const instField   = contact.field_of_interest || "_______________";
  const mouRef      = `bioERGOtech/MoU/${new Date().getFullYear()}/${String(Math.floor(Math.random()*9000)+1000)}`;

  // Art 3 standard items + template extra
  const art3Items = [
    Num("Specific activities carried out under this MoU shall be planned jointly, with each Party designating the relevant staff responsible for their execution."),
    Num("The Parties shall communicate regularly and review the status of ongoing activities at least once per year."),
    Num("Either Party may propose new activities at any time; these shall become effective upon written confirmation by both Parties."),
    ...(tpl.art3extra ? tpl.art3extra() : []),
  ];

  const children = [
    // ── TITLE PAGE ─────────────────────────────────────────
    HRule(DARK_BLUE, 12),
    PEmpty(),
    PCentered([RBlue("MEMORANDUM OF UNDERSTANDING", true)], { spacing: { after: 60 } }),
    PCentered([RGray(tpl.subtitle)]),
    PEmpty(),
    HRule(DARK_BLUE, 12),
    PEmpty(), PEmpty(),
    PCentered([R("between")]),
    PEmpty(),
    PCentered([RBlue("Fondazione bioERGOtech ETS", true)]),
    PCentered([RGray("Taranto, Italy")]),
    PEmpty(),
    PCentered([R("and")]),
    PEmpty(),
    PCentered([RBlue(instName, true)]),
    PCentered([RGray(instCountry)]),
    PEmpty(), PEmpty(), PEmpty(),
    new Table({
      width: { size: Math.round(CONTENT_W * 0.7), type: WidthType.DXA },
      columnWidths: [Math.round(CONTENT_W * 0.25), Math.round(CONTENT_W * 0.45)],
      rows: [
        new TableRow({ children: [
          TCNo([P([R("MoU Reference:")])], Math.round(CONTENT_W * 0.25)),
          TCNo([P([R(mouRef)])], Math.round(CONTENT_W * 0.45)),
        ]}),
        new TableRow({ children: [
          TCNo([P([R("Date of Signature:")])], Math.round(CONTENT_W * 0.25)),
          TCNo([P([RBlank(16)])], Math.round(CONTENT_W * 0.45)),
        ]}),
        new TableRow({ children: [
          TCNo([P([R("Duration:")])], Math.round(CONTENT_W * 0.25)),
          TCNo([P([R("Three (3) years")])], Math.round(CONTENT_W * 0.45)),
        ]}),
      ],
    }),

    // ── PREAMBLE ───────────────────────────────────────────
    new Paragraph({ children: [], pageBreakBefore: true }),
    SectionHeading("Preamble"),
    P("This Memorandum of Understanding (\"MoU\") is entered into between:"),
    PEmpty(),
    Bullet([RBold("Fondazione bioERGOtech ETS"), R(" (hereinafter "), RBold('"bioERGOtech"'), R("), a non-profit foundation established on 12 April 2025, registered in Taranto, Italy (Fiscal Code 90287640735), governed by the Italian Third Sector Code (D.Lgs. 117/2017), with registered office at Via Ciro Giovinazzi 70, 74123 Taranto, Italy, represented by its President, Dott. Guido Putignano;")]),
    Bullet([RBold(instName), R(" "), ...tpl.preambleDesc()]),
    PEmpty(),
    P([R("Hereinafter referred to individually as a "), RBold('"Party"'), R(" and collectively as the "), RBold('"Parties"'), R(".")]),
    PEmpty(),
    ...tpl.preambleWhereas(instField),

    // ── ARTICLES ───────────────────────────────────────────
    ArticleHeading(1, "Objectives"),
    P("The Parties intend to cooperate in order to:"),
    ...tpl.art1(),

    ArticleHeading(2, "Areas of Collaboration"),
    P("Collaboration under this MoU may encompass, without limitation, the following thematic areas:"),
    ...tpl.art2(),
    P("The specific scope of each collaborative activity shall be defined by mutual agreement and, where appropriate, formalised in a written addendum to this MoU (see Article 9)."),

    ArticleHeading(3, "Implementation"),
    ...art3Items,

    ArticleHeading(4, "Financial Arrangements"),
    ...art4Financial(tpl),

    ArticleHeading(5, "Intellectual Property"),
    ...art5IP(),

    ArticleHeading(6, "Confidentiality"),
    ...art6Confidentiality(),

    ArticleHeading(7, tpl.art7Title),
    ...tpl.art7(),

    ArticleHeading(8, "Publications and Attribution"),
    ...art8Publications(),

    ArticleHeading(9, "Specific Agreements and Addenda"),
    ...art9Addenda(),

    ArticleHeading(10, "Points of Contact"),
    ...art10Contacts(contact, tpl),

    ArticleHeading(11, "Duration and Renewal"),
    ...art11Duration(),

    ArticleHeading(12, "Termination"),
    ...art12Termination(),

    ArticleHeading(13, "Use of Names and Logos"),
    ...art13Logos(),

    ArticleHeading(14, "Data Protection"),
    ...art14DataProtection(),

    ArticleHeading(15, "Force Majeure"),
    ...art15ForceMajeure(),

    ArticleHeading(16, "Limitation of Liability"),
    ...art16Liability(),

    ArticleHeading(17, "General Provisions"),
    ...art17General(),

    // ── SIGNATURE BLOCK ────────────────────────────────────
    ...signatureBlock(contact, tpl),

    // ── ADDENDUM ───────────────────────────────────────────
    ...addendumTemplate(contact, tpl),
  ];

  return new Document({
    numbering: { config: numberingConfig },
    styles: {
      default: {
        document: { run: { font: "Times New Roman", size: 24, color: "000000" } },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: PAGE_W, height: 16838 },
          margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
        },
      },
      children,
    }],
  });
}

// ── ROUTE HANDLERS ───────────────────────────────────────────

// GET /api/admin/outreach/mou?contactId=xxx&templateType=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const contactId    = searchParams.get("contactId");
  const templateOverride = searchParams.get("templateType") || null;

  if (!contactId) {
    return NextResponse.json({ error: "contactId required" }, { status: 400 });
  }

  const { data: contact, error } = await getDB()
    .from("outreach_contacts")
    .select("id, name, country, type, city, field_of_interest, contact_person, email, category")
    .eq("id", contactId)
    .single();

  if (error || !contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const templateKey = templateOverride || detectTemplateKey(contact as MoUContact);

  try {
    const doc    = buildMoU(contact as MoUContact, templateKey);
    const buffer = await Packer.toBuffer(doc);

    const safeName = (contact.name || "MoU").replace(/[^a-zA-Z0-9\s-]/g, "").trim().replace(/\s+/g, "_").slice(0, 40);
    const filename = `bioERGOtech_MoU_${safeName}_${new Date().getFullYear()}.docx`;

    // Update contact MoU status
    await getDB()
      .from("outreach_contacts")
      .update({ mou_status: "Draft in progress" })
      .eq("id", contactId);

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generation failed" },
      { status: 500 }
    );
  }
}
