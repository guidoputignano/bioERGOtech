-- =========================================================
-- ⚠️  PLACEHOLDER seed data for navigator_rules — STRUCTURE ONLY.
-- =========================================================
-- DO NOT RUN THIS FILE AGAINST PRODUCTION. These rows are illustrative
-- only, to prove the schema and matching logic work end to end — they
-- are NOT confirmed eligibility criteria.
--
-- Before the Navigator goes live, every row below must be replaced with
-- eligibility criteria confirmed by the Foundation Director (and Board of
-- Advisors, if relevant) for NIDI, Mini-PIA, ZES, Horizon Europe, and any
-- other scheme you want the tool to cover. This table IS the product —
-- wrong guidance shown to a visitor is worse than no tool at all.
--
-- Suggested workflow: review one scheme at a time with the Director,
-- confirm org_type / region / stage thresholds, then insert/edit rows
-- directly in the Supabase table editor (or a follow-up migration once
-- confirmed) rather than running this file as-is.

insert into navigator_rules (org_type, region, stage, scheme_name, scheme_description, scheme_notes) values
('startup', 'Italy', 'early', 'Mini-PIA', 'A regional incentive supporting early-stage innovation projects in Italy.', 'CONFIRM: exact stage/size thresholds with the Foundation Director.'),
('startup', 'Italy', null, 'ZES Unica Mezzogiorno', 'A tax incentive for operations based in Southern Italy.', 'CONFIRM: applies only to Mezzogiorno-registered operations — verify region granularity beyond country level.'),
('startup', null, 'early', 'NIDI', 'Support for early-stage digital health innovators.', 'CONFIRM: NIDI eligibility scope and whether region-restricted.'),
('hospital', 'EU', null, 'Horizon Europe (Health Cluster)', 'EU funding for health research and innovation collaborations.', 'CONFIRM: current call deadlines and consortium requirements.'),
('university', 'EU', null, 'Horizon Europe (Health Cluster)', 'EU funding for health research and innovation collaborations.', 'Same scheme as above — shared across org types where applicable.'),
('ngo', null, null, 'EU Grants for Nonprofits (general)', 'General EU funding streams applicable to nonprofit health-tech collaborations.', 'CONFIRM: this is a placeholder category — replace with actual named schemes.');

-- Reminder: this file is intentionally sparse. Expand row-by-row with the
-- Foundation Director, one scheme at a time, rather than guessing broader
-- coverage.
