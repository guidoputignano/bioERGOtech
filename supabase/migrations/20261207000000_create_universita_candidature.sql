-- =========================================================
-- Migration: bando "Biotecnologie e Intelligenza Artificiale" per gli
-- studenti universitari, Fondazione bioERGOtech e SafesPro.
--
-- Modulo isolato, sullo stesso modello di bando_applications. Una tabella
-- per le pre-iscrizioni, niente bucket perche in questa fase non si carica
-- nulla. Le candidature sono collegate al bacino contatti del Member Portal
-- tramite universita_candidature.user_id (FK verso auth.users).
--
-- Differenza rispetto ai licei: qui il candidato e il singolo studente, non
-- un istituto, quindi non esistono codice scuola ne referente.
--
-- Da eseguire dopo le migrazioni dell'evento. Dipende solo da auth.users e
-- da public.profiles.
-- =========================================================

-- ── 1. Candidature ─────────────────────────────────────────────────────
create table if not exists public.universita_candidature (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        references auth.users (id) on delete set null,
  codice            text        not null unique,

  -- ── Anagrafica (art. 4) ──
  nome              text        not null,
  cognome           text        not null,
  email             text        not null,

  -- ── Percorso universitario (art. 2) ──
  universita        text        not null,
  corso_studi       text        not null,
  livello           text        not null check (livello in (
                      'triennale', 'magistrale', 'ciclo_unico',
                      'dottorato', 'post_laurea')),

  -- L'art. 2 elenca le aree "a titolo esemplificativo", quindi 'altro'
  -- esiste come valore e area_altro raccoglie il testo libero.
  area              text        not null check (area in (
                      'biotecnologie', 'scienze_biologiche', 'medicina',
                      'farmacia', 'chimica', 'ingegneria', 'informatica',
                      'fisica', 'scienze_ambientali', 'scienze_motorie',
                      'economia_innovazione', 'altro')),
  area_altro        text,

  -- Facoltativo: una riga sugli interessi di ricerca, non una proposta.
  interessi         text,

  -- ── Consensi, registrati con il testo vigente al momento dell'invio ──
  accetta_bando     boolean     not null default false,
  consenso_privacy  boolean     not null default false,
  accetta_bando_testo    text,
  consenso_privacy_testo text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Una candidatura per indirizzo: un secondo invio aggiorna la prima.
create unique index if not exists universita_candidature_email_uidx
  on public.universita_candidature (lower(email));

create index if not exists universita_candidature_user_id_idx
  on public.universita_candidature (user_id);
create index if not exists universita_candidature_area_idx
  on public.universita_candidature (area);
create index if not exists universita_candidature_livello_idx
  on public.universita_candidature (livello);

-- ── 2. updated_at ──────────────────────────────────────────────────────
create or replace function public.universita_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_universita_touch_updated_at
  on public.universita_candidature;
create trigger trg_universita_touch_updated_at
  before update on public.universita_candidature
  for each row execute function public.universita_touch_updated_at();

-- ── 3. Row level security ──────────────────────────────────────────────
-- Nessuna lettura pubblica. Il candidato vede la propria candidatura se ha
-- un account collegato; lo staff vede tutto. Le scritture passano solo dalla
-- service role key, come per bando_applications.
alter table public.universita_candidature enable row level security;

drop policy if exists "Candidates can view own application"
  on public.universita_candidature;
create policy "Candidates can view own application"
  on public.universita_candidature
  for select
  using (user_id is not null and user_id = auth.uid());

drop policy if exists "Admins can view all university applications"
  on public.universita_candidature;
create policy "Admins can view all university applications"
  on public.universita_candidature
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.partnership_level = 'admin'
    )
  );

comment on table public.universita_candidature is
  'Pre-iscrizioni al bando universitario "Biotecnologie e Intelligenza Artificiale". Raccolta di adesioni, non selezione: i contenuti dell''art. 4 (CV, proposta di progetto) arriveranno in una fase successiva.';
