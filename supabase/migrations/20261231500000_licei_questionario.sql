-- =========================================================
-- Percorso licei: il questionario di fine percorso
--
-- Il 30 novembre il calendario automatico manda a studenti confermati e
-- docenti un questionario breve, anonimo e facoltativo, ognuno con il suo
-- link; il 2 dicembre un promemoria a chi non ha risposto. Si risponde
-- fino al 3 dicembre alle 23:59.
--
-- CHE COSA AGGIUNGE (in una transazione: o tutto, o niente)
--   1. licei_questionario_inviti: a chi e stato mandato (uno studente, un
--      referente o un docente del progetto) e se ha risposto. Serve a non
--      far rispondere due volte e a scrivere il promemoria solo a chi non
--      ha risposto. Nessuna data della risposta: insieme a quella delle
--      risposte, direbbe chi ha scritto che cosa. Nessun token: il link e
--      firmato dal sito, che lo ricostruisce dall'id.
--   2. licei_questionario_risposte: le risposte, senza alcun legame con la
--      persona. Solo il ruolo (studente o docente), la versione delle
--      domande e le risposte: nessun nome, account, data o riferimento
--      all'invito. L'id e casuale.
--   3. public.licei_questionario_rispondi(): segna l'invito come risposto e
--      salva le risposte nello stesso momento, una volta sola per invito.
--      Riscrive ogni volta tutti gli inviti risposti e tutte le risposte, in
--      ordine casuale: cosi nemmeno le colonne di sistema (xmin, la
--      transazione che ha scritto la riga) o l'ordine fisico delle righe
--      dicono quale risposta viene da quale invito.
--
-- Solo le rotte del sito, con la service role: RLS attiva, nessuna policy
-- per anon e authenticated. Gli inviti si cancellano con la chiusura del
-- percorso (e a cascata con l'iscrizione, l'adesione o il docente).
--
-- COME SI USA
--   Editor SQL di Supabase, progetto di produzione: incollare il file intero
--   ed eseguire. Si puo rieseguire: ogni passo controlla quello che c'e gia.
--   Il codice funziona anche prima: senza le tabelle il questionario non
--   parte (il passo del calendario riprova il giorno dopo) e il pannello lo
--   dice. In fondo, la query di controllo.
--
-- Dipende da 20261204000000 (licei_adesioni), 20261205000000
-- (licei_iscrizioni) e 20261215000000 (licei_docenti).
-- =========================================================

do $$
begin
  if to_regclass('public.licei_adesioni') is null or to_regclass('public.licei_iscrizioni') is null then
    raise exception 'Mancano licei_adesioni o licei_iscrizioni: esegua prima 20261204000000 e 20261205000000.';
  end if;
  if to_regclass('public.licei_docenti') is null then
    raise exception 'Manca licei_docenti: esegua prima 20261215000000_licei_docenti_accettazioni_riflessioni.sql.';
  end if;
end $$;

begin;

-- ── 1. Gli inviti ──────────────────────────────────────────────────────
create table if not exists public.licei_questionario_inviti (
  id             uuid        primary key default gen_random_uuid(),
  ruolo          text        not null,
  -- La persona, una volta sola: "iscrizione <id>", "adesione <id>" (il
  -- referente) o "docente <id>". Lo stesso riferimento dei log degli avvisi.
  chi            text        not null,
  iscrizione_id  uuid        references public.licei_iscrizioni (id) on delete cascade,
  adesione_id    uuid        references public.licei_adesioni (id) on delete cascade,
  docente_id     uuid        references public.licei_docenti (id) on delete cascade,
  -- Si o no, senza data: vedi sopra.
  risposto       boolean     not null default false,
  -- Quando e partito l'invito: uguale per tutti quelli dello stesso giro.
  created_at     timestamptz not null default now(),
  constraint licei_questionario_inviti_ruolo_check check (ruolo in ('studente', 'docente')),
  constraint licei_questionario_inviti_chi_key unique (chi),
  constraint licei_questionario_inviti_una_persona check (num_nonnulls(iscrizione_id, adesione_id, docente_id) = 1),
  constraint licei_questionario_inviti_ruolo_coerente check ((ruolo = 'studente') = (iscrizione_id is not null))
);

create index if not exists licei_questionario_inviti_iscrizione_idx on public.licei_questionario_inviti (iscrizione_id);
create index if not exists licei_questionario_inviti_adesione_idx   on public.licei_questionario_inviti (adesione_id);
create index if not exists licei_questionario_inviti_docente_idx    on public.licei_questionario_inviti (docente_id);

-- ── 2. Le risposte ─────────────────────────────────────────────────────
create table if not exists public.licei_questionario_risposte (
  id        uuid     primary key default gen_random_uuid(),
  ruolo     text     not null,
  -- Le domande stanno nel codice (app/eventi/vivere-piu-a-lungo/licei/
  -- questionario/domande.ts): una versione nuova se cambiano.
  versione  smallint not null default 1,
  risposte  jsonb    not null,
  constraint licei_questionario_risposte_ruolo_check check (ruolo in ('studente', 'docente')),
  constraint licei_questionario_risposte_oggetto check (jsonb_typeof(risposte) = 'object')
);

-- ── 3. Row Level Security e privilegi ──────────────────────────────────
alter table public.licei_questionario_inviti   enable row level security;
alter table public.licei_questionario_risposte enable row level security;

revoke all on table public.licei_questionario_inviti   from public, anon, authenticated;
revoke all on table public.licei_questionario_risposte from public, anon, authenticated;
grant all on table public.licei_questionario_inviti   to service_role;
grant all on table public.licei_questionario_risposte to service_role;

-- ── 4. Rispondere, una volta sola ──────────────────────────────────────
-- Il sito controlla il link e le risposte prima di chiamarla. Qui si
-- decide solo se l'invito puo ancora rispondere: la riga si blocca, cosi
-- due invii contemporanei dallo stesso link ne salvano uno.
--
-- L'anonimato anche per chi legge il database. Invito e risposta scritti
-- nella stessa transazione avrebbero lo stesso xmin, e una join su xmin
-- direbbe chi ha scritto che cosa; l'ordine fisico delle risposte
-- direbbe in che ordine sono arrivate. Per questo ogni chiamata riscrive
-- tutti gli inviti gia risposti e tutte le risposte (cancellate e
-- reinserite in ordine casuale, con id nuovi): alla fine di ogni chiamata
-- tutte le righe hanno la stessa transazione, e l'ordine non dice niente.
-- Sono poche centinaia di righe; due chiamate insieme si mettono in fila
-- sui blocchi delle righe.
create or replace function public.licei_questionario_rispondi(
  p_invito   uuid,
  p_risposte jsonb,
  p_versione integer
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ruolo text;
begin
  if p_risposte is null or jsonb_typeof(p_risposte) <> 'object' then
    raise exception 'Risposte non valide.';
  end if;
  if p_versione is null or p_versione < 1 or p_versione > 100 then
    raise exception 'Versione non valida.';
  end if;

  select i.ruolo into v_ruolo
    from public.licei_questionario_inviti i
    where i.id = p_invito and not i.risposto
    for update;

  if not found then
    if exists (select 1 from public.licei_questionario_inviti i where i.id = p_invito) then
      return 'gia_risposto';
    end if;
    return 'non_trovato';
  end if;

  update public.licei_questionario_inviti
    set risposto = true
    where risposto or id = p_invito;

  insert into public.licei_questionario_risposte (ruolo, versione, risposte)
    values (v_ruolo, p_versione::smallint, p_risposte);

  with tolte as (
    delete from public.licei_questionario_risposte
    returning ruolo, versione, risposte
  )
  insert into public.licei_questionario_risposte (ruolo, versione, risposte)
    select t.ruolo, t.versione, t.risposte from tolte t order by random();

  return 'ok';
end;
$$;

-- Anche da public: anon e authenticated ereditano EXECUTE da li
-- (supabase/migrations/README.md).
revoke all on function public.licei_questionario_rispondi(uuid, jsonb, integer) from public, anon, authenticated;
grant execute on function public.licei_questionario_rispondi(uuid, jsonb, integer) to service_role;

commit;

-- ── Controllo (solo lettura) ───────────────────────────────────────────
-- Atteso: inviti 0 e risposte 0 finche il questionario non parte; tutte
-- le colonne "anon_..." e "auth_..." a false, "rls_..." a true.
select
  (select count(*) from public.licei_questionario_inviti)   as inviti,
  (select count(*) from public.licei_questionario_risposte) as risposte,
  (select relrowsecurity from pg_class where oid = to_regclass('public.licei_questionario_inviti'))   as rls_inviti,
  (select relrowsecurity from pg_class where oid = to_regclass('public.licei_questionario_risposte')) as rls_risposte,
  has_table_privilege('anon', 'public.licei_questionario_risposte', 'SELECT')          as anon_legge_risposte,
  has_table_privilege('authenticated', 'public.licei_questionario_inviti', 'SELECT')   as auth_legge_inviti,
  has_function_privilege('anon', 'public.licei_questionario_rispondi(uuid, jsonb, integer)', 'EXECUTE') as anon_puo_rispondere;
