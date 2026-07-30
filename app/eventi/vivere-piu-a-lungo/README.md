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
- `RELATORI` e `PROGRAMMA_GIORNO1`: i relatori hanno un `id` stabile e la
  scaletta li richiama per `id` nel campo `relatori` della voce di programma
  (`ospiti` per i nomi senza foto: gruppi, squadre, istituzioni). Per spostare
  un relatore da un panel a un altro basta spostare il suo `id`: la pagina
  aggiorna sia la scaletta sia il badge "Panel N" sulla sua card. L'ordine
  della griglia foto e' quello dell'array `RELATORI`, quindi tienilo allineato
  all'ordine di palco.
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

## Archiviare o rimuovere

- Archiviare: `ARCHIVE_MODE = true` in `content.ts`.
- Rimuovere il modulo conservando i dati: elimina questa cartella,
  `app/api/eventi/`, `lib/eventi/`, la voce "Eventi" in `components/navbar.tsx`
  e il blocco evento in `app/page.tsx`. Le tabelle restano nel database.
