/**
 * Email di conferma dell'adesione di un istituto. Stessa impronta grafica
 * delle altre email transazionali del sito. Niente trattini lunghi.
 *
 * Fa una cosa in piu della semplice ricevuta: consegna al docente il codice
 * dell'istituto, che e lo strumento con cui fara partire tutto il resto. Va
 * scritto in modo che si possa incollare in una circolare senza riscriverlo.
 */

import {
  CONTATTI_LICEI,
  LICEI,
  LICEI_PATH,
  REFERENTE_PATH,
  SITE_URL,
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
