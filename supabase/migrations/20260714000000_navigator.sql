-- =========================================================
-- Migration: Grant & Funding Eligibility Navigator — schema
-- =========================================================
-- NOTE: this repo's CRM table is `outreach_contacts`, not `leads`.
-- Adapted from the starter package accordingly — see 20260714000001
-- for the (placeholder, structure-only) seed data.

-- 1. Eligibility rules table — kept as DATA, not hardcoded logic, so
--    Foundation leadership can review and edit rules without touching code.
create table if not exists navigator_rules (
  id uuid primary key default gen_random_uuid(),
  org_type text not null,        -- 'hospital' | 'university' | 'startup' | 'pharma' | 'ngo' | 'government'
  region text,                   -- free-text country name as typed by the visitor (see note below), or 'EU', or null = any
  stage text,                    -- 'idea' | 'early' | 'established', or null = any
  scheme_name text not null,     -- e.g. 'NIDI', 'Mini-PIA', 'ZES', 'Horizon Europe'
  scheme_description text,       -- one plain-language sentence shown to the visitor
  scheme_notes text,             -- internal caveats, e.g. "ZES applies only to Mezzogiorno-based operations"
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table navigator_rules is
  'Editable eligibility rule set. Each row = one condition-to-scheme mapping. Reviewed and maintained by Foundation leadership, not just engineering.';

comment on column navigator_rules.region is
  'Matched case-insensitively against the free-text country the visitor typed (e.g. "Italy"), not an ISO code — the region question in the Navigator flow is a plain text field. Use "EU" to match any EU member state (see lib/navigator/rules-engine.ts for the member list). Spell region names the same way visitors are likely to type them.';

-- 2. Every completed Navigator session
create table if not exists navigator_sessions (
  id uuid primary key default gen_random_uuid(),
  organisation_name text,
  org_type text,
  region text,
  stage text,
  interest_areas text[],
  existing_support text,          -- 'yes' | 'no'
  existing_support_detail text,   -- free text if 'yes', to avoid recommending duplicates
  goals text[],
  email text,
  eligible_schemes jsonb,          -- computed result snapshot, stored for audit/reference
  completed boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_navigator_sessions_email on navigator_sessions(email);

-- 3. Link completed sessions into the existing outreach CRM table.
--    (Starter package referenced a `leads` table; this project's actual
--    CRM table is `outreach_contacts` — used by the member portal,
--    the MoU pipeline, and the follow-up cron jobs.)
alter table outreach_contacts add column if not exists source text default 'manual';
alter table outreach_contacts add column if not exists navigator_session_id uuid references navigator_sessions(id);
