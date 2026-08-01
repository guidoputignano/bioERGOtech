-- =========================================================
-- Migration: squadre, progetti, Commissione e finalisti
--
-- Terza e ultima fase del modulo licei. Le prime due portano lo studente
-- dentro: l'istituto aderisce (art. 4), lo studente si iscrive e il
-- referente lo conferma. Da qui in poi lo studente PRODUCE qualcosa, e
-- qualcuno lo valuta.
--
-- Quattro cose, nell'ordine in cui accadono:
--   1. gli studenti confermati formano una squadra (art. 3, lavoro in team);
--   2. la squadra consegna un progetto;
--   3. la Commissione dell'art. 8 lo valuta sui criteri dell'art. 7;
--   4. i primi dieci salgono sul palco del 10 dicembre (art. 6), e per
--      salirci devono risultare iscritti all'evento.
--
-- Il vincolo che attraversa tutto: una squadra sta dentro UN istituto. Non
-- e una semplificazione, discende dall'art. 4. E' l'istituto che raccoglie
-- le candidature, che custodisce le autorizzazioni e che risponde dei suoi
-- studenti, e il referente conferma solo i propri. Una squadra a cavallo di
-- due scuole non avrebbe un referente che ne risponde, e all'evento finale
-- non si saprebbe quale istituto accompagna quei ragazzi.
-- =========================================================

-- ── 1. Squadre ─────────────────────────────────────────────────────────
create table if not exists public.licei_squadre (
  id            uuid        primary key default gen_random_uuid(),
  -- L'istituto. Ridondante rispetto ai membri, ma e il vincolo di cui sopra:
  -- averlo in colonna permette di imporlo, invece di sperarci.
  adesione_id   uuid        not null references public.licei_adesioni (id) on delete cascade,
  -- Codice che il capitano passa ai compagni per farli entrare. Stesso
  -- alfabeto senza caratteri ambigui del codice dell'istituto: si detta a
  -- voce in classe.
  codice        text        not null unique,
  nome          text        not null,

  stato         text        not null default 'aperta' check (stato in (
                  'aperta', 'sciolta'
                )),

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint licei_squadre_nome_per_istituto unique (adesione_id, nome)
);

create index if not exists licei_squadre_adesione_idx on public.licei_squadre (adesione_id);

drop trigger if exists trg_licei_squadre_touch on public.licei_squadre;
create trigger trg_licei_squadre_touch
  before update on public.licei_squadre
  for each row execute function public.licei_touch_updated_at();

-- ── 2. Appartenenza: una colonna sull'iscrizione, non una tabella ponte ──
-- Uno studente sta in una squadra sola, e la colonna lo impone da se. Una
-- tabella ponte reggerebbe il molti a molti che qui non esiste, e in cambio
-- chiederebbe un vincolo in piu per escluderlo.
alter table public.licei_iscrizioni
  add column if not exists squadra_id    uuid references public.licei_squadre (id) on delete set null,
  add column if not exists squadra_ruolo text check (squadra_ruolo is null or squadra_ruolo in ('capo', 'membro'));

create index if not exists licei_iscrizioni_squadra_idx on public.licei_iscrizioni (squadra_id);

-- Un capitano per squadra, non due. L'indice e parziale: i membri semplici
-- non sono soggetti al vincolo.
create unique index if not exists licei_squadre_un_solo_capo
  on public.licei_iscrizioni (squadra_id)
  where squadra_ruolo = 'capo';

/**
 * Tetto di cinque studenti per squadra.
 *
 * Cinque e il numero dell'art. 6: la rappresentanza che parte per il premio.
 * Con il tetto a cinque la squadra vincente ci va al completo, e nessuno
 * resta a casa a guardare le foto dei compagni a New York.
 *
 * Il lock serializza gli ingressi nella stessa squadra: senza, due studenti
 * che entrano nello stesso istante leggono entrambi quattro e diventano sei.
 * E' per squadra, quindi non serializza nient'altro.
 */
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

  if v_membri >= 5 then
    raise exception 'squadra_piena';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_licei_squadra_capienza on public.licei_iscrizioni;
create trigger trg_licei_squadra_capienza
  before insert or update of squadra_id on public.licei_iscrizioni
  for each row execute function public.licei_squadra_capienza();

-- ── 3. Progetti ────────────────────────────────────────────────────────
-- I campi non sono un questionario: sono i criteri dell'art. 7 girati in
-- domande. Se la Commissione assegna 15 punti agli aspetti etici, il modulo
-- deve chiederli, altrimenti valuta qualcosa che nessuno ha chiesto.
create table if not exists public.licei_progetti (
  id            uuid        primary key default gen_random_uuid(),
  -- Una squadra, un progetto.
  squadra_id    uuid        not null unique references public.licei_squadre (id) on delete cascade,
  -- Ricopiata dalla squadra per non doverla raggiungere con due join a ogni
  -- schermata dello staff. Non c'e rischio che divergano: una squadra non
  -- cambia istituto, il vincolo sui membri lo impedisce.
  adesione_id   uuid        not null references public.licei_adesioni (id) on delete cascade,

  titolo        text        not null default '',
  -- Art. 3: sanitario, ambientale o industriale.
  ambito        text        check (ambito is null or ambito in (
                  'sanitario', 'ambientale', 'industriale'
                )),

  -- Un campo per criterio dell'art. 7.
  problema      text        not null default '',   -- innovativita
  soluzione     text        not null default '',   -- innovativita
  tecnologie    text        not null default '',   -- fattibilita tecnica
  impatto       text        not null default '',   -- impatto potenziale
  etica         text        not null default '',   -- aspetti etici
  metodo        text        not null default '',   -- lavoro di squadra e metodo
  -- Presentazione, video, prototipo. Un link, non un caricamento: il sito
  -- non conserva file prodotti da minori se puo evitarlo.
  link_materiali text,

  stato         text        not null default 'bozza' check (stato in (
                  'bozza', 'consegnato', 'ritirato'
                )),
  consegnato_at timestamptz,

  -- ── Esito (art. 6) ──
  finalista     boolean     not null default false,
  posizione     int         check (posizione is null or posizione between 1 and 100),
  -- Quando i componenti sono stati iscritti d'ufficio all'evento. Nullo
  -- finche non succede, cosi l'operazione si puo rifare senza duplicare.
  iscritti_evento_at timestamptz,

  note_staff    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists licei_progetti_adesione_idx  on public.licei_progetti (adesione_id);
create index if not exists licei_progetti_stato_idx     on public.licei_progetti (stato);
create index if not exists licei_progetti_finalista_idx on public.licei_progetti (finalista);

drop trigger if exists trg_licei_progetti_touch on public.licei_progetti;
create trigger trg_licei_progetti_touch
  before update on public.licei_progetti
  for each row execute function public.licei_touch_updated_at();

-- ── 4. Commissione (art. 8) ────────────────────────────────────────────
-- Chi valuta non e lo staff. Il pannello staff apre e chiude le fasi, la
-- Commissione da i voti, e sono due elenchi di persone diversi: un admin
-- che non e commissario non vota, un commissario che non e admin non tocca
-- la configurazione.
create table if not exists public.licei_commissari (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null unique references auth.users (id) on delete cascade,
  nome          text        not null,
  cognome       text        not null,
  email         text        not null,
  -- Il ruolo dell'art. 8: presidente, organizzatore, esperto, mentor,
  -- referente del consorzio.
  ruolo         text,
  /**
   * L'art. 8 mette in Commissione il referente del consorzio dei licei "con
   * funzioni consultive e SENZA DIRITTO DI VOTO". Senza questa colonna
   * l'unico modo di rispettarlo sarebbe chiedergli di non compilare la
   * scheda, che non e un controllo. Vede i progetti e scrive note, i suoi
   * numeri non entrano nella media.
   */
  diritto_voto  boolean     not null default true,
  attivo        boolean     not null default true,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists licei_commissari_email_idx on public.licei_commissari (lower(email));

drop trigger if exists trg_licei_commissari_touch on public.licei_commissari;
create trigger trg_licei_commissari_touch
  before update on public.licei_commissari
  for each row execute function public.licei_touch_updated_at();

-- ── 5. Valutazioni ─────────────────────────────────────────────────────
-- Una riga per progetto e per commissario. I punteggi sono sei colonne e non
-- un jsonb perche i criteri dell'art. 7 non cambiano senza cambiare il
-- bando: con le colonne il massimo di ciascuno lo impone il database.
create table if not exists public.licei_valutazioni (
  id             uuid       primary key default gen_random_uuid(),
  progetto_id    uuid       not null references public.licei_progetti (id) on delete cascade,
  commissario_id uuid       not null references public.licei_commissari (id) on delete cascade,

  p_innovativita   numeric(5,2) check (p_innovativita   is null or p_innovativita   between 0 and 25),
  p_fattibilita    numeric(5,2) check (p_fattibilita    is null or p_fattibilita    between 0 and 20),
  p_impatto        numeric(5,2) check (p_impatto        is null or p_impatto        between 0 and 20),
  p_etica          numeric(5,2) check (p_etica          is null or p_etica          between 0 and 15),
  p_squadra        numeric(5,2) check (p_squadra        is null or p_squadra        between 0 and 10),
  p_presentazione  numeric(5,2) check (p_presentazione  is null or p_presentazione  between 0 and 10),

  -- Somma dei sei, calcolata dal database: nessuna schermata puo sbagliarla
  -- e nessuna riga puo dissentire dai suoi addendi.
  totale numeric(6,2) generated always as (
    coalesce(p_innovativita, 0) + coalesce(p_fattibilita, 0) + coalesce(p_impatto, 0) +
    coalesce(p_etica, 0) + coalesce(p_squadra, 0) + coalesce(p_presentazione, 0)
  ) stored,

  nota           text,
  -- Finche e falsa la scheda e un appunto privato del commissario e non
  -- entra in classifica. Il voto si consegna, non si lascia a meta.
  chiusa         boolean    not null default false,
  chiusa_at      timestamptz,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint licei_valutazioni_una_per_commissario unique (progetto_id, commissario_id)
);

create index if not exists licei_valutazioni_progetto_idx on public.licei_valutazioni (progetto_id);

drop trigger if exists trg_licei_valutazioni_touch on public.licei_valutazioni;
create trigger trg_licei_valutazioni_touch
  before update on public.licei_valutazioni
  for each row execute function public.licei_touch_updated_at();

-- ── 6. Configurazione delle nuove fasi ─────────────────────────────────
-- Ogni fase ha il suo interruttore e parte CHIUSA, come le iscrizioni. Le
-- fasi si aprono in ordine e a mano: aprire le consegne prima che esistano
-- le squadre, o la valutazione prima che esistano i progetti, produce
-- schermate che non hanno niente da mostrare.
insert into public.licei_config (chiave, valore) values
  ('stato_squadre',            'chiuse'),
  ('stato_consegne',           'chiuse'),
  ('scadenza_consegna_label',  ''),
  ('stato_valutazione',        'chiusa')
on conflict (chiave) do nothing;

-- ── 7. Row Level Security ──────────────────────────────────────────────
-- Come per le altre tabelle del modulo: le scritture passano dalle API con
-- service role, e qui non c'e nessuna policy di insert o update.
alter table public.licei_squadre     enable row level security;
alter table public.licei_progetti    enable row level security;
alter table public.licei_commissari  enable row level security;
alter table public.licei_valutazioni enable row level security;

-- Lo studente vede la propria squadra.
drop policy if exists "Students can view own squadra" on public.licei_squadre;
create policy "Students can view own squadra"
  on public.licei_squadre for select
  using (exists (
    select 1 from public.licei_iscrizioni i
    where i.squadra_id = licei_squadre.id and i.user_id = auth.uid()
  ));

-- Il referente vede le squadre del proprio istituto.
drop policy if exists "Referents can view own school squadre" on public.licei_squadre;
create policy "Referents can view own school squadre"
  on public.licei_squadre for select
  using (exists (
    select 1 from public.licei_adesioni a
    where a.id = licei_squadre.adesione_id and a.user_id = auth.uid()
  ));

drop policy if exists "Admins can view all squadre" on public.licei_squadre;
create policy "Admins can view all squadre"
  on public.licei_squadre for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.partnership_level = 'admin'
  ));

-- Il progetto lo vede la squadra che lo scrive.
drop policy if exists "Students can view own progetto" on public.licei_progetti;
create policy "Students can view own progetto"
  on public.licei_progetti for select
  using (exists (
    select 1 from public.licei_iscrizioni i
    where i.squadra_id = licei_progetti.squadra_id and i.user_id = auth.uid()
  ));

drop policy if exists "Referents can view own school progetti" on public.licei_progetti;
create policy "Referents can view own school progetti"
  on public.licei_progetti for select
  using (exists (
    select 1 from public.licei_adesioni a
    where a.id = licei_progetti.adesione_id and a.user_id = auth.uid()
  ));

-- La Commissione vede i progetti CONSEGNATI, non le bozze. Una bozza a meta
-- non e un progetto: e un lavoro in corso, e giudicarlo sarebbe ingiusto.
drop policy if exists "Commissari can view consegnati" on public.licei_progetti;
create policy "Commissari can view consegnati"
  on public.licei_progetti for select
  using (
    stato = 'consegnato'
    and exists (
      select 1 from public.licei_commissari c
      where c.user_id = auth.uid() and c.attivo
    )
  );

drop policy if exists "Admins can view all progetti" on public.licei_progetti;
create policy "Admins can view all progetti"
  on public.licei_progetti for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.partnership_level = 'admin'
  ));

-- Il commissario vede la propria anagrafica, lo staff tutte.
drop policy if exists "Commissari can view self" on public.licei_commissari;
create policy "Commissari can view self"
  on public.licei_commissari for select
  using (user_id = auth.uid());

drop policy if exists "Admins can view all commissari" on public.licei_commissari;
create policy "Admins can view all commissari"
  on public.licei_commissari for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.partnership_level = 'admin'
  ));

-- Il commissario vede le PROPRIE schede e nessun'altra. Non e riservatezza
-- fine a se stessa: vedere il voto di un collega prima di dare il proprio
-- lo ancora, e la media di cinque giudizi ancorati vale meno di cinque
-- giudizi indipendenti.
drop policy if exists "Commissari can view own valutazioni" on public.licei_valutazioni;
create policy "Commissari can view own valutazioni"
  on public.licei_valutazioni for select
  using (exists (
    select 1 from public.licei_commissari c
    where c.id = licei_valutazioni.commissario_id and c.user_id = auth.uid()
  ));

drop policy if exists "Admins can view all valutazioni" on public.licei_valutazioni;
create policy "Admins can view all valutazioni"
  on public.licei_valutazioni for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.partnership_level = 'admin'
  ));

-- ── 8. Classifica (art. 7) ─────────────────────────────────────────────
/**
 * La classifica dei progetti consegnati.
 *
 * Media dei totali delle sole schede CHIUSE dei commissari con diritto di
 * voto: le schede a meta e il referente del consorzio (art. 8) restano
 * fuori dal calcolo.
 *
 * L'ordine e quello che l'art. 7 impone: punteggio complessivo, e a parita
 * l'innovativita, che il bando indica come criterio dirimente. Il terzo
 * livello e la data di consegna, che non e nel bando ma serve a rendere
 * l'ordinamento deterministico: senza, due progetti identici cambierebbero
 * posizione a ogni query.
 */
create or replace function public.licei_classifica()
returns table (
  progetto_id     uuid,
  squadra_id      uuid,
  squadra_nome    text,
  istituto        text,
  titolo          text,
  ambito          text,
  stato           text,
  componenti      bigint,
  schede          bigint,
  media_totale    numeric,
  media_innovativita numeric,
  finalista       boolean,
  posizione       int,
  consegnato_at   timestamptz
)
language sql
stable
security definer set search_path = ''
as $$
  select
    p.id,
    s.id,
    s.nome,
    a.istituto_denominazione,
    p.titolo,
    p.ambito,
    p.stato,
    (select count(*) from public.licei_iscrizioni i where i.squadra_id = s.id),
    count(v.id),
    round(avg(v.totale), 2),
    round(avg(v.p_innovativita), 2),
    p.finalista,
    p.posizione,
    p.consegnato_at
  from public.licei_progetti p
  join public.licei_squadre  s on s.id = p.squadra_id
  join public.licei_adesioni a on a.id = p.adesione_id
  left join public.licei_valutazioni v
    on v.progetto_id = p.id
   and v.chiusa
   and exists (
     select 1 from public.licei_commissari c
     where c.id = v.commissario_id and c.diritto_voto and c.attivo
   )
  where p.stato = 'consegnato'
  group by p.id, s.id, s.nome, a.istituto_denominazione
  order by
    round(avg(v.totale), 2)          desc nulls last,
    round(avg(v.p_innovativita), 2)  desc nulls last,
    p.consegnato_at                  asc;
$$;

revoke all on function public.licei_classifica() from anon, authenticated;

-- ── 9. Riepilogo delle squadre per il pannello ─────────────────────────
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
       group by squadra_id having count(*) >= 2
     ) q),
    (select count(*) from public.licei_iscrizioni where squadra_id is not null),
    (select count(*) from public.licei_progetti where stato = 'bozza'),
    (select count(*) from public.licei_progetti where stato = 'consegnato');
$$;

revoke all on function public.licei_squadre_stats() from anon, authenticated;

-- ── 10. Verifica ───────────────────────────────────────────────────────
-- select chiave, valore from public.licei_config order by chiave;
-- select * from public.licei_classifica();
-- select s.nome, count(i.id) as componenti
--   from public.licei_squadre s
--   left join public.licei_iscrizioni i on i.squadra_id = s.id
--   group by s.id, s.nome order by componenti desc;
