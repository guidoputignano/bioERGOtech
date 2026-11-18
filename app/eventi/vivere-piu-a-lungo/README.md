# Modulo evento: Vivere più a lungo, sport e intelligenza artificiale

Modulo autosufficiente e isolato. Tutta la logica vive in questa cartella
(`app/eventi/vivere-piu-a-lungo/`), in `app/api/eventi/`, in `lib/eventi/` e
in una sola migrazione SQL. Dopo l'evento si archivia con una flag, senza
perdere le iscrizioni.

## Configurazione (un solo punto)

Tutto cio che cambia tra edizioni sta in `content.ts`:

- `ARCHIVE_MODE`: metti a `true` a evento concluso. Nasconde i form e mostra
  il recap. Nessun dato viene cancellato. Le API di iscrizione rifiutano
  nuove richieste.
- `EVENT`: occhiello, titolo, sottotitolo, date e orari (etichette + ISO per
  i dati strutturati), luoghi, immagine Open Graph.
- `SESSIONS`: le due sessioni iscrivibili (una per giornata), con `capienza`. Le stesse capienze
  sono seminate nella migrazione SQL (tabella `event_sessions`), che resta la
  fonte di verita per il conteggio posti a runtime. Se cambi una capienza,
  aggiornala anche con una `update` su `event_sessions`.
- `CATEGORIE`, testi dei consensi, FAQ, stats: solo presentazione.
- `RELATORI` e `PROGRAMMA_GIORNO1`: ogni relatore ha un `id` stabile e la
  scaletta lo richiama per `id` nel campo `relatori` della voce di programma
  (`ospiti` per i nomi senza foto: gruppi, squadre, istituzioni). Il programma
  del giorno 1 e' un blocco unico: i volti compaiono dentro la card del panel
  in cui intervengono, non c'e' una seconda griglia di relatori da tenere
  allineata. Per spostare qualcuno da un panel a un altro basta spostare il suo
  `id`, e la pagina segue. L'ordine dell'array `RELATORI` non guida piu il
  layout: conta solo l'ordine degli `id` dentro ogni voce di programma.
- `daAutorizzare: true` su un relatore: chi non ha ancora dato il consenso
  all'uso di nome e foto resta in `RELATORI`, con la scheda gia' pronta, ma
  non compare da nessuna parte sulla pagina. La pagina legge
  `RELATORI_PUBBLICI`, che e' `RELATORI` senza chi e' in attesa, e da li'
  passano volti, nomi in riga, contatore delle stats e `performer` nei dati
  strutturati: un nome non autorizzato non puo' sfuggire da una sola di quelle
  strade. Puoi lasciare il suo `id` nella voce di programma, non risolve e il
  panel mostra gli altri. Quando l'autorizzazione arriva, togli la riga e
  ricompare ovunque.
- `nascosto: true` su un relatore: chi non interviene piu' all'evento. Stesso
  effetto di `daAutorizzare` (fuori da `RELATORI_PUBBLICI`, quindi da volti,
  nomi, contatore e dati strutturati), ma dice il motivo giusto. La scheda
  resta e l'`id` nel programma, se lo lasci, non risolve: se la persona torna,
  togli la riga.
- `STATS`: il numero di panel e di relatori e' calcolato dai dati, quindi non
  puo' divergere dal programma. Se aggiungi una voce o un relatore, i contatori
  si aggiornano da soli. Il contatore dei relatori conta i soli autorizzati,
  quindi cresce da se' quando togli un `daAutorizzare`.
- Foto relatori: `public/assets/images/eventi/vivere-piu-a-lungo/`, webp
  lossy 480x480 (circa 10 KB a foto). Se aggiungi un ritratto, convertilo con
  lo stesso formato prima di committarlo: i PNG a piena risoluzione pesano
  centinaia di volte tanto e finirebbero nel bundle statico.
- `PARTNER`: le realta coinvolte che compaiono con il loro logo nella sezione
  "Con la partecipazione di". I file stanno in
  `public/assets/images/eventi/vivere-piu-a-lungo/partner/`, webp con sfondo
  trasparente dove possibile, lato lungo circa 480px. La pagina li scala dentro
  un riquadro alto 72px con `object-contain`, quindi proporzioni diverse tra un
  logo e l'altro non sono un problema. `ruolo` e `url` sono opzionali: meglio
  lasciarli vuoti che scrivere una riga o un indirizzo non confermato.
- `daCaricare: true` su un logo o su una scheda del team: stesso principio di
  `daAutorizzare`, applicato al file invece che al consenso. Finche l'immagine
  non e in repository la voce resta nei dati, completa, ma fuori dalla pagina,
  cosi non pubblichiamo un'immagine rotta. Quando il file arriva, togli la riga
  e la scheda compare. La sezione dei loghi sparisce del tutto se nessun logo e
  ancora caricato.

## Database

Migrazioni:
`supabase/migrations/20261001000000_create_event_registrations.sql` (schema),
`supabase/migrations/20261101000000_update_event_sessions.sql` (prima
riallineamento delle sessioni) e
`supabase/migrations/20261201000000_update_event_sessions_palamazzola.sql`
(programma aggiornato: date 10 e 11 dicembre, giorno 1 al PalaMazzola con
panel e progetti dei ragazzi, giorno 2 al Teatro Fusco come showcase di
innovazione con premiazione e concerto).

In produzione queste due migrazioni di dati non erano state eseguite, e le
scelte del 10 dicembre andavano perse. `supabase/migrations/20261231300000_event_giorno1_ripristino.sql`
le applica (si può rieseguire senza effetti) e ridà il 10 dicembre a chi non
aveva nessuna giornata. Va eseguito a mano nello SQL editor di Supabase prima
di pubblicare il codice che lo presuppone.

Crea tre tabelle dedicate (`event_sessions`, `event_registrations`,
`event_registration_sessions`), una RPC atomica `event_register` con controllo
capienza (lock di riga, lista d'attesa al posto del rifiuto) e una funzione
`event_seats_remaining` per i posti liberi. Non tocca lo schema del Member
Portal. Le iscrizioni sono collegate al bacino tramite
`event_registrations.user_id` (FK verso `auth.users`).

Applicare la migrazione:

```bash
# con Supabase CLI
supabase db push

# oppure incollare il file nello SQL editor di Supabase
```

## Variabili d'ambiente (gia in uso nel progetto)

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (scritture iscrizioni, RPC, admin)
- `RESEND_API_KEY` (email di conferma, provider gia configurato)
- `NEXT_PUBLIC_SITE_URL` (link assoluti in email e biglietto, opzionale)
- `CRON_SECRET` (il cron `/api/cron/evento` del promemoria, come gli altri cron)
- `EVENT_CHECKIN_EMAILS` (facoltativa): le email dei volontari dell'ingresso,
  separate da virgole. Danno accesso solo alla pagina del check-in
  `/eventi/vivere-piu-a-lungo/admin/ingresso`, non al pannello. Ogni volontario
  deve avere un account con l'email confermata. Dopo averla cambiata in Vercel
  serve un nuovo deploy; va svuotata dopo l'11 dicembre. Dettagli in
  `lib/eventi/admin-guard.ts`.

## Sviluppo e deploy

```bash
npm install
npm run dev      # sviluppo locale
npm run build    # build di produzione
npm run lint     # lint
```

## Iscrizioni e account

Le giornate si chiamano per data ("10 dicembre", "11 dicembre") in tutto ciò
che le persone vedono. Gli slug `giorno-1` e `giorno-2` restano il codice
interno del database e dei moduli: non si rinominano.

L'iscrizione crea (o collega) un account nel Member Portal:

- utente gia loggato con la stessa email: l'iscrizione e collegata al suo account;
- email gia registrata: collega all'account esistente;
- nuova email: crea l'utente; l'email del biglietto spiega come scegliere la
  password da `/auth/forgot-password`. Se la creazione dell'account fallisce,
  l'iscrizione va avanti lo stesso.

Controlli che fermano l'iscrizione invece di perderla in silenzio:

- una giornata scelta che non esiste in `event_sessions` (503, e un errore nei
  log che indica il file SQL di ripristino);
- dopo l'RPC, una giornata scelta che non torna nel risultato (500, nessuna
  email);
- la stessa email usata per un'altra persona (409: ogni partecipante si
  iscrive con la propria email);
- un refuso evidente nel dominio dell'email.

Reiscriversi con la stessa email e lo stesso nome aggiunge le giornate e
rimanda il biglietto con tutte le giornate. Dal biglietto online (sezione
"Gestisci") la persona libera il posto di una giornata, ne aggiunge un'altra o
si fa rimandare il biglietto (`/api/eventi/registrations/gestisci`).

Il consenso marketing (opt-in separato, non preselezionato) viene salvato con
timestamp e testo, e l'iscritto finisce anche in `newsletter_subscribers`
(stesso bacino del resto del sito).

## Pannello, export e ingresso (staff)

- Pannello `/eventi/vivere-piu-a-lungo/admin` (solo admin) con quattro schede:
  - **Riepilogo**: allarmi in rosso se una giornata manca nel database o ci
    sono iscrizioni senza giornata; per ogni giornata confermati, lista
    d'attesa, entrati e posti liberi; andamento delle iscrizioni, categorie,
    scuole e organizzazioni. Si aggiorna ogni minuto.
  - **Iscritti**: ricerca, filtri per giornata, stato e categoria; presenza;
    conferma dalla lista d'attesa (con email "si è liberato un posto");
    rimozione da una giornata; reinvio del biglietto; eliminazione delle
    iscrizioni rimaste senza giornata.
  - **Ingresso**: il check-in alla porta (vedi sotto).
  - **Comunicazioni**: il biglietto aggiornato (una volta, a tutti) e il
    promemoria (automatico l'8 dicembre, dal cron `/api/cron/evento`).
- Link diretti: `?tab=iscritti&giornata=giorno-1&stato=attesa`.
- Export CSV per Excel (separatore `;`): `/api/eventi/admin/export` (tutti,
  una colonna per giornata) e `?giornata=giorno-1` (la lista del giorno).
- Lista da stampare per la porta: `/eventi/vivere-piu-a-lungo/admin/stampa?giornata=giorno-1`.
- Check-in alla porta: `/eventi/vivere-piu-a-lungo/admin/ingresso`, a schermo
  intero sul telefono. Scansione continua del QR (anche su iPhone, con jsQR),
  codice a mano, "già entrato alle...", lista d'attesa e altra giornata con
  "Fai entrare comunque", ultimi ingressi con "Annulla". Vale il primo orario
  d'ingresso. Accesso: admin, oppure le email in `EVENT_CHECKIN_EMAILS`.

Ogni iscritto ha un codice univoco e un QR in PNG (`/api/eventi/qr/<codice>`),
inclusi nell'email e nel biglietto online (`/eventi/vivere-piu-a-lungo/biglietto/<codice>`).

## Bando dello Showcase (11 dicembre)

Il bando di partecipazione allo Showcase di Innovazione e un sotto modulo con
la stessa impostazione: `app/eventi/vivere-piu-a-lungo/bando/`, con la sua
configurazione, il suo form, il suo pannello di istruttoria e la sua
migrazione. Iscriversi all'evento e candidarsi al bando restano due cose
distinte: chi si candida deve comunque iscriversi alla giornata.

Dettagli in `bando/README.md`. `ARCHIVE_MODE` vale anche per il bando: a
evento archiviato le candidature risultano chiuse.

## Archiviare o rimuovere

- Archiviare: `ARCHIVE_MODE = true` in `content.ts`.
- Rimuovere il modulo conservando i dati: elimina questa cartella,
  `app/api/eventi/`, `lib/eventi/`, la voce "Eventi" in `components/navbar.tsx`
  e il blocco evento in `app/page.tsx`. Le tabelle restano nel database.
