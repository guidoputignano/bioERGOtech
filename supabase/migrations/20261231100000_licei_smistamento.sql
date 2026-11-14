-- =========================================================
-- Migration: smistamento dei progetti alla Commissione dei licei
--
-- Con circa 80 progetti e 8 giudici, ognuno non puo leggere tutto: ogni
-- progetto va a due giudici, scelti per tema e con carichi uguali, e ogni
-- giudice vede e valuta solo i suoi. Lo smistamento lo fa da solo il cron
-- del 26 novembre (`/api/cron/licei-commissione`), la regola e in
-- `lib/eventi/licei-smistamento.ts`, le date e i temi in
-- `app/eventi/vivere-piu-a-lungo/licei/smistamento.ts`.
--
-- Che cosa aggiunge:
--  1. `licei_progetti.temi`: uno o due temi, scelti dalla squadra alla
--     consegna, da un elenco chiuso;
--  2. `licei_commissari.temi`: i temi in cui il giudice si sente
--     competente, scelti da lui nella sua area;
--  3. `licei_commissari.riserva`: la riserva interna, che riceve progetti
--     solo se servono (giudici che non iniziano, schede mancanti alla
--     scadenza);
--  4. `licei_assegnazioni`: quale giudice legge quale progetto.
--
-- Nessun dato personale nuovo. Additiva e rieseguibile: `if not exists`,
-- vincoli aggiunti solo se mancano, policy ricreate.
--
-- Prima di questa migrazione il codice regge: il modulo degli studenti non
-- mostra i temi, l'area dei giudici mostra tutti i progetti come prima, e
-- il cron salta lo smistamento e lo segnala nel pannello.
--
-- Dipende da 20261206000000 (progetti, commissari) e da 20261213000000
-- (`public.e_admin()`).
-- =========================================================

do $$
begin
  if to_regclass('public.licei_commissari') is null or to_regclass('public.licei_progetti') is null then
    raise exception 'Mancano licei_progetti o licei_commissari: esegua prima 20261206000000_create_licei_squadre_progetti.sql.';
  end if;
  if to_regprocedure('public.e_admin()') is null then
    raise exception 'Manca public.e_admin(): esegua prima 20261213000000_profiles_ricorsione.sql.';
  end if;
end $$;

-- ── 1. Temi del progetto e del giudice, riserva ────────────────────────
alter table public.licei_progetti   add column if not exists temi    text[];
alter table public.licei_commissari add column if not exists temi    text[]  not null default '{}';
alter table public.licei_commissari add column if not exists riserva boolean not null default false;

do $$
begin
  -- Lo stesso elenco di TEMI_PROGETTO. Il progetto ne ha al massimo due.
  if not exists (select 1 from pg_constraint
                 where conrelid = 'public.licei_progetti'::regclass and conname = 'licei_progetti_temi_check') then
    alter table public.licei_progetti
      add constraint licei_progetti_temi_check
      check (temi is null or (
        cardinality(temi) <= 2
        and temi <@ array['diagnosi','terapie','alimentazione','ambiente','energia','agricoltura','dati_ia','dispositivi']::text[]
      ));
  end if;
  if not exists (select 1 from pg_constraint
                 where conrelid = 'public.licei_commissari'::regclass and conname = 'licei_commissari_temi_check') then
    alter table public.licei_commissari
      add constraint licei_commissari_temi_check
      check (temi <@ array['diagnosi','terapie','alimentazione','ambiente','energia','agricoltura','dati_ia','dispositivi']::text[]);
  end if;
end $$;

-- ── 2. Assegnazioni ────────────────────────────────────────────────────
create table if not exists public.licei_assegnazioni (
  id             uuid        primary key default gen_random_uuid(),
  progetto_id    uuid        not null references public.licei_progetti (id) on delete cascade,
  commissario_id uuid        not null references public.licei_commissari (id) on delete cascade,
  -- Da dove viene: lo smistamento, la richiesta del giudice ("me ne dia
  -- altri"), la sostituzione di chi conosce la squadra, la ridistribuzione
  -- di chi non ha iniziato, la copertura con la riserva, lo staff.
  origine        text        not null,
  -- "Conosco questa squadra": il giudice non lo valuta, e la riga resta
  -- perche lo smistamento non glielo ridia.
  conflitto      boolean     not null default false,
  -- Tolta (ridistribuita): resta per sapere chi l'aveva, e perche lo
  -- smistamento non la ridia alla stessa persona.
  rimossa_at     timestamptz,
  created_at     timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint
                 where conrelid = 'public.licei_assegnazioni'::regclass and conname = 'licei_assegnazioni_una_per_coppia') then
    alter table public.licei_assegnazioni
      add constraint licei_assegnazioni_una_per_coppia unique (progetto_id, commissario_id);
  end if;
  if not exists (select 1 from pg_constraint
                 where conrelid = 'public.licei_assegnazioni'::regclass and conname = 'licei_assegnazioni_origine_check') then
    alter table public.licei_assegnazioni
      add constraint licei_assegnazioni_origine_check
      check (origine in ('smistamento', 'richiesta', 'sostituzione', 'ridistribuzione', 'riserva', 'staff'));
  end if;
end $$;

create index if not exists licei_assegnazioni_commissario_idx on public.licei_assegnazioni (commissario_id);
create index if not exists licei_assegnazioni_progetto_idx    on public.licei_assegnazioni (progetto_id);

-- ── 3. Row Level Security ──────────────────────────────────────────────
-- Come le schede: le scritture passano dalle API con service role. Il
-- giudice legge le proprie righe, lo staff tutte.
alter table public.licei_assegnazioni enable row level security;

drop policy if exists "Commissari can view own assegnazioni" on public.licei_assegnazioni;
create policy "Commissari can view own assegnazioni"
  on public.licei_assegnazioni for select
  using (exists (
    select 1 from public.licei_commissari c
    where c.id = licei_assegnazioni.commissario_id and c.user_id = auth.uid()
  ));

drop policy if exists "Admins can view all assegnazioni" on public.licei_assegnazioni;
create policy "Admins can view all assegnazioni"
  on public.licei_assegnazioni for select
  using (public.e_admin());

revoke all on table public.licei_assegnazioni from public, anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.licei_assegnazioni from authenticated;
grant select on table public.licei_assegnazioni to authenticated;
grant all on table public.licei_assegnazioni to service_role;

-- ── 4. Verifica ────────────────────────────────────────────────────────
-- select c.cognome, count(*) filter (where a.rimossa_at is null and not a.conflitto) as attive
--   from public.licei_assegnazioni a join public.licei_commissari c on c.id = a.commissario_id
--  group by 1 order by 2 desc;
