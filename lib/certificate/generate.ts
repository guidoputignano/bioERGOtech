/**
 * bioERGOtech Certificate Generator
 * Generates a 16:9 PPTX certificate and returns it as a Buffer.
 * 
 * Dependencies: pptxgenjs (add to package.json if not present)
 * npm install pptxgenjs
 */

import PptxGenJS from "pptxgenjs";
import * as fs from "fs";
import * as path from "path";

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const TEAL      = "00C896";
const TEAL_MID  = "00A87D";
const TEAL_DARK = "008F6B";
const NAVY      = "0A1628";
const WHITE     = "FFFFFF";
const LIGHT_LINE = "D0E8DF";
const MID_GREY  = "6B7B8D";

// ─── Logo base64 (loaded once at module level) ────────────────────────────────
function loadLogo(filename: string): string {
  try {
    const p = path.join(process.cwd(), "lib", "certificate", filename);
    return "image/png;base64," + fs.readFileSync(p, "utf8").trim();
  } catch {
    return "";
  }
}

export interface CertificateData {
  recipientName: string;
  studentId: string;
  courseTitle?: string;
  certId: string;
  issueDate: string;
  directorName?: string;
}

export async function generateCertificatePptx(data: CertificateData): Promise<Buffer> {
  const {
    recipientName,
    studentId,
    courseTitle = "10-Week Agentic AI High School Innovation Program",
    certId,
    issueDate,
    directorName = "Guido Putignano",
  } = data;

  const logoFull  = loadLogo("logo_full.b64");
  const logoShort = loadLogo("logo_short.b64");

  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_16x9";
  pres.title = "bioERGOtech Certificate of Completion";

  const W = 10, H = 5.625;
  const slide = pres.addSlide();
  slide.background = { color: WHITE };

  // Left teal accent bar
  slide.addShape("rect", {
    x: 0, y: 0, w: 0.18, h: H,
    fill: { color: TEAL }, line: { color: TEAL, width: 0 },
  });





  // Footer right — cert ID
  slide.addText(`ID: ${certId}`, {
    x: 7.0, y: H - 0.44, w: 2.7, h: 0.35,
    fontSize: 8, color: "7AA890", fontFace: "Calibri",
    align: "right", valign: "middle",
  });

  // Short logo top-left
  if (logoShort) {
    slide.addImage({ data: logoShort, x: 0.3, y: 0.18, w: 0.55, h: 0.47 });
  }

  // Full logo top-right
  if (logoFull) {
    slide.addImage({ data: logoFull, x: 7.0, y: 0.18, w: 2.7, h: 0.46 });
  }

  // Divider line
  slide.addShape("rect", {
    x: 0.3, y: 0.76, w: 9.5, h: 0.025,
    fill: { color: LIGHT_LINE }, line: { color: LIGHT_LINE, width: 0 },
  });

  // Security pattern
  for (let i = 0; i < 8; i++) {
    slide.addShape("line", {
      x: W - 1.5 + i * 0.12, y: 0, w: 0, h: 0.72,
      line: { color: "E0F2EC", width: 0.4 },
    });
  }

  // CERTIFICATE OF COMPLETION label
  slide.addText("CERTIFICATE OF COMPLETION", {
    x: 0.32, y: 0.88, w: 9.4, h: 0.32,
    fontSize: 9, color: TEAL_DARK, fontFace: "Calibri",
    bold: true, charSpacing: 4, align: "center",
  });

  // Presented to
  slide.addText("This certificate is proudly awarded to", {
    x: 0.32, y: 1.22, w: 9.4, h: 0.3,
    fontSize: 11, color: MID_GREY, fontFace: "Calibri",
    italic: true, align: "center",
  });

  // Recipient name
  slide.addText(recipientName, {
    x: 0.32, y: 1.52, w: 9.4, h: 0.82,
    fontSize: 42, color: NAVY, fontFace: "Georgia",
    bold: false, italic: true, align: "center", valign: "middle",
  });

  // Teal underline under name
  slide.addShape("rect", {
    x: 3.2, y: 2.37, w: 3.6, h: 0.04,
    fill: { color: TEAL }, line: { color: TEAL, width: 0 },
  });

  // Student ID
  slide.addText(`Student ID: ${studentId}`, {
    x: 0.32, y: 2.44, w: 9.4, h: 0.24,
    fontSize: 9, color: MID_GREY, fontFace: "Calibri", align: "center",
  });

  // Has successfully completed
  slide.addText("has successfully completed", {
    x: 0.32, y: 2.74, w: 9.4, h: 0.25,
    fontSize: 11, color: MID_GREY, fontFace: "Calibri",
    italic: true, align: "center",
  });

  // Course title
  slide.addText(courseTitle, {
    x: 0.5, y: 2.98, w: 9.0, h: 0.52,
    fontSize: 18, color: NAVY, fontFace: "Calibri",
    bold: true, align: "center", valign: "middle",
  });

  // Achievement pills
  const pills = ["AI Foundations", "Agent Architecture", "Working Prototype", "Ethics Review", "Open Source Contributor"];
  const pillW = 1.6, pillH = 0.22, pillGap = 0.12;
  const totalPillW = pills.length * pillW + (pills.length - 1) * pillGap;
  let pillX = (W - totalPillW) / 2;

  pills.forEach(pill => {
    slide.addShape("roundRect", {
      x: pillX, y: 3.58, w: pillW, h: pillH,
      fill: { color: LIGHT_LINE },
      line: { color: TEAL, width: 0.5 },
      rectRadius: 0.06,
    });
    slide.addText(pill, {
      x: pillX, y: 3.58, w: pillW, h: pillH,
      fontSize: 7, color: TEAL_DARK, fontFace: "Calibri",
      bold: true, align: "center", valign: "middle", margin: 0,
    });
    pillX += pillW + pillGap;
  });

  // Signature — left (director)
  slide.addShape("line", {
    x: 1.0, y: 4.38, w: 2.4, h: 0,
    line: { color: NAVY, width: 0.8 },
  });
  slide.addText(directorName, {
    x: 1.0, y: 4.16, w: 2.4, h: 0.22,
    fontSize: 12, color: NAVY, fontFace: "Georgia",
    italic: true, align: "center",
  });
  slide.addText("Director, bioERGOtech Foundation", {
    x: 0.8, y: 4.40, w: 2.8, h: 0.2,
    fontSize: 8, color: MID_GREY, fontFace: "Calibri", align: "center",
  });

  // Seal — centre
  slide.addShape("ellipse", {
    x: 4.25, y: 3.9, w: 1.5, h: 1.5,
    fill: { color: TEAL, transparency: 88 },
    line: { color: TEAL, width: 1.5 },
  });
  slide.addShape("ellipse", {
    x: 4.42, y: 4.07, w: 1.16, h: 1.16,
    fill: { color: WHITE, transparency: 100 },
    line: { color: TEAL_MID, width: 0.7 },
  });
  slide.addText("✓", {
    x: 4.32, y: 4.05, w: 1.36, h: 0.58,
    fontSize: 24, color: TEAL, fontFace: "Calibri",
    bold: true, align: "center", valign: "middle", margin: 0,
  });
  slide.addText("VERIFIED\nCOMPLETION", {
    x: 4.25, y: 4.62, w: 1.5, h: 0.55,
    fontSize: 6.5, color: TEAL_DARK, fontFace: "Calibri",
    bold: true, align: "center", valign: "top", margin: 0,
  });

  // Signature — right (issue date)
  slide.addShape("line", {
    x: 6.6, y: 4.38, w: 2.4, h: 0,
    line: { color: NAVY, width: 0.8 },
  });
  slide.addText(issueDate, {
    x: 6.6, y: 4.16, w: 2.4, h: 0.22,
    fontSize: 12, color: NAVY, fontFace: "Georgia",
    italic: true, align: "center",
  });
  slide.addText("Issue Date", {
    x: 6.6, y: 4.40, w: 2.4, h: 0.2,
    fontSize: 8, color: MID_GREY, fontFace: "Calibri", align: "center",
  });

  // Verify URL — teal, bottom centre
  slide.addText(`bioergotech.org/verify/${certId}`, {
    x: 2.8, y: H - 0.38, w: 4.4, h: 0.3,
    fontSize: 7.5, color: TEAL, fontFace: "Calibri",
    align: "center", valign: "middle", italic: true,
  });

  // Write to buffer
  const buffer = await pres.write({ outputType: "nodebuffer" }) as Buffer;
  return buffer;
}

export function generateCertId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "BIO-AI-2026-";
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}
