-- =========================================================
-- Migration: Agentic AI course. GitHub projects, final submission
-- and certificates.
--
-- What it adds
--   course_github_accounts   the GitHub account a student connected
--   course_projects          one row per project repository
--   course_project_members   which project each student belongs to,
--                            plus their final submission and the
--                            result of the latest automated check
--   course_certificates      issued certificates, the only source the
--                            public /verify page reads
--
-- Who writes
--   Only the server, through the service role key. None of these tables
--   has an insert, update or delete policy, so a student cannot link a
--   GitHub account they do not own, mark their own project as checked,
--   or mint a certificate from the browser with the anon key.
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

-- ── 1. GitHub accounts ────────────────────────────────────────────────
create table if not exists public.course_github_accounts (
  user_id       uuid        primary key references auth.users on delete cascade,
  -- GitHub's numeric id is stable across username changes, so it is the
  -- one that is unique. The login is kept for display and API paths.
  github_id     bigint      not null unique,
  github_login  text        not null,
  avatar_url    text,
  connected_at  timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── 2. Projects ───────────────────────────────────────────────────────
create table if not exists public.course_projects (
  id              uuid        primary key default gen_random_uuid(),
  github_repo_id  bigint      not null unique,
  full_name       text        not null,          -- owner/name
  html_url        text        not null,
  owner_login     text        not null,
  default_branch  text,
  -- True once the bioERGOtech mentor account is a collaborator.
  mentor_access   boolean     not null default false,
  created_via     text        not null check (created_via in ('template', 'linked')),
  created_by      uuid        references auth.users on delete set null,
  created_at      timestamptz not null default now()
);

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
  -- after the student deletes their account. Unique, so a student can
  -- never hold two.
  user_id           uuid        unique references auth.users on delete set null,
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
  -- writable by students, so they are flagged for a human to confirm.
  legacy            boolean     not null default false
);

-- ── 5. Row level security ─────────────────────────────────────────────
-- The API routes use the service role and bypass RLS. These policies are
-- the fallback layer, and they only ever allow reading.
alter table public.course_github_accounts  enable row level security;
alter table public.course_projects         enable row level security;
alter table public.course_project_members  enable row level security;
alter table public.course_certificates     enable row level security;

revoke insert, update, delete on public.course_github_accounts  from anon, authenticated;
revoke insert, update, delete on public.course_projects         from anon, authenticated;
revoke insert, update, delete on public.course_project_members  from anon, authenticated;
revoke insert, update, delete on public.course_certificates     from anon, authenticated;

drop policy if exists "Read own GitHub account" on public.course_github_accounts;
create policy "Read own GitHub account"
  on public.course_github_accounts for select
  using (auth.uid() = user_id or public.e_admin());

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
do $$
begin
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
        '10-Week Agentic AI High School Innovation Program',
        coalesce(p.cert_issued_at, now()),
        true
      from public.profiles p
      where p.cert_id is not null
      on conflict do nothing
    $q$;
  end if;
end;
$$;

-- ── 7. Verify ─────────────────────────────────────────────────────────
-- Must return 4 rows, all with rowsecurity = true:
--
--   select tablename, rowsecurity from pg_tables
--   where schemaname = 'public' and tablename like 'course\_%';
--
-- Legacy certificates to confirm by hand:
--
--   select cert_id, recipient_name, issued_at from public.course_certificates
--   where legacy order by issued_at;
