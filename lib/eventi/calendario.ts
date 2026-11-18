/**
 * "Aggiungi al calendario" per le giornate dell'evento: il link di Google
 * Calendar per una giornata e il file .ics (che Apple, Outlook e Android
 * aprono) per una o più giornate.
 *
 * Senza React e senza rete: lo usano il modulo (lato client), il biglietto,
 * le email e la rotta /api/eventi/calendario, che serve il file .ics.
 */

import { EVENT, EVENT_SLUG, SESSIONS, SITE_URL, type EventSession } from "@/app/eventi/vivere-piu-a-lungo/content";
import { isCodiceClasse, urlClasse } from "@/lib/eventi/classi";

/** 2026-12-10T09:00:00+01:00 -> 20261210T080000Z */
function utcCompatto(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * L'URL del biglietto online, se c'è un codice. Il codice di una classe
 * (VPC-) porta alla pagina della classe: un biglietto personale con quel
 * codice non esiste.
 */
export function urlBiglietto(codice: string): string {
  if (isCodiceClasse(codice)) return `${SITE_URL}${urlClasse(codice)}`;
  return `${SITE_URL}/eventi/${EVENT_SLUG}/biglietto/${encodeURIComponent(codice)}`;
}

function titoloEvento(s: EventSession): string {
  return `${EVENT.titolo.split(":")[0]}, ${s.etichetta} al ${s.luogoBreve}`;
}

function descrizione(s: EventSession, codice?: string): string {
  const righe = [
    `${EVENT.titolo}. ${s.titolo}.`,
    `${s.giornoLabel}, ${s.orario}, ${s.luogo}.`,
  ];
  if (codice) {
    righe.push(`${isCodiceClasse(codice) ? "La prenotazione della classe" : "Il tuo biglietto"}: ${urlBiglietto(codice)}`);
  }
  righe.push(`Programma: ${SITE_URL}/eventi/${EVENT_SLUG}`);
  return righe.join("\n");
}

/** Il link "Aggiungi a Google Calendar" per una giornata. */
export function googleCalendarUrl(s: EventSession, codice?: string): string {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: titoloEvento(s),
    dates: `${utcCompatto(s.inizioISO)}/${utcCompatto(s.fineISO)}`,
    details: descrizione(s, codice),
    location: s.luogo,
    ctz: "Europe/Rome",
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/** Il link al file .ics di una o più giornate, servito da /api/eventi/calendario. */
export function icsUrl(slugs: readonly string[], codice?: string, assoluto = true): string {
  const p = new URLSearchParams({ giorni: slugs.join(",") });
  if (codice) p.set("codice", codice);
  return `${assoluto ? SITE_URL : ""}/api/eventi/calendario?${p.toString()}`;
}

/** Testo per un campo iCalendar: virgole, punti e virgola, backslash e a capo protetti. */
function escapeIcs(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Le righe oltre i 75 byte vanno spezzate (RFC 5545, 3.1). */
function piega(riga: string): string {
  const out: string[] = [];
  let corrente = "";
  let byte = 0;
  for (const ch of riga) {
    const n = new TextEncoder().encode(ch).length;
    if (byte + n > (out.length === 0 ? 75 : 74)) {
      out.push(corrente);
      corrente = "";
      byte = 0;
    }
    corrente += ch;
    byte += n;
  }
  out.push(corrente);
  return out.join("\r\n ");
}

/**
 * Il file .ics con le giornate indicate (nell'ordine dell'evento). Il codice,
 * se c'è, finisce solo nel link al biglietto e nell'UID: non è un dato
 * personale.
 */
export function icsEvento(slugs: readonly string[], codice?: string, adesso: Date = new Date()): string {
  const giornate = SESSIONS.filter((s) => slugs.includes(s.slug));
  const stamp = utcCompatto(adesso.toISOString());
  const righe = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Fondazione bioERGOtech//Vivere piu a lungo//IT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const s of giornate) {
    righe.push(
      "BEGIN:VEVENT",
      `UID:${s.slug}-${(codice ?? "evento").toLowerCase()}@bioergotech.org`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${utcCompatto(s.inizioISO)}`,
      `DTEND:${utcCompatto(s.fineISO)}`,
      `SUMMARY:${escapeIcs(titoloEvento(s))}`,
      `LOCATION:${escapeIcs(s.luogo)}`,
      `DESCRIPTION:${escapeIcs(descrizione(s, codice))}`,
      `URL:${codice ? urlBiglietto(codice) : `${SITE_URL}/eventi/${EVENT_SLUG}`}`,
      // Un promemoria il giorno prima, alle 18.
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcs(titoloEvento(s))}`,
      "TRIGGER:-PT15H",
      "END:VALARM",
      "END:VEVENT",
    );
  }
  righe.push("END:VCALENDAR");
  return righe.map(piega).join("\r\n") + "\r\n";
}
