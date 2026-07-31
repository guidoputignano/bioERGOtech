-- =========================================================
-- Migration: bando "Showcase di Innovazione: startup, spin-off e nuove
-- imprese", seconda giornata dell'evento "Vivere piu a lungo".
--
-- Modulo isolato, sullo stesso modello di event_registrations. Crea una
-- tabella per le candidature, un bucket privato per gli allegati PDF e una
-- vista di riepilogo per l'istruttoria. Non tocca in modo distruttivo lo
-- schema esistente. Le candidature sono collegate al bacino contatti del
-- Member Portal tramite bando_applications.user_id (FK verso auth.users).
--
-- Da eseguire dopo le migrazioni dell'evento (l'ordine non e vincolante:
-- questa dipende solo da auth.users e da public.profiles).
-- =========================================================

-- ── 1. Candidature ─────────────────────────────────────────────────────
create table if not exists public.bando_applications (
  id                     uuid        primary key default gen_random_uuid(),
  user_id                uuid        references auth.users (id) on delete set null,
  codice                 text        not null unique,

  -- Cartella degli allegati nello storage privato. Uno per candidatura.
  draft_id               uuid        not null,

  -- Art. 2. Categoria scelta dal proponente. categoria_riassegnata e il
  -- campo che usa la Commissione quando esercita il potere di riassegnazione
  -- d'ufficio: la scelta originale resta, cosi la storia non si perde.
  categoria              text        not null check (categoria in ('A', 'B', 'C')),
  categoria_riassegnata  text                 check (categoria_riassegnata in ('A', 'B', 'C')),
  -- Segnalazioni automatiche di incoerenza tra categoria e dati dichiarati.
  categoria_avvisi       text[]      not null default '{}',

  -- ── Progetto ──
  progetto_nome          text        not null,
  progetto_sintesi       text        not null,
  ambiti                 text[]      not null default '{}',

  -- ── Proponente ──
  organizzazione         text,
  forma_giuridica        text,
  partita_iva            text,
  data_costituzione      date,
  paese                  text        not null,
  citta                  text        not null,
  sito_web               text,

  -- ── Referente di progetto (art. 3) ──
  referente_nome         text        not null,
  referente_cognome      text        not null,
  referente_ruolo        text,
  referente_email        text        not null,
  referente_telefono     text        not null,
  referente_maggiorenne  boolean     not null default false,

  -- ── Team ──
  team_dimensione        int         check (team_dimensione is null or team_dimensione between 1 and 500),
  team_descrizione       text        not null,

  -- ── Descrizione del progetto (le voci richieste dall'art. 5) ──
  problema               text        not null,
  soluzione              text        not null,
  stato_avanzamento      text        not null,
  impatto_atteso         text        not null,
  aspetti_etici          text        not null,

  -- ── Categoria A. Ideazione ──
  a_stadio               text        check (a_stadio is null or a_stadio in ('concetto', 'fattibilita', 'proof_of_concept')),
  a_ente_ricerca         text,

  -- ── Categoria B. Creazione d'impresa ──
  b_stato_prototipo      text,
  b_validazione          text,
  b_raccolta_totale_eur  numeric(14, 2) check (b_raccolta_totale_eur is null or b_raccolta_totale_eur >= 0),
  b_modello_business     text,

  -- ── Categoria C. Impresa con raccolta di capitale ──
  c_raccolta_totale_eur  numeric(14, 2) check (c_raccolta_totale_eur is null or c_raccolta_totale_eur >= 0),
  c_ricavi_ultimo_anno_eur numeric(14, 2) check (c_ricavi_ultimo_anno_eur is null or c_ricavi_ultimo_anno_eur >= 0),
  c_strumenti            text[]      not null default '{}',
  c_round                text,
  c_obiettivi            text[]      not null default '{}',
  c_trazione             text,

  -- ── Allegati (art. 5). jsonb: { path, nome, size } ──
  file_descrizione       jsonb,
  file_pitch_deck        jsonb,
  file_documentazione    jsonb,
  file_prospetto         jsonb,
  file_extra             jsonb       not null default '[]'::jsonb,

  -- ── Materiale facoltativo non caricato come file ──
  video_url              text,
  pubblicazioni          text,
  brevetti               text,

  -- ── Ammissibilita (art. 3) ──
  presenza_taranto       boolean     not null default false,
  edizioni_precedenti    boolean     not null default false,
  edizioni_avanzamenti   text,
  no_procedure_concorsuali boolean,

  -- ── Dichiarazioni e consensi, con timestamp e testo accettato ──
  dichiarazione_veridicita boolean   not null default false,
  accetta_bando          boolean     not null default false,
  presa_atto_pubblicita  boolean     not null default false,
  consenso_privacy       boolean     not null default false,
  consenso_privacy_ts    timestamptz,
  consenso_marketing     boolean     not null default false,
  consenso_marketing_ts  timestamptz,
  consenso_marketing_testo text,
  dichiarazioni_testo    jsonb,

  -- ── Istruttoria (art. 9 e 10) ──
  stato                  text        not null default 'ricevuta' check (stato in (
                           'ricevuta', 'in_valutazione', 'ammessa',
                           'non_ammessa', 'area_espositiva', 'ritirata'
                         )),
  punteggio              numeric(5, 2) check (punteggio is null or punteggio between 0 and 100),
  note_commissione       text,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  -- Una candidatura per progetto e per email del referente. Reinviare lo
  -- stesso progetto aggiorna la candidatura invece di duplicarla.
  dedup_key              text generated always as (
                           lower(btrim(referente_email)) || '::' || lower(btrim(progetto_nome))
                         ) stored,
  constraint bando_applications_dedup_unique unique (dedup_key)
);

create index if not exists bando_applications_user_id_idx
  on public.bando_applications (user_id);
create index if not exists bando_applications_categoria_idx
  on public.bando_applications (categoria);
create index if not exists bando_applications_stato_idx
  on public.bando_applications (stato);
create index if not exists bando_applications_email_idx
  on public.bando_applications (lower(referente_email));

-- updated_at sempre allineato, senza doverlo ricordare nelle API.
create or replace function public.bando_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_bando_touch_updated_at on public.bando_applications;
create trigger trg_bando_touch_updated_at
  before update on public.bando_applications
  for each row execute function public.bando_touch_updated_at();

-- ── 2. Row Level Security ──────────────────────────────────────────────
-- Le scritture pubbliche passano dalle API con service role (che bypassa la
-- RLS). Teniamo la RLS attiva e restrittiva: nessuna policy di insert o di
-- update per anon e authenticated.
alter table public.bando_applications enable row level security;

-- Il proponente loggato vede la propria candidatura e il suo stato.
drop policy if exists "Applicants can view own application" on public.bando_applications;
create policy "Applicants can view own application"
  on public.bando_applications for select
  using (auth.uid() = user_id);

-- Lo staff vede tutte le candidature.
drop policy if exists "Admins can view all applications" on public.bando_applications;
create policy "Admins can view all applications"
  on public.bando_applications for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.partnership_level = 'admin'
  ));

-- ── 3. Bucket privato per gli allegati ─────────────────────────────────
-- Privato per davvero: nessuna policy su storage.objects, quindi ne anon ne
-- authenticated possono leggere o scrivere. Il caricamento avviene dalla
-- rotta /api/eventi/bando/upload con service role, il download dal pannello
-- admin tramite URL firmati a scadenza breve.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bando-candidature',
  'bando-candidature',
  false,
  10485760,                    -- 10 MB per file, come dichiarato nel form
  array['application/pdf']
)
on conflict (id) do update set
  public             = false,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ── 4. Riepilogo per l'istruttoria ─────────────────────────────────────
-- Conteggi per categoria e per stato, per la testata del pannello admin.
create or replace function public.bando_stats()
returns table (categoria text, stato text, totale bigint)
language sql
stable
security definer set search_path = ''
as $$
  select
    coalesce(a.categoria_riassegnata, a.categoria) as categoria,
    a.stato,
    count(*) as totale
  from public.bando_applications a
  group by 1, 2;
$$;

revoke all on function public.bando_stats() from anon, authenticated;

-- ── 5. Verifica ────────────────────────────────────────────────────────
-- select count(*) from public.bando_applications;
-- select * from storage.buckets where id = 'bando-candidature';
