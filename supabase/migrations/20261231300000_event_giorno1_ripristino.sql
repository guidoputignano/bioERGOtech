-- =========================================================
-- Evento "Vivere più a lungo": la giornata del 10 dicembre nel database
--
-- IL PROBLEMA (trovato il 18 novembre 2026)
-- In produzione non sono mai state eseguite le due migrazioni di dati
-- 20261101000000_update_event_sessions.sql e
-- 20261201000000_update_event_sessions_palamazzola.sql. La tabella
-- event_sessions ha ancora le sessioni del primo seed ('giorno-1-mattina',
-- 'giorno-1-pomeriggio', 'giorno-2'), mentre il sito manda 'giorno-1'.
-- La RPC event_register salta in silenzio uno slug che non trova, quindi
-- chi ha scelto il 10 dicembre ha ricevuto "Iscrizione confermata" ma non
-- ha la riga della giornata: il pannello mostra il Giorno 1 a zero, il
-- biglietto non elenca la giornata e il check-in non lo trova.
--
-- CHE COSA FA (in una transazione: o tutto, o niente)
--   1. Le sessioni come le vuole il sito: le due migrazioni mancanti, nello
--      stesso ordine e con lo stesso testo. Sono idempotenti: rieseguirle non
--      cambia niente.
--   2. Il recupero del 10 dicembre. Il modulo accetta solo 'giorno-1' e
--      'giorno-2' e ne vuole almeno uno (lib/eventi/registration.ts), quindi
--      un'iscrizione senza nessuna giornata ha scelto per forza il 10: le si
--      assegna il Giorno 1, in ordine di iscrizione, in lista d'attesa solo
--      oltre la capienza. Chi ha già l'11 potrebbe aver scelto anche il 10, e
--      da qui non si può sapere: per loro serve un'email (vedi il pannello).
--   3. Nient'altro: non tocca iscrizioni, consensi, codici, presenze.
--
-- COME SI USA
--   Editor SQL di Supabase, progetto di produzione: incollare il file intero
--   ed eseguire. Poi la query di controllo in fondo (o VERIFICA.sql).
--   Si può rieseguire: la seconda volta non trova niente da fare.
-- =========================================================

begin;

-- ── 1a. 20261101000000: la sessione unica del giorno 1 ─────────────────
do $$
declare
  v_morning   uuid;
  v_afternoon uuid;
begin
  select id into v_morning   from public.event_sessions where slug = 'giorno-1-mattina';
  select id into v_afternoon from public.event_sessions where slug = 'giorno-1-pomeriggio';
  if v_morning is not null and v_afternoon is not null then
    update public.event_registration_sessions ers
      set session_id = v_morning
      where ers.session_id = v_afternoon
        and not exists (
          select 1 from public.event_registration_sessions x
          where x.registration_id = ers.registration_id
            and x.session_id = v_morning
        );
    delete from public.event_registration_sessions where session_id = v_afternoon;
    delete from public.event_sessions where id = v_afternoon;
  end if;
end $$;

update public.event_sessions
  set slug         = 'giorno-1',
      titolo       = 'Giorno 1. Ospiti e progetti dei ragazzi',
      orario       = '9:00 . 18:00',
      luogo        = 'Iacovone, Taranto',
      capienza_max = 300
  where slug = 'giorno-1-mattina'
    and not exists (select 1 from public.event_sessions where slug = 'giorno-1');

-- ── 1b. 20261201000000: PalaMazzola il 10, Teatro Fusco l'11 ───────────
update public.event_sessions
  set titolo = 'Giorno 1. Panel, progetti dei ragazzi e concerto',
      data   = '2026-12-10',
      luogo  = 'PalaMazzola, Taranto',
      orario = '9:00 . 16:00'
  where slug = 'giorno-1';

update public.event_sessions
  set titolo = 'Giorno 2. Showcase di innovazione e premiazione',
      data   = '2026-12-11',
      luogo  = 'Teatro Fusco, Taranto',
      orario = '9:00 . 13:00'
  where slug = 'giorno-2';

insert into public.event_sessions (slug, titolo, giorno, data, luogo, orario, capienza_max)
values
  ('giorno-1', 'Giorno 1. Panel, progetti dei ragazzi e concerto', 1, '2026-12-10', 'PalaMazzola, Taranto', '9:00 . 16:00', 300),
  ('giorno-2', 'Giorno 2. Showcase di innovazione e premiazione',   2, '2026-12-11', 'Teatro Fusco, Taranto', '9:00 . 13:00', 150)
on conflict (slug) do nothing;

-- ── 2. Il recupero: chi non ha nessuna giornata aveva scelto il 10 ────
with g1 as (
  select id, capienza_max from public.event_sessions where slug = 'giorno-1'
),
occupati as (
  select count(*)::int as n
  from public.event_registration_sessions ers
  join g1 on ers.session_id = g1.id
  where ers.is_waitlist = false
),
senza_giornata as (
  select r.id, row_number() over (order by r.created_at, r.id) as posizione
  from public.event_registrations r
  where not exists (
    select 1 from public.event_registration_sessions x where x.registration_id = r.id
  )
)
insert into public.event_registration_sessions (registration_id, session_id, is_waitlist)
select s.id, g1.id, (occupati.n + s.posizione) > g1.capienza_max
from senza_giornata s, g1, occupati
on conflict (registration_id, session_id) do nothing;

commit;

-- ── Controllo (solo lettura) ───────────────────────────────────────────
-- Atteso: due righe, giorno-1 (PalaMazzola, 2026-12-10, 300) e giorno-2
-- (Teatro Fusco, 2026-12-11, 150), con i loro iscritti; e zero iscrizioni
-- senza giornata.
select s.slug, s.data, s.luogo, s.capienza_max,
       count(ers.id) filter (where ers.is_waitlist = false) as confermati,
       count(ers.id) filter (where ers.is_waitlist = true)  as in_attesa
from public.event_sessions s
left join public.event_registration_sessions ers on ers.session_id = s.id
group by s.slug, s.data, s.luogo, s.capienza_max
order by s.slug;

select count(*) as iscrizioni_senza_giornata
from public.event_registrations r
where not exists (select 1 from public.event_registration_sessions x where x.registration_id = r.id);
