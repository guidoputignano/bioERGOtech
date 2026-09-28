import { jsPDF } from "jspdf";
import { EVENT } from "../../content";
import {
  AUTORIZZAZIONE_NOTA_CUSTODIA,
  INFORMATIVA_MODULO,
  LICEI,
  MODULO_VERSIONE,
  PAGINA_FIRME,
  piedeModulo,
  type ConsensoModulo,
  type VarianteModulo,
} from "../content";

/**
 * Modulo di autorizzazione da far firmare, in due varianti: per lo studente
 * minorenne firmano i genitori, per il maggiorenne firma lo studente.
 *
 * Gira nel browser del docente referente, non sul server: il PDF non
 * contiene dati di studenti, solo l'intestazione dell'istituto e i campi da
 * riempire a penna. Non c'e niente da generare lato server e niente da
 * conservare.
 *
 * Tre pagine. Le prime due sono l'informativa e restano a casa; la terza si
 * firma, torna al referente e resta in segreteria. Il sito non la raccoglie
 * indietro, e non deve: tenerla qui significherebbe custodire dati di
 * genitori che non ci servono. Agli organizzatori la scuola comunica solo
 * l'esito delle scelte sulle immagini dei finalisti.
 *
 * I testi vivono in `../content.ts`. Qui c'e solo l'impaginazione, con una
 * regola: l'informativa sta in due pagine e le firme in una. Se un testo si
 * allunga, il corpo scende di qualche decimo di punto invece di far slittare
 * la pagina delle firme, che i testi chiamano "pagina 3".
 *
 * Convenzioni di misura e colore ereditate dal generatore PDF del prototipo
 * cosi i due PDF del sito si somigliano.
 */

const NAVY: [number, number, number] = [11, 37, 69];
const TEAL: [number, number, number] = [13, 126, 138];
const DARK: [number, number, number] = [30, 30, 30];
const GRAY: [number, number, number] = [100, 100, 100];
const LGRAY: [number, number, number] = [200, 200, 200];
const AMBRA_BG: [number, number, number] = [255, 248, 230];
const AMBRA_BORDO: [number, number, number] = [228, 179, 60];
const AMBRA_TESTO: [number, number, number] = [117, 87, 15];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;
/** Sotto questa quota non si scrive: c'e il piè di pagina. */
const LIMITE = PAGE_H - 17;
const PAGINE_INFORMATIVA = 2;

/** Da punti tipografici a millimetri, con l'interlinea del corpo testo. */
const riga = (pt: number, interlinea = 1.35) => pt * 0.3528 * interlinea;

const RIGA_EVENTO = `Evento finale: ${EVENT.dataLabel}, ${EVENT.citta}`;

export type AutorizzazioneInput = {
  istituto: string;
  comune: string;
  provincia: string;
  referente: string;
  variante: VarianteModulo;
};

/* ── Pezzi comuni ─────────────────────────────────────────────────────── */

function fasciaIntera(doc: jsPDF) {
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
  doc.text(RIGA_EVENTO, MARGIN, 25.5);
}

/** La fascia di una riga delle pagine 2 e 3: la pagina serve al testo. */
function fasciaRidotta(doc: jsPDF) {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, 12, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `Fondazione bioERGOtech e SafesPro | ${LICEI.titolo} | ${RIGA_EVENTO}`,
    MARGIN,
    7.6,
  );
}

/** Un riquadro con un testo in grassetto, per dire che cosa si tiene e che cosa si riconsegna. */
function avviso(doc: jsPDF, y: number, testo: string, pt: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(pt);
  const righe = doc.splitTextToSize(testo, CONTENT_W - 10);
  const h = righe.length * riga(pt) + 5;
  doc.setFillColor(...AMBRA_BG);
  doc.setDrawColor(...AMBRA_BORDO);
  doc.roundedRect(MARGIN, y, CONTENT_W, h, 2, 2, "FD");
  doc.setTextColor(...AMBRA_TESTO);
  doc.text(righe, MARGIN + 5, y + 3.2 + riga(pt) * 0.7);
  doc.setFont("helvetica", "normal");
  return y + h;
}

function casella(doc: jsPDF, x: number, yBase: number) {
  doc.setDrawColor(...DARK);
  doc.rect(x, yBase - 3.2, 3.6, 3.6, "D");
}

/* ── Pagine 1 e 2: l'informativa ──────────────────────────────────────── */

/**
 * Scrive l'informativa a partire da pagina 1 e restituisce su quante pagine
 * e finita. Va a capo riga per riga, cosi un paragrafo lungo puo cominciare
 * in fondo a una pagina e finire sulla successiva.
 */
function informativa(doc: jsPDF, pt: number): number {
  fasciaIntera(doc);
  let y = 40;

  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(INFORMATIVA_MODULO.titolo, MARGIN, y);
  y += 5.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(INFORMATIVA_MODULO.sottotitolo, MARGIN, y);
  y += 4;
  y = avviso(doc, y, INFORMATIVA_MODULO.fascia, 8.5) + 5;

  const lh = riga(pt);

  const nuovaPagina = () => {
    doc.addPage();
    fasciaRidotta(doc);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...AMBRA_TESTO);
    doc.text(INFORMATIVA_MODULO.fasciaSeguito, MARGIN, 19);
    y = 25;
  };

  const paragrafo = (testo: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(pt);
    doc.setTextColor(...DARK);
    for (const r of doc.splitTextToSize(testo, CONTENT_W) as string[]) {
      if (y + lh > LIMITE) nuovaPagina();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(pt);
      doc.setTextColor(...DARK);
      doc.text(r, MARGIN, y);
      y += lh;
    }
    y += lh * 0.35;
  };

  paragrafo(INFORMATIVA_MODULO.apertura);

  for (const s of INFORMATIVA_MODULO.sezioni) {
    // Un titolo non resta da solo in fondo alla pagina: se sotto non c'e
    // posto per almeno due righe, va a quella dopo insieme al suo testo.
    if (y + lh * 3.2 > LIMITE) nuovaPagina();
    y += lh * 0.25;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(pt + 0.5);
    doc.setTextColor(...TEAL);
    doc.text(s.titolo, MARGIN, y);
    y += lh;
    for (const p of s.paragrafi) paragrafo(p);
  }

  return doc.getNumberOfPages();
}

/* ── Pagina 3: le firme ───────────────────────────────────────────────── */

/** Scrive la pagina delle firme e restituisce la quota a cui e finita. */
function paginaFirme(doc: jsPDF, input: AutorizzazioneInput, pt: number): number {
  const p = PAGINA_FIRME[input.variante];
  const lh = riga(pt);
  const piccolo = pt - 1.5;

  doc.addPage();
  fasciaRidotta(doc);
  let y = avviso(doc, 16, p.fascia, 9) + 7;

  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(p.titolo, MARGIN, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(piccolo + 0.5);
  doc.setTextColor(...GRAY);
  doc.text(doc.splitTextToSize(p.sottotitolo, CONTENT_W), MARGIN, y);
  y += 4.5;

  // ── Istituto ──
  // Il riquadro cresce con il nome: le denominazioni ufficiali degli
  // istituti superiori arrivano a occupare due righe.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  const nomeIstituto = doc.splitTextToSize(`Istituto: ${input.istituto}`, CONTENT_W - 10);
  const hIstituto = 9 + nomeIstituto.length * riga(9.5, 1.2);
  doc.setDrawColor(...LGRAY);
  doc.setFillColor(246, 249, 251);
  doc.roundedRect(MARGIN, y, CONTENT_W, hIstituto, 2, 2, "FD");
  doc.setTextColor(...DARK);
  doc.text(nomeIstituto, MARGIN + 5, y + 5.2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(
    `${input.comune} (${input.provincia}). Docente referente: ${input.referente}`,
    MARGIN + 5,
    y + hIstituto - 3,
  );
  y += hIstituto + 6;

  // ── Campi da riempire a penna, a coppie ──
  const meta = (CONTENT_W - 8) / 2;
  for (let i = 0; i < p.campi.length; i += 2) {
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.setDrawColor(...LGRAY);
    doc.text(p.campi[i], MARGIN, y);
    doc.line(MARGIN, y + 5.5, MARGIN + meta, y + 5.5);
    if (p.campi[i + 1]) {
      doc.text(p.campi[i + 1], MARGIN + meta + 8, y);
      doc.line(MARGIN + meta + 8, y + 5.5, MARGIN + CONTENT_W, y + 5.5);
    }
    y += 10.5;
  }

  // ── Presa visione ──
  doc.setFont("helvetica", "normal");
  doc.setFontSize(pt);
  doc.setTextColor(...DARK);
  const presa = doc.splitTextToSize(p.presaVisione, CONTENT_W);
  doc.text(presa, MARGIN, y);
  y += presa.length * lh + 2.5;

  // ── Partecipazione, solo per il minorenne ──
  if (p.partecipazione) {
    doc.setFontSize(pt);
    const testo = doc.splitTextToSize(p.partecipazione.testo, CONTENT_W - 10);
    const h = 6.5 + testo.length * lh + 4.5;
    doc.setDrawColor(...LGRAY);
    doc.roundedRect(MARGIN, y, CONTENT_W, h, 2, 2, "D");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(pt + 0.5);
    doc.setTextColor(...TEAL);
    doc.text(p.partecipazione.titolo, MARGIN + 5, y + 5.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(pt);
    doc.setTextColor(...DARK);
    doc.text(testo, MARGIN + 5, y + 6.5 + lh * 0.8);
    doc.setFontSize(piccolo);
    doc.setTextColor(...GRAY);
    doc.text(p.partecipazione.nota, MARGIN + 5, y + h - 2);
    y += h + 3;
  }
  if (p.notaPartecipazione) {
    doc.setFontSize(pt);
    doc.setTextColor(...GRAY);
    const nota = doc.splitTextToSize(p.notaPartecipazione, CONTENT_W);
    doc.text(nota, MARGIN, y);
    y += nota.length * lh + 2.5;
  }

  // ── I due consensi sulle immagini ──
  // Le caselle ci sono solo qui: la partecipazione e necessaria, e una
  // casella "nego" accanto a quella darebbe l'idea che si possa venire senza.
  const consenso = (c: ConsensoModulo) => {
    doc.setFontSize(pt);
    const testo = doc.splitTextToSize(c.testo, CONTENT_W - 10);
    const h = 6.5 + testo.length * lh + 7;
    doc.setDrawColor(...LGRAY);
    doc.roundedRect(MARGIN, y, CONTENT_W, h, 2, 2, "D");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(pt + 0.5);
    doc.setTextColor(...TEAL);
    doc.text(c.titolo, MARGIN + 5, y + 5.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(pt);
    doc.setTextColor(...DARK);
    doc.text(testo, MARGIN + 5, y + 6.5 + lh * 0.8);
    const base = y + h - 2.8;
    casella(doc, MARGIN + 5, base);
    doc.text("AUTORIZZO", MARGIN + 11, base);
    casella(doc, MARGIN + 45, base);
    doc.text("NON AUTORIZZO", MARGIN + 51, base);
    y += h + 3;
  };
  consenso(p.consensoA);
  consenso(p.consensoB);

  // ── Regole ──
  y += 2;
  doc.setFontSize(piccolo);
  doc.setTextColor(...GRAY);
  const regole = doc.splitTextToSize(p.regole, CONTENT_W);
  doc.text(regole, MARGIN, y);
  y += regole.length * riga(piccolo) + 2.5;

  // ── Firma singola, solo per il minorenne ──
  if (p.firmaSingola) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(piccolo + 0.5);
    doc.setTextColor(...DARK);
    doc.text(p.firmaSingola.intestazione, MARGIN, y);
    y += riga(piccolo + 0.5) + 0.8;
    doc.setFont("helvetica", "normal");
    for (const o of p.firmaSingola.opzioni) {
      const righe = doc.splitTextToSize(o, CONTENT_W - 7);
      casella(doc, MARGIN, y + 0.4);
      doc.text(righe, MARGIN + 6, y);
      y += righe.length * riga(piccolo + 0.5) + 1;
    }
    y += 1.5;
  }

  // ── Firme, a coppie ──
  y += 2;
  for (let i = 0; i < p.firme.length; i += 2) {
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.setDrawColor(...LGRAY);
    doc.text(p.firme[i], MARGIN, y);
    doc.line(MARGIN, y + 8, MARGIN + 80, y + 8);
    if (p.firme[i + 1]) {
      doc.text(p.firme[i + 1], MARGIN + 94, y);
      doc.line(MARGIN + 94, y + 8, MARGIN + CONTENT_W, y + 8);
    }
    y += 13;
  }

  // ── Nota di custodia ──
  doc.setFont("helvetica", "normal");
  doc.setFontSize(pt - 0.5);
  const nota = doc.splitTextToSize(AUTORIZZAZIONE_NOTA_CUSTODIA, CONTENT_W - 10);
  const notaH = nota.length * riga(pt - 0.5) + 5;
  doc.setFillColor(...AMBRA_BG);
  doc.setDrawColor(...AMBRA_BORDO);
  doc.roundedRect(MARGIN, y, CONTENT_W, notaH, 2, 2, "FD");
  doc.setTextColor(...AMBRA_TESTO);
  doc.text(nota, MARGIN + 5, y + 3.2 + riga(pt - 0.5) * 0.7);
  return y + notaH;
}

/* ── Documento ────────────────────────────────────────────────────────── */

function piedi(doc: jsPDF, variante: VarianteModulo) {
  const totale = doc.getNumberOfPages();
  for (let n = 1; n <= totale; n++) {
    doc.setPage(n);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(piedeModulo(variante, n, totale), MARGIN, PAGE_H - 9);
  }
}

/**
 * Compone il modulo. Prova i corpi dal piu grande: il primo con cui
 * l'informativa sta in due pagine e le firme in una e quello buono. Con i
 * testi di oggi entra gia al primo tentativo; i successivi esistono perche
 * chi allunga un testo non si accorga del problema solo quando una scuola
 * stampa un modulo con la pagina delle firme spezzata a meta.
 */
export function creaAutorizzazionePDF(input: AutorizzazioneInput): jsPDF {
  const CORPI_INFORMATIVA = [8.5, 8.3, 8.1, 7.9, 7.7];
  const CORPI_FIRME = [9, 8.7, 8.4, 8.1];

  let corpoInformativa = CORPI_INFORMATIVA[CORPI_INFORMATIVA.length - 1];
  for (const pt of CORPI_INFORMATIVA) {
    if (informativa(new jsPDF({ unit: "mm", format: "a4" }), pt) <= PAGINE_INFORMATIVA) {
      corpoInformativa = pt;
      break;
    }
  }

  let ultimo: jsPDF | null = null;
  for (const pt of CORPI_FIRME) {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    informativa(doc, corpoInformativa);
    const fine = paginaFirme(doc, input, pt);
    ultimo = doc;
    if (fine <= LIMITE) break;
  }

  const doc = ultimo as jsPDF;
  doc.setProperties({
    title: `Modulo di autorizzazione ${MODULO_VERSIONE}, ${PAGINA_FIRME[input.variante].nome}`,
    subject: `${LICEI.titolo}. ${input.istituto}`,
    author: "Fondazione bioERGOtech e SafesPro",
  });
  piedi(doc, input.variante);
  return doc;
}

export function nomeFileAutorizzazione(input: AutorizzazioneInput): string {
  const slug = input.istituto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 50)
    .replace(/^-+|-+$/g, "");
  const variante = input.variante === "minorenne" ? "minorenni" : "maggiorenni";
  return `autorizzazione-${slug || "istituto"}-v2-${variante}.pdf`;
}

export function generaAutorizzazionePDF(input: AutorizzazioneInput): void {
  creaAutorizzazionePDF(input).save(nomeFileAutorizzazione(input));
}
