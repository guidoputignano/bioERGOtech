// Eligibility rules engine.
// Deliberately simple and deterministic (no ML) — every result must be traceable
// to an explicit, human-reviewed rule in navigator_rules. Accuracy here IS the
// product; keep it auditable.

import { createClient } from "@supabase/supabase-js";

export interface NavigatorAnswers {
  organisation_name: string;
  org_type: string;
  region: string;
  stage: string;
  interest_areas: string[];
  existing_support: "yes" | "no";
  existing_support_detail?: string;
  goals: string[];
}

export interface EligibleScheme {
  scheme_name: string;
  scheme_description: string;
}

// EU member states as of 2026 (27 members; UK is not included post-Brexit).
// Matched case-insensitively against the free-text country name the visitor
// typed in the "region" question — see the comment on navigator_rules.region.
const EU_MEMBER_STATES = [
  "austria", "belgium", "bulgaria", "croatia", "cyprus", "czechia", "czech republic",
  "denmark", "estonia", "finland", "france", "germany", "greece", "hungary",
  "ireland", "italy", "latvia", "lithuania", "luxembourg", "malta", "netherlands",
  "poland", "portugal", "romania", "slovakia", "slovenia", "spain", "sweden",
];

// A rule matches if org_type matches exactly, AND (rule.region is null OR matches
// the visitor's region, allowing for 'EU' as a special value meaning "any EU country"),
// AND (rule.stage is null OR matches exactly).
function ruleMatches(
  rule: { org_type: string; region: string | null; stage: string | null },
  answers: NavigatorAnswers
): boolean {
  if (rule.org_type !== answers.org_type) return false;

  if (rule.region) {
    const visitorRegion = answers.region.trim().toLowerCase();
    if (rule.region.toLowerCase() === "eu") {
      if (!EU_MEMBER_STATES.includes(visitorRegion)) return false;
    } else if (rule.region.toLowerCase() !== visitorRegion) {
      return false;
    }
  }

  if (rule.stage && rule.stage !== answers.stage) return false;

  return true;
}

export async function computeEligibility(
  answers: NavigatorAnswers,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<EligibleScheme[]> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: rules, error } = await supabase
    .from("navigator_rules")
    .select("org_type, region, stage, scheme_name, scheme_description")
    .eq("active", true);

  if (error) throw new Error(`Failed to load navigator_rules: ${error.message}`);
  if (!rules) return [];

  // De-dupe by scheme_name in case multiple rules resolve to the same scheme.
  const matched = new Map<string, EligibleScheme>();
  for (const rule of rules) {
    if (ruleMatches(rule, answers)) {
      matched.set(rule.scheme_name, {
        scheme_name: rule.scheme_name,
        scheme_description: rule.scheme_description ?? "",
      });
    }
  }

  return Array.from(matched.values());
}
