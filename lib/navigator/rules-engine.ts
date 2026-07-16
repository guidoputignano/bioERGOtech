// Eligibility rules engine.
// Deliberately simple and deterministic (no ML) — every result must be traceable
// to an explicit, human-reviewed rule in navigator_rules. Accuracy here IS the
// product; keep it auditable.

import { createClient } from "@supabase/supabase-js";
import { EU_MEMBER_STATES } from "./countries";

export interface NavigatorAnswers {
  organisation_name: string;
  org_type: string;
  region: string;
  // Only present when region === "Italy" (see the showIf-gated question in
  // lib/navigator/questions.ts): "taranto" | "puglia" | "other".
  italy_subregion?: string;
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

// The "region" question is a fixed-option dropdown (see lib/navigator/countries.ts
// and lib/navigator/questions.ts), so answers.region is always one of a known,
// exact country name — no free-text ambiguity to worry about at the source.
// The comparison below still lower-cases/trims as a harmless safety net, but
// it is no longer load-bearing the way it was when the question was free text.
function ruleMatches(
  rule: { org_type: string; region: string | null; stage: string | null; sub_region: string | null },
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

  // Nested Italian sub-region scope: Province of Taranto ⊂ Region of Puglia
  // ⊂ Italy. This is NOT three flat, mutually-exclusive options — Taranto is
  // a SUBSET of Puglia, so a Taranto-based visitor must satisfy both
  // Taranto-only rules AND Puglia-wide rules, not just the narrower one.
  // Concretely, rule.sub_region acts as a minimum-scope requirement:
  //   rule.sub_region === "Taranto" -> visitor must be in Taranto specifically
  //   rule.sub_region === "Puglia"  -> visitor must be in Taranto OR elsewhere in Puglia
  //                                     (Taranto visitors satisfy this too, since
  //                                     they're still within Puglia)
  //   rule.sub_region === null      -> no restriction, matches any Italian sub-region
  //                                     (or no Italian sub-region at all, for EU/other rules)
  // Get this backwards (e.g. treating "Puglia" as excluding Taranto) and a
  // Taranto-based visitor would silently miss Puglia-wide schemes they
  // genuinely qualify for.
  if (rule.sub_region) {
    const visitorSubRegion = answers.italy_subregion;
    if (rule.sub_region === "Taranto" && visitorSubRegion !== "taranto") return false;
    if (rule.sub_region === "Puglia" && visitorSubRegion !== "taranto" && visitorSubRegion !== "puglia") {
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
    .select("org_type, region, stage, sub_region, scheme_name, scheme_description")
    .eq("active", true);

  if (error) throw new Error(`Failed to load navigator_rules: ${error.message}`);
  if (!rules) return [];

  // De-dupe by scheme_name + description, not scheme_name alone. Nested
  // sub_region matching means a Taranto-based visitor can legitimately match
  // BOTH a scheme's Puglia-wide row and its Taranto-enhanced row at once
  // (Taranto is part of Puglia, not a separate scheme) — if those two rows
  // share a scheme_name but carry different descriptions (e.g. ZES's general
  // vs enhanced-rate text), deduping on scheme_name alone would silently
  // drop one and could hide the more advantageous Taranto-specific result
  // from exactly the visitor it matters most to.
  const matched = new Map<string, EligibleScheme>();
  for (const rule of rules) {
    if (ruleMatches(rule, answers)) {
      const key = `${rule.scheme_name}::${rule.scheme_description ?? ""}`;
      matched.set(key, {
        scheme_name: rule.scheme_name,
        scheme_description: rule.scheme_description ?? "",
      });
    }
  }

  return Array.from(matched.values());
}
