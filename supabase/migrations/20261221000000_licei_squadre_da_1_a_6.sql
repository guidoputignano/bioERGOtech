-- =========================================================
-- Percorso licei: squadre da 1 a 6 componenti (prima da 2 a 5)
--
-- Dal 2 novembre 2026 la regola del bando cambia: si puo consegnare anche
-- da soli, e una squadra arriva a sei. Nel codice i due numeri stanno in
-- SQUADRA_MIN e SQUADRA_MAX (app/eventi/vivere-piu-a-lungo/licei/content.ts);
-- qui si cambia la loro copia a database:
--
--   1. il trigger licei_squadra_capienza, che rifiuta un ingresso quando la
--      squadra ha gia 5 componenti: ora quando ne ha gia 6;
--   2. il riepilogo licei_squadre_stats, che contava "complete" le squadre
--      con almeno 2 componenti: ora con almeno 1.
--
-- Il resto delle due funzioni e identico a 20261206000000. "create or
-- replace" mantiene proprietario e privilegi (le revoche di 20261212000000
-- restano). Rieseguibile: una seconda esecuzione non cambia nulla.
--
-- COME SI APPLICA
--   Editor SQL di Supabase, progetto di produzione: incollare il file per
--   intero ed eseguire. Poi VERIFICA.sql: la riga "squadre licei: fino a 6
--   componenti" deve dire OK.
-- =========================================================

do $$
begin
  if to_regclass('public.licei_iscrizioni') is null or to_regclass('public.licei_squadre') is null then
    raise exception 'Mancano le tabelle dei licei: applicare prima 20261205000000 e 20261206000000.';
  end if;
end $$;

-- ── 1. Capienza della squadra: fino a 6 ─────────────────────────────────
create or replace function public.licei_squadra_capienza()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_membri int;
  v_ades_squadra uuid;
begin
  if new.squadra_id is null then
    return new;
  end if;

  -- Una squadra sta dentro un istituto: se l'iscrizione appartiene a
  -- un'altra adesione, non entra. E' l'ultima rete, non la prima: l'API
  -- filtra gia per adesione quando risolve il codice della squadra.
  select adesione_id into v_ades_squadra
    from public.licei_squadre where id = new.squadra_id;

  if v_ades_squadra is distinct from new.adesione_id then
    raise exception 'squadra_altro_istituto';
  end if;

  perform pg_advisory_xact_lock(hashtext(new.squadra_id::text));

  select count(*) into v_membri
    from public.licei_iscrizioni
    where squadra_id = new.squadra_id and id <> new.id;

  -- Sei componenti al massimo (SQUADRA_MAX nel codice).
  if v_membri >= 6 then
    raise exception 'squadra_piena';
  end if;

  return new;
end;
$$;

-- ── 2. Riepilogo per il pannello: "complete" da 1 componente ────────────
create or replace function public.licei_squadre_stats()
returns table (
  squadre_totali    bigint,
  squadre_complete  bigint,
  studenti_in_squadra bigint,
  progetti_bozza    bigint,
  progetti_consegnati bigint
)
language sql
stable
security definer set search_path = ''
as $$
  select
    (select count(*) from public.licei_squadre where stato = 'aperta'),
    (select count(*) from (
       select squadra_id from public.licei_iscrizioni
       where squadra_id is not null
       group by squadra_id having count(*) >= 1
     ) q),
    (select count(*) from public.licei_iscrizioni where squadra_id is not null),
    (select count(*) from public.licei_progetti where stato = 'bozza'),
    (select count(*) from public.licei_progetti where stato = 'consegnato');
$$;

-- ── 3. Verifica ─────────────────────────────────────────────────────────
-- select pg_get_functiondef('public.licei_squadra_capienza()'::regprocedure) like '%v_membri >= 6%';
