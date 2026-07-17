-- =========================================================================
-- CONSOLIDATED, AUTHORITATIVE navigator_rules migration
-- =========================================================================
-- This supersedes 20260714000001_navigator_seed.sql (placeholder structure
-- only) and folds in the sub_region work from 20260716000000_navigator_
-- subregion.sql. Running this file against a FRESH database (no prior
-- Navigator data) brings navigator_rules to exactly the state currently
-- live in production as of 17 July 2026, verified via the app itself and
-- via direct SQL count/reconciliation queries.
--
-- Do NOT run this against the current live database — it already has this
-- exact data. This file exists so that a fresh environment (new developer
-- setup, disaster recovery, a second deployment) starts from the same
-- verified state, rather than the old placeholder seed.
--
-- If you're setting up a fresh database: run this file once, in full.
-- If you're checking what's already live: skip straight to the
-- verification SELECT at the very bottom instead.

-- --- Schema ---------------------------------------------------------------

alter table navigator_rules add column if not exists sub_region text;

comment on column navigator_rules.sub_region is
  'Nested sub-national scope, only meaningful when region = ''Italy'': ''Taranto'' (Province of Taranto only), ''Puglia'' (Puglia region-wide — includes Taranto), or null (no sub-region restriction, i.e. country-level or EU-level scope). Taranto is a SUBSET of Puglia, not a sibling category — see the nested matching logic in lib/navigator/rules-engine.ts.';

alter table navigator_sessions add column if not exists italy_subregion text;

comment on column navigator_sessions.italy_subregion is
  'The visitor''s answer to the conditional "where in Italy" question. Values: ''taranto'' | ''puglia'' | ''other''. Null for non-Italian visitors (question never shown to them).';

-- --- Data (full reload) -----------------------------------------------------

delete from navigator_rules;

insert into navigator_rules (org_type, region, sub_region, stage, scheme_name, scheme_description, scheme_notes, active) values

-- ===================== NIDI =====================
('startup', 'Italy', 'Puglia', 'idea',
 'NIDI (Nuove Iniziative d''Impresa)',
 'A Regione Puglia fund combining non-repayable grants and zero-interest loans to help you start a new micro-enterprise or professional practice in Puglia, for investment programmes between €10,000 and €150,000.',
 'Region-wide Puglia scheme, open on a rolling basis since Feb 2022. If your operating base will be in the Province of Taranto specifically, ask about NIDI JTF Taranto instead — materially better terms (100% aid intensity) but a stricter municipality-level location requirement. Verify open/closed status before quoting.',
 true),

('startup', 'Italy', 'Taranto', 'idea',
 'NIDI JTF Taranto',
 'An enhanced version of NIDI specifically for the Province of Taranto, funded by the EU Just Transition Fund: 100% aid intensity (50% non-repayable grant + 25% zero-interest loan + 25% repayable assistance, forgiven if repayments stay current) on investments between €10,000 and €150,000, plus up to €15,000 for early running costs.',
 'Operating premises MUST be within the Province of Taranto (~28 eligible municipalities). Requires belonging to a disadvantaged category. At least 20% of investment must be green/sustainability-oriented. Opened 12 May 2026, €20M allocation, rolling until funds exhausted — verify still open.',
 true),

-- ===================== MINI-PIA =====================
('startup', 'Italy', 'Puglia', 'early',
 'Mini-PIA (Pacchetti Integrati di Agevolazione)',
 'A Regione Puglia non-repayable grant (roughly 25-50% of eligible costs) for micro and small enterprises investing €30,000 to €5 million in digitalisation or sustainability-linked innovation projects.',
 'ORDINARY (region-wide) version CURRENTLY SUSPENDED as of 3 March 2026 (DGR 176/2026) — do not tell a visitor they can apply now under this general version. If Taranto-based, point them to "Mini-PIA Taranto" instead, reported to remain open. Requires a mandatory innovation-service component from an MIMIT-accredited certified body.',
 true),

('startup', 'Italy', 'Taranto', 'early',
 'Mini-PIA Taranto (JTF)',
 'A Just Transition Fund-financed version of Mini-PIA specifically for the Province of Taranto, open on a rolling basis since 5 July 2025 — reported to remain open even though the general Mini-PIA was suspended in March 2026.',
 'Operating premises must be in the Province of Taranto. Requires a prior bank/Confidi loan resolution covering at least 50% of the investment. 70% of JTF funding follows a NextGenerationEU reporting deadline of 31 Dec 2026. VERIFY current open status before quoting.',
 true),

-- ===================== PIA =====================
('startup', 'Italy', 'Puglia', 'established',
 'PIA (Programmi Integrati di Agevolazioni)',
 'Regione Puglia''s larger-scale investment aid for medium enterprises and structured small enterprises (avg. turnover 3yr ≥ €1M) with R&D-inclusive investment programmes generally from €1 million upward, combining research, innovation, productive investment, training, and environmental components at aid intensities from 40% up to 80%.',
 'ORDINARY (region-wide) version CURRENTLY SUSPENDED as of 3 March 2026 (DGR 176/2026), same suspension as Mini-PIA. Requires an established enterprise with financial track record — NOT suited to idea-stage applicants, except a narrow standalone route for validated-R&D startups. If Taranto-based, see "PIA Taranto" instead.',
 true),

('startup', 'Italy', 'Taranto', 'idea',
 'PIA Taranto (JTF)',
 'A Just Transition Fund-financed version of PIA for the Province of Taranto with notably broader eligibility than ordinary PIA (includes micro enterprises, freelancers, and startups), offering up to 65% non-repayable grant plus a further 10% on productive investments. Open on a rolling basis since 5 July 2025.',
 'Operating premises must be in the Province of Taranto. Reported to remain open despite the general PIA suspension in March 2026 — verify current status. 70% of JTF funding carries a NextGenerationEU reporting deadline of 31 Dec 2026.',
 true),

-- ===================== ZES =====================
('hospital', 'Italy', 'Puglia', null, 'ZES Unica (general Puglia rate)', 'An Italian tax credit of 40% on new machinery, equipment, land, and buildings for productive facilities in Puglia (outside the enhanced Taranto area), for investments of €200,000 to €100 million, usable via tax-return offset.', '2026 application window (31 Mar - 30 May 2026) has already closed; scheme runs through 2028, next window expected ~ early 2027. Actual credit may be reduced via pro-rata reduction (was 60.38% of nominal for 2025).', true),
('university', 'Italy', 'Puglia', null, 'ZES Unica (general Puglia rate)', 'An Italian tax credit of 40% on new machinery, equipment, land, and buildings for productive facilities in Puglia (outside the enhanced Taranto area), for investments of €200,000 to €100 million, usable via tax-return offset.', '2026 application window (31 Mar - 30 May 2026) has already closed; scheme runs through 2028, next window expected ~ early 2027. Actual credit may be reduced via pro-rata reduction (was 60.38% of nominal for 2025).', true),
('startup', 'Italy', 'Puglia', null, 'ZES Unica (general Puglia rate)', 'An Italian tax credit of 40% on new machinery, equipment, land, and buildings for productive facilities in Puglia (outside the enhanced Taranto area), for investments of €200,000 to €100 million, usable via tax-return offset.', '2026 application window (31 Mar - 30 May 2026) has already closed; scheme runs through 2028, next window expected ~ early 2027. Actual credit may be reduced via pro-rata reduction (was 60.38% of nominal for 2025).', true),
('pharma', 'Italy', 'Puglia', null, 'ZES Unica (general Puglia rate)', 'An Italian tax credit of 40% on new machinery, equipment, land, and buildings for productive facilities in Puglia (outside the enhanced Taranto area), for investments of €200,000 to €100 million, usable via tax-return offset.', '2026 application window (31 Mar - 30 May 2026) has already closed; scheme runs through 2028, next window expected ~ early 2027. Actual credit may be reduced via pro-rata reduction (was 60.38% of nominal for 2025).', true),
('ngo', 'Italy', 'Puglia', null, 'ZES Unica (general Puglia rate)', 'An Italian tax credit of 40% on new machinery, equipment, land, and buildings for productive facilities in Puglia (outside the enhanced Taranto area), for investments of €200,000 to €100 million, usable via tax-return offset.', '2026 application window (31 Mar - 30 May 2026) has already closed; scheme runs through 2028, next window expected ~ early 2027. Actual credit may be reduced via pro-rata reduction (was 60.38% of nominal for 2025).', true),

('hospital', 'Italy', 'Taranto', null, 'ZES Unica (enhanced Taranto rate)', 'The same ZES Unica tax credit as above, but at a significantly enhanced rate for the Taranto area specifically: 70% for small enterprises, 60% for medium, 50% for large — the highest rate available nationally under this scheme.', 'Applies only within the Province of Taranto. Same 2026 window-closed caveat and pro-rata reduction risk as the general-rate row.', true),
('university', 'Italy', 'Taranto', null, 'ZES Unica (enhanced Taranto rate)', 'The same ZES Unica tax credit as above, but at a significantly enhanced rate for the Taranto area specifically: 70% for small enterprises, 60% for medium, 50% for large — the highest rate available nationally under this scheme.', 'Applies only within the Province of Taranto. Same 2026 window-closed caveat and pro-rata reduction risk as the general-rate row.', true),
('startup', 'Italy', 'Taranto', null, 'ZES Unica (enhanced Taranto rate)', 'The same ZES Unica tax credit as above, but at a significantly enhanced rate for the Taranto area specifically: 70% for small enterprises, 60% for medium, 50% for large — the highest rate available nationally under this scheme.', 'Applies only within the Province of Taranto. Same 2026 window-closed caveat and pro-rata reduction risk as the general-rate row.', true),
('pharma', 'Italy', 'Taranto', null, 'ZES Unica (enhanced Taranto rate)', 'The same ZES Unica tax credit as above, but at a significantly enhanced rate for the Taranto area specifically: 70% for small enterprises, 60% for medium, 50% for large — the highest rate available nationally under this scheme.', 'Applies only within the Province of Taranto. Same 2026 window-closed caveat and pro-rata reduction risk as the general-rate row.', true),
('ngo', 'Italy', 'Taranto', null, 'ZES Unica (enhanced Taranto rate)', 'The same ZES Unica tax credit as above, but at a significantly enhanced rate for the Taranto area specifically: 70% for small enterprises, 60% for medium, 50% for large — the highest rate available nationally under this scheme.', 'Applies only within the Province of Taranto. Same 2026 window-closed caveat and pro-rata reduction risk as the general-rate row.', true),

-- ===================== EU GRANTS ===================== (no sub_region — EU-wide)
('university', 'EU', null, null, 'Horizon Europe Health Cluster', 'EU funding (typically €1.5M-€10M per project, occasionally up to ~€90M for the largest calls) for collaborative health research and innovation projects, with strong current priority on AI and biotechnology in healthcare.', 'REQUIRES A MULTI-PARTNER CONSORTIUM (typically 3+ independent entities from 3+ eligible countries). The 2026 single-stage call closed 16 April 2026; most remaining opportunities are 2027 topics.', true),
('hospital', 'EU', null, null, 'Horizon Europe Health Cluster', 'EU funding (typically €1.5M-€10M per project, occasionally up to ~€90M for the largest calls) for collaborative health research and innovation projects, with strong current priority on AI and biotechnology in healthcare.', 'REQUIRES A MULTI-PARTNER CONSORTIUM (typically 3+ independent entities from 3+ eligible countries). The 2026 single-stage call closed 16 April 2026; most remaining opportunities are 2027 topics.', true),
('ngo', 'EU', null, null, 'Horizon Europe Health Cluster', 'EU funding (typically €1.5M-€10M per project, occasionally up to ~€90M for the largest calls) for collaborative health research and innovation projects, with strong current priority on AI and biotechnology in healthcare.', 'REQUIRES A MULTI-PARTNER CONSORTIUM (typically 3+ independent entities from 3+ eligible countries). The 2026 single-stage call closed 16 April 2026; most remaining opportunities are 2027 topics.', true),
('startup', 'EU', null, 'early', 'EIC Accelerator', 'EU blended finance for a single company (not a consortium): up to €2.5M non-dilutive grant plus optional €1M-€10M equity investment, for deep-tech innovations (including AI and biotech) that are validated (TRL 5+) but not yet fully market-ready.', 'Applies alone, never as a consortium. Requires technology already validated at TRL 5+. Full-proposal cut-offs are bimonthly (next: 2 Sept, then 4 Nov 2026). Historically competitive (5-8% success rate).', true),
('startup', 'EU', null, 'established', 'EIC Accelerator', 'EU blended finance for a single company (not a consortium): up to €2.5M non-dilutive grant plus optional €1M-€10M equity investment, for deep-tech innovations (including AI and biotech) that are validated (TRL 5+) but not yet fully market-ready.', 'Applies alone, never as a consortium. Requires technology already validated at TRL 5+. Full-proposal cut-offs are bimonthly (next: 2 Sept, then 4 Nov 2026). Historically competitive (5-8% success rate).', true);

-- --- Verify -----------------------------------------------------------------
-- Expected: 21 rows total. 8 rows sub_region='Puglia', 8 rows sub_region='Taranto'... 
-- wait: NIDI/MiniPIA/PIA ordinary+Taranto are single-org_type (2+2+2=6 rows,
-- 3 Puglia + 3 Taranto), ZES is 5+5=10 rows (5 Puglia + 5 Taranto), EU is 5 rows (null).
-- So: 8 Puglia, 8 Taranto, 5 null = 21 total.
select
  count(*) filter (where sub_region = 'Puglia') as puglia_rows,
  count(*) filter (where sub_region = 'Taranto') as taranto_rows,
  count(*) filter (where sub_region is null) as null_subregion_rows,
  count(*) as total_rows
from navigator_rules;
