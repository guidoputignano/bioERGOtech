-- =========================================================
-- Migration: iscrizione degli studenti al percorso licei
--
-- Seconda fase del modulo licei. Qui, per la prima volta, il database
-- contiene dati di studenti in larga parte minorenni. Non e una scelta di
-- disegno: le lezioni del corso sono protette da login, quindi senza un
-- account lo studente non puo seguirlo.
--
-- Si raccoglie il minimo per far funzionare corso e valutazione, e niente
-- altro: nome, cognome, classe, anno di corso, email. Niente data di
-- nascita, niente codice fiscale, niente contatti dei genitori. L'anno di
-- corso sostituisce l'eta ed e meno identificante.
--
-- Le autorizzazioni dei genitori restano CARTACEE e in custodia
-- all'istituto. Il sito genera il modulo da far firmare, non raccoglie il
-- modulo firmato e non conserva dati dei genitori: qui sotto non esiste
-- alcuna colonna per loro, ed e deliberato.
-- =========================================================

create table if not exists public.licei_iscrizioni (
  id            uuid        primary key default gen_random_uuid(),
  -- L'istituto a cui lo studente si iscrive, risolto dal codice LIC-.
  adesione_id   uuid        not null references public.licei_adesioni (id) on delete cascade,
  -- Account dello studente. Serve per accedere alle lezioni del corso, che
  -- sono protette da login.
  user_id       uuid        references auth.users (id) on delete set null,

  nome          text        not null,
  cognome       text        not null,
  email         text        not null,
  -- La sezione, per come la scrive la scuola: "4A", "4 C liceo scientifico".
  classe        text        not null,
  -- 3, 4 o 5. L'art. 2 rende prioritarie quarte e quinte.
  anno_corso    int         not null check (anno_corso between 3 and 5),

  -- ── Dichiarazioni dello studente ──
  consenso_privacy      boolean     not null default false,
  consenso_privacy_ts   timestamptz,
  -- Lo studente dichiara di aver consegnato il modulo firmato. E una
  -- dichiarazione, non una prova: la prova e il foglio in segreteria, e chi
  -- la verifica e il referente quando conferma.
  dichiara_autorizzazione boolean   not null default false,
  dichiarazioni_testo   jsonb,

  -- ── Istruttoria del referente ──
  -- Chi sa davvero se questo studente e suo e il docente referente. Senza
  -- questo passaggio l'elenco sarebbe autodichiarato da chiunque conosca il
  -- codice dell'istituto, che gira per forza di cose in tutta la scuola.
  stato         text        not null default 'in_attesa' check (stato in (
                  'in_attesa', 'confermata', 'rifiutata', 'ritirata'
                )),
  note_referente text,
  confermata_at timestamptz,
  confermata_da uuid        references auth.users (id) on delete set null,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Uno studente, un'iscrizione per istituto. La chiave e l'email dentro
-- l'istituto: lo stesso indirizzo non puo iscriversi due volte alla stessa
-- scuola, ma la collisione non attraversa istituti diversi.
-- Indice e non vincolo di tabella: `lower(email)` e un'espressione, e i
-- vincoli non le accettano.
create unique index if not exists licei_iscrizioni_email_per_istituto
  on public.licei_iscrizioni (adesione_id, lower(email));

create index if not exists licei_iscrizioni_adesione_idx on public.licei_iscrizioni (adesione_id);
create index if not exists licei_iscrizioni_user_idx     on public.licei_iscrizioni (user_id);
create index if not exists licei_iscrizioni_stato_idx    on public.licei_iscrizioni (stato);

drop trigger if exists trg_licei_iscrizioni_touch on public.licei_iscrizioni;
create trigger trg_licei_iscrizioni_touch
  before update on public.licei_iscrizioni
  for each row execute function public.licei_touch_updated_at();

-- ── Configurazione ─────────────────────────────────────────────────────
-- Le iscrizioni partono CHIUSE, ed e giusto cosi: aprirle prima che i
-- referenti abbiano ricevuto e diffuso il codice significa una pagina che
-- respinge tutti quelli che ci arrivano.
insert into public.licei_config (chiave, valore) values
  ('stato_iscrizioni',          'chiuse'),
  ('scadenza_iscrizioni_label', '')
on conflict (chiave) do nothing;

-- ── Row Level Security ─────────────────────────────────────────────────
-- Le scritture passano dalle API con service role. Nessuna policy di
-- insert o update per anon e authenticated.
alter table public.licei_iscrizioni enable row level security;

-- Lo studente vede la propria iscrizione e il suo stato.
drop policy if exists "Students can view own iscrizione" on public.licei_iscrizioni;
create policy "Students can view own iscrizione"
  on public.licei_iscrizioni for select
  using (auth.uid() = user_id);

-- Il docente referente vede le iscrizioni del PROPRIO istituto, e solo
-- quelle: la clausola risale all'adesione e ne confronta il proprietario.
drop policy if exists "Referents can view own school iscrizioni" on public.licei_iscrizioni;
create policy "Referents can view own school iscrizioni"
  on public.licei_iscrizioni for select
  using (exists (
    select 1 from public.licei_adesioni a
    where a.id = licei_iscrizioni.adesione_id
      and a.user_id = auth.uid()
  ));

-- Lo staff vede tutto.
drop policy if exists "Admins can view all iscrizioni" on public.licei_iscrizioni;
create policy "Admins can view all iscrizioni"
  on public.licei_iscrizioni for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.partnership_level = 'admin'
  ));

-- ── Riepilogo per istituto ─────────────────────────────────────────────
create or replace function public.licei_iscrizioni_per_istituto()
returns table (
  adesione_id  uuid,
  istituto     text,
  in_attesa    bigint,
  confermate   bigint,
  totale       bigint
)
language sql
stable
security definer set search_path = ''
as $$
  select
    a.id,
    a.istituto_denominazione,
    count(*) filter (where i.stato = 'in_attesa')  as in_attesa,
    count(*) filter (where i.stato = 'confermata') as confermate,
    count(i.id)                                    as totale
  from public.licei_adesioni a
  left join public.licei_iscrizioni i on i.adesione_id = a.id
  group by a.id, a.istituto_denominazione;
$$;

revoke all on function public.licei_iscrizioni_per_istituto() from anon, authenticated;

-- ── Verifica ───────────────────────────────────────────────────────────
-- select a.istituto_denominazione, i.cognome, i.classe, i.stato
-- from public.licei_iscrizioni i
-- join public.licei_adesioni a on a.id = i.adesione_id
-- order by a.istituto_denominazione, i.cognome;
