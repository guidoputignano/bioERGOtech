import { jsPDF } from "jspdf";
import {
  AUTORIZZAZIONE_NOTA_CUSTODIA,
  AUTORIZZAZIONE_PARTECIPAZIONE,
  LICEI,
  SITE_URL,
} from "../content";
import {
  EVENTO_RIPRESE,
  INFORMATIVA_IMMAGINI_PATH,
  SCELTE_IMMAGINI,
  SCELTE_NOTA,
} from "../../informativa-immagini/content";

/**
 * Modulo di autorizzazione da far firmare a famiglie e studenti.
 *
 * Gira nel browser del docente referente, non sul server: il PDF non
 * contiene dati di studenti, solo l'intestazione dell'istituto e i campi da
 * riempire a penna. Non c'e niente da generare lato server e niente da
 * conservare.
 *
 * Due versioni, come i documenti privacy dell'evento. Per lo studente
 * minorenne firma il genitore, e il modulo comprende anche la partecipazione
 * al percorso. Lo studente maggiorenne firma da se le sole scelte A e B sulle
 * immagini. I testi delle scelte vengono da `informativa-immagini/content.ts`,
 * gli stessi della pagina pubblica dell'informativa.
 *
 * Il foglio prodotto va stampato, firmato e conservato in segreteria. Il
 * sito non lo raccoglie indietro, e non deve: le autorizzazioni sono un
 * documento della scuola, e tenerle qui significherebbe custodire dati di
 * genitori che non ci servono.
 *
 * Convenzioni di misura e colore ereditate dal generatore PDF del prototipo
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
/** Spazio riservato al piede di pagina. */
const BOTTOM = PAGE_H - 20;
const LINE_H = 4.2;

export type VersioneModulo = "minorenne" | "maggiorenne";

export type AutorizzazioneInput = {
  istituto: string;
  comune: string;
  provincia: string;
  referente: string;
  versione: VersioneModulo;
};

export function generaAutorizzazionePDF(input: AutorizzazioneInput): void {
  const minore = input.versione === "minorenne";
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  /** Va a pagina nuova se il blocco che segue non ci sta. */
  const spazio = (h: number) => {
    if (y + h > BOTTOM) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const paragrafo = (testo: string, size = 9, color = DARK, x = MARGIN, w = CONTENT_W) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const righe = doc.splitTextToSize(testo, w);
    spazio(righe.length * LINE_H);
    doc.text(righe, x, y + 3);
    y += righe.length * LINE_H + 2;
  };

  // ── Intestazione ──
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Fondazione bioERGOtech e SafesPro", MARGIN, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(`${LICEI.titolo} . ${EVENTO_RIPRESE.nome}`, MARGIN, 20);
  doc.setFontSize(8);
  doc.setTextColor(190, 205, 220);
  doc.text(`Evento: ${EVENTO_RIPRESE.luoghi}`, MARGIN, 25.5);

  y = 42;

  // ── Titolo ──
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(
    minore ? "Modulo di autorizzazione . Studente minorenne" : "Modulo di autorizzazione . Studente maggiorenne",
    MARGIN,
    y,
  );
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(
    minore
      ? "Da compilare a cura del genitore o di chi esercita la responsabilità genitoriale o tutoria."
      : "Da compilare e firmare a cura dello studente che ha compiuto 18 anni.",
    MARGIN,
    y,
  );
  y += 5;
  doc.text(
    `Prima di firmare, leggere l'informativa: ${SITE_URL.replace(/^https?:\/\//, "")}${INFORMATIVA_IMMAGINI_PATH}`,
    MARGIN,
    y,
  );
  y += 7;

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
    spazio(12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    doc.text(etichetta, MARGIN, y);
    doc.setDrawColor(...LGRAY);
    doc.line(MARGIN, y + 5.5, MARGIN + larghezza, y + 5.5);
    y += 12;
  };

  if (minore) {
    riga("Il sottoscritto / la sottoscritta (nome e cognome del genitore o tutore)");
    riga("in qualità di genitore / tutore di (nome e cognome dello studente)");
  } else {
    riga("Studente (nome e cognome)");
  }
  riga("frequentante la classe", 70);

  paragrafo(
    minore
      ? "Il sottoscritto / la sottoscritta dichiara di avere letto l'informativa e di esercitare la responsabilità genitoriale o tutoria sullo studente indicato."
      : "Dichiaro di avere letto l'informativa.",
  );
  y += 3;

  // ── Riquadri delle autorizzazioni ──
  const riquadro = (titolo: string, testo: string, conCaselle: boolean, nota: string) => {
    doc.setFontSize(9);
    const righe = doc.splitTextToSize(testo, CONTENT_W - 10);
    const altezza = 12 + righe.length * LINE_H + (conCaselle ? 12 : 7);
    spazio(altezza + 6);

    doc.setDrawColor(...LGRAY);
    doc.roundedRect(MARGIN, y, CONTENT_W, altezza, 2, 2, "D");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...TEAL);
    doc.text(titolo, MARGIN + 5, y + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(righe, MARGIN + 5, y + 13);

    const baseY = y + altezza - (conCaselle ? 6 : 4);
    if (conCaselle) {
      doc.setDrawColor(...DARK);
      doc.rect(MARGIN + 5, baseY - 3.5, 4, 4, "D");
      doc.text("SÌ, autorizzo", MARGIN + 12, baseY);
      doc.rect(MARGIN + 45, baseY - 3.5, 4, 4, "D");
      doc.text("NO, non autorizzo", MARGIN + 52, baseY);
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY);
      doc.text(nota, MARGIN + 100, baseY);
    } else {
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY);
      doc.text(nota, MARGIN + 5, baseY);
    }

    y += altezza + 6;
  };

  // La partecipazione al percorso solo per il minorenne: senza caselle,
  // perché è necessaria per partecipare e una casella "nego" darebbe l'idea
  // che si possa venire senza. Le scelte sulle immagini invece sono
  // davvero facoltative.
  if (minore) {
    riquadro(AUTORIZZAZIONE_PARTECIPAZIONE.titolo, AUTORIZZAZIONE_PARTECIPAZIONE.testo, false, "Necessaria per la partecipazione al percorso.");
  }
  for (const s of SCELTE_IMMAGINI) {
    riquadro(`Scelta ${s.id} . ${s.titolo}`, s.testo(input.versione), true, `Facoltativa. Durata: ${s.durata}.`);
  }

  paragrafo(SCELTE_NOTA, 8, GRAY);

  if (minore) {
    y += 2;
    paragrafo("Se firma un solo genitore, dichiara inoltre, sotto la propria responsabilità, che:", 8.5);
    for (const t of [
      "l'altro genitore condivide le scelte sopra indicate;",
      "esercita da solo la responsabilità genitoriale o tutoria.",
    ]) {
      spazio(7);
      doc.setDrawColor(...DARK);
      doc.rect(MARGIN, y, 3.5, 3.5, "D");
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK);
      doc.text(t, MARGIN + 6, y + 3);
      y += 6;
    }
  }

  // ── Firme ──
  // Due per riga, luogo e data compresi: il modulo del maggiorenne resta
  // così su una pagina sola.
  const firme = [
    "Luogo e data",
    ...(minore
      ? [
          "Firma del genitore o tutore",
          "Firma dell'altro genitore, se presente",
          "Firma dello studente, per presa visione",
        ]
      : ["Firma dello studente"]),
  ];

  y += 4;
  for (let i = 0; i < firme.length; i += 2) {
    spazio(16);
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    doc.setDrawColor(...LGRAY);
    doc.text(firme[i], MARGIN, y);
    doc.line(MARGIN, y + 8, MARGIN + 80, y + 8);
    if (firme[i + 1]) {
      doc.text(firme[i + 1], MARGIN + 92, y);
      doc.line(MARGIN + 92, y + 8, MARGIN + CONTENT_W, y + 8);
    }
    y += 15;
  }

  // ── Nota di custodia ──
  doc.setFontSize(8.5);
  const nota = doc.splitTextToSize(AUTORIZZAZIONE_NOTA_CUSTODIA, CONTENT_W - 10);
  const notaH = nota.length * LINE_H + 8;
  spazio(notaH);
  doc.setFillColor(255, 248, 230);
  doc.setDrawColor(228, 179, 60);
  doc.roundedRect(MARGIN, y, CONTENT_W, notaH, 2, 2, "FD");
  doc.setTextColor(117, 87, 15);
  doc.text(nota, MARGIN + 5, y + 6);

  // ── Piede, su ogni pagina ──
  const pagine = doc.getNumberOfPages();
  for (let p = 1; p <= pagine; p++) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(
      "I dati sono trattati ai sensi del Regolamento (UE) 2016/679. Contitolari per le immagini: Fondazione bioERGOtech ETS e SafesPro.",
      MARGIN,
      PAGE_H - 12,
    );
    doc.text(`www.bioergotech.org . Pagina ${p} di ${pagine}`, MARGIN, PAGE_H - 8);
  }

  const slug = input.istituto
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  doc.save(`autorizzazione-${input.versione}-${slug || "istituto"}.pdf`);
}
