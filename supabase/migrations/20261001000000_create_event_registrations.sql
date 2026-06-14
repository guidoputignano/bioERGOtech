-- =========================================================
-- Migration: Event module "Vivere piu a lungo: sport e IA"
--
-- Modulo isolato. Crea tre tabelle dedicate all'evento, collegate al
-- bacino contatti del Member Portal tramite event_registrations.user_id
-- (FK verso auth.users). Non modifica in modo distruttivo lo schema
-- esistente. Per archiviare l'evento basta la flag ARCHIVE_MODE nel
-- content.ts: i dati restano qui, intatti.
-- =========================================================

-- ── 1. Sessioni iscrivibili (le "avenue") ──────────────────────────────
create table if not exists public.event_sessions (
  id            uuid        primary key default gen_random_uuid(),
  slug          text        not null unique,
  titolo        text        not null,
  giorno        int         not null,
  data          date,
  luogo         text,
  orario        text,
  capienza_max  int         not null default 0 check (capienza_max >= 0),
  created_at    timestamptz not null default now()
);

-- Semina le tre sessioni. Le capienze rispecchiano content.ts.
insert into public.event_sessions (slug, titolo, giorno, data, luogo, orario, capienza_max)
values
  ('giorno-1-mattina',    'Giorno 1, mattina. Programma scientifico', 1, '2026-12-11', 'Iacovone, Taranto',          '9:00 . 13:00',  300),
  ('giorno-1-pomeriggio', 'Giorno 1, pomeriggio. I progetti dei ragazzi', 1, '2026-12-11', 'Iacovone, Taranto',     '14:30 . 18:00', 200),
  ('giorno-2',            'Giorno 2. Startup, pitch e networking', 2, '2026-12-12', 'Camera di Commercio, Taranto',  '9:30 . 13:30',  150)
on conflict (slug) do nothing;

-- ── 2. Iscrizioni ──────────────────────────────────────────────────────
create table if not exists public.event_registrations (
  id                       uuid        primary key default gen_random_uuid(),
  user_id                  uuid        references auth.users (id) on delete set null,
  nome                     text        not null,
  cognome                  text        not null,
  email                    text        not null,
  telefono                 text,
  categoria                text        not null check (categoria in (
                             'studente', 'scuola_docente', 'autorita',
                             'startup', 'investitore_partner', 'pubblico'
                           )),
  organizzazione           text,
  classe                   text,
  startup_name             text,
  startup_url              text,
  startup_desc             text,
  referente                text,
  note                     text,
  consenso_privacy         boolean     not null default false,
  consenso_privacy_ts      timestamptz,
  consenso_marketing       boolean     not null default false,
  consenso_marketing_ts    timestamptz,
  consenso_marketing_testo text,
  codice_univoco           text        not null unique,
  created_at               timestamptz not null default now()
);

-- Una sola iscrizione per email (case-insensitive). Le sessioni multiple
-- vivono nella tabella ponte.
create unique index if not exists event_registrations_email_unique
  on public.event_registrations (lower(email));

create index if not exists event_registrations_user_id_idx
  on public.event_registrations (user_id);

-- ── 3. Tabella ponte: sessioni scelte + presenza per sessione ──────────
create table if not exists public.event_registration_sessions (
  id              uuid        primary key default gen_random_uuid(),
  registration_id uuid        not null references public.event_registrations (id) on delete cascade,
  session_id      uuid        not null references public.event_sessions (id) on delete cascade,
  -- Conferma vs lista d'attesa. La capienza conta solo le righe confermate.
  is_waitlist     boolean     not null default false,
  -- Presenza in loco, per sessione (una persona puo venire un giorno e non l'altro).
  stato_checkin   text        not null default 'registrato' check (stato_checkin in (
                    'registrato', 'presente', 'assente'
                  )),
  checkin_ts      timestamptz,
  created_at      timestamptz not null default now(),
  unique (registration_id, session_id)
);

create index if not exists event_reg_sessions_session_idx
  on public.event_registration_sessions (session_id);

-- ── 4. Row Level Security ──────────────────────────────────────────────
-- Le scritture pubbliche passano dalla RPC SECURITY DEFINER e dalle API
-- con service role (che bypassa la RLS). Teniamo RLS attiva e restrittiva.
alter table public.event_sessions enable row level security;
alter table public.event_registrations enable row level security;
alter table public.event_registration_sessions enable row level security;

-- Le sessioni (con capienza) sono pubblicamente leggibili per il contatore posti.
drop policy if exists "Event sessions are public" on public.event_sessions;
create policy "Event sessions are public"
  on public.event_sessions for select
  using (true);

-- Un iscritto loggato puo vedere la propria iscrizione.
drop policy if exists "Users can view own registration" on public.event_registrations;
create policy "Users can view own registration"
  on public.event_registrations for select
  using (auth.uid() = user_id);

-- Gli admin possono vedere tutte le iscrizioni.
drop policy if exists "Admins can view all registrations" on public.event_registrations;
create policy "Admins can view all registrations"
  on public.event_registrations for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.partnership_level = 'admin'
  ));

-- ── 5. Contatore posti rimanenti per sessione ──────────────────────────
create or replace function public.event_seats_remaining()
returns table (slug text, capienza_max int, confermati bigint, rimanenti int)
language sql
stable
security definer set search_path = ''
as $$
  select
    s.slug,
    s.capienza_max,
    count(rs.id) filter (where rs.is_waitlist = false) as confermati,
    greatest(s.capienza_max - count(rs.id) filter (where rs.is_waitlist = false), 0)::int as rimanenti
  from public.event_sessions s
  left join public.event_registration_sessions rs on rs.session_id = s.id
  group by s.id, s.slug, s.capienza_max;
$$;

grant execute on function public.event_seats_remaining() to anon, authenticated;

-- ── 6. Registrazione atomica con controllo capienza ────────────────────
-- Inserisce (o aggiorna) l'iscrizione e collega le sessioni in un'unica
-- transazione. Blocca le righe sessione (for update) per evitare che due
-- iscrizioni simultanee sforino la capienza. Le sessioni piene finiscono
-- in lista d'attesa anziche essere rifiutate.
create or replace function public.event_register(
  p_user_id        uuid,
  p_nome           text,
  p_cognome        text,
  p_email          text,
  p_telefono       text,
  p_categoria      text,
  p_organizzazione text,
  p_classe         text,
  p_startup_name   text,
  p_startup_url    text,
  p_startup_desc   text,
  p_referente      text,
  p_note           text,
  p_marketing      boolean,
  p_marketing_testo text,
  p_codice         text,
  p_session_slugs  text[]
)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  v_reg_id     uuid;
  v_codice     text;
  v_now        timestamptz := now();
  v_slug       text;
  v_session_id uuid;
  v_cap        int;
  v_taken      int;
  v_waitlist   boolean;
  v_results    jsonb := '[]'::jsonb;
begin
  -- Iscrizione: crea o aggiorna in base all'email (case-insensitive).
  insert into public.event_registrations (
    user_id, nome, cognome, email, telefono, categoria, organizzazione,
    classe, startup_name, startup_url, startup_desc, referente, note,
    consenso_privacy, consenso_privacy_ts,
    consenso_marketing, consenso_marketing_ts, consenso_marketing_testo,
    codice_univoco
  ) values (
    p_user_id, p_nome, p_cognome, lower(trim(p_email)), p_telefono, p_categoria,
    p_organizzazione, p_classe, p_startup_name, p_startup_url, p_startup_desc,
    p_referente, p_note,
    true, v_now,
    coalesce(p_marketing, false),
    case when p_marketing then v_now else null end,
    case when p_marketing then p_marketing_testo else null end,
    p_codice
  )
  on conflict (lower(email)) do update set
    user_id               = coalesce(public.event_registrations.user_id, excluded.user_id),
    nome                  = excluded.nome,
    cognome               = excluded.cognome,
    telefono              = excluded.telefono,
    categoria             = excluded.categoria,
    organizzazione        = excluded.organizzazione,
    classe                = excluded.classe,
    startup_name          = excluded.startup_name,
    startup_url           = excluded.startup_url,
    startup_desc          = excluded.startup_desc,
    referente             = excluded.referente,
    note                  = excluded.note,
    -- Il consenso marketing puo solo essere concesso, mai revocato da una nuova iscrizione.
    consenso_marketing    = public.event_registrations.consenso_marketing or excluded.consenso_marketing,
    consenso_marketing_ts = coalesce(public.event_registrations.consenso_marketing_ts, excluded.consenso_marketing_ts),
    consenso_marketing_testo = coalesce(public.event_registrations.consenso_marketing_testo, excluded.consenso_marketing_testo)
  returning id, codice_univoco into v_reg_id, v_codice;

  -- Sessioni scelte: per ognuna, blocca la riga e controlla la capienza.
  foreach v_slug in array p_session_slugs loop
    select id, capienza_max into v_session_id, v_cap
      from public.event_sessions
      where slug = v_slug
      for update;

    if v_session_id is null then
      continue;
    end if;

    -- Se l'iscritto e gia su questa sessione, riportiamo lo stato esistente.
    if exists (
      select 1 from public.event_registration_sessions
      where registration_id = v_reg_id and session_id = v_session_id
    ) then
      select is_waitlist into v_waitlist
        from public.event_registration_sessions
        where registration_id = v_reg_id and session_id = v_session_id;
      v_results := v_results || jsonb_build_object(
        'slug', v_slug,
        'status', case when v_waitlist then 'lista_attesa' else 'confermato' end
      );
      continue;
    end if;

    select count(*) into v_taken
      from public.event_registration_sessions
      where session_id = v_session_id and is_waitlist = false;

    v_waitlist := v_taken >= v_cap;

    insert into public.event_registration_sessions (registration_id, session_id, is_waitlist)
    values (v_reg_id, v_session_id, v_waitlist);

    v_results := v_results || jsonb_build_object(
      'slug', v_slug,
      'status', case when v_waitlist then 'lista_attesa' else 'confermato' end
    );
  end loop;

  return jsonb_build_object(
    'registration_id', v_reg_id,
    'codice', v_codice,
    'sessions', v_results
  );
end;
$$;

-- La RPC e invocata solo dalle API con service role.
revoke all on function public.event_register(
  uuid, text, text, text, text, text, text, text, text, text, text, text,
  text, boolean, text, text, text[]
) from anon, authenticated;
