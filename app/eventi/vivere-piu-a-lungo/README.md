# Modulo evento: Vivere più a lungo, sport e intelligenza artificiale

Modulo autosufficiente e isolato. Tutta la logica vive in questa cartella
(`app/eventi/vivere-piu-a-lungo/`), in `app/api/eventi/`, in `lib/eventi/` e
in una sola migrazione SQL. Dopo l'evento si archivia con una flag, senza
perdere le iscrizioni.

## Configurazione (un solo punto)

Tutto cio che cambia tra edizioni sta in `content.ts`, tranne la modalità
archivio, che sta in `archivio.ts` (la legge anche la navbar):

- `ARCHIVE_MODE` in `archivio.ts`: metti a `true` a evento concluso. Nasconde
  i form e mostra il recap. Nessun dato viene cancellato. Le API di
  iscrizione rifiutano nuove richieste. `content.ts` la riesporta.
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
le applica e ridà il 10 dicembre a chi non aveva nessuna giornata. Va
eseguito una volta sola, a mano nello SQL editor di Supabase, prima di
pubblicare il codice che lo presuppone. Non va rieseguito dopo: il passo 2
darebbe il 10 dicembre a ogni iscrizione rimasta senza giornate.

`supabase/migrations/20261231400000_event_prenotazioni_classi.sql` aggiunge
le prenotazioni per classe (vedi sotto): la capienza a 3500 posti il 10
dicembre e 400 l'11 (si alza soltanto), la quota delle scuole per giornata,
le due tabelle delle classi e le funzioni che contano i posti di persone e
classi insieme. Va eseguito una volta, a mano nello SQL editor, prima di
pubblicare il codice delle classi. Si può rieseguire senza danni (la quota
si imposta solo la prima volta, poi la decide il pannello). In fondo c'è la
query di controllo: se `persone_in_attesa` non è 0, quelle persone si
confermano dalla scheda Iscritti, che manda a ciascuna l'email "si è
liberato un posto" (il file non le conferma da solo).

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
- un refuso evidente nel dominio dell'email;
- una giornata già conclusa (400);
- nome o cognome con cifre, simboli o indirizzi web (400): il nome finisce
  nell'email del biglietto.

Reiscriversi con la stessa email e lo stesso nome aggiunge le giornate nuove
e rimanda il biglietto, con tutte le giornate, all'indirizzo dell'iscrizione.
Chi non ha fatto l'accesso con quell'email non vede il codice a schermo e non
cambia i dati salvati: il codice serve anche a liberare il posto, quindi
arriva solo per email. Lo stesso biglietto non si rimanda più di una volta
ogni 2 minuti.

Dal biglietto online (sezione "Gestisci") la persona libera il posto di una
giornata, ne aggiunge un'altra o si fa rimandare il biglietto
(`/api/eventi/registrations/gestisci`). Quando libera un posto confermato, il
posto passa da solo a chi è in lista d'attesa da più tempo per quel giorno,
che riceve l'email "si è liberato un posto". La persona che ha liberato il
posto riceve un avviso per email.

Limiti contro gli abusi: un limite in memoria per IP (200 richieste ogni 10
minuti, alto perché una classe si iscrive dalla stessa rete della scuola e,
il giorno dell'evento, la sala dallo stesso Wi-Fi) e l'honeypot. Chi non ha
fatto l'accesso non cambia il consenso marketing di un'iscrizione esistente. Il limite in memoria vale per singola istanza: per un limite vero
fra tutte le istanze serve una regola nel Vercel Firewall su
`POST /api/eventi/registrations` e `POST /api/eventi/classi` (una
prenotazione di classe occupa fino a 40 posti con una richiesta sola).

Il consenso marketing (opt-in separato, non preselezionato) viene salvato con
timestamp e testo, e l'iscritto finisce anche in `newsletter_subscribers`
(stesso bacino del resto del sito).

## Pannello, export e ingresso (staff)

- Pannello `/eventi/vivere-piu-a-lungo/admin` (solo admin) con cinque schede
  (la scheda **Classi** è descritta in "Prenotazioni per classe"):
  - **Riepilogo**: allarmi in rosso se una giornata manca nel database o ci
    sono iscrizioni senza giornata; per ogni giornata confermati, lista
    d'attesa, entrati e posti liberi; andamento delle iscrizioni, categorie,
    scuole e organizzazioni. Si aggiorna ogni minuto.
  - **Iscritti**: ricerca, filtri per giornata, stato e categoria; presenza;
    conferma dalla lista d'attesa (con email "si è liberato un posto");
    rimozione da una giornata (se era un posto confermato, passa da solo al
    primo in lista d'attesa; togliere l'ultima giornata elimina
    l'iscrizione); reinvio del biglietto; eliminazione delle iscrizioni
    rimaste senza giornata.
  - **Ingresso**: il check-in alla porta (vedi sotto).
  - **Comunicazioni**: il biglietto aggiornato (una volta, a tutti) e il
    promemoria (automatico l'8 dicembre, dal cron `/api/cron/evento`). Le
    iscrizioni senza giornata non ricevono nulla e sono elencate a parte;
    fermano gli invii solo finché il file di ripristino non è stato eseguito.
- Link diretti: `?tab=iscritti&giornata=giorno-1&stato=attesa`.
- Export CSV per Excel (separatore `;`): `/api/eventi/admin/export` (tutti,
  una colonna per giornata) e `?giornata=giorno-1` (la lista del giorno).
- Lista da stampare per la porta: `/eventi/vivere-piu-a-lungo/admin/stampa?giornata=giorno-1`.
  Mostra solo le ultime 4 cifre del codice: il codice intero apre il
  biglietto e permette di liberare il posto.
- Check-in alla porta: `/eventi/vivere-piu-a-lungo/admin/ingresso`, a schermo
  intero sul telefono. Scansione continua del QR (anche su iPhone, con jsQR),
  codice a mano, "già entrato alle...", lista d'attesa e altra giornata con
  "Fai entrare comunque", ultimi ingressi con "Annulla" (che dopo un ingresso
  forzato rimette la persona in lista d'attesa o toglie la giornata aggiunta
  alla porta). Vale il primo orario
  d'ingresso. Accesso: admin, oppure le email in `EVENT_CHECKIN_EMAILS`.

Ogni iscritto ha un codice univoco e un QR in PNG (`/api/eventi/qr/<codice>`),
inclusi nell'email e nel biglietto online (`/eventi/vivere-piu-a-lungo/biglietto/<codice>`).

## Prenotazioni per classe

Un docente prenota tutta la classe su `/eventi/vivere-piu-a-lungo/classi`:
scuola, classe, quanti studenti e quanti docenti (al massimo 40 persone in
tutto), le giornate e un telefono per il giorno dell'evento. Nessun dato
degli studenti, che non devono iscriversi uno per uno. Più classi, una
prenotazione per ciascuna.

- Una classe non si divide mai: per ogni giornata è tutta confermata o tutta
  in lista d'attesa. Conta la capienza della giornata e la quota delle
  scuole (`event_sessions.quota_gruppi`, di partenza 3000 il 10 dicembre e
  300 l'11, si cambia dal pannello), così resta posto per il pubblico.
- Un codice per classe (`VPC-XXXXXXXX`) e un QR solo. La pagina della classe
  `/eventi/vivere-piu-a-lungo/classe/<codice>` (noindex) mostra il QR e le
  giornate, e permette al docente di cambiare i numeri, aggiungere o
  annullare una giornata e farsi rimandare l'email
  (`/api/eventi/classi/gestisci`).
- Prenotare di nuovo la stessa classe (stesso docente, scuola e classe)
  aggiunge giornate e non crea un doppione. Come per le persone, il codice
  non compare a schermo: arriva solo per email.
- Quando una classe annulla o riduce i numeri, i posti passano prima alle
  classi in attesa che ci stanno (in ordine di prenotazione), poi alle
  persone. Nelle giornate già iniziate non passa niente in automatico: ci
  pensa lo staff.
- L'invito delle scuole del percorso dei licei porta il link
  `?scuola=LIC-...`, che compila la scuola. Il codice viene tolto dalla barra
  degli indirizzi prima che partano Analytics e Ads.

Per lo staff:

- Scheda **Classi** del pannello: posti e quota per giornata, ricerca e
  filtri, conferma di una classe in attesa (anche oltre i posti, con una
  conferma esplicita), numeri, settore ("Tribuna B", che compare nel
  biglietto della classe e alla porta), giornate, reinvio dell'email.
- Il **Riepilogo** conta persone e classi insieme, e segnala le classi in
  lista d'attesa.
- Alla porta il QR della classe apre la sua scheda: si indica quante persone
  entrano ("23 di 30"), e chi arriva dopo si aggiunge. "Correggi il numero"
  abbassa il conteggio (0 annulla l'ingresso della classe). Finché la scheda
  aspetta il numero, un altro codice (scritto o dal lettore USB) non viene
  letto: prima si completa o si chiude la scheda.
- Quando una giornata è iniziata, i posti liberati da una classe non passano
  in automatico a chi aspetta: il pannello lo dice, e si conferma a mano.
- Lista da stampare: `stampa?giornata=giorno-1&parte=classi`. CSV:
  `/api/eventi/admin/export?tipo=classi`.
- **Comunicazioni**: l'invito alle scuole del percorso dei licei (una volta) e
  il promemoria dell'8 dicembre, che va anche ai docenti delle classi.

Le tabelle `licei_*` si leggono soltanto: l'invito usa le adesioni delle
scuole, senza cambiarle.

## Bando dello Showcase (11 dicembre)

Il bando di partecipazione allo Showcase di Innovazione e un sotto modulo con
la stessa impostazione: `app/eventi/vivere-piu-a-lungo/bando/`, con la sua
configurazione, il suo form, il suo pannello di istruttoria e la sua
migrazione. Iscriversi all'evento e candidarsi al bando restano due cose
distinte: chi si candida deve comunque iscriversi alla giornata.

Dettagli in `bando/README.md`. `ARCHIVE_MODE` vale anche per il bando: a
evento archiviato le candidature risultano chiuse.

## Archiviare o rimuovere

- Archiviare: `ARCHIVE_MODE = true` in `archivio.ts`.
- Rimuovere il modulo conservando i dati: elimina questa cartella,
  `app/api/eventi/`, `lib/eventi/`, la voce "Eventi" in `components/navbar.tsx`
  e il blocco evento in `app/page.tsx`. Le tabelle restano nel database.
