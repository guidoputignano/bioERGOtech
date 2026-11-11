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

export function greetingFor(c: { person_name: string | null; person_title: string | null; department: string | null }): string {
  if (c.person_name) {
    const name = c.person_name.replace(/,.*$/, "").trim();
    const isDoctor = /\bph\.?\s?d|\bm\.?d\b|\bdr\b|professor/i.test(`${c.person_title ?? ""} ${c.person_name}`);
    const surname = name.replace(/^(dr\.?|prof\.?|mr\.?|ms\.?|mrs\.?)\s+/i, "").split(/\s+/).slice(-1)[0];
    return isDoctor ? `Dr ${surname}` : name;
  }
  return c.department ? `${c.department} Team` : "Research Outreach Team";
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
