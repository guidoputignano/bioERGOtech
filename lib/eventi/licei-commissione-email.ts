/**
 * Le email del calendario automatico della Commissione dei licei: dal
 * promemoria di consegna agli studenti alla copertura con la riserva.
 *
 * Partono dal cron giornaliero (`lib/eventi/licei-commissione-auto.ts`),
 * e lo staff le vede in anteprima e se le manda in prova dal pannello. I
 * testi scritti a mano (nomi, istituti, squadre, titoli) passano tutti da
 * `esc`: queste email partono senza che nessuno guardi le righe.
 *
 * Registro: "tu" agli studenti, "Lei" a docenti e giudici, come nel resto
 * del modulo.
 */

import { INTESTAZIONE, chiusura, esc } from "@/lib/eventi/licei-email";
// Solo dati pubblici del talk: mai `link`, che resta agli iscritti.
import {
  luogoTalk,
  prossimoTalk,
  talkPath,
} from "@/app/eventi/vivere-piu-a-lungo/talk/content";
import {
  COMMISSIONE_PATH,
  LICEI,
  REFERENTE_PATH,
  SCADENZA_CONSEGNA_LABEL,
  SITE_URL,
  STUDENTE_PATH,
} from "@/app/eventi/vivere-piu-a-lungo/licei/content";
import {
  ANNUNCIO_FINALISTI_LABEL,
  DATE_PERCORSO,
  GIUDICI_PER_PROGETTO_LETTERE,
  MINUTI_PER_PROGETTO,
  PROGETTI_EXTRA,
  SCADENZA_GIUDICI_BREVE,
  SCADENZA_GIUDICI_LABEL,
  SCADENZA_RISERVA_LABEL,
  SCHEDE_MINIME,
  TEMI_PROGETTO,
} from "@/app/eventi/vivere-piu-a-lungo/licei/smistamento";

/* ── Pezzi comuni ─────────────────────────────────────────────────────── */

const p = (testo: string, margine = "0 0 18px") =>
  `<p style="color:#4A5568;font-size:15px;line-height:1.7;margin:${margine};">${testo}</p>`;

const titolo = (testo: string) =>
  `<h2 style="color:#0A1628;font-size:20px;margin:0 0 12px;font-weight:700;">${testo}</h2>`;

const bottone = (url: string, testo: string) => `
      <div style="margin:4px 0 26px;">
        <a href="${url}" style="display:inline-block;background:#00C896;color:#0A1628;font-weight:700;font-size:15px;text-decoration:none;padding:13px 26px;border-radius:8px;">${testo}</a>
      </div>`;

const riquadro = (etichetta: string, contenuto: string) => `
      <div style="background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:20px 22px;margin:0 0 22px;">
        <p style="color:#718096;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 10px;">${etichetta}</p>
        ${contenuto}
      </div>`;

const elenco = (voci: string[]) =>
  `<ul style="color:#4A5568;font-size:14.5px;line-height:1.7;margin:0;padding-left:20px;">${voci
    .map((v) => `<li style="margin:0 0 6px;">${v}</li>`)
    .join("")}</ul>`;

const cornice = (corpo: string) => `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
    ${INTESTAZIONE}
    <div style="padding:36px 40px;background:#F8FAFB;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 12px 12px;">
      ${corpo}
      ${chiusura()}
    </div>
  </div>`;

const saluto = (nome: string, ciao: boolean) => {
  const n = nome.trim();
  if (ciao) return n ? `Ciao ${esc(n.split(/\s+/)[0])},` : "Ciao,";
  return n ? `Gentile ${esc(n)},` : "Gentile docente,";
};

const firma = p("Un saluto,<br />Guido Putignano<br />Fondazione bioERGOtech", "0 0 8px");

const date = () =>
  riquadro(
    "Le prossime date",
    elenco(DATE_PERCORSO.map((d) => `<strong>${d.quando}</strong>: ${d.cosa}`)),
  );

const plurale = (n: number, uno: string, molti: string) => `${n} ${n === 1 ? uno : molti}`;

const maiuscola = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "mercoledì 25 novembre alle 23:59", per le frasi al passato. */
const CHIUSURA_CONSEGNE = SCADENZA_CONSEGNA_LABEL.replace(/ \d{4}, ore /, " alle ");

const AREA_STUDENTE = `${SITE_URL}${STUDENTE_PATH}`;
const AREA_DOCENTE = `${SITE_URL}${REFERENTE_PATH}`;
const AREA_GIUDICE = `${SITE_URL}${COMMISSIONE_PATH}`;

/* ── 16 novembre: aggiornamento ──────────────────────────────────────── */

/** Il prossimo talk, come lo annuncia l'aggiornamento. Solo dati pubblici. */
export type TalkAnnuncio = {
  titolo: string;
  sottotitolo: string;
  relatore: string;
  ruolo: string;
  /** "giovedì 19 novembre", per l'oggetto. */
  giorno: string;
  /** "Giovedì 19 novembre 2026, dalle 15:00 alle 16:00, online". */
  quando: string;
  url: string;
  aperto: boolean;
};

/**
 * Il talk da annunciare nell'aggiornamento: il prossimo non ancora finito
 * nel momento in cui l'email parte. Se il cron parte dopo il talk, il
 * riquadro sparisce da solo.
 */
export function talkDaAnnunciare(adesso: Date = new Date()): TalkAnnuncio | null {
  const t = prossimoTalk(adesso);
  if (!t) return null;
  return {
    titolo: t.titolo,
    sottotitolo: t.sottotitolo,
    relatore: t.relatore.nome,
    ruolo: t.relatore.ruolo,
    giorno: t.dataLabel.replace(/\s+\d{4}$/, "").toLowerCase(),
    quando: `${t.dataLabel}, ${t.orarioLabel}, ${luogoTalk(t).toLowerCase()}`,
    url: `${SITE_URL}${talkPath(t.slug)}`,
    aperto: !!t.apertoATutti,
  };
}

const riquadroTalk = (t: TalkAnnuncio, invito: string, bottoneTesto: string) => `
      <div style="background:#fff;border:1px solid #B4E3D8;border-left:4px solid #00C896;border-radius:8px;padding:20px 22px;margin:0 0 22px;">
        <p style="color:#008F6B;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px;">Il prossimo talk con gli esperti</p>
        <p style="color:#0A1628;font-size:17px;font-weight:700;line-height:1.4;margin:0 0 6px;">${esc(t.titolo)}</p>
        <p style="color:#4A5568;font-size:14px;line-height:1.6;margin:0 0 10px;">con <strong>${esc(t.relatore)}</strong>, ${esc(t.ruolo)}</p>
        <p style="color:#4A5568;font-size:14px;line-height:1.6;margin:0 0 10px;">${esc(t.sottotitolo)}</p>
        <p style="color:#0A1628;font-size:14px;font-weight:600;line-height:1.6;margin:0 0 12px;">${esc(t.quando)}</p>
        <p style="color:#4A5568;font-size:14px;line-height:1.6;margin:0 0 14px;">${invito}</p>
        <a href="${t.url}" style="display:inline-block;border:2px solid #00C896;color:#0A7A66;font-weight:700;font-size:14px;text-decoration:none;padding:9px 20px;border-radius:8px;">${bottoneTesto}</a>
      </div>`;

export const aggiornamentoStudentiSubject = (talk: TalkAnnuncio | null = null) =>
  talk
    ? `Il talk di ${talk.giorno} e la consegna dei progetti: le prossime date`
    : "Consegna dei progetti: le date e che cosa succede dopo";

export function aggiornamentoStudentiHtml({ nome, talk = null }: { nome: string; talk?: TalkAnnuncio | null }): string {
  const esempi = TEMI_PROGETTO.slice(0, 2).map((t) => `«${t.label}»`).join(" o ");
  const blocco = talk
    ? riquadroTalk(
        talk,
        `Un'ora per capire come raccontare il vostro progetto, prima della consegna del 25. Ci si iscrive dalla pagina del talk, con l'account delle lezioni, e il link per collegarsi compare lì.${talk.aperto ? " Il talk è aperto a tutti: puoi invitare anche compagni e amici." : ""}`,
        "Iscriviti al talk",
      )
    : "";
  return cornice(`
      ${titolo(saluto(nome, true))}
      ${p(talk ? `ti scriviamo con due cose: il talk di ${talk.giorno} e le date dei prossimi passi del percorso, fino all'evento finale.` : "ti scriviamo con le date dei prossimi passi del percorso, fino all'evento finale.")}
      ${blocco}
      ${date()}
      ${p(`<strong>Una novità nel modulo di consegna: i temi.</strong> Quando consegnate, scegliete uno o due temi fra quelli proposti, per esempio ${esempi}. Servono ad affidare il vostro progetto ai giudici che conoscono meglio quel campo.`)}
      ${p("Se il progetto della tua squadra non è ancora consegnato, ti mandiamo un promemoria il 23 e il 25 novembre. La consegna la fa il capitano, dall'area studenti.")}
      ${bottone(AREA_STUDENTE, "Vai al tuo progetto")}
      ${firma}`);
}

export const aggiornamentoScuoleSubject = (talk: TalkAnnuncio | null = null) =>
  talk
    ? `Il talk di ${talk.giorno} e il calendario fino al 10 dicembre . ${LICEI.titolo}`
    : `Il calendario fino all'evento del 10 dicembre . ${LICEI.titolo}`;

export function aggiornamentoScuoleHtml({ nome, talk = null }: { nome: string; talk?: TalkAnnuncio | null }): string {
  const blocco = talk
    ? riquadroTalk(
        talk,
        `È pensato per le squadre che stanno preparando la consegna del 25.${talk.aperto ? " È aperto a tutti: può partecipare anche lei, e condividerlo con le classi e con i colleghi." : " Possono partecipare anche i docenti."}`,
        "La pagina del talk",
      )
    : "";
  return cornice(`
      ${titolo(saluto(nome, false))}
      ${p("Le scriviamo con il calendario delle prossime settimane e con due cose in cui il suo aiuto fa la differenza.")}
      ${blocco}
      ${date()}
      ${riquadro(
        "Che cosa le chiediamo",
        elenco([
          `<strong>Ricordare alle squadre la scadenza</strong>: ${SCADENZA_CONSEGNA_LABEL}. Lunedì 23 novembre le mandiamo l'elenco delle squadre del suo istituto che non hanno ancora consegnato.`,
          `<strong>Organizzare fin d'ora la partecipazione all'evento finale</strong> di ${LICEI.dataLabel.toLowerCase()} al ${LICEI.luogo}. ${maiuscola(ANNUNCIO_FINALISTI_LABEL)} sapremo quali squadre salgono sul palco, ma l'evento è aperto a tutte le classi coinvolte: conviene avviare ora autorizzazioni e trasporti.`,
        ]),
      )}
      ${p(`Alla consegna le squadre scelgono uno o due temi: servono ad affidare ogni progetto ad almeno ${GIUDICI_PER_PROGETTO_LETTERE} giudici esperti di quel campo. Il 26 novembre riceverà il riepilogo dei progetti consegnati dal suo istituto.`)}
      ${bottone(AREA_DOCENTE, "Apri l'area docenti")}
      ${p("Per qualsiasi dubbio può rispondere a questa email.")}
      ${firma}`);
}

/* ── 23 e 25 novembre: promemoria di consegna ────────────────────────── */

export type PromemoriaStudente = {
  nome: string;
  /** Null: lo studente non e in una squadra. */
  squadra: string | null;
  titolo: string;
  ultimo: boolean;
};

export const promemoriaConsegnaSubject = (ultimo: boolean) =>
  ultimo ? "Oggi è l'ultimo giorno per consegnare il progetto" : "Mancano tre giorni alla consegna dei progetti";

export function promemoriaConsegnaStudenteHtml(i: PromemoriaStudente): string {
  const quando = i.ultimo
    ? `<strong>Oggi</strong>, entro le 23:59, è l'ultimo momento per consegnare.`
    : `Il termine è <strong>${SCADENZA_CONSEGNA_LABEL}</strong>: mancano tre giorni.`;
  const corpo = i.squadra
    ? `${p(`il progetto della squadra <strong>${esc(i.squadra)}</strong>${i.titolo.trim() ? ` («${esc(i.titolo.trim())}»)` : ""} è ancora in bozza. ${quando}`)}
      ${p("Controllate che ci siano tutte le risposte, scegliete i temi e fate premere al capitano «Consegna». Dopo la scadenza il modulo si chiude da solo e la bozza non arriva alla Commissione.")}`
    : `${p(`non risulti ancora in una squadra. ${quando}`)}
      ${p("Per consegnare un progetto serve una squadra, anche di una sola persona: dalla tua area puoi crearne una o entrare in quella di un compagno con il suo codice.")}`;
  return cornice(`
      ${titolo(saluto(i.nome, true))}
      ${corpo}
      ${bottone(AREA_STUDENTE, i.squadra ? "Apri il progetto" : "Apri la tua area")}
      ${p("Se hai già consegnato nel frattempo, ignora questa email.", "0 0 8px")}`);
}

export type PromemoriaDocente = {
  nome: string;
  istituto: string;
  inBozza: { squadra: string; componenti: number }[];
  senzaSquadra: number;
  consegnati: number;
};

export const promemoriaConsegnaDocenteSubject = () => "Le squadre del suo istituto che non hanno ancora consegnato";

export function promemoriaConsegnaDocenteHtml(i: PromemoriaDocente): string {
  const squadre = i.inBozza.length
    ? riquadro(
        `Ancora in bozza: ${i.inBozza.length}`,
        elenco(i.inBozza.map((s) => `${esc(s.squadra)} (${plurale(s.componenti, "studente", "studenti")})`)),
      )
    : "";
  const senza = i.senzaSquadra
    ? p(`${plurale(i.senzaSquadra, "studente non è", "studenti non sono")} ancora in una squadra: senza squadra non si consegna.`)
    : "";
  return cornice(`
      ${titolo(saluto(i.nome, false))}
      ${p(`mancano tre giorni alla consegna dei progetti: il termine è <strong>${SCADENZA_CONSEGNA_LABEL}</strong>. Finora ${esc(i.istituto)} ha consegnato ${plurale(i.consegnati, "progetto", "progetti")}.`)}
      ${squadre}
      ${senza}
      ${p("Le chiediamo di ricordarlo alle squadre: la consegna la fa il capitano dall'area studenti, e dopo la scadenza il modulo si chiude da solo. Abbiamo scritto anche a loro.")}
      ${bottone(AREA_DOCENTE, "Apri l'area docenti")}
      ${firma}`);
}

/* ── 26 novembre: smistamento ────────────────────────────────────────── */

export type GiudiceSmistamento = { nome: string; assegnati: number; riserva: boolean };

export const giudiceSmistamentoSubject = (riserva: boolean) =>
  riserva ? "Commissione: lei è nella riserva" : "Commissione: i suoi progetti sono pronti";

export function giudiceSmistamentoHtml(i: GiudiceSmistamento): string {
  if (i.riserva && i.assegnati === 0) {
    return cornice(`
      ${titolo(saluto(i.nome, false))}
      ${p("le consegne sono chiuse e i progetti sono stati affidati ai giudici. Lei fa parte della riserva interna: per ora non ha progetti da valutare.")}
      ${p(`Riceve progetti solo se servono: se un collega non ha iniziato entro mercoledì 2 dicembre, o se dopo il ${SCADENZA_GIUDICI_LABEL} a un progetto mancano schede. In quel caso le scriviamo subito, con i tempi.`)}
      ${firma}`);
  }
  const ore = Math.max(1, Math.round((i.assegnati * MINUTI_PER_PROGETTO) / 60));
  return cornice(`
      ${titolo(saluto(i.nome, false))}
      ${p(`le consegne sono chiuse e i progetti sono stati smistati. <strong>A lei ne sono stati affidati ${i.assegnati}</strong>, scelti soprattutto fra i temi che ha indicato. Ogni progetto è letto da ${GIUDICI_PER_PROGETTO_LETTERE} giudici, in modo indipendente.`)}
      ${riquadro(
        "In breve",
        elenco([
          `<strong>Scadenza:</strong> ${SCADENZA_GIUDICI_LABEL}.`,
          `<strong>Tempo:</strong> circa ${MINUTI_PER_PROGETTO} minuti a progetto, ${ore === 1 ? "un'ora" : `${ore} ore`} in tutto. Uno o due progetti al giorno bastano.`,
          "<strong>Le schede sono aperte:</strong> una scheda conta quando la chiude, con tutti e sei i punteggi.",
          "<strong>Se riconosce una squadra</strong>, usi «Conosco questa squadra»: il progetto passa a un collega.",
          `<strong>Se finisce prima e ha tempo</strong>, «Ho tempo, me ne dia altri» le affida ${PROGETTI_EXTRA} progetti in più.`,
        ]),
      )}
      ${bottone(AREA_GIUDICE, "Apri i miei progetti")}
      ${p("Lunedì 30 novembre le mandiamo un promemoria con il punto della situazione. Per qualsiasi dubbio può rispondere a questa email.")}
      ${firma}`);
}

export type ScuolaConsegne = {
  nome: string;
  istituto: string;
  consegnati: { squadra: string; titolo: string }[];
  nonConsegnati: number;
};

export const scuolaConsegneSubject = () => "Consegne chiuse: i progetti del suo istituto";

export function scuolaConsegneHtml(i: ScuolaConsegne): string {
  const progetti = i.consegnati.length
    ? riquadro(
        `Progetti consegnati: ${i.consegnati.length}`,
        elenco(i.consegnati.map((c) => `<strong>${esc(c.squadra)}</strong>: ${esc(c.titolo)}`)),
      )
    : p(`Dal suo istituto non sono arrivati progetti. Gli studenti restano comunque invitati all'evento finale di ${LICEI.dataLabel.toLowerCase()}.`);
  const mancanti = i.nonConsegnati
    ? p(`${plurale(i.nonConsegnati, "squadra non ha", "squadre non hanno")} consegnato in tempo: la loro bozza non va alla Commissione.`)
    : "";
  return cornice(`
      ${titolo(saluto(i.nome, false))}
      ${p(`le consegne si sono chiuse ${CHIUSURA_CONSEGNE}. Ecco il riepilogo per ${esc(i.istituto)}.`)}
      ${progetti}
      ${mancanti}
      ${riquadro(
        "Che cosa succede adesso",
        elenco([
          `<strong>Fino a ${SCADENZA_GIUDICI_BREVE}</strong> la Commissione valuta: ogni progetto è letto da ${GIUDICI_PER_PROGETTO_LETTERE} giudici esperti dei temi scelti dalla squadra.`,
          `<strong>${maiuscola(ANNUNCIO_FINALISTI_LABEL)}</strong> annunciamo i ${LICEI.progettiSulPalco} finalisti, e scriviamo direttamente alle squadre e a lei.`,
          `<strong>${LICEI.dataLabel}</strong>, l'evento finale al ${LICEI.luogo}. Se non lo ha già fatto, le consigliamo di avviare ora l'organizzazione dell'uscita.`,
        ]),
      )}
      ${firma}`);
}

export type StudenteDopoConsegna = { nome: string; squadra: string; titolo: string };

export const studenteDopoConsegnaSubject = () => "Il vostro progetto è passato alla Commissione";

export function studenteDopoConsegnaHtml(i: StudenteDopoConsegna): string {
  return cornice(`
      ${titolo(saluto(i.nome, true))}
      ${p(`le consegne sono chiuse e il progetto della squadra <strong>${esc(i.squadra)}</strong>, «${esc(i.titolo)}», è passato alla Commissione. Lo leggono ${GIUDICI_PER_PROGETTO_LETTERE} giudici esperti dei temi che avete scelto.`)}
      ${riquadro(
        "Le prossime date",
        elenco([
          `<strong>${maiuscola(ANNUNCIO_FINALISTI_LABEL)}</strong>: l'elenco dei ${LICEI.progettiSulPalco} progetti finalisti. Se il vostro è fra questi, vi scriviamo noi.`,
          `<strong>${LICEI.dataLabel}</strong>: l'evento finale al ${LICEI.luogo}, aperto anche a chi non sale sul palco.`,
        ]),
      )}
      ${p("Grazie per il lavoro di queste settimane.")}
      ${firma}`);
}

/* ── 30 novembre, 2 e 3 dicembre: i giudici ──────────────────────────── */

export type GiudiceMeta = { nome: string; assegnati: number; chiusi: number; nonIniziato: boolean };

export const giudiceMetaSubject = () => "Commissione: il punto a metà strada";

export function giudiceMetaHtml(i: GiudiceMeta): string {
  const mancano = i.assegnati - i.chiusi;
  const avviso = i.nonIniziato
    ? p(`Non risulta ancora nessuna scheda salvata. Se non riesce a iniziare entro <strong>martedì 1 dicembre</strong>, mercoledì mattina affidiamo i suoi progetti alla riserva interna, così nessuna squadra resta senza valutazione. Se preferisce lasciarli fin da ora, può semplicemente rispondere a questa email.`)
    : "";
  return cornice(`
      ${titolo(saluto(i.nome, false))}
      ${p(`un breve punto della situazione: ha chiuso <strong>${i.chiusi} schede su ${i.assegnati}</strong>, ne mancano ${mancano}. La scadenza è ${SCADENZA_GIUDICI_LABEL}.`)}
      ${avviso}
      ${bottone(AREA_GIUDICE, "Apri i miei progetti")}
      ${firma}`);
}

export const giudiceTolteSubject = () => "Commissione: i suoi progetti affidati alla riserva";

export function giudiceTolteHtml({ nome, n }: { nome: string; n: number }): string {
  return cornice(`
      ${titolo(saluto(nome, false))}
      ${p(`come anticipato lunedì, per rispettare i tempi abbiamo affidato i suoi ${plurale(n, "progetto", "progetti")} alla riserva interna. Grazie comunque per la disponibilità.`)}
      ${p(`Se nei prossimi giorni ha tempo, dalla sua area può ancora chiedere progetti con «Ho tempo, me ne dia altri»: ogni scheda in più rende la valutazione più solida.`)}
      ${bottone(AREA_GIUDICE, "Apri la mia area")}
      ${firma}`);
}

export type GiudiceNuovi = {
  nome: string;
  n: number;
  /** Il termine da indicare: quello dei giudici, o quello della riserva il 4 dicembre. */
  entro: string;
};

export const giudiceNuoviSubject = () => "Commissione: nuovi progetti da valutare";

export function giudiceNuoviHtml(i: GiudiceNuovi): string {
  return cornice(`
      ${titolo(saluto(i.nome, false))}
      ${p(`le abbiamo affidato <strong>${plurale(i.n, "progetto", "progetti")}</strong> da valutare: ${i.n === 1 ? "lo trova" : "li trova"} nella sua area, con le schede aperte.`)}
      ${p(`Le chiediamo di chiudere le schede entro <strong>${i.entro}</strong>. Grazie per l'aiuto.`)}
      ${bottone(AREA_GIUDICE, "Apri i miei progetti")}
      ${firma}`);
}

export const giudiceUltimoGiornoSubject = () => "Commissione: oggi è l'ultimo giorno";

export function giudiceUltimoGiornoHtml({ nome, mancano, assegnati }: { nome: string; mancano: number; assegnati: number }): string {
  return cornice(`
      ${titolo(saluto(nome, false))}
      ${p(`oggi è l'ultimo giorno per le schede: le mancano <strong>${plurale(mancano, "scheda", "schede")} su ${assegnati}</strong>, da chiudere entro le 23:59.`)}
      ${p(`Domani mattina i progetti con meno di ${SCHEDE_MINIME} schede chiuse passano alla riserva interna. Una scheda salvata ma non chiusa non conta: per chiuderla servono tutti e sei i punteggi.`)}
      ${bottone(AREA_GIUDICE, "Apri i miei progetti")}
      ${firma}`);
}

export const ENTRO_GIUDICI = SCADENZA_GIUDICI_LABEL;
export const ENTRO_RISERVA = SCADENZA_RISERVA_LABEL;

/* ── Allo staff ──────────────────────────────────────────────────────── */

export const staffRiepilogoSubject = (cosa: string) => `[Commissione licei] ${cosa}`;

/** Il riepilogo per lo staff: un titolo e righe gia scritte, con l'escape fatto qui. */
export function staffRiepilogoHtml(cosa: string, righe: string[]): string {
  return cornice(`
      ${titolo(esc(cosa))}
      ${elenco(righe.map(esc))}
      ${p(`Il dettaglio è nel pannello dei licei, scheda «Commissione».`, "18px 0 0")}`);
}
