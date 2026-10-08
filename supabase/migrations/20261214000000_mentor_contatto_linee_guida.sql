-- =========================================================
-- Migration: contatto per gli studenti e linee guida dei mentor
--
-- Fino a qui i mentor erano una cosa del solo percorso universitario, e lo
-- studente li raggiungeva in un modo solo: l'abbinamento con la sua squadra,
-- deciso dallo staff. Da qui l'elenco dei mentor si apre a TUTTI i
-- partecipanti del percorso, liceali compresi, secondo le "Linee guida per
-- mentor" della Fondazione:
--
--   - il mentor mette a disposizione un contatto professionale;
--   - lo studente lo usa di sua iniziativa, fuori dalla piattaforma;
--   - la Fondazione non trasmette ai mentor i dati degli studenti e non
--     organizza ne registra le comunicazioni.
--
-- Tre colonne, tutte facoltative:
--
--   contatto_studenti         email professionale o pagina di contatto.
--                             La mostra solo la rotta /api/eventi/mentor, a
--                             chi ha fatto l'accesso ed e partecipante del
--                             percorso, e solo se il mentor ha accettato le
--                             linee guida. MAI nella pagina pubblica.
--   linee_guida_accettate_at  quando le ha accettate (dal modulo, oppure
--                             registrato dallo staff se arrivate fuori dal
--                             sito).
--   linee_guida_testo         il testo accettato, per la stessa ragione dei
--                             testi dei consensi: fra un anno la data da sola
--                             non dice a che cosa si e detto si.
--
-- Additiva e rieseguibile. Il codice regge anche PRIMA che questa migrazione
-- sia applicata: se le colonne mancano, la candidatura si salva senza i
-- campi nuovi e l'elenco per i partecipanti esce senza contatti.
-- =========================================================

alter table public.universita_mentor
  add column if not exists contatto_studenti        text,
  add column if not exists linee_guida_accettate_at timestamptz,
  add column if not exists linee_guida_testo        text;

-- Un contatto che c'e deve essere corto abbastanza da essere un contatto.
-- Il formato (email oppure http/https) lo controlla la rotta, che lo spiega
-- con una frase; qui resta solo il tetto, che e la rete sotto.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'universita_mentor_contatto_studenti_len'
      and conrelid = 'public.universita_mentor'::regclass
  ) then
    alter table public.universita_mentor
      add constraint universita_mentor_contatto_studenti_len
      check (contatto_studenti is null or char_length(contatto_studenti) <= 300);
  end if;
end $$;

-- ── Privilegi di colonna ───────────────────────────────────────────────
-- La 20261211000000 ha tolto il SELECT sull'intera tabella ad anon e
-- authenticated e lo ha ridato colonna per colonna. Una colonna aggiunta
-- dopo, quindi, nasce gia invisibile a quei due ruoli: e il verso giusto in
-- cui sbagliare, e qui NON la si aggiunge al grant.
--
-- Il contatto non va dato ad anon (la pagina pubblica non lo mostra e non
-- deve poterlo leggere nessuno da fuori) e nemmeno ad authenticated: un
-- account qualsiasi del sito non e un partecipante del percorso, e la
-- policy "Anyone can view published mentors" gli farebbe leggere i
-- contatti di tutti con una query dal browser. Chi ha diritto li riceve
-- dalla rotta, che controlla il ruolo e legge con la service role.
--
-- La revoca esplicita qui sotto non toglie niente su un database in ordine.
-- Serve se qualcuno, a mano, avesse ridato il SELECT di tabella: in quel
-- caso NON basta, perche il privilegio di tabella copre tutte le colonne, e
-- VERIFICA.sql lo segnala. NON si riesegue qui `revoke select on table`:
-- revocare il privilegio di tabella revoca anche quelli di colonna, e la
-- pagina pubblica dei mentor resterebbe vuota.
revoke select (contatto_studenti, linee_guida_accettate_at, linee_guida_testo)
  on public.universita_mentor from anon, authenticated, public;
