-- =========================================================
-- Migration: riallinea le sessioni dell'evento "Vivere piu a lungo"
-- alla nuova organizzazione delle due giornate.
--
-- Cambio di programma (piano organizzativo aggiornato):
--  - Date: dal 11/12 e 12/12 al 10/12 e 11/12 dicembre 2026.
--  - Giorno 1: dallo stadio Iacovone al PalaMazzola. Sette panel su sport,
--    salute, robotica e IA alternati ai progetti dei ragazzi, poi il concerto.
--  - Giorno 2: resta al Teatro Fusco ma diventa uno showcase di innovazione
--    (startup, spin-off, centri di ricerca e progetti del territorio) con
--    premiazione a tre premi e concerto di chiusura.
--
-- Aggiorna solo le colonne di presentazione (titolo, data, luogo, orario).
-- Le capienze restano invariate e le iscrizioni non vengono toccate: le FK
-- puntano a session_id, non allo slug, che resta 'giorno-1' e 'giorno-2'.
-- Idempotente e sicura su un database gia popolato.
-- =========================================================

-- Giorno 1: PalaMazzola, panel + progetti dei ragazzi + concerto.
update public.event_sessions
  set titolo = 'Giorno 1. Panel, progetti dei ragazzi e concerto',
      data   = '2026-12-10',
      luogo  = 'PalaMazzola, Taranto',
      orario = '9:00 . 16:00'
  where slug = 'giorno-1';

-- Giorno 2: Teatro Fusco, showcase di innovazione + premiazione + concerto.
update public.event_sessions
  set titolo = 'Giorno 2. Showcase di innovazione e premiazione',
      data   = '2026-12-11',
      luogo  = 'Teatro Fusco, Taranto',
      orario = '9:00 . 13:00'
  where slug = 'giorno-2';

-- Database nuovi che non avessero seminato le sessioni: garantisce comunque
-- la presenza delle due giornate con le capienze allineate a content.ts.
insert into public.event_sessions (slug, titolo, giorno, data, luogo, orario, capienza_max)
values
  ('giorno-1', 'Giorno 1. Panel, progetti dei ragazzi e concerto', 1, '2026-12-10', 'PalaMazzola, Taranto', '9:00 . 16:00', 300),
  ('giorno-2', 'Giorno 2. Showcase di innovazione e premiazione',   2, '2026-12-11', 'Teatro Fusco, Taranto', '9:00 . 13:00', 150)
on conflict (slug) do nothing;
