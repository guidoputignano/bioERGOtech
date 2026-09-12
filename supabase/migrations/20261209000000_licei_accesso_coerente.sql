-- ─────────────────────────────────────────────────────────────────────────
-- Licei: "mai entrato" non puo contraddire il progresso sul corso.
--
-- In produzione e comparso uno studente confermato, con 2 lezioni su 21
-- completate, marcato "Mai entrato". Le due cose non possono stare insieme:
-- per consegnare la riflessione che chiude una lezione bisogna essere dentro.
--
-- La causa e che il badge si fidava di un segnale solo, `last_sign_in_at` di
-- `auth.users`, che per quell'account risulta nullo pur avendo lui una
-- sessione attiva e dei lavori consegnati. Perche resti nullo dipende da come
-- GoTrue tratta gli account creati dall'API di amministrazione e poi entrati
-- con un link di recupero, e da qui non e verificabile.
--
-- Il rimedio non e indovinare quel comportamento: e smettere di appendere
-- un'affermazione rivolta a un docente a un solo indizio. Uno studente e
-- entrato se ha una data di accesso **oppure** se ha consegnato almeno una
-- lezione. Cosi il badge non puo piu smentire la barra che gli sta accanto,
-- qualunque sia la ragione del nullo.
--
-- Da questo discendono le due modifiche qui sotto.
-- ─────────────────────────────────────────────────────────────────────────

-- ── 1. `licei_iscrizioni_stats` perde `mai_entrati` ────────────────────
--
-- Non perche il conteggio non serva, ma perche qui non si puo piu calcolare:
-- ora dipende anche dalle lezioni consegnate, e `lesson_submissions` non ha
-- una migrazione nel repository, quindi una funzione SQL non puo leggerla
-- senza far fallire le migrazioni su un ambiente nuovo.
--
-- Il conteggio si sposta nella rotta dello staff, dove i due segnali si
-- incontrano. Lasciarlo anche qui avrebbe creato due definizioni della stessa
-- parola, ed e esattamente il modo in cui questo bug tornerebbe.
drop function if exists public.licei_iscrizioni_stats();

create function public.licei_iscrizioni_stats()
returns table (
  adesione_id  uuid,
  iscritti     bigint,
  in_attesa    bigint,
  confermate   bigint
)
language sql
stable
security definer set search_path = ''
as $$
  select
    i.adesione_id,
    count(*)                                        as iscritti,
    count(*) filter (where i.stato = 'in_attesa')   as in_attesa,
    count(*) filter (where i.stato = 'confermata')  as confermate
  from public.licei_iscrizioni i
  group by i.adesione_id;
$$;

revoke all on function public.licei_iscrizioni_stats() from anon, authenticated;

-- ── 2. Gli accessi di tutti, per il pannello staff ─────────────────────
--
-- Il gemello senza filtro di `licei_accessi_istituto`, che resta com'e ed e
-- l'unico che il referente usa. Questo lo chiama solo la rotta dello staff,
-- dietro `requireAdmin`, perche lo staff deve contare su tutti gli istituti e
-- una funzione filtrata per scuola gli imporrebbe una chiamata per scuola.
--
-- Restano due funzioni distinte invece di una con parametro facoltativo: il
-- confine del referente deve stare dentro la funzione e non nelle mani di chi
-- la chiama, e un parametro che se lasciato vuoto restituisce tutto e un
-- confine che si apre per dimenticanza.
create or replace function public.licei_accessi_tutti()
returns table (
  iscrizione_id   uuid,
  adesione_id     uuid,
  stato           text,
  ha_account      boolean,
  ultimo_accesso  timestamptz
)
language sql
stable
security definer set search_path = ''
as $$
  select
    i.id,
    i.adesione_id,
    i.stato,
    i.user_id is not null  as ha_account,
    u.last_sign_in_at
  from public.licei_iscrizioni i
  left join auth.users u on u.id = i.user_id;
$$;

revoke all on function public.licei_accessi_tutti() from anon, authenticated;

-- ── 3. Verifica ────────────────────────────────────────────────────────
-- select * from public.licei_iscrizioni_stats();
-- select * from public.licei_accessi_tutti();
