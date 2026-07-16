-- =========================================================
-- Migration: Navigator region precision
-- Province of Taranto ⊂ Region of Puglia ⊂ Italy
-- =========================================================
-- Adds sub_region as an ADDITIONAL narrowing filter on top of the existing
-- org_type / region / stage matching — it does not change any existing
-- column value, scheme_name, scheme_description, or scheme_notes text.
--
-- Background: NIDI, Mini-PIA, PIA (ordinary rows) and ZES's general rate are
-- actually Puglia-region-specific, and their Taranto variants (NIDI JTF
-- Taranto, Mini-PIA Taranto, PIA Taranto, ZES's enhanced rate) are Province-
-- of-Taranto-specific — both currently flattened to region = 'Italy'. This
-- migration does not touch the `region` column at all (it stays 'Italy',
-- which remains correct at country level); sub_region narrows within it.
--
-- IMPORTANT — I do not have access to the live database (same as every
-- previous data pass), so the UPDATE statements below cannot assume exact
-- scheme_name spellings. Instead they match on case-insensitive keyword
-- patterns (scheme family name, plus "Taranto"/"JTF" to detect the
-- Taranto-specific variant, checked across scheme_name AND
-- scheme_description AND scheme_notes in case a row's Taranto-specificity
-- is only mentioned in the description rather than the name). Run the
-- verification SELECT at the end of this file and check every row before
-- trusting the result — if any row lands wrong, fix it by hand with a
-- targeted `update navigator_rules set sub_region = '...' where id = '...'`.

alter table navigator_rules add column if not exists sub_region text;

comment on column navigator_rules.sub_region is
  'Nested sub-national scope, only meaningful when region = ''Italy'': ''Taranto'' (Province of Taranto only), ''Puglia'' (Puglia region-wide — includes Taranto), or null (no sub-region restriction, i.e. country-level or EU-level scope). Taranto is a SUBSET of Puglia, not a sibling category — see the nested matching logic in lib/navigator/rules-engine.ts.';

-- The visitor's own answer to the new conditional "where in Italy" question
-- (see lib/navigator/questions.ts), stored on the session for audit/reference
-- alongside the other raw answers. Values: 'taranto' | 'puglia' | 'other',
-- null for non-Italian visitors (the question is never shown to them).
alter table navigator_sessions add column if not exists italy_subregion text;

-- ── NIDI family (ordinary vs "JTF Taranto") ──────────────────────────────
update navigator_rules set sub_region = 'Taranto'
  where sub_region is null
    and scheme_name ilike '%nidi%'
    and (
      scheme_name ilike '%taranto%' or scheme_name ilike '%jtf%'
      or scheme_description ilike '%taranto%'
      or scheme_notes ilike '%taranto%'
    );

update navigator_rules set sub_region = 'Puglia'
  where sub_region is null
    and scheme_name ilike '%nidi%';

-- ── Mini-PIA family (ordinary vs "Taranto") ──────────────────────────────
update navigator_rules set sub_region = 'Taranto'
  where sub_region is null
    and scheme_name ilike '%mini%pia%'
    and (
      scheme_name ilike '%taranto%'
      or scheme_description ilike '%taranto%'
      or scheme_notes ilike '%taranto%'
    );

update navigator_rules set sub_region = 'Puglia'
  where sub_region is null
    and scheme_name ilike '%mini%pia%';

-- ── PIA family (ordinary vs "Taranto") — explicitly excludes Mini-PIA ───
update navigator_rules set sub_region = 'Taranto'
  where sub_region is null
    and scheme_name ilike '%pia%' and scheme_name not ilike '%mini%'
    and (
      scheme_name ilike '%taranto%'
      or scheme_description ilike '%taranto%'
      or scheme_notes ilike '%taranto%'
    );

update navigator_rules set sub_region = 'Puglia'
  where sub_region is null
    and scheme_name ilike '%pia%' and scheme_name not ilike '%mini%';

-- ── ZES family (general Puglia rate vs Taranto-enhanced rate) ───────────
-- This is the row pair most likely to share very similar or identical
-- scheme_name text (since both are "ZES Unica Mezzogiorno"), so the
-- Taranto detection here leans on scheme_description/scheme_notes more
-- than the other three families — double-check these two rows specifically
-- in the verification SELECT below.
update navigator_rules set sub_region = 'Taranto'
  where sub_region is null
    and scheme_name ilike '%zes%'
    and (
      scheme_name ilike '%taranto%' or scheme_name ilike '%enhanced%'
      or scheme_description ilike '%taranto%'
      or scheme_notes ilike '%taranto%'
    );

update navigator_rules set sub_region = 'Puglia'
  where sub_region is null
    and scheme_name ilike '%zes%';

-- Horizon Europe and EIC Accelerator rows: no update needed. They don't
-- match any of the family patterns above, so sub_region stays at its
-- column default (null) — correctly reflecting that they carry no Italian
-- sub-region restriction at all.

-- ── Verify before trusting ───────────────────────────────────────────────
select scheme_name, region, sub_region, org_type, stage
from navigator_rules
order by scheme_name;
