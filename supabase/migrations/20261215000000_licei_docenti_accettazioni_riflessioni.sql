-- =========================================================
-- Migration: docenti del progetto, accettazione delle istruzioni,
-- riflessioni visibili ai docenti, adesione ritirata
--
-- Quattro cose, tutte del percorso licei:
--
--   1. `licei_docenti`: gli altri docenti dell'istituto che il referente
--      principale indica (fino a cinque). Il referente principale resta
--      `licei_adesioni.user_id`: qui ci sono solo i docenti AGGIUNTI, e i
--      dati esistenti non si spostano.
--   2. `licei_accettazioni`: chi ha accettato quale versione delle
--      istruzioni per i docenti, con il testo esatto che ha letto. Fra un
--      anno una data da sola non dice a che cosa si e detto si.
--   3. `lesson_submissions.condivisa_referente_at`: la riga e stata salvata
--      DOPO che lo studente ha visto l'avviso "la leggono anche i docenti del
--      tuo istituto". Solo quelle righe arrivano ai docenti; le precedenti
--      restano allo staff.
--   4. Le tre policy "Referents can view own school ..." smettono di valere
--      per un'adesione ritirata. Il ritiro deve togliere l'accesso ai dati
--      degli studenti anche a chi interroga PostgREST direttamente, non solo
--      a chi passa dalle API.
--
-- Nessuna policy di lettura dei dati degli studenti per i docenti aggiunti:
-- per loro l'accesso passa solo dalle API, che filtrano per istituto con la
-- service role. Cosi la superficie PostgREST sui dati di minorenni non
-- cresce.
--
-- Additiva e rieseguibile: `if not exists`, `drop policy if exists`,
-- `alter table if exists`. Il codice regge anche PRIMA che sia applicata:
-- senza le due tabelle nessuno risulta docente aggiunto e le istruzioni
-- risultano accettate (il comportamento di oggi), senza la colonna le
-- riflessioni restano solo allo staff.
--
-- Dipende da 20261204, 20261205, 20261206 (tabelle licei) e da 20261213
-- (`public.e_admin()`): il controllo qui sotto lo dice prima di iniziare,
-- invece di fermarsi a meta.
-- =========================================================

do $$
begin
  if to_regclass('public.licei_adesioni') is null
     or to_regclass('public.licei_iscrizioni') is null
     or to_regclass('public.licei_squadre') is null
     or to_regclass('public.licei_progetti') is null then
    raise exception 'Mancano le tabelle del percorso licei: esegua prima 20261204000000, 20261205000000 e 20261206000000.';
  end if;
  if to_regprocedure('public.e_admin()') is null then
    raise exception 'Manca public.e_admin(): esegua prima 20261213000000_profiles_ricorsione.sql.';
  end if;
  if to_regprocedure('public.licei_touch_updated_at()') is null then
    raise exception 'Manca public.licei_touch_updated_at(): esegua prima 20261204000000_create_licei_adesioni.sql.';
  end if;
end $$;

-- ── 1. Docenti del progetto ────────────────────────────────────────────
create table if not exists public.licei_docenti (
  id                   uuid        primary key default gen_random_uuid(),
  -- L'istituto. Se l'adesione se ne va, i suoi docenti con lei.
  adesione_id          uuid        not null references public.licei_adesioni (id) on delete cascade,
  -- L'account del docente. Resta nullo finche l'API non lo trova o lo crea;
  -- se l'account viene cancellato la riga resta, come registro dell'invito.
  user_id              uuid        references auth.users (id) on delete set null,

  nome                 text        not null,
  cognome              text        not null,
  email                text        not null,
  -- Le classi che il docente segue. Sono un FILTRO preselezionato nella
  -- console, non un confine: ogni docente vede tutto il proprio istituto.
  classi               text[]      not null default '{}',

  -- invitato: ha ricevuto l'accesso, non ha ancora accettato le istruzioni.
  -- attivo:   ha accettato.
  -- revocato: dal referente o dallo staff. La guardia legge questa colonna a
  --           ogni richiesta, quindi la revoca ha effetto subito.
  stato                text        not null default 'invitato' check (stato in (
                         'invitato', 'attivo', 'revocato'
                       )),

  -- ── Chi lo ha indicato, e con quale dichiarazione ──
  invitato_da          uuid,
  invitato_at          timestamptz not null default now(),
  -- Il testo della dichiarazione del referente, congelato con l'invito.
  dichiarazione_invito jsonb,
  -- L'ultima volta che e partita l'email con il link: serve a limitare i
  -- reinvii, che generano ogni volta un link di accesso nuovo.
  invito_inviato_at    timestamptz,

  revocato_at          timestamptz,
  revocato_da          uuid,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Una persona, una riga per istituto. Indice e non vincolo di tabella:
-- `lower(email)` e un'espressione, e i vincoli non le accettano.
create unique index if not exists licei_docenti_email_per_istituto
  on public.licei_docenti (adesione_id, lower(email));

create index if not exists licei_docenti_user_idx  on public.licei_docenti (user_id);
create index if not exists licei_docenti_email_idx on public.licei_docenti (lower(email));

drop trigger if exists trg_licei_docenti_touch on public.licei_docenti;
create trigger trg_licei_docenti_touch
  before update on public.licei_docenti
  for each row execute function public.licei_touch_updated_at();

-- ── 2. Accettazioni delle istruzioni ───────────────────────────────────
-- Una riga per persona, documento e versione. Quando le istruzioni cambiano
-- cambia la versione, e ognuno accetta di nuovo: le righe vecchie restano,
-- e dicono che cosa era in vigore prima.
create table if not exists public.licei_accettazioni (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users (id) on delete cascade,
  -- L'istituto per cui ha accettato. Facoltativo nello schema, sempre
  -- valorizzato dalla rotta.
  adesione_id   uuid        references public.licei_adesioni (id) on delete cascade,
  -- Oggi solo 'istruzioni_docente'. Una colonna e non una tabella per
  -- documento, perche il prossimo documento da accettare non chieda una
  -- migrazione.
  documento     text        not null,
  -- La data di aggiornamento del documento, AAAA-MM-GG.
  versione      text        not null,
  -- Titolo, impegni e dichiarazione, esattamente come li ha letti.
  testo         jsonb       not null,
  accettato_at  timestamptz not null default now(),

  constraint licei_accettazioni_una_per_versione unique (user_id, documento, versione)
);

create index if not exists licei_accettazioni_adesione_idx on public.licei_accettazioni (adesione_id);

-- ── 3. Riflessioni condivise con i docenti ─────────────────────────────
-- `lesson_submissions` e stata creata fuori dalle migrazioni e su un
-- database nuovo non c'e: `if exists` rende queste righe innocue in quel
-- caso, e la catena delle migrazioni non si rompe.
--
-- La colonna la scrive solo il server, e solo quando lo studente iscritto
-- al percorso ha visto l'avviso. Nulla vuol dire "solo staff", ed e il
-- valore di tutte le righe gia esistenti: quello che e stato scritto prima
-- dell'avviso non diventa visibile ai docenti per effetto di questa riga.
alter table if exists public.lesson_submissions
  add column if not exists condivisa_referente_at timestamptz;

-- RLS attiva, senza policy. Nessun codice del sito legge o scrive questa
-- tabella dal browser: tutte le rotte (corso, staff, licei, universita)
-- usano la service role, che RLS non la vede. Senza RLS, invece, la chiave
-- anonima del sito bastava a leggere via PostgREST le riflessioni di tutti,
-- e da qui in poi dentro ci sono anche testi destinati ai docenti di una
-- sola scuola. Se in produzione la tabella ha gia RLS e delle policy,
-- questa riga non le tocca.
alter table if exists public.lesson_submissions enable row level security;

-- ── 4. Row Level Security delle due tabelle nuove ──────────────────────
-- Come nel resto del modulo: le scritture passano dalle API con service
-- role, e non esiste nessuna policy di insert, update o delete.
alter table public.licei_docenti      enable row level security;
alter table public.licei_accettazioni enable row level security;

-- Il docente vede la propria riga, e nessun'altra: nemmeno quelle dei
-- colleghi dello stesso istituto, che riceve dalla rotta con i soli nomi.
drop policy if exists "Docenti can view own row" on public.licei_docenti;
create policy "Docenti can view own row"
  on public.licei_docenti for select
  using (auth.uid() = user_id);

drop policy if exists "Admins can view all docenti" on public.licei_docenti;
create policy "Admins can view all docenti"
  on public.licei_docenti for select
  using (public.e_admin());

drop policy if exists "Users can view own accettazioni" on public.licei_accettazioni;
create policy "Users can view own accettazioni"
  on public.licei_accettazioni for select
  using (auth.uid() = user_id);

drop policy if exists "Admins can view all accettazioni" on public.licei_accettazioni;
create policy "Admins can view all accettazioni"
  on public.licei_accettazioni for select
  using (public.e_admin());

-- ── 5. Privilegi ───────────────────────────────────────────────────────
-- Le altre tabelle licei si affidano ai privilegi di default di Supabase
-- (tutto a anon, authenticated e service_role) e a RLS senza policy di
-- scrittura. Qui si fa lo stesso, con due reti in piu che su Supabase non
-- tolgono niente di usato:
--   - anon non ha motivo di toccare queste tabelle, e non le tocca;
--   - authenticated puo solo leggere, e RLS gli mostra la sola riga sua.
-- Il grant a service_role e esplicito per la stessa ragione della
-- 20261212000000: il risultato deve essere lo stesso anche su un database
-- inizializzato senza i privilegi di default di Supabase.
revoke all on table public.licei_docenti, public.licei_accettazioni from public, anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.licei_docenti, public.licei_accettazioni from authenticated;
grant select on table public.licei_docenti, public.licei_accettazioni to authenticated;
grant all on table public.licei_docenti, public.licei_accettazioni to service_role;

-- ── 6. Adesione ritirata: le policy dei referenti ──────────────────────
-- Le stesse definizioni delle migrazioni 20261205000000 e 20261206000000,
-- con una sola condizione in piu: `a.stato <> 'ritirata'`. Le API fanno lo
-- stesso controllo nella guardia; questa e la seconda linea, per chi
-- interroga PostgREST con il proprio JWT. Gli studenti non sono toccati:
-- le loro policy restano quelle di prima.
drop policy if exists "Referents can view own school iscrizioni" on public.licei_iscrizioni;
create policy "Referents can view own school iscrizioni"
  on public.licei_iscrizioni for select
  using (exists (
    select 1 from public.licei_adesioni a
    where a.id = licei_iscrizioni.adesione_id
      and a.user_id = auth.uid()
      and a.stato <> 'ritirata'
  ));

drop policy if exists "Referents can view own school squadre" on public.licei_squadre;
create policy "Referents can view own school squadre"
  on public.licei_squadre for select
  using (exists (
    select 1 from public.licei_adesioni a
    where a.id = licei_squadre.adesione_id and a.user_id = auth.uid()
      and a.stato <> 'ritirata'
  ));

drop policy if exists "Referents can view own school progetti" on public.licei_progetti;
create policy "Referents can view own school progetti"
  on public.licei_progetti for select
  using (exists (
    select 1 from public.licei_adesioni a
    where a.id = licei_progetti.adesione_id and a.user_id = auth.uid()
      and a.stato <> 'ritirata'
  ));

-- ── 7. Verifica ────────────────────────────────────────────────────────
-- select a.istituto_denominazione, d.cognome, d.nome, d.stato, d.classi
--   from public.licei_docenti d
--   join public.licei_adesioni a on a.id = d.adesione_id
--   order by a.istituto_denominazione, d.cognome;
-- select documento, versione, count(*) from public.licei_accettazioni group by 1, 2;
-- select count(*) filter (where condivisa_referente_at is not null) as condivise,
--        count(*) as totali
--   from public.lesson_submissions;
