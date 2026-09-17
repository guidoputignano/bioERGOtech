-- =========================================================
-- VERIFICA: quali migrazioni sono davvero applicate a questo database
--
-- Le migrazioni di questo repository si eseguono a mano, una per una, e
-- niente tiene il conto di quali sono passate. Dopo qualche mese la domanda
-- "ho applicato tutto?" non ha piu una risposta che si possa ricordare, e
-- l'unico modo onesto di rispondere e chiederlo al database.
--
-- COME SI USA
--   1. Apra l'editor SQL di Supabase, sul progetto di produzione.
--   2. Incolli questo file per intero ed esegua.
--   3. Legga la colonna `esito`.
--
-- Non scrive niente e non modifica niente: sono solo letture del catalogo.
-- Si puo rieseguire quante volte si vuole.
--
-- COME SI LEGGE L'ESITO
--   OK          la migrazione risulta applicata
--   DA ESEGUIRE manca del tutto
--   PARZIALE    alcuni oggetti ci sono e altri no. Va guardata a mano: di
--               solito vuol dire che l'esecuzione si e interrotta a meta,
--               oppure che qualcuno ha cancellato qualcosa dopo.
--
-- Le migrazioni che portano solo dati, e non struttura, non si possono
-- verificare da qui: sono elencate in fondo con quello che si puo guardare
-- al loro posto.
-- =========================================================

with oggetti as (
  -- Ogni riga: una migrazione, un oggetto che quella migrazione crea, e il
  -- tipo di oggetto. `colonna` e valorizzata solo per le verifiche di colonna.
  select * from (values
    -- ── Fondamenta e portale ──────────────────────────────────────────
    ('20260308000000_create_profiles',            'tabella',  'profiles',                     null),
    ('20260308000000_create_profiles',            'funzione', 'handle_new_user',              null),
    ('20260324000001_add_membership_application', 'colonna',  'profiles',                     'application_status'),
    ('20260324000001_add_membership_application', 'colonna',  'profiles',                     'organisation_name'),
    ('20260324000001_add_membership_application', 'colonna',  'profiles',                     'what_you_bring'),
    ('20260607000000_create_member_benefits',     'tabella',  'member_benefits',              null),

    -- ── Outreach e MOU ────────────────────────────────────────────────
    ('20260711000000_add_mou_followup_system',    'tabella',  'mou_followups',                null),
    ('20260711000000_add_mou_followup_system',    'tabella',  'mou_followup_log',             null),
    ('20260711000000_add_mou_followup_system',    'funzione', 'handle_mou_funnel_stage_change', null),

    -- ── Navigator ─────────────────────────────────────────────────────
    ('20260714000000_navigator',                  'tabella',  'navigator_rules',              null),
    ('20260714000000_navigator',                  'tabella',  'navigator_sessions',           null),
    ('20260716000000_navigator_subregion',        'colonna',  'navigator_rules',              'sub_region'),

    -- ── Evento ────────────────────────────────────────────────────────
    ('20261001000000_create_event_registrations', 'tabella',  'event_registrations',          null),
    ('20261001000000_create_event_registrations', 'tabella',  'event_sessions',               null),
    ('20261001000000_create_event_registrations', 'tabella',  'event_registration_sessions',  null),
    ('20261001000000_create_event_registrations', 'funzione', 'event_register',               null),
    ('20261001000000_create_event_registrations', 'funzione', 'event_seats_remaining',        null),

    -- ── Bando startup ─────────────────────────────────────────────────
    ('20261202000000_create_bando_applications',  'tabella',  'bando_applications',           null),
    ('20261202000000_create_bando_applications',  'funzione', 'bando_stats',                  null),
    ('20261202000000_create_bando_applications',  'funzione', 'bando_touch_updated_at',       null),

    -- ── Protezione dei privilegi del profilo ──────────────────────────
    ('20261203000000_protect_profile_privileges', 'funzione', 'profiles_guard_privileged',    null),
    ('20261203000000_protect_profile_privileges', 'trigger',  'trg_profiles_guard_privileged', null),

    -- ── Percorso licei ────────────────────────────────────────────────
    ('20261204000000_create_licei_adesioni',      'tabella',  'licei_adesioni',               null),
    ('20261204000000_create_licei_adesioni',      'tabella',  'licei_config',                 null),
    ('20261204000000_create_licei_adesioni',      'funzione', 'licei_stats',                  null),
    ('20261204000000_create_licei_adesioni',      'funzione', 'licei_touch_updated_at',       null),
    ('20261205000000_create_licei_iscrizioni',    'tabella',  'licei_iscrizioni',             null),
    ('20261205000000_create_licei_iscrizioni',    'funzione', 'licei_iscrizioni_per_istituto', null),
    ('20261206000000_create_licei_squadre',       'tabella',  'licei_squadre',                null),
    ('20261206000000_create_licei_squadre',       'tabella',  'licei_progetti',               null),
    ('20261206000000_create_licei_squadre',       'tabella',  'licei_commissari',             null),
    ('20261206000000_create_licei_squadre',       'tabella',  'licei_valutazioni',            null),
    ('20261206000000_create_licei_squadre',       'funzione', 'licei_classifica',             null),
    ('20261206000000_create_licei_squadre',       'funzione', 'licei_squadra_capienza',       null),
    ('20261206000000_create_licei_squadre',       'funzione', 'licei_squadre_stats',          null),
    ('20261208000000_licei_visibilita',           'funzione', 'licei_iscrizioni_stats',       null),
    ('20261208000000_licei_visibilita',           'funzione', 'licei_accessi_istituto',       null),
    ('20261209000000_licei_accesso_coerente',     'funzione', 'licei_accessi_tutti',          null),

    -- ── Percorso universitario, fase 1 ────────────────────────────────
    ('20261207000000_universita_candidature',     'tabella',  'universita_candidature',       null),
    ('20261207000000_universita_candidature',     'funzione', 'universita_touch_updated_at',  null),

    -- ── Percorso universitario, fase 2 ────────────────────────────────
    ('20261210000000_universita_percorso',        'tabella',  'universita_config',            null),
    ('20261210000000_universita_percorso',        'tabella',  'universita_squadre',           null),
    ('20261210000000_universita_percorso',        'tabella',  'universita_richieste_squadra', null),
    ('20261210000000_universita_percorso',        'tabella',  'universita_progetti',          null),
    ('20261210000000_universita_percorso',        'tabella',  'universita_commissari',        null),
    ('20261210000000_universita_percorso',        'tabella',  'universita_valutazioni',       null),
    ('20261210000000_universita_percorso',        'tabella',  'universita_mentor',            null),
    ('20261210000000_universita_percorso',        'tabella',  'universita_mentor_squadre',    null),
    ('20261210000000_universita_percorso',        'colonna',  'universita_candidature',       'stato'),
    ('20261210000000_universita_percorso',        'colonna',  'universita_candidature',       'squadra_id'),
    ('20261210000000_universita_percorso',        'colonna',  'universita_candidature',       'cerca_squadra'),
    ('20261210000000_universita_percorso',        'colonna',  'universita_candidature',       'consenso_board'),
    ('20261210000000_universita_percorso',        'funzione', 'universita_classifica',        null),
    ('20261210000000_universita_percorso',        'funzione', 'universita_stats',             null),
    ('20261210000000_universita_percorso',        'funzione', 'universita_e_confermato',      null),
    ('20261210000000_universita_percorso',        'funzione', 'universita_squadra_capienza',  null),
    ('20261210000000_universita_percorso',        'funzione', 'universita_config_touch',      null),

    -- ── Percorso universitario, correzioni RLS ────────────────────────
    ('20261211000000_universita_colonne',         'funzione', 'universita_squadra_di',        null)
  ) as t(migrazione, tipo, oggetto, colonna)
),

esiti as (
  select
    o.migrazione,
    o.tipo,
    o.oggetto,
    o.colonna,
    case o.tipo
      when 'tabella' then exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = o.oggetto
      )
      when 'colonna' then exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = o.oggetto and column_name = o.colonna
      )
      when 'funzione' then exists (
        select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = o.oggetto
      )
      when 'trigger' then exists (
        select 1 from pg_trigger where tgname = o.oggetto and not tgisinternal
      )
      else false
    end as presente
  from oggetti o
)

select
  migrazione,
  count(*)                                  as oggetti_attesi,
  count(*) filter (where presente)          as oggetti_trovati,
  case
    when count(*) filter (where presente) = count(*) then 'OK'
    when count(*) filter (where presente) = 0        then 'DA ESEGUIRE'
    else 'PARZIALE'
  end                                       as esito,
  coalesce(
    string_agg(
      tipo || ' ' || oggetto || coalesce('.' || colonna, ''),
      ', ' order by oggetto
    ) filter (where not presente),
    ''
  )                                         as cosa_manca
from esiti
group by migrazione
order by migrazione;


-- =========================================================
-- SECONDA VERIFICA: le due migrazioni del percorso universitario
--
-- Le due piu recenti meritano un controllo piu fine, perche la prima porta
-- la colonna senza la quale il modulo di candidatura non scrive, e la
-- seconda porta i privilegi di colonna che impediscono a un `select *` di
-- restituire email e numeri di telefono a chi non deve vederli.
-- =========================================================

select 'universita_config popolata' as controllo,
       case when count(*) >= 7 then 'OK' else 'MANCA: attese 7 chiavi, trovate ' || count(*) end as esito
from public.universita_config

union all

select 'le fasi partono chiuse',
       case
         when not exists (select 1 from public.universita_config where chiave = 'stato_squadre')
           then 'NON VERIFICABILE: manca la riga'
         else 'stato_squadre=' || (select valore from public.universita_config where chiave = 'stato_squadre')
              || ' board=' || coalesce((select valore from public.universita_config where chiave = 'stato_board'), '?')
              || ' consegne=' || coalesce((select valore from public.universita_config where chiave = 'stato_consegne'), '?')
              || ' valutazione=' || coalesce((select valore from public.universita_config where chiave = 'stato_valutazione'), '?')
       end

union all

select 'conferma automatica',
       coalesce((select 'e ' || valore from public.universita_config where chiave = 'conferma_automatica'), 'MANCA')

union all

-- Il privilegio di colonna della migrazione 20261211000000. Se `anon` ha il
-- select sull'INTERA tabella dei mentor, la revoca non e stata applicata e
-- un select anonimo restituisce anche telefono, email e note dello staff.
select 'mentor: il telefono e protetto da anon',
       case
         when not exists (
           select 1 from information_schema.tables
           where table_schema='public' and table_name='universita_mentor'
         ) then 'NON VERIFICABILE: manca la tabella'
         when has_column_privilege('anon', 'public.universita_mentor', 'telefono', 'SELECT')
           then 'NO: anon legge ancora il telefono, esegua 20261211000000'
         else 'OK'
       end

union all

select 'bacheca: l''email e protetta dagli altri partecipanti',
       case
         when not exists (
           select 1 from information_schema.tables
           where table_schema='public' and table_name='universita_candidature'
         ) then 'NON VERIFICABILE: manca la tabella'
         when has_column_privilege('authenticated', 'public.universita_candidature', 'email', 'SELECT')
           then 'NO: un utente autenticato legge ancora l''email, esegua 20261211000000'
         else 'OK'
       end

union all

select 'squadre: il codice e protetto',
       case
         when not exists (
           select 1 from information_schema.tables
           where table_schema='public' and table_name='universita_squadre'
         ) then 'NON VERIFICABILE: manca la tabella'
         when has_column_privilege('authenticated', 'public.universita_squadre', 'codice', 'SELECT')
           then 'NO: un utente autenticato legge ancora il codice, esegua 20261211000000'
         else 'OK'
       end

union all

-- La classifica e i contatori restano allo staff: se `authenticated` puo
-- eseguirli, la revoca non e passata.
select 'classifica revocata ad authenticated',
       case
         when not exists (
           select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
           where n.nspname='public' and p.proname='universita_classifica'
         ) then 'NON VERIFICABILE: manca la funzione'
         when has_function_privilege('authenticated', 'public.universita_classifica()', 'EXECUTE')
           then 'NO: revoca mancante'
         else 'OK'
       end

union all

-- Questa invece NON va revocata: la usano le policy RLS, che girano con i
-- privilegi di chi interroga.
select 'universita_e_confermato ESEGUIBILE da authenticated',
       case
         when not exists (
           select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
           where n.nspname='public' and p.proname='universita_e_confermato'
         ) then 'NON VERIFICABILE: manca la funzione'
         when has_function_privilege('authenticated', 'public.universita_e_confermato(uuid)', 'EXECUTE')
           then 'OK'
         else 'NO: e stata revocata per errore, la bacheca non funzionera'
       end

union all

select 'candidature gia raccolte',
       case
         when not exists (
           select 1 from information_schema.tables
           where table_schema='public' and table_name='universita_candidature'
         ) then 'NON VERIFICABILE: manca la tabella'
         else (select count(*)::text || ' candidature, di cui '
               || count(*) filter (where user_id is not null)::text || ' con account'
               from public.universita_candidature)
       end;


-- =========================================================
-- QUELLO CHE DA QUI NON SI VEDE
--
-- Tre migrazioni portano dati e non struttura, quindi non compaiono
-- nell'elenco sopra. Al loro posto si guarda il contenuto:
--
--   20260714000001_navigator_seed
--     Storica e SUPERSEDUTA: non va eseguita. La sostituisce per intero
--     20260717000000_navigator_consolidated_authoritative.
--
--   20260717000000_navigator_consolidated_authoritative
--     select count(*) from public.navigator_rules;
--     Se torna 0, i dati del Navigator non sono stati caricati.
--
--   20260711000001_backfill_mou_followups
--     select count(*) from public.mou_followups;
--
--   20261101000000_update_event_sessions
--   20261201000000_update_event_sessions_palamazzola
--     select id, titolo from public.event_sessions order by id;
--     L'ultima aggiorna le sessioni alla sede del PalaMazzola.
--
-- Una nota sul trigger dei privilegi del profilo: il file
-- 20261203000000 contiene anche una revoca di colonna che NON ha effetto,
-- ed e previsto. Il README della cartella lo spiega per esteso. Quello che
-- conta e il trigger, che l'elenco sopra verifica.
-- =========================================================
