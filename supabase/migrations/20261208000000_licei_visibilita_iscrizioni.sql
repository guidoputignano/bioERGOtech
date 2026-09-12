-- ─────────────────────────────────────────────────────────────────────────
-- Licei: rendere visibili gli studenti veri e chi non e mai entrato.
--
-- Due buchi di visibilita, non di dati. I dati ci sono gia, non li guarda
-- nessuno.
--
-- 1. Il pannello staff legge solo `licei_adesioni`. Il numero "Studenti
--    previsti" che mostra viene da `licei_stats()`, che somma
--    `studenti_totale`: una previsione scritta a mano dal docente quando
--    aderisce, non un conteggio di iscritti. Fino a che le squadre non si
--    formano, lo staff non vede una sola iscrizione vera, e non sa se una
--    scuola confermata a settembre ha portato trenta ragazzi o zero.
--
-- 2. L'iscrizione crea l'account dello studente e gli manda il link per
--    impostare la password. Se non lo apre, l'account resta senza password e
--    lui non entra nel corso, ma in ogni schermata risulta iscritto e
--    confermato. E' un fallimento silenzioso e individuale: non se ne
--    accorge nessuno, ne il referente ne lo staff, e se ne accorgono tardi.
--
-- Le due funzioni qui sotto leggono `auth.users`, che PostgREST non espone.
-- Sono `security definer` e revocate ad anon e authenticated: le chiama solo
-- il client con la service role key, dietro le guardie gia esistenti
-- (`requireAdmin` per lo staff, `requireReferente` per il docente).
-- ─────────────────────────────────────────────────────────────────────────

-- ── 1. Numeri veri delle iscrizioni, per istituto ──────────────────────
--
-- Una riga per adesione che ha almeno un'iscrizione. Il pannello la affianca
-- alla previsione dichiarata: lo scarto fra le due e l'informazione utile.
--
-- `mai_entrati` conta solo chi e ancora in gioco, cioe in attesa o
-- confermato. Un ritirato che non ha mai fatto accesso non e un problema da
-- risolvere, e in mezzo agli altri sarebbe rumore.
create or replace function public.licei_iscrizioni_stats()
returns table (
  adesione_id  uuid,
  iscritti     bigint,
  in_attesa    bigint,
  confermate   bigint,
  mai_entrati  bigint
)
language sql
stable
security definer set search_path = ''
as $$
  select
    i.adesione_id,
    count(*)                                        as iscritti,
    count(*) filter (where i.stato = 'in_attesa')   as in_attesa,
    count(*) filter (where i.stato = 'confermata')  as confermate,
    count(*) filter (
      where i.stato in ('in_attesa', 'confermata')
        and u.last_sign_in_at is null
    )                                               as mai_entrati
  from public.licei_iscrizioni i
  left join auth.users u on u.id = i.user_id
  group by i.adesione_id;
$$;

revoke all on function public.licei_iscrizioni_stats() from anon, authenticated;

-- ── 2. Ultimo accesso, studente per studente ───────────────────────────
--
-- Filtrata per istituto perche la chiama il referente, che deve vedere i
-- suoi e nessun altro. Il filtro sta dentro la funzione e non nella rotta:
-- il client ha la service role key, quindi RLS non lo ferma, e una funzione
-- che restituisse tutto lascerebbe il confine in mano a chi la chiama.
--
-- Restituisce `null` per chi non ha mai fatto accesso, e per chi non ha un
-- account collegato. I due casi si somigliano ma non sono lo stesso, quindi
-- `ha_account` li tiene distinti: senza, un'iscrizione rimasta orfana di
-- account sembrerebbe uno studente pigro, e il rimedio sarebbe diverso.
create or replace function public.licei_accessi_istituto(p_adesione_id uuid)
returns table (
  iscrizione_id   uuid,
  ha_account      boolean,
  ultimo_accesso  timestamptz
)
language sql
stable
security definer set search_path = ''
as $$
  select
    i.id,
    i.user_id is not null  as ha_account,
    u.last_sign_in_at
  from public.licei_iscrizioni i
  left join auth.users u on u.id = i.user_id
  where i.adesione_id = p_adesione_id;
$$;

revoke all on function public.licei_accessi_istituto(uuid) from anon, authenticated;

-- ── 3. Verifica ────────────────────────────────────────────────────────
-- select * from public.licei_iscrizioni_stats();
-- select * from public.licei_accessi_istituto('<adesione_id>');
