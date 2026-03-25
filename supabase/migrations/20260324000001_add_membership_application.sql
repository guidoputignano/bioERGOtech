-- =========================================================
-- Migration: Add membership application fields to profiles
-- =========================================================

-- 1. Add organisation and application columns to profiles
alter table public.profiles
  add column if not exists organisation_name     text,
  add column if not exists organisation_type     text
    check (organisation_type in (
      'startup', 'sme', 'hospital', 'university',
      'investor', 'international_partner', 'other'
    )),
  add column if not exists organisation_website  text,
  add column if not exists country               text,
  add column if not exists city                  text,
  add column if not exists contact_role          text,
  add column if not exists areas_of_interest     text[],
  add column if not exists what_you_bring        text,
  add column if not exists what_you_seek         text,
  add column if not exists application_status    text
    not null default 'none'
    check (application_status in (
      'none', 'pending', 'approved', 'declined'
    )),
  add column if not exists applied_at            timestamptz,
  add column if not exists reviewed_at           timestamptz,
  add column if not exists admin_notes           text,
  add column if not exists created_at            timestamptz not null default now();

-- 2. Policy: users can update their own profile (for application submission)
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 3. Policy: admins can view ALL profiles (including pending applications)
-- (existing policy only lets admins see profiles via service role)
-- This ensures the admin panel works correctly
drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1 from public.profiles p2
      where p2.id = auth.uid()
        and p2.partnership_level = 'admin'
    )
  );