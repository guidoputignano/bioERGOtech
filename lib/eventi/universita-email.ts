/**
 * Email di conferma della pre-iscrizione al bando universitario.
 *
 * Volutamente sobria: conferma che la candidatura e arrivata, ricorda il
 * codice e dice chiaramente le due cose che il candidato rischia di dare per
 * scontate, cioè che i termini arriveranno sui canali ufficiali e che
 * l'iscrizione all'evento del 10 dicembre è un'altra cosa.
 */

import {
  CONTATTI_UNIVERSITA,
  EVENT_SLUG,
  SITE_URL,
  UNIVERSITA_PATH,
} from "@/app/eventi/vivere-piu-a-lungo/universita/content";

export type UniversitaEmailInput = {
  nome: string;
  codice: string;
};

export function universitaEmailSubject(): string {
  return "Candidatura ricevuta . Biotecnologie e Intelligenza Artificiale";
}

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function universitaEmailHtml(input: UniversitaEmailInput): string {
  const { nome, codice } = input;
  const bando = `${SITE_URL}${UNIVERSITA_PATH}`;
  const evento = `${SITE_URL}/eventi/${EVENT_SLUG}`;

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
                  Candidatura ricevuta
                </h1>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#44506B;">
                  Ciao ${esc(nome)}, abbiamo registrato la tua candidatura al
                  percorso &ldquo;Biotecnologie e Intelligenza Artificiale&rdquo;.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4FCFA;border:1px solid #B4E3D8;border-radius:12px;padding:16px 18px;margin:0 0 20px;">
                  <tr>
                    <td>
                      <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#08594A;">
                        Codice della candidatura
                      </p>
                      <p style="margin:0;font-size:20px;font-weight:800;letter-spacing:.04em;color:#08594A;">
                        ${esc(codice)}
                      </p>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#44506B;">
                  Questa è una pre-iscrizione: non ti abbiamo chiesto un progetto perché il
                  progetto si costruisce durante il percorso, con il supporto dei mentor.
                  Le modalità operative e i termini saranno comunicati sui canali ufficiali
                  di Fondazione bioERGOtech e SafesPro.
                </p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#44506B;">
                  Una cosa da non dare per scontata: candidarsi al bando e iscriversi
                  all'evento del 10 dicembre sono due cose distinte. Se vuoi esserci quel
                  giorno, <a href="${evento}" style="color:#1A9E92;font-weight:600;">iscriviti anche alla giornata</a>.
                </p>
                <p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:#44506B;">
                  Il bando completo resta consultabile <a href="${bando}" style="color:#1A9E92;font-weight:600;">a questa pagina</a>.
                </p>
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
