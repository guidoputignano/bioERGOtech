/**
 * Template dell'email di conferma iscrizione. Stile coerente con le altre
 * email transazionali del sito (vedi app/api/contact/route.ts): header scuro,
 * accento verde, corpo chiaro. Niente trattini lunghi nel testo.
 */

import { EVENT, SITE_URL, EVENT_SLUG, sessionBySlug } from "@/app/eventi/vivere-piu-a-lungo/content";
import type { SessionStatus } from "@/lib/eventi/registration";

export type ConfirmationEmailInput = {
  nome: string;
  codice: string;
  sessions: { slug: string; status: SessionStatus }[];
  /** Link per impostare la password, se l'account e stato appena creato. */
  setPasswordUrl?: string;
};

export function confirmationEmailSubject(): string {
  return `Iscrizione confermata . ${EVENT.titolo}`;
}

export function confirmationEmailHtml(input: ConfirmationEmailInput): string {
  const { nome, codice, sessions, setPasswordUrl } = input;
  const ticketUrl = `${SITE_URL}/eventi/${EVENT_SLUG}/biglietto/${encodeURIComponent(codice)}`;
  const qrUrl = `${SITE_URL}/api/eventi/qr/${encodeURIComponent(codice)}`;

  const rows = sessions
    .map((s) => {
      const sess = sessionBySlug(s.slug);
      if (!sess) return "";
      const stato =
        s.status === "lista_attesa"
          ? `<span style="color:#B7791F;font-weight:600;">Lista d'attesa</span>`
          : `<span style="color:#008F6B;font-weight:600;">Confermato</span>`;
      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #E2E8F0;color:#0A1628;font-size:14px;font-weight:600;">${sess.titolo}</td>
          <td style="padding:12px 0;border-bottom:1px solid #E2E8F0;color:#4A5568;font-size:13px;">${sess.giornoLabel}, ${sess.orario}<br>${sess.luogo}</td>
          <td style="padding:12px 0;border-bottom:1px solid #E2E8F0;font-size:13px;text-align:right;">${stato}</td>
        </tr>`;
    })
    .join("");

  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
    <div style="background:#0A1628;padding:32px 40px;border-radius:12px 12px 0 0;">
      <h1 style="color:#00C896;font-size:22px;margin:0;font-weight:700;">Fondazione bioERGOtech</h1>
      <p style="color:#94A3B8;font-size:13px;margin:4px 0 0;">${EVENT.titolo}</p>
    </div>

    <div style="padding:36px 40px;background:#F8FAFB;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 12px 12px;">
      <h2 style="color:#0A1628;font-size:20px;margin:0 0 12px;font-weight:700;">Ciao ${nome}, la tua iscrizione è confermata.</h2>
      <p style="color:#4A5568;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Grazie per esserti iscritto. Ecco il riepilogo delle sessioni scelte. Porta con te il codice qui sotto per il check-in in loco.
      </p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">${rows}</table>

      <div style="background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
        <p style="color:#718096;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 12px;">Il tuo codice di check-in</p>
        <p style="color:#0A1628;font-size:26px;font-weight:800;letter-spacing:0.12em;font-family:monospace;margin:0 0 16px;">${codice}</p>
        <img src="${qrUrl}" width="180" height="180" alt="QR code per il check-in, codice ${codice}" style="display:block;margin:0 auto;border:1px solid #E2E8F0;border-radius:8px;" />
        <p style="margin:16px 0 0;">
          <a href="${ticketUrl}" style="color:#008F6B;font-size:14px;font-weight:600;text-decoration:none;">Apri il tuo biglietto online &rarr;</a>
        </p>
      </div>

      ${
        setPasswordUrl
          ? `<div style="background:#f0fdf9;border-left:3px solid #00C896;border-radius:0 6px 6px 0;padding:16px 20px;margin-bottom:24px;">
              <p style="color:#065f46;font-size:14px;line-height:1.6;margin:0;">
                Abbiamo creato il tuo account nel Member Portal. <a href="${setPasswordUrl}" style="color:#008F6B;font-weight:700;">Imposta la tua password</a> per accedere.
              </p>
            </div>`
          : ""
      }

      <div style="background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:20px;">
        <p style="color:#718096;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px;">Dove e quando</p>
        <p style="color:#0A1628;font-size:14px;line-height:1.7;margin:0;">
          ${EVENT.dataLabel}<br>${EVENT.luogoLabel}
        </p>
      </div>

      <hr style="border:none;border-top:1px solid #E2E8F0;margin:32px 0;" />
      <p style="color:#A0AEC0;font-size:12px;margin:0;line-height:1.6;">
        Fondazione bioERGOtech . Taranto, Italia<br>
        <a href="mailto:info@bioergotech.org" style="color:#008F6B;">info@bioergotech.org</a> .
        <a href="${SITE_URL}" style="color:#008F6B;">www.bioergotech.org</a>
      </p>
    </div>
  </div>`;
}
