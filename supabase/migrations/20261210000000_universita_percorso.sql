-- =========================================================
-- Migration: il percorso universitario, dalla candidatura al giudizio
--
-- La migrazione 20261207000000 ha creato la raccolta delle pre-iscrizioni e
-- si e fermata li: una tabella, un codice, una email. Da quel momento il
-- candidato universitario non aveva un account, non entrava nel corso, non
-- formava una squadra e non consegnava niente. Questa migrazione costruisce
-- il resto, sul modello di 20261206000000 per i licei.
--
-- Le tre differenze strutturali rispetto ai licei, che spiegano tutto il
-- resto del disegno:
--
--   1. NON ESISTE L'ISTITUTO. Nei licei la squadra sta dentro una scuola
--      (`adesione_id`), perche e la scuola che raccoglie le candidature e
--      che risponde dei suoi studenti. Qui il candidato e il singolo, e
--      l'art. 2 INCORAGGIA i team fra atenei e fra discipline diverse.
--      Una squadra universitaria non ha quindi nessun ente proprietario, e
--      il vincolo "stessa scuola" non solo non si applica: sarebbe il
--      contrario di quello che il bando chiede.
--
--   2. NON ESISTE IL REFERENTE. Nei licei e il docente che dice "questo
--      ragazzo e mio" e da quella conferma dipende tutto. Qui quel ruolo lo
--      svolgono due cose diverse: lo stato della candidatura, che lo staff
--      controlla, e la richiesta di ingresso in squadra, che il capitano
--      accetta. Nessuno dei due e una formalita.
--
--   3. NON SONO MINORENNI. La cautela della migrazione dei licei sul minimo
--      dato raccolto nasce dall'eta dei suoi iscritti. Qui i candidati sono
--      adulti, quindi una bacheca in cui chi cerca compagni si rende
--      visibile ad altri candidati e possibile. Resta a consenso esplicito
--      e revocabile, e resta chiusa a chi non e nel percorso.
--
-- Da eseguire dopo 20261207000000_create_universita_candidature.sql.
-- =========================================================

-- ── 1. Configurazione delle fasi ───────────────────────────────────────
-- Chiave/valore, come `licei_config`, e per la stessa ragione: l'art. 11 del
-- bando rimanda termini e modalita ai canali ufficiali, quindi le date non
-- possono vivere in `content.ts`, dove ogni comunicazione degli organizzatori
-- richiederebbe un rilascio del sito.
--
-- Ogni fase parte CHIUSA e si apre a mano dal pannello staff. Aprire le
-- consegne prima che esistano le squadre produce una schermata che non ha
-- niente da mostrare a chi la apre.
create table if not exists public.universita_config (
  chiave      text        primary key,
  valore      text        not null default '',
  updated_at  timestamptz not null default now()
);

insert into public.universita_config (chiave, valore) values
  -- Con 'si' la candidatura nasce gia confermata e il candidato entra
  -- subito nel percorso. E' il default perche il corso e comunque gratuito
  -- e aperto a chiunque apra un account: tenerlo chiuso a un candidato
  -- sarebbe una recita, non un filtro. Lo staff lo mette a 'no' solo se
  -- l'art. 4 va davvero esercitato, cioe se le candidature superano i posti.
  ('conferma_automatica',     'si'),
  ('stato_squadre',           'chiuse'),
  ('stato_board',             'chiusa'),
  ('stato_consegne',          'chiuse'),
  ('scadenza_consegna_label', ''),
  ('stato_valutazione',       'chiusa'),
  ('avviso',                  '')
on conflict (chiave) do nothing;

create or replace function public.universita_config_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_universita_config_touch on public.universita_config;
create trigger trg_universita_config_touch
  before update on public.universita_config
  for each row execute function public.universita_config_touch();

-- Leggibile da chiunque: la pagina pubblica deve sapere se una fase e
-- aperta prima di sapere chi sta guardando. Le scritture passano solo dalla
-- service role key, come per `licei_config`.
alter table public.universita_config enable row level security;

drop policy if exists "Anyone can read universita config" on public.universita_config;
create policy "Anyone can read universita config"
  on public.universita_config for select
  using (true);

-- ── 2. Squadre ─────────────────────────────────────────────────────────
-- Nessuna colonna di appartenenza a un ateneo, e non e una dimenticanza:
-- vedere il punto 1 della testata.
create table if not exists public.universita_squadre (
  id            uuid        primary key default gen_random_uuid(),
  -- Codice che il capitano passa a chi conosce gia. Stesso alfabeto senza
  -- caratteri ambigui del codice della candidatura: si detta a voce, e una
  -- I scambiata per 1 manda una persona nella squadra sbagliata.
  codice        text        not null unique,
  nome          text        not null unique,

  stato         text        not null default 'aperta' check (stato in (
                  'aperta', 'sciolta'
                )),

  -- ── Bacheca (lato squadra) ──
  -- Una squadra incompleta puo dichiararsi in cerca. E' l'altra meta della
  -- bacheca: senza, chi non conosce nessuno vedrebbe solo altre persone
  -- sole, e non i gruppi che hanno un posto libero.
  cerca_membri  boolean     not null default false,
  cerca_nota    text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists universita_squadre_stato_idx  on public.universita_squadre (stato);
create index if not exists universita_squadre_cerca_idx  on public.universita_squadre (cerca_membri);

drop trigger if exists trg_universita_squadre_touch on public.universita_squadre;
create trigger trg_universita_squadre_touch
  before update on public.universita_squadre
  for each row execute function public.universita_touch_updated_at();

-- ── 3. La candidatura diventa una posizione nel percorso ───────────────
-- Fin qui `universita_candidature` era un modulo ricevuto. Da qui e lo stato
-- di una persona dentro il percorso: se e dentro, in che squadra sta, e se
-- sta cercando qualcuno.
alter table public.universita_candidature
  -- 'candidata'  : ricevuta, non ancora ammessa al percorso
  -- 'confermata' : nel percorso. Puo fare squadra, bacheca e consegna
  -- 'esclusa'    : fuori, per l'art. 4 o per rinuncia
  add column if not exists stato text not null default 'candidata'
    check (stato in ('candidata', 'confermata', 'esclusa')),

  add column if not exists squadra_id    uuid references public.universita_squadre (id) on delete set null,
  add column if not exists squadra_ruolo text
    check (squadra_ruolo is null or squadra_ruolo in ('capo', 'membro')),

  -- ── Bacheca (lato persona) ──
  -- Due interruttori e non uno. `consenso_board` e il permesso, che la
  -- persona da una volta e puo revocare; `cerca_squadra` e lo stato del
  -- momento, che si spegne da solo appena entra in una squadra. Tenerli
  -- separati significa che chi torna a cercare compagni non deve ridare un
  -- consenso che non ha mai ritirato.
  add column if not exists cerca_squadra       boolean not null default false,
  add column if not exists board_nota          text,
  add column if not exists consenso_board      boolean not null default false,
  add column if not exists consenso_board_testo text,

  add column if not exists note_staff          text,
  -- Quando lo staff ha cambiato lo stato, e chi. Serve a rispondere alla
  -- domanda "perche questa persona risulta esclusa" sei mesi dopo.
  add column if not exists stato_aggiornato_at timestamptz,
  add column if not exists stato_aggiornato_da uuid references auth.users (id) on delete set null;

create index if not exists universita_candidature_stato_idx   on public.universita_candidature (stato);
create index if not exists universita_candidature_squadra_idx on public.universita_candidature (squadra_id);
create index if not exists universita_candidature_board_idx
  on public.universita_candidature (cerca_squadra)
  where cerca_squadra;

-- Le candidature gia ricevute sono state presentate quando questo stato non
-- esisteva e nessuno ha chiesto loro niente di piu. Confermarle e l'unica
-- lettura onesta: sono state accettate alle condizioni di allora.
update public.universita_candidature set stato = 'confermata' where stato = 'candidata';

-- Un capitano per squadra, non due. L'indice e parziale: i membri semplici
-- non sono soggetti al vincolo.
create unique index if not exists universita_squadre_un_solo_capo
  on public.universita_candidature (squadra_id)
  where squadra_ruolo = 'capo';

/**
 * Tetto di cinque componenti per squadra.
 *
 * Cinque e il numero dei licei, e vale qui per la stessa ragione pratica:
 * e il gruppo che puo davvero scrivere un lavoro insieme e presentarlo al
 * completo. Il minimo di due non sta qui ma nella validazione della
 * consegna: una squadra nasce con una persona sola, che e il caso normale
 * del primo minuto, e non avrebbe senso rifiutarla.
 *
 * Il lock serializza gli ingressi nella stessa squadra: senza, due persone
 * che entrano nello stesso istante leggono entrambe quattro e diventano sei.
 * E' per squadra, quindi non serializza nient'altro.
 */
create or replace function public.universita_squadra_capienza()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_membri int;
  v_stato  text;
begin
  if new.squadra_id is null then
    return new;
  end if;

  -- Solo chi e nel percorso entra in una squadra. E' l'ultima rete, non la
  -- prima: l'API lo controlla gia, ma qui il vincolo e imposto e non sperato.
  if new.stato is distinct from 'confermata' then
    raise exception 'candidatura_non_confermata';
  end if;

  select stato into v_stato from public.universita_squadre where id = new.squadra_id;
  if v_stato is distinct from 'aperta' then
    raise exception 'squadra_sciolta';
  end if;

  perform pg_advisory_xact_lock(hashtext(new.squadra_id::text));

  select count(*) into v_membri
    from public.universita_candidature
    where squadra_id = new.squadra_id and id <> new.id;

  if v_membri >= 5 then
    raise exception 'squadra_piena';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_universita_squadra_capienza on public.universita_candidature;
create trigger trg_universita_squadra_capienza
  before insert or update of squadra_id on public.universita_candidature
  for each row execute function public.universita_squadra_capienza();

-- ── 4. Richieste di ingresso ───────────────────────────────────────────
/**
 * La stretta di mano della bacheca.
 *
 * Nei licei il codice della squadra basta, perche gira in una classe e chi
 * lo riceve lo ha ricevuto da un compagno. Qui la bacheca mette in contatto
 * persone che non si conoscono: se il codice bastasse anche qui, un gruppo
 * che si dichiara in cerca si troverebbe dentro chiunque passi, e per uscirne
 * dovrebbe sciogliersi. Con la richiesta, chi bussa si presenta e chi apre
 * decide.
 *
 * Il codice resta, per chi i compagni li ha gia: le due strade convivono.
 */
create table if not exists public.universita_richieste_squadra (
  id              uuid        primary key default gen_random_uuid(),
  squadra_id      uuid        not null references public.universita_squadre (id) on delete cascade,
  candidatura_id  uuid        not null references public.universita_candidature (id) on delete cascade,

  -- Chi ha bussato: 'candidato' se e la persona a chiedere di entrare,
  -- 'squadra' se e il capitano a invitare qualcuno visto in bacheca.
  origine         text        not null default 'candidato' check (origine in (
                    'candidato', 'squadra'
                  )),
  messaggio       text,

  stato           text        not null default 'in_attesa' check (stato in (
                    'in_attesa', 'accettata', 'rifiutata', 'ritirata'
                  )),
  deciso_at       timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Una richiesta viva per coppia. Le richieste chiuse non bloccano un
  -- secondo tentativo: l'indice e parziale.
  constraint universita_richieste_coppia unique (squadra_id, candidatura_id)
);

create index if not exists universita_richieste_squadra_idx
  on public.universita_richieste_squadra (squadra_id, stato);
create index if not exists universita_richieste_candidatura_idx
  on public.universita_richieste_squadra (candidatura_id, stato);

drop trigger if exists trg_universita_richieste_touch on public.universita_richieste_squadra;
create trigger trg_universita_richieste_touch
  before update on public.universita_richieste_squadra
  for each row execute function public.universita_touch_updated_at();

-- ── 5. Progetti ────────────────────────────────────────────────────────
-- I campi non sono un questionario: sono i criteri dell'art. 7 girati in
-- domande. Se la Commissione assegna 15 punti all'integrazione fra le due
-- discipline, il modulo deve chiederla, altrimenti valuta qualcosa che
-- nessuno ha chiesto.
create table if not exists public.universita_progetti (
  id            uuid        primary key default gen_random_uuid(),
  -- Una squadra, un progetto.
  squadra_id    uuid        not null unique references public.universita_squadre (id) on delete cascade,

  titolo        text        not null default '',
  -- Art. 1: sanitario, ambientale, industriale o sportivo. Lo sportivo c'e
  -- qui e non nei licei perche e la tematica dell'evento del 10 dicembre.
  ambito        text        check (ambito is null or ambito in (
                  'sanitario', 'ambientale', 'industriale', 'sportivo'
                )),

  -- Un campo per criterio dell'art. 7.
  ipotesi       text        not null default '',   -- innovativita e originalita
  stato_arte    text        not null default '',   -- innovativita e originalita
  metodo        text        not null default '',   -- solidita scientifica e metodologica
  integrazione  text        not null default '',   -- integrazione biotecnologie e IA
  impatto       text        not null default '',   -- impatto potenziale
  etica         text        not null default '',   -- aspetti etici e responsabilita
  -- Presentazione, dati, prototipo, preprint. Un link e non un caricamento:
  -- l'art. 9 chiede che dati e risultati tutelabili siano valutati PRIMA di
  -- essere divulgati, e un bucket sul sito e gia una divulgazione.
  link_materiali text,

  stato         text        not null default 'bozza' check (stato in (
                  'bozza', 'consegnato', 'ritirato'
                )),
  consegnato_at timestamptz,

  -- ── Esito (art. 6 e art. 9) ──
  vincitore     boolean     not null default false,
  posizione     int         check (posizione is null or posizione between 1 and 100),
  -- Il percorso di pubblicazione dell'art. 9, quando parte.
  avviato_pubblicazione_at timestamptz,

  note_staff    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists universita_progetti_stato_idx     on public.universita_progetti (stato);
create index if not exists universita_progetti_vincitore_idx on public.universita_progetti (vincitore);

drop trigger if exists trg_universita_progetti_touch on public.universita_progetti;
create trigger trg_universita_progetti_touch
  before update on public.universita_progetti
  for each row execute function public.universita_touch_updated_at();

-- ── 6. Commissione (art. 8) ────────────────────────────────────────────
-- Chi valuta non e lo staff. Il pannello staff apre e chiude le fasi, la
-- Commissione da i voti, e sono due elenchi di persone diversi: un admin che
-- non e commissario non vota, un commissario che non e admin non tocca la
-- configurazione.
create table if not exists public.universita_commissari (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null unique references auth.users (id) on delete cascade,
  nome          text        not null,
  cognome       text        not null,
  email         text        not null,
  -- I ruoli dell'art. 8: presidente (direzione scientifica della
  -- Fondazione), organizzatore (SafesPro), esperto, ricercatore, impresa.
  ruolo         text,
  diritto_voto  boolean     not null default true,
  attivo        boolean     not null default true,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists universita_commissari_email_idx on public.universita_commissari (lower(email));

drop trigger if exists trg_universita_commissari_touch on public.universita_commissari;
create trigger trg_universita_commissari_touch
  before update on public.universita_commissari
  for each row execute function public.universita_touch_updated_at();

-- ── 7. Valutazioni ─────────────────────────────────────────────────────
-- Una riga per progetto e per commissario. I punteggi sono sei colonne e non
-- un jsonb perche i criteri dell'art. 7 non cambiano senza cambiare il
-- bando: con le colonne il massimo di ciascuno lo impone il database.
--
-- I tetti sono quelli dell'art. 7 del bando universitario, che NON sono
-- quelli dei licei: 25 + 25 + 20 + 15 + 10 + 5.
create table if not exists public.universita_valutazioni (
  id             uuid       primary key default gen_random_uuid(),
  progetto_id    uuid       not null references public.universita_progetti (id) on delete cascade,
  commissario_id uuid       not null references public.universita_commissari (id) on delete cascade,

  p_innovativita  numeric(5,2) check (p_innovativita  is null or p_innovativita  between 0 and 25),
  p_solidita      numeric(5,2) check (p_solidita      is null or p_solidita      between 0 and 25),
  p_impatto       numeric(5,2) check (p_impatto       is null or p_impatto       between 0 and 20),
  p_integrazione  numeric(5,2) check (p_integrazione  is null or p_integrazione  between 0 and 15),
  p_etica         numeric(5,2) check (p_etica         is null or p_etica         between 0 and 10),
  p_presentazione numeric(5,2) check (p_presentazione is null or p_presentazione between 0 and 5),

  -- Somma dei sei, calcolata dal database: nessuna schermata puo sbagliarla
  -- e nessuna riga puo dissentire dai suoi addendi.
  totale numeric(6,2) generated always as (
    coalesce(p_innovativita, 0) + coalesce(p_solidita, 0) + coalesce(p_impatto, 0) +
    coalesce(p_integrazione, 0) + coalesce(p_etica, 0) + coalesce(p_presentazione, 0)
  ) stored,

  nota           text,
  -- L'art. 7 chiede alla Commissione di considerare anche se il progetto
  -- possa diventare un articolo sottoponibile a peer review. Non e un
  -- criterio a punti, quindi non e una colonna numerica: e un giudizio, e
  -- sta qui perche altrimenti resterebbe solo nella testa di chi lo da.
  pubblicabile   text check (pubblicabile is null or pubblicabile in (
                   'si', 'forse', 'no'
                 )),

  -- Finche e falsa la scheda e un appunto privato del commissario e non
  -- entra in classifica. Il voto si consegna, non si lascia a meta.
  chiusa         boolean    not null default false,
  chiusa_at      timestamptz,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint universita_valutazioni_una_per_commissario unique (progetto_id, commissario_id)
);

create index if not exists universita_valutazioni_progetto_idx
  on public.universita_valutazioni (progetto_id);

drop trigger if exists trg_universita_valutazioni_touch on public.universita_valutazioni;
create trigger trg_universita_valutazioni_touch
  before update on public.universita_valutazioni
  for each row execute function public.universita_touch_updated_at();

-- ── 8. Mentor (art. 3 e art. 5) ────────────────────────────────────────
/**
 * Il registro dei mentor, e perche e una tabella e non un array in TypeScript.
 *
 * Il sito tiene le persone in file versionati: `app/people/people.ts`,
 * `lib/team.ts`, `RELATORI` nel modulo evento. E' la scelta giusta per un
 * elenco curato a mano, che cambia raramente e che nessuno propone da fuori.
 *
 * Qui la proposta arriva da fuori. Un ricercatore che si candida come mentor
 * compila un modulo, e lo staff lo approva o no. Con un array in TypeScript
 * ogni approvazione sarebbe un commit e un rilascio del sito, e chi approva
 * non e chi rilascia: le candidature si accumulerebbero in attesa di uno
 * sviluppatore. Da qui la tabella.
 *
 * Quello che invece NON cambia e la regola del consenso: come `daAutorizzare`
 * per i relatori dell'evento, un mentor compare in pagina solo se ha
 * acconsentito a comparirci. Approvata e pubblicata sono due cose distinte.
 */
create table if not exists public.universita_mentor (
  id            uuid        primary key default gen_random_uuid(),
  -- Popolato solo quando lo staff da un account al mentor, cosa che serve
  -- se dovra vedere le squadre che segue. Una candidatura non crea account.
  user_id       uuid        references auth.users (id) on delete set null,

  nome          text        not null,
  cognome       text        not null,
  email         text        not null,
  -- Facoltativo e non pubblicato mai: serve allo staff per organizzare gli
  -- incontri, non alla pagina.
  telefono      text,

  ruolo         text        not null,
  organizzazione text       not null,
  -- Le stesse aree disciplinari dell'art. 2, cosi un candidato e un mentor
  -- si descrivono con lo stesso vocabolario e l'abbinamento e possibile.
  aree          text[]      not null default '{}',
  bio           text        not null default '',
  competenze    text        not null default '',
  -- Quanto tempo puo dare davvero. Chiederlo adesso evita la scoperta
  -- tardiva che un mentor assegnato non ha mai un'ora libera.
  disponibilita text,
  sito          text,
  linkedin      text,
  foto_url      text,

  stato         text        not null default 'proposta' check (stato in (
                  'proposta', 'approvata', 'respinta', 'sospesa'
                )),
  -- 'candidatura' se si e proposto da solo, 'staff' se lo ha inserito la
  -- Fondazione. Il secondo caso esiste: non tutti i mentor si autocandidano.
  origine       text        not null default 'candidatura' check (origine in (
                  'candidatura', 'staff'
                )),

  -- ── Consensi, registrati con il testo vigente al momento dell'invio ──
  consenso_pubblicazione boolean not null default false,
  consenso_privacy       boolean not null default false,
  consenso_pubblicazione_testo text,
  consenso_privacy_testo       text,

  note_staff    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index if not exists universita_mentor_email_uidx
  on public.universita_mentor (lower(email));
create index if not exists universita_mentor_stato_idx on public.universita_mentor (stato);

drop trigger if exists trg_universita_mentor_touch on public.universita_mentor;
create trigger trg_universita_mentor_touch
  before update on public.universita_mentor
  for each row execute function public.universita_touch_updated_at();

-- ── 9. Assegnazione dei mentor alle squadre ────────────────────────────
-- L'art. 5 promette "mentoring e accompagnamento alla progettazione
-- scientifica lungo tutto il percorso". Senza questa tabella quella promessa
-- resta una riga di testo in pagina: e il punto in cui il mentoring smette
-- di essere una descrizione e diventa un legame fra due righe.
create table if not exists public.universita_mentor_squadre (
  id          uuid        primary key default gen_random_uuid(),
  mentor_id   uuid        not null references public.universita_mentor (id) on delete cascade,
  squadra_id  uuid        not null references public.universita_squadre (id) on delete cascade,
  nota        text,
  created_at  timestamptz not null default now(),

  constraint universita_mentor_squadre_coppia unique (mentor_id, squadra_id)
);

create index if not exists universita_mentor_squadre_squadra_idx
  on public.universita_mentor_squadre (squadra_id);

-- ── 10. Chi e nel percorso, senza ricorsione ───────────────────────────
/**
 * Una policy su `universita_candidature` che per decidere interroga
 * `universita_candidature` ricorre all'infinito: Postgres rivaluta la policy
 * dentro se stessa. Questa funzione e `security definer`, quindi legge la
 * tabella scavalcando la RLS e spezza il ciclo.
 *
 * E' l'unico modo di avere una bacheca visibile ai soli partecipanti senza
 * aprire la tabella a tutti gli utenti autenticati.
 */
create or replace function public.universita_e_confermato(p_user uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.universita_candidature c
    where c.user_id = p_user and c.stato = 'confermata'
  );
$$;

-- ── 11. Row Level Security ─────────────────────────────────────────────
-- Come per il modulo licei: le scritture passano tutte dalle API con service
-- role, e qui non c'e nessuna policy di insert o di update. Quello che segue
-- decide solo chi PUO LEGGERE cosa se interroga il database con il proprio
-- account.
alter table public.universita_squadre            enable row level security;
alter table public.universita_richieste_squadra  enable row level security;
alter table public.universita_progetti           enable row level security;
alter table public.universita_commissari         enable row level security;
alter table public.universita_valutazioni        enable row level security;
alter table public.universita_mentor             enable row level security;
alter table public.universita_mentor_squadre     enable row level security;

-- La bacheca: chi e nel percorso vede chi ha acconsentito a farsi vedere, e
-- nessun altro. Le tre condizioni sulla riga letta non sono ridondanti
-- rispetto alla query dell'API: sono il motivo per cui un domani una query
-- distratta non puo esporre chi non ha dato il consenso.
drop policy if exists "Participants can view the teammate board"
  on public.universita_candidature;
create policy "Participants can view the teammate board"
  on public.universita_candidature for select
  using (
    cerca_squadra
    and consenso_board
    and stato = 'confermata'
    and public.universita_e_confermato(auth.uid())
  );

-- I compagni di squadra si vedono fra loro, bacheca o no: stanno lavorando
-- insieme.
drop policy if exists "Teammates can view each other" on public.universita_candidature;
create policy "Teammates can view each other"
  on public.universita_candidature for select
  using (
    squadra_id is not null
    and squadra_id in (
      select c.squadra_id from public.universita_candidature c
      where c.user_id = auth.uid() and c.squadra_id is not null
    )
  );

drop policy if exists "Participants can view open squadre" on public.universita_squadre;
create policy "Participants can view open squadre"
  on public.universita_squadre for select
  using (stato = 'aperta' and public.universita_e_confermato(auth.uid()));

drop policy if exists "Admins can view all universita squadre" on public.universita_squadre;
create policy "Admins can view all universita squadre"
  on public.universita_squadre for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.partnership_level = 'admin'
  ));

-- Una richiesta la vedono le due parti: chi l'ha mandata e la squadra a cui
-- e arrivata. Nessun altro partecipante.
drop policy if exists "Both sides can view a join request"
  on public.universita_richieste_squadra;
create policy "Both sides can view a join request"
  on public.universita_richieste_squadra for select
  using (
    exists (
      select 1 from public.universita_candidature c
      where c.id = universita_richieste_squadra.candidatura_id and c.user_id = auth.uid()
    )
    or exists (
      select 1 from public.universita_candidature m
      where m.squadra_id = universita_richieste_squadra.squadra_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "Admins can view all join requests"
  on public.universita_richieste_squadra;
create policy "Admins can view all join requests"
  on public.universita_richieste_squadra for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.partnership_level = 'admin'
  ));

-- Il progetto lo vede la squadra che lo scrive.
drop policy if exists "Teams can view own progetto" on public.universita_progetti;
create policy "Teams can view own progetto"
  on public.universita_progetti for select
  using (exists (
    select 1 from public.universita_candidature c
    where c.squadra_id = universita_progetti.squadra_id and c.user_id = auth.uid()
  ));

-- Il mentor vede i progetti delle squadre che segue, e solo quelli. E' il
-- senso dell'assegnazione: senza questa policy il mentoring resterebbe una
-- conversazione fuori dal sito.
drop policy if exists "Mentors can view assigned progetti" on public.universita_progetti;
create policy "Mentors can view assigned progetti"
  on public.universita_progetti for select
  using (exists (
    select 1
    from public.universita_mentor_squadre ms
    join public.universita_mentor m on m.id = ms.mentor_id
    where ms.squadra_id = universita_progetti.squadra_id
      and m.user_id = auth.uid()
      and m.stato = 'approvata'
  ));

-- La Commissione vede i progetti CONSEGNATI, non le bozze. Una bozza a meta
-- non e un progetto: e un lavoro in corso, e giudicarlo sarebbe ingiusto.
drop policy if exists "Commissari can view consegnati" on public.universita_progetti;
create policy "Commissari can view consegnati"
  on public.universita_progetti for select
  using (
    stato = 'consegnato'
    and exists (
      select 1 from public.universita_commissari c
      where c.user_id = auth.uid() and c.attivo
    )
  );

drop policy if exists "Admins can view all universita progetti" on public.universita_progetti;
create policy "Admins can view all universita progetti"
  on public.universita_progetti for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.partnership_level = 'admin'
  ));

drop policy if exists "Universita commissari can view self" on public.universita_commissari;
create policy "Universita commissari can view self"
  on public.universita_commissari for select
  using (user_id = auth.uid());

drop policy if exists "Admins can view all universita commissari" on public.universita_commissari;
create policy "Admins can view all universita commissari"
  on public.universita_commissari for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.partnership_level = 'admin'
  ));

-- Il commissario vede le PROPRIE schede e nessun'altra. Non e riservatezza
-- fine a se stessa: vedere il voto di un collega prima di dare il proprio lo
-- ancora, e la media di cinque giudizi ancorati vale meno di cinque giudizi
-- indipendenti.
drop policy if exists "Commissari can view own universita valutazioni"
  on public.universita_valutazioni;
create policy "Commissari can view own universita valutazioni"
  on public.universita_valutazioni for select
  using (exists (
    select 1 from public.universita_commissari c
    where c.id = universita_valutazioni.commissario_id and c.user_id = auth.uid()
  ));

drop policy if exists "Admins can view all universita valutazioni"
  on public.universita_valutazioni;
create policy "Admins can view all universita valutazioni"
  on public.universita_valutazioni for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.partnership_level = 'admin'
  ));

-- I mentor approvati E consenzienti sono pubblici: la pagina che li elenca
-- e aperta, e serve anche a chi sta valutando se candidarsi. Gli altri no.
drop policy if exists "Anyone can view published mentors" on public.universita_mentor;
create policy "Anyone can view published mentors"
  on public.universita_mentor for select
  using (stato = 'approvata' and consenso_pubblicazione);

drop policy if exists "Mentors can view own record" on public.universita_mentor;
create policy "Mentors can view own record"
  on public.universita_mentor for select
  using (user_id is not null and user_id = auth.uid());

drop policy if exists "Admins can view all mentors" on public.universita_mentor;
create policy "Admins can view all mentors"
  on public.universita_mentor for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.partnership_level = 'admin'
  ));

drop policy if exists "Teams and mentors can view their pairing"
  on public.universita_mentor_squadre;
create policy "Teams and mentors can view their pairing"
  on public.universita_mentor_squadre for select
  using (
    exists (
      select 1 from public.universita_candidature c
      where c.squadra_id = universita_mentor_squadre.squadra_id and c.user_id = auth.uid()
    )
    or exists (
      select 1 from public.universita_mentor m
      where m.id = universita_mentor_squadre.mentor_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "Admins can view all mentor pairings" on public.universita_mentor_squadre;
create policy "Admins can view all mentor pairings"
  on public.universita_mentor_squadre for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.partnership_level = 'admin'
  ));

-- ── 12. Classifica (art. 7) ────────────────────────────────────────────
/**
 * La classifica dei progetti consegnati.
 *
 * Media dei totali delle sole schede CHIUSE dei commissari con diritto di
 * voto: le schede a meta restano fuori dal calcolo, e chi siede in
 * Commissione senza voto non sposta la media.
 *
 * L'ordine e quello che l'art. 7 impone: punteggio complessivo, e a parita
 * l'innovativita, che il bando indica come criterio dirimente. Il terzo
 * livello e la data di consegna, che non e nel bando ma serve a rendere
 * l'ordinamento deterministico: senza, due progetti identici cambierebbero
 * posizione a ogni query.
 *
 * L'ulteriore parita, che l'art. 7 rimanda al voto del Presidente, non e
 * qui: e una decisione di una persona, e il database non la puo prendere.
 */
create or replace function public.universita_classifica()
returns table (
  progetto_id        uuid,
  squadra_id         uuid,
  squadra_nome       text,
  titolo             text,
  ambito             text,
  stato              text,
  componenti         bigint,
  atenei             bigint,
  schede             bigint,
  media_totale       numeric,
  media_innovativita numeric,
  vincitore          boolean,
  posizione          int,
  consegnato_at      timestamptz
)
language sql
stable
security definer set search_path = ''
as $$
  select
    p.id,
    s.id,
    s.nome,
    p.titolo,
    p.ambito,
    p.stato,
    (select count(*) from public.universita_candidature c where c.squadra_id = s.id),
    -- Quante universita diverse ci sono dentro. L'art. 2 incoraggia i team
    -- fra atenei, e senza questo numero nessuno saprebbe se e successo.
    (select count(distinct lower(c.universita))
       from public.universita_candidature c where c.squadra_id = s.id),
    count(v.id) filter (where v.chiusa),
    round(avg(v.totale) filter (where v.chiusa), 2),
    round(avg(v.p_innovativita) filter (where v.chiusa), 2),
    p.vincitore,
    p.posizione,
    p.consegnato_at
  from public.universita_progetti p
  join public.universita_squadre s on s.id = p.squadra_id
  left join public.universita_valutazioni v on v.progetto_id = p.id
    and exists (
      select 1 from public.universita_commissari k
      where k.id = v.commissario_id and k.diritto_voto and k.attivo
    )
  where p.stato = 'consegnato'
  group by p.id, s.id, s.nome
  order by
    round(avg(v.totale) filter (where v.chiusa), 2) desc nulls last,
    round(avg(v.p_innovativita) filter (where v.chiusa), 2) desc nulls last,
    p.consegnato_at asc;
$$;

-- ── 13. Contatori per il pannello staff ────────────────────────────────
create or replace function public.universita_stats()
returns table (
  candidature      bigint,
  confermate       bigint,
  escluse          bigint,
  con_account      bigint,
  in_squadra       bigint,
  cercano_squadra  bigint,
  squadre          bigint,
  progetti_bozza   bigint,
  progetti_consegnati bigint,
  mentor_proposti  bigint,
  mentor_approvati bigint
)
language sql
stable
security definer set search_path = ''
as $$
  select
    (select count(*) from public.universita_candidature),
    (select count(*) from public.universita_candidature where stato = 'confermata'),
    (select count(*) from public.universita_candidature where stato = 'esclusa'),
    (select count(*) from public.universita_candidature where user_id is not null),
    (select count(*) from public.universita_candidature where squadra_id is not null),
    (select count(*) from public.universita_candidature
       where cerca_squadra and consenso_board and squadra_id is null and stato = 'confermata'),
    (select count(*) from public.universita_squadre where stato = 'aperta'),
    (select count(*) from public.universita_progetti where stato = 'bozza'),
    (select count(*) from public.universita_progetti where stato = 'consegnato'),
    (select count(*) from public.universita_mentor where stato = 'proposta'),
    (select count(*) from public.universita_mentor where stato = 'approvata');
$$;

comment on table public.universita_squadre is
  'Squadre del percorso universitario. Senza ateneo di appartenenza: l''art. 2 incoraggia i team fra atenei e fra discipline diverse, quindi il vincolo dei licei "una squadra sta dentro un istituto" qui sarebbe il contrario di quello che il bando chiede.';

comment on table public.universita_richieste_squadra is
  'La stretta di mano della bacheca: chi cerca compagni chiede di entrare, il capitano accetta. Il codice della squadra resta la strada breve per chi i compagni li conosce gia.';

comment on table public.universita_mentor is
  'Registro dei mentor dell''art. 3. E'' una tabella e non un array versionato come app/people/people.ts perche le candidature arrivano da fuori e chi le approva non e chi rilascia il sito.';
