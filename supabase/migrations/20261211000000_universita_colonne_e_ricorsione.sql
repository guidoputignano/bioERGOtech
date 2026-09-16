-- =========================================================
-- Migration: correzioni alla RLS del percorso universitario
--
-- Tre difetti della migrazione 20261210000000, trovati rileggendo il lavoro
-- prima di proporlo. Due sono la stessa svista, e vale la pena dirla per
-- esteso perche e il genere di cosa che sembra a posto finche non lo e:
--
--   LA RLS DI POSTGRES FILTRA LE RIGHE, NON LE COLONNE.
--
-- Una policy `for select using (...)` decide QUALI RIGHE si vedono, e poi di
-- quelle righe consegna OGNI COLONNA. Le rotte di questo modulo lo sanno e
-- scelgono le colonne a mano, ma le rotte non sono l'unico modo di leggere
-- il database: PostgREST e esposto pubblicamente e la chiave publishable sta
-- nel bundle del browser per costruzione (`lib/supabase/client.ts`). Chiunque
-- puo quindi interrogare la tabella direttamente, e li le rotte non ci sono.
--
-- Il risultato era che:
--
--   1. la pagina pubblica dei mentor prometteva che il telefono "non compare
--      nella pagina pubblica", e la pagina infatti non lo mostra, ma un
--      `select *` anonimo su `universita_mentor` restituiva telefono, email,
--      note interne dello staff e i testi dei consensi di ogni mentor
--      approvato;
--
--   2. la bacheca prometteva che "nella bacheca non compare la tua email" e
--      che il recapito si scambia solo dopo una richiesta accettata. La
--      rotta mantiene la promessa, la policy no: un partecipante confermato
--      poteva leggere email, codice della candidatura e note dello staff di
--      chiunque fosse in bacheca. E dalle squadre aperte poteva leggere il
--      `codice`, cioe la chiave per entrare senza chiedere permesso a
--      nessuno, che e esattamente cio che la stretta di mano doveva impedire.
--
-- Il rimedio giusto non e un'altra policy: e il privilegio di colonna, che
-- PostgREST rispetta. Si revoca il SELECT sull'intera tabella e si concede
-- solo sulle colonne che quel ruolo puo davvero vedere. Da qui in avanti una
-- rotta distratta, o una query scritta dal browser, non possono esporre piu
-- di quanto il database stesso conceda.
--
-- Il terzo difetto e una ricorsione: una policy su `universita_candidature`
-- che per decidere interrogava `universita_candidature`. Lo stesso file la
-- descriveva trentotto righe prima e costruiva l'helper apposta per evitarla.
-- =========================================================

-- ── 1. La ricorsione ───────────────────────────────────────────────────
/**
 * `squadra_id in (select ... from universita_candidature)` dentro una policy
 * SU `universita_candidature` fa abortire l'intero statement con 42P17,
 * "infinite recursion detected in policy". E non cade da sola: le policy
 * permissive di SELECT si fondono in un'unica espressione OR, quindi
 * trascina con se anche la policy della bacheca, che e scritta bene.
 *
 * Stesso rimedio di `universita_e_confermato`, e per la stessa ragione:
 * `security definer` legge scavalcando la RLS e spezza il ciclo. Come
 * quella, NON si revoca da `authenticated`, perche le espressioni di una
 * policy sono valutate con i privilegi di chi interroga.
 */
create or replace function public.universita_squadra_di(p_user uuid)
returns uuid
language sql
stable
security definer set search_path = ''
as $$
  select c.squadra_id
  from public.universita_candidature c
  where c.user_id = p_user and c.squadra_id is not null
  limit 1;
$$;

drop policy if exists "Teammates can view each other" on public.universita_candidature;
create policy "Teammates can view each other"
  on public.universita_candidature for select
  using (
    squadra_id is not null
    and squadra_id = public.universita_squadra_di(auth.uid())
  );

-- ── 2. Colonne di `universita_mentor` ──────────────────────────────────
-- Quello che la pagina pubblica mostra davvero, e nient'altro. Fuori
-- restano: `email` e `telefono`, che servono allo staff per organizzare gli
-- incontri; `note_staff`, che e un appunto interno; `user_id`, che lega la
-- riga a un account; i testi dei consensi, che sono prova e non contenuto;
-- `origine`, che dice se il mentor si e proposto o se lo ha inserito la
-- Fondazione, e non riguarda chi legge.
revoke select on public.universita_mentor from anon, authenticated;
grant select (
  id, nome, cognome, ruolo, organizzazione, aree, bio, competenze,
  disponibilita, sito, linkedin, foto_url, stato, consenso_pubblicazione,
  created_at, updated_at
) on public.universita_mentor to anon, authenticated;

-- ── 3. Colonne di `universita_candidature` ─────────────────────────────
-- Le sole colonne della bacheca, che sono anche le sole che un compagno di
-- squadra ha bisogno di vedere. Fuori restano `email` e `codice`, che sono
-- il punto della stretta di mano, piu `interessi`, `note_staff`, i testi dei
-- consensi e la traccia di chi ha cambiato lo stato.
--
-- Conseguenza da conoscere: neanche il candidato puo piu leggere la propria
-- email o il proprio codice interrogando il database dal browser. Non e una
-- perdita, perche non e mai stato quello il modo: la sua area legge dalla
-- rotta, che gira con la service role e gli restituisce la sua riga intera.
-- Un privilegio di colonna vale per il ruolo, non per la riga, quindi le due
-- cose non si possono distinguere qui, e fra le due vince la piu stretta.
revoke select on public.universita_candidature from anon, authenticated;
grant select (
  id, nome, cognome, universita, corso_studi, livello, area, area_altro,
  board_nota, cerca_squadra, consenso_board, stato, squadra_id, squadra_ruolo,
  created_at, updated_at
) on public.universita_candidature to authenticated;

-- ── 4. Colonne di `universita_squadre` ─────────────────────────────────
/**
 * Qui la colonna da togliere e una sola ed e la piu importante di tutte.
 *
 * `codice` e la chiave con cui si entra in una squadra senza chiedere. La
 * policy "Participants can view open squadre" apre ogni squadra aperta a
 * ogni partecipante confermato, quindi consegnava a chiunque il codice di
 * chiunque: una squadra che si dichiara in cerca si sarebbe trovata dentro
 * chi voleva, e la richiesta di ingresso, che e il meccanismo su cui e
 * costruita meta della bacheca, sarebbe stata una formalita aggirabile in
 * un clic.
 *
 * Il codice lo restituisce la rotta, e solo ai componenti di quella squadra.
 */
revoke select on public.universita_squadre from anon, authenticated;
grant select (
  id, nome, stato, cerca_membri, cerca_nota, created_at, updated_at
) on public.universita_squadre to authenticated;

-- ── 5. La classifica non cancella i voti di chi si e dimesso ───────────
/**
 * `universita_classifica()` filtrava le schede anche per `k.attivo`, e
 * quindi disattivare un commissario a lavoro finito gli toglieva i voti
 * dalla media, in silenzio e a classifica gia formata.
 *
 * Non e quello che il pannello dichiara. Il messaggio di conferma dice a
 * chiare lettere che disattivare "gli toglie l'accesso e lascia i voti dove
 * sono", e indica la disattivazione proprio come l'alternativa prudente
 * all'eliminazione. Chi segue quel consiglio cambiava la classifica credendo
 * di non toccarla.
 *
 * `attivo` governa l'accesso alla console, non se un voto gia espresso e
 * chiuso continui a valere. La strada per togliere le schede esiste gia, ed
 * e l'eliminazione, che le cancella per cascata e lo dice.
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
      where k.id = v.commissario_id and k.diritto_voto
    )
  where p.stato = 'consegnato'
  group by p.id, s.id, s.nome
  order by
    round(avg(v.totale) filter (where v.chiusa), 2) desc nulls last,
    round(avg(v.p_innovativita) filter (where v.chiusa), 2) desc nulls last,
    p.consegnato_at asc;
$$;

revoke all on function public.universita_classifica() from anon, authenticated;

comment on function public.universita_squadra_di(uuid) is
  'La squadra di un utente, letta scavalcando la RLS. Esiste per spezzare la ricorsione di una policy su universita_candidature che per decidere deve leggere universita_candidature.';
