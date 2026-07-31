# Modulo evento . Vivere piu a lungo: sport e intelligenza artificiale

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
- `STATS`: il numero di panel e di relatori e' calcolato dai dati, quindi non
  puo' divergere dal programma. Se aggiungi una voce o un relatore, i contatori
  si aggiornano da soli. Il contatore dei relatori conta i soli autorizzati,
  quindi cresce da se' quando togli un `daAutorizzare`.
- Foto relatori: `public/assets/images/eventi/vivere-piu-a-lungo/`, webp
  lossy 480x480 (circa 10 KB a foto). Se aggiungi un ritratto, convertilo con
  lo stesso formato prima di committarlo: i PNG a piena risoluzione pesano
  centinaia di volte tanto e finirebbero nel bundle statico.

## Database

Migrazioni:
`supabase/migrations/20261001000000_create_event_registrations.sql` (schema),
`supabase/migrations/20261101000000_update_event_sessions.sql` (prima
riallineamento delle sessioni) e
`supabase/migrations/20261201000000_update_event_sessions_palamazzola.sql`
(programma aggiornato: date 10 e 11 dicembre, giorno 1 al PalaMazzola con
panel e progetti dei ragazzi, giorno 2 al Teatro Fusco come showcase di
innovazione con premiazione e concerto).

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

## Sviluppo e deploy

```bash
npm install
npm run dev      # sviluppo locale
npm run build    # build di produzione
npm run lint     # lint
```

## Iscrizioni e account

L'iscrizione crea (o collega) un account reale nel Member Portal:

- utente gia loggato: l'iscrizione e collegata al suo account;
- email gia registrata: collega all'account esistente;
- nuova email: crea l'utente e include nell'email un link per impostare la
  password (`/auth/update-password`).

Il consenso marketing (opt-in separato, non preselezionato) viene salvato con
timestamp e testo, e l'iscritto finisce anche in `newsletter_subscribers`
(stesso bacino del resto del sito).

## Check-in (staff)

- Pannello: `/eventi/vivere-piu-a-lungo/admin` (accesso solo `partnership_level = admin`).
- Ricerca per nome, email, codice. Filtri per sessione e categoria.
- Presenza per sessione (presente/assente), anche via scanner QR dalla
  fotocamera (usa `BarcodeDetector` dove supportato).
- Conteggi live: iscritti, posti liberi, capienza per sessione.
- Export CSV: pulsante in alto a destra (`/api/eventi/admin/export`).

Ogni iscritto ha un codice univoco e un QR (`/api/eventi/qr/<codice>`),
inclusi nell'email e nel biglietto online (`/eventi/vivere-piu-a-lungo/biglietto/<codice>`).

## Bando dello Showcase (giorno 2)

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
