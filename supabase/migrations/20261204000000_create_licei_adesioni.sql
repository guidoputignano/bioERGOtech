-- =========================================================
-- Migration: bando licei "Biotecnologie e Intelligenza Artificiale"
--
-- Prima fase del modulo: l'adesione degli istituti (art. 4). Chi aderisce e
-- l'ISTITUTO, tramite un docente referente, non lo studente. In questa fase
-- il sito non tocca alcun dato di studenti: solo numeri previsti per anno di
-- corso. L'iscrizione dei ragazzi, le squadre e i progetti arriveranno con le
-- fasi successive e avranno le loro tabelle.
--
-- Due tabelle: le adesioni e una configurazione chiave/valore. La seconda
-- esiste perche il bando NON fissa scadenze: l'art. 4 e l'art. 10 le
-- rimandano al referente del consorzio dei licei. Se le date vivessero nel
-- codice, ogni comunicazione del consorzio richiederebbe un rilascio del
-- sito e uno sviluppatore disponibile.
-- =========================================================

-- ── 1. Adesioni degli istituti ─────────────────────────────────────────
create table if not exists public.licei_adesioni (
  id                    uuid        primary key default gen_random_uuid(),
  -- Account del docente referente nel Member Portal, creato dall'API.
  user_id               uuid        references auth.users (id) on delete set null,
  -- Codice che il referente mette in circolare: lo useranno gli studenti
  -- per iscriversi al percorso. Formato LIC-XXXXXXXX.
  codice                text        not null unique,

  -- ── Istituto ──
  istituto_denominazione text       not null,
  codice_meccanografico  text       not null,
  istituto_comune        text       not null,
  istituto_provincia     text       not null default 'TA',
  istituto_email         text       not null,
  istituto_sito          text,
  dirigente_nome         text,

  -- ── Docente referente (art. 4) ──
  referente_nome         text       not null,
  referente_cognome      text       not null,
  referente_email        text       not null,
  referente_telefono     text       not null,
  referente_materia      text,

  -- ── Numeri previsti, non nomi ──
  -- L'art. 2 rende prioritarie quarte e quinte, quindi i tre anni si contano
  -- separati: servono a capire la platea reale, non solo il totale.
  studenti_terza         int        not null default 0 check (studenti_terza  between 0 and 2000),
  studenti_quarta        int        not null default 0 check (studenti_quarta between 0 and 2000),
  studenti_quinta        int        not null default 0 check (studenti_quinta between 0 and 2000),
  studenti_totale        int        generated always as
                           (studenti_terza + studenti_quarta + studenti_quinta) stored,
  classi_coinvolte       text,
  evento_studenti_stimati int       check (evento_studenti_stimati between 0 and 2000),
  evento_docenti_stimati  int       check (evento_docenti_stimati  between 0 and 2000),
  note                   text,

  -- ── Impegni dell'art. 4, uno per spunta ──
  impegno_referente      boolean    not null default false,
  impegno_promozione     boolean    not null default false,
  impegno_evento         boolean    not null default false,
  impegno_consensi       boolean    not null default false,

  -- ── Dichiarazioni e consensi, con timestamp e testo congelato ──
  dichiarazione_poteri   boolean    not null default false,
  accetta_bando          boolean    not null default false,
  consenso_privacy       boolean    not null default false,
  consenso_privacy_ts    timestamptz,
  consenso_marketing     boolean    not null default false,
  consenso_marketing_ts  timestamptz,
  consenso_marketing_testo text,
  -- Il testo esatto accettato al momento dell'invio: se un domani cambiamo
  -- le formule, resta agli atti quella che il referente ha letto.
  dichiarazioni_testo    jsonb,

  -- ── Istruttoria ──
  -- Un'adesione non e attiva finche lo staff non la conferma. Il modulo e
  -- pubblico, il codice meccanografico e un dato pubblicamente reperibile e
  -- nel sito non c'e rate limiting: la conferma manuale e la vera difesa.
  stato                  text       not null default 'ricevuta' check (stato in (
                           'ricevuta', 'confermata', 'attiva', 'ritirata'
                         )),
  note_staff             text,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  -- Un istituto, un'adesione. La chiave non e l'email del referente: due
  -- docenti della stessa scuola devono collidere, non creare due adesioni.
  constraint licei_adesioni_meccanografico_unique unique (codice_meccanografico)
);

create index if not exists licei_adesioni_user_id_idx  on public.licei_adesioni (user_id);
create index if not exists licei_adesioni_stato_idx    on public.licei_adesioni (stato);
create index if not exists licei_adesioni_referente_idx on public.licei_adesioni (lower(referente_email));

create or replace function public.licei_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_licei_touch_updated_at on public.licei_adesioni;
create trigger trg_licei_touch_updated_at
  before update on public.licei_adesioni
  for each row execute function public.licei_touch_updated_at();

-- ── 2. Configurazione del percorso ─────────────────────────────────────
-- Chiave/valore, modificabile dal pannello staff. Serve perche i termini del
-- bando arrivano da un terzo (il referente del consorzio) con preavviso
-- ignoto: metterli nel codice significherebbe un deploy per ogni data.
create table if not exists public.licei_config (
  chiave        text        primary key,
  valore        text,
  aggiornato_at timestamptz not null default now(),
  aggiornato_by uuid        references auth.users (id) on delete set null
);

insert into public.licei_config (chiave, valore) values
  -- termini_non_comunicati e il default, ed e la verita: l'art. 10 li rimanda
  -- agli organizzatori. La pagina non promette una scadenza che non esiste.
  ('stato_adesioni',           'termini_non_comunicati'),
  ('scadenza_adesioni_label',  ''),
  ('avviso',                   '')
on conflict (chiave) do nothing;

-- ── 3. Row Level Security ──────────────────────────────────────────────
-- Le scritture passano dalle API con service role. RLS attiva e restrittiva:
-- nessuna policy di insert o update per anon e authenticated.
alter table public.licei_adesioni enable row level security;
alter table public.licei_config   enable row level security;

-- Il docente referente vede la propria adesione e il suo stato.
drop policy if exists "Referents can view own adesione" on public.licei_adesioni;
create policy "Referents can view own adesione"
  on public.licei_adesioni for select
  using (auth.uid() = user_id);

-- Lo staff vede tutte le adesioni.
drop policy if exists "Admins can view all adesioni" on public.licei_adesioni;
create policy "Admins can view all adesioni"
  on public.licei_adesioni for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.partnership_level = 'admin'
  ));

-- La configurazione e pubblicamente leggibile: contiene solo lo stato della
-- raccolta e le etichette che la pagina mostra comunque a tutti.
drop policy if exists "Licei config is public" on public.licei_config;
create policy "Licei config is public"
  on public.licei_config for select
  using (true);

-- ── 4. Riepilogo per il pannello ───────────────────────────────────────
create or replace function public.licei_stats()
returns table (
  stato            text,
  istituti         bigint,
  studenti         bigint,
  evento_studenti  bigint
)
language sql
stable
security definer set search_path = ''
as $$
  select
    a.stato,
    count(*)                                   as istituti,
    coalesce(sum(a.studenti_totale), 0)        as studenti,
    coalesce(sum(a.evento_studenti_stimati), 0) as evento_studenti
  from public.licei_adesioni a
  group by a.stato;
$$;

revoke all on function public.licei_stats() from anon, authenticated;

-- ── 5. Verifica ────────────────────────────────────────────────────────
-- select codice, istituto_denominazione, studenti_totale, stato from public.licei_adesioni;
-- select * from public.licei_config;
