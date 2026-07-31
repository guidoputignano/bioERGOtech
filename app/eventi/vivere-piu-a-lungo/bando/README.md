# Bando . Showcase di Innovazione

Selezione pubblica per la seconda giornata dell'evento "Vivere piu a lungo:
sport e intelligenza artificiale" (11 dicembre 2026, Teatro Fusco, Taranto).

Sotto modulo del modulo evento, con la stessa impostazione: tutta la
configurazione in un file, una sola migrazione SQL, niente logica sparsa nel
markup.

## Dove vive il codice

| Cosa | Dove |
| --- | --- |
| Configurazione | `app/eventi/vivere-piu-a-lungo/bando/content.ts` |
| Pagina pubblica | `app/eventi/vivere-piu-a-lungo/bando/page.tsx` |
| Form di candidatura | `app/eventi/vivere-piu-a-lungo/bando/BandoForm.tsx` |
| Pannello istruttoria | `app/eventi/vivere-piu-a-lungo/bando/admin/` |
| Invio candidatura | `app/api/eventi/bando/route.ts` |
| Allegati (URL firmato) | `app/api/eventi/bando/upload/route.ts` |
| API admin | `app/api/eventi/bando/admin/` |
| Tipi e validazione | `lib/eventi/bando.ts` |
| Helper server | `lib/eventi/bando-server.ts` |
| Email di conferma | `lib/eventi/bando-email.ts` |
| Migrazione | `supabase/migrations/20261202000000_create_bando_applications.sql` |

## Configurazione (un solo punto)

Tutto quello che cambia sta in `content.ts` e si riflette su pagina, form,
API ed email:

- `CANDIDATURE_APERTURA_ISO` / `CANDIDATURE_SCADENZA_ISO`: la finestra di
  candidatura dell'art. 5, con fuso orario esplicito. Fuori dalla finestra il
  form non compare e le API rifiutano invii e caricamenti.
- `FORZA_APERTURA`: mettila a `true` per aprire il form prima della data
  ufficiale. Serve solo se gli organizzatori anticipano rispetto al calendario
  pubblicato: lasciata a `false`, il sito resta allineato al bando.
- `CATEGORIE_BANDO`, `AMBITI`, `ALLEGATI`, `CALENDARIO`, `PREMI`, `CRITERI`,
  `COMMISSIONE`, `CONTATTI`, `FAQ_BANDO`: i contenuti degli articoli del bando.
  La pagina pubblica li rende, non li duplica.
- Testi delle dichiarazioni (`DICHIARAZIONE_*`, `CONSENSO_*`): vengono
  congelati a database insieme alla candidatura, nel campo
  `dichiarazioni_testo`. Se un domani cambiamo una formula, resta agli atti
  quella che il proponente ha letto.
- `STATI_CANDIDATURA`: gli stati dell'istruttoria e i colori del pannello.

`ARCHIVE_MODE` del modulo evento vale anche qui: a evento archiviato le
candidature risultano chiuse.

## Anteprima per lo staff

Chi ha `partnership_level = 'admin'` vede e usa il form anche a finestra
chiusa, con un banner giallo di avviso. Serve per provare il flusso end to end
prima dell'apertura: gli invii fatti dall'anteprima finiscono davvero nel
database, quindi vanno poi cancellati a mano.

## Database

Una sola tabella, `bando_applications`, piu un bucket privato per gli
allegati. Applicare la migrazione:

```bash
supabase db push
# oppure incollare il file nello SQL editor di Supabase
```

La migrazione crea:

- `public.bando_applications`, con i campi comuni piu quelli specifici delle
  tre categorie, gli allegati come `jsonb` (`{ path, nome, size }`), i consensi
  con timestamp e i campi dell'istruttoria (`stato`, `punteggio`,
  `note_commissione`, `categoria_riassegnata`).
- `dedup_key`, colonna generata da email del referente e nome del progetto,
  con vincolo di unicita. Reinviare lo stesso progetto aggiorna la candidatura
  invece di duplicarla.
- RLS attiva: il proponente loggato vede la propria candidatura, l'admin le
  vede tutte, nessuno puo scrivere da client. Le scritture passano dalle API
  con service role.
- Il bucket privato `bando-candidature`, con limite di 10 MB per file e solo
  `application/pdf` consentito. Nessuna policy su `storage.objects`: senza URL
  firmato non si legge e non si scrive.

## Allegati

Il file non passa dalle nostre funzioni serverless, che hanno un limite di
corpo ben sotto i 10 MB dichiarati nel form:

1. il browser chiede a `POST /api/eventi/bando/upload` un URL di caricamento
   firmato, dichiarando campo, nome e dimensione;
2. la rotta verifica la finestra, il campo, l'estensione, la dimensione e il
   tetto di file per bozza, poi decide il percorso di storage e restituisce il
   token firmato;
3. il browser carica direttamente su Supabase Storage;
4. all'invio, l'API ricontrolla che ogni percorso dichiarato rispetti la forma
   attesa e che il file esista davvero nel bucket.

I percorsi hanno la forma
`candidature/<uuid-bozza>/<campo>-<timestamp>-<random>.pdf`. Il nome originale
del file non entra mai nel percorso, resta solo come etichetta.

La bozza vive in `sessionStorage`, quindi un ricaricamento della pagina non
rende orfani gli allegati gia caricati. Se il proponente abbandona il form, i
file restano nel bucket senza essere referenziati da nessuna candidatura: sono
innocui, e si possono ripulire con una query che confronta i `draft_id` in
tabella con le cartelle in `candidature/`.

Lo staff scarica gli allegati dal pannello, tramite
`GET /api/eventi/bando/admin/file?path=...`, che rilascia un URL firmato con
scadenza di cinque minuti.

## Modifica di una candidatura

Fino alla scadenza il proponente puo reinviare il form con lo stesso nome del
progetto e la stessa email per aggiornare la candidatura. L'aggiornamento e
consentito solo a chi e autenticato con l'account titolare: senza questo
controllo basterebbe conoscere email e nome del progetto per sovrascrivere la
candidatura di qualcun altro. Chi non e loggato riceve un 409 con l'invito ad
accedere.

L'aggiornamento non tocca `stato`, `punteggio` e `note_commissione`: il lavoro
della Commissione non viene azzerato da una modifica del proponente.

## Categorie e coerenza dei dati

L'art. 2 lascia alla Commissione il potere di riassegnare d'ufficio una
candidatura. Il codice segue quella logica:

- rifiuta solo le contraddizioni dirette fra dati dichiarati e categoria
  scelta (categoria B con raccolta oltre i 500.000 euro, categoria C senza ne
  raccolta a soglia ne ricavi), indicando quale categoria usare;
- per tutto il resto annota e non blocca. Le segnalazioni finiscono in
  `categoria_avvisi` e compaiono nel pannello con un triangolo di avviso, per
  esempio quando una societa in categoria B risulta costituita da piu di 36
  mesi alla scadenza.

La riassegnazione si fa dal pannello e scrive `categoria_riassegnata`, senza
cancellare la scelta originale.

## Account e bacino contatti

Come per le iscrizioni all'evento, candidarsi crea o collega un account nel
Member Portal (l'email di conferma include il link per impostare la password).
Serve anche a rendere possibile la modifica della candidatura. Il consenso
marketing e un opt-in separato, non preselezionato, e alimenta
`newsletter_subscribers` con `source = 'bando-showcase-innovazione'`.

## Pannello dell'istruttoria

`/eventi/vivere-piu-a-lungo/bando/admin`, accesso `partnership_level = admin`.

- Elenco con ricerca per progetto, societa, referente o codice, e filtri per
  categoria e stato.
- Scheda di dettaglio con tutti i campi, gli allegati scaricabili e le
  segnalazioni di coerenza.
- Comandi dell'istruttoria: stato, punteggio su 100, note della Commissione,
  riassegnazione di categoria.
- Export CSV completo: `/api/eventi/bando/admin/export`.

## Variabili d'ambiente

Le stesse gia in uso nel progetto: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`RESEND_API_KEY`, `NEXT_PUBLIC_SITE_URL`.

## Dopo il bando

Non serve cancellare nulla. Passata la scadenza il form sparisce da solo e la
pagina resta consultabile come documentazione della procedura. Per archiviare
tutto insieme all'evento basta `ARCHIVE_MODE = true` nel `content.ts` del
modulo evento.
