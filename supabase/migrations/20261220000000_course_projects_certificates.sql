-- =========================================================
-- Migration: Agentic AI course. Project repositories, final submission
-- and certificates.
--
-- What it adds
--   course_projects          one row per public GitHub repository that
--                            students linked as their project
--   course_project_members   which project each student belongs to,
--                            plus their final submission and the
--                            result of the latest automated check
--   course_certificates      issued certificates, the only source the
--                            public /verify page reads
--   course_rate_limits       per-student allowance of GitHub requests
--   course_backfill_runs     records that the one-time copy of old
--                            certificates has run
--
-- Who writes
--   Only the server, through the service role key. None of these tables
--   has an insert, update or delete policy, so a student cannot mark their
--   own project as checked or mint a certificate from the browser with the
--   anon key.
--
-- Why certificates get their own table
--   approve-certificate used to write cert_id and cert_issued_at onto
--   public.profiles. Students may update their own profile row (the
--   membership application needs it), and the guard trigger from
--   20261203000000 does not cover those two columns. Once a public
--   verify page exists, a value a student can write is a certificate a
--   student can forge. This table has no write path for students at all.
--
-- Safe to re-run: every statement is idempotent.
-- =========================================================

-- ── 1. Earlier drafts of this file ────────────────────────────────────
-- A draft connected students' GitHub accounts and added a bioERGOtech
-- mentor collaborator. Students now just share a public repository link,
-- so that table and those columns are gone. Nothing on a fresh database.
drop table if exists public.course_github_accounts;

-- ── 2. Projects ───────────────────────────────────────────────────────
-- Students create the repository in their own GitHub account and paste its
-- link. It must be public: the checks read it without any GitHub login.
create table if not exists public.course_projects (
  id              uuid        primary key default gen_random_uuid(),
  -- GitHub's numeric id survives a rename, so it identifies the repo.
  github_repo_id  bigint      not null unique,
  full_name       text        not null,          -- owner/name, refreshed on each link
  html_url        text        not null,
  owner_login     text        not null,
  default_branch  text,
  -- A fork is shown to reviewers: the work may not be the student's own.
  is_fork         boolean     not null default false,
  fork_parent     text,
  created_by      uuid        references auth.users on delete set null,
  created_at      timestamptz not null default now()
);

alter table public.course_projects drop column if exists mentor_access;
alter table public.course_projects drop column if exists created_via;
alter table public.course_projects add column if not exists is_fork boolean not null default false;
alter table public.course_projects add column if not exists fork_parent text;

-- ── 3. Membership and final submission ────────────────────────────────
-- One project per student, several students per project (teams).
create table if not exists public.course_project_members (
  user_id           uuid        primary key references auth.users on delete cascade,
  project_id        uuid        not null references public.course_projects on delete cascade,
  joined_at         timestamptz not null default now(),
  -- Set when the student presses "Submit for certificate". The commit is
  -- what gets assessed, so later pushes do not change a reviewed result.
  submitted_at      timestamptz,
  submitted_commit  text,
  check_result      jsonb,
  checked_at        timestamptz
);

create index if not exists course_project_members_project_idx
  on public.course_project_members (project_id);

-- ── 4. Certificates ───────────────────────────────────────────────────
create table if not exists public.course_certificates (
  cert_id           text        primary key,
  -- Nullable and SET NULL on purpose: a certificate must stay verifiable
  -- after the student deletes their account. At most one active (not
  -- revoked) certificate per student: see the partial index below.
  user_id           uuid        references auth.users on delete set null,
  recipient_name    text        not null,
  student_id        text,
  course_title      text        not null,
  project_url       text,
  submitted_commit  text,
  issued_at         timestamptz not null default now(),
  issued_by         uuid        references auth.users on delete set null,
  -- Set when an admin issued it without the student meeting the automatic
  -- rule (for example a licei student assessed by their Commissione).
  override_reason   text,
  emailed_at        timestamptz,
  revoked_at        timestamptz,
  revoked_reason    text,
  -- Copied from profiles.cert_id by the backfill below. Those values were
  -- writable by students, so a legacy row does not verify as valid until
  -- staff set confirmed_at (Course Monitor, "Confirm").
  legacy            boolean     not null default false,
  confirmed_at      timestamptz
);

-- Brings a table created by an earlier draft of this file up to date: it
-- had no confirmed_at and a plain UNIQUE(user_id). Nothing on a fresh one.
alter table public.course_certificates add column if not exists confirmed_at timestamptz;
alter table public.course_certificates drop constraint if exists course_certificates_user_id_key;

-- One active certificate per student. Partial, so a revoked certificate
-- (wrong name, forged legacy row) can be replaced by a new one. The name
-- contains "user_id": approve-certificate matches on it to tell a second
-- issue apart from a cert_id collision.
create unique index if not exists course_certificates_active_user_id_idx
  on public.course_certificates (user_id) where revoked_at is null;

-- ── 5. Row level security ─────────────────────────────────────────────
-- The API routes use the service role and bypass RLS. These policies are
-- the fallback layer, and they only ever allow reading.
alter table public.course_projects         enable row level security;
alter table public.course_project_members  enable row level security;
alter table public.course_certificates     enable row level security;

revoke insert, update, delete on public.course_projects         from anon, authenticated;
revoke insert, update, delete on public.course_project_members  from anon, authenticated;
revoke insert, update, delete on public.course_certificates     from anon, authenticated;

drop policy if exists "Read own project membership" on public.course_project_members;
create policy "Read own project membership"
  on public.course_project_members for select
  using (auth.uid() = user_id or public.e_admin());

drop policy if exists "Read projects you belong to" on public.course_projects;
create policy "Read projects you belong to"
  on public.course_projects for select
  using (
    public.e_admin()
    or exists (
      select 1 from public.course_project_members m
      where m.project_id = course_projects.id and m.user_id = auth.uid()
    )
  );

drop policy if exists "Read own certificate" on public.course_certificates;
create policy "Read own certificate"
  on public.course_certificates for select
  using (auth.uid() = user_id or public.e_admin());

-- ── 6. Backfill certificates already issued ───────────────────────────
-- profiles.cert_id and cert_issued_at were added outside the migrations,
-- so they may not exist on a fresh database. Only copy when they do.
--
-- Runs once, recorded in course_backfill_runs whether or not it found
-- anything. Students can still write profiles.cert_id, and since the server
-- no longer does, anything that appears there after the first run is
-- forged: a re-run of this file must not import it. Imported rows are
-- unconfirmed (legacy, no confirmed_at) and do not verify as valid until
-- staff check them against the certificates actually emailed. A cert_id
-- claimed by two profiles is skipped outright: at least one is a copy (the
-- query at the end lists them, to check by hand).
create table if not exists public.course_backfill_runs (
  name    text        primary key,
  ran_at  timestamptz not null default now()
);
alter table public.course_backfill_runs enable row level security;
revoke all on public.course_backfill_runs from anon, authenticated;

do $$
begin
  if exists (select 1 from public.course_backfill_runs where name = 'legacy_certificates') then
    return;
  end if;
  insert into public.course_backfill_runs (name) values ('legacy_certificates');

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'cert_id'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'cert_issued_at'
  ) then
    execute $q$
      insert into public.course_certificates
        (cert_id, user_id, recipient_name, course_title, issued_at, legacy)
      select
        p.cert_id,
        p.id,
        coalesce(nullif(p.full_name, ''), p.email),
        -- The title printed on certificates issued before the rename to
        -- "Agentic AI Program", so /verify matches the document the holder has.
        '10-Week Agentic AI High School Innovation Program',
        coalesce(p.cert_issued_at, now()),
        true
      from public.profiles p
      where p.cert_id is not null
        and p.cert_id in (
          select cert_id from public.profiles
          where cert_id is not null
          group by cert_id having count(*) = 1
        )
      on conflict do nothing
    $q$;
  end if;
end;
$$;

-- ── 6b. GitHub request allowance per student ──────────────────────────
-- The checks read public repositories through GitHub's API, which allows
-- 60 anonymous requests an hour per server address (5,000 with a token),
-- shared by every student. Each student gets a minimum gap and an hourly
-- cap per kind of request ('link', 'check'), so one person, by accident or
-- with a script, cannot use up everyone's allowance. Claimed atomically:
-- parallel requests from one student queue on the row lock.
create table if not exists public.course_rate_limits (
  user_id       uuid        not null references auth.users on delete cascade,
  kind          text        not null,
  window_start  timestamptz not null default now(),
  used          integer     not null default 0,
  last_at       timestamptz,
  primary key (user_id, kind)
);
alter table public.course_rate_limits enable row level security;
revoke all on public.course_rate_limits from anon, authenticated;

-- Returns 0 when the slot is taken, otherwise the seconds to wait.
create or replace function public.course_claim_github(
  p_user uuid, p_kind text, p_min_seconds integer, p_per_hour integer
) returns integer
language plpgsql
set search_path = public, pg_temp
as $$
declare
  r public.course_rate_limits%rowtype;
begin
  insert into public.course_rate_limits (user_id, kind) values (p_user, p_kind)
  on conflict (user_id, kind) do nothing;
  select * into r from public.course_rate_limits
  where user_id = p_user and kind = p_kind
  for update;

  if r.last_at is not null and r.last_at > now() - make_interval(secs => p_min_seconds) then
    return greatest(1, ceil(extract(epoch from (r.last_at + make_interval(secs => p_min_seconds) - now())))::integer);
  end if;
  if r.window_start < now() - interval '1 hour' then
    update public.course_rate_limits set window_start = now(), used = 1, last_at = now()
    where user_id = p_user and kind = p_kind;
    return 0;
  end if;
  if r.used >= p_per_hour then
    return greatest(1, ceil(extract(epoch from (r.window_start + interval '1 hour' - now())))::integer);
  end if;
  update public.course_rate_limits set used = r.used + 1, last_at = now()
  where user_id = p_user and kind = p_kind;
  return 0;
end;
$$;

-- Only the server calls it. Revoked from PUBLIC, not just from the two
-- roles: they inherit EXECUTE from PUBLIC (see 20261212000000).
revoke all on function public.course_claim_github(uuid, text, integer, integer) from public;
grant execute on function public.course_claim_github(uuid, text, integer, integer) to service_role;

-- ── 7. Verify ─────────────────────────────────────────────────────────
-- Must return 5 rows (backfill_runs, certificates, project_members,
-- projects, rate_limits), all with rowsecurity = true:
--
--   select tablename, rowsecurity from pg_tables
--   where schemaname = 'public' and tablename like 'course\_%';
--
-- Legacy certificates waiting for confirmation. Check each against the
-- certificate emails actually sent (Resend log), then press Confirm or
-- Revoke on the student's row in the Course Monitor:
--
--   select cert_id, recipient_name, issued_at from public.course_certificates
--   where legacy and confirmed_at is null and revoked_at is null
--   order by issued_at;
--
-- Certificate ids claimed by more than one profile, skipped by the copy.
-- One of each is probably genuine: find it in the Resend log and issue that
-- student a new certificate from the Course Monitor ("Issue anyway").
--
--   select cert_id, array_agg(id) as profiles from public.profiles
--   where cert_id is not null group by cert_id having count(*) > 1;
