/**
 * Calendario dei "Talk con gli esperti": il link per Google Calendar e il
 * file .ics per Apple Calendar e Outlook.
 *
 * Funzioni pure, senza React, senza Supabase e senza import di valori da
 * `content.ts` (solo il tipo): le chiama il server, che passa al browser le
 * URL gia pronte, e le provano i test senza un database.
 *
 * Il link della riunione non si legge mai dal talk: arriva solo come
 * parametro `link`, che il server passa per chi e iscritto e ancora idoneo
 * (`statoTalk` per Google, `linkPerIscritto` per il file .ics). Senza quel
 * parametro il calendario e quello pubblico: la descrizione rimanda alla
 * pagina del talk, dove gli iscritti trovano come collegarsi.
 */

import type { Talk } from "@/app/eventi/vivere-piu-a-lungo/talk/content";

/** I soli campi che servono al calendario. */
export type TalkCalendario = Pick<
  Talk,
  "slug" | "titolo" | "sottotitolo" | "relatore" | "inizio" | "fine" | "modalita" | "luogo"
>;

/**
 * Una data ISO con fuso nel formato UTC "di base" di calendari e iCalendar:
 * "2026-11-09T15:00:00+01:00" diventa "20261109T140000Z". Il fuso del talk
 * resta nella data di partenza; qui si converte, e cosi ogni calendario la
 * mostra all'ora locale di chi la apre.
 */
export function dataUtcBase(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new Error(`Data non valida: ${iso}`);
  return d
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z")
    .replace(/[-:]/g, "");
}

/** Il titolo dell'evento nel calendario. */
export const titoloCalendario = (t: TalkCalendario): string =>
  `Talk con gli esperti: ${t.titolo} (${t.relatore.nome})`;

/**
 * Il luogo dell'evento: per un talk online il link della riunione, se c'e
 * (cosi il calendario lo mostra come collegamento), altrimenti "Online";
 * in presenza, il luogo.
 */
export const luogoCalendario = (t: TalkCalendario, link: string | null = null): string =>
  t.modalita === "online" ? (link ?? "Online") : (t.luogo ?? "");

/**
 * La descrizione: due righe sul talk, il link per collegarsi se c'e, e la
 * pagina del talk. Senza link, quella pubblica: la pagina e dove gli
 * iscritti lo trovano.
 */
export function descrizioneCalendario(
  t: TalkCalendario,
  url: string,
  link: string | null = null,
): string {
  const talk = [t.sottotitolo, `Con ${t.relatore.nome}, ${t.relatore.ruolo}.`];
  if (link) return [...talk, `Link per collegarti: ${link}`, `Pagina del talk: ${url}`].join("\n\n");
  return [
    ...talk,
    `Pagina del talk e iscrizione: ${url}`,
    t.modalita === "online"
      ? "Il link per collegarti compare nella pagina del talk, dopo l'accesso, a chi è iscritto."
      : null,
  ]
    .filter((x): x is string => !!x)
    .join("\n\n");
}

/**
 * Il link "aggiungi a Google Calendar". Le date viaggiano in chiaro: sono
 * solo cifre, `T`, `Z` e la barra che le separa, e cosi le legge Google.
 *
 * Con `link` (solo per chi e iscritto e ancora idoneo, dal server) il luogo
 * e la descrizione contengono il link della riunione. E il link "template"
 * di Google, che funziona per chiunque: non il link dell'evento sul
 * calendario privato dell'organizzatore, che si apre solo se quel
 * calendario e pubblico.
 */
export function googleCalendarUrl(t: TalkCalendario, url: string, link: string | null = null): string {
  const parti: [string, string][] = [
    ["action", "TEMPLATE"],
    ["text", titoloCalendario(t)],
    ["dates", `${dataUtcBase(t.inizio)}/${dataUtcBase(t.fine)}`],
    ["details", descrizioneCalendario(t, url, link)],
    ["location", luogoCalendario(t, link)],
  ];
  return (
    "https://calendar.google.com/calendar/render?" +
    parti.map(([k, v]) => `${k}=${k === "dates" ? v : encodeURIComponent(v)}`).join("&")
  );
}

/* ── iCalendar (RFC 5545) ─────────────────────────────────────────────── */

/**
 * Escaping di un valore TEXT: barra rovesciata, punto e virgola, virgola e
 * a capo (sezione 3.3.11). La barra va per prima, se no raddoppierebbe
 * quelle appena aggiunte.
 */
export function escapeIcs(testo: string): string {
  return testo
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

const encoder = new TextEncoder();

/**
 * Piega una riga oltre i 75 ottetti (sezione 3.1): la prima riga ne tiene
 * al massimo 75, ogni continuazione comincia con uno spazio e ne tiene al
 * massimo 74 piu lo spazio. Si conta in byte UTF-8 e si taglia fra un
 * carattere e l'altro, mai dentro una lettera accentata: "è" sono due byte,
 * e spezzarli darebbe un carattere rotto in ogni calendario.
 */
export function piegaRigaIcs(riga: string): string {
  const pezzi: string[] = [];
  let corrente = "";
  let byte = 0;
  let limite = 75;
  for (const carattere of riga) {
    const n = encoder.encode(carattere).length;
    if (byte + n > limite) {
      pezzi.push(corrente);
      corrente = carattere;
      byte = n;
      limite = 74;
    } else {
      corrente += carattere;
      byte += n;
    }
  }
  pezzi.push(corrente);
  return pezzi.join("\r\n ");
}

/** L'identificativo stabile del talk: lo stesso a ogni download, cosi un secondo import aggiorna e non duplica. */
export const uidTalk = (slug: string): string => `talk-${slug}@bioergotech.org`;

/**
 * Il file .ics, con un solo evento. Le righe finiscono con CRLF, come chiede
 * lo standard, anche l'ultima. `adesso` e il DTSTAMP, passato da fuori per
 * poterlo fissare nei test. `link`, solo per chi e iscritto e ancora idoneo,
 * va in LOCATION e in DESCRIPTION; senza, il file e quello pubblico. L'UID
 * e lo stesso nei due casi: importare il file con il link dopo quello
 * pubblico aggiorna l'evento invece di duplicarlo.
 */
export function generaIcs(
  t: TalkCalendario,
  url: string,
  adesso: Date = new Date(),
  link: string | null = null,
): string {
  const righe = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Fondazione bioERGOtech//Talk con gli esperti//IT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uidTalk(t.slug)}`,
    `DTSTAMP:${dataUtcBase(adesso.toISOString())}`,
    `DTSTART:${dataUtcBase(t.inizio)}`,
    `DTEND:${dataUtcBase(t.fine)}`,
    `SUMMARY:${escapeIcs(titoloCalendario(t))}`,
    `DESCRIPTION:${escapeIcs(descrizioneCalendario(t, url, link))}`,
    `LOCATION:${escapeIcs(luogoCalendario(t, link))}`,
    `URL:${url}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:-PT30M",
    `DESCRIPTION:${escapeIcs(titoloCalendario(t))}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return righe.map(piegaRigaIcs).join("\r\n") + "\r\n";
}
