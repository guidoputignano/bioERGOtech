-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Create profiles table with partnership_level
-- Run this in your Supabase SQL editor or via the Supabase CLI
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create profiles table
create table if not exists public.profiles (
  id            uuid        references auth.users on delete cascade primary key,
  email         text        not null,
  full_name     text,
  partnership_level text    not null default 'viewer'
                            check (partnership_level in ('viewer', 'member', 'partner', 'admin')),
  updated_at    timestamptz not null default now()
);

-- 2. Enable Row Level Security
alter table public.profiles enable row level security;

-- 3. Policy: users can read their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- 4. Policy: admins can read all profiles
create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and partnership_level = 'admin'
    )
  );

-- 5. Policy: admins can update any profile's partnership_level
create policy "Admins can update partnership level"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and partnership_level = 'admin'
    )
  )
  with check (true);

-- 6. Policy: service role bypasses RLS (used by admin API)
-- The service role key used in the API route automatically bypasses RLS.

-- 7. Function: auto-create profile on new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, partnership_level)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'viewer'
  );
  return new;
end;
$$;

-- 8. Trigger: run handle_new_user after each new auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- IMPORTANT: After running this migration, set the first admin manually:
--
--   update public.profiles
--   set partnership_level = 'admin'
--   where email = 'your-admin@email.com';
--
-- The SUPABASE_SERVICE_ROLE_KEY env var must be set in your .env.local
-- for the admin API routes to work.
-- ─────────────────────────────────────────────────────────────────────────────
