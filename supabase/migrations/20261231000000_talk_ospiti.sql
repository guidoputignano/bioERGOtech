-- =========================================================
-- Migration: ospiti nei talk aperti a tutti
--
-- Un talk puo essere aperto a tutti (`apertoATutti` in
-- app/eventi/vivere-piu-a-lungo/talk/content.ts): chi non partecipa al
-- percorso si iscrive con un account del sito, e la riga ha il ruolo
-- `ospite`. Il vincolo del ruolo di 20261216000000 non lo conosce: qui lo
-- si rifa uguale, con `ospite` in piu.
--
-- Nessun dato nuovo: la riga di un ospite e come le altre, account e talk,
-- senza istituto (il vincolo `talk_iscrizioni_adesione_check` lo esige gia).
-- La chiusura del percorso licei cancella solo le righe di studenti e
-- docenti dei licei: quelle degli ospiti restano, come i loro account.
--
-- Rieseguibile: il vincolo si toglie e si rimette. Prima di questa
-- migrazione il codice regge: l'iscrizione di un ospite risponde 503 con
-- "Le iscrizioni per chi non segue il percorso si attivano a breve.", e chi
-- partecipa al percorso si iscrive come sempre.
-- =========================================================

do $$
begin
  if to_regclass('public.talk_iscrizioni') is null then
    raise exception 'Manca public.talk_iscrizioni: esegua prima 20261216000000_talk_iscrizioni.sql.';
  end if;
end $$;

alter table public.talk_iscrizioni drop constraint if exists talk_iscrizioni_ruolo_check;
alter table public.talk_iscrizioni
  add constraint talk_iscrizioni_ruolo_check
  check (ruolo in ('studente_licei', 'studente_universita', 'docente', 'staff', 'ospite'));

-- Verifica:
-- select pg_get_constraintdef(oid) from pg_constraint where conname = 'talk_iscrizioni_ruolo_check';
