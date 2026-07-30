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

## Programma e relatori del giorno 1

Due strutture in `content.ts`, con una sola fonte di verita:

- `ANAGRAFICA`: nome, ruolo e foto di ogni relatore o ospite, indicizzati per
  id. Nessun ordine implicito.
- `PROGRAMMA_GIORNO1`: la scaletta in sequenza. Ogni voce e un `panel`
  numerato o un `raccordo` (apertura, blocchi dei ragazzi, coffee break,
  premiazione, lunch, concerto). I panel elencano gli id in `relatori`, i
  raccordi indicano la platea in `con`.

`RELATORI` non e un elenco a mano: e derivato dal programma, quindi l'ordine
in pagina segue sempre la scaletta e un nome non puo restare disallineato.
Per aggiungere una persona bastano due passaggi:

1. aggiungi la voce in `ANAGRAFICA`, con la foto in
   `public/assets/images/eventi/vivere-piu-a-lungo/`;
2. metti il suo id nell'array `relatori` del panel in cui interviene.

Gli id sono tipizzati (`RelatoreId`): un id sbagliato non compila.

### Foto dei relatori

Formato atteso: webp quadrato 480x480, circa 10 a 25 KB. Le foto sono servite
a 96 px dall'ottimizzatore di Next, quindi 480 px bastano anche su schermi a
densita alta. Da un originale grande (per esempio un png 1254x1254):

```bash
python3 - <<'PY'
from PIL import Image
Image.open("Nome Cognome.png").convert("RGB") \
     .resize((480, 480), Image.LANCZOS) \
     .save("nome-cognome.webp", "WEBP", quality=82, method=6)
PY
```

Non committare i png originali: pesano qualche MB a testa e finirebbero nel
bundle di deploy senza essere mai serviti.

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
