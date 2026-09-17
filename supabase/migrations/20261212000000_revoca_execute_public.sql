-- =========================================================
-- Le revoche sulle funzioni non hanno mai funzionato
--
-- In tutte le migrazioni precedenti le funzioni `security definer` di
-- servizio sono state protette cosi:
--
--     revoke all on function public.licei_stats() from anon, authenticated;
--
-- La riga sembra giusta e non fa niente. PostgreSQL, quando crea una
-- funzione, concede EXECUTE a PUBLIC, cioe a chiunque. Togliere il
-- permesso ad `anon` e ad `authenticated` non tocca quella concessione,
-- perche i due ruoli non la ricevono in proprio: la ereditano da PUBLIC.
-- Si vede nell'ACL, dove `=X/postgres` e proprio la riga di PUBLIC:
--
--     ACL su universita_classifica: =X/postgres | postgres=X/postgres
--     has_function_privilege('anon', ..., 'EXECUTE') -> true
--
-- Il risultato e che ogni funzione che doveva essere riservata allo staff
-- era invocabile da un visitatore non autenticato. E siccome sono tutte
-- `security definer`, girano con i privilegi del proprietario e non sono
-- filtrate da RLS: la protezione mancava per intero, non a meta. Su
-- Supabase le funzioni dello schema `public` sono esposte da PostgREST
-- come /rest/v1/rpc/<nome>, quindi bastava la chiave anonima del sito.
--
-- Qui si revoca da PUBLIC, che e l'unica revoca che conta.
--
-- Nessuna rotta dell'applicazione si rompe: tutte le chiamate rpc()
-- passano da `requireAdmin` o da `requireReferente`, che usano la chiave
-- service_role, e a service_role il permesso viene riconcesso qui sotto
-- in modo esplicito, subito dopo ogni revoca.
-- =========================================================

do $$
declare
  f text;
  -- Solo le funzioni che una migrazione precedente aveva gia dichiarato
  -- riservate con un `revoke ... from anon, authenticated`. Qui non si
  -- cambia idea su chi debba accedere a cosa: si rende efficace una
  -- decisione gia presa, e mai applicata davvero.
  riservate text[] := array[
    'public.bando_stats()',
    'public.licei_stats()',
    'public.licei_squadre_stats()',
    'public.licei_classifica()',
    'public.licei_iscrizioni_stats()',
    'public.licei_iscrizioni_per_istituto()',
    'public.licei_accessi_tutti()',
    'public.licei_accessi_istituto(uuid)',
    'public.universita_stats()',
    'public.universita_classifica()',
    'public.event_register(uuid, text, text, text, text, text, text, text, text, text, text, text, text, boolean, text, text, text[])'
  ];
begin
  foreach f in array riservate loop
    -- `to_regprocedure` torna null invece di sollevare: una funzione che
    -- su questo database non esiste viene saltata, e la migrazione resta
    -- eseguibile anche dove non tutte le migrazioni sono state applicate.
    if to_regprocedure(f) is not null then
      execute format('revoke all on function %s from public, anon, authenticated', f);
      -- Il grant esplicito a service_role non e una ridondanza. Revocare da
      -- PUBLIC toglie il permesso a chiunque lo ereditasse da li, e su un
      -- database dove le default privileges di Supabase non avessero dato a
      -- service_role una concessione propria, la revoca colpirebbe anche le
      -- rotte admin, che girano proprio con quella chiave. Riconcedere qui
      -- rende il risultato lo stesso ovunque, invece di dipendere da come e
      -- stato inizializzato il progetto.
      execute format('grant execute on function %s to service_role', f);
      raise notice 'revocata: %', f;
    else
      raise notice 'assente, saltata: %', f;
    end if;
  end loop;
end $$;

-- =========================================================
-- Le due eccezioni, da NON revocare
--
-- `universita_e_confermato` e `universita_squadra_di` sono usate dentro
-- le policy RLS. Le policy sono valutate con i privilegi di chi sta
-- interrogando, non del proprietario: se ad `authenticated` manca
-- EXECUTE, ogni lettura protetta da quelle policy fallisce, e la bacheca
-- smette di funzionare. Il grant esplicito qui sotto serve a dirlo a
-- chiunque legga questo file, e a rimetterlo se una revoca troppo larga
-- lo avesse tolto.
-- =========================================================

do $$
begin
  if to_regprocedure('public.universita_e_confermato(uuid)') is not null then
    grant execute on function public.universita_e_confermato(uuid) to authenticated;
  end if;
  if to_regprocedure('public.universita_squadra_di(uuid)') is not null then
    grant execute on function public.universita_squadra_di(uuid) to authenticated;
  end if;
end $$;
