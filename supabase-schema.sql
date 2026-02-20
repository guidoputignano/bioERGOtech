-- =========================================
-- bioERGOtech Foundation — Supabase Schema
-- =========================================
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- This creates all tables, seed data, and Row Level Security policies.

-- =====================
-- 1. PROFILES TABLE
-- =====================
-- Extends Supabase auth.users with org info, role, and approval status.

create table if not exists public.profiles (
    id uuid references auth.users on delete cascade primary key,
    email text,
    full_name text,
    org_name text,
    org_type text,
    website text,
    interest text,
    partnership_tier text default 'community' check (partnership_tier in ('community', 'project', 'strategic')),
    role text default 'member' check (role in ('member', 'admin', 'board')),
    status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
    reviewer_notes text,
    photo_url text,
    reviewed_by uuid references auth.users,
    reviewed_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, email, full_name)
    values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- Updated_at trigger
create or replace function public.update_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
    before update on public.profiles
    for each row execute procedure public.update_updated_at();

-- =====================
-- 2. PROJECTS TABLE
-- =====================

create table if not exists public.projects (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    pillar text,
    phase text default 'Ideation' check (phase in ('Ideation', 'Validation', 'Production')),
    progress integer default 0 check (progress >= 0 and progress <= 100),
    description text,
    created_by uuid references auth.users,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create trigger projects_updated_at
    before update on public.projects
    for each row execute procedure public.update_updated_at();

-- =====================
-- 3. EQUIPMENT TABLE
-- =====================

create table if not exists public.equipment (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    location text,
    status text default 'available' check (status in ('available', 'booked', 'maintenance')),
    utilization integer default 0 check (utilization >= 0 and utilization <= 100),
    created_at timestamptz default now()
);

-- =====================
-- 4. EQUIPMENT BOOKINGS
-- =====================

create table if not exists public.equipment_bookings (
    id uuid default gen_random_uuid() primary key,
    equipment_id uuid references public.equipment on delete cascade not null,
    user_id uuid references auth.users on delete cascade not null,
    status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
    notes text,
    requested_at timestamptz default now(),
    reviewed_at timestamptz
);

-- =====================
-- 5. EVENTS TABLE
-- =====================

create table if not exists public.events (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    event_date date,
    description text,
    location text,
    type text,
    created_at timestamptz default now()
);

-- =====================
-- 6. EVENT RSVPS
-- =====================

create table if not exists public.event_rsvps (
    id uuid default gen_random_uuid() primary key,
    event_id uuid references public.events on delete cascade not null,
    user_id uuid references auth.users on delete cascade not null,
    created_at timestamptz default now(),
    unique (event_id, user_id)
);

-- =====================
-- 7. KNOWLEDGE BASE
-- =====================

create table if not exists public.knowledge_base (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    category text,
    description text,
    content text,
    created_at timestamptz default now()
);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.equipment enable row level security;
alter table public.equipment_bookings enable row level security;
alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.knowledge_base enable row level security;

-- Helper: check if current user is admin/board
create or replace function public.is_admin()
returns boolean as $$
    select exists (
        select 1 from public.profiles
        where id = auth.uid()
        and role in ('admin', 'board')
    );
$$ language sql security definer;

-- --- PROFILES POLICIES ---
create policy "Users can view approved profiles"
    on public.profiles for select
    using (status = 'approved' or id = auth.uid() or public.is_admin());

create policy "Users can update own profile"
    on public.profiles for update
    using (id = auth.uid())
    with check (id = auth.uid());

create policy "Admins can update any profile"
    on public.profiles for update
    using (public.is_admin());

create policy "Public can view member count"
    on public.profiles for select
    using (status = 'approved');

-- --- PROJECTS POLICIES ---
create policy "Approved members can view projects"
    on public.projects for select
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and status = 'approved'
        )
    );

create policy "Admins can manage projects"
    on public.projects for all
    using (public.is_admin());

-- --- EQUIPMENT POLICIES ---
create policy "Approved members can view equipment"
    on public.equipment for select
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and status = 'approved'
        )
    );

create policy "Admins can manage equipment"
    on public.equipment for all
    using (public.is_admin());

-- --- EQUIPMENT BOOKINGS POLICIES ---
create policy "Users can view own bookings"
    on public.equipment_bookings for select
    using (user_id = auth.uid() or public.is_admin());

create policy "Approved members can create bookings"
    on public.equipment_bookings for insert
    with check (
        user_id = auth.uid() and
        exists (
            select 1 from public.profiles
            where id = auth.uid() and status = 'approved'
        )
    );

create policy "Admins can manage bookings"
    on public.equipment_bookings for all
    using (public.is_admin());

-- --- EVENTS POLICIES ---
create policy "Approved members can view events"
    on public.events for select
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and status = 'approved'
        )
    );

create policy "Admins can manage events"
    on public.events for all
    using (public.is_admin());

-- --- EVENT RSVPS POLICIES ---
create policy "Users can manage own RSVPs"
    on public.event_rsvps for all
    using (user_id = auth.uid());

create policy "Admins can view all RSVPs"
    on public.event_rsvps for select
    using (public.is_admin());

-- --- KNOWLEDGE BASE POLICIES ---
create policy "Approved members can view knowledge base"
    on public.knowledge_base for select
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and status = 'approved'
        )
    );

create policy "Admins can manage knowledge base"
    on public.knowledge_base for all
    using (public.is_admin());


-- =============================================
-- SEED DATA
-- =============================================

-- Projects
insert into public.projects (name, pillar, phase, progress, description) values
    ('OncoTarget', 'Synthetic Biology', 'Ideation', 35, 'Targeted cancer therapy platform using engineered biological circuits.'),
    ('VERO Algorithm', 'Digital Twin', 'Production', 68, 'AI-driven risk assessment algorithm for clinical decision support.'),
    ('CranioTech', 'Multi-Omics', 'Production', 52, 'Advanced cranial implant technology with integrated biosensors.'),
    ('Lab AI Agents', 'Multi-Omics', 'Ideation', 20, 'Autonomous lab agents for experiment design and execution.'),
    ('Xperbot Automation', 'Biomanufacturing', 'Ideation', 15, 'Robotic automation system for high-throughput bioprocessing.');

-- Equipment
insert into public.equipment (name, location, status, utilization) values
    ('Flow Cytometer BD FACSAria III', 'Taranto Lab A', 'available', 42),
    ('CRISPR Electroporation System', 'Zurich UZH', 'booked', 78),
    ('Raman Spectrometer', 'Taranto Lab B', 'available', 31),
    ('Organoid Culture Station', 'Zurich UZH', 'maintenance', 65),
    ('High-Throughput Sequencer', 'Taranto Lab A', 'available', 55);

-- Events
insert into public.events (name, event_date, description, location, type) values
    ('Progress Radar', '2026-03-15', 'Monthly cross-project sync and milestone review.', 'Virtual', 'Internal'),
    ('National Event Rome', '2026-04-22', 'Biotech innovation showcase at national level.', 'Rome, IT', 'Conference'),
    ('Project Genesis', '2026-05-10', 'New project kickoff and ideation sprint.', 'Taranto Hub', 'Workshop'),
    ('Copy & Improve', '2026-06-05', 'Peer review sessions and iterative improvement workshop.', 'Virtual', 'Workshop'),
    ('Taranto Biotech Days 2026', '2026-09-18', 'Flagship annual conference and BioShot competition.', 'Taranto, IT', 'Conference');

-- Knowledge Base
insert into public.knowledge_base (title, category, description) values
    ('EU IVDR Regulatory Pathway', 'Regulatory Pathways', 'Step-by-step guide to In Vitro Diagnostic Regulation compliance.'),
    ('Horizon Europe Application Guide', 'Funding Programs', 'How to apply for EU Horizon Europe grants for biotech projects.'),
    ('CRISPR Electroporation Protocol', 'Technical Protocols', 'Standard operating procedure for gene editing via electroporation.'),
    ('Patent Filing Strategy for Biotech', 'IP Strategy', 'Best practices for intellectual property protection in life sciences.'),
    ('New Member Onboarding Checklist', 'Onboarding', 'Everything you need to get started as a bioERGOtech ecosystem member.'),
    ('Swiss Medtech Regulatory Framework', 'Regulatory Pathways', 'Overview of Swiss medical device regulation and approval process.'),
    ('EIC Accelerator Program', 'Funding Programs', 'European Innovation Council funding for deep-tech startups.'),
    ('Flow Cytometry Best Practices', 'Technical Protocols', 'Optimised protocols for multi-parameter flow cytometry analysis.');


-- =============================================
-- NOTES FOR SETUP
-- =============================================
-- 1. Create a Supabase project at https://supabase.com
-- 2. Go to SQL Editor and run this entire file.
-- 3. Copy your project URL and anon key from Settings > API.
-- 4. Paste them into assets/js/supabase-config.js
-- 5. To make yourself admin, update your profile after signing up:
--    UPDATE public.profiles SET role = 'admin', status = 'approved' WHERE email = 'your@email.com';
-- 6. Enable Email auth in Authentication > Providers > Email.
-- 7. Optionally disable email confirmation for testing:
--    Authentication > Settings > "Enable email confirmations" = OFF
-- 8. If you already ran the schema before photo_url was added, run:
--    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS photo_url text;
