// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Packer } from "docx";
import {
  AlignmentType, BorderStyle, Document, Header, Footer, ImageRun,
  LevelFormat, Paragraph, ShadingType, Table, TableCell,
  TableRow, TextRun, WidthType,
} from "docx";
import fs from "fs";
import path from "path";

const getDB = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

// ── Brand colours ────────────────────────────────────────────
const BRAND_TEXT = "1A2332";  // bioERGOtech dark text
const TEAL       = "2EC4B6";  // bioERGOtech primary teal
const TEAL_D     = "1A9E92";  // bioERGOtech dark teal
const GRAY       = "4A5568";  // TEXT_MID
const LT_GRAY    = "E8F8F6";  // TEAL_LIGHT

// ── Page geometry (A4, 3 cm margins) ─────────────────────────
const PAGE_W   = 11906;
const MARGIN   = 1701;
const CONTENT_W = PAGE_W - 2 * MARGIN; // 8504 DXA



// ── Text helpers ─────────────────────────────────────────────
const R = (text, opts = {}) =>
  new TextRun({ text, font: "Times New Roman", size: 24, ...opts });

const RNavy  = (text, bold = false) => R(text, { color: BRAND_TEXT, bold });
const RTeal  = (text, bold = false) => R(text, { color: TEAL_D, bold });
const RGray  = (text, size = 24)    => R(text, { color: GRAY, size });
const RBold  = (text)               => R(text, { bold: true });
const RBlank = (chars = 20)         => R("_".repeat(chars), { underline: {} });

const P = (children, opts = {}) =>
  new Paragraph({
    children: Array.isArray(children) ? children : [R(children)],
    spacing: { after: 120 },
    ...opts,
  });

const PCentered = (children, opts = {}) =>
  P(children, { alignment: AlignmentType.CENTER, ...opts });

const PEmpty = () =>
  new Paragraph({ children: [R("")], spacing: { after: 80 } });

// ── Article heading: navy bold + teal bottom border ──────────
const ArticleHeading = (num, title) =>
  new Paragraph({
    children: [
      new TextRun({ text: `Article ${num}.  `, color: TEAL_D, bold: true, font: "Times New Roman", size: 24 }),
      new TextRun({ text: title.toUpperCase(), color: BRAND_TEXT,   bold: true, font: "Times New Roman", size: 24 }),
    ],
    spacing: { before: 280, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: TEAL, space: 4 } },
  });

const SectionHeading = (title) =>
  new Paragraph({
    children: [RNavy(title.toUpperCase(), true)],
    spacing: { before: 280, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: TEAL, space: 4 } },
  });

// ── Horizontal rule ───────────────────────────────────────────
const HRule = (color = TEAL, size = 8) =>
  new Paragraph({
    children: [],
    border: { bottom: { style: BorderStyle.SINGLE, size, color, space: 1 } },
    spacing: { before: 0, after: 0 },
  });

// ── Logo paragraph ─────────────────────────────────────────────
const LogoParagraph = (width, height, align = AlignmentType.CENTER, logoData = null) => {
  if (!logoData) {
    return new Paragraph({
      children: [new TextRun({ text: "bioERGOtech", color: TEAL, bold: true, font: "Times New Roman", size: 40 })],
      alignment: align,
    });
  }
  return new Paragraph({
    children: [
      new ImageRun({ data: logoData, transformation: { width, height }, type: "png" }),
    ],
    alignment: align,
    spacing: { after: 120 },
  });
};

// ── Table helpers ─────────────────────────────────────────────
const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "BBBBBB" };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
const tealBorder = { style: BorderStyle.SINGLE, size: 4, color: TEAL };
const tealBorders = { top: tealBorder, bottom: tealBorder, left: tealBorder, right: tealBorder };

const TC = (children, width, opts = {}) =>
  new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: Array.isArray(children) ? children : [P(children)],
    ...opts,
  });

const TCNavy = (text, width) =>
  new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    shading: { fill: BRAND_TEXT, type: ShadingType.CLEAR },
    children: [P([new TextRun({ text, color: "FFFFFF", bold: true, font: "Times New Roman", size: 22 })])],
  });

const TCTeal = (text, width) =>
  new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    shading: { fill: "E6F9F4", type: ShadingType.CLEAR },
    children: [P([new TextRun({ text, color: BRAND_TEXT, bold: true, font: "Times New Roman", size: 22 })])],
  });

const TCNo = (children, width) =>
  new TableCell({
    borders: noBorders,
    width: { size: width, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 0, right: 80 },
    children: Array.isArray(children) ? children : [P(children)],
  });

// ── List numbering ────────────────────────────────────────────
const NUM_ALPHA   = "num-alpha";
const NUM_NUMERIC = "num-numeric";
const NUM_ROMAN   = "num-roman";
const NUM_BULLET  = "num-bullet";

const numberingConfig = [
  { reference: NUM_BULLET,
    levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
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

const Alpha  = (c) => new Paragraph({ numbering: { reference: NUM_ALPHA,   level: 0 }, children: Array.isArray(c) ? c : [R(c)], spacing: { after: 80 } });
const Num    = (c) => new Paragraph({ numbering: { reference: NUM_NUMERIC, level: 0 }, children: Array.isArray(c) ? c : [R(c)], spacing: { after: 80 } });
const Roman  = (c) => new Paragraph({ numbering: { reference: NUM_ROMAN,   level: 0 }, children: Array.isArray(c) ? c : [R(c)], spacing: { after: 60 } });
const Bullet = (c) => new Paragraph({ numbering: { reference: NUM_BULLET,  level: 0 }, children: Array.isArray(c) ? c : [R(c)], spacing: { after: 80 } });

// ════════════════════════════════════════════════════════════
// HEADER & FOOTER
// ════════════════════════════════════════════════════════════

function buildHeader(subtitle, logoData = null) {
  return new Header({
    children: [
      new Paragraph({
        children: [
          ...(logoData
            ? [new ImageRun({ data: logoData, transformation: { width: 132, height: 32 }, type: "png" })]
            : [new TextRun({ text: "bioERGOtech", color: TEAL_D, bold: true, font: "Times New Roman", size: 20 })]),
          new TextRun({ text: "        Memorandum of Understanding", color: GRAY, font: "Times New Roman", size: 18 }),
        ],
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: TEAL, space: 4 } },
        spacing: { after: 80 },
      }),
    ],
  });
}

function buildFooter() {
  return new Footer({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: "Fondazione bioERGOtech ETS  \u00B7  C.F. 90287640735  \u00B7  Via Ciro Giovinazzi 70, 74123 Taranto, Italy  \u00B7  info@bioergotech.org  \u00B7  bioergotech.org", color: GRAY, font: "Times New Roman", size: 16 }),
        ],
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 2, color: LT_GRAY, space: 4 } },
        spacing: { before: 80 },
      }),
    ],
  });
}

// ════════════════════════════════════════════════════════════
// TEMPLATES (same content as before, all 5 types)
// ════════════════════════════════════════════════════════════

const TEMPLATES = {
  university: {
    subtitle: "for Academic and Research Collaboration",
    partyLabel: "the University", tableHeader: "University",
    preambleDesc: () => [R("(hereinafter "), RBold('"the University"'), R("), established under the laws of "), RBlank(15), R(", with registered office at "), RBlank(20), R(", represented by "), RBlank(16), R(", in his/her capacity as "), RBlank(15), R(".")],
    preambleWhereas: () => [
      P([RBold("Whereas,"), R(" bioERGOtech is a foundation pursuing civic and social-utility purposes in the fields of scientific research, higher education, professional training, technological development, and healthcare innovation;")]),
      P([RBold("Whereas,"), R(" the University is an academic institution with recognised expertise in "), RBlank(20), R(", committed to education, research, and societal impact;")]),
      P([RBold("Whereas,"), R(" both Parties wish to establish a framework for cooperation based on principles of mutual benefit, reciprocity, and respect for each other's autonomy and regulatory obligations;")]),
      P([RBold("Now, therefore,"), R(" the Parties agree as follows.")]),
    ],
    art1: () => [Alpha("promote joint scientific research and applied research projects;"), Alpha("support the mobility of researchers, faculty, and students between the two institutions;"), Alpha("develop joint educational activities, including courses, workshops, seminars, and summer/winter schools;"), Alpha("facilitate co-supervised doctoral and postdoctoral research;"), Alpha("prepare and submit joint applications for competitive research funding at national, European, and international levels;"), Alpha("promote the exchange of scientific publications, data, and research methodologies;"), Alpha("explore technology transfer, valorisation of research results, and co-development of intellectual property where applicable;"), Alpha("organise joint public events, conferences, and dissemination activities.")],
    art2: () => [Alpha("biomedical and biotechnological research;"), Alpha("digital health and health informatics;"), Alpha("artificial intelligence and data science applied to medicine;"), Alpha("clinical and translational research;"), Alpha("public health and health policy;"), Alpha("professional and continuing education in health-related disciplines;"), Alpha("interdisciplinary innovation at the intersection of technology and healthcare.")],
    art3extra: () => [Num("Both Parties shall make reasonable efforts to provide their personnel with adequate time and resources to fulfil commitments undertaken within the framework of this MoU.")],
    art7Title: "Student and Staff Mobility",
    art7: () => [Num("The Parties may facilitate the exchange of students, researchers, and academic staff for study visits, research stays, and teaching assignments."), Num("The conditions of each exchange, including duration, financial support, academic recognition, and applicable regulations, shall be agreed in writing in advance."), Num("The hosting institution shall provide exchanged persons with reasonable access to its facilities and academic resources, in accordance with its own internal regulations."), Num("Each Party remains responsible for its own personnel in matters of employment law, social security, and insurance.")],
    art4extra: null,
    addendumTypes: ["Joint Research", "Student/Staff Exchange", "Educational Programme", "Grant Application", "Technology Transfer", "Conference/Event"],
    addendumFunding: ["No external funding", "Horizon Europe", "Erasmus+", "National grants", "Regional programmes"],
    addendumLeadLabel: "University Lead",
  },
  research_centre: {
    subtitle: "for Scientific and Applied Research Collaboration",
    partyLabel: "the Research Center", tableHeader: "Research Center",
    preambleDesc: () => [R("(hereinafter "), RBold('"the Research Center"'), R("), established under the laws of "), RBlank(15), R(", with registered office at "), RBlank(20), R(", represented by "), RBlank(16), R(", in his/her capacity as "), RBlank(15), R(".")],
    preambleWhereas: () => [
      P([RBold("Whereas,"), R(" bioERGOtech is a foundation pursuing civic and social-utility purposes in the fields of scientific research, technological development, digital health, and healthcare innovation;")]),
      P([RBold("Whereas,"), R(" the Research Center is a recognised institution with established expertise in "), RBlank(20), R(", dedicated to scientific discovery, applied research, and knowledge transfer to benefit society;")]),
      P([RBold("Whereas,"), R(" both Parties wish to establish a framework for cooperation based on principles of mutual benefit, reciprocity, open science, and respect for each other's autonomy and regulatory obligations;")]),
      P([RBold("Now, therefore,"), R(" the Parties agree as follows.")]),
    ],
    art1: () => [Alpha("promote joint scientific and applied research projects in shared thematic areas;"), Alpha("support the mobility of researchers, postdoctoral fellows, and technical staff;"), Alpha("facilitate the co-supervision of doctoral and postdoctoral researchers, including co-tutoring arrangements;"), Alpha("prepare and submit joint applications for competitive research funding at national, European, and international levels;"), Alpha("develop shared research infrastructures, methodologies, datasets, and computational resources;"), Alpha("promote the exchange of scientific publications, preprints, and research methodologies in the spirit of open science;"), Alpha("explore technology transfer, valorisation of research results, and co-development of intellectual property;"), Alpha("organise joint scientific events, workshops, and dissemination activities.")],
    art2: () => [Alpha("biomedical and biotechnological research;"), Alpha("digital health, biomedical informatics, and health data science;"), Alpha("artificial intelligence and machine learning applied to medicine and biology;"), Alpha("translational and clinical research, from bench to bedside;"), Alpha("omics sciences, including genomics, proteomics, and metabolomics;"), Alpha("development and validation of diagnostic, therapeutic, or monitoring tools;"), Alpha("public health, epidemiology, and health systems research;"), Alpha("interdisciplinary innovation at the intersection of engineering, biology, and healthcare.")],
    art3extra: () => [Num("Both Parties shall make reasonable efforts to provide their personnel with adequate time and resources to fulfil commitments undertaken within the framework of this MoU."), Num("Where activities involve the use of shared research infrastructure or equipment, conditions of access and liability shall be agreed in a dedicated addendum.")],
    art7Title: "Researcher Mobility and Exchange",
    art7: () => [Num("The Parties may facilitate the exchange of researchers, postdoctoral fellows, and technical staff for research stays, joint experiments, and scientific training visits."), Num("Co-tutoring arrangements for doctoral candidates may be established, whereby a researcher enrolled in a PhD programme at a partner university is supervised by qualified personnel from both the Research Center and bioERGOtech, under a dedicated addendum."), Num("The conditions of each exchange or co-tutoring arrangement shall be agreed in writing in advance."), Num("The hosting institution shall provide exchanged persons with reasonable access to its facilities and scientific resources."), Num("Each Party remains responsible for its own personnel in matters of employment law, social security, and insurance.")],
    art4extra: null,
    addendumTypes: ["Joint Research", "Researcher Exchange", "PhD Co-tutoring", "Grant Application", "Shared Infrastructure", "Conference/Workshop", "Software/Tool Development"],
    addendumFunding: ["No external funding", "Horizon Europe", "PNRR", "National grants", "Regional programmes"],
    addendumLeadLabel: "Research Center Lead",
  },
  hospital: {
    subtitle: "for Clinical Research Collaboration and Healthcare Innovation",
    partyLabel: "the Hospital", tableHeader: "Hospital",
    preambleDesc: () => [R("(hereinafter "), RBold('"the Hospital"'), R("), a healthcare institution established under the laws of "), RBlank(15), R(", with registered office at "), RBlank(20), R(", represented by "), RBlank(16), R(", in his/her capacity as "), RBlank(15), R(".")],
    preambleWhereas: () => [
      P([RBold("Whereas,"), R(" bioERGOtech is a foundation pursuing civic and social-utility purposes in the fields of scientific research, technological development, digital health, and healthcare innovation;")]),
      P([RBold("Whereas,"), R(" the Hospital is a recognised healthcare institution with established clinical expertise in "), RBlank(20), R(", dedicated to delivering high-quality patient care, clinical research, and the adoption of innovative medical solutions;")]),
      P([RBold("Whereas,"), R(" both Parties recognise that meaningful collaboration between technology developers, researchers, and clinical institutions is essential to translate innovation into practice;")]),
      P([RBold("Whereas,"), R(" both Parties wish to establish a framework for cooperation based on principles of clinical rigour, mutual benefit, patient safety, and respect for each other's regulatory and ethical obligations;")]),
      P([RBold("Now, therefore,"), R(" the Parties agree as follows.")]),
    ],
    art1: () => [Alpha("identify and document current clinical and operational challenges faced by the Hospital;"), Alpha("develop and evaluate technological tools, software systems, diagnostic methods, and clinical workflows;"), Alpha("conduct joint clinical and translational research, including analysis of retrospective and prospective patient data, subject to applicable ethics approvals;"), Alpha("facilitate the transfer of biological materials between clinical and research settings under formal agreements compliant with applicable legal and ethical requirements;"), Alpha("promote the training and professional development of clinical staff in digital health and emerging healthcare technologies;"), Alpha("prepare and submit joint applications for competitive research funding at national, European, and international levels;"), Alpha("facilitate access of bioERGOtech members to clinical expertise and operational knowledge of the Hospital's staff.")],
    art2: () => [Alpha("clinical and translational research, from bench to bedside and back;"), Alpha("digital health tools, clinical decision-support systems, and health informatics;"), Alpha("artificial intelligence and machine learning applied to clinical imaging, diagnostics, or patient monitoring;"), Alpha("analysis of clinical datasets, electronic health records, and patient cohort studies, subject to ethics approval;"), Alpha("development and validation of novel diagnostics, biomarkers, or therapeutic tools;"), Alpha("logistics and regulatory frameworks for the transport of biological materials under dedicated material transfer agreements;"), Alpha("patient safety, quality of care, and healthcare process optimisation;"), Alpha("continuing medical education and professional training in health technology.")],
    art3extra: () => [Num("All activities involving patient data, biological materials, or clinical trials shall require prior authorisation from the relevant ethics committee or institutional review board (IRB)."), Num("Both Parties shall ensure compliance with applicable healthcare regulations, including the European Clinical Trials Regulation (Reg. EU 536/2014), the GDPR, and national healthcare law.")],
    art7Title: "Biological Material Transfer",
    art7: () => [Num("Any transfer of biological materials between the Hospital and bioERGOtech or its research partners shall be governed exclusively by a dedicated Material Transfer Agreement (MTA), concluded as a specific addendum to this MoU or as a standalone agreement."), Num("Each MTA shall specify: the nature and quantity of the material, the permitted uses, storage and handling conditions, liability, applicable ethics authorisations, and the duration of the transfer."), Num("No biological material shall be transferred until all required ethics committee approvals, patient consents, and regulatory authorisations have been obtained in writing."), Num("Biological materials transferred under this MoU shall not be used for purposes other than those specified in the relevant MTA without express written consent of both Parties."), Num("Costs associated with packaging, transport, storage, and processing of biological materials shall be allocated as specified in the relevant MTA.")],
    art4extra: () => [Num("Where activities involve the transfer of biological materials or clinical datasets, any associated costs shall be governed by a dedicated material transfer agreement or data-sharing agreement.")],
    addendumTypes: ["Joint Clinical Research", "Data-Sharing Agreement", "Material Transfer Agreement", "Software/Tool Validation", "Clinical Training", "Grant Application"],
    addendumFunding: ["No external funding", "Horizon Europe", "PNRR", "National grants", "Regional programmes"],
    addendumLeadLabel: "Hospital Clinical Lead",
  },
  medical_association: {
    subtitle: "for Professional Collaboration, Consortium Development, and Healthcare Innovation",
    partyLabel: "the Association", tableHeader: "Medical Association",
    preambleDesc: () => [R("(hereinafter "), RBold('"the Association"'), R("), a medical or scientific professional association established under the laws of "), RBlank(15), R(", with registered office at "), RBlank(20), R(", representing healthcare professionals in the field of "), RBlank(15), R(", represented by "), RBlank(16), R(", in his/her capacity as "), RBlank(15), R(".")],
    preambleWhereas: () => [
      P([RBold("Whereas,"), R(" bioERGOtech is a foundation pursuing civic and social-utility purposes in the fields of scientific research, technological development, digital health, and healthcare innovation;")]),
      P([RBold("Whereas,"), R(" the Association is a recognised professional body representing healthcare professionals specialised in "), RBlank(20), R(", committed to the advancement of medical knowledge, professional standards, continuing education, and the improvement of patient care;")]),
      P([RBold("Whereas,"), R(" both Parties recognise that structured collaboration between innovative foundations and medical professional organisations is essential to accelerate the uptake of evidence-based technology in clinical practice;")]),
      P([RBold("Whereas,"), R(" both Parties wish to establish a framework for cooperation based on principles of professional integrity, mutual benefit, and respect for each other's regulatory and ethical obligations;")]),
      P([RBold("Now, therefore,"), R(" the Parties agree as follows.")]),
    ],
    art1: () => [Alpha("build and co-lead multi-institutional research and innovation consortia;"), Alpha("jointly develop, promote, and disseminate clinical practice guidelines, position statements, and consensus documents;"), Alpha("design and deliver continuing medical education (CME) programmes, workshops, and scientific conferences;"), Alpha("prepare and submit joint applications for competitive funding at national, European, and international levels;"), Alpha("facilitate structured access by bioERGOtech members to the clinical expertise and professional community of the Association's membership;"), Alpha("organise joint scientific events, symposia, and roundtables addressing technological innovation in clinical practice;"), Alpha("promote the development and adoption of clinical and digital health standards within the Association's professional community;"), Alpha("explore joint advocacy activities on health policy, digital health regulation, and research funding priorities.")],
    art2: () => [Alpha("development and leadership of multi-partner research consortia;"), Alpha("co-development of clinical guidelines, best-practice documents, and consensus statements on digital health, AI in medicine, and related topics;"), Alpha("continuing medical education and professional training in health technology;"), Alpha("joint scientific publications, systematic reviews, and meta-analyses;"), Alpha("joint organisation of congresses, symposia, and scientific sessions;"), Alpha("clinical validation and real-world evidence generation for digital health tools;"), Alpha("health policy engagement, regulatory affairs, and position papers;"), Alpha("member engagement programmes enabling individual clinicians to collaborate with bioERGOtech.")],
    art3extra: () => [Num("A joint steering committee, composed of at least two representatives from each Party, shall meet at least once per year."), Num("The Association may communicate bioERGOtech collaboration opportunities to its members, provided that participation remains entirely voluntary and non-binding for individual members.")],
    art7Title: "Consortium Development",
    art7: () => [Num("The Parties may jointly lead or participate in multi-institutional research or innovation consortia, serving complementary roles based on their respective competencies."), Num("When building a consortium for a specific funded project, the Parties shall jointly identify potential additional partners from among the Association's institutional members."), Num("The governance structure of each consortium shall be established in a dedicated consortium agreement prior to the submission of any joint funding application."), Num("The Association may facilitate introductions between bioERGOtech and individual member institutions or clinicians, provided that such participation is non-binding unless formalised in writing."), Num("The Parties shall coordinate their positioning regarding any jointly led consortium to ensure consistency and avoid conflicts of interest.")],
    art4extra: () => [Num("Where the Association acts as a dissemination or engagement partner for a funded project, the associated costs and deliverables shall be governed by a dedicated participation agreement.")],
    addendumTypes: ["Consortium Development", "Clinical Guidelines / Position Paper", "CME Programme", "Conference / Symposium", "Grant Application", "Member Engagement Programme", "Policy / Advocacy"],
    addendumFunding: ["No external funding", "Horizon Europe", "EU4Health", "National grants", "Private foundation"],
    addendumLeadLabel: "Association Lead",
  },
  patient_association: {
    subtitle: "for Patient-Centred Collaboration and Co-Development of Health Solutions",
    partyLabel: "the Association", tableHeader: "Patient Association",
    preambleDesc: () => [R("(hereinafter "), RBold('"the Association"'), R("), a patient association established under the laws of "), RBlank(15), R(", with registered office at "), RBlank(20), R(", represented by "), RBlank(16), R(", in his/her capacity as "), RBlank(15), R(".")],
    preambleWhereas: () => [
      P([RBold("Whereas,"), R(" bioERGOtech is a foundation pursuing civic and social-utility purposes in the fields of scientific research, technological development, digital health, and healthcare innovation, with a strong commitment to placing patients at the centre of its activities;")]),
      P([RBold("Whereas,"), R(" the Association is a recognised patient organisation representing persons affected by "), RBlank(20), R(", dedicated to improving the quality of life, rights, and healthcare access of its members;")]),
      P([RBold("Whereas,"), R(" both Parties share the conviction that meaningful collaboration between technologists, researchers, and patient communities is essential to develop tools and initiatives that genuinely respond to patients' lived needs;")]),
      P([RBold("Whereas,"), R(" both Parties wish to establish a framework for cooperation based on principles of co-design, mutual benefit, transparency, and respect for patient autonomy and privacy;")]),
      P([RBold("Now, therefore,"), R(" the Parties agree as follows.")]),
    ],
    art1: () => [Alpha("identify, through structured dialogue, the concrete needs, priorities, and challenges experienced by patients and caregivers;"), Alpha("co-develop digital tools, software applications, and technology-based solutions that address identified patient needs;"), Alpha("involve patient representatives meaningfully in the design, testing, and evaluation of any jointly developed tools;"), Alpha("organise joint events, workshops, and conferences that place the patient perspective at the centre;"), Alpha("develop joint educational and awareness-raising materials for patients, caregivers, and the general public;"), Alpha("support the Association's institutional capacity in areas such as digital literacy and health data rights;"), Alpha("explore joint advocacy activities and public communications on topics of shared concern;"), Alpha("facilitate access of bioERGOtech members to the expertise and lived experience of the Association's membership.")],
    art2: () => [Alpha("co-development of patient-facing software, mobile applications, and digital health tools;"), Alpha("collection and structured analysis of patient-reported outcomes and experiences, with full informed consent;"), Alpha("design and facilitation of patient advisory processes to inform research agendas;"), Alpha("development of plain-language scientific communication and health literacy resources;"), Alpha("organisation of patient-centred conferences, focus groups, and participatory workshops;"), Alpha("joint applications for public funding that includes patient and civil-society involvement;"), Alpha("promotion of patient data rights, digital inclusion, and access to innovative diagnostics or therapies.")],
    art3extra: () => [Num("A joint coordination meeting shall take place at least once every six months to review ongoing activities."), Num("All interactions involving patients or their personal data shall comply with applicable data protection law and shall be conducted with full respect for patient dignity and autonomy.")],
    art7Title: "Patient Engagement and Co-Design",
    art7: () => [Num("The Parties shall jointly establish a Patient Advisory Group (PAG) composed of patient and caregiver representatives nominated by the Association, to guide the co-development of any tools or initiatives under this MoU."), Num("The PAG shall be consulted at key stages of any project: needs identification, design, prototype testing, and evaluation of outcomes."), Num("Participation in the PAG shall be voluntary. Participants shall be informed of their role, rights, and any applicable data-processing activities before engagement."), Num("The Parties shall jointly produce accessible reports or summaries of project outcomes for the benefit of the Association's membership."), Num("Joint events and conferences shall be designed to be accessible and inclusive, with plain-language communication.")],
    art4extra: () => [Num("Any reimbursement of patient representatives for time or expenses shall follow applicable ethical and legal standards and shall not constitute commercial compensation for patient data.")],
    addendumTypes: ["Software/App Co-development", "Patient Needs Assessment", "Patient Advisory Group", "Joint Conference/Event", "Educational/Awareness Campaign", "Grant Application"],
    addendumFunding: ["No external funding", "Horizon Europe", "National grants", "Regional programmes"],
    addendumLeadLabel: "Association Lead",
  },
};

// ════════════════════════════════════════════════════════════
// SHARED ARTICLES
// ════════════════════════════════════════════════════════════

function art4Financial(tpl) {
  return [
    Num("This MoU does not, in itself, create any financial obligation for either Party."),
    Num("Financial arrangements related to specific activities shall be defined in separate written agreements or activity-specific addenda."),
    Num("Each Party shall bear its own administrative costs associated with the general implementation of this MoU, unless otherwise agreed in writing."),
    Num("The Parties may jointly seek external funding for collaborative activities. Financial roles and responsibilities shall be specified in the relevant project agreement."),
    ...(tpl.art4extra ? tpl.art4extra() : []),
  ];
}
function art5IP() { return [Num("Pre-existing intellectual property of each Party remains the exclusive property of the originating Party and shall not be affected by this MoU."), Num("Any intellectual property created jointly shall be jointly owned. Terms of its management, use, commercialisation, and revenue sharing shall be agreed in writing prior to the commencement of the relevant activity."), Num("Each Party shall promptly notify the other of any potentially jointly developed intellectual property and shall negotiate in good faith the terms of its protection and exploitation."), Num("Open-source licensing of jointly developed software tools may be agreed by the Parties as an alternative to commercial exploitation.")]; }
function art6Confidentiality() { return [Num("Each Party shall treat as confidential all non-public information received from the other Party and shall not disclose it to third parties without prior written consent."), Num("Confidential Information shall be used solely for the purposes of this MoU."), Num([RBold("This obligation survives the expiry or termination of this MoU for a period of three (3) years.")]), Num("The confidentiality obligation does not apply to information that:"), Roman("is or becomes publicly available through no fault of the receiving Party;"), Roman("was already known to the receiving Party prior to disclosure;"), Roman("is independently developed by the receiving Party without use of the Confidential Information;"), Roman("is required to be disclosed by law or order of a competent authority.")]; }
function art8Publications() { return [Num("Both Parties are encouraged to publish the results of joint work in peer-reviewed journals, subject to applicable confidentiality obligations and IP agreements."), Num("Each Party shall appropriately acknowledge the contribution of the other in any publications, presentations, or other dissemination outputs."), Num([R("Prior to submission of any joint publication, the submitting Party shall provide the other Party with a draft for review, with a reasonable response time of no less than "), RBold("fifteen (15) working days"), R(".")]), Num("The Parties shall mutually agree on author order and corresponding authorship prior to submission, following recognised scientific integrity standards.")]; }
function art9Addenda() { return [Num("Individual projects or activities carried out under this MoU may be governed by specific written agreements or addenda, which shall form an integral part of this MoU."), Num("Each addendum shall specify, at minimum: the objectives, the roles and responsibilities of each Party, the timeline, any financial arrangements, and applicable IP or data-protection provisions."), Num("Addenda shall be signed by duly authorised representatives of both Parties and shall prevail over this MoU in the event of conflict.")]; }

function art10Contacts(contact, tpl) {
  const colL = Math.round(CONTENT_W * 0.22);
  const colM = Math.round(CONTENT_W * 0.39);
  const colR = CONTENT_W - colL - colM;
  const pEmail = contact.email || "_______________";
  const pName  = contact.contact_person || "_______________";
  return [
    P("Each Party designates a primary point of contact responsible for coordinating activities under this MoU:"),
    PEmpty(),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [colL, colM, colR],
      rows: [
        new TableRow({ children: [TCNavy("", colL), TCNavy("Fondazione bioERGOtech ETS", colM), TCNavy(tpl.tableHeader, colR)] }),
        new TableRow({ children: [TCTeal("Name", colL), TC([P("Dott. Guido Putignano")], colM), TC([P(pName)], colR)] }),
        new TableRow({ children: [TCTeal("Title", colL), TC([P("President")], colM), TC([P([RBlank(18)])], colR)] }),
        new TableRow({ children: [TCTeal("Email", colL), TC([P("info@bioergotech.org")], colM), TC([P(pEmail)], colR)] }),
        new TableRow({ children: [TCTeal("Telephone", colL), TC([P("+393405258406")], colM), TC([P([RBlank(18)])], colR)] }),
      ],
    }),
    PEmpty(),
    P("Either Party may change its designated point of contact by giving written notice to the other Party."),
  ];
}

function art11Duration() { return [Num([R("This MoU enters into force on the date of the last signature below and shall remain valid for "), RBold("three (3) years"), R(", unless terminated earlier.")]), Num([R("Before expiry, the Parties may renew this MoU by mutual written agreement for successive periods of "), RBold("two (2) years"), R(" each.")]), Num("Activities ongoing at the time of expiry shall continue to be governed by this MoU until their natural conclusion.")]; }
function art12Termination() { return [Num([R("Either Party may terminate this MoU by giving "), RBold("sixty (60) days'"), R(" written notice to the other Party, without the need to state reasons.")]), Num("Termination shall not affect the completion of activities already underway under a specific addendum."), Num("Obligations of confidentiality and any IP arrangements already formalised remain in effect after termination.")]; }

function art13Logos() {
  return [
    Num("The Parties recognise that mutual promotion of this collaboration is in their shared interest. Each Party is therefore expressly authorised to display the other Party's name and logo in materials presenting the partnership, including institutional websites, press releases, event programmes, presentations, social media, and co-authored publications. No prior written consent is required for these uses."),
    Num([RBold("The following uses remain subject to prior written consent: ")]),
    Roman("any use that implies the other Party endorses a specific product, service, or commercial offering;"),
    Roman("use of the other Party's name or logo in paid advertising or commercially sponsored content;"),
    Roman("any modification of the other Party's logo that alters its colours, proportions, or visual identity."),
    Num("Each Party shall ensure that any display of the other Party's logo conforms to the visual identity guidelines provided by the logo owner."),
    Num([R("Upon expiry or termination, each Party shall cease prospective uses of the other Party's name and logo within "), RBold("thirty (30) days"), R(".")]),
  ];
}

function art14DataProtection() { return [Num("The Parties shall process any personal data in full compliance with Regulation (EU) 2016/679 (GDPR) and applicable Italian data protection legislation."), Num("Each Party acts as an independent data controller, unless otherwise agreed in writing."), Num("Where activities involve joint processing of personal data, the Parties shall enter into a dedicated Data Processing Agreement or Joint Controllership Agreement prior to commencement."), Num("Given the biomedical nature of the collaboration, health data (Article 9 GDPR) shall be subject to enhanced safeguards, including appropriate legal bases, data minimisation, and security measures."), Num("The Parties shall implement appropriate technical and organisational security measures in accordance with Article 32 GDPR."), Num([R("In the event of a personal data breach, the Party that becomes aware shall notify the other within "), RBold("forty-eight (48) hours"), R(".")])];
}
function art15ForceMajeure() { return [Num([R("Neither Party shall be liable for any failure or delay caused by circumstances beyond its reasonable control, including acts of God, pandemics, war, governmental actions, or failure of essential third-party infrastructure ("), RBold('"Force Majeure Event"'), R(").")]), Num("The affected Party shall notify the other as soon as reasonably practicable, describing the nature and expected duration."), Num([R("If a Force Majeure Event continues for more than "), RBold("ninety (90) days"), R(", either Party may terminate this MoU without liability.")])]; }
function art16Liability() { return [Num("Neither Party shall be liable to the other for any indirect, incidental, consequential, or punitive damages arising from this MoU, including loss of revenue, data, or scientific opportunity."), Num("Each Party's aggregate liability shall not exceed the total direct costs actually incurred in connection with the specific activity giving rise to the claim."), Num("Nothing in this Article limits liability for: (i) death or personal injury caused by negligence; (ii) fraud or fraudulent misrepresentation; (iii) wilful misconduct; or (iv) any liability that cannot be limited by applicable law.")]; }

function art17General() {
  return [
    Num([RBold("Non-binding nature. "), R("This MoU expresses the mutual intention of the Parties to cooperate and does not create legally binding obligations beyond those expressly stated herein.")]),
    Num([RBold("Non-exclusivity. "), R("Each Party retains the right to enter into similar agreements with other institutions.")]),
    Num([RBold("No employment or agency. "), R("Nothing in this MoU creates any employment, partnership, agency, or joint-venture relationship.")]),
    Num([RBold("Amendments. "), R("Any modification must be agreed in writing and signed by duly authorised representatives of both Parties.")]),
    Num([RBold("Entire agreement. "), R("This MoU, together with its addenda, constitutes the entire agreement between the Parties with respect to its subject matter.")]),
    Num([RBold("Governing law. "), R("This MoU shall be governed by and construed in accordance with Italian law.")]),
    Num([RBold("Dispute resolution. "), R("Disputes shall first be referred to the respective points of contact for amicable settlement. If unresolved within thirty (30) days, the matter shall be submitted to the competent courts of Taranto, Italy.")]),
    Num([RBold("Language. "), R("This MoU is executed in English. The English version shall prevail in case of discrepancy with any translation.")]),
    Num([RBold("Severability. "), R("If any provision is found invalid or unenforceable, the remaining provisions shall continue in full force and effect.")]),
  ];
}

// ── BRANDED SIGNATURE BLOCK ────────────────────────────────

function signatureBlock(contact, tpl) {
  const instName = contact.name || "_______________";
  const colL = Math.round(CONTENT_W * 0.48);
  const colS = Math.round(CONTENT_W * 0.04);
  const colR = CONTENT_W - colL - colS;

  return [
    PEmpty(), PEmpty(),
    new Paragraph({
      children: [],
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: TEAL, space: 1 } },
    }),
    PEmpty(),
    P("IN WITNESS WHEREOF, the duly authorised representatives of the Parties have executed this Memorandum of Understanding."),
    PEmpty(), PEmpty(),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [colL, colS, colR],
      rows: [
        new TableRow({ children: [TCNo([P([new TextRun({ text: "Fondazione bioERGOtech ETS", color: BRAND_TEXT, bold: true, font: "Times New Roman", size: 24 })])], colL), TCNo([], colS), TCNo([P([new TextRun({ text: instName, color: BRAND_TEXT, bold: true, font: "Times New Roman", size: 24 })])], colR)] }),
        new TableRow({ children: [TCNo([PEmpty(), PEmpty()], colL), TCNo([], colS), TCNo([PEmpty(), PEmpty()], colR)] }),
        new TableRow({ children: [TCNo([new Paragraph({ children: [R("_".repeat(36))], border: { bottom: { style: BorderStyle.NONE } } })], colL), TCNo([], colS), TCNo([new Paragraph({ children: [R("_".repeat(36))] })], colR)] }),
        new TableRow({ children: [TCNo([P([RTeal("Dott. Guido Putignano", true)])], colL), TCNo([], colS), TCNo([P([RBlank(22)])], colR)] }),
        new TableRow({ children: [TCNo([P("President")], colL), TCNo([], colS), TCNo([P([RBlank(22)])], colR)] }),
        new TableRow({ children: [TCNo([PEmpty()], colL), TCNo([], colS), TCNo([PEmpty()], colR)] }),
        new TableRow({ children: [TCNo([P([R("Place: "), RBlank(14)])], colL), TCNo([], colS), TCNo([P([R("Place: "), RBlank(14)])], colR)] }),
        new TableRow({ children: [TCNo([P([R("Date:  "), RBlank(14)])], colL), TCNo([], colS), TCNo([P([R("Date:  "), RBlank(14)])], colR)] }),
      ],
    }),
    PEmpty(), PEmpty(),
    new Paragraph({
      children: [],
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: TEAL, space: 1 } },
    }),
  ];
}

// ── BRANDED ADDENDUM ──────────────────────────────────────

function addendumTemplate(contact, tpl) {
  const instName = contact.name || "_______________";
  const col1 = Math.round(CONTENT_W * 0.30);
  const col2 = CONTENT_W - col1;
  const blankRow = (label) =>
    new TableRow({ children: [TCTeal(label, col1), TC([PEmpty()], col2)] });

  return [
    new Paragraph({ children: [], pageBreakBefore: true }),
    PEmpty(),
    new Paragraph({ children: [], border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: TEAL, space: 1 } } }),
    PEmpty(),
    PCentered([new TextRun({ text: "ADDENDUM No. ", color: BRAND_TEXT, bold: true, font: "Times New Roman", size: 28 }), RBlank(8)]),
    PCentered([new TextRun({ text: "to the Memorandum of Understanding of ", color: GRAY, font: "Times New Roman", size: 22 }), RBlank(14)]),
    PEmpty(),
    new Paragraph({ children: [], border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: TEAL, space: 1 } } }),
    PEmpty(),
    P([R("This Addendum is concluded pursuant to Article 9 of the MoU signed between "), new TextRun({ text: "Fondazione bioERGOtech ETS", color: BRAND_TEXT, bold: true, font: "Times New Roman", size: 24 }), R(" and "), RBlank(22), R(" and forms an integral part thereof.")]),
    PEmpty(),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [col1, col2],
      rows: [
        new TableRow({ children: [new TableCell({ columnSpan: 2, borders: cellBorders, shading: { fill: BRAND_TEXT, type: ShadingType.CLEAR }, width: { size: CONTENT_W, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [P([new TextRun({ text: "Activity Details", color: "FFFFFF", bold: true, font: "Times New Roman", size: 24 })], { alignment: AlignmentType.CENTER })] })] }),
        blankRow("Title of Activity"),
        new TableRow({ children: [TCTeal("Type of Activity", col1), TC([P(tpl.addendumTypes.join("   "))], col2)] }),
        blankRow("Start Date"),
        blankRow("End Date"),
        blankRow("bioERGOtech Lead"),
        blankRow(tpl.addendumLeadLabel),
        new TableRow({ children: [TCTeal("Funding", col1), TC([P(tpl.addendumFunding.join("   "))], col2)] }),
        new TableRow({ children: [TCTeal("Budget", col1), TC([P([R("Total: €"), RBlank(8), R("   bioERGOtech: €"), RBlank(8), R("   Partner: €"), RBlank(8)])], col2)] }),
      ],
    }),
    PEmpty(),
    P([new TextRun({ text: "Description of the Activity:", color: BRAND_TEXT, bold: true, font: "Times New Roman", size: 24 })]),
    P([RBlank(60)]), P([RBlank(60)]), P([RBlank(60)]),
    PEmpty(),
    P([new TextRun({ text: "Roles and Responsibilities:", color: BRAND_TEXT, bold: true, font: "Times New Roman", size: 24 })]),
    P([RBlank(60)]), P([RBlank(60)]),
    PEmpty(),
    P([new TextRun({ text: "Expected Outputs and Dissemination:", color: BRAND_TEXT, bold: true, font: "Times New Roman", size: 24 })]),
    P([RBlank(60)]), P([RBlank(60)]),
    PEmpty(),
    P([new TextRun({ text: "Specific IP and Data-Protection Provisions:", color: BRAND_TEXT, bold: true, font: "Times New Roman", size: 24 })]),
    P([RBlank(60)]), P([RBlank(60)]),
    PEmpty(), PEmpty(),
    ...signatureBlock(contact, tpl).slice(2),
  ];
}

// ════════════════════════════════════════════════════════════
// MAIN DOCUMENT BUILDER
// ════════════════════════════════════════════════════════════

function buildMoU(contact, templateKey, logoData = null, includeAddendum = true) {
  const tpl = TEMPLATES[templateKey];
  if (!tpl) throw new Error(`Unknown template: ${templateKey}`);

  const instName = contact.name    || "_______________";
  const country  = contact.country || "_______________";
  const mouRef   = `bioERGOtech/MoU/${new Date().getFullYear()}/${String(Math.floor(Math.random()*9000)+1000)}`;

  const art3Items = [
    Num("Specific activities shall be planned jointly, with each Party designating the relevant staff responsible for their execution."),
    Num("The Parties shall communicate regularly and review the status of ongoing activities at least once per year."),
    Num("Either Party may propose new activities at any time; these shall become effective upon written confirmation by both Parties."),
    ...(tpl.art3extra ? tpl.art3extra() : []),
  ];

  const children = [
    // ── BRANDED COVER PAGE ─────────────────────────────────
    PEmpty(), PEmpty(),
    LogoParagraph(227, 56, AlignmentType.CENTER, logoData),
    PEmpty(),
    new Paragraph({ children: [], border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: TEAL, space: 1 } } }),
    PEmpty(),
    PCentered([new TextRun({ text: "MEMORANDUM OF UNDERSTANDING", color: BRAND_TEXT, bold: true, font: "Times New Roman", size: 36 })]),
    PEmpty(),
    PCentered([new TextRun({ text: tpl.subtitle, color: GRAY, font: "Times New Roman", size: 24 })]),
    PEmpty(),
    new Paragraph({ children: [], border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: TEAL, space: 1 } } }),
    PEmpty(), PEmpty(),
    PCentered([R("between")]),
    PEmpty(),
    PCentered([new TextRun({ text: "Fondazione bioERGOtech ETS", color: BRAND_TEXT, bold: true, font: "Times New Roman", size: 30 })]),
    PCentered([new TextRun({ text: "Taranto, Italy", color: GRAY, font: "Times New Roman", size: 22 })]),
    PEmpty(),
    PCentered([new TextRun({ text: "and", color: GRAY, font: "Times New Roman", size: 24 })]),
    PEmpty(),
    PCentered([new TextRun({ text: instName, color: BRAND_TEXT, bold: true, font: "Times New Roman", size: 28 })]),
    PCentered([new TextRun({ text: country, color: GRAY, font: "Times New Roman", size: 22 })]),
    PEmpty(), PEmpty(), PEmpty(),

    // Reference box
    new Table({
      width: { size: Math.round(CONTENT_W * 0.7), type: WidthType.DXA },
      columnWidths: [Math.round(CONTENT_W * 0.28), Math.round(CONTENT_W * 0.42)],
      rows: [
        new TableRow({ children: [TCTeal("MoU Reference", Math.round(CONTENT_W * 0.28)), TC([P(mouRef)], Math.round(CONTENT_W * 0.42))] }),
        new TableRow({ children: [TCTeal("Date of Signature", Math.round(CONTENT_W * 0.28)), TC([P([RBlank(16)])], Math.round(CONTENT_W * 0.42))] }),
        new TableRow({ children: [TCTeal("Duration", Math.round(CONTENT_W * 0.28)), TC([P("Three (3) years from date of signature")], Math.round(CONTENT_W * 0.42))] }),
      ],
    }),

    // ── PREAMBLE ───────────────────────────────────────────
    new Paragraph({ children: [], pageBreakBefore: true }),
    SectionHeading("Preamble"),
    P("This Memorandum of Understanding (\"MoU\") is entered into between:"),
    PEmpty(),
    Bullet([new TextRun({ text: "Fondazione bioERGOtech ETS", color: BRAND_TEXT, bold: true, font: "Times New Roman", size: 24 }), R(" (hereinafter "), RBold('"bioERGOtech"'), R("), a non-profit foundation established on 12 April 2025, registered in Taranto, Italy (Fiscal Code 90287640735), governed by the Italian Third Sector Code (D.Lgs. 117/2017), with registered office at Via Ciro Giovinazzi 70, 74123 Taranto, Italy, represented by its President, Dott. Guido Putignano;")]),
    Bullet([new TextRun({ text: instName, color: BRAND_TEXT, bold: true, font: "Times New Roman", size: 24 }), R(" "), ...tpl.preambleDesc()]),
    PEmpty(),
    P([R("Hereinafter referred to individually as a "), RBold('"Party"'), R(" and collectively as the "), RBold('"Parties"'), R(".")]),
    PEmpty(),
    ...tpl.preambleWhereas(),

    // ── ARTICLES ───────────────────────────────────────────
    ArticleHeading(1,  "Objectives"),           P("The Parties intend to cooperate in order to:"), ...tpl.art1(),
    ArticleHeading(2,  "Areas of Collaboration"), P("Collaboration under this MoU may encompass, without limitation, the following thematic areas:"), ...tpl.art2(), P("The specific scope of each collaborative activity shall be defined by mutual agreement and, where appropriate, formalised in a written addendum to this MoU (see Article 9)."),
    ArticleHeading(3,  "Implementation"),       ...art3Items,
    ArticleHeading(4,  "Financial Arrangements"), ...art4Financial(tpl),
    ArticleHeading(5,  "Intellectual Property"), ...art5IP(),
    ArticleHeading(6,  "Confidentiality"),      ...art6Confidentiality(),
    ArticleHeading(7,  tpl.art7Title),          ...tpl.art7(),
    ArticleHeading(8,  "Publications and Attribution"), ...art8Publications(),
    ArticleHeading(9,  "Specific Agreements and Addenda"), ...art9Addenda(),
    ArticleHeading(10, "Points of Contact"),    ...art10Contacts(contact, tpl),
    ArticleHeading(11, "Duration and Renewal"), ...art11Duration(),
    ArticleHeading(12, "Termination"),          ...art12Termination(),
    ArticleHeading(13, "Use of Names and Logos"), ...art13Logos(),
    ArticleHeading(14, "Data Protection"),      ...art14DataProtection(),
    ArticleHeading(15, "Force Majeure"),        ...art15ForceMajeure(),
    ArticleHeading(16, "Limitation of Liability"), ...art16Liability(),
    ArticleHeading(17, "General Provisions"),   ...art17General(),

    // ── SIGNATURE ──────────────────────────────────────────
    ...signatureBlock(contact, tpl),

    // ── ADDENDUM ───────────────────────────────────────────
    ...(includeAddendum ? addendumTemplate(contact, tpl) : []),
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
        titlePage: true,
        page: {
          size: { width: PAGE_W, height: 16838 },
          margin: { top: MARGIN, bottom: MARGIN + 400, left: MARGIN, right: MARGIN },
        },
      },
      headers: {
        default: buildHeader(tpl.subtitle, logoData),
        first: new Header({ children: [] }),    // no header on cover
      },
      footers: {
        default: buildFooter(),
        first: new Footer({ children: [] }),    // no footer on cover
      },
      children,
    }],
  });
}

// POST /api/admin/outreach/mou/send
export async function POST(req: NextRequest) {
  try {
    const { contactId, includeAddendum = true } = await req.json();
    if (!contactId) return NextResponse.json({ error: "contactId required" }, { status: 400 });

    const db = getDB();
    const { data: contact, error } = await db
      .from("outreach_contacts")
      .select("id, name, email, country, contact_person, field_of_interest, category, type, city")
      .eq("id", contactId)
      .single();

    if (error || !contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    if (!contact.email) return NextResponse.json({ error: "Contact has no email address" }, { status: 400 });

    // Detect template and generate document directly
    const templateKey = (() => {
      const cat = ((contact.category || contact.type || "")).toLowerCase();
      if (cat.includes("universit") || cat.includes("college") || cat.includes("faculty")) return "university";
      if (cat.includes("hospital") || cat.includes("clinic") || cat.includes("chu")) return "hospital";
      if (cat.includes("patient")) return "patient_association";
      if (cat.includes("medical") || cat.includes("society") || cat.includes("order")) return "medical_association";
      return "research_centre";
    })();

    let logoData = null;
    try {
      const logoPath = path.join(process.cwd(), "public", "assets", "images", "Logo", "bioergotech-logo.png");
      if (fs.existsSync(logoPath)) logoData = fs.readFileSync(logoPath);
    } catch { /* logo optional */ }

    const doc    = buildMoU(contact, templateKey, logoData, includeAddendum);
    const buffer = await Packer.toBuffer(doc);
    const safeName = (contact.name || "Partner").replace(/[^a-zA-Z0-9\s-]/g, "").trim().replace(/\s+/g, "_").slice(0, 40);
    const filename = `bioERGOtech_MoU_${safeName}_${new Date().getFullYear()}.docx`;

    // Greeting name
    const contactName = (contact.contact_person || "")
      .split(",")[0].split(" — ")[0].split(" - ")[0].trim() || "Sir/Madam";

    const subject = `Memorandum of Understanding — bioERGOtech Foundation × ${(contact.name || "").slice(0, 55)}`.slice(0, 100);
    const body = `Dear ${contactName},

Following our recent conversation, I am pleased to share the draft Memorandum of Understanding between ${contact.name} and the bioERGOtech Foundation.

The document outlines the proposed framework for our collaboration. This MoU does not create binding financial obligations at this stage — it formalises our mutual intent to work together as we develop joint initiatives.

Please review the document at your convenience. If you have any comments or questions, do not hesitate to contact me. Once both parties are satisfied, we can arrange for formal signatures.

I look forward to building this collaboration with you.

With warm regards,

Guido Putignano
President, bioERGOtech Foundation
info@bioergotech.org
bioergotech.org`;

    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "outreach@bioergotech.org";
    const alertEmail = process.env.ALERT_EMAIL;
    if (!resendKey) return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });

    const sendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${resendKey}` },
      body: JSON.stringify({
        from:        `Guido Putignano · bioERGOtech Foundation <${fromEmail}>`,
        to:          [contact.email],
        cc:          alertEmail ? [alertEmail] : [],
        subject,
        text:        body,
        attachments: [{ filename, content: buffer.toString("base64") }],
      }),
    });

    if (!sendRes.ok) {
      const err = await sendRes.json();
      return NextResponse.json({ error: `Send failed: ${err.message || JSON.stringify(err)}` }, { status: 500 });
    }

    await db.from("outreach_contacts").update({ mou_status: "MoU Sent", email_status: "MoU Sent" }).eq("id", contactId);
    await db.from("outreach_sends").insert({ contact_email: contact.email, contact_name: contact.name, country: contact.country, subject, body_preview: body.slice(0, 200), status: "sent" });

    return NextResponse.json({ success: true, message: `MoU sent to ${contact.email}` });

  } catch (e) {
    console.error("[MoU Send Error]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Send failed" }, { status: 500 });
  }
}
