/**
 * Email di conferma dell'adesione di un istituto. Stessa impronta grafica
 * delle altre email transazionali del sito. Niente trattini lunghi.
 *
 * Fa una cosa in piu della semplice ricevuta: consegna al docente il codice
 * dell'istituto, che e lo strumento con cui fara partire tutto il resto. Va
 * scritto in modo che si possa incollare in una circolare senza riscriverlo.
 */

import {
  COMMISSIONE_PATH,
  CONTATTI_LICEI,
  LICEI,
  LICEI_PATH,
  REFERENTE_PATH,
  SITE_URL,
  STUDENTE_PATH,
  ruoloCommissioneLabel,
} from "@/app/eventi/vivere-piu-a-lungo/licei/content";

export type LiceiEmailInput = {
  referente: string;
  istituto: string;
  codice: string;
  studentiPrevisti: number;
  aggiornata: boolean;
  /** Link per impostare la password, se l'account e stato appena creato. */
  setPasswordUrl?: string;
};

export function liceiEmailSubject(aggiornata: boolean): string {
  return aggiornata
    ? `Adesione aggiornata . ${LICEI.titolo}`
    : `Adesione ricevuta . ${LICEI.titolo}`;
}

export function liceiEmailHtml(input: LiceiEmailInput): string {
  const { referente, istituto, codice, studentiPrevisti, aggiornata, setPasswordUrl } = input;
  const bandoUrl = `${SITE_URL}${LICEI_PATH}`;

  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
    <div style="background:#0A1628;padding:32px 40px;border-radius:12px 12px 0 0;">
      <h1 style="color:#00C896;font-size:22px;margin:0;font-weight:700;">Fondazione bioERGOtech</h1>
      <p style="color:#94A3B8;font-size:13px;margin:4px 0 0;">${LICEI.titolo}</p>
    </div>

    <div style="padding:36px 40px;background:#F8FAFB;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 12px 12px;">
      <h2 style="color:#0A1628;font-size:20px;margin:0 0 12px;font-weight:700;">
        ${aggiornata ? `Adesione aggiornata` : `Grazie, l'adesione è arrivata.`}
      </h2>
      <p style="color:#4A5568;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Gentile ${referente}, abbiamo registrato l'adesione di <strong>${istituto}</strong> al percorso
        formativo, con ${studentiPrevisti} studenti previsti. La verifichiamo e le confermiamo
        l'attivazione nei prossimi giorni.
      </p>

      <div style="background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
        <p style="color:#718096;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 12px;">Codice del vostro istituto</p>
        <p style="color:#0A1628;font-size:26px;font-weight:800;letter-spacing:0.12em;font-family:monospace;margin:0 0 12px;">${codice}</p>
        <p style="color:#4A5568;font-size:13px;line-height:1.6;margin:0;">
          Serve agli studenti per iscriversi al percorso. Lo riceverà di nuovo, insieme al link di
          iscrizione, quando apriremo le iscrizioni: non deve distribuirlo adesso.
        </p>
      </div>

      <p style="color:#718096;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 10px;">Che cosa succede adesso</p>
      <div style="background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:20px;margin-bottom:24px;">
        <p style="color:#4A5568;font-size:14px;line-height:1.75;margin:0 0 12px;">
          <strong style="color:#0A1628;">1.</strong> Confermiamo l'adesione dell'istituto e le scriviamo.
        </p>
        <p style="color:#4A5568;font-size:14px;line-height:1.75;margin:0 0 12px;">
          <strong style="color:#0A1628;">2.</strong> Le comunichiamo i termini per la raccolta delle
          candidature, che il bando affida al referente del consorzio dei licei.
        </p>
        <p style="color:#4A5568;font-size:14px;line-height:1.75;margin:0 0 12px;">
          <strong style="color:#0A1628;">3.</strong> Lei promuove il percorso fra gli studenti del
          triennio e gli studenti si iscrivono da soli, con il codice qui sopra. Non dovrà trascrivere
          elenchi: le iscrizioni arrivano nella sua area riservata e lei le conferma una per una.
        </p>
        <p style="color:#4A5568;font-size:14px;line-height:1.75;margin:0;">
          <strong style="color:#0A1628;">4.</strong> Il percorso si chiude il ${LICEI.dataLabel.toLowerCase()}
          al ${LICEI.luogo}, dove i ${LICEI.progettiSulPalco} progetti migliori salgono sul palco.
        </p>
      </div>

      <div style="background:#FFF8E6;border-left:3px solid #E4B33C;border-radius:0 6px 6px 0;padding:16px 20px;margin-bottom:24px;">
        <p style="color:#75570F;font-size:13.5px;line-height:1.65;margin:0;">
          <strong>Da preparare intanto.</strong> Le autorizzazioni dei genitori per gli studenti
          minorenni restano in custodia all'istituto: ne servono due, una per la partecipazione al
          percorso e una per la ripresa audiovisiva durante l'evento finale, che si svolge in seduta
          pubblica. Il modulo da far firmare, già intestato al vostro istituto, lo scarica dalla sua
          area riservata:
          <a href="${SITE_URL}${REFERENTE_PATH}" style="color:#8A6100;font-weight:700;">${SITE_URL}${REFERENTE_PATH}</a>
        </p>
      </div>

      ${
        setPasswordUrl
          ? `<div style="background:#f0fdf9;border-left:3px solid #00C896;border-radius:0 6px 6px 0;padding:16px 20px;margin-bottom:24px;">
              <p style="color:#065f46;font-size:14px;line-height:1.6;margin:0;">
                Abbiamo creato il suo account, da cui potrà seguire le iscrizioni dei suoi studenti.
                <a href="${setPasswordUrl}" style="color:#008F6B;font-weight:700;">Imposti la password</a>.
              </p>
            </div>`
          : ""
      }

      <p style="margin:0 0 24px;">
        <a href="${bandoUrl}" style="color:#008F6B;font-size:14px;font-weight:600;text-decoration:none;">Rileggi il bando &rarr;</a>
      </p>

      <hr style="border:none;border-top:1px solid #E2E8F0;margin:32px 0;" />
      <p style="color:#A0AEC0;font-size:12px;margin:0;line-height:1.6;">
        Per qualsiasi domanda scriva a
        <a href="mailto:${CONTATTI_LICEI.fondazione.email}" style="color:#008F6B;">${CONTATTI_LICEI.fondazione.email}</a>
        oppure a
        <a href="mailto:${CONTATTI_LICEI.organizzazione.email}" style="color:#008F6B;">${CONTATTI_LICEI.organizzazione.email}</a>.<br>
        Fondazione bioERGOtech e SafesPro .
        <a href="${SITE_URL}" style="color:#008F6B;">www.bioergotech.org</a>
      </p>
    </div>
  </div>`;
}

/* ── Email allo studente che si iscrive ───────────────────────────────── */

export type StudenteEmailInput = {
  nome: string;
  istituto: string;
  /** Link per impostare la password, se l'account e stato appena creato. */
  setPasswordUrl?: string;
};

export function studenteEmailSubject(): string {
  return `Iscrizione ricevuta . ${LICEI.titolo}`;
}

/**
 * Email allo studente. Diversa nel tono da quella al referente: si da del tu
 * e si dicono due cose che altrimenti scoprirebbe dopo, cioe che la scuola lo
 * deve riconoscere e che senza il modulo firmato non partecipa.
 */
export function studenteEmailHtml(input: StudenteEmailInput): string {
  const { nome, istituto, setPasswordUrl } = input;

  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
    <div style="background:#0A1628;padding:32px 40px;border-radius:12px 12px 0 0;">
      <h1 style="color:#00C896;font-size:22px;margin:0;font-weight:700;">Fondazione bioERGOtech</h1>
      <p style="color:#94A3B8;font-size:13px;margin:4px 0 0;">${LICEI.titolo}</p>
    </div>

    <div style="padding:36px 40px;background:#F8FAFB;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 12px 12px;">
      <h2 style="color:#0A1628;font-size:20px;margin:0 0 12px;font-weight:700;">Ciao ${nome}, ci sei.</h2>
      <p style="color:#4A5568;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Abbiamo ricevuto la tua iscrizione al percorso, tramite <strong>${istituto}</strong>.
      </p>

      <p style="color:#718096;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 10px;">Due cose da fare</p>
      <div style="background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:20px;margin-bottom:24px;">
        <p style="color:#4A5568;font-size:14px;line-height:1.75;margin:0 0 14px;">
          <strong style="color:#0A1628;">1. Il modulo di autorizzazione.</strong> Se sei minorenne
          serve la firma di un genitore. Il modulo lo ha il tuo docente referente: chiediglielo,
          fallo firmare e riportaglielo. Senza quel foglio non puoi partecipare, e non è una
          formalità che possiamo saltare.
        </p>
        <p style="color:#4A5568;font-size:14px;line-height:1.75;margin:0;">
          <strong style="color:#0A1628;">2. Aspetta la conferma.</strong> Il tuo referente controlla
          l'elenco e conferma le iscrizioni della vostra scuola. Ti scriviamo appena è fatto.
        </p>
      </div>

      ${
        setPasswordUrl
          ? `<div style="background:#f0fdf9;border-left:3px solid #00C896;border-radius:0 6px 6px 0;padding:16px 20px;margin-bottom:24px;">
              <p style="color:#065f46;font-size:14px;line-height:1.6;margin:0;">
                Abbiamo creato il tuo account, che ti servirà per seguire le lezioni.
                <a href="${setPasswordUrl}" style="color:#008F6B;font-weight:700;">Imposta la password</a>.
              </p>
            </div>`
          : ""
      }

      <p style="color:#4A5568;font-size:14px;line-height:1.7;margin:0 0 24px;">
        Il percorso è online e fuori dall'orario scolastico, quindi non ti toglie ore di lezione.
        Si chiude il ${LICEI.dataLabel.toLowerCase()} al ${LICEI.luogo}, dove i
        ${LICEI.progettiSulPalco} progetti migliori vengono presentati dal palco. Da chi li ha
        fatti, cioè da voi.
      </p>

      <hr style="border:none;border-top:1px solid #E2E8F0;margin:32px 0;" />
      <p style="color:#A0AEC0;font-size:12px;margin:0;line-height:1.6;">
        Per qualsiasi dubbio parlane prima con il tuo docente referente. Se serve, scrivi a
        <a href="mailto:${CONTATTI_LICEI.fondazione.email}" style="color:#008F6B;">${CONTATTI_LICEI.fondazione.email}</a>.<br>
        Fondazione bioERGOtech e SafesPro .
        <a href="${SITE_URL}${LICEI_PATH}" style="color:#008F6B;">Il bando</a>
      </p>
    </div>
  </div>`;
}

/* ── Fase 3. Consegna, Commissione, finalisti ─────────────────────────── */

const INTESTAZIONE = `
    <div style="background:#0A1628;padding:32px 40px;border-radius:12px 12px 0 0;">
      <h1 style="color:#00C896;font-size:22px;margin:0;font-weight:700;">Fondazione bioERGOtech</h1>
      <p style="color:#94A3B8;font-size:13px;margin:4px 0 0;">${LICEI.titolo}</p>
    </div>`;

const chiusura = (extra = ""): string => `
      <hr style="border:none;border-top:1px solid #E2E8F0;margin:32px 0;" />
      <p style="color:#A0AEC0;font-size:12px;margin:0;line-height:1.6;">
        ${extra}
        Fondazione bioERGOtech e SafesPro .
        <a href="${SITE_URL}${LICEI_PATH}" style="color:#008F6B;">Il bando</a> .
        <a href="mailto:${CONTATTI_LICEI.fondazione.email}" style="color:#008F6B;">${CONTATTI_LICEI.fondazione.email}</a>
      </p>`;

export type ConsegnaEmailInput = {
  nome: string;
  squadra: string;
  titolo: string;
  istituto: string;
};

export function consegnaEmailSubject(): string {
  return `Progetto consegnato . ${LICEI.titolo}`;
}

/**
 * Ricevuta della consegna, a tutta la squadra e non al solo capitano. Chi
 * non ha premuto il bottone ha comunque diritto di sapere che e stato
 * premuto, e su quale versione del lavoro.
 */
export function consegnaEmailHtml(input: ConsegnaEmailInput): string {
  const { nome, squadra, titolo, istituto } = input;

  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
    ${INTESTAZIONE}
    <div style="padding:36px 40px;background:#F8FAFB;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 12px 12px;">
      <h2 style="color:#0A1628;font-size:20px;margin:0 0 12px;font-weight:700;">Consegnato, ${nome}.</h2>
      <p style="color:#4A5568;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Il progetto della squadra <strong>${squadra}</strong>, per ${istituto}, è arrivato. Da questo
        momento non è più modificabile: è la versione che la Commissione leggerà.
      </p>

      <div style="background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:24px;margin-bottom:24px;">
        <p style="color:#718096;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px;">Il vostro progetto</p>
        <p style="color:#0A1628;font-size:17px;font-weight:700;margin:0;line-height:1.5;">${titolo}</p>
      </div>

      <p style="color:#4A5568;font-size:14px;line-height:1.7;margin:0 0 24px;">
        Adesso tocca alla Commissione. Valuta sui sei criteri dell'art. 7, gli stessi che avete
        trovato nel modulo di consegna, e i ${LICEI.progettiSulPalco} progetti migliori vengono
        presentati il ${LICEI.dataLabel.toLowerCase()} al ${LICEI.luogo}. Se siete fra quelli vi
        scriviamo noi, e all'evento vi iscriviamo noi: non dovete fare niente.
      </p>
      ${chiusura()}
    </div>
  </div>`;
}

export type CommissarioEmailInput = {
  nome: string;
  ruolo: string;
  diritto_voto: boolean;
  setPasswordUrl?: string;
};

export function commissarioEmailSubject(): string {
  return `Commissione di valutazione . ${LICEI.titolo}`;
}

/**
 * Email al membro della Commissione. Dice subito la cosa che gli serve
 * sapere per non sbagliare: se ha diritto di voto o se, come il referente
 * del consorzio nell'art. 8, siede con funzioni consultive.
 */
export function commissarioEmailHtml(input: CommissarioEmailInput): string {
  const { nome, ruolo, diritto_voto, setPasswordUrl } = input;
  const areaUrl = `${SITE_URL}${COMMISSIONE_PATH}`;

  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
    ${INTESTAZIONE}
    <div style="padding:36px 40px;background:#F8FAFB;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 12px 12px;">
      <h2 style="color:#0A1628;font-size:20px;margin:0 0 12px;font-weight:700;">Gentile ${nome},</h2>
      <p style="color:#4A5568;font-size:15px;line-height:1.7;margin:0 0 24px;">
        la ringraziamo per aver accettato di far parte della Commissione di valutazione del percorso
        ${LICEI.titolo}${ruolo ? `, in qualità di ${ruoloCommissioneLabel(ruolo).toLowerCase()}` : ""}.
      </p>

      <div style="background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:22px;margin-bottom:24px;">
        <p style="color:#4A5568;font-size:14px;line-height:1.75;margin:0 0 14px;">
          <strong style="color:#0A1628;">Come funziona.</strong> Nella sua area trova i progetti
          consegnati e una scheda per ciascuno, con i sei criteri dell'art. 7 e i rispettivi
          massimi, per un totale di ${LICEI.punteggioMassimo} punti. Vede solo le sue schede: il
          punteggio degli altri commissari non le compare, così il suo giudizio resta indipendente.
        </p>
        <p style="color:#4A5568;font-size:14px;line-height:1.75;margin:0;">
          <strong style="color:#0A1628;">${diritto_voto ? "Il suo voto conta nella media." : "Funzioni consultive."}</strong>
          ${
            diritto_voto
              ? "Una scheda entra in classifica solo quando la chiude, quindi la compili per intero e la confermi."
              : "Come previsto dall'art. 8 per il referente del consorzio, può leggere i progetti e lasciare note, ma i suoi punteggi non entrano nella media."
          }
        </p>
      </div>

      ${
        setPasswordUrl
          ? `<div style="background:#f0fdf9;border-left:3px solid #00C896;border-radius:0 6px 6px 0;padding:16px 20px;margin-bottom:24px;">
              <p style="color:#065f46;font-size:14px;line-height:1.6;margin:0;">
                Abbiamo creato il suo account.
                <a href="${setPasswordUrl}" style="color:#008F6B;font-weight:700;">Imposti la password</a>,
                poi acceda all'area della Commissione.
              </p>
            </div>`
          : ""
      }

      <div style="text-align:center;margin-bottom:8px;">
        <a href="${areaUrl}" style="display:inline-block;background:#00C896;color:#04231C;font-weight:700;font-size:15px;text-decoration:none;padding:13px 28px;border-radius:8px;">
          Area della Commissione
        </a>
      </div>
      ${chiusura()}
    </div>
  </div>`;
}

export type FinalistaEmailInput = {
  nome: string;
  squadra: string;
  titolo: string;
  codice: string;
  posizione: number | null;
};

export function finalistaEmailSubject(): string {
  return `Siete fra i finalisti . ${LICEI.titolo}`;
}

/**
 * Email al finalista. Porta il codice del biglietto, perche l'iscrizione
 * all'evento l'abbiamo fatta noi e lui non ha nessun altro modo di saperlo.
 */
export function finalistaEmailHtml(input: FinalistaEmailInput): string {
  const { nome, squadra, titolo, codice } = input;

  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
    ${INTESTAZIONE}
    <div style="padding:36px 40px;background:#F8FAFB;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 12px 12px;">
      <h2 style="color:#0A1628;font-size:20px;margin:0 0 12px;font-weight:700;">Ciao ${nome}, ce l'avete fatta.</h2>
      <p style="color:#4A5568;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Il progetto <strong>${titolo}</strong>, della squadra ${squadra}, è fra i
        ${LICEI.progettiSulPalco} che salgono sul palco. Lo presenterete voi, il
        ${LICEI.dataLabel.toLowerCase()} al ${LICEI.luogo}.
      </p>

      <div style="background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
        <p style="color:#718096;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 12px;">Il tuo codice per l'evento</p>
        <p style="color:#0A1628;font-size:26px;font-weight:800;letter-spacing:0.12em;font-family:monospace;margin:0 0 12px;">${codice}</p>
        <p style="color:#4A5568;font-size:13px;line-height:1.6;margin:0;">
          All'evento ti abbiamo iscritto noi, non devi compilare niente. Porta questo codice il
          giorno stesso.
        </p>
      </div>

      <p style="color:#4A5568;font-size:14px;line-height:1.7;margin:0 0 24px;">
        Il tuo docente referente riceve le indicazioni per l'accompagnamento e gli orari. Se sei
        minorenne, controlla con lui che in segreteria ci sia la tua autorizzazione firmata,
        comprese le riprese: l'evento è in seduta pubblica, e chi non acconsente alle riprese
        partecipa lo stesso.
      </p>
      ${chiusura()}
    </div>
  </div>`;
}

export type ConfermaEmailInput = {
  nome: string;
  istituto: string;
};

export function confermaEmailSubject(): string {
  return `Iscrizione confermata . ${LICEI.titolo}`;
}

/**
 * Email allo studente quando il referente lo conferma.
 *
 * Esiste perche l'email di iscrizione gliela promette ("ti scriviamo appena
 * e fatto"), e una promessa scoperta in un flusso automatico e peggio del
 * non averla fatta: lo studente resta ad aspettare un messaggio che nessuno
 * manda, e intanto la fase delle squadre passa.
 */
export function confermaEmailHtml(input: ConfermaEmailInput): string {
  const { nome, istituto } = input;
  const areaUrl = `${SITE_URL}${STUDENTE_PATH}`;

  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
    ${INTESTAZIONE}
    <div style="padding:36px 40px;background:#F8FAFB;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 12px 12px;">
      <h2 style="color:#0A1628;font-size:20px;margin:0 0 12px;font-weight:700;">Sei dentro, ${nome}.</h2>
      <p style="color:#4A5568;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Il docente referente di <strong>${istituto}</strong> ha confermato la tua iscrizione al
        percorso. Da adesso puoi seguire le lezioni con il tuo account, e quando apriremo la fase
        delle squadre puoi formarne una dalla tua area.
      </p>

      <div style="background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:22px;margin-bottom:24px;">
        <p style="color:#4A5568;font-size:14px;line-height:1.75;margin:0 0 12px;">
          <strong style="color:#0A1628;">La squadra.</strong> Da 2 a 5 studenti della tua stessa
          scuola. Uno di voi la crea e passa agli altri il codice: non serve deciderlo adesso, il
          lavoro in team è uno dei contenuti del corso.
        </p>
        <p style="color:#4A5568;font-size:14px;line-height:1.75;margin:0;">
          <strong style="color:#0A1628;">Il progetto.</strong> Lo scrivete insieme e lo consegnate
          dalla stessa area. I ${LICEI.progettiSulPalco} migliori vanno sul palco il
          ${LICEI.dataLabel.toLowerCase()} al ${LICEI.luogo}.
        </p>
      </div>

      <div style="text-align:center;margin-bottom:8px;">
        <a href="${areaUrl}" style="display:inline-block;background:#00C896;color:#04231C;font-weight:700;font-size:15px;text-decoration:none;padding:13px 28px;border-radius:8px;">
          La tua area
        </a>
      </div>
      ${chiusura("Per qualsiasi dubbio parlane prima con il tuo docente referente.<br>")}
    </div>
  </div>`;
}

export type ReferenteConsegnaEmailInput = {
  referente: string;
  istituto: string;
  squadra: string;
  titolo: string;
  componenti: string[];
};

export function referenteConsegnaEmailSubject(squadra: string): string {
  return `Progetto consegnato: ${squadra} . ${LICEI.titolo}`;
}

/**
 * Avviso al docente referente quando una squadra del suo istituto consegna.
 *
 * Serve perche il referente e l'unico che puo accorgersi in tempo di chi non
 * ha consegnato. Vederlo entrando nella sua area presuppone che ci entri, e
 * a novembre, fra scrutini e consigli di classe, non e un presupposto che si
 * possa dare per buono.
 */
export function referenteConsegnaEmailHtml(input: ReferenteConsegnaEmailInput): string {
  const { referente, istituto, squadra, titolo, componenti } = input;

  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
    ${INTESTAZIONE}
    <div style="padding:36px 40px;background:#F8FAFB;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 12px 12px;">
      <h2 style="color:#0A1628;font-size:20px;margin:0 0 12px;font-weight:700;">Una vostra squadra ha consegnato.</h2>
      <p style="color:#4A5568;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Gentile ${referente}, la squadra <strong>${squadra}</strong> di ${istituto} ha depositato il
        suo progetto. Da questo momento non è più modificabile: è la versione che la Commissione
        leggerà.
      </p>

      <div style="background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:22px;margin-bottom:24px;">
        <p style="color:#718096;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px;">Il progetto</p>
        <p style="color:#0A1628;font-size:16px;font-weight:700;margin:0 0 14px;line-height:1.5;">${titolo}</p>
        <p style="color:#718096;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 6px;">Componenti</p>
        <p style="color:#4A5568;font-size:14px;line-height:1.7;margin:0;">${componenti.join(" . ")}</p>
      </div>

      <p style="color:#4A5568;font-size:14px;line-height:1.7;margin:0 0 24px;">
        Nella sua area trova tutte le squadre del vostro istituto, con quelle che hanno consegnato e
        quelle che non lo hanno ancora fatto. È l'unico posto dove si vede chi è rimasto indietro
        mentre c'è ancora tempo per andarlo a cercare.
      </p>

      <div style="text-align:center;margin-bottom:8px;">
        <a href="${SITE_URL}${REFERENTE_PATH}" style="display:inline-block;background:#00C896;color:#04231C;font-weight:700;font-size:15px;text-decoration:none;padding:13px 28px;border-radius:8px;">
          La sua area
        </a>
      </div>
      ${chiusura()}
    </div>
  </div>`;
}
