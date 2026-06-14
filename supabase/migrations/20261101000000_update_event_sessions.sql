-- =========================================================
-- Migration: riallinea le sessioni dell'evento "Vivere piu a lungo"
--
-- Cambio di programma:
--  - Giorno 1: una sola sessione allo stadio Iacovone (prima gli ospiti,
--    poi i progetti dei ragazzi), non piu divisa in mattina e pomeriggio.
--  - Giorno 2: si sposta dalla Camera di Commercio al Teatro Fusco e si
--    aggiunge il concerto dopo le startup.
--
-- Idempotente e sicura su un database gia popolato: le eventuali iscrizioni
-- alle vecchie sessioni del giorno 1 vengono conservate riusando la riga
-- della sessione "mattina" (le FK puntano a session_id, non allo slug).
-- =========================================================

do $$
declare
  v_morning   uuid;
  v_afternoon uuid;
begin
  select id into v_morning   from public.event_sessions where slug = 'giorno-1-mattina';
  select id into v_afternoon from public.event_sessions where slug = 'giorno-1-pomeriggio';

  if v_morning is not null and v_afternoon is not null then
    -- Sposta le iscrizioni del pomeriggio sulla sessione unica del giorno 1,
    -- saltando quelle gia presenti (vincolo unique registration+session).
    update public.event_registration_sessions ers
      set session_id = v_morning
      where ers.session_id = v_afternoon
        and not exists (
          select 1 from public.event_registration_sessions x
          where x.registration_id = ers.registration_id
            and x.session_id = v_morning
        );
    -- Rimuove i collegamenti duplicati rimasti e poi la sessione pomeriggio.
    delete from public.event_registration_sessions where session_id = v_afternoon;
    delete from public.event_sessions where id = v_afternoon;
  end if;
end $$;

-- Giorno 1: sessione unica a giornata intera allo stadio Iacovone.
update public.event_sessions
  set slug         = 'giorno-1',
      titolo       = 'Giorno 1. Ospiti e progetti dei ragazzi',
      orario       = '9:00 . 18:00',
      luogo        = 'Iacovone, Taranto',
      capienza_max = 300
  where slug = 'giorno-1-mattina';

-- Giorno 2: si sposta al Teatro Fusco, prima le startup e poi il concerto.
update public.event_sessions
  set titolo = 'Giorno 2. Startup e concerto',
      luogo  = 'Teatro Fusco, Taranto'
  where slug = 'giorno-2';

-- Database nuovi che non avessero seminato le vecchie sessioni del giorno 1:
-- garantisce comunque la presenza della sessione unica.
insert into public.event_sessions (slug, titolo, giorno, data, luogo, orario, capienza_max)
values ('giorno-1', 'Giorno 1. Ospiti e progetti dei ragazzi', 1, '2026-12-11', 'Iacovone, Taranto', '9:00 . 18:00', 300)
on conflict (slug) do nothing;
