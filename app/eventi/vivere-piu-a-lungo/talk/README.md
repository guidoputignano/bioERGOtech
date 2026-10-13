# Talk con gli esperti

Una serie di incontri brevi, online e gratuiti, fra gli studenti del percorso
"Biotecnologie e Intelligenza Artificiale" (licei e universita), i loro
docenti e chi lavora ogni giorno su energia, ambiente, biotecnologie e
salute. Servono a conoscere problemi veri e a trovare idee concrete per i
progetti. Il primo e con Emanuele Memmola, responsabile dell'economia
circolare di Eni a Taranto, lunedi 9 novembre 2026 dalle 15:00 alle 16:00.

Sotto modulo dell'evento, accanto a `licei/` e `universita/`, con la stessa
impostazione: i dati in un file, una migrazione, le guardie nel codice e
niente che si rompa prima che la migrazione sia applicata.

## Dove sta

| Che cosa | Dove |
|---|---|
| Dati dei talk (unico punto) | `content.ts`, array `TALKS` |
| Testi dell'interfaccia, per i componenti client | `testi.ts` |
| Pagina della serie | `page.tsx` (`/eventi/vivere-piu-a-lungo/talk`) |
| Pagina di un talk | `[slug]/page.tsx`, statica, una per voce di `TALKS` |
| Indirizzo breve | `app/talk/page.tsx`: `/talk` rimanda per sempre (308) alla serie |
| Riquadro dell'iscrizione | `IscrizioneTalk.tsx` |
| Scheda nelle aree riservate | `TalkAreaCard.tsx` (studente licei, docente licei, universita) |
| Scheda nel pannello staff | `TalkStaffCard.tsx`, nel pannello dei licei, scheda "Adesioni e iscrizioni" |
| Calendario (Google e .ics) | `lib/eventi/talk.ts` |
| Chi puo iscriversi, stato per il riquadro | `lib/eventi/talk-server.ts` |
| Rotta dell'iscrizione | `app/api/eventi/talk/[slug]/iscrizione/route.ts` (GET, POST, DELETE) |
| File .ics | `app/api/eventi/talk/[slug]/ics/route.ts` |
| Numeri e export per lo staff | `app/api/eventi/talk/admin/route.ts`, `app/api/eventi/talk/admin/export/route.ts` |
| Migrazione | `supabase/migrations/20261216000000_talk_iscrizioni.sql` (da applicare a mano, vedi sotto) |

## Come si aggiunge un talk

Una voce in `TALKS`, e basta: pagina, sitemap, calendario, schede nelle aree,
riga nella pagina dei licei e pannello staff la leggono da li.

1. **`slug`**: minuscole, cifre e trattini (`nome-cognome` del relatore va
   bene). Non si cambia dopo la pubblicazione: e la URL della pagina e la
   chiave delle iscrizioni a database.
2. **`numero`**: il posto nella serie, per l'occhiello "Talk con gli
   esperti . 2".
3. **Date**: `inizio` e `fine` in ISO 8601 **con il fuso**, `+01:00` d'inverno
   e `+02:00` con l'ora legale. Sono la fonte del calendario e dei dati
   strutturati; `dataLabel` e `orarioLabel` sono solo le etichette in pagina,
   e vanno tenute allineate a mano.
4. **Testi**: `titolo`, `sottotitolo`, `intro`, `temi` (titolo, testo e, se
   si vuole, un'icona Font Awesome), `spunti`, `spuntiNota`, `perChi`. Niente
   trattino lungo: punto o virgola.
5. **`modalita`**: `online` (allora `luogo` resta null) o `presenza`, con il
   luogo.
6. **`capienza`**: null per nessun limite. Con un numero, a posti finiti la
   rotta risponde 409 "Posti esauriti". Il controllo e nella rotta e non a
   database, quindi due iscrizioni nello stesso istante possono superarlo di
   una: per un talk online va bene, per una sala vera va spostato in una
   funzione SQL.
7. **Immagine Open Graph**: 1200x630, JPG sotto i 150 KB circa, in
   `public/assets/images/eventi/talk/<slug>-og.jpg`, e il percorso in
   `immagineOg`.
8. **Foto del relatore**: finche e null compare un monogramma con le
   iniziali in un cerchio teal. Per la foto: un ritratto quadrato in
   `public/assets/images/eventi/talk/<slug>.webp` (480x480 basta, come le
   foto dei relatori dell'evento) e il percorso in `relatore.foto`. Il
   ritaglio nel cerchio tiene la testa (`object-position: 50% 25%`).
9. **Link della riunione**: `link`, qualche giorno prima del talk, poi un
   rilascio. Lo vedono **solo gli iscritti**, nel riquadro della pagina dopo
   l'accesso. Deve iniziare con `https://`, altrimenti non viene mostrato.
   Finche e null, agli iscritti si legge "Il link per collegarti compare
   qui, agli iscritti, nei giorni prima del talk."

### Il link non deve mai finire nel browser di chi non e iscritto

`content.ts` contiene `link`. Tutto cio che un componente client
(`"use client"`) importa finisce nel JavaScript pubblico, quindi:

- i componenti client **non importano valori da `content.ts`**, solo tipi
  (`import type`). I testi li prendono da `testi.ts`;
- le pagine server passano ai componenti client solo stringhe gia pronte o
  `schedaTalk(t)`, che il link lo toglie;
- il calendario (Google e .ics) e i dati strutturati non lo contengono: la
  descrizione rimanda alla pagina.

Si verifica cosi: si mette un valore riconoscibile in `link`, si fa la build e
si cerca quel valore in `.next/static` e nei file `.html` e `.rsc` di
`.next/server/app`. Non deve comparire; nei chunk server (`.next/server/chunks`)
compare, ed e giusto.

## Chi puo iscriversi

Con l'accesso, un clic su "Iscriviti al talk". Nessun modulo e nessun dato
nuovo: la riga lega l'account al talk, con il ruolo e, per i licei,
l'istituto. Possono iscriversi (`idoneitaTalk`, nell'ordine):

1. studenti dei licei con un'iscrizione `in_attesa` o `confermata`, a
   percorso licei non chiuso (anche chi aspetta la conferma del referente:
   il talk non tocca squadre ne progetti);
2. partecipanti del percorso universitario con la candidatura `confermata`,
   lo stato che quel modulo usa per "nel percorso";
3. docenti dei licei, a percorso non chiuso: referente di un'adesione non
   ritirata, o docente del progetto `attivo` di un'adesione non ritirata;
4. staff (`partnership_level = 'admin'`), per provare il flusso.

Chiunque altro legge "I talk sono riservati a chi partecipa al percorso.",
con i link ai due percorsi. La propria iscrizione si puo annullare sempre,
anche da chi non partecipa piu. Dopo la fine del talk la rotta rifiuta
iscrizioni e annullamenti (409).

Il docente vede nella sua area quanti studenti del suo istituto si sono
iscritti, senza nomi, e solo dopo aver accettato le istruzioni per i
docenti: il numero passa dalla guardia intera, `requireDocente()`.

Lo staff, dalla scheda "Talk con gli esperti" del pannello dei licei, vede i
numeri per talk e per ruolo e scarica il CSV: nome, cognome, email, istituto
(o "Università", o "Fondazione bioERGOtech" per lo staff) e ruolo. I nomi
non stanno nella tabella dei talk: l'export li legge al momento
dall'iscrizione ai licei, dalla candidatura all'universita, dall'adesione o
dalla riga del docente, e dal profilo come ultimo ripiego. Serve a mandare il
link a chi si e iscritto: **questa funzione non manda email**.

Il CSV elenca **solo chi e ancora idoneo**, cioe le stesse persone che sul
sito vedono il link (iscritte e idonee). L'idoneita si ricalcola al momento
dell'export con la regola di `idoneitaTalk`, applicata a tutti gli iscritti
insieme da `idoneitaTalkPerUtenti` (`lib/eventi/talk-server.ts`). Resta
fuori, e i suoi nomi non si leggono nemmeno, chi nel frattempo ha
l'iscrizione ai licei rifiutata o ritirata, la candidatura universitaria non
piu confermata, il ruolo di docente del progetto revocato, l'adesione del
suo istituto ritirata, o studenti e docenti dei licei a percorso chiuso. Il
link si manda solo alle righe del CSV, scaricato a ridosso dell'invio: un
file vecchio puo contenere chi poi e uscito dal percorso. Il conteggio del
pannello comprende invece tutte le righe, quindi puo essere piu alto.

## Calendario

- **Google Calendar**: link `action=TEMPLATE` costruito dai dati, con le date
  in UTC nel formato di base (`20261109T140000Z/20261109T150000Z`), una
  descrizione breve con la URL della pagina e il luogo ("Online"). Non e il
  link dell'evento sul calendario privato della Fondazione.
- **Apple Calendar e Outlook (.ics)**: `/api/eventi/talk/<slug>/ics`, un solo
  evento, UID stabile (`talk-<slug>@bioergotech.org`), date in UTC, testo con
  escaping e righe piegate a 75 ottetti come chiede l'RFC 5545, e un
  promemoria 30 minuti prima.

Tutti e due compaiono nel riquadro della pagina; dopo l'iscrizione sono in
evidenza, sotto "Aggiungi al calendario".

## Migrazione da applicare a mano: 20261216000000

**`supabase/migrations/20261216000000_talk_iscrizioni.sql` non parte da
sola.** Come le altre, in produzione si esegue dall'SQL editor di Supabase.
Il codice va rilasciato prima e regge senza, quindi l'ordine e:

1. Rilasciare il codice.
2. Eseguire `supabase/migrations/VERIFICA.sql` per intero e leggere la colonna
   `esito`: `20261204000000` (licei) e `20261213000000` (`public.e_admin()`)
   devono essere `OK`. Senza, la migrazione si ferma alla prima riga con un
   messaggio e non crea niente.
3. Eseguire `20261216000000_talk_iscrizioni.sql` per intero. E rieseguibile:
   una seconda esecuzione non cambia nulla.
4. Rieseguire `VERIFICA.sql`: la riga `20261216000000_talk_iscrizioni` deve
   dire `OK`, e i tre controlli "talk iscrizioni" (privilegi, RLS, scrittura
   delle rotte) devono dire `OK`.

Che cosa crea: la tabella `talk_iscrizioni` (slug del talk, account, ruolo,
istituto facoltativo, data; una sola iscrizione per persona e talk), gli
indici su slug e istituto, la RLS con due sole policy di lettura (la propria
riga, e lo staff tramite `public.e_admin()`), nessuna policy di scrittura, e
i privilegi: niente ad anon, sola lettura ad authenticated, tutto a
service_role.

### Prima della migrazione

- la pagina del talk si vede tutta, il riquadro dice "Le iscrizioni aprono a
  breve." e offre gia il calendario;
- la rotta risponde `disponibile: false` su GET e 503 su POST e DELETE;
- le schede nelle aree portano alla pagina del talk;
- il pannello staff dice che manca la migrazione, l'export risponde 503;
- la chiusura del percorso licei salta la tabella e la segna fra le assenti.

## Chiusura del percorso licei

La cancellazione dei dati (`app/api/eventi/licei/admin/chiusura/route.ts`)
toglie tutte le iscrizioni ai talk con ruolo `studente_licei` o `docente`, e
le conta nell'anteprima ("Iscrizioni ai talk"). Quelle degli account
cancellati se ne andrebbero comunque, per la chiave esterna verso
`auth.users` con `on delete cascade` (provato sul banco di prova della
migrazione); la cancellazione per ruolo serve per gli account che restano
perche usati altrove. Se si cancella un'adesione, `adesione_id` diventa
nullo e la riga resta finche la chiusura non la toglie. Le iscrizioni di
studenti universitari e staff non sono del percorso licei e restano.

## Privacy

- L'informativa per gli studenti (`licei/documenti.ts`, "Quali dati
  raccogliamo") nomina le iscrizioni ai talk; quella per scuole e docenti le
  nomina fra i dati del docente. La data di aggiornamento resta
  `2026-10-13`.
- Il percorso universitario non ha un'informativa sua: vale quella del sito
  (`app/legal/privacy/content.ts`), che nella categoria dei partecipanti al
  percorso universitario ora le nomina, in italiano e in inglese. La data li
  e a livello di mese ("ottobre 2026") e resta valida.
- La pagina del talk lo dice in una riga: "Registriamo solo la tua
  iscrizione, collegata al tuo account.", con i link alle informative.

## Come e stato provato

- Migrazione su un PostgreSQL 16 usa e getta con la catena delle migrazioni
  del repository: eseguita piu volte con lo schema identico dopo ogni
  esecuzione, vincoli, RLS per studente, referente, utente qualsiasi, anon e
  staff, privilegi, cascata alla cancellazione dell'account e cancellazione
  per ruolo, e `VERIFICA.sql` prima (`DA ESEGUIRE`), dopo (`OK`) e con una
  policy tolta a mano (`PARZIALE`). Senza `e_admin()` o senza le tabelle dei
  licei si ferma con il messaggio giusto.
- Calendario: date UTC (anche ora legale e cambio d'anno), link Google,
  escaping e piegatura in byte (accenti ed emoji compresi).
- Idoneita, stato e rotta con un client Supabase finto, comprese le tabelle o
  colonne mancanti, gli errori veri (500 senza dettagli), la capienza, il
  talk concluso e il link che esce solo per chi e iscritto.
- Export CSV con lo stesso client finto: entrano solo gli iscritti ancora
  idonei, con la stessa risposta di `idoneitaTalk` per ciascuno; restano
  fuori iscrizioni rifiutate, candidature escluse, docenti revocati, adesioni
  ritirate e, a percorso chiuso, studenti e docenti dei licei.
