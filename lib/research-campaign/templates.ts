/**
 * Research Centres campaign: template placeholders.
 *
 * The four templates live in rc_templates (seeded by the migration with the
 * approved wording, editable in Settings). This file only builds the values
 * for their {{placeholders}}. Anything left unfilled, or any [bracket
 * prompt], blocks approval and sending.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const TEMPLATE_KEYS = ["initial", "followup1", "followup2", "coordinator"] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export const PLACEHOLDERS: Record<string, string> = {
  greeting: "Named person (\"Dr Goode\") or department (\"Research Outreach Team\")",
  institution: "Institution name",
  research_connection: "Verified research area or programme, written per institution",
  selection_status: "Campaign setting, e.g. \"are being selected\" / \"have been selected\"",
  age_range: "Campaign setting, e.g. \"16 to 18\"",
  chaperone: "Campaign setting, e.g. \"two teachers from their school\"",
  original_subject: "Subject of the initial e-mail (follow-ups and replies)",
};

export type Template = { key: TemplateKey; label: string; subject: string; body: string; version: number };

export async function loadTemplates(db: SupabaseClient, campaignId: string): Promise<Record<TemplateKey, Template>> {
  const { data, error } = await db.from("rc_templates").select("key, label, subject, body, version").eq("campaign_id", campaignId);
  if (error) throw new Error(error.message);
  const out = {} as Record<TemplateKey, Template>;
  for (const t of data || []) out[t.key as TemplateKey] = t as Template;
  for (const k of TEMPLATE_KEYS) if (!out[k]) throw new Error(`Template "${k}" is missing for this campaign`);
  return out;
}

/** Placeholders in a text that the system does not know (typos). */
export function unknownPlaceholders(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi)) if (!(m[1] in PLACEHOLDERS)) found.add(m[1]);
  return [...found];
}

/** Campaign-level facts (set in Settings) that the current templates actually use. */
export const CAMPAIGN_FACTS = ["selection_status", "age_range", "chaperone"] as const;
export function factsUsed(templates: { subject: string; body: string }[]): (typeof CAMPAIGN_FACTS)[number][] {
  const text = templates.map((t) => `${t.subject}\n${t.body}`).join("\n");
  return CAMPAIGN_FACTS.filter((f) => new RegExp(`\\{\\{\\s*${f}\\s*\\}\\}`).test(text));
}

/**
 * Turns a contact's department field into a team name fit for a greeting,
 * or null when it is really a note ("Booking email", "Plan Your Visit form",
 * "Office … + inquiry form", "General"). Imported research notes often sit
 * in this field, so it is never used as-is.
 */
export function departmentForGreeting(department: string | null): string | null {
  if (!department) return null;
  let d = department.split(/\s*[+;]\s*/)[0].trim();
  d = d.replace(/\b(?:(?:inquiry|enquiry|request|application|booking|contact|information|visit request)\s+)?(?:form|e-?mail|line)\b.*$/i, "").trim();
  d = d.replace(/[,(].*$/, "").trim();
  if (d.length < 2 || d.length > 50) return null;
  if (/^(general|named( contact| education staff)?|test|programmes?|programs?|tours?|booking|plan your visit|stem( visit)?|site coordinators?|outreach tours?|channel|main line|information|ors)$/i.test(d)) return null;
  if (/\b(form|e-?mail|named|channel)\b/i.test(d)) return null;
  const small = new Set(["of", "and", "for", "the", "&"]);
  return d.split(/\s+/).map((w, i) => (/[A-Z]{2,}|[a-z][A-Z]/.test(w) ? w : i > 0 && small.has(w.toLowerCase()) ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1))).join(" ");
}

export function greetingFor(c: { person_name: string | null; person_title: string | null; department: string | null }): string {
  if (c.person_name) {
    const name = c.person_name.replace(/\s*\(.*?\)\s*/g, " ").replace(/,.*$/, "").replace(/\s+/g, " ").trim();
    if (name) {
      const isDoctor = /\bph\.?\s?d|\bm\.?d\b|\bdr\b|professor/i.test(`${c.person_title ?? ""} ${c.person_name}`);
      const surname = name.replace(/^(dr\.?|prof\.?|mr\.?|ms\.?|mrs\.?)\s+/i, "").split(/\s+/).slice(-1)[0];
      return isDoctor ? `Dr ${surname}` : name;
    }
  }
  const dept = departmentForGreeting(c.department);
  if (!dept) return "Research Outreach Team";
  return /\bteam$/i.test(dept) ? dept : `${dept} Team`;
}

/**
 * Values for the placeholders. Campaign facts stay null until confirmed in
 * Settings, so an e-mail cannot describe the students wrongly.
 * research_connection is never generated: it must be written from evidence.
 */
export function templateVars(args: {
  contact: { person_name: string | null; person_title: string | null; department: string | null };
  institutionName: string;
  researchConnection: string | null;
  originalSubject: string | null;
  campaign: { selection_status: string | null; age_range: string | null; chaperone: string | null };
}): Record<string, string | null> {
  return {
    greeting: greetingFor(args.contact),
    institution: args.institutionName,
    research_connection: args.researchConnection?.trim() || null,
    selection_status: args.campaign.selection_status,
    age_range: args.campaign.age_range,
    chaperone: args.campaign.chaperone,
    original_subject: args.originalSubject,
  };
}
