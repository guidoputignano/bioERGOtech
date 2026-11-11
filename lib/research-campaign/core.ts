/**
 * Research Centres campaign: pure logic.
 *
 * No imports from Next.js or Supabase, so `node --test` can run the tests in
 * tests/research-campaign.test.mjs directly (Node strips the types). Keep the
 * syntax erasable: no enums, no namespaces, no parameter properties.
 *
 * Everything that decides whether an e-mail may leave the building lives
 * here (checkSendable), so the rule is written once and tested once.
 */

// ── Vocabularies ────────────────────────────────────────────────────────

/**
 * Pipeline: Discovered → Verified → Approved → Initial Email Sent (contacted)
 * → Follow-Up Due → Replied (responded) → Qualified → Meeting Requested →
 * Negotiation → Hosting Confirmed / Closed; side states No Response,
 * Not Eligible (ineligible), Declined, Paused.
 */
export const INSTITUTION_STATUSES = [
  "discovered", "verified", "approved", "contacted", "followup_due", "responded",
  "qualified", "meeting", "negotiating", "confirmed", "closed",
  "no_response", "ineligible", "declined", "paused",
] as const;
export type InstitutionStatus = (typeof INSTITUTION_STATUSES)[number];

export const STATUS_TEXT: Record<InstitutionStatus, string> = {
  discovered: "Discovered", verified: "Verified", approved: "Approved", contacted: "Initial email sent",
  followup_due: "Follow-up due", responded: "Replied", qualified: "Qualified", meeting: "Meeting requested",
  negotiating: "Negotiation", confirmed: "Hosting confirmed", closed: "Closed", no_response: "No response",
  ineligible: "Not eligible", declined: "Declined", paused: "Paused",
};

/** Statuses in which the automatic e-mail sequence may continue. */
export const SEQUENCE_STATUSES: ReadonlySet<string> = new Set(["contacted", "followup_due"]);

export const REPLY_LABELS = [
  "interested", "more_info", "meeting_requested", "fee_request", "referred",
  "requests_coordinator", "not_eligible", "not_interested", "out_of_office",
  "auto_ack", "unclear",
] as const;
export type ReplyLabel = (typeof REPLY_LABELS)[number];

export const REPLY_LABEL_TEXT: Record<ReplyLabel, string> = {
  interested: "Interested",
  more_info: "Requests more information",
  meeting_requested: "Requests a meeting",
  fee_request: "Requests programme fees",
  referred: "Refers to another person",
  requests_coordinator: "No responsible person named",
  not_eligible: "Not eligible",
  not_interested: "Not interested",
  out_of_office: "Out of office",
  auto_ack: "Automatic acknowledgement",
  unclear: "Unclear, needs human review",
};

/** Required action per class, shown next to every reply. */
export const REPLY_LABEL_ACTION: Record<ReplyLabel, string> = {
  interested: "Notify the owner and prepare a next-step reply",
  more_info: "Draft a reply to their actual questions",
  meeting_requested: "Priority: coordinate the meeting",
  fee_request: "Record the charges and ask for an itemised quotation",
  referred: "Add the referred contact and continue with them",
  requests_coordinator: "Draft Template 4 (ask who is responsible)",
  not_eligible: "Record the restriction and stop",
  not_interested: "Close respectfully",
  out_of_office: "Record the return date; follow-ups wait until then",
  auto_ack: "Keep on record; the sequence continues",
  unclear: "Read it and decide",
};

/** Classes that do NOT stop the automatic follow-ups. Everything else does. */
export const NON_STOPPING_LABELS: ReadonlySet<ReplyLabel> = new Set<ReplyLabel>(["out_of_office", "auto_ack"]);

/** Status an institution moves to when a reply class is confirmed. */
export const LABEL_TO_STATUS: Record<ReplyLabel, InstitutionStatus | null> = {
  interested: "qualified",
  more_info: "responded",
  meeting_requested: "meeting",
  fee_request: "negotiating",
  referred: "responded",
  requests_coordinator: "responded",
  not_eligible: "ineligible",
  not_interested: "declined",
  out_of_office: null,
  auto_ack: null,
  unclear: "responded",
};

export const CALL_OUTCOMES = [
  "connected", "voicemail", "referred", "direct_contact", "written_info_requested", "declined", "follow_up_agreed", "no_answer",
] as const;

// ── Normalisation ───────────────────────────────────────────────────────

export function normaliseEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase().replace(/^mailto:/, "");
  return v || null;
}

export function isValidEmail(value: unknown): boolean {
  const v = normaliseEmail(value);
  if (!v) return false;
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(v);
}

/** "https://www.Salk.edu/about/" → "salk.edu". Returns null for junk. */
export function normaliseDomain(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  let v = value.trim().toLowerCase();
  if (v.includes("@") && !v.includes("/")) v = v.split("@").pop() || "";
  if (!/^[a-z]+:\/\//.test(v)) v = "https://" + v;
  try {
    const host = new URL(v).hostname.replace(/^www\./, "");
    return host.includes(".") ? host : null;
  } catch {
    return null;
  }
}

export function emailDomain(email: unknown): string | null {
  const v = normaliseEmail(email);
  if (!v || !v.includes("@")) return null;
  return v.split("@").pop() || null;
}

/**
 * True when `host` is `domain` or one of its subdomains
 * (mail.salk.edu belongs to salk.edu; notsalk.edu does not).
 */
export function domainMatches(host: string | null, domain: string | null): boolean {
  if (!host || !domain) return false;
  return host === domain || host.endsWith("." + domain);
}

/**
 * Registrable-ish root for matching replies: "cumc.columbia.edu" and
 * "columbia.edu" share "columbia.edu". Good enough for .edu/.org/.com/.gov;
 * two-part public suffixes are not needed for a US campaign.
 */
export function rootDomain(host: string | null): string | null {
  if (!host) return null;
  const parts = host.split(".").filter(Boolean);
  return parts.length <= 2 ? parts.join(".") : parts.slice(-2).join(".");
}

/** US-default E.164. Accepts "+1 (206) 548-7055", "206-548-7055", "+12065487055". */
export function toE164(value: unknown, defaultCountryCode = "1"): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim();
  const digits = raw.replace(/[^\d]/g, "");
  let out: string;
  if (raw.startsWith("+")) out = "+" + digits;
  else if (defaultCountryCode === "1" && digits.length === 10) out = "+1" + digits;
  else if (defaultCountryCode === "1" && digits.length === 11 && digits.startsWith("1")) out = "+" + digits;
  else return null;
  return /^\+[1-9]\d{6,14}$/.test(out) ? out : null;
}

const STATE_TZ: Record<string, string> = {
  CA: "America/Los_Angeles", WA: "America/Los_Angeles", OR: "America/Los_Angeles", NV: "America/Los_Angeles",
  AZ: "America/Phoenix", UT: "America/Denver", CO: "America/Denver", NM: "America/Denver",
  TX: "America/Chicago", IL: "America/Chicago", WI: "America/Chicago", MN: "America/Chicago",
  MO: "America/Chicago", TN: "America/Chicago", AL: "America/Chicago", LA: "America/Chicago",
  IA: "America/Chicago", OK: "America/Chicago", KS: "America/Chicago", NE: "America/Chicago",
  NY: "America/New_York", NJ: "America/New_York", MA: "America/New_York", PA: "America/New_York",
  MD: "America/New_York", DC: "America/New_York", VA: "America/New_York", NC: "America/New_York",
  GA: "America/New_York", FL: "America/New_York", CT: "America/New_York", RI: "America/New_York",
  NH: "America/New_York", VT: "America/New_York", ME: "America/New_York", DE: "America/New_York",
  OH: "America/New_York", MI: "America/New_York", SC: "America/New_York", IN: "America/Indiana/Indianapolis",
  KY: "America/New_York", WV: "America/New_York",
};

export function timezoneForState(state: unknown): string | null {
  if (typeof state !== "string") return null;
  return STATE_TZ[state.trim().toUpperCase()] || null;
}

/** Calling window in the institution's local time, and the same window in Italy. */
export function callingWindow(timezone: string | null): string {
  if (!timezone) return "10:00–12:00 or 14:00–16:00 local time (time zone unknown)";
  const italy: Record<string, string> = {
    "America/New_York": "16:00–18:00 or 20:00–22:00 Italy",
    "America/Indiana/Indianapolis": "16:00–18:00 or 20:00–22:00 Italy",
    "America/Chicago": "17:00–19:00 or 21:00–23:00 Italy",
    "America/Denver": "18:00–20:00 or 22:00–24:00 Italy",
    "America/Phoenix": "18:00–20:00 or 22:00–24:00 Italy (no US DST)",
    "America/Los_Angeles": "19:00–21:00 or 23:00–01:00 Italy",
  };
  return `10:00–12:00 or 14:00–16:00 ${timezone} (${italy[timezone] || "check Italy offset"}), weekdays`;
}

// ── Scoring ─────────────────────────────────────────────────────────────

export type ScoreParts = {
  score_outreach: number; score_international: number; score_capacity: number;
  score_relevance: number; score_august: number; score_cost: number; score_contact: number;
};

export const SCORE_MAX: ScoreParts = {
  score_outreach: 30, score_international: 20, score_capacity: 15,
  score_relevance: 10, score_august: 10, score_cost: 10, score_contact: 5,
};

export function clampScores(parts: Partial<Record<keyof ScoreParts, unknown>>): ScoreParts {
  const out = {} as ScoreParts;
  for (const k of Object.keys(SCORE_MAX) as (keyof ScoreParts)[]) {
    const n = Math.round(Number(parts[k]));
    out[k] = Number.isFinite(n) ? Math.max(0, Math.min(SCORE_MAX[k], n)) : 0;
  }
  return out;
}

export function totalScore(parts: Partial<Record<keyof ScoreParts, unknown>>): number {
  const c = clampScores(parts);
  return Object.values(c).reduce((a, b) => a + b, 0);
}

/**
 * Priority from evidence, per the brief: an explicit exclusion is C whatever
 * the score; A needs both a strong score and a verified channel.
 */
export function derivePriority(score: number, hasVerifiedChannel: boolean, ineligible: boolean): "A" | "B" | "C" {
  if (ineligible) return "C";
  if (score >= 60 && hasVerifiedChannel) return "A";
  if (score >= 40) return "B";
  return "C";
}

// ── CSV ─────────────────────────────────────────────────────────────────

/** RFC 4180 parser: quoted fields, "" escapes, commas and newlines in quotes, CRLF, BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') { inQuotes = true; continue; }
    if (ch === ",") { row.push(field); field = ""; continue; }
    if (ch === "\r") continue;
    if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    field += ch;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Header row → objects with lower-cased, underscore keys. */
export function csvToRecords(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""));
  return rows.slice(1).map((r) => {
    const rec: Record<string, string> = {};
    header.forEach((h, i) => { if (h) rec[h] = (r[i] ?? "").trim(); });
    return rec;
  });
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = typeof v === "string" ? v : String(v);
  // Spreadsheet formula injection: a cell starting with = + - @ runs as a formula.
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const lines = [columns.map(csvCell).join(",")];
  for (const r of rows) lines.push(columns.map((c) => csvCell(r[c])).join(","));
  return lines.join("\r\n") + "\r\n";
}

// ── Import planning ─────────────────────────────────────────────────────

export type ImportInstitution = {
  ref_code: string | null; name: string; domain: string | null; website: string | null;
  city: string | null; state: string | null; cluster: string | null; institution_type: string | null;
  specialisations: string | null; programme_evidence: string | null; formats: string | null;
  eligibility_notes: string | null; fees_published: string | null; august_availability: string | null;
  key_unknowns: string | null; priority: "A" | "B" | "C" | null; previous_outreach: string | null;
  next_action: string | null; source_url: string | null; checked_on: string | null;
  ineligible_reason: string | null; status: InstitutionStatus;
} & ScoreParts;

export type ImportContact = {
  department: string | null; person_name: string | null; email: string | null;
  phone_e164: string | null; contact_form_url: string | null; source_url: string | null;
  verification: "unverified" | "verified_named" | "verified_department" | "form_only";
  verified_on: string | null; timezone: string | null; notes: string | null;
};

export type ImportRow = { line: number; institution: ImportInstitution; contacts: ImportContact[]; warnings: string[] };

const pick = (r: Record<string, string>, ...keys: string[]): string | null => {
  for (const k of keys) {
    const v = r[k];
    if (v !== undefined && v.trim() !== "") return v.trim();
  }
  return null;
};

function verificationFrom(text: string | null, hasName: boolean): ImportContact["verification"] {
  const t = (text || "").toLowerCase();
  if (!t || t.includes("unverified") || t.includes("not verified") || t.includes("search excerpt")) return "unverified";
  if (t.includes("verified")) return hasName && t.includes("named") ? "verified_named" : "verified_department";
  return "unverified";
}

function isIsoDate(v: string | null): string | null {
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

/**
 * Turns one CSV record into an institution + contacts. Accepts the columns of
 * the research file (02_CANDIDATES.csv) and the export of this module.
 * Several e-mails/phones in one cell ("a@x.org ; b@x.org") become several
 * contacts. Contacts are never marked approved by an import.
 */
export function mapImportRecord(r: Record<string, string>, line: number): ImportRow | { line: number; error: string } {
  const name = pick(r, "institution", "name", "institution_name");
  if (!name) return { line, error: "Missing institution name" };
  const warnings: string[] = [];
  const website = pick(r, "website", "source_url");
  const domain = normaliseDomain(pick(r, "website")) || normaliseDomain(pick(r, "source_url")?.split(/\s*;\s*/)[0] ?? null);

  const scoreTotalFromFile = Number(pick(r, "score"));
  const parts = clampScores({
    score_outreach: pick(r, "score_outreach"), score_international: pick(r, "score_international"),
    score_capacity: pick(r, "score_capacity"), score_relevance: pick(r, "score_relevance"),
    score_august: pick(r, "score_august"), score_cost: pick(r, "score_cost"), score_contact: pick(r, "score_contact"),
  });
  if (totalScore(parts) === 0 && Number.isFinite(scoreTotalFromFile) && scoreTotalFromFile > 0) {
    warnings.push(`Only a total score (${scoreTotalFromFile}) was given; enter the seven parts to keep it`);
  }

  const pr = (pick(r, "priority") || "").toUpperCase();
  const priority = pr === "A" || pr === "B" || pr === "C" ? pr : null;
  const eligibility = pick(r, "eligibility_published", "eligibility_notes");
  // Only an explicit column marks an institution ineligible. Notes such as
  // "excluded if under 18" or "ineligible for that programme" are conditions
  // on one programme, not a verdict on the institution.
  const ineligible = pick(r, "ineligible_reason");
  const previous = pick(r, "previous_outreach");

  const state = pick(r, "state");
  const tz = timezoneForState(state);
  const institution: ImportInstitution = {
    ref_code: pick(r, "id", "ref_code"),
    name, domain, website: website?.split(/\s*;\s*/)[0] ?? null,
    city: pick(r, "city"), state, cluster: pick(r, "cluster"),
    institution_type: pick(r, "type", "institution_type"),
    specialisations: pick(r, "specialisations"),
    programme_evidence: pick(r, "programme_evidence"), formats: pick(r, "format", "formats"),
    eligibility_notes: eligibility, fees_published: pick(r, "fee_published", "fees_published"),
    august_availability: pick(r, "august", "august_availability"), key_unknowns: pick(r, "key_unknowns"),
    priority, previous_outreach: previous && !/^none$/i.test(previous) ? previous : null,
    next_action: pick(r, "next_action"), source_url: pick(r, "source_url"),
    checked_on: isIsoDate(pick(r, "checked_on")), ineligible_reason: ineligible,
    status: ineligible ? "ineligible" : "discovered",
    ...parts,
  };

  const emails = (pick(r, "email") || "").split(/\s*[;,]\s*/).filter(Boolean);
  const phones = (pick(r, "phone_e164", "phone") || "").split(/\s*;\s*/).filter(Boolean);
  const names = (pick(r, "named_contact", "person_name") || "").split(/\s*;\s*/).filter(Boolean);
  const verificationText = pick(r, "email_verification", "verification");
  const contacts: ImportContact[] = [];
  const n = Math.max(emails.length, phones.length, emails.length || phones.length ? 0 : (pick(r, "form_url", "contact_form_url") ? 1 : 0));
  for (let i = 0; i < n; i++) {
    const email = emails[i] ? normaliseEmail(emails[i]) : null;
    if (email && !isValidEmail(email)) { warnings.push(`Invalid e-mail skipped: ${emails[i]}`); }
    const validEmail = email && isValidEmail(email) ? email : null;
    const phone = phones[i] ? toE164(phones[i]) : null;
    if (phones[i] && !phone) warnings.push(`Phone not in E.164, skipped: ${phones[i]}`);
    const personName = names[i] ?? (n === 1 ? names[0] ?? null : null);
    if (!validEmail && !phone && !pick(r, "form_url", "contact_form_url")) continue;
    contacts.push({
      department: pick(r, "contact_channel", "department"),
      person_name: personName,
      email: validEmail,
      phone_e164: phone,
      contact_form_url: pick(r, "form_url", "contact_form_url"),
      source_url: pick(r, "source_url"),
      verification: !validEmail && !phone ? "form_only" : verificationFrom(verificationText, !!personName),
      verified_on: isIsoDate(pick(r, "checked_on", "verified_on")),
      timezone: tz,
      notes: verificationText,
    });
  }
  return { line, institution, contacts, warnings };
}

export type ExistingInstitution = { id: string; name: string; domain: string | null };
export type ExistingContact = { id: string; email: string | null; institution_id: string };

export type ImportPlan = {
  creates: ImportRow[];
  updates: { id: string; row: ImportRow }[];
  duplicateRows: { line: number; name: string; reason: string }[];
  skippedContacts: { line: number; email: string; reason: string }[];
  errors: { line: number; error: string }[];
};

/**
 * Deduplicates against the database and within the file itself.
 * Institutions match on domain first, then on case-insensitive name.
 * A contact e-mail already used anywhere in the campaign is skipped, so the
 * same person can never be imported twice or under two institutions.
 */
export function planImport(
  records: Record<string, string>[],
  existingInstitutions: ExistingInstitution[],
  existingContacts: ExistingContact[],
): ImportPlan {
  const plan: ImportPlan = { creates: [], updates: [], duplicateRows: [], skippedContacts: [], errors: [] };
  const byDomain = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const i of existingInstitutions) {
    if (i.domain) byDomain.set(i.domain, i.id);
    byName.set(i.name.trim().toLowerCase(), i.id);
  }
  const usedEmails = new Set(existingContacts.map((c) => (c.email || "").toLowerCase()).filter(Boolean));
  const seenInFile = new Map<string, number>();

  records.forEach((rec, idx) => {
    const line = idx + 2; // header is line 1
    const mapped = mapImportRecord(rec, line);
    if ("error" in mapped) { plan.errors.push(mapped); return; }
    const key = mapped.institution.domain ? "d:" + mapped.institution.domain : "n:" + mapped.institution.name.toLowerCase();
    const nameKey = "n:" + mapped.institution.name.toLowerCase();
    const firstLine = seenInFile.get(key) ?? seenInFile.get(nameKey);
    if (firstLine !== undefined) {
      plan.duplicateRows.push({ line, name: mapped.institution.name, reason: `Same institution as line ${firstLine}` });
      return;
    }
    seenInFile.set(key, line);
    seenInFile.set(nameKey, line);

    mapped.contacts = mapped.contacts.filter((c) => {
      if (!c.email) return true;
      if (usedEmails.has(c.email)) {
        plan.skippedContacts.push({ line, email: c.email, reason: "E-mail already in this campaign" });
        return false;
      }
      usedEmails.add(c.email);
      return true;
    });

    const existingId = (mapped.institution.domain && byDomain.get(mapped.institution.domain))
      || byName.get(mapped.institution.name.trim().toLowerCase());
    if (existingId) plan.updates.push({ id: existingId, row: mapped });
    else plan.creates.push(mapped);
  });
  return plan;
}

// ── Templates ───────────────────────────────────────────────────────────

/**
 * Fills {{placeholders}}. Anything left unfilled is reported, and square
 * bracket prompts like "[verified research area]" are reported too, so a
 * draft with a gap can never be approved by accident.
 */
export function renderTemplate(text: string, vars: Record<string, string | null | undefined>): { text: string; missing: string[] } {
  const missing = new Set<string>();
  const out = text.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_m, k: string) => {
    // null/undefined = not known yet → stays visible and blocks approval.
    // An empty string is a deliberate "nothing here" (e.g. no staff clause).
    const v = vars[k];
    if (v === undefined || v === null) { missing.add(k); return `{{${k}}}`; }
    return String(v);
  });
  return { text: out, missing: [...missing] };
}

export function unresolvedMarkers(text: string): string[] {
  const markers = new Set<string>();
  for (const m of text.matchAll(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi)) markers.add(`{{${m[1]}}}`);
  for (const m of text.matchAll(/\[[^\]\n]{2,80}\]/g)) markers.add(m[0]);
  return [...markers];
}

// ── Business days ───────────────────────────────────────────────────────

/** US federal holidays that would make a follow-up land on a closed office. */
export function usFederalHolidays(year: number): Set<string> {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const nth = (month: number, weekday: number, n: number) => {
    const d = new Date(Date.UTC(year, month, 1));
    while (d.getUTCDay() !== weekday) d.setUTCDate(d.getUTCDate() + 1);
    d.setUTCDate(d.getUTCDate() + 7 * (n - 1));
    return d;
  };
  const last = (month: number, weekday: number) => {
    const d = new Date(Date.UTC(year, month + 1, 0));
    while (d.getUTCDay() !== weekday) d.setUTCDate(d.getUTCDate() - 1);
    return d;
  };
  const observed = (month: number, day: number) => {
    const d = new Date(Date.UTC(year, month, day));
    if (d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() - 1);
    if (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1);
    return d;
  };
  return new Set([
    iso(observed(0, 1)), iso(nth(0, 1, 3)), iso(nth(1, 1, 3)), iso(last(4, 1)),
    iso(observed(5, 19)), iso(observed(6, 4)), iso(nth(8, 1, 1)), iso(nth(9, 1, 2)),
    iso(observed(10, 11)), iso(nth(10, 4, 4)), iso(observed(11, 25)),
  ]);
}

export function addBusinessDays(start: Date, days: number): Date {
  const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  let added = 0;
  let holidays = usFederalHolidays(d.getUTCFullYear());
  while (added < days) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (d.getUTCMonth() === 0 && d.getUTCDate() === 1) holidays = usFederalHolidays(d.getUTCFullYear());
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6) continue;
    if (holidays.has(d.toISOString().slice(0, 10))) continue;
    added++;
  }
  return d;
}

/** Calendar days, or business days (weekends and US federal holidays skipped). */
export function addScheduleDays(start: Date, days: number, mode: "business" | "calendar"): Date {
  if (mode === "business") return addBusinessDays(start, days);
  const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/**
 * Due dates of the sequence, all counted from the INITIAL e-mail (Day 7 is
 * seven days after the initial, not after the first reminder). Dates are
 * calendar dates; the daily job sends on or after them inside the
 * recipient's window.
 */
export function sequenceDueDates(initialSentAt: string | Date, c: { schedule_mode: "business" | "calendar"; followup1_days: number; followup2_days: number; no_response_after_days: number }) {
  const start = new Date(initialSentAt);
  const fu1 = addScheduleDays(start, c.followup1_days, c.schedule_mode);
  const fu2 = addScheduleDays(start, c.followup2_days, c.schedule_mode);
  const noResponse = addScheduleDays(start, c.followup2_days + c.no_response_after_days, c.schedule_mode);
  return { followup1: fu1, followup2: fu2, noResponse };
}

// ── Sending window (recipient's local business hours) ───────────────────

/** Local weekday (0 = Sunday) and hour in a time zone, e.g. America/Chicago. */
export function localTime(timezone: string, at: Date): { weekday: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { weekday, hour: Number(get("hour")), minute: Number(get("minute")) };
}

/**
 * True when it is a weekday between start and end hour in the recipient's
 * time zone. Unknown time zone → US Eastern, the most common case, so that
 * nothing goes out at night by default.
 */
export function inSendWindow(timezone: string | null, at: Date, startHour: number, endHour: number): boolean {
  const t = localTime(timezone || "America/New_York", at);
  if (t.weekday === 0 || t.weekday === 6) return false;
  return t.hour >= startHour && t.hour < endHour;
}

// ── The send gate ───────────────────────────────────────────────────────

export type GateCampaign = {
  status: string; sending_enabled: boolean; sender_email: string | null;
  daily_send_cap: number; approved_at: string | null;
};
export type GateInstitution = { id: string; status: string; ineligible_reason: string | null; followups_paused?: boolean };
export type GateContact = { id: string; email: string | null; approved_for_contact: boolean; institution_id: string; followups_paused?: boolean };
export type GateMessage = {
  id: string; direction: string; state: string; approved_at: string | null; approved_by: string | null;
  subject: string | null; body: string | null; contact_id: string | null; institution_id: string; step?: string; historical?: boolean;
};

const CLOSED_INSTITUTION: ReadonlySet<string> = new Set(["declined", "ineligible", "paused", "closed", "confirmed", "no_response"]);

/**
 * Every reason this message must not be sent now. Empty array = may send.
 * Called for each message immediately before it is sent, by the send
 * button and by the daily job alike.
 */
export function checkSendable(args: {
  campaign: GateCampaign;
  institution: GateInstitution | null;
  contact: GateContact | null;
  message: GateMessage;
  suppressedEmails: ReadonlySet<string>;
  suppressedDomains: ReadonlySet<string>;
  allowedSenders: ReadonlySet<string>;
  sentToday: number;
}): string[] {
  const { campaign, institution, contact, message } = args;
  const reasons: string[] = [];
  if (campaign.status !== "active") reasons.push(`Campaign is ${campaign.status}, not active`);
  if (!campaign.sending_enabled) reasons.push("Sending is switched off for this campaign");
  if (!campaign.approved_at) reasons.push("Campaign has not been approved");
  const sender = normaliseEmail(campaign.sender_email);
  if (!sender) reasons.push("No sender address configured");
  else if (!args.allowedSenders.has(sender)) reasons.push(`Sender ${sender} is not in RC_ALLOWED_SENDERS`);
  if (args.sentToday >= campaign.daily_send_cap) reasons.push(`Daily cap of ${campaign.daily_send_cap} reached`);

  if (message.direction !== "outbound" || message.historical) reasons.push("Not a sendable outbound message");
  if (message.state !== "approved") reasons.push(`Message is ${message.state}, not approved`);
  if (!message.approved_at || !message.approved_by) reasons.push("Message has no recorded approver");
  if (!message.subject?.trim() || !message.body?.trim()) reasons.push("Subject or body is empty");
  const markers = unresolvedMarkers(`${message.subject ?? ""}\n${message.body ?? ""}`);
  if (markers.length) reasons.push(`Unfilled placeholders: ${markers.join(", ")}`);

  const isFollowup = message.step === "followup1" || message.step === "followup2";
  if (!institution) reasons.push("Institution not found");
  else {
    if (institution.id !== message.institution_id) reasons.push("Institution mismatch");
    if (CLOSED_INSTITUTION.has(institution.status)) reasons.push(`Institution is ${institution.status}`);
    if (institution.ineligible_reason) reasons.push("Institution is flagged ineligible");
    if (isFollowup && !SEQUENCE_STATUSES.has(institution.status)) reasons.push(`Follow-ups stop once an institution is ${institution.status}`);
    if (isFollowup && institution.followups_paused) reasons.push("Follow-ups are paused for this institution");
  }
  if (!contact) reasons.push("No contact on this message");
  else {
    if (contact.id !== message.contact_id) reasons.push("Contact mismatch");
    if (contact.institution_id !== message.institution_id) reasons.push("Contact belongs to another institution");
    if (!contact.approved_for_contact) reasons.push("Contact not approved for contact");
    if (isFollowup && contact.followups_paused) reasons.push("Follow-ups are paused for this contact");
    const email = normaliseEmail(contact.email);
    if (!email || !isValidEmail(email)) reasons.push("Contact has no valid e-mail");
    else {
      if (args.suppressedEmails.has(email)) reasons.push("Address is on the suppression list");
      const host = emailDomain(email);
      for (const d of args.suppressedDomains) if (domainMatches(host, d)) { reasons.push("Domain is on the suppression list"); break; }
    }
  }
  return reasons;
}

/**
 * Should a due follow-up go out? Run after the reply sync, immediately
 * before sending. "postpone" carries the date to move it to (out of office).
 */
export function followupDecision(args: {
  inboundSinceInitial: { label: ReplyLabel | null; return_date: string | null }[];
  today: Date;
}): { action: "send" } | { action: "cancel"; reason: string } | { action: "postpone"; until: string } {
  let postponeUntil: string | null = null;
  for (const m of args.inboundSinceInitial) {
    if (!m.label) return { action: "cancel", reason: "Reply received, not yet classified" };
    if (!NON_STOPPING_LABELS.has(m.label)) return { action: "cancel", reason: `Reply received: ${REPLY_LABEL_TEXT[m.label]}` };
    if (m.label === "out_of_office" && m.return_date) {
      if (!postponeUntil || m.return_date > postponeUntil) postponeUntil = m.return_date;
    }
  }
  if (postponeUntil) {
    const resume = addBusinessDays(new Date(postponeUntil + "T12:00:00Z"), 1).toISOString().slice(0, 10);
    if (args.today.toISOString().slice(0, 10) < resume) return { action: "postpone", until: resume };
  }
  return { action: "send" };
}

/** Senders allowed by environment, e.g. "olufemi.yusuf@bioergotech.org,info@bioergotech.org". */
export function parseAllowedSenders(env: string | undefined): Set<string> {
  return new Set((env || "").split(/[\s,;]+/).map((s) => normaliseEmail(s)).filter((s): s is string => !!s && isValidEmail(s)));
}

export function idempotencyKey(messageId: string, attemptScope = "send"): string {
  return `rc:${attemptScope}:${messageId}`;
}

// ── Reply matching ──────────────────────────────────────────────────────

export type OutboundRef = {
  id: string; institution_id: string; contact_id: string | null;
  rfc_message_id: string | null; thread_id: string | null; to_email: string | null;
};
export type InstitutionRef = { id: string; domain: string | null };
export type ContactRef = { id: string; institution_id: string; email: string | null };

export type InboundEnvelope = {
  from: string | null; threadId?: string | null; inReplyTo?: string | null; references?: string | null;
};

export type MatchResult =
  | { matched: true; method: "thread" | "header" | "address" | "domain"; institution_id: string; contact_id: string | null; parent_id: string | null; needsReview: boolean }
  | { matched: false; reason: string };

export function extractAddress(header: string | null | undefined): string | null {
  if (!header) return null;
  const m = header.match(/<([^>]+)>/) || header.match(/([^\s<>"']+@[^\s<>"']+)/);
  return normaliseEmail(m ? m[1] : header);
}

function stripAngles(id: string): string { return id.trim().replace(/^<|>$/g, "").toLowerCase(); }

/**
 * Attaches an inbound message to the campaign, strongest evidence first:
 * Gmail thread → In-Reply-To/References → known contact address →
 * institution domain (a colleague answering; flagged for review).
 */
export function matchInbound(env: InboundEnvelope, outbound: OutboundRef[], institutions: InstitutionRef[], contacts: ContactRef[]): MatchResult {
  if (env.threadId) {
    const hit = [...outbound].reverse().find((o) => o.thread_id && o.thread_id === env.threadId);
    if (hit) return { matched: true, method: "thread", institution_id: hit.institution_id, contact_id: hit.contact_id, parent_id: hit.id, needsReview: false };
  }
  const refIds = [env.inReplyTo, ...(env.references || "").split(/\s+/)]
    .filter((x): x is string => !!x && x.includes("@")).map(stripAngles);
  if (refIds.length) {
    const hit = [...outbound].reverse().find((o) => o.rfc_message_id && refIds.includes(stripAngles(o.rfc_message_id)));
    if (hit) return { matched: true, method: "header", institution_id: hit.institution_id, contact_id: hit.contact_id, parent_id: hit.id, needsReview: false };
  }
  const from = extractAddress(env.from);
  if (!from) return { matched: false, reason: "No sender address" };
  const contact = contacts.find((c) => normaliseEmail(c.email) === from);
  if (contact) {
    const parent = [...outbound].reverse().find((o) => o.contact_id === contact.id) || null;
    return { matched: true, method: "address", institution_id: contact.institution_id, contact_id: contact.id, parent_id: parent?.id ?? null, needsReview: false };
  }
  const host = emailDomain(from);
  const root = rootDomain(host);
  const inst = institutions.find((i) => i.domain && (domainMatches(host, i.domain) || rootDomain(i.domain) === root));
  if (inst) {
    const parent = [...outbound].reverse().find((o) => o.institution_id === inst.id) || null;
    if (!parent) return { matched: false, reason: "Domain known but never contacted" };
    return { matched: true, method: "domain", institution_id: inst.id, contact_id: null, parent_id: parent.id, needsReview: true };
  }
  return { matched: false, reason: "Sender not linked to the campaign" };
}

// ── Classification (fallback; the model result is reviewable) ───────────

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/**
 * Return date from an out-of-office message: "back on November 25",
 * "returning 25 November", "until 11/25", "2026-11-25". The year is the
 * next occurrence after `received`. Null when nothing reliable is found.
 */
export function parseReturnDate(body: string, received: Date): string | null {
  const b = (body || "").toLowerCase().slice(0, 1500);
  const iso = b.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const ctx = "(?:back|return|returning|until|through|thru|from)[^.\\n]{0,40}?";
  const build = (month: number, day: number): string | null => {
    if (month < 0 || month > 11 || day < 1 || day > 31) return null;
    let y = received.getUTCFullYear();
    const cand = new Date(Date.UTC(y, month, day));
    if (cand.getTime() < received.getTime() - 86400000) y++;
    const d = new Date(Date.UTC(y, month, day));
    return d.getUTCMonth() === month ? d.toISOString().slice(0, 10) : null;
  };
  let m = b.match(new RegExp(ctx + "\\b(" + MONTHS.join("|") + ")[a-z]*\\.?\\s+(\\d{1,2})"));
  if (m) return build(MONTHS.indexOf(m[1]), Number(m[2]));
  m = b.match(new RegExp(ctx + "\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(" + MONTHS.join("|") + ")[a-z]*"));
  if (m) return build(MONTHS.indexOf(m[2]), Number(m[1]));
  m = b.match(new RegExp(ctx + "\\b(\\d{1,2})/(\\d{1,2})(?:/\\d{2,4})?\\b"));
  if (m) return build(Number(m[1]) - 1, Number(m[2])); // US month/day
  return null;
}

export function detectOptOut(body: string): boolean {
  return /please remove|unsubscribe|do not (contact|e-?mail|write)|don't (contact|e-?mail)|no further (contact|e-?mails?)|stop (e-?mailing|contacting)|take (me|us) off/.test((body || "").toLowerCase());
}

export function classifyByKeywords(body: string): ReplyLabel {
  const b = (body || "").toLowerCase().slice(0, 4000);
  if (/out of (the )?office|i am (currently )?(away|travell?ing|on leave)|on (annual |parental )?leave|limited access to (my )?e-?mail|will be back|returning (on|to the office)/.test(b)) return "out_of_office";
  if (/(this is an )?automat(ic|ed) (reply|response|acknowledg)|we have received your (message|e-?mail|enquiry|inquiry)|ticket (number|#)|do not reply to this/.test(b)) return "auto_ack";
  if (detectOptOut(b)) return "not_interested";
  if (/only (open|available) to|must be (a )?(u\.?s\.?|us) (citizen|resident)|residents of|must be (at least )?\d+ (years|or older)|(under|younger than) \d+ (are|is|cannot|can't)|not (open|eligible) (to|for) (international|minors|high school)|eligib/.test(b)) return "not_eligible";
  if (/(do not|don't|cannot|can't|unable to|not able to|not in a position to) (host|accommodate|accept|offer|support)|not interested|no thank|not a good fit|must decline|fully booked|no (capacity|availability)/.test(b)) return "not_interested";
  if (/(fee|cost|price|pricing|quote|quotation|invoice|\$\s?\d|usd|per student|per group|charge)/.test(b)) return "fee_request";
  if (/(meeting|zoom|teams|call|schedule a time|speak (with|to) you|set up a time)/.test(b)) return "meeting_requested";
  if (/(forward(ed|ing)?|cc'?d|copying|copied|reach out to|contact .{0,60} (instead|directly)|better (person|placed)|right (person|office|department)|would be the best (person|contact)|in charge of)/.test(b)) return "referred";
  if (/(not (the right|sure who)|who (handles|is responsible)|not (my|our) (area|department)|which department)/.test(b)) return "requests_coordinator";
  if (/(more (information|details)|could you (tell|share|send|provide)|what (are|is|would)|how many|which dates|\?)/.test(b)) return "more_info";
  if (/(happy to|glad to|delighted|would love|interested|we (can|could|would be able to) (host|offer|arrange|welcome)|sounds (great|good|wonderful))/.test(b)) return "interested";
  return "unclear";
}

/**
 * Template 4 is suggested only when the reply asks who is responsible, or
 * is a positive/unclear reply that names nobody. Never when the respondent
 * is the coordinator, gave a referral, or proposed a meeting.
 */
export function suggestTemplate4(label: ReplyLabel, respondentIsAppropriate: boolean, body: string): boolean {
  if (label === "requests_coordinator") return true;
  if (respondentIsAppropriate) return false;
  if (!["interested", "more_info", "unclear"].includes(label)) return false;
  const namesSomeone = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(body) || /\b(contact|reach out to|write to|speak (to|with))\s+(dr\.?|prof\.?|mr\.?|ms\.?|mrs\.?)?\s*[A-Z][a-z]+/.test(body);
  return !namesSomeone;
}

// ── Dashboard ───────────────────────────────────────────────────────────

export type DashInstitution = { id: string; status: string; priority: string | null; next_action_due: string | null };
export type DashContact = { verification: string; approved_for_contact: boolean; institution_id: string; referred_by_contact_id?: string | null };
export type DashMessage = { direction: string; state: string; step: string; delivery_status: string | null; institution_id: string; historical?: boolean };
export type DashLabel = { message_institution_id: string; label: string; confirmed: boolean };
export type DashTask = { status: string; task_type: string; due_date: string | null };

export type DashboardMetrics = {
  institutionsDiscovered: number; verified: number; approved: number; contactsApproved: number;
  emailsSent: number; bounced: number; repliesReceived: number; positiveResponses: number; referrals: number;
  meetings: number; feesRequested: number; negotiating: number; confirmed: number; noResponse: number;
  outstandingActions: number; followupsQueued: number; draftsAwaitingReview: number;
  byStatus: Record<string, number>; byPriority: Record<string, number>; overdueActions: number;
};

const PAST_VERIFIED = new Set(["verified", "approved", "contacted", "followup_due", "responded", "qualified", "meeting", "negotiating", "confirmed", "no_response"]);
const PAST_APPROVED = new Set(["approved", "contacted", "followup_due", "responded", "qualified", "meeting", "negotiating", "confirmed", "no_response"]);

export function dashboardMetrics(
  institutions: DashInstitution[], contacts: DashContact[], messages: DashMessage[],
  labels: DashLabel[], tasks: DashTask[], today: Date,
): DashboardMetrics {
  const count = <T>(arr: T[], f: (x: T) => boolean) => arr.reduce((n, x) => n + (f(x) ? 1 : 0), 0);
  // Confirmed labels win; otherwise the latest suggestion counts.
  const institutionsWith = (pred: (l: DashLabel) => boolean) => new Set(labels.filter(pred).map((l) => l.message_institution_id)).size;
  const todayIso = today.toISOString().slice(0, 10);
  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  for (const i of institutions) {
    byStatus[i.status] = (byStatus[i.status] || 0) + 1;
    const p = i.priority || "unrated";
    byPriority[p] = (byPriority[p] || 0) + 1;
  }
  const live = messages.filter((m) => !m.historical);
  const replyInstitutions = new Set(live.filter((m) => m.direction === "inbound").map((m) => m.institution_id));
  const positive = new Set(["interested", "more_info", "meeting_requested", "fee_request"]);
  const closed = new Set(["declined", "ineligible", "closed", "confirmed", "no_response"]);
  const overdue = count(institutions, (i) => !!i.next_action_due && i.next_action_due < todayIso && !closed.has(i.status));
  return {
    institutionsDiscovered: institutions.length,
    verified: count(institutions, (i) => PAST_VERIFIED.has(i.status)),
    approved: count(institutions, (i) => PAST_APPROVED.has(i.status)),
    contactsApproved: count(contacts, (c) => c.approved_for_contact),
    emailsSent: count(live, (m) => m.direction === "outbound" && m.state === "sent"),
    bounced: count(live, (m) => m.direction === "outbound" && (m.delivery_status === "bounced" || m.delivery_status === "complained")),
    repliesReceived: replyInstitutions.size,
    positiveResponses: institutionsWith((l) => positive.has(l.label)),
    referrals: count(contacts, (c) => !!c.referred_by_contact_id),
    meetings: Math.max(institutionsWith((l) => l.label === "meeting_requested"), count(institutions, (i) => i.status === "meeting")),
    feesRequested: institutionsWith((l) => l.label === "fee_request"),
    negotiating: count(institutions, (i) => i.status === "negotiating"),
    confirmed: count(institutions, (i) => i.status === "confirmed"),
    noResponse: count(institutions, (i) => i.status === "no_response"),
    outstandingActions: count(tasks, (t) => t.status === "open"),
    followupsQueued: count(live, (m) => m.direction === "outbound" && m.state === "approved" && (m.step === "followup1" || m.step === "followup2")),
    draftsAwaitingReview: count(live, (m) => m.direction === "outbound" && (m.state === "draft" || m.state === "in_review")),
    byStatus, byPriority, overdueActions: overdue,
  };
}

// ── One-step sending helpers ────────────────────────────────────────────

/**
 * Fills "Given your institution's work in …" from the institution's
 * recorded specialisations, so nobody has to type it per e-mail.
 * "Cancer biology, nanomedicine, bioengineering" → "cancer biology,
 * nanomedicine and bioengineering". Null when nothing usable is on file.
 */
export function researchConnectionFor(inst: { specialisations: string | null }): string | null {
  const raw = (inst.specialisations || "").replace(/\s+/g, " ").trim().replace(/[.;]+$/, "");
  if (!raw || /synthetic test data/i.test(raw)) return null;
  const parts = raw.split(/\s*[,;]\s*/).map((p) => p.trim()).filter(Boolean).slice(0, 4);
  // Lower-case a leading capital only when it starts an ordinary word (keep "AI", "DNA", "RNA").
  const soften = (p: string) => (/^[A-Z][a-z]/.test(p) ? p[0].toLowerCase() + p.slice(1) : p);
  const items = parts.map((p, i) => (i === 0 ? soften(p) : soften(p)));
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1].replace(/^and\s+/i, "")}`;
}

/**
 * Earlier outreach that rules out a fresh cold e-mail: a reply or a fee
 * request is already on record (e.g. Mount Sinai). "Contacted, no
 * documented reply" does not block.
 */
export function previousOutreachBlocks(previous: string | null): boolean {
  return !!previous && /response reported|fee requested|replied|in discussion|meeting/i.test(previous);
}
