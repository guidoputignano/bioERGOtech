import { jsPDF } from "jspdf";
import {
  AUTORIZZAZIONE_NOTA_CUSTODIA,
  AUTORIZZAZIONI_MODULO,
  LICEI,
} from "../content";

/**
 * Modulo di autorizzazione da far firmare ai genitori.
 *
 * Gira nel browser del docente referente, non sul server: il PDF non
 * contiene dati di studenti, solo l'intestazione dell'istituto e i campi da
 * riempire a penna. Non c'e niente da generare lato server e niente da
 * conservare.
 *
 * Il foglio prodotto va stampato, firmato e conservato in segreteria. Il
 * sito non lo raccoglie indietro, e non deve: le autorizzazioni sono un
 * documento della scuola, e tenerle qui significherebbe custodire dati di
 * genitori che non ci servono.
 *
 * Convenzioni di misura e colore prese da app/gic-prototype/generateGicPDF.ts,
 * cosi i due PDF del sito si somigliano.
 */

const NAVY: [number, number, number] = [11, 37, 69];
const TEAL: [number, number, number] = [13, 126, 138];
const DARK: [number, number, number] = [30, 30, 30];
const GRAY: [number, number, number] = [100, 100, 100];
const LGRAY: [number, number, number] = [200, 200, 200];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;

export type AutorizzazioneInput = {
  istituto: string;
  comune: string;
  provincia: string;
  referente: string;
};

export function generaAutorizzazionePDF(input: AutorizzazioneInput): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  // ── Intestazione ──
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Fondazione bioERGOtech e SafesPro", MARGIN, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(LICEI.titolo, MARGIN, 20);
  doc.setFontSize(8);
  doc.setTextColor(190, 205, 220);
  doc.text(`Evento finale: ${LICEI.dataLabel}, ${LICEI.luogo}`, MARGIN, 25.5);

  y = 42;

  // ── Titolo ──
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Modulo di autorizzazione", MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(
    "Da compilare a cura del genitore o di chi esercita la responsabilita genitoriale.",
    MARGIN,
    y,
  );
  y += 10;

  // ── Istituto ──
  doc.setDrawColor(...LGRAY);
  doc.setFillColor(246, 249, 251);
  doc.roundedRect(MARGIN, y, CONTENT_W, 20, 2, 2, "FD");
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text("ISTITUTO", MARGIN + 5, y + 6);
  doc.setFontSize(10.5);
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.text(input.istituto, MARGIN + 5, y + 12, { maxWidth: CONTENT_W - 10 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  doc.text(
    `${input.comune} (${input.provincia}) . Docente referente: ${input.referente}`,
    MARGIN + 5,
    y + 17,
  );
  y += 28;

  // ── Campi da riempire a penna ──
  const riga = (etichetta: string, larghezza = CONTENT_W) => {
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    doc.text(etichetta, MARGIN, y);
    doc.setDrawColor(...LGRAY);
    doc.line(MARGIN, y + 5.5, MARGIN + larghezza, y + 5.5);
    y += 12;
  };

  doc.setFont("helvetica", "normal");
  riga("Il sottoscritto / la sottoscritta (nome e cognome del genitore)");
  riga("in qualita di genitore / esercente la responsabilita genitoriale di (nome e cognome dello studente)");
  riga("frequentante la classe", 70);

  y += 2;

  // ── Le due autorizzazioni ──
  for (const a of AUTORIZZAZIONI_MODULO) {
    const altezza = a.obbligatoria ? 34 : 40;
    doc.setDrawColor(...LGRAY);
    doc.roundedRect(MARGIN, y, CONTENT_W, altezza, 2, 2, "D");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...TEAL);
    doc.text(a.titolo, MARGIN + 5, y + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    const testo = doc.splitTextToSize(a.testo, CONTENT_W - 10);
    doc.text(testo, MARGIN + 5, y + 13);

    // Le caselle: solo sulla seconda, perche la prima e necessaria per
    // partecipare e una casella "nego" darebbe l'idea che si possa venire
    // senza. La seconda invece e davvero facoltativa.
    if (!a.obbligatoria) {
      const boxY = y + altezza - 10;
      doc.setDrawColor(...DARK);
      doc.rect(MARGIN + 5, boxY - 3.5, 4, 4, "D");
      doc.text("AUTORIZZO", MARGIN + 12, boxY);
      doc.rect(MARGIN + 45, boxY - 3.5, 4, 4, "D");
      doc.text("NON AUTORIZZO", MARGIN + 52, boxY);
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY);
      doc.text(
        "La partecipazione al percorso non dipende da questa scelta.",
        MARGIN + 100,
        boxY,
      );
    } else {
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY);
      doc.text(
        "Necessaria per la partecipazione.",
        MARGIN + 5,
        y + altezza - 6,
      );
    }

    y += altezza + 7;
  }

  // ── Firma ──
  y += 2;
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  doc.text("Luogo e data", MARGIN, y);
  doc.text("Firma", MARGIN + 105, y);
  doc.setDrawColor(...LGRAY);
  doc.line(MARGIN, y + 8, MARGIN + 85, y + 8);
  doc.line(MARGIN + 105, y + 8, MARGIN + CONTENT_W, y + 8);
  y += 18;

  // ── Nota di custodia ──
  doc.setFillColor(255, 248, 230);
  doc.setDrawColor(228, 179, 60);
  const nota = doc.splitTextToSize(AUTORIZZAZIONE_NOTA_CUSTODIA, CONTENT_W - 10);
  const notaH = nota.length * 4.2 + 8;
  doc.roundedRect(MARGIN, y, CONTENT_W, notaH, 2, 2, "FD");
  doc.setFontSize(8.5);
  doc.setTextColor(117, 87, 15);
  doc.text(nota, MARGIN + 5, y + 6);

  // ── Piede ──
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text(
    "I dati sono trattati ai sensi del Regolamento (UE) 2016/679 per le sole finalita del percorso formativo.",
    MARGIN,
    PAGE_H - 12,
  );
  doc.text("www.bioergotech.org", MARGIN, PAGE_H - 8);

  const slug = input.istituto
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  doc.save(`autorizzazione-${slug || "istituto"}.pdf`);
}
