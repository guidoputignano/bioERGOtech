/**
 * Email di conferma della candidatura al bando. Stessa impronta grafica
 * delle altre email transazionali del sito: header scuro, accento verde,
 * corpo chiaro. Niente trattini lunghi nel testo.
 */

import {
  BANDO,
  BANDO_PATH,
  CALENDARIO,
  CANDIDATURE_SCADENZA_LABEL,
  CONTATTI,
  SITE_URL,
  categoriaBando,
} from "@/app/eventi/vivere-piu-a-lungo/bando/content";

export type BandoEmailInput = {
  nome: string;
  codice: string;
  categoria: string;
  progetto: string;
  /** Titoli degli allegati ricevuti, per far quadrare i conti al proponente. */
  allegati: string[];
  /** Vero se la candidatura esisteva già ed è stata aggiornata. */
  aggiornata: boolean;
  /** Link per impostare la password, se l'account è stato appena creato. */
  setPasswordUrl?: string;
};

export function bandoEmailSubject(aggiornata: boolean): string {
  return aggiornata
    ? `Candidatura aggiornata . ${BANDO.titolo}`
    : `Candidatura ricevuta . ${BANDO.titolo}`;
}

export function bandoEmailHtml(input: BandoEmailInput): string {
  const { nome, codice, categoria, progetto, allegati, aggiornata, setPasswordUrl } = input;
  const cat = categoriaBando(categoria);
  const bandoUrl = `${SITE_URL}${BANDO_PATH}`;

  const righeCalendario = CALENDARIO.map(
    (c) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #E2E8F0;color:#0A1628;font-size:13px;font-weight:600;">${c.fase}</td>
        <td style="padding:10px 0;border-bottom:1px solid #E2E8F0;color:#4A5568;font-size:13px;text-align:right;">${c.data}</td>
      </tr>`,
  ).join("");

  const listaAllegati = allegati.length
    ? `<ul style="margin:0;padding-left:18px;color:#4A5568;font-size:14px;line-height:1.8;">
         ${allegati.map((a) => `<li>${a}</li>`).join("")}
       </ul>`
    : `<p style="color:#4A5568;font-size:14px;margin:0;">Nessun allegato registrato.</p>`;

  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
    <div style="background:#0A1628;padding:32px 40px;border-radius:12px 12px 0 0;">
      <h1 style="color:#00C896;font-size:22px;margin:0;font-weight:700;">Fondazione bioERGOtech</h1>
      <p style="color:#94A3B8;font-size:13px;margin:4px 0 0;">${BANDO.titolo}</p>
    </div>

    <div style="padding:36px 40px;background:#F8FAFB;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 12px 12px;">
      <h2 style="color:#0A1628;font-size:20px;margin:0 0 12px;font-weight:700;">
        Ciao ${nome}, ${aggiornata ? "la tua candidatura è stata aggiornata." : "abbiamo ricevuto la tua candidatura."}
      </h2>
      <p style="color:#4A5568;font-size:15px;line-height:1.7;margin:0 0 24px;">
        ${
          aggiornata
            ? "La versione precedente è stata sostituita. Puoi continuare a modificarla"
            : "Puoi ancora modificarla"
        } fino al ${CANDIDATURE_SCADENZA_LABEL}, accedendo al Member Portal e reinviando il form con lo stesso nome del progetto.
      </p>

      <div style="background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:24px;margin-bottom:24px;">
        <p style="color:#718096;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 12px;">Codice della candidatura</p>
        <p style="color:#0A1628;font-size:24px;font-weight:800;letter-spacing:0.12em;font-family:monospace;margin:0 0 20px;">${codice}</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#718096;font-size:13px;">Progetto</td>
            <td style="padding:8px 0;color:#0A1628;font-size:13px;font-weight:600;text-align:right;">${progetto}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#718096;font-size:13px;">Categoria</td>
            <td style="padding:8px 0;color:#0A1628;font-size:13px;font-weight:600;text-align:right;">${cat ? `${cat.id}. ${cat.stadio}` : categoria}</td>
          </tr>
        </table>
      </div>

      <p style="color:#718096;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 10px;">Documentazione ricevuta</p>
      <div style="background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:20px;margin-bottom:24px;">
        ${listaAllegati}
      </div>

      <p style="color:#718096;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 10px;">I prossimi passi</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">${righeCalendario}</table>

      ${
        setPasswordUrl
          ? `<div style="background:#f0fdf9;border-left:3px solid #00C896;border-radius:0 6px 6px 0;padding:16px 20px;margin-bottom:24px;">
              <p style="color:#065f46;font-size:14px;line-height:1.6;margin:0;">
                Abbiamo creato il tuo account nel Member Portal, così potrai rientrare e aggiornare la candidatura.
                <a href="${setPasswordUrl}" style="color:#008F6B;font-weight:700;">Imposta la tua password</a>.
              </p>
            </div>`
          : ""
      }

      <p style="margin:0 0 24px;">
        <a href="${bandoUrl}" style="color:#008F6B;font-size:14px;font-weight:600;text-decoration:none;">Rileggi il bando &rarr;</a>
      </p>

      <div style="background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:20px;">
        <p style="color:#718096;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px;">Showcase di Innovazione</p>
        <p style="color:#0A1628;font-size:14px;line-height:1.7;margin:0;">
          ${BANDO.dataLabel}, ${BANDO.orarioLabel}<br>${BANDO.luogo}
        </p>
      </div>

      <hr style="border:none;border-top:1px solid #E2E8F0;margin:32px 0;" />
      <p style="color:#A0AEC0;font-size:12px;margin:0;line-height:1.6;">
        Per qualsiasi domanda sul bando scrivi a
        <a href="mailto:${CONTATTI.fondazione.email}" style="color:#008F6B;">${CONTATTI.fondazione.email}</a>.<br>
        Fondazione bioERGOtech . ${CONTATTI.sede}<br>
        <a href="${SITE_URL}" style="color:#008F6B;">www.bioergotech.org</a>
      </p>
    </div>
  </div>`;
}
