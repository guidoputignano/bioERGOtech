/**
 * La guida per la Commissione di valutazione, come pagina del sito
 * (`commissione/guida`): la stessa della versione PDF, ma costruita dalle
 * costanti del modulo (date, tetto, criteri, fasce), cosi non resta
 * indietro se una regola cambia. La linkano l'area dei giudici, l'email di
 * accesso e quella del 26 novembre.
 */

import type { Documento } from "../../documenti";
import { COMMISSIONE_PATH, CRITERI_LICEI, CRITERIO_DIRIMENTE_LICEI, LICEI, NOTA_CRITERIO_PRESENTAZIONE, SCADENZA_CONSEGNA_LABEL } from "../../content";
import {
  ANNUNCIO_FINALISTI_LABEL,
  GIUDICI_PER_PROGETTO_LETTERE,
  GUIDA_COMMISSIONE_SLUG,
  LIVELLI_CRITERI,
  MINUTI_PER_PROGETTO,
  PROGETTI_EXTRA,
  PROGETTI_MAX_PER_GIUDICE,
  SCADENZA_GIUDICI_LABEL,
  TEMI_PROGETTO,
  VIDEO_GIUDICI,
  VIDEO_GIUDICI_POSTER,
} from "../../smistamento";

export const GUIDA_COMMISSIONE_PATH = `${COMMISSIONE_PATH}/${GUIDA_COMMISSIONE_SLUG}`;

const maiuscola = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const criteri = CRITERI_LICEI.map((c) => {
  const fasce = (LIVELLI_CRITERI[c.campo] ?? []).map((l) => `da ${l.da} a ${l.a}, ${l.testo}`).join("; ");
  return `${c.criterio}, fino a ${c.punti} punti. ${c.desc} Fasce: ${fasce}.`;
});

export const GUIDA_COMMISSIONE: Documento = {
  titoloPagina: "Guida per la Commissione di valutazione | Biotecnologie e Intelligenza Artificiale",
  descrizione:
    "Come accedere all'area della Commissione, come si compilano le schede e come si forma la classifica dei progetti delle scuole superiori.",
  occhiello: "Commissione di valutazione",
  titolo: "Guida per la Commissione di valutazione",
  intro: `Grazie per far parte della Commissione. Le squadre degli istituti superiori consegnano i loro progetti entro ${SCADENZA_CONSEGNA_LABEL}: sono circa 80. Ogni progetto è affidato a ${GIUDICI_PER_PROGETTO_LETTERE} giudici, scelti per tema e con carichi uguali, e ognuno valuta solo i suoi: circa dieci, mai più di ${PROGETTI_MAX_PER_GIUDICE}, meno di due ore in tutto. I ${LICEI.progettiSulPalco} progetti con il punteggio più alto vengono presentati dagli studenti sul palco ${LICEI.dataLabel.toLowerCase()} al ${LICEI.luogo}.`,
  aggiornato: "2026-11-17",
  video: {
    src: VIDEO_GIUDICI,
    poster: VIDEO_GIUDICI_POSTER,
    titolo: "Il video: come si entra e come si valuta, in due minuti",
    nota: "Senza audio, con le didascalie: si guarda anche in treno. I progetti e i nomi sono di esempio.",
  },
  sezioni: [
    {
      h: "Le tappe",
      ul: [
        "Riceve un'email dalla Fondazione con il link per scegliere la password e il pulsante per entrare nell'area della Commissione. Appena entra, sceglie i suoi temi.",
        "Fino al 25 novembre le squadre consegnano, scegliendo uno o due temi per il loro progetto. Può già leggere i progetti man mano che arrivano.",
        "Giovedì 26 novembre: smistamento e apertura delle schede. Riceve un'email con il numero dei suoi progetti, e nella sua area vede solo quelli.",
        "Lunedì 30 novembre: un promemoria con il punto della situazione. Chi non ha ancora iniziato entro il 1° dicembre lascia i suoi progetti alla riserva interna.",
        `${maiuscola(SCADENZA_GIUDICI_LABEL)}: tutte le schede chiuse.`,
        `${maiuscola(ANNUNCIO_FINALISTI_LABEL)}: la riserva copre i progetti con meno di due schede, e annunciamo i ${LICEI.progettiSulPalco} finalisti.`,
        `${LICEI.dataLabel}: i progetti finalisti vengono presentati dal palco. Fra le presentazioni e la premiazione le schede si riaprono, per rivedere il criterio «Qualità della presentazione» dopo averlo visto dal vivo.`,
      ],
    },
    {
      h: "Come si accede",
      ul: [
        "Entri su www.bioergotech.org con l'email a cui è arrivato l'invito e la password che ha scelto: dopo l'accesso il sito la porta direttamente nell'area della Commissione. Per tornarci, in alto trova il link «Commission».",
        "Se il link per scegliere la password è scaduto, o non ricorda la password, nella pagina di accesso usi «First time, or forgot your password?», scriva la sua email e le arriva un link nuovo.",
      ],
    },
    {
      h: "Che cosa trova nell'area",
      ul: [
        `I suoi temi: otto voci, da «${TEMI_PROGETTO[0].label}» a «${TEMI_PROGETTO[TEMI_PROGETTO.length - 1].label}». Scelga quelle in cui si sente più competente: lo smistamento le affida soprattutto progetti su quei temi.`,
        "In alto, i suoi numeri: i progetti affidati a lei, le schede chiuse, quelli ancora da valutare e la scadenza, con una barra che dice quanto tempo resta.",
        "L'elenco dei suoi progetti: titolo, nome della squadra, istituto, ambito e temi, con lo stato «Da valutare» oppure «Valutato».",
        "Aprendo un progetto trova le risposte della squadra a sei domande, una per criterio, e se c'è il link ai materiali.",
        "Non ci sono i nomi degli studenti: la Commissione valuta progetti, non ragazzi. Restano il nome della squadra e l'istituto.",
      ],
    },
    {
      h: "Come si compila una scheda",
      ul: [
        `Legga le risposte: sei testi brevi, circa ${MINUTI_PER_PROGETTO} minuti con la scheda. Il link ai materiali lo apra solo se le serve per decidere.`,
        "Assegni un punteggio a ciascuno dei sei criteri, da zero al massimo indicato. Sotto ogni criterio trova tre fasce: servono perché giudici diversi usino lo stesso metro.",
        "Se vuole, scriva una nota: è facoltativa e resta agli atti.",
        "«Salva senza chiudere» conserva la scheda come bozza: non conta ancora, è un suo appunto.",
        "«Chiudi la scheda» quando ha deciso: solo una scheda chiusa entra in classifica, e per chiuderla servono tutti e sei i punteggi.",
        "«Riapri per correggere» le permette di cambiare idea finché le schede sono aperte.",
      ],
    },
    {
      h: "I sei criteri (art. 7), 100 punti in tutto",
      ul: criteri,
      dopo: [NOTA_CRITERIO_PRESENTAZIONE, `A parità di punteggio decide il criterio «${CRITERIO_DIRIMENTE_LICEI}».`],
    },
    {
      h: "Le regole",
      ul: [
        "Vede solo le sue schede: il punteggio degli altri commissari non le compare. Un voto letto prima di dare il proprio lo influenza, e due giudizi indipendenti valgono più di due giudizi che si somigliano.",
        "I progetti sono lavori di studenti, in gran parte minorenni: li usi solo per la valutazione e non li diffonda.",
        "Se riconosce una squadra, o l'ha seguita come mentor, usi «Conosco questa squadra»: il progetto passa subito a un collega.",
        `Se finisce prima e ha tempo, «Ho tempo, me ne dia altri» le affida, se ce ne sono, fino a ${PROGETTI_EXTRA} progetti che hanno ancora una lettura sola. È facoltativo.`,
      ],
    },
    {
      h: "Come si forma la classifica",
      ul: [
        "Per ogni progetto si calcola la media dei totali delle schede chiuse dai commissari con diritto di voto, di norma due.",
        `Prima dell'annuncio la Commissione rivede insieme i progetti fra l'8° e il 13° posto, dove un giudizio più severo o più generoso può fare la differenza.`,
        "Il referente del consorzio degli istituti superiori partecipa con funzioni consultive e senza diritto di voto, come prevede l'art. 8: legge i progetti e può lasciare note, ma i suoi punteggi non entrano nella media.",
      ],
    },
    {
      h: "Contatti",
      p: ["Per qualsiasi domanda o problema di accesso: Guido Putignano, Fondazione bioERGOtech, info@bioergotech.org."],
    },
  ],
};
