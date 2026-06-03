import { ReportData } from "./GicPrototypeClient";

// ── COLOURS ───────────────────────────────────────────────────
const NAVY    = [11,  37,  69]  as [number, number, number];
const TEAL    = [13, 126, 138]  as [number, number, number];
const BLACK   = [0,   0,   0]   as [number, number, number];
const DARK    = [30,  30,  30]  as [number, number, number];
const GRAY    = [100,100, 100]  as [number, number, number];
const LGRAY   = [210,210, 210]  as [number, number, number];
const WHITE   = [255,255, 255]  as [number, number, number];
const AMBER   = [160,  80,   0] as [number, number, number];
const AMBERBG = [255, 248, 225] as [number, number, number];
const TEALBG  = [230, 245, 247] as [number, number, number];
const NAVYBG  = [235, 240, 248] as [number, number, number];
const ROWBG   = [248, 249, 250] as [number, number, number];

const PAGE_W    = 210;
const PAGE_H    = 297;
const MARGIN    = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;
const HEADER_H  = 42;   // total height of header block
const FOOTER_Y  = PAGE_H - 18;
const CONTENT_START = HEADER_H + 6; // first content y after header

// ── CLEAN TEXT ────────────────────────────────────────────────
function cleanText(text: string): string {
  return text
    .replace(/<details[^>]*>/gi, "")
    .replace(/<\/details>/gi, "")
    .replace(/<summary[^>]*>([\s\S]*?)<\/summary>/gi, "")
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "$1")
    .replace(/<sub[^>]*>([\s\S]*?)<\/sub>/gi, "$1")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\(pag\.\s*XX\)/gi, "")
    .replace(/\(p\.\s*XX\)/gi, "")
    .replace(/\*+/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ── PARSE REPORT INTO SECTIONS ────────────────────────────────
type Section = { title: string; lines: string[] };

function parseReport(text: string): Section[] {
  const clean = cleanText(text);
  const lines = clean.split("\n").map(l => l.trim()).filter(Boolean);
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const line of lines) {
    const isHeader =
      line.match(/^[\d]+\.\s+[A-ZÀÈÉÌÒÙ]/i) ||
      line.match(/^(SINTESI|PROPOSTA|INDAGINI|NOTE PER|RACCOMANDAZIONE GIC|RIASSUNTO)/i) ||
      line.match(/^#+\s+/);

    if (isHeader) {
      if (current) sections.push(current);
      current = {
        title: line
          .replace(/^#+\s*/, "")
          .replace(/^[\d]+\.\s+/, "")
          .replace(/\*+/g, "")
          .toUpperCase()
          .trim(),
        lines: [],
      };
    } else if (current) {
      if (!line.match(/^[-=]{3,}/) && !line.match(/^\|[\s\-\|]+\|$/)) {
        current.lines.push(line);
      }
    } else {
      if (!current) {
        current = { title: "SCHEDA GIC ONCOLOGICA", lines: [] };
      }
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);

  if (sections.length === 0 && clean.length > 0) {
    return [{
      title: "SCHEDA GIC ONCOLOGICA",
      lines: clean.split("\n").map(l => l.trim()).filter(Boolean)
    }];
  }

  return sections;
}

// ── WRAP TEXT ─────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrapText(pdf: any, text: string, maxWidth: number): string[] {
  return pdf.splitTextToSize(text, maxWidth);
}

// ── DRAW HEADER (matches ASL VCO document style) ──────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawHeader(pdf: any, date: string, pageNum: number, totalPages: number) {

  // ── Top institution bar ──
  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, PAGE_W, 20, "F");

  // Left — ASL VCO name
  pdf.setTextColor(...WHITE);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("A.S.L. V.C.O.", MARGIN, 9);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.text("Azienda Sanitaria Locale del Verbano Cusio Ossola", MARGIN, 14);

  // Right — contact info
  pdf.setFontSize(7);
  pdf.setTextColor(180, 200, 220);
  pdf.text("Sede: Via Mazzini, 117 – 28887 Omegna (VB)", PAGE_W - MARGIN, 8, { align: "right" });
  pdf.text("Tel. +39 0323.5411  |  e-mail: protocollo@pec.aslvco.it", PAGE_W - MARGIN, 13, { align: "right" });
  pdf.text("www.aslvco.it", PAGE_W - MARGIN, 18, { align: "right" });

  // ── Centre Accoglienza title block ──
  pdf.setFillColor(245, 248, 252);
  pdf.rect(0, 20, PAGE_W, 16, "F");
  pdf.setDrawColor(...LGRAY);
  pdf.setLineWidth(0.3);
  pdf.line(0, 36, PAGE_W, 36);

  pdf.setTextColor(...NAVY);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("Centro Accoglienza e Servizi — Oncologia", PAGE_W / 2, 27, { align: "center" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...TEAL);
  pdf.text("SCHEDA GIC — PRE-ANALISI AI  ·  AIOM 2024 + ESMO Guidelines  ·  Supporto Decisionale", PAGE_W / 2, 33, { align: "center" });

  // ── Page / date bar ──
  pdf.setFillColor(...ROWBG);
  pdf.rect(0, 36, PAGE_W, 7, "F");
  pdf.setTextColor(...GRAY);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.text(date, MARGIN, 41);
  pdf.text(`Pagina ${pageNum} di ${totalPages}`, PAGE_W - MARGIN, 41, { align: "right" });

  pdf.setTextColor(...BLACK);
}

// ── DRAW FOOTER ───────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawFooter(pdf: any, date: string, pageNum: number, totalPages: number) {
  const y = FOOTER_Y;

  pdf.setDrawColor(...LGRAY);
  pdf.setLineWidth(0.3);
  pdf.line(MARGIN, y, PAGE_W - MARGIN, y);

  // Left — disclaimer
  pdf.setFontSize(6.5);
  pdf.setTextColor(...GRAY);
  pdf.setFont("helvetica", "normal");
  pdf.text(
    "Documento generato da AI  ·  Solo supporto decisionale  ·  Autorità clinica al panel GIC  ·  Non sostituisce il giudizio clinico",
    MARGIN,
    y + 4
  );
  pdf.text(`${date}  ·  Pagina ${pageNum} di ${totalPages}`, MARGIN, y + 8);

  // Right — signature area
  pdf.setDrawColor(...LGRAY);
  pdf.line(PAGE_W - MARGIN - 52, y + 6, PAGE_W - MARGIN, y + 6);
  pdf.setFontSize(7);
  pdf.setTextColor(...NAVY);
  pdf.setFont("helvetica", "bold");
  pdf.text("Dirigente Medico", PAGE_W - MARGIN - 26, y + 11, { align: "center" });

  pdf.setTextColor(...BLACK);
}

// ── DRAW SECTION ──────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawSection(
  pdf: any,
  section: Section,
  startY: number,
  date: string,
  getPage: () => number,
  getTotalPages: () => number,
  addPage: () => void
): number {
  let y = startY;

  const checkPage = (neededHeight = 8) => {
    if (y + neededHeight > FOOTER_Y - 4) {
      drawFooter(pdf, date, getPage(), getTotalPages());
      addPage();
      drawHeader(pdf, date, getPage(), getTotalPages());
      y = CONTENT_START;
    }
  };

  checkPage(12);

  // ── Section title bar ──
  pdf.setFillColor(...NAVY);
  pdf.rect(MARGIN, y, CONTENT_W, 7.5, "F");
  pdf.setTextColor(...WHITE);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  pdf.text(section.title, MARGIN + 3, y + 5.2);
  pdf.setTextColor(...BLACK);
  y += 9;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);

  for (const line of section.lines) {

    // Skip markdown table separators
    if (line.match(/^\|[\s\-\|]+\|$/)) continue;

    // Markdown table row
    if (line.startsWith("|") && line.endsWith("|")) {
      const cells = line.split("|").filter(c => c.trim()).map(c => c.trim());
      if (cells.length >= 2) {
        checkPage(8);
        const colW = CONTENT_W / cells.length;
        const isHeaderRow = cells.some(c =>
          c.match(/^(Indagine|Necessità|Riferimento|Investigation)/i)
        );
        pdf.setDrawColor(...LGRAY);
        pdf.setLineWidth(0.2);
        if (isHeaderRow) {
          pdf.setFillColor(...NAVYBG);
        } else {
          pdf.setFillColor(...ROWBG);
        }
        cells.forEach((cell, j) => {
          const cx = MARGIN + j * colW;
          pdf.rect(cx, y, colW, 6, "FD");
          pdf.setFont("helvetica", isHeaderRow ? "bold" : "normal");
          pdf.setFontSize(7.5);
          pdf.setTextColor(...(isHeaderRow ? NAVY : DARK));
          pdf.text(cell.substring(0, 38), cx + 1.5, y + 4.2);
        });
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...BLACK);
        y += 7;
      }
      continue;
    }

    // Warning / missing investigation line
    if (line.match(/[⚠❗]/) || line.toLowerCase().includes("mancante")) {
      const content = line.replace(/^[>⚠❗→\-\*•]\s*/, "");
      const wrapped = wrapText(pdf, content, CONTENT_W - 8);
      const boxH = wrapped.length * 4.5 + 5;
      checkPage(boxH + 2);

      pdf.setFillColor(...AMBERBG);
      pdf.setDrawColor(...AMBER);
      pdf.setLineWidth(0.6);
      pdf.rect(MARGIN, y, CONTENT_W, boxH, "FD");
      pdf.setLineWidth(0.2);

      pdf.setTextColor(...AMBER);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8.5);
      wrapped.forEach((wl, wi) => {
        pdf.text(wl, MARGIN + 3, y + 4.5 + wi * 4.5);
      });
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...BLACK);
      y += boxH + 2;
      continue;
    }

    // Reference / citation box (blockquote or AIOM/ESMO source)
    if (
      line.startsWith(">") ||
      line.match(/^(Fonte:|Raccomandazione AIOM|Raccomandazione ESMO|Riferimento ESMO|Riferimento:)/i)
    ) {
      const content = line.replace(/^>\s*[-–]?\s*/, "");
      const wrapped = wrapText(pdf, content, CONTENT_W - 8);
      const boxH = wrapped.length * 4.5 + 5;
      checkPage(boxH + 2);

      pdf.setFillColor(...TEALBG);
      pdf.setDrawColor(...TEAL);
      pdf.setLineWidth(1.2);
      pdf.line(MARGIN, y, MARGIN, y + boxH);
      pdf.setLineWidth(0.2);
      pdf.setFillColor(...TEALBG);
      pdf.rect(MARGIN + 0.5, y, CONTENT_W - 0.5, boxH, "F");

      pdf.setTextColor(...NAVY);
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(8.5);
      wrapped.forEach((wl, wi) => {
        pdf.text(wl, MARGIN + 4, y + 4.5 + wi * 4.5);
      });
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...BLACK);
      y += boxH + 2;
      continue;
    }

    // Bullet / list items
    if (line.match(/^[→•\-\*]\s/) || line.match(/^[\d]+\.\s/)) {
      const content = line.replace(/^[→•\-\*]\s+/, "").replace(/^[\d]+\.\s+/, "");
      const wrapped = wrapText(pdf, content, CONTENT_W - 8);
      const neededH = wrapped.length * 4.5 + 3;
      checkPage(neededH);

      pdf.setTextColor(...TEAL);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text("→", MARGIN + 1, y + 4.5);

      pdf.setTextColor(...DARK);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      wrapped.forEach((wl, wi) => {
        pdf.text(wl, MARGIN + 6, y + 4.5 + wi * 4.5);
      });
      y += neededH + 1;
      continue;
    }

    // Horizontal rules
    if (line.match(/^[-=]{3,}/)) {
      checkPage(4);
      pdf.setDrawColor(...LGRAY);
      pdf.setLineWidth(0.3);
      pdf.line(MARGIN, y + 2, PAGE_W - MARGIN, y + 2);
      y += 5;
      continue;
    }

    // Normal paragraph
    const wrapped = wrapText(pdf, line, CONTENT_W);
    const neededH = wrapped.length * 4.5 + 2;
    checkPage(neededH);

    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...DARK);
    wrapped.forEach((wl, wi) => {
      pdf.text(wl, MARGIN, y + 4.5 + wi * 4.5);
    });
    y += neededH + 1;
  }

  return y + 3;
}

// ── MAIN EXPORT ───────────────────────────────────────────────
export async function generateGicPDF(data: ReportData): Promise<void> {
  const { default: jsPDF } = await import("jspdf");

  const date = new Date(data.timestamp).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const sections = parseReport(data.report);
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  let currentPage = 1;
  // We will fix total pages at the end
  const PLACEHOLDER_TOTAL = 99;

  const getPage    = () => pdf.getNumberOfPages();
  const addPage    = () => { pdf.addPage(); currentPage++; };
  const getTotal   = () => pdf.getNumberOfPages();

  // ── DRAW PAGE 1 HEADER ────────────────────────────────────────
  drawHeader(pdf, date, 1, PLACEHOLDER_TOTAL);

  // ── PATIENT / DOCUMENT INFO BOX ──────────────────────────────
  let y = CONTENT_START;

  pdf.setFillColor(...NAVYBG);
  pdf.setDrawColor(...LGRAY);
  pdf.setLineWidth(0.3);
  pdf.rect(MARGIN, y, CONTENT_W, 10, "FD");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...NAVY);
  pdf.text("ASL VCO — Rete Oncologica  ·  Gruppo Interdisciplinare Cure (GIC)", MARGIN + 3, y + 4.5);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(...GRAY);
  pdf.text(
    `Documento AI  ·  ${date}  ·  AIOM 2024 + ESMO Clinical Practice Guidelines`,
    MARGIN + 3,
    y + 8.5
  );

  pdf.setTextColor(...BLACK);
  y += 13;

  // ── SECTIONS ─────────────────────────────────────────────────
  for (const section of sections) {
    if (y > FOOTER_Y - 30) {
      drawFooter(pdf, date, getPage(), PLACEHOLDER_TOTAL);
      addPage();
      drawHeader(pdf, date, getPage(), PLACEHOLDER_TOTAL);
      y = CONTENT_START;
    }
    y = drawSection(pdf, section, y, date, getPage, getTotal, addPage);
    y += 3;
  }

  // ── FINAL NOTES & SIGNATURE BLOCK ────────────────────────────
  if (y > FOOTER_Y - 40) {
    drawFooter(pdf, date, getPage(), PLACEHOLDER_TOTAL);
    addPage();
    drawHeader(pdf, date, getPage(), PLACEHOLDER_TOTAL);
    y = CONTENT_START;
  }

  y += 4;
  pdf.setDrawColor(...LGRAY);
  pdf.setLineWidth(0.3);
  pdf.rect(MARGIN, y, CONTENT_W, 30, "S");

  // Notes title
  pdf.setFillColor(...ROWBG);
  pdf.rect(MARGIN, y, CONTENT_W, 7, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...NAVY);
  pdf.text("NOTE CLINICHE", MARGIN + 3, y + 4.8);
  y += 8;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...DARK);
  const notes = [
    "Il presente documento è generato da un sistema di supporto decisionale AI.",
    "Non sostituisce il giudizio clinico del panel multidisciplinare GIC.",
    "Tutte le raccomandazioni devono essere validate dal team clinico prima dell'attuazione.",
  ];
  notes.forEach((note, i) => {
    pdf.text(note, MARGIN + 3, y + 4 + i * 5);
  });

  // Signature
  const sigY = y + 22;
  pdf.setDrawColor(...LGRAY);
  pdf.line(PAGE_W - MARGIN - 55, sigY, PAGE_W - MARGIN - 3, sigY);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...NAVY);
  pdf.text("Dirigente Medico", PAGE_W - MARGIN - 29, sigY + 5, { align: "center" });

  // ── DRAW FOOTER ON LAST PAGE ──────────────────────────────────
  drawFooter(pdf, date, getPage(), PLACEHOLDER_TOTAL);

  // ── CORRECT ALL PAGE NUMBERS ──────────────────────────────────
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);

    // Overwrite the page number area (right side of date bar)
    pdf.setFillColor(...ROWBG);
    pdf.rect(PAGE_W / 2, 36, PAGE_W / 2, 7, "F");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...GRAY);
    pdf.text(`Pagina ${p} di ${totalPages}`, PAGE_W - MARGIN, 41, { align: "right" });

    // Overwrite footer page numbers
    pdf.setFillColor(...WHITE);
    pdf.rect(MARGIN, FOOTER_Y + 3, 80, 8, "F");
    pdf.setFontSize(6.5);
    pdf.setTextColor(...GRAY);
    pdf.text(
      "Documento generato da AI  ·  Solo supporto decisionale  ·  Autorità clinica al panel GIC  ·  Non sostituisce il giudizio clinico",
      MARGIN,
      FOOTER_Y + 4
    );
    pdf.text(`${date}  ·  Pagina ${p} di ${totalPages}`, MARGIN, FOOTER_Y + 8);
  }

  // ── SAVE ─────────────────────────────────────────────────────
  const filename = `GIC_${new Date(data.timestamp).toISOString().split("T")[0]}.pdf`;
  pdf.save(filename);
}