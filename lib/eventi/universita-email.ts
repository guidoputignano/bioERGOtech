/**
 * Le email del percorso universitario.
 *
 * Il modulo gemello dei licei ripete il guscio HTML per intero in ogni
 * builder, ed e stata la scelta giusta finche le email erano tre. Qui i
 * momenti in cui il percorso scrive a qualcuno sono sette, e sette copie
 * della stessa tabella di quaranta righe garantiscono solo che prima o poi
 * una diverga dalle altre senza che nessuno se ne accorga. Quindi il guscio
 * e una funzione, e ogni email e il suo contenuto.
 *
 * Quello che NON si condivide e il testo: ogni email dice la sua cosa, e
 * una formula generica che vada bene per tutte non va bene per nessuna.
 */

import {
  CONTATTI_UNIVERSITA,
  CORSO_PATH,
  EVENT_SLUG,
  MENTOR_PATH,
  SITE_URL,
  STUDENTE_PATH,
  UNIVERSITA_PATH,
} from "@/app/eventi/vivere-piu-a-lungo/universita/content";

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const URL_BANDO = `${SITE_URL}${UNIVERSITA_PATH}`;
const URL_EVENTO = `${SITE_URL}/eventi/${EVENT_SLUG}`;
const URL_CORSO = `${SITE_URL}${CORSO_PATH}`;
const URL_AREA = `${SITE_URL}${STUDENTE_PATH}`;
const URL_MENTOR = `${SITE_URL}${MENTOR_PATH}`;
const URL_ACCESSO = `${SITE_URL}/auth/login`;

/* ── Il guscio ────────────────────────────────────────────────────────── */

const LINK = 'style="color:#1A9E92;font-weight:600;"';
const P = 'style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#44506B;"';

/**
 * Il contenitore di ogni email del modulo. Le email si leggono su client che
 * ignorano i fogli di stile, quindi tutto e in linea e tutto e una tabella:
 * non e trascuratezza, e l'unico modo perche arrivi uguale a chi la apre da
 * Outlook e a chi la apre dal telefono.
 */
function guscio(titolo: string, corpo: string): string {
  return `<!doctype html>
<html lang="it">
  <body style="margin:0;padding:0;background:#F4F6F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1A2332;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:36px 32px;">
            <tr>
              <td>
                <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#1A9E92;">
                  Fondazione bioERGOtech e SafesPro
                </p>
                <h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;color:#1A2332;">
                  ${esc(titolo)}
                </h1>
                ${corpo}
                <hr style="border:none;border-top:1px solid #E4E8EF;margin:26px 0 18px;" />
                <p style="margin:0;font-size:13px;line-height:1.7;color:#6B7793;">
                  Per informazioni: ${esc(CONTATTI_UNIVERSITA.fondazione.email)}
                  oppure ${esc(CONTATTI_UNIVERSITA.organizzazione.email)}.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Il riquadro verde di un dato da conservare: un codice, di solito. */
function riquadro(etichetta: string, valore: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4FCFA;border:1px solid #B4E3D8;border-radius:12px;padding:16px 18px;margin:0 0 20px;">
                  <tr>
                    <td>
                      <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#08594A;">
                        ${esc(etichetta)}
                      </p>
                      <p style="margin:0;font-size:20px;font-weight:800;letter-spacing:.04em;color:#08594A;">
                        ${esc(valore)}
                      </p>
                    </td>
                  </tr>
                </table>`;
}

/** Il bottone unico e principale di una email. Al massimo uno per messaggio. */
function bottone(url: string, testo: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
                  <tr>
                    <td style="background:#2EC4B6;border-radius:10px;">
                      <a href="${url}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">
                        ${esc(testo)}
                      </a>
                    </td>
                  </tr>
                </table>`;
}

/* ── 1. Candidatura ricevuta ──────────────────────────────────────────── */

export type UniversitaEmailInput = {
  nome: string;
  codice: string;
  /** Link per impostare la password, se l'account e stato appena creato. */
  setPasswordUrl?: string;
};

export function universitaEmailSubject(): string {
  return "Candidatura ricevuta . Biotecnologie e Intelligenza Artificiale";
}

/**
 * Volutamente sobria: conferma che la candidatura e arrivata, ricorda il
 * codice, apre la porta del corso e dice chiaramente le due cose che il
 * candidato rischia di dare per scontate, cioe che i termini arriveranno sui
 * canali ufficiali e che l'iscrizione all'evento del 10 dicembre e un'altra
 * cosa.
 *
 * La porta del corso e la novita della fase 2. Prima questa email diceva
 * "aspetta", e poi non succedeva niente per settimane.
 */
export function universitaEmailHtml(input: UniversitaEmailInput): string {
  const { nome, codice, setPasswordUrl } = input;

  const accesso = setPasswordUrl
    ? `<p ${P}>
                  Abbiamo creato il tuo account, che ti serve per seguire le lezioni e,
                  quando apriremo la fase, per la tua squadra e la consegna del progetto.
                  Scegli la password da qui:
                </p>
                ${bottone(setPasswordUrl, "Scegli la password")}
                <p style="margin:0 0 16px;font-size:13px;line-height:1.7;color:#6B7793;">
                  Il link vale una volta sola. Se scade, chiedine uno nuovo dalla
                  <a href="${URL_ACCESSO}" ${LINK}>pagina di accesso</a>: l'email è questa.
                </p>`
    : `<p ${P}>
                  Con questo indirizzo risultavi già registrato sul sito, quindi non abbiamo
                  creato un secondo account: entra con la password che usi già dalla
                  <a href="${URL_ACCESSO}" ${LINK}>pagina di accesso</a>.
                </p>`;

  const corpo = `<p ${P}>
                  Ciao ${esc(nome)}, abbiamo registrato la tua candidatura al
                  percorso &ldquo;Biotecnologie e Intelligenza Artificiale&rdquo;.
                </p>
                ${riquadro("Codice della candidatura", codice)}
                ${accesso}
                <p ${P}>
                  Puoi cominciare subito: il corso sugli agenti di intelligenza artificiale
                  è la parte già disponibile dei contenuti dell'art. 3, ed è
                  <a href="${URL_CORSO}" ${LINK}>a questo indirizzo</a>. Le lezioni sono in
                  inglese, il resto del percorso resta in italiano.
                </p>
                <p ${P}>
                  Questa è una pre-iscrizione: non ti abbiamo chiesto un progetto perché il
                  progetto si costruisce durante il percorso, con il supporto dei mentor.
                  Le modalità operative e i termini saranno comunicati sui canali ufficiali
                  di Fondazione bioERGOtech e SafesPro.
                </p>
                <p ${P}>
                  Una cosa da non dare per scontata: candidarsi al bando e iscriversi
                  all'evento del 10 dicembre sono due cose distinte. Se vuoi esserci quel
                  giorno, <a href="${URL_EVENTO}" ${LINK}>iscriviti anche alla giornata</a>.
                </p>
                <p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:#44506B;">
                  Il bando completo resta consultabile <a href="${URL_BANDO}" ${LINK}>a questa pagina</a>.
                </p>`;

  return guscio("Candidatura ricevuta", corpo);
}

/* ── 2. Nuovo link di accesso ─────────────────────────────────────────── */

export function universitaAccessoEmailSubject(): string {
  return "Il link per entrare nel percorso . Biotecnologie e Intelligenza Artificiale";
}

/**
 * Serve perche la candidatura crea l'account e manda quel link una volta
 * sola. Chi apre l'email e rimanda a dopo si ritrova un account senza
 * password: non entra nel corso, mentre in ogni schermata dello staff
 * risulta regolarmente candidato. Questa email la rimanda lo staff dal
 * pannello, ed e il rimedio a quel disallineamento.
 */
export function universitaAccessoEmailHtml(input: {
  nome: string;
  setPasswordUrl: string;
}): string {
  const corpo = `<p ${P}>
                  Ciao ${esc(input.nome)}, risulti nel percorso &ldquo;Biotecnologie e
                  Intelligenza Artificiale&rdquo;, ma il tuo account non ha ancora una
                  password, quindi non sei mai entrato nel corso.
                </p>
                ${bottone(input.setPasswordUrl, "Scegli la password")}
                <p ${P}>
                  Da lì entri nel <a href="${URL_CORSO}" ${LINK}>corso</a> e nella
                  <a href="${URL_AREA}" ${LINK}>tua area del percorso</a>, dove trovi la
                  squadra, la bacheca e il progetto.
                </p>
                <p style="margin:0;font-size:13px;line-height:1.7;color:#6B7793;">
                  Se il link scade, chiedine uno nuovo dalla
                  <a href="${URL_ACCESSO}" ${LINK}>pagina di accesso</a>.
                </p>`;

  return guscio("Il link per entrare", corpo);
}

/* ── 3. Candidatura confermata dallo staff ────────────────────────────── */

export function universitaConfermaEmailSubject(): string {
  return "Sei nel percorso . Biotecnologie e Intelligenza Artificiale";
}

export function universitaConfermaEmailHtml(input: { nome: string }): string {
  const corpo = `<p ${P}>
                  Ciao ${esc(input.nome)}, la tua candidatura al percorso
                  &ldquo;Biotecnologie e Intelligenza Artificiale&rdquo; è stata confermata.
                </p>
                <p ${P}>
                  Da adesso puoi seguire le lezioni con il tuo account e, quando apriremo le
                  fasi, formare una squadra e consegnare il progetto. Tutto succede
                  <a href="${URL_AREA}" ${LINK}>nella tua area</a>, e le stesse cose
                  compaiono dentro il corso nel punto in cui la lezione te le chiede.
                </p>
                ${bottone(URL_CORSO, "Vai al corso")}
                <p style="margin:0;font-size:13px;line-height:1.7;color:#6B7793;">
                  Non aspettare la squadra per cominciare: il lavoro in team è uno dei
                  contenuti del percorso, e ci si arriva meglio avendo già fatto qualche lezione.
                </p>`;

  return guscio("Sei nel percorso", corpo);
}

/* ── 4. Qualcuno chiede di entrare in squadra ─────────────────────────── */

export function universitaRichiestaEmailSubject(squadra: string): string {
  return `Una richiesta per la squadra ${squadra} . Percorso universitario`;
}

export function universitaRichiestaEmailHtml(input: {
  capitano: string;
  squadra: string;
  richiedente: string;
  universita: string;
  corso: string;
  messaggio?: string | null;
}): string {
  const messaggio = (input.messaggio ?? "").trim();

  const corpo = `<p ${P}>
                  Ciao ${esc(input.capitano)}, <strong>${esc(input.richiedente)}</strong> ha
                  chiesto di entrare nella squadra <strong>${esc(input.squadra)}</strong>.
                </p>
                <p ${P}>
                  Studia ${esc(input.corso)} presso ${esc(input.universita)}.
                </p>
                ${
                  messaggio
                    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F9FC;border-left:3px solid #2EC4B6;border-radius:8px;padding:14px 16px;margin:0 0 20px;">
                  <tr><td style="font-size:14px;line-height:1.7;color:#44506B;">${esc(messaggio)}</td></tr>
                </table>`
                    : ""
                }
                ${bottone(URL_AREA, "Rispondi alla richiesta")}
                <p style="margin:0;font-size:13px;line-height:1.7;color:#6B7793;">
                  Decidi tu: accettare o rifiutare non richiede una spiegazione. Chi rifiuti
                  resta in bacheca e può chiedere a un'altra squadra.
                </p>`;

  return guscio("Una richiesta per la tua squadra", corpo);
}

/* ── 5. Esito della richiesta ─────────────────────────────────────────── */

export function universitaEsitoRichiestaEmailSubject(accettata: boolean): string {
  return accettata
    ? "Sei dentro la squadra . Percorso universitario"
    : "Aggiornamento sulla tua richiesta . Percorso universitario";
}

export function universitaEsitoRichiestaEmailHtml(input: {
  nome: string;
  squadra: string;
  accettata: boolean;
}): string {
  if (input.accettata) {
    const corpo = `<p ${P}>
                  Ciao ${esc(input.nome)}, la squadra <strong>${esc(input.squadra)}</strong>
                  ha accettato la tua richiesta. Da adesso lavorate insieme.
                </p>
                ${bottone(URL_AREA, "Vai alla tua squadra")}
                <p style="margin:0;font-size:13px;line-height:1.7;color:#6B7793;">
                  Nella tua area trovi i compagni, la bozza del progetto e, quando la fase
                  si apre, la consegna.
                </p>`;
    return guscio("Sei nella squadra", corpo);
  }

  const corpo = `<p ${P}>
                  Ciao ${esc(input.nome)}, la squadra <strong>${esc(input.squadra)}</strong>
                  non ha accolto la tua richiesta.
                </p>
                <p ${P}>
                  Succede, e quasi mai riguarda te: una squadra può essere già al completo o
                  aver bisogno di competenze diverse. Resti in bacheca, e puoi chiedere a
                  un'altra squadra o crearne una tua.
                </p>
                ${bottone(URL_AREA, "Torna alla bacheca")}`;

  return guscio("Aggiornamento sulla tua richiesta", corpo);
}

/* ── 6. Candidatura a mentor ──────────────────────────────────────────── */

export function universitaMentorEmailSubject(): string {
  return "Candidatura come mentor ricevuta . Percorso universitario";
}

export function universitaMentorEmailHtml(input: { nome: string }): string {
  const corpo = `<p ${P}>
                  Gentile ${esc(input.nome)}, abbiamo ricevuto la sua candidatura come mentor
                  del percorso &ldquo;Biotecnologie e Intelligenza Artificiale&rdquo;.
                </p>
                <p ${P}>
                  La legge la direzione scientifica della Fondazione. L'esito dipende anche
                  dalle aree che i team stanno effettivamente affrontando, quindi un esito
                  negativo non è un giudizio sul suo profilo.
                </p>
                <p ${P}>
                  Se la candidatura viene accolta, le scriviamo per concordare
                  l'abbinamento con un team. Nessun mentor viene assegnato senza saperlo.
                </p>
                <p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:#44506B;">
                  L'elenco dei mentor del percorso è <a href="${URL_MENTOR}" ${LINK}>a questa pagina</a>.
                </p>`;

  return guscio("Candidatura ricevuta", corpo);
}

/* ── 7. Esito della candidatura a mentor ──────────────────────────────── */

export function universitaEsitoMentorEmailSubject(approvata: boolean): string {
  return approvata
    ? "La sua candidatura come mentor è stata accolta"
    : "Aggiornamento sulla sua candidatura come mentor";
}

export function universitaEsitoMentorEmailHtml(input: {
  nome: string;
  approvata: boolean;
  pubblicato: boolean;
  setPasswordUrl?: string;
}): string {
  if (!input.approvata) {
    const corpo = `<p ${P}>
                  Gentile ${esc(input.nome)}, la ringraziamo per la disponibilità. Per questa
                  edizione del percorso non riusciamo ad accogliere la sua candidatura.
                </p>
                <p ${P}>
                  Non è un giudizio sul suo profilo: l'abbinamento dipende dalle aree dei
                  progetti che i team stanno costruendo, e quelle cambiano a ogni edizione.
                  Se vuole, la ricontattiamo alla prossima.
                </p>`;
    return guscio("Aggiornamento sulla sua candidatura", corpo);
  }

  const account = input.setPasswordUrl
    ? `<p ${P}>
                  Abbiamo creato il suo account, da cui vedrà i progetti dei team che segue.
                  Scelga la password da qui:
                </p>
                ${bottone(input.setPasswordUrl, "Scegli la password")}`
    : "";

  const pubblicazione = input.pubblicato
    ? `<p ${P}>
                  Il suo profilo è ora nella <a href="${URL_MENTOR}" ${LINK}>pagina dei
                  mentor</a>. Se qualcosa va corretto, ce lo scriva e lo cambiamo.
                </p>`
    : `<p ${P}>
                  Non avendo dato il consenso alla pubblicazione, il suo profilo non compare
                  nella pagina pubblica: la vedono solo la Fondazione e i team a cui verrà
                  eventualmente abbinato. Se cambia idea, basta scriverci.
                </p>`;

  const corpo = `<p ${P}>
                  Gentile ${esc(input.nome)}, la sua candidatura come mentor del percorso
                  &ldquo;Biotecnologie e Intelligenza Artificiale&rdquo; è stata accolta.
                </p>
                ${account}
                ${pubblicazione}
                <p style="margin:0;font-size:13px;line-height:1.7;color:#6B7793;">
                  Chi segue un team non lo valuta: l'art. 8 chiede di dichiarare i conflitti
                  di interesse e di astenersi, e vale anche per il mentoring.
                </p>`;

  return guscio("La sua candidatura è stata accolta", corpo);
}

/* ── 8. Onboarding di un commissario ──────────────────────────────────── */

export function universitaCommissarioEmailSubject(): string {
  return "Commissione di valutazione . Biotecnologie e Intelligenza Artificiale";
}

export function universitaCommissarioEmailHtml(input: {
  nome: string;
  ruolo: string;
  dirittoVoto: boolean;
  setPasswordUrl?: string;
}): string {
  const account = input.setPasswordUrl
    ? `<p ${P}>Abbiamo creato il suo account. Scelga la password da qui:</p>
                ${bottone(input.setPasswordUrl, "Scegli la password")}`
    : `<p ${P}>
                  Con questo indirizzo risultava già registrato sul sito: entri con la
                  password che usa già, dalla <a href="${URL_ACCESSO}" ${LINK}>pagina di accesso</a>.
                </p>`;

  const voto = input.dirittoVoto
    ? `<p ${P}>
                  Vedrà solo le sue schede. Il punteggio degli altri commissari non le
                  comparirà, e non è riservatezza fine a se stessa: un voto letto prima di
                  dare il proprio lo tira verso di sé.
                </p>`
    : `<p ${P}>
                  Il suo ruolo è senza diritto di voto: vedrà i progetti e potrà scrivere
                  note, e i suoi numeri non entreranno nella media.
                </p>`;

  const corpo = `<p ${P}>
                  Gentile ${esc(input.nome)}, la ringraziamo per aver accettato di far parte
                  della Commissione di valutazione del percorso &ldquo;Biotecnologie e
                  Intelligenza Artificiale&rdquo;, con il ruolo di ${esc(input.ruolo)}.
                </p>
                ${account}
                ${voto}
                <p style="margin:0;font-size:13px;line-height:1.7;color:#6B7793;">
                  L'art. 8 chiede a ciascun componente di dichiarare eventuali conflitti di
                  interesse rispetto a singoli progetti o team, e di astenersi dalla relativa
                  valutazione.
                </p>`;

  return guscio("Commissione di valutazione", corpo);
}
