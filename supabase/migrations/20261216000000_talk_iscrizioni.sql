-- =========================================================
-- Migration: iscrizioni ai "Talk con gli esperti"
--
-- Una tabella sola, `talk_iscrizioni`: chi si e iscritto a quale talk. Il
-- talk non e una riga del database, e una voce di `TALKS` in
-- app/eventi/vivere-piu-a-lungo/talk/content.ts, e qui compare con il suo
-- slug. Aggiungere un talk non chiede una migrazione.
--
-- Nessun dato personale nuovo. La riga lega un account a un talk, con il
-- ruolo con cui si e iscritto e, per studenti e docenti dei licei,
-- l'istituto (serve al docente per vedere quanti dei suoi studenti si sono
-- iscritti, senza nomi). Nome ed email restano dove sono gia: l'export dello
-- staff li legge da li al momento.
--
-- Le scritture passano dalle API con service role, che controllano chi puo
-- iscriversi. Qui nessuna policy di insert, update o delete: dal browser si
-- legge, al massimo, la propria riga.
--
-- Additiva e rieseguibile: `if not exists`, `drop policy if exists`,
-- vincoli aggiunti solo se mancano. Il codice regge anche PRIMA che sia
-- applicata: senza la tabella la pagina dice "Le iscrizioni aprono a
-- breve." e le scritture rispondono 503.
--
-- Dipende da 20261204000000 (`licei_adesioni`, per la chiave esterna) e da
-- 20261213000000 (`public.e_admin()`, per la policy dello staff): il
-- controllo qui sotto lo dice prima di iniziare, invece di fermarsi a meta.
-- =========================================================

do $$
begin
  if to_regclass('public.licei_adesioni') is null then
    raise exception 'Manca public.licei_adesioni: esegua prima 20261204000000_create_licei_adesioni.sql.';
  end if;
  if to_regprocedure('public.e_admin()') is null then
    raise exception 'Manca public.e_admin(): esegua prima 20261213000000_profiles_ricorsione.sql.';
  end if;
end $$;

-- ── 1. La tabella ──────────────────────────────────────────────────────
create table if not exists public.talk_iscrizioni (
  id          uuid        primary key default gen_random_uuid(),
  -- Lo slug del talk, come in `TALKS`. Solo minuscole, cifre e trattini:
  -- e anche un pezzo di URL.
  talk_slug   text        not null,
  -- L'account. Se viene cancellato (per esempio dalla chiusura del
  -- percorso licei), le sue iscrizioni se ne vanno con lui.
  user_id     uuid        not null references auth.users (id) on delete cascade,
  -- Con quale titolo partecipa. Lo decide la rotta, non chi si iscrive.
  ruolo       text        not null,
  -- L'istituto, per studenti e docenti dei licei. Se l'adesione viene
  -- cancellata la riga resta, senza istituto: la toglie la chiusura del
  -- percorso, che cancella le iscrizioni ai talk di studenti e docenti.
  adesione_id uuid        references public.licei_adesioni (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- I vincoli in blocchi a parte, cosi una seconda esecuzione non li duplica
-- e non fallisce se ci sono gia.
do $$
begin
  if not exists (select 1 from pg_constraint
                 where conrelid = 'public.talk_iscrizioni'::regclass and conname = 'talk_iscrizioni_una_per_persona') then
    alter table public.talk_iscrizioni
      add constraint talk_iscrizioni_una_per_persona unique (talk_slug, user_id);
  end if;
  if not exists (select 1 from pg_constraint
                 where conrelid = 'public.talk_iscrizioni'::regclass and conname = 'talk_iscrizioni_ruolo_check') then
    alter table public.talk_iscrizioni
      add constraint talk_iscrizioni_ruolo_check
      check (ruolo in ('studente_licei', 'studente_universita', 'docente', 'staff'));
  end if;
  if not exists (select 1 from pg_constraint
                 where conrelid = 'public.talk_iscrizioni'::regclass and conname = 'talk_iscrizioni_slug_check') then
    alter table public.talk_iscrizioni
      add constraint talk_iscrizioni_slug_check
      check (talk_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(talk_slug) <= 80);
  end if;
  -- L'istituto ha senso solo per chi viene dai licei.
  if not exists (select 1 from pg_constraint
                 where conrelid = 'public.talk_iscrizioni'::regclass and conname = 'talk_iscrizioni_adesione_check') then
    alter table public.talk_iscrizioni
      add constraint talk_iscrizioni_adesione_check
      check (adesione_id is null or ruolo in ('studente_licei', 'docente'));
  end if;
end $$;

-- Quasi ogni lettura parte dal talk: i conteggi della pagina e del pannello,
-- l'export. Il conteggio per istituto filtra anche per adesione, ed e lo
-- stesso indice che serve alla chiave esterna quando un'adesione sparisce.
create index if not exists talk_iscrizioni_slug_idx     on public.talk_iscrizioni (talk_slug);
create index if not exists talk_iscrizioni_adesione_idx on public.talk_iscrizioni (adesione_id);

-- ── 2. Row Level Security ──────────────────────────────────────────────
alter table public.talk_iscrizioni enable row level security;

-- Ognuno vede la propria iscrizione, e nessun'altra.
drop policy if exists "Users can view own talk iscrizioni" on public.talk_iscrizioni;
create policy "Users can view own talk iscrizioni"
  on public.talk_iscrizioni for select
  using (auth.uid() = user_id);

drop policy if exists "Admins can view all talk iscrizioni" on public.talk_iscrizioni;
create policy "Admins can view all talk iscrizioni"
  on public.talk_iscrizioni for select
  using (public.e_admin());

-- ── 3. Privilegi ───────────────────────────────────────────────────────
-- Come in 20261215000000: anon non tocca la tabella, authenticated puo solo
-- leggere (e RLS gli mostra la sola riga sua), service_role tutto. Il grant
-- a service_role e esplicito perche il risultato sia lo stesso anche su un
-- database senza i privilegi di default di Supabase.
revoke all on table public.talk_iscrizioni from public, anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.talk_iscrizioni from authenticated;
grant select on table public.talk_iscrizioni to authenticated;
grant all on table public.talk_iscrizioni to service_role;

-- ── 4. Verifica ────────────────────────────────────────────────────────
-- select talk_slug, ruolo, count(*) from public.talk_iscrizioni group by 1, 2 order by 1, 2;
