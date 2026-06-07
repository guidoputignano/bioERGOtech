-- =========================================================
-- Migration: Member benefits (Member Resources hub)
-- Admin-editable cards shown under "Included with membership"
-- in the member portal Resources section.
-- =========================================================

-- 1. Table
create table if not exists public.member_benefits (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  detail        text,
  icon          text not null default 'star',
  color         text not null default '#2EC4B6',
  bg            text not null default '#E6FAF8',
  action_type   text not null default 'request'
    check (action_type in ('active', 'request')),
  action_label  text,
  action_href   text,
  action_nav_to text,
  sort_order    integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 2. Seed the default benefits, only when the table is still empty so
-- re-running the migration is safe.
insert into public.member_benefits
  (name, description, detail, icon, color, bg, action_type, action_label, action_nav_to, sort_order)
select * from (values
  ('Professional email', 'A branded mailbox on the foundation domain.', 'Your own @bioergotech.org address.', 'mail', '#2EC4B6', '#E6FAF8', 'request', null, null, 1),
  ('Cloud storage', 'Shared and personal space for your work.', 'Up to 1TB on Google Drive.', 'inbox', '#4A7DFF', '#EBF1FF', 'request', null, null, 2),
  ('Canva Pro', 'Design tool for decks, posters, and social assets.', 'Full Canva Pro seat.', 'edit', '#7C5CFC', '#F0EDFF', 'request', null, null, 3),
  ('Google Ads grant', 'Nonprofit ad credits for outreach campaigns.', 'Up to €120k per year in ad spend.', 'trendingup', '#00B894', '#E6F9F5', 'request', null, null, 4),
  ('Outreach tool', 'Manage partner outreach and the MoU pipeline.', 'Open the Outreach workspace.', 'globe', '#F0A500', '#FFF8E6', 'active', 'Open Outreach', 'outreach', 5),
  ('Computing access', 'Shared compute for analysis and model work.', 'Request access to network compute.', 'cpu', '#E74C6F', '#FDECF1', 'request', null, null, 6)
) as seed(name, description, detail, icon, color, bg, action_type, action_label, action_nav_to, sort_order)
where not exists (select 1 from public.member_benefits);

-- 3. Row level security. Reads come from the public site for active cards.
-- Writes go through the API using the service role key, which bypasses RLS.
alter table public.member_benefits enable row level security;

drop policy if exists "Anyone can view active benefits" on public.member_benefits;
create policy "Anyone can view active benefits"
  on public.member_benefits for select
  using (is_active = true);
