-- =========================================================
-- Evento "Vivere più a lungo": le prenotazioni per classe
--
-- CHE COSA FA (in una transazione: o tutto, o niente)
--   1. La nuova capienza: 3500 posti il 10 dicembre (PalaMazzola), 400
--      l'11 dicembre (Teatro Fusco). Chi era in lista d'attesa e ora ci
--      sta viene confermato, in ordine di iscrizione.
--   2. Una quota per le scuole, giornata per giornata (quota_gruppi): i
--      posti che le classi possono occupare, così ne resta una parte per
--      il pubblico. Si cambia dal pannello. Null vuol dire: nessun limite
--      oltre la capienza.
--   3. Le prenotazioni di gruppo: una classe, un docente, un codice
--      (VPC-XXXXXXXX) e un QR per tutta la classe. Nessun dato degli
--      studenti: solo quanti sono. Fino a 40 persone, docenti compresi.
--   4. Il conteggio dei posti tiene conto anche delle classi, ovunque:
--      nell'iscrizione delle singole persone (event_register), nei posti
--      liberi mostrati sul sito (event_seats_remaining) e nelle nuove
--      funzioni delle classi.
--
-- Una classe non si divide mai: per ogni giornata è tutta confermata o
-- tutta in lista d'attesa. Se una classe libera posti, la prima classe in
-- attesa che ci sta viene confermata (in ordine di prenotazione).
--
-- COME SI USA
--   Editor SQL di Supabase, progetto di produzione: incollare il file intero
--   ed eseguire, PRIMA del merge del codice che lo usa. Si può rieseguire:
--   ogni passo controlla quello che c'è già (la capienza si alza fino a 3500
--   e 400, mai si abbassa; la quota delle scuole non si tocca se è già
--   stata decisa). In fondo, la query di controllo.
-- =========================================================

begin;

-- ── 1. La nuova capienza ───────────────────────────────────────────────
update public.event_sessions set capienza_max = 3500 where slug = 'giorno-1' and capienza_max < 3500;
update public.event_sessions set capienza_max = 400  where slug = 'giorno-2' and capienza_max < 400;

-- ── 2. La quota per le scuole ──────────────────────────────────────────
alter table public.event_sessions
  add column if not exists quota_gruppi int check (quota_gruppi is null or quota_gruppi >= 0);

comment on column public.event_sessions.quota_gruppi is
  'Posti che le prenotazioni di classe possono occupare in questa giornata. Null: nessun limite oltre la capienza.';

-- Valori di partenza: 500 posti per il pubblico il 10, 100 l'11. Solo se
-- la quota non è ancora stata decisa (dal pannello o da un'esecuzione
-- precedente di questo file).
update public.event_sessions set quota_gruppi = 3000 where slug = 'giorno-1' and quota_gruppi is null;
update public.event_sessions set quota_gruppi = 300  where slug = 'giorno-2' and quota_gruppi is null;

-- ── 3. Le prenotazioni di gruppo ───────────────────────────────────────
create table if not exists public.event_group_bookings (
  id                     uuid        primary key default gen_random_uuid(),
  -- Il codice della classe: lo stesso formato del biglietto, con C al posto di L.
  codice                 text        not null unique check (codice ~ '^VPC-[A-Z0-9]{8}$'),

  istituto               text        not null check (char_length(istituto) between 2 and 200),
  comune                 text                 check (comune is null or char_length(comune) <= 100),
  classe                 text        not null check (char_length(classe) between 1 and 60),

  -- Il docente che prenota e accompagna la classe.
  docente_nome           text        not null check (char_length(docente_nome) between 1 and 80),
  docente_cognome        text        not null check (char_length(docente_cognome) between 1 and 80),
  docente_email          text        not null check (char_length(docente_email) between 3 and 254),
  docente_telefono       text        not null check (char_length(docente_telefono) between 5 and 40),

  -- Solo i numeri, nessun dato degli studenti.
  studenti               int         not null check (studenti between 1 and 40),
  -- I docenti che accompagnano la classe, compreso chi prenota.
  accompagnatori         int         not null default 1 check (accompagnatori between 1 and 10),
  posti                  int         generated always as (studenti + accompagnatori) stored,

  note                   text                 check (note is null or char_length(note) <= 1000),
  -- L'adesione al percorso dei licei, se la scuola ne fa parte.
  licei_adesione_id      uuid        references public.licei_adesioni (id) on delete set null,

  consenso_privacy_ts    timestamptz not null default now(),
  consenso_privacy_testo text,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  constraint event_group_bookings_max_40 check (studenti + accompagnatori <= 40)
);

-- Una classe di una scuola, prenotata da un docente, è una sola
-- prenotazione: un secondo invio aggiunge giornate, non crea un doppione.
create unique index if not exists event_group_bookings_classe_unique
  on public.event_group_bookings (lower(docente_email), lower(istituto), lower(classe));

create index if not exists event_group_bookings_email_idx
  on public.event_group_bookings (lower(docente_email));

-- Le giornate di una prenotazione: confermata o in lista d'attesa, il
-- settore (lo scrive lo staff) e gli ingressi alla porta.
create table if not exists public.event_group_booking_sessions (
  id           uuid        primary key default gen_random_uuid(),
  booking_id   uuid        not null references public.event_group_bookings (id) on delete cascade,
  session_id   uuid        not null references public.event_sessions (id) on delete cascade,
  is_waitlist  boolean     not null default false,
  -- Dove si siede la classe, se lo staff lo decide ("Tribuna B").
  settore      text                 check (settore is null or char_length(settore) <= 80),
  -- Quante persone della classe sono entrate (registrato alla porta).
  presenti     int                  check (presenti is null or presenti between 0 and 60),
  checkin_ts   timestamptz,
  created_at   timestamptz not null default now(),
  unique (booking_id, session_id)
);

create index if not exists event_group_booking_sessions_session_idx
  on public.event_group_booking_sessions (session_id);

-- Solo le rotte del sito, con la service role: nessuna policy per anon e
-- authenticated, quindi nessun accesso diretto.
alter table public.event_group_bookings enable row level security;
alter table public.event_group_booking_sessions enable row level security;

-- ── 4. I posti occupati: persone singole più classi ────────────────────
-- Confermati di una giornata: le iscrizioni singole confermate più i posti
-- delle classi confermate. È la regola unica per la capienza.
create or replace function public.event_posti_occupati(p_session_id uuid)
returns table (persone int, posti_classi int)
language sql
stable
security definer set search_path = ''
as $$
  with singoli as (
    select count(*)::int as n
    from public.event_registration_sessions
    where session_id = p_session_id and is_waitlist = false
  ),
  classi as (
    select coalesce(sum(b.posti), 0)::int as n
    from public.event_group_booking_sessions gs
    join public.event_group_bookings b on b.id = gs.booking_id
    where gs.session_id = p_session_id and gs.is_waitlist = false
  )
  select singoli.n + classi.n, classi.n from singoli, classi;
$$;

revoke all on function public.event_posti_occupati(uuid) from public, anon, authenticated;
grant execute on function public.event_posti_occupati(uuid) to service_role;

-- I posti liberi mostrati sul sito: stesse colonne di prima, ma
-- "confermati" conta anche i posti delle classi.
create or replace function public.event_seats_remaining()
returns table (slug text, capienza_max int, confermati bigint, rimanenti int)
language sql
stable
security definer set search_path = ''
as $$
  select
    s.slug,
    s.capienza_max,
    (coalesce(i.n, 0) + coalesce(g.n, 0))::bigint as confermati,
    greatest(s.capienza_max - coalesce(i.n, 0) - coalesce(g.n, 0), 0)::int as rimanenti
  from public.event_sessions s
  left join (
    select session_id, count(*)::int as n
    from public.event_registration_sessions
    where is_waitlist = false
    group by session_id
  ) i on i.session_id = s.id
  left join (
    select gs.session_id, sum(b.posti)::int as n
    from public.event_group_booking_sessions gs
    join public.event_group_bookings b on b.id = gs.booking_id
    where gs.is_waitlist = false
    group by gs.session_id
  ) g on g.session_id = s.id;
$$;

grant execute on function public.event_seats_remaining() to anon, authenticated;

-- I posti per le classi, per il modulo delle scuole (solo numeri aggregati).
create or replace function public.event_group_seats()
returns table (slug text, capienza_max int, quota_gruppi int, posti_classi int, classi_confermate int,
               classi_in_attesa int, rimanenti int, rimanenti_classi int)
language sql
stable
security definer set search_path = ''
as $$
  select
    s.slug,
    s.capienza_max,
    s.quota_gruppi,
    coalesce(g.posti, 0)::int,
    coalesce(g.confermate, 0)::int,
    coalesce(g.in_attesa, 0)::int,
    greatest(s.capienza_max - coalesce(i.n, 0) - coalesce(g.posti, 0), 0)::int,
    greatest(
      least(
        s.capienza_max - coalesce(i.n, 0) - coalesce(g.posti, 0),
        coalesce(s.quota_gruppi - coalesce(g.posti, 0), s.capienza_max)
      ),
      0
    )::int
  from public.event_sessions s
  left join (
    select session_id, count(*)::int as n
    from public.event_registration_sessions
    where is_waitlist = false
    group by session_id
  ) i on i.session_id = s.id
  left join (
    select gs.session_id,
           sum(b.posti) filter (where gs.is_waitlist = false)::int as posti,
           count(*) filter (where gs.is_waitlist = false)::int as confermate,
           count(*) filter (where gs.is_waitlist = true)::int as in_attesa
    from public.event_group_booking_sessions gs
    join public.event_group_bookings b on b.id = gs.booking_id
    group by gs.session_id
  ) g on g.session_id = s.id;
$$;

grant execute on function public.event_group_seats() to anon, authenticated;

-- ── 5. L'iscrizione delle singole persone conta anche le classi ────────
-- Identica a prima (stessa firma, stessi permessi), con due differenze: i
-- posti occupati includono le classi, e le giornate si bloccano in ordine
-- alfabetico, come fanno le funzioni delle classi, così due transazioni non
-- si aspettano a vicenda.
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

  -- Sessioni scelte, in ordine: per ognuna, blocca la riga e controlla la capienza.
  foreach v_slug in array coalesce(
    (select array_agg(distinct x order by x) from unnest(p_session_slugs) as x), '{}'::text[]
  ) loop
    v_session_id := null;
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

    select o.persone into v_taken from public.event_posti_occupati(v_session_id) o;

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

-- ── 6. La prenotazione di una classe ───────────────────────────────────
-- Crea la prenotazione, o ritrova quella della stessa classe (stesso
-- docente, scuola e classe), e aggiunge le giornate scelte. Per ogni
-- giornata la classe è confermata solo se ci sta tutta, nella capienza e
-- nella quota delle scuole; altrimenti è tutta in lista d'attesa.
--
-- Una prenotazione che c'è già non cambia i suoi dati da qui: i numeri si
-- cambiano con event_group_update_numbers, dalla pagina della classe.
--
-- Una giornata che non esiste fa fallire tutto (nessuna scelta persa in
-- silenzio, come è successo a novembre con le iscrizioni singole).
create or replace function public.event_group_book(
  p_istituto         text,
  p_comune           text,
  p_classe           text,
  p_docente_nome     text,
  p_docente_cognome  text,
  p_docente_email    text,
  p_docente_telefono text,
  p_studenti         int,
  p_accompagnatori   int,
  p_note             text,
  p_licei_adesione_id uuid,
  p_privacy_testo    text,
  p_codice           text,
  p_session_slugs    text[]
)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  v_id         uuid;
  v_codice     text;
  v_posti      int;
  v_nuova      boolean;
  v_slug       text;
  v_session_id uuid;
  v_cap        int;
  v_quota      int;
  v_occupati   int;
  v_classi     int;
  v_waitlist   boolean;
  v_results    jsonb := '[]'::jsonb;
begin
  if coalesce(array_length(p_session_slugs, 1), 0) = 0 then
    raise exception 'event_group_book: nessuna giornata scelta';
  end if;

  insert into public.event_group_bookings (
    codice, istituto, comune, classe,
    docente_nome, docente_cognome, docente_email, docente_telefono,
    studenti, accompagnatori, note, licei_adesione_id,
    consenso_privacy_ts, consenso_privacy_testo
  ) values (
    p_codice, trim(p_istituto), nullif(trim(coalesce(p_comune, '')), ''), trim(p_classe),
    trim(p_docente_nome), trim(p_docente_cognome), lower(trim(p_docente_email)), trim(p_docente_telefono),
    p_studenti, p_accompagnatori, nullif(trim(coalesce(p_note, '')), ''), p_licei_adesione_id,
    now(), p_privacy_testo
  )
  on conflict (lower(docente_email), lower(istituto), lower(classe)) do update
    set updated_at = now()
  returning id, codice, posti, (xmax = 0) into v_id, v_codice, v_posti, v_nuova;

  foreach v_slug in array (
    select array_agg(distinct x order by x) from unnest(p_session_slugs) as x
  ) loop
    v_session_id := null;
    select id, capienza_max, quota_gruppi into v_session_id, v_cap, v_quota
      from public.event_sessions
      where slug = v_slug
      for update;

    if v_session_id is null then
      raise exception 'event_group_book: giornata sconosciuta %', v_slug;
    end if;

    if exists (
      select 1 from public.event_group_booking_sessions
      where booking_id = v_id and session_id = v_session_id
    ) then
      select is_waitlist into v_waitlist
        from public.event_group_booking_sessions
        where booking_id = v_id and session_id = v_session_id;
      v_results := v_results || jsonb_build_object(
        'slug', v_slug,
        'status', case when v_waitlist then 'lista_attesa' else 'confermato' end,
        'nuova', false
      );
      continue;
    end if;

    select o.persone, o.posti_classi into v_occupati, v_classi
      from public.event_posti_occupati(v_session_id) o;

    v_waitlist := v_occupati + v_posti > v_cap
               or (v_quota is not null and v_classi + v_posti > v_quota);

    insert into public.event_group_booking_sessions (booking_id, session_id, is_waitlist)
    values (v_id, v_session_id, v_waitlist);

    v_results := v_results || jsonb_build_object(
      'slug', v_slug,
      'status', case when v_waitlist then 'lista_attesa' else 'confermato' end,
      'nuova', true
    );
  end loop;

  return jsonb_build_object(
    'booking_id', v_id,
    'codice', v_codice,
    'nuova', v_nuova,
    'sessions', v_results
  );
end;
$$;

-- ── 7. Cambiare il numero di persone di una classe ─────────────────────
-- Meno persone: sempre possibile. Più persone: per ogni giornata
-- confermata ci devono stare, nella capienza e nella quota; se in una non
-- ci stanno, non cambia niente e si dice quale. Le giornate in lista
-- d'attesa non contano: lì la classe aspetta con il numero nuovo.
-- p_salta: le giornate da non controllare, perché già iniziate (il
-- database non conosce gli orari, la rotta sì). La sera del 10 dicembre una
-- classe può così crescere per l'11 anche se il 10 era pieno.
-- Torna { ok, giornata?, posti_prima, posti_dopo }.
-- La prima versione di questo file aveva tre parametri: si toglie, così
-- resta una funzione sola.
drop function if exists public.event_group_update_numbers(uuid, int, int);
create or replace function public.event_group_update_numbers(
  p_booking_id     uuid,
  p_studenti       int,
  p_accompagnatori int,
  p_salta          text[] default '{}'
)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  v_prima      int;
  v_dopo       int := p_studenti + p_accompagnatori;
  r            record;
  v_occupati   int;
  v_classi     int;
begin
  select posti into v_prima from public.event_group_bookings where id = p_booking_id for update;
  if v_prima is null then
    return jsonb_build_object('ok', false, 'motivo', 'non_trovata');
  end if;

  if v_dopo > v_prima then
    for r in
      select s.id, s.slug, s.capienza_max, s.quota_gruppi
      from public.event_group_booking_sessions gs
      join public.event_sessions s on s.id = gs.session_id
      where gs.booking_id = p_booking_id and gs.is_waitlist = false
        and not (s.slug = any (coalesce(p_salta, '{}')))
      order by s.slug
      for update of s
    loop
      select o.persone, o.posti_classi into v_occupati, v_classi
        from public.event_posti_occupati(r.id) o;
      if v_occupati - v_prima + v_dopo > r.capienza_max
         or (r.quota_gruppi is not null and v_classi - v_prima + v_dopo > r.quota_gruppi) then
        return jsonb_build_object('ok', false, 'motivo', 'posti', 'giornata', r.slug,
                                  'posti_prima', v_prima, 'posti_dopo', v_dopo);
      end if;
    end loop;
  end if;

  -- I check della tabella (1 a 40 studenti, 1 a 10 docenti, 40 in tutto)
  -- fanno fallire l'update con numeri non validi.
  update public.event_group_bookings
    set studenti = p_studenti, accompagnatori = p_accompagnatori, updated_at = now()
    where id = p_booking_id;

  return jsonb_build_object('ok', true, 'posti_prima', v_prima, 'posti_dopo', v_dopo);
end;
$$;

-- ── 7b. Cancellare una prenotazione rimasta senza giornate ─────────────
-- Solo se non ha più giornate, controllato dopo aver bloccato la riga: una
-- giornata aggiunta nello stesso istante da un'altra scheda (event_group_book
-- blocca la stessa riga) non si perde con la cancellazione a cascata.
-- Torna true se la prenotazione è stata cancellata.
create or replace function public.event_group_delete_if_empty(p_booking_id uuid)
returns boolean
language plpgsql
security definer set search_path = ''
as $$
begin
  perform 1 from public.event_group_bookings where id = p_booking_id for update;
  if not found then
    return false;
  end if;
  if exists (select 1 from public.event_group_booking_sessions where booking_id = p_booking_id) then
    return false;
  end if;
  delete from public.event_group_bookings where id = p_booking_id;
  return found;
end;
$$;

-- ── 8. Le classi in attesa, quando si liberano posti ───────────────────
-- Conferma le classi in lista d'attesa per una giornata, in ordine di
-- prenotazione, saltando quelle che non ci stanno (una classe grande non
-- blocca una piccola che ci sta). Torna gli id delle prenotazioni
-- confermate, per mandare loro l'email.
create or replace function public.event_group_promote(p_session_id uuid)
returns setof uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  v_cap      int;
  v_quota    int;
  v_occupati int;
  v_classi   int;
  r          record;
begin
  select capienza_max, quota_gruppi into v_cap, v_quota
    from public.event_sessions where id = p_session_id for update;
  if v_cap is null then
    return;
  end if;

  select o.persone, o.posti_classi into v_occupati, v_classi
    from public.event_posti_occupati(p_session_id) o;

  for r in
    select gs.id as gs_id, gs.booking_id, b.posti
    from public.event_group_booking_sessions gs
    join public.event_group_bookings b on b.id = gs.booking_id
    where gs.session_id = p_session_id and gs.is_waitlist = true
    order by gs.created_at, b.created_at, gs.id
  loop
    if v_occupati + r.posti <= v_cap
       and (v_quota is null or v_classi + r.posti <= v_quota) then
      update public.event_group_booking_sessions set is_waitlist = false
        where id = r.gs_id and is_waitlist = true;
      if found then
        v_occupati := v_occupati + r.posti;
        v_classi := v_classi + r.posti;
        return next r.booking_id;
      end if;
    end if;
  end loop;
end;
$$;

-- Le funzioni delle classi le chiamano solo le rotte del sito (service role).
revoke all on function public.event_group_book(text, text, text, text, text, text, text, int, int, text, uuid, text, text, text[])
  from public, anon, authenticated;
grant execute on function public.event_group_book(text, text, text, text, text, text, text, int, int, text, uuid, text, text, text[])
  to service_role;
-- event_register era già riservata (20261212000000_revoca_execute_public.sql);
-- "create or replace" tiene i permessi, ma la revoca si ripete qui perché
-- questo file non dipenda da quello.
revoke all on function public.event_register(
  uuid, text, text, text, text, text, text, text, text, text, text, text,
  text, boolean, text, text, text[]
) from public, anon, authenticated;
grant execute on function public.event_register(
  uuid, text, text, text, text, text, text, text, text, text, text, text,
  text, boolean, text, text, text[]
) to service_role;
revoke all on function public.event_group_update_numbers(uuid, int, int, text[]) from public, anon, authenticated;
grant execute on function public.event_group_update_numbers(uuid, int, int, text[]) to service_role;
revoke all on function public.event_group_delete_if_empty(uuid) from public, anon, authenticated;
grant execute on function public.event_group_delete_if_empty(uuid) to service_role;
revoke all on function public.event_group_promote(uuid) from public, anon, authenticated;
grant execute on function public.event_group_promote(uuid) to service_role;

-- ── 9. Con la capienza nuova, chi era in lista d'attesa ora ci sta ─────
-- In ordine di iscrizione, finché ci sono posti. Le classi ancora non ci
-- sono, quindi contano solo le iscrizioni singole.
with sessioni as (
  select s.id, s.capienza_max, (select o.persone from public.event_posti_occupati(s.id) o) as occupati
  from public.event_sessions s
),
in_attesa as (
  select ers.id, ers.session_id,
         row_number() over (partition by ers.session_id order by ers.created_at, r.created_at, ers.id) as posizione
  from public.event_registration_sessions ers
  join public.event_registrations r on r.id = ers.registration_id
  where ers.is_waitlist = true
)
update public.event_registration_sessions ers
  set is_waitlist = false
  from in_attesa a
  join sessioni s on s.id = a.session_id
  where ers.id = a.id
    and s.occupati + a.posizione <= s.capienza_max;

commit;

-- ── Controllo (solo lettura) ───────────────────────────────────────────
-- Atteso: giorno-1 con capienza 3500 e quota 3000, giorno-2 con capienza
-- 400 e quota 300; le classi a zero finché nessuno prenota.
select slug, capienza_max, quota_gruppi, posti_classi, classi_confermate, classi_in_attesa,
       rimanenti, rimanenti_classi
from public.event_group_seats()
order by slug;
