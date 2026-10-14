# Bando licei . Biotecnologie e Intelligenza Artificiale

Percorso formativo gratuito per gli studenti del triennio delle scuole
secondarie di secondo grado di Taranto e provincia, che si chiude con la
presentazione dei dieci progetti migliori il 10 dicembre 2026 al PalaMazzola,
nella prima giornata dell'evento "Vivere piu a lungo".

Sotto modulo del modulo evento, accanto al bando startup. Stessa impostazione:
configurazione in un file, una migrazione, niente logica sparsa nel markup.

## La differenza di fondo rispetto al bando startup

**Qui aderisce l'ISTITUTO, non lo studente.** L'art. 4 lo dice: la scuola
individua un docente referente, promuove il percorso, raccoglie le candidature
e le trasmette. Lo studente non si candida a un bando, si iscrive a un corso a
cui la sua scuola ha aderito.

Da questo discende tutto il resto del disegno, e in particolare il fatto che
i momenti siano **tre e non due**:

1. **Adesione dell'istituto.** La compila il docente referente. Fatta.
2. **Iscrizione dello studente.** Lo studente si iscrive da solo con il codice
   `LIC-` che il referente gli ha dato, e il referente conferma l'elenco con un
   clic. Quell'elenco confermato *e* l'elenco che l'art. 4 chiede di
   trasmettere. Fatta.
3. **Squadra e progetto.** Gli studenti confermati formano una squadra, da 2 a
   5 e tutti della stessa scuola, consegnano un progetto, la Commissione lo
   valuta sui criteri dell'art. 7 e i primi dieci salgono sul palco. Fatta.

### Due scelte di disegno cambiate rispetto alla prima stesura

Questa nota diceva "le squadre non hanno mai un form proprio: nascono nello
stesso atto in cui il team deposita la sua idea". **Non e andata cosi**, e la
ragione e il calendario: la squadra si forma settimane prima che il progetto
sia scrivibile, e legarla al deposito dell'idea avrebbe significato o
anticipare la consegna o rimandare le squadre. Restano due atti separati con
due interruttori separati (`stato_squadre`, `stato_consegne`), ma la squadra
nasce gia con la sua bozza di progetto attaccata, vuota: non esiste un
momento in cui una squadra e solo una lista di nomi senza dove scrivere.

La stessa nota diceva anche "**non** account individuali per cinque a nove
commissari esterni da onboardare a novembre". Gli account individuali ci
sono, ed e un cambio deliberato. La ragione e che l'indipendenza dei giudizi
non si ottiene in nessun altro modo: con un pacco di valutazione trascritto
da una persona sola, chi trascrive vede tutti i punteggi mentre li inserisce,
e chi delibera in seduta ha gia sentito il voto dei colleghi prima di dare il
proprio. Con le schede individuali ogni commissario vede solo le sue, e la
media di cinque giudizi indipendenti vale piu della media di cinque giudizi
ancorati. Il costo di onboarding e una email con il link per impostare la
password, che lo staff invia dal pannello: il commissario non si registra da
solo e non deve cercare nessuna pagina. Se un domani si preferisse la
trascrizione, resta possibile: basta che lo staff tenga gli account.

## Dove vive il codice

| Cosa | Dove |
| --- | --- |
| Configurazione | `app/eventi/vivere-piu-a-lungo/licei/content.ts` |
| Pagina pubblica | `app/eventi/vivere-piu-a-lungo/licei/page.tsx` |
| Indice appiccicato | `app/eventi/vivere-piu-a-lungo/licei/LiceiIndice.tsx` |
| Modulo di adesione | `app/eventi/vivere-piu-a-lungo/licei/AdesioneForm.tsx` |
| Iscrizione studenti | `app/eventi/vivere-piu-a-lungo/licei/iscrizione/` |
| Area dei docenti (referente e docenti del progetto) | `app/eventi/vivere-piu-a-lungo/licei/referente/`: `ReferenteConsole.tsx`, `AccettazioneIstruzioni.tsx`, `DocentiProgetto.tsx`, `QuadroSquadre.tsx`, `RiflessioniReferente.tsx`, `FiltroClasse.tsx`, `filtroPerClasse.ts` |
| Modulo autorizzazione | `licei/referente/generaAutorizzazione.ts` |
| Area dello studente | `app/eventi/vivere-piu-a-lungo/licei/studente/` (`StudenteConsole.tsx`, `RiflessioniPassate.tsx` per la scelta sulle riflessioni di prima, `riflessioni/page.tsx` per il link diretto alla scelta) |
| Area della Commissione | `app/eventi/vivere-piu-a-lungo/licei/commissione/` |
| Aggancio al corso | `app/courses/agentic-ai/lesson/[slug]/page.tsx` (`LEZIONI_LICEI`) |
| Pannello staff | `app/eventi/vivere-piu-a-lungo/licei/admin/` |
| Invio adesione | `app/api/eventi/licei/adesioni/route.ts` |
| Invio iscrizione | `app/api/eventi/licei/iscrizioni/route.ts` |
| API dei docenti | `app/api/eventi/licei/referente/`: elenco (`route.ts`), `export`, `docenti`, `istruzioni`, `riflessioni` |
| API squadre | `app/api/eventi/licei/squadre/route.ts` |
| API della scelta sulle riflessioni di prima | `app/api/eventi/licei/studente/riflessioni-passate/route.ts` |
| API progetto | `app/api/eventi/licei/progetto/route.ts` |
| API Commissione | `app/api/eventi/licei/commissione/route.ts` |
| API staff | `app/api/eventi/licei/admin/` |
| Tipi e validazione | `lib/eventi/licei.ts`, `licei-iscrizioni.ts` (anche `normalizzaClasse`), `licei-squadre.ts` (anche `quadroSquadre`) |
| Helper server e guardie | `lib/eventi/licei-server.ts` (`requireDocente`, `requireStudente`, `requireCommissario`) |
| Docenti del progetto | `lib/eventi/licei-docenti.ts` |
| Riflessioni lette dai docenti | `lib/eventi/licei-riflessioni.ts` (anche la scelta dello studente sulle consegne di prima); il flag lo scrive `app/api/courses/submissions/route.ts`, l'avviso e la domanda allo studente stanno in `app/courses/LessonSubmissionBox.tsx` |
| Documenti pubblici | `app/eventi/vivere-piu-a-lungo/licei/documenti.ts` |
| Progresso sul corso | `lib/eventi/licei-progresso.ts` |
| Email | `lib/eventi/licei-email.ts` (conferme, invito dei docenti, avviso alla scuola, avviso sulle riflessioni) |
| Elenco dei mentor nell'area dello studente e in quella dei docenti | `app/eventi/vivere-piu-a-lungo/mentor/MentorElenco.tsx` (`percorso="docenti"` nella console dei docenti), rotta `app/api/eventi/mentor/route.ts` |
| Linee guida per i mentor | `app/eventi/vivere-piu-a-lungo/linee-guida-mentor/` |
| Talk con gli esperti | `app/eventi/vivere-piu-a-lungo/talk/` (README nella cartella): scheda nell'area dello studente e del docente, riga nella pagina pubblica, scheda nel pannello staff; migrazione `20261216000000_talk_iscrizioni.sql`, da applicare a mano |
| Migrazioni | `supabase/migrations/20261204000000_create_licei_adesioni.sql`, `20261205000000_create_licei_iscrizioni.sql`, `20261206000000_create_licei_squadre_progetti.sql`, `20261208000000_licei_visibilita_iscrizioni.sql`, `20261209000000_licei_accesso_coerente.sql`, `20261215000000_licei_docenti_accettazioni_riflessioni.sql` (da applicare a mano, vedi sotto) |

## Migrazione da applicare a mano: 20261215000000

**`supabase/migrations/20261215000000_licei_docenti_accettazioni_riflessioni.sql`
non parte da sola.** Come tutte le altre, in produzione si esegue a mano
dall'SQL editor di Supabase. Il codice e scritto per essere rilasciato prima
e regge senza (vedi "Prima della migrazione" piu sotto), quindi l'ordine e:

1. Rilasciare il codice.
2. Incollare per intero `supabase/migrations/VERIFICA.sql` nell'SQL editor e
   leggere la colonna `esito`. Le migrazioni precedenti devono risultare `OK`,
   in particolare `20261213000000` (`public.e_admin()`): se manca, la nuova
   migrazione si ferma alla prima riga con un messaggio e non crea niente.
   `VERIFICA.sql` legge solo il catalogo, si puo eseguire quante volte si
   vuole e non e una migrazione.
3. Eseguire `20261215000000_licei_docenti_accettazioni_riflessioni.sql` per
   intero. E rieseguibile: una seconda esecuzione non cambia nulla.
4. Rieseguire `VERIFICA.sql`. La riga `20261215000000_licei_docenti` deve
   dire `OK`, e le tre verifiche aggiunte (privilegi di `licei_docenti`,
   privilegi di `licei_accettazioni`, RLS su `lesson_submissions`) non devono
   dire `NO`. `PARZIALE` e atteso solo su un database nuovo senza
   `lesson_submissions`; in produzione la tabella c'e.
5. **Lo stesso giorno**, dal pannello staff, inviare l'avviso sulle
   riflessioni (scheda Adesioni e iscrizioni, "Invia avviso sulle
   riflessioni"). Da quando la colonna esiste, il box delle lezioni dice agli
   iscritti che riflessione e domanda le leggono anche i docenti, e l'email
   lo dice a chi non apre una lezione in quei giorni.
6. Avvisare i referenti che al prossimo accesso, prima di vedere i loro
   studenti, devono accettare le istruzioni per i docenti. Vale anche per
   chi le aveva gia firmate su carta.

Che cosa crea: le tabelle `licei_docenti` e `licei_accettazioni`, la colonna
`lesson_submissions.condivisa_referente_at`, la RLS su `lesson_submissions`
(senza policy: ci passano solo le rotte con service role), e ricrea le tre
policy "Referents can view own school iscrizioni / squadre / progetti" con
`and a.stato <> 'ritirata'`. Il dettaglio e nella sezione "Docenti del
progetto, istruzioni accettate, squadre e riflessioni" qui sotto e nei
commenti del file.

## Le scadenze non sono nel codice

Il bando **non fissa termini**: l'art. 4 e l'art. 10 li rimandano al referente
del consorzio dei licei. Se le date vivessero in `content.ts` come nel modulo
bando, ogni comunicazione del consorzio richiederebbe un rilascio del sito e
uno sviluppatore disponibile.

Vivono quindi nella tabella `licei_config`, chiave/valore, modificabile dal
pannello staff:

- `stato_adesioni`: `termini_non_comunicati` (default), `aperte`, `chiuse`.
  Il default e anche la verita: il modulo e aperto ma la pagina non promette
  una scadenza che nessuno ha ancora fissato.
- `scadenza_adesioni_label`: la data in chiaro, quando arriva.
- `avviso`: riga di avviso in cima alla pagina. Vuota per non mostrarla.
- `stato_iscrizioni`: `chiuse` (default) o `aperte`.
- `scadenza_iscrizioni_label`: il termine delle iscrizioni, in chiaro.
- `stato_squadre`: `chiuse` (default) o `aperte`.
- `stato_consegne`: `chiuse` (default) o `aperte`. Chiuderlo **e** il termine.
- `scadenza_consegna_label`: il termine di consegna, in chiaro.
- `stato_valutazione`: `chiusa` (default) o `aperta`. Chiuderla congela i
  punteggi prima del calcolo della classifica.

Ogni fase parte chiusa, e le fasi si aprono in ordine e a mano. Non e
prudenza: aprire le consegne prima che esistano le squadre, o la valutazione
prima che esistano i progetti, produce schermate che non hanno niente da
mostrare a chi le apre.

Per questo la pagina e `dynamic = "force-dynamic"`: lo stato si legge a ogni
richiesta.

## Dati degli studenti: il minimo, e da dove viene il vincolo

Dalla fase 2 il database contiene dati di studenti in larga parte minorenni.
Non e stata una scelta di disegno: le lezioni del corso sono protette da login
(`app/courses/agentic-ai/lesson/[slug]/page.tsx` rende `isAuthenticated={false}`
e apre il gate se non c'e sessione), quindi senza un account lo studente non
puo seguire il percorso.

Si raccoglie il minimo perche corso e valutazione funzionino, e niente altro:
**nome, cognome, email, classe, anno di corso**. Niente data di nascita, niente
codice fiscale, niente contatti dei genitori. L'anno di corso sostituisce l'eta
ed e meno identificante. Chi aggiunge un campo a `licei_iscrizioni` aggiunge un
dato di un minore, quindi deve poter spiegare a che cosa serve.

Il modulo esiste in due versioni, per studenti minorenni (firma il genitore,
comprende la partecipazione al percorso) e maggiorenni (firma lo studente).
Entrambe portano le due scelte facoltative su foto e video dell'evento, A
(raccontare l'evento 2026, 5 anni) e B (promozione futura, YouTube compreso,
10 anni), con i testi presi da `../informativa-immagini/content.ts`: gli
stessi della pagina pubblica `/eventi/vivere-piu-a-lungo/informativa-immagini`.
Alla Fondazione arriva solo l'elenco minimo (studente, classe, A, B), che il
referente scarica gia impostato con `export?immagini=1` e completa dai moduli.

Le autorizzazioni restano **cartacee e in custodia all'istituto**. Il sito
genera il modulo da far firmare (`generaAutorizzazione.ts`, che gira nel
browser del referente e non contiene dati di studenti) ma non raccoglie il
modulo firmato: in `licei_iscrizioni` non esiste alcuna colonna per i genitori,
ed e deliberato. Lo studente dichiara di averlo consegnato; la prova e il
foglio in segreteria, e chi la verifica e il referente quando conferma.

## Documenti del percorso

Tutti i documenti pubblici del percorso stanno in `documenti.ts` e si leggono
su pagine del sito, non in file allegati, cosi si aggiornano con un commit e
nessuno lavora su una copia vecchia:

- `/licei/documenti`: l'indice, con chi legge, chi firma e come. Il primo
  gruppo e la "Guida operativa per scuole e docenti referenti" (`GUIDA_DOCUMENTI`);
- `/licei/informativa-studenti`, `/licei/informativa-scuole`, `/licei/regolamento`;
- `/licei/adesione-scuola` (firma il dirigente) e `/licei/istruzioni-docente`
  ("Istruzioni per il docente referente e i docenti del progetto": ogni
  docente le accetta sulla piattaforma al primo accesso, e chi preferisce le
  firma anche): i soli due che scuola e docenti sottoscrivono.

I testi dei due moduli non sono copie: `ADESIONE_SCUOLA` usa
`PRESA_ATTO_ADESIONE` e `ISTRUZIONI_DOCENTE` usa `ISTRUZIONI_REFERENTE`, le
stesse costanti che il referente vede nel modulo online e che ogni docente
accetta nella sua area.
Ogni pagina ha un pulsante per stampare o salvare in PDF; le regole
`@media print` di `globals.css` tolgono navbar, footer e banner (`no-print`)
e lasciano le righe da compilare.

Ogni documento ha un campo `aggiornato` (AAAA-MM-GG), mostrato sotto il
titolo e registrato in `dichiarazioni_testo.versioni` a ogni adesione e
iscrizione: cosi si sa quale testo ha accettato ciascuno. **Chi cambia un
testo cambia anche la sua data, nello stesso commit.** Le firme autografe non
vanno pubblicate sulle pagine: gli originali firmati restano agli atti.

Per le istruzioni dei docenti la data e anche la versione che si accetta
(`VERSIONE_ISTRUZIONI_DOCENTE = ISTRUZIONI_DOCENTE.aggiornato`, salvata in
`licei_accettazioni.versione` insieme al testo intero). Cambiarla vuol dire
che ogni docente, referente compreso, le riaccetta al prossimo accesso e fino
ad allora non vede studenti: si cambia quando cambia il testo, e solo allora.

## Mentor

I mentor sono quelli del percorso universitario (`universita_mentor`), e
dalla migrazione `20261214000000` sono a disposizione anche dei liceali.
Nell'area dello studente c'e una sezione "Mentor" con l'elenco e, per chi lo
ha messo a disposizione e ha accettato le linee guida, un contatto
professionale. Sopra l'elenco stanno le regole per lo studente, con il
consiglio di coinvolgere il docente referente se e minorenne.

Il contatto avviene di iniziativa dello studente e fuori dalla piattaforma.
La Fondazione non comunica ai mentor nessun dato degli studenti e non
organizza, non riceve e non registra le conversazioni: e quello che dicono
l'informativa studenti ("Messaggi e mentor") e il regolamento (sezione 5),
che vanno tenuti allineati a questo. La rotta controlla `requireStudente`,
quindi a percorso chiuso l'elenco si spegne con il resto dell'area. Il
dettaglio sta nel README del percorso universitario.

Lo stesso elenco, con gli stessi contatti, lo vedono i docenti: nella
console del referente e dei docenti del progetto c'e la scheda "Mentor del
percorso" (`MentorElenco` con `percorso="docenti"`), che si apre e si legge
su richiesta. Al posto delle regole scritte allo studente ha come funziona
il contatto, dalla premessa delle linee guida, e a che cosa serve al
docente: accompagnare gli studenti, in particolare i minorenni, che le linee
guida invitano a coinvolgere il docente referente prima di scrivere a un
mentor. La rotta `GET /api/eventi/mentor` prova `requireDocente()` dopo le
guardie di studenti e partecipanti universitari, con il default
`operativo`: servono le istruzioni accettate, e un'adesione ritirata, un
account legato a due istituti o un percorso chiuso respingono come nel
resto della console, con il loro messaggio. In piu serve l'adesione
confermata dallo staff (`STATI_ADESIONE_CHE_ACCETTANO`, "confermata" o
"attiva"), come per le iscrizioni degli studenti: il modulo di adesione e
pubblico e l'account del referente nasce subito, quindi finche l'adesione e
"ricevuta" la rotta risponde 403 "L'elenco dei mentor si apre quando
confermiamo l'adesione del vostro istituto." e la console mostra la scheda
con la stessa frase, senza il bottone. Chi non e docente di nessun istituto
riceve il messaggio di sempre, "L'elenco dei mentor con i contatti è
riservato a chi partecipa al percorso.". Le colonne sono le stesse degli
studenti, niente di piu. Che i docenti vedano il contatto lo dicono anche i
testi che il mentor legge prima di indicarlo: le linee guida, l'aiuto del
campo e il consenso privacy del modulo di candidatura.

## Perche il referente deve confermare

Il codice `LIC-` gira per forza di cose in tutta la scuola, e prima o poi
finisce fuori. Senza la conferma, l'elenco che l'istituto trasmette ai sensi
dell'art. 4 sarebbe autodichiarato da chiunque lo conosca. Il referente e
l'unico che sa se quel ragazzo e davvero suo, e con due bottoni lo dice.

Da qui due conseguenze nel codice:

- un istituto accetta iscrizioni solo quando la sua adesione e `confermata` o
  `attiva` (`STATI_ADESIONE_CHE_ACCETTANO` nella rotta), altrimenti basterebbe
  conoscere il codice di una scuola ancora in verifica;
- ogni update del referente filtra anche per `adesione_id`, non solo per `id`.
  Non e ridondante: il client ha la service role key, quindi RLS non lo ferma,
  e senza quel filtro conoscere l'id di un'iscrizione basterebbe a un referente
  per toccare quella di un'altra scuola.

## Docenti del progetto, istruzioni accettate, squadre e riflessioni

Dalla migrazione `20261215000000` (vedi "Migrazione da applicare a mano"),
decisioni approvate dalla Fondazione. In breve: il referente puo farsi
affiancare da altri docenti dell'istituto, ogni docente accetta online le
istruzioni prima di vedere qualcosa, la console mostra il quadro delle
squadre e, da ora in avanti, riflessioni e domande delle lezioni.

### Chi e docente: due tabelle e una guardia

- **Referente principale**: l'account di `licei_adesioni.user_id`, come
  sempre. Non si sposta e non si duplica.
- **Docenti del progetto**: `licei_docenti`, una riga per docente aggiunto
  (fino a `DOCENTI_PROGETTO_MAX = 5` non revocati per istituto). Colonne:
  `adesione_id`, `user_id`, `nome`, `cognome`, `email`, `classi text[]`,
  `stato` (`invitato`, `attivo`, `revocato`), `invitato_da`, `invitato_at`,
  `dichiarazione_invito` (jsonb: testo della dichiarazione, referente, ora),
  `invito_inviato_at` (per il limite di un rinvio ogni 10 minuti),
  `revocato_at`, `revocato_da`. Indice unico su `(adesione_id, lower(email))`.
- **Accettazioni**: `licei_accettazioni`, una riga per `(user_id, documento,
  versione)`, con `adesione_id`, il testo congelato in `testo` (jsonb: titolo,
  intro, sezioni, voci, dichiarazione della casella) e `accettato_at`.
  `documento` vale `istruzioni_docente` per i docenti e
  `riflessioni_passate` per l'avviso e la scelta degli studenti sulle
  riflessioni di prima (vedi sotto): ogni lettura filtra per `documento`, quindi le due non
  si mescolano.

Entrambe con RLS e sole policy di lettura (la propria riga, e lo staff con
`public.e_admin()`); `anon` non ha privilegi, `authenticated` solo `select`.
Le scritture passano dalle API con service role. Ai docenti del progetto
**non** e stata data nessuna policy sui dati degli studenti: per loro
l'accesso passa solo dalle API, cosi la superficie PostgREST sui dati di
minorenni non cresce.

`requireDocente({ principale?, operativo? })` in `lib/eventi/licei-server.ts`
sostituisce `requireReferente`, che resta come alias di `requireDocente()`.
Legge il database a ogni richiesta, quindi revoca e ritiro hanno effetto
subito. In ordine:

1. configurazione mancante: 500; nessun utente: 401; percorso chiuso: 403;
2. legami dell'account: adesioni di cui e `user_id` e righe di
   `licei_docenti` in stato `invitato` o `attivo`. Nessun legame: 403
   "Nessuna adesione risulta associata a questo account."; piu di un
   istituto: 409 "Questo account risulta collegato a più istituti. Scrivi a
   info@bioergotech.org e sistemiamo noi." (si sistema a mano);
3. docente del progetto il cui account e anche legato a una riga di
   `licei_iscrizioni`: 403 "Questo account risulta iscritto al percorso come
   studente, quindi non può avere anche l'accesso da docente. Scrivi a
   info@bioergotech.org e sistemiamo noi.". Il referente principale non
   passa da questo controllo;
4. adesione `ritirata`: 403 "L'adesione del vostro istituto è stata
   ritirata: l'accesso è disattivato. Per chiarimenti scrivi a
   info@bioergotech.org.". Gli studenti di quell'istituto non sono bloccati;
5. `principale: true` e chiamante non referente: 403 "Questa funzione è
   riservata al docente referente.";
6. `operativo` (default true) e istruzioni non accettate: 403 "Prima di
   vedere i dati degli studenti accetta le istruzioni per i docenti.".

Un docente del progetto revocato e poi indicato di nuovo torna `invitato` e
deve riaccettare le istruzioni anche se la versione non e cambiata. Ogni
query delle rotte dei docenti filtra per `ctx.adesione.id`, e nessuna
risposta ai docenti contiene `user_id`: anche la `PATCH` che conferma o
rifiuta un'iscrizione torna solo le colonne della GET, e la console le fonde
con la riga che ha gia.

### Le rotte

| Rotta | Chi | Che cosa |
| --- | --- | --- |
| `GET /api/eventi/licei/referente` | docenti | Iscrizioni dell'istituto con progresso, `ruolo`, `io` (nome e classi), `docenti_progetto`, `fasi` (`squadre`, `consegne`), squadre senza `codice`, `squadre_errore`, `componenti_altri_istituti`. A istruzioni non accettate risponde 403 con `istruzioni_accettate: false` e solo ruolo e istituto, per la schermata di accettazione. |
| `PATCH`, `POST` stessa rotta | docenti | Conferma o rifiuto di un'iscrizione, rinvio del link di accesso. |
| `GET .../referente/export` | solo referente | I due CSV (confermati senza email, elenco minimo per foto e video). |
| `GET`, `POST .../referente/istruzioni` | docenti, anche prima di accettare | Versione, testo, se e quando accettate; `POST { accetto: true }` registra l'accettazione e porta il docente del progetto a `attivo`. |
| `GET .../referente/docenti` | docenti | Al referente l'elenco completo; a un docente del progetto solo nome e cognome dei colleghi. |
| `POST .../referente/docenti` | solo referente | Invito: `{ nome, cognome, email, classi, dichiarazione: true }`. Risponde `{ success, email_inviata, avviso_istituto }`. |
| `PATCH .../referente/docenti` | vedi a destra | `{ id, azione: 'classi' \| 'revoca' \| 'rimanda_invito', classi? }`. `classi` il referente o il docente sulla propria riga; `revoca` e `rimanda_invito` solo il referente. Un id di un altro istituto risponde 404. |
| `GET .../referente/riflessioni` | docenti | `?iscrizione=<id>` oppure `?lezione=<slug>`, solo studenti confermati dell'istituto. |
| `GET`, `POST /api/courses/submissions` | studenti | Il GET aggiunge `avviso_referente: { istituto } \| null` e, quando l'avviso c'e, `riflessioni_passate: { scelta, avvisato_at, visibili_dal, visibili, riservate } \| null`; il POST scrive `condivisa_referente_at` solo con `avviso_referente: true` e un'iscrizione licei valida. |
| `GET`, `POST /api/eventi/licei/studente/riflessioni-passate` | studenti in attesa o confermati | Avviso e scelta sulle riflessioni di prima: GET `{ disponibile, scelta, scelta_at, avvisato_at, visibili_dal, visibili, riservate }`, POST `{ azione: 'visto' }` oppure `{ scelta: 'si' \| 'no' }`. Solo per l'account che chiama, e per l'istituto della sua iscrizione attuale. La pagina del link diretto la usa come la card dell'area. |
| `GET /api/eventi/licei/admin` | staff | Aggiunge `docenti` (per adesione) e `avviso_riflessioni` (stato dell'invio). |
| `POST /api/eventi/licei/admin` | staff | `{ azione: 'revoca_docente', id }` oppure `{ azione: 'avviso_riflessioni' }`. |

### Accettazione delle istruzioni

Al primo accesso, e di nuovo quando cambia `ISTRUZIONI_DOCENTE.aggiornato`,
la console mostra le istruzioni, la casella "Ho letto e accetto le
istruzioni per i docenti e l'informativa privacy per scuole e docenti
referenti." e il bottone "Accetto", e nient'altro: la rotta dell'elenco non
manda dati di studenti finche l'accettazione non c'e. Il testo arriva dal
server (`testoIstruzioniDocente()`), lo stesso che si congela nella riga.
Vale per tutti, referente principale compreso.

### Docenti del progetto

Li indica il referente principale dalla card "Docenti del progetto": nome,
cognome, email, classi seguite (testo libero o i bottoni delle classi
presenti) e la dichiarazione, che si salva con l'invito:
"Dichiaro che il docente indicato insegna nel nostro istituto, che l'istituto
ne è informato e che mi affianca nel seguire gli studenti del percorso."
Non serve un nuovo modulo firmato dal dirigente.

- **Che cosa vede un docente del progetto**: tutto l'istituto, come il
  referente. Le sue classi sono solo il filtro da cui parte la console ("Le
  mie classi"), e "Tutte le classi dell'istituto" c'e sempre: non sono un
  confine.
- **Che cosa puo fare**: confermare o rifiutare iscrizioni, rimandare i link
  di accesso, leggere quadro delle squadre e riflessioni, correggere le
  proprie classi. **Non puo**: indicare o revocare docenti, scaricare i CSV.
- **Quando l'invito si rifiuta** (prima di creare qualsiasi account): email
  del referente; email presente in `licei_iscrizioni` di qualunque istituto,
  o account gia legato a un'iscrizione (uno studente non deve mai avere la
  vista del docente); email o account gia referente o docente di un altro
  istituto; docente gia invitato o attivo qui; cinque docenti non revocati;
  adesione non in `STATI_ADESIONE_CHE_ACCETTANO`. I casi che riguardano altri
  hanno un messaggio solo, e la risposta non dice mai se l'account esisteva.
  **Rimanda invito** ripete gli stessi controlli su altri istituti e
  studenti prima di generare un link.
- **Uno studente non diventa docente, nemmeno dopo**: oltre all'invito, lo
  controllano la guardia (punto 3 qui sopra) e l'iscrizione degli studenti
  (`app/api/eventi/licei/iscrizioni/route.ts`), che rifiuta con 409 un'email
  o un account di un docente del progetto `invitato` o `attivo`. Senza la
  tabella il controllo dell'iscrizione non si fa.
- **Email**: al docente, con il link per impostare la password (account
  nuovo, o mai usato) oppure per entrare, e i link alle istruzioni e
  all'informativa per le scuole; all'indirizzo istituzionale dell'istituto
  (`istituto_email`), in copia nascosta a info@bioergotech.org, chi ha
  indicato chi, con la dichiarazione e "Se non è corretto scrivete a
  info@bioergotech.org". Il link non si conserva. `avviso_istituto` e vero
  solo se l'avviso e partito verso l'indirizzo della scuola: altrimenti la
  console chiede al referente di segnalarlo a info@bioergotech.org, e il log
  ha la riga "AVVISO ISTITUTO DA INOLTRARE" con adesione e docente, per
  inoltrarlo a mano.
- **Revoca**: dal referente nella console, o dallo staff nel pannello
  (sotto "Referente", "Docenti del progetto"). Effetto immediato. Un docente
  revocato e indicato di nuovo riusa la stessa riga, torna `invitato` e
  riaccetta le istruzioni. Il nuovo invito rispetta lo stesso limite di
  "Rimanda invito" (`invito_inviato_at` non si azzera): revocare e indicare di
  nuovo entro 10 minuti risponde 429.

### Quadro delle squadre

`quadroSquadre()` in `lib/eventi/licei-squadre.ts`, mostrato da
`QuadroSquadre.tsx` al referente e ai docenti del progetto: per squadra nome,
"formata il gg/mm", "n su 5", stato (Serve almeno 2 componenti, Progetto in
bozza, Progetto consegnato, Finalista, Progetto ritirato), titolo del
progetto; il capitano per primo con il badge Capitano, poi i componenti come
"Cognome Nome . classe", con "Iscrizione non confermata" dove serve. Sotto,
"Non ancora in una squadra" per classe, con "Mai entrato" o le lezioni fatte,
e quanti sono ancora in attesa di conferma. In cima quattro numeri, il filtro
per classe e "Aggiorna". Sola lettura, nessun export, nessuna email,
`user_id` o data di accesso dei componenti. Il codice `SQ-` della squadra non
esce piu dalla rotta. Un componente di un altro istituto (oggi impossibile,
lo impedisce il trigger) comparirebbe solo come "Studente di altro istituto".

### Riflessioni e domande, da ora in avanti

- **Il flag**: `lesson_submissions.condivisa_referente_at`. Lo scrive il
  server a ogni salvataggio: l'ora, se il client manda `avviso_referente:
  true` (cioe il box mostrava l'avviso) e lo studente ha un'iscrizione licei
  `in_attesa` o `confermata` a percorso aperto; altrimenti null. Tutte le
  righe salvate prima della migrazione restano null, quindi restano allo
  staff: un docente ne vede solo il numero ("consegne riservate"), finche
  la regola delle consegne di prima non le rende leggibili (sezione qui
  sotto: tre giorni dopo l'avviso, o subito con «Va bene», mai con
  «Preferisco di no»). Una vecchia diventa visibile anche se lo studente la
  riapre e la salva con l'avviso davanti.
- **Che cosa legge il docente**: per gli studenti CONFERMATI del proprio
  istituto, solo `reflection` e `question` delle righe condivise, piu se e
  quando lo staff ha risposto (`replied_at`). `comment` e `admin_reply` non
  si selezionano mai. Si legge su un clic (pannello sotto lo studente,
  "Leggi per lezione"), senza export e senza notifiche.
- **L'avviso nel box della lezione**, solo agli iscritti licei: "Quello che
  scrivi in Riflessione e Domanda lo leggono lo staff della Fondazione e i
  docenti del tuo istituto che seguono il percorso. Il commento lo legge solo
  lo staff. ...". Nella consegna gia inviata: "Visibile anche ai docenti del
  tuo istituto" oppure "Visibile solo allo staff".
- **L'email una tantum** agli iscritti confermati e in attesa, dal pannello
  staff, oggetto "Percorso Biotecnologie e IA: chi legge le tue riflessioni".
  La protegge la chiave `avviso_riflessioni_inviato_at` in `licei_config`
  (fuori da `CONFIG_CHIAVI`, come le chiavi della chiusura): parte una volta
  sola, e non parte finche la colonna non esiste. Invio a lotti di 50, con i
  conteggi salvati in `avviso_riflessioni_esito` e i fallimenti nei log, per
  id di iscrizione e mai per email. Il testo dice che quelle gia inviate
  "le potranno leggere tre giorni dopo che la piattaforma te lo segnala, a
  meno che tu scelga che restino solo allo staff": l'avviso e la scelta
  sono sulla piattaforma, l'email non chiede risposta.

### Le riflessioni di prima: ai docenti dopo tre giorni, salvo un no

Decisione approvata dalla Fondazione, che sostituisce la scelta esplicita
della prima stesura: le riflessioni e le domande inviate prima dell'avviso
(le righe con `condivisa_referente_at` null) le leggono anche i docenti
dell'istituto, ma solo dopo che la piattaforma lo ha segnalato allo
studente e sono passati tre giorni, a meno che lui dica di no. Ogni
studente per se, mai una scelta di classe; nessuna risposta gia segnata;
revocabile quando vuole, nei due sensi. Tutto sulla piattaforma, nessuna
email nuova.

- **La regola**, per studente, calcolata sul server con l'ora del server
  (`riflessioniPassateVisibili` in `content.ts`, usata da
  `utentiConPassateVisibili` in `lib/eventi/licei-riflessioni.ts`). I
  docenti leggono le sue consegne di prima se ha premuto «Va bene» (subito),
  oppure se non ha scelto e il primo avviso gli e stato mostrato almeno
  `GIORNI_PREAVVISO_RIFLESSIONI = 3` giorni fa (72 ore da `avvisato_at`).
  Non le leggono se ha premuto «Preferisco di no», anche dopo i tre giorni,
  se l'avviso non gli e mai stato mostrato, o se non sono passati tre giorni
  e non ha risposto. Le consegne salvate dopo l'avviso della lezione (flag
  valorizzato) restano visibili come prima, qualunque sia la scelta.
- **Il primo avviso**: la prima volta che l'avviso e davvero a schermo
  (box della lezione, card dell'area, pagina del link diretto) il
  componente manda `POST { azione: 'visto' }` alla rotta dello studente,
  che segna `avvisato_at` se non c'e. "Davvero a schermo" vuol dire: il
  testo dell'avviso con i due bottoni almeno a meta nel viewport, per
  almeno un secondo di fila, con la scheda in primo piano
  (IntersectionObserver piu `document.visibilityState`, `SOGLIA_VISTO` e
  `PERMANENZA_VISTO_MS` in `RiflessioniPassate.tsx`). Aprire una lezione o
  l'area senza scorrere fino al box o alla card non conta, e nemmeno una
  scheda in background; senza IntersectionObserver non si segnala, e conta
  il clic su un bottone. Una volta sola per apertura, e mai piu una volta
  segnato: la data non si sposta in avanti e la scelta non si tocca.
  Se la richiesta fallisce non blocca niente (il box si consegna lo stesso)
  e si riprova alla prossima apertura. Prima della risposta la data a
  schermo e oggi piu tre giorni; dopo, `avvisato_at` piu tre giorni.
- **I testi** (in `content.ts`). Titolo "Le tue riflessioni e i docenti".
  Senza una scelta, prima della data (`AVVISO_RIFLESSIONI_PASSATE.prima`):
  "Dal {data} i docenti del tuo istituto che seguono il percorso potranno leggere anche le riflessioni e le domande che hai inviato prima. Servono a seguire il tuo percorso. Il commento resta comunque solo allo staff.";
  dalla data in poi (`AVVISO_RIFLESSIONI_PASSATE.dopo`) lo stesso testo con
  "possono leggere". `{data}` e `avvisato_at` piu tre giorni, come "20
  ottobre", con l'anno solo se diverso da quello in corso, in ora italiana
  (`dataRiflessioniPassate`). Bottoni "Va bene" (`si`) e "Preferisco di no"
  (`no`), con lo stesso aspetto e nessuno preselezionato; sotto, "Puoi
  cambiare idea quando vuoi dalla tua area.". Dopo "Va bene": "I docenti del
  tuo istituto possono leggere anche le riflessioni e le domande che hai
  inviato prima."; dopo "Preferisco di no": "Le riflessioni e le domande che
  hai inviato prima restano visibili solo allo staff."; in tutti e due i
  casi **Cambia scelta**, che rimostra l'avviso (prima o dopo la data) con i
  due bottoni. Nessun messaggio di colpa, nessuna conferma in piu sul no.
- **Dove compare**: nel box della lezione, solo agli iscritti licei
  (`avviso_referente` non null), in qualsiasi lezione (consegnata o no,
  sopra la consegna o sopra il modulo), finche non c'e una scelta e c'e
  almeno una consegna di prima. Passati i tre giorni senza risposta resta,
  con il testo al presente, finche lo studente non preme un bottone; dopo
  una risposta non compare piu nel box. Ha le sue richieste: non blocca e
  non rallenta il salvataggio della consegna. Nell'area dello studente, card
  "Le tue riflessioni e i docenti", che compare a chi ha almeno una
  consegna di prima o ha gia scelto, anche se e ancora in attesa di
  conferma, e mostra sempre lo stato in vigore con **Cambia scelta**. Nella
  consegna gia inviata il box dice "Visibile anche ai docenti del tuo
  istituto" quando la regola qui sopra la rende leggibile.
- **Il link diretto**: `/eventi/vivere-piu-a-lungo/licei/studente/riflessioni`
  (`RIFLESSIONI_STUDENTE_PATH`), noindex e fuori dalla sitemap come l'area.
  Senza login mostra "Accedi" con `returnTo` alla pagina stessa, quindi dopo
  l'accesso lo studente torna li. Mostra solo la card, la stessa dell'area
  (`RiflessioniPassatePagina` in `RiflessioniPassate.tsx`): l'avviso conta
  come mostrato quando e a schermo, come nell'area. Dove l'area non
  mostrerebbe niente, una frase e un link per tornare: a chi non e studente
  del percorso (la rotta risponde 401 o 403) il suo messaggio e "Torna al
  bando"; a chi non ha consegne di prima e non ha mai scelto, prima della
  migrazione o su un errore, una frase e "Vai alla tua area". Nella console
  dei docenti la card "Link da dare agli studenti"
  (`LinkRiflessioniStudenti` in `RiflessioniReferente.tsx`, testi
  `LINK_RIFLESSIONI_STUDENTI_*` in `content.ts`) mostra l'indirizzo completo
  (`SITE_URL` + percorso) con un bottone **Copia** e la frase "Gli studenti
  lo aprono, accedono e vedono l'avviso sulle riflessioni inviate prima:
  dopo tre giorni le vedete anche voi, a meno che scelgano di no. Con «Va
  bene» le vedete subito.". C'e sempre, anche senza confermati.
- **Dove si registra**: `licei_accettazioni`, nessuna migrazione nuova.
  `documento = 'riflessioni_passate'`, `versione = '2026-10-13'`
  (`DOCUMENTO_RIFLESSIONI_PASSATE`, `VERSIONE_RIFLESSIONI_PASSATE`, la stessa
  della prima stesura), `adesione_id` dell'iscrizione dello studente,
  `testo = { avviso, avvisato_at, scelta: 'si' | 'no' | null, scelta_at,
  etichetta }` con l'avviso come lo studente lo aveva a schermo e il bottone
  premuto, congelati dal server, `accettato_at` = ora dell'ultima scrittura.
  Una riga per persona (unico su `user_id, documento, versione`). La
  scrittura (`registraRiflessioniPassate`) crea la riga solo se non c'e e la
  riscrive solo se non e cambiata dopo la lettura (stesso `accettato_at`),
  altrimenti rilegge e riprova: un "visto" e un clic che arrivano insieme non
  si cancellano a vicenda. Le righe della prima stesura (`{ domanda, scelta,
  etichetta }`) restano valide: "si" e "no" valgono come prima, la scelta
  vale da `accettato_at`, e l'avviso si segna la prima volta che si mostra.
- **Le rotte**: `GET /api/eventi/licei/studente/riflessioni-passate`
  risponde `{ disponibile, scelta, scelta_at, avvisato_at, visibili_dal,
  visibili, riservate }` (`visibili_dal` = `avvisato_at` piu tre giorni,
  null se l'avviso non e mai stato mostrato; `visibili` = la regola dei
  docenti adesso, con l'ora del server); `POST { azione: 'visto' }` o `POST
  { scelta: 'si' | 'no' }`, nient'altro (le due insieme: 400), che risponde
  con gli stessi campi. Il GET di `/api/courses/submissions` porta al box
  `riflessioni_passate: { scelta, avvisato_at, visibili_dal, visibili,
  riservate } | null`. Il browser usa `visibili` per dire chi legge
  ("Visibile anche ai docenti del tuo istituto") e, senza una scelta, per
  scegliere fra "potranno" e "possono": un orologio del dispositivo
  indietro non fa credere allo studente che le sue consegne siano ancora
  solo dello staff quando i docenti le leggono gia.
- **Vale per l'istituto di oggi**: studente e docenti leggono la riga con la
  stessa regola, cioe solo se `adesione_id` e quello dell'iscrizione attuale
  (per lo studente quella di `requireStudente` o di
  `iscrizioneLiceiPerAvviso`, dove vince la confermata; per il docente il
  suo istituto). Un avviso visto o una scelta registrati da iscritto a
  un'altra scuola per lo studente valgono come niente: l'avviso riparte da
  capo e la prossima scrittura riscrive la riga con l'istituto giusto. I
  docenti della scuola di oggi non leggono niente finche i tre giorni non
  ripartono e passano. L'id dell'adesione resta al server: al box arriva
  solo il nome dell'istituto.
- **Chi puo scegliere**: `requireStudente({ ancheInAttesa: true })`, cioe
  gli iscritti in attesa o confermati, a percorso aperto, come per
  l'avviso nel box (`iscrizioneLiceiPerAvviso`). Squadre e progetti restano
  dei soli confermati. La riga e sempre quella dell'account che chiama: la
  rotta non accetta un `user_id`, e l'istituto lo prende dall'iscrizione.
- **Che cosa cambia per i docenti**: la rotta delle riflessioni legge, per
  gli studenti confermati gia selezionati (a blocchi come il resto), le
  righe `riflessioni_passate` del proprio istituto (`user_id, testo`, senza
  filtri sul jsonb) e applica la regola nel codice. Per gli studenti le cui
  consegne di prima sono leggibili tutte le consegne sono condivise: le
  righe con il flag null entrano fra le consegne e non contano piu come
  riservate. Per gli altri restano allo staff e se ne vede solo il numero.
  Passare a "Preferisco di no" le nasconde di nuovo alla richiesta
  successiva; le consegne salvate dopo l'avviso restano visibili. Il
  docente non vede chi ha scelto che cosa: le consegne di prima compaiono e
  basta. La nota fissa della console dice: "Le consegne inviate prima
  dell'avviso diventano visibili tre giorni dopo che lo studente ha visto
  l'avviso, o subito se ha scelto «Va bene». Restano riservate se ha scelto
  che restino allo staff.". `comment` e `admin_reply` non si selezionano
  mai, `user_id` non esce, il filtro per istituto e lo stesso.
- **Informativa e email**: nell'informativa per gli studenti la frase sulle
  consegne di prima e "Quelle inviate prima le vedono tre giorni dopo che la
  piattaforma te lo segnala, a meno che tu scelga che restino solo allo
  staff." (`aggiornato` resta 2026-10-13); l'email una tantum dice "Quelle
  che hai già inviato le potranno leggere tre giorni dopo che la piattaforma
  te lo segnala, a meno che tu scelga che restino solo allo staff.".
- **Chiusura**: la cancellazione del percorso svuota tutta
  `licei_accettazioni`, quindi anche queste righe; vanno via anche in
  cascata con l'account o con l'adesione.

### Prima della migrazione

Il codice va in produzione prima della SQL, quindi ogni pezzo sa degradare
(un helper solo, `erroreSchemaMancante`, riconosce tabella o colonna
mancante):

- senza `licei_docenti` e `licei_accettazioni`: nessuno risulta docente del
  progetto, le istruzioni risultano accettate (la console si comporta come
  prima), la card dice "Funzione in attivazione", la rotta `docenti` risponde
  `{ disponibile: false }` (503 su POST e PATCH), la revoca dello staff 503;
- senza la colonna: il box della lezione non mostra l'avviso, il salvataggio
  riprova senza la colonna e riesce, le riflessioni rispondono
  `{ disponibile: false }`, il bottone dell'avviso nel pannello e spento;
- avviso e scelta sulle riflessioni di prima: senza `licei_accettazioni`,
  senza la colonna o senza `lesson_submissions` la funzione non c'e. La
  rotta dello studente risponde `{ disponibile: false }` (503 sul POST,
  anche per `visto`, e niente si registra), la card e l'avviso nel box non
  compaiono (`riflessioni_passate` e null), la consegna si salva lo stesso,
  e la rotta dei docenti si comporta come prima: le consegne di prima
  restano allo staff, perche nessun avviso risulta mostrato.

## Chi risulta iscritto e chi c'e davvero

Due cose, per mesi, non le vedeva nessuno. Non mancavano i dati: mancava chi
li guardasse.

**Il pannello staff leggeva solo `licei_adesioni`.** Il numero "Studenti
previsti" viene da `licei_stats()`, che somma `studenti_totale`: una
previsione scritta a mano dal docente nel momento in cui aderisce, quando gli
studenti non esistono ancora. Un istituto confermato a settembre che a ottobre
non ha portato nessuno era indistinguibile da uno che ne ha portati trenta.
Gli studenti veri comparivano solo nella scheda "Squadre e progetti", e solo
una volta entrati in una squadra: nelle settimane fra l'apertura delle
iscrizioni e quella delle squadre, lo staff vedeva zero studenti perche non
c'era niente da vedere, non perche non ce ne fossero.

Ora `licei_iscrizioni_stats()` restituisce, per istituto, iscritti, confermati
dal referente, da confermare e mai entrati. Il pannello li mette accanto alla
previsione, in elenco e nel dettaglio, e l'export CSV li porta con se. I
totali in cima si sommano su tutte le iscrizioni, non su quelle a schermo: la
ricerca filtra l'elenco, non la realta, e un totale che cambia mentre si
digita non e un totale.

**L'iscrizione crea l'account e manda il link della password una volta sola.**
Se lo studente non lo apre, l'account resta senza password: lui nel corso non
entra, ma in ogni elenco risulta iscritto e confermato. E' il fallimento piu
silenzioso di tutto il percorso, perche e individuale e non lascia traccia. Il
referente lo scopriva a novembre, dal fatto che quel ragazzo non aveva mai
consegnato niente.

`licei_accessi_istituto(adesione_id)` risponde alla domanda, studente per
studente. Nella console del referente diventano un contatore, un badge sulla
riga e un bottone che rimanda il link; nel suo CSV una colonna "Entrato nel
corso", perche su un foglio stampato una data di login non serve. Il link si
genera al momento dell'invio e non si conserva: un link di recupero salvato a
database vale quanto una password in chiaro.

Entrambe le funzioni leggono `auth.users`, che PostgREST non espone, quindi
sono `security definer` e revocate ad `anon` e `authenticated`. Le chiama solo
il client con la service role key, dietro le guardie che gia c'erano.
`licei_accessi_istituto` filtra per istituto **dentro** la funzione: il client
ha la service role key, RLS non lo ferma, e una funzione che restituisse tutto
lascerebbe il confine in mano a chi la chiama.

## Il progresso sul corso c'era gia, e non lo guardava nessuno

Sembrava mancare un tracciamento e invece manca solo chi lo legga. Ogni
lezione si chiude con una riflessione, la riflessione finisce in
`lesson_submissions`, e finche non e consegnata la lezione dopo resta
bloccata. Quindi il numero di righe che uno studente ha in quella tabella e
esattamente quante lezioni ha portato a termine: non "ha aperto la pagina",
ma il punto in cui e arrivato. Il dato era li da sempre, visibile solo nel
pannello delle riflessioni, una lezione alla volta e senza sapere di quale
scuola fosse quel ragazzo.

Adesso il referente vede per ogni suo studente una barra e un "9 su 23", e un
contatore di quelli che sono entrati e non hanno completato nemmeno una
lezione. Quest'ultimo e diverso da "mai entrato": qui la password ce l'hanno e
la porta l'hanno aperta, ma il corso non l'hanno iniziato, e il rimedio non e
un link ma una parola in classe. Lo staff vede la stessa cosa aggregata per
istituto, come media per studente confermato. Una media e non un totale: il
totale premierebbe la scuola grande, e qui interessa se i ragazzi seguono, non
quanti sono. Entrambi i CSV portano la colonna.

**Il conteggio si fa in TypeScript e non in SQL**, in `lib/eventi/licei-progresso.ts`,
e la ragione e che `lesson_submissions` e l'unica tabella del progetto **senza
una migrazione nel repository**: e stata creata fuori banda e vive solo in
produzione. Una funzione SQL che ci si appoggia farebbe fallire l'intera
catena di migrazioni su un ambiente nuovo. Una query normale invece fallisce
da sola, e sopra ci si mette una degradazione morbida: se la lettura non
riesce il progresso si legge come zero e i due pannelli restano in piedi,
perche il referente deve poter confermare i suoi studenti anche quando un dato
accessorio non arriva. Resta un debito: quella tabella una migrazione dovrebbe
averla, e finche non ce l'ha il progresso non puo essere aggregato a database.

La query va **a blocchi**, e la dimensione del blocco si calcola sul numero di
lezioni invece di essere un numero tondo. Due limiti si romperebbero
altrimenti, tutti e due in silenzio: la URL, perche PostgREST riceve gli
identificativi nella query string e qualche centinaio di uuid la fa rifiutare
dal proxy, e il tetto di righe per risposta, perche un blocco di N studenti ne
produce fino a N per il numero di lezioni. Con blocchi grandi la risposta
verrebbe troncata senza dirlo, e mancherebbero lezioni proprio alle scuole
piu avanti, cioe il conteggio sarebbe sbagliato per difetto dove conta di piu.

## Una squadra sta dentro un istituto

Da 2 a 5 studenti, tutti della stessa scuola. Le due decisioni hanno ragioni
diverse e vale la pena tenerle distinte.

**Il cinque** e il numero dell'art. 6: la rappresentanza che parte per il
premio. Farli coincidere significa che la squadra vincitrice ci va al
completo, e nessuno resta a casa a guardare le foto dei compagni a New York.
La lezione 4.4 del corso dice 2-4 e va riallineata quando si tocca.

**Il minimo di due** viene dall'art. 3, che chiede un lavoro in team: uno
studente da solo non e un team. Vale alla consegna, non alla creazione, perche
una squadra nasce con il suo fondatore e cresce nei giorni successivi.

**L'istituto unico** discende dall'art. 4. E' l'istituto che raccoglie le
candidature, custodisce le autorizzazioni e risponde dei suoi studenti, e il
referente conferma solo i propri: una squadra a cavallo di due scuole non
avrebbe un referente che ne risponde, e all'evento finale non si saprebbe
quale istituto accompagna quei ragazzi.

Il vincolo e imposto in tre punti, e non e ridondanza inutile: l'API filtra
per `adesione_id` quando risolve il codice della squadra, un trigger lo
ricontrolla in scrittura, e il tetto di cinque e preso con un
`pg_advisory_xact_lock` per squadra. Il lock serve: senza, due studenti che
entrano nello stesso istante leggono entrambi quattro e diventano sei.

L'appartenenza e una colonna su `licei_iscrizioni`, non una tabella ponte.
Uno studente sta in una squadra sola e la colonna lo impone da se; una tabella
ponte reggerebbe un molti a molti che qui non esiste e chiederebbe un vincolo
in piu per escluderlo.

## Il modulo di consegna e la griglia dell'art. 7 girata in domande

Sei campi, uno per criterio, e sopra ognuno c'e scritto quale criterio
alimenta e quanto vale. Non e decorazione: se la Commissione assegna 15 punti
agli aspetti etici e il modulo non li chiede, valuta un capitolo che a nessuno
e stato chiesto di scrivere, e i ragazzi perdono quei punti senza capire
perche. Il legame vive in `CRITERI_LICEI[].campo`, che e la stessa stringa
delle colonne di `licei_valutazioni`.

I limiti di caratteri sono bassi di proposito. Sintetizzare fa parte del
lavoro, e una Commissione che legge trenta progetti legge davvero solo quelli
che stanno in una pagina.

I materiali sono **un link, non un caricamento**: il sito non conserva file
prodotti da minori se puo evitarlo, e una presentazione su Drive fa lo stesso
lavoro restando in mano a chi l'ha fatta.

La consegna la fa il capitano, la bozza la scrive chiunque sia in squadra. Il
progetto e di tutti, ma dell'atto finale deve rispondere qualcuno. Dopo la
consegna il progetto non si tocca piu, e dalla squadra non si esce: l'elenco
degli autori di un lavoro consegnato non e piu modificabile.

## Commissione: schede individuali e voto dell'art. 8

`/eventi/vivere-piu-a-lungo/licei/commissione`, per chi sta in
`licei_commissari` ed e attivo. **Non e la guardia dello staff**: un admin che
non e in Commissione non vota, un commissario che non e admin non tocca la
configurazione. Confonderli significherebbe che chi apre e chiude le fasi puo
anche assegnare i punteggi.

Tre scelte, tutte contro la comodita:

- **Ogni commissario vede solo le proprie schede.** Il punteggio dei colleghi
  non compare da nessuna parte. Un voto letto prima di dare il proprio lo tira
  verso di se, e cinque giudizi ancorati valgono meno di cinque indipendenti.
- **Non ci sono i nomi degli studenti.** La Commissione valuta progetti, non
  ragazzi: i sei criteri si applicano tutti al lavoro, e fra i commissari ci
  sono esperti esterni e rappresentanti d'impresa che non hanno ragione di
  ricevere l'anagrafica di trenta minorenni. Restano il nome della squadra e
  l'istituto, che servono a discutere in seduta.
- **Una scheda entra in classifica solo quando viene chiusa**, e per chiuderla
  servono tutti e sei i punteggi. Una scheda a meta non e un voto basso, e un
  voto non ancora dato: farla pesare penalizzerebbe un progetto senza che
  nessuno lo abbia deciso.

La colonna `diritto_voto` esiste per una riga sola dell'art. 8: il referente
del consorzio dei licei siede in Commissione "con funzioni consultive e senza
diritto di voto". Senza quella colonna, l'unico modo di rispettarlo sarebbe
chiedergli di non compilare la scheda, che non e un controllo. Il diritto
segue il ruolo scelto nel pannello, cosi non lo si puo dimenticare.

La classifica (`licei_classifica()`) e la media dei totali delle sole schede
chiuse dei commissari votanti e attivi, ordinata per punteggio e, a parita,
per innovativita, che l'art. 7 indica come criterio dirimente. Il terzo
livello e la data di consegna: non e nel bando, serve a rendere l'ordinamento
deterministico.

## Finalisti: designare e iscrivere sono due comandi

**Designare** propone i primi dieci in base ai punteggi di quel momento e
azzera i finalisti precedenti. Non e un automatismo cieco: fra la classifica e
il palco puo esserci una ragione che il database non conosce, e lo staff
corregge a mano. Serve a evitare che qualcuno ricopi dieci righe da una
classifica, che e il modo piu facile di sbagliare l'unica cosa che non si puo
sbagliare. Un progetto senza nessuna scheda chiusa resta fuori: non e ultimo,
e non classificato, e non deve salire sul palco solo perche la classifica e
corta.

**Iscrivere** manda i componenti confermati delle squadre finaliste dentro
`event_registrations` per il giorno 1, riusando la RPC `event_register`, e poi
forza `is_waitlist = false`: la capienza vale per il pubblico, non per chi e
in programma. L'operazione e ripetibile, chi c'e gia resta dov'e, e l'email
parte solo ai nuovi.

Sono due comandi separati perche fra il calcolo e l'iscrizione ci deve essere
il momento in cui qualcuno guarda l'elenco.

L'iscrizione d'ufficio si regge su cose gia acquisite: i ragazzi sono nel
database con nome, cognome ed email, l'istituto si e impegnato nell'art. 4 a
favorire la partecipazione all'evento finale, l'autorizzazione dei genitori e
in segreteria e il loro progetto e in programma. Rimandarli a un modulo
pubblico significherebbe mettere un ostacolo fra loro e una sedia che e gia
la loro, e rischiare che qualcuno non lo compili e resti fuori dalla
presentazione del proprio lavoro. Non viene chiesto ne dato alcun consenso
marketing: un'iscrizione d'ufficio non e l'occasione per darselo da soli.

## Il bando dentro il corso

Squadra e progetto vivono in due posti: la pagina `/licei/studente`, che le
mostra entrambe, e due lezioni del corso, che ne mostrano una ciascuna.

- `lesson-4-4` mostra la **squadra**, perche e la lezione che chiede di
  formarla;
- `course-closing` mostra la **consegna**, perche e l'ultima cosa che si fa.

Non e ridondanza. Chiedere a uno studente di sedici anni di ricordarsi un
indirizzo nel momento esatto in cui la lezione gli dice di fare una cosa
diversa e il modo piu affidabile di non farsi trovare.

L'aggancio e uno **slot**, `extra`, non un condizionale dentro
`LessonPageClient`: quel file non deve sapere che esiste un bando licei. Chi
decide che cosa attaccare e la pagina, che ha gia il contesto dell'utente. Il
giorno che un secondo percorso deve attaccarsi a una lezione, si aggiunge una
riga a `LEZIONI_LICEI` e nient'altro.

Il controllo "questo utente e uno studente confermato" si fa **lato server**
(`studenteLiceiConfermato`), non nel browser. Il corso lo segue anche chi con
il bando non c'entra: una chiamata che a loro risponde 403 farebbe comparire
e sparire un riquadro d'errore su un bando che non li riguarda.

Il riquadro si presenta per quello che e, invece di confondersi con la
lezione: il corso e in inglese e aperto a chiunque, quel pezzo e in italiano
e riguarda un bando a cui si aderisce tramite la scuola.

## Il podio si decide dopo il palco

L'evento dura due giorni: il 10 dicembre i dieci gruppi presentano, l'11 c'e
la premiazione. Fra i due momenti la Commissione rivede il criterio "Qualita
della presentazione", che sui materiali consegnati si puo solo stimare e dal
vivo si vede davvero. Per questo le schede si **riaprono**, e per questo il
commissario legge un avviso su quel criterio: senza, darebbe un voto
definitivo su una cosa che non ha ancora visto.

Ne segue che **finalista e premiato non sono la stessa cosa**: sul palco
salgono in dieci, il premio lo prendono in tre. Il pannello li tiene
distinti, e il premio non e una colonna a database ma si deriva dalla
posizione (`premioPerPosizione`), cosi le due cose non possono dissentire.

Assegnare un premio a una squadra che ne aveva gia un altro le **scambia**,
invece di lasciare la precedente senza posizione: durante una premiazione si
corregge un ordine, non si toglie qualcuno dall'elenco per sbaglio.

## Dati degli istituti nella fase 1

In questa fase il sito **non tocca alcun dato di minori**. Il modulo raccoglie
quanti studenti l'istituto prevede di coinvolgere per anno di corso, non i
nomi. I tre anni si contano separati perche l'art. 2 rende prioritarie quarte e
quinte: serve la platea reale, non solo il totale.

Le autorizzazioni dei genitori restano cartacee e in custodia alla scuola: il
sito non le raccoglie e non le conserva. L'impegno a raccoglierle e custodirle
e una delle quattro spunte del modulo, ed e l'unica che non viene dal testo
dell'art. 4: discende dall'art. 4 e dal fatto che gli studenti del triennio
sono in larga parte minorenni.

Quando arrivera l'iscrizione degli studenti, il disegno previsto e: nome,
cognome, classe, anno di corso ed email, e nient'altro. Niente data di
nascita, niente codice fiscale, niente contatti dei genitori. L'anno di corso
sostituisce l'eta ed e meno identificante.

## Un istituto, un'adesione

La chiave di deduplicazione e il **codice meccanografico**, non l'email del
referente: due docenti della stessa scuola devono collidere, non creare due
adesioni. Chi ci riprova riceve un 409 con l'invito ad accedere.

Aggiornare un'adesione esistente puo farlo solo chi l'ha inviata, autenticato:
senza quel controllo basterebbe conoscere un codice meccanografico, che e un
dato pubblicamente reperibile, per riscrivere l'adesione di un altro istituto.
Se il referente cambia, il cambio lo fa lo staff.

Il modulo e pubblico e lega l'account che trova per email. Per questo
un'adesione **nuova** si rifiuta (409, "Non è possibile registrare
l'adesione con questa email del referente. Scrivi a info@bioergotech.org e
sistemiamo noi.") quando quell'account, o l'account con cui si e entrati, e
gia referente di un'altra adesione o docente del progetto non revocato di un
altro istituto: altrimenti chiunque conosca l'email di un docente potrebbe
fargli rispondere 409 dalla guardia e togliergli l'accesso alla sua scuola.
Lo staff non passa da questo controllo; un docente che segue davvero due
scuole lo sistemiamo a mano.

L'aggiornamento non scrive mai `user_id`: lo completa solo se e vuoto e chi
scrive non e staff. Prima, quando lo staff correggeva un'adesione dal modulo
pubblico, l'adesione passava al suo account e il referente vero perdeva
l'accesso senza accorgersene.

L'aggiornamento non tocca `stato` e `note_staff`: la verifica gia fatta non si
azzera perche il referente corregge un numero.

## La conferma manuale e la difesa

Un'adesione nasce `ricevuta` e non e attiva finche lo staff non la porta a
`confermata`. Non e burocrazia: il modulo e pubblico, il codice meccanografico
e reperibile online e nel sito non c'e rate limiting. La conferma manuale e
la vera difesa contro le adesioni finte.

## Pannello staff

`/eventi/vivere-piu-a-lungo/licei/admin`, accesso `partnership_level = admin`.

- In cima, lo stato della raccolta: e da li che si pubblica la scadenza quando
  il consorzio la comunica, senza un rilascio.
- Elenco con ricerca e filtri. **La ricerca la fa il database**, non la
  memoria: con tutti i licei della provincia, scaricare tutto e filtrare in JS
  non regge.
- Conteggi: istituti, confermati, studenti previsti, attesi al PalaMazzola.
  Gli ultimi due servono a dimensionare il percorso e i posti dell'evento.
- Stato e note interne per adesione, export CSV.
- Nel dettaglio di un'adesione, sotto "Referente", i "Docenti del progetto"
  con stato, date e il bottone Revoca.
- La card "Avviso agli studenti sulle riflessioni", con l'anteprima del testo
  e il bottone che lo invia una volta sola (vedi sopra).

## Chiusura del percorso

L'informativa promette due cose: l'accesso di docenti (referenti e docenti del
progetto) e commissari si spegne a fine corso, e account, elaborati, progetti
e avanzamento si cancellano entro un mese dalla conclusione. La scheda
**Chiusura** del pannello staff le mantiene, con due comandi separati e la
parola `CHIUDI` da scrivere per ciascuno (il controllo e ripetuto nella rotta,
non solo nel browser).

1. **Disattiva gli accessi.** Scrive `percorso_chiuso_at` in `licei_config`.
   Da quel momento `requireDocente`, `requireStudente` e
   `requireCommissario` rispondono 403 con "Il percorso si è concluso e
   l'accesso è stato disattivato.", e i cancelli di adesioni e iscrizioni
   respingono i non staff. Le pagine pubbliche non cambiano. Si annulla con
   "Riattiva gli accessi", ma solo finche i dati ci sono.
2. **Cancella i dati del percorso.** Abilitata solo dopo il passo 1. In
   quest'ordine: riflessioni delle lezioni (`lesson_submissions`), account,
   poi schede, commissari, accettazioni (istruzioni dei docenti e scelte
   degli studenti sulle riflessioni di prima), docenti del
   progetto e adesioni (la cascata porta via iscrizioni, squadre e progetti).
   Le tabelle che non esistono ancora si saltano. Gli account vanno prima
   delle righe perche le righe sono l'unico registro di quali account
   appartengono al percorso: se un account non si cancella, la rotta si ferma
   con le righe ancora al loro posto e il comando si puo ripetere.

Rotta: `app/api/eventi/licei/admin/chiusura/route.ts` (GET anteprima, POST
`disattiva`, `riattiva`, `cancella`).

**Quali account si cancellano.** Solo quelli che il database mostra usati
dal percorso licei e da nient'altro (referenti, docenti del progetto,
revocati compresi, studenti, commissari). Un account resta se e staff
(`partnership_level = admin`), se e membro o partner del portale o ha una
domanda di adesione, se compare in
`applications`, `projects`, `knowledge_documents`, `equipment_proposals`,
`event_attendees`, `events`, `coin_transactions`, `redemption_requests`, nelle
tabelle `universita_*`, in `bando_applications` o in `event_registrations`
(per id o per email). Di chi resta si cancellano comunque i dati del
percorso; le riflessioni si tengono solo se la persona segue il corso anche
per un'altra via (staff, portale, percorso universitario). Se una qualsiasi
di queste verifiche va in errore, la cancellazione si rifiuta: una tabella
assente conta come vuota, una query fallita no.

**Che cosa resta.** `event_registrations` (i finalisti iscritti all'evento
seguono la conservazione dell'evento) e `newsletter_subscribers` (consenso a
parte).

**Il registro.** `dati_cancellati_at` e `dati_cancellati_esito` (JSON con i
soli conteggi: `licei_config` e leggibile da chiunque, quindi niente email
ne id). Il pannello mostra "Dati cancellati il ..." con i numeri.

Nessuna migrazione: tutto vive in `licei_config`, che e gia chiave/valore.
Le tre chiavi non stanno in `CONFIG_CHIAVI`, quindi la rotta generica della
configurazione non le puo scrivere. Per una nuova edizione del percorso le
tre righe vanno tolte a mano:
`delete from public.licei_config where chiave in ('percorso_chiuso_at', 'dati_cancellati_at', 'dati_cancellati_esito');`

## Debito noto

Le primitive del form (`FieldLabel`, `AreaTesto`, `Consenso`, l'indicatore dei
passi, l'honeypot) sono duplicate da `BandoForm.tsx`, e `LiceiIndice` e quasi
identico a `BandoIndice`. E deliberato: la pagina del bando era in lavorazione
mentre questo modulo nasceva, e condividerle allora avrebbe significato
toccarla. Vanno estratte quando quella si sara assestata, insieme a
`generateCodice(prefix)`, oggi in tre copie fra `registration.ts`, `bando.ts` e
`licei.ts`, e a `csvCell`, oggi in tre rotte di export.

## Variabili d'ambiente

Le stesse gia in uso: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`RESEND_API_KEY`, `NEXT_PUBLIC_SITE_URL`.

## Che cosa manca

Sul codice, niente di strutturale. Il percorso e completo da capo a fondo:
adesione, iscrizione, squadra, progetto, valutazione, podio, evento.

Quello che resta e operativo e non si puo anticipare da qui:

1. **Provare la catena con dati veri.** Il procedimento passo per passo,
   con i dati finti che passano le validazioni, la trappola delle finestre
   loggate, che cosa deve succedere a ogni passo e la pulizia dopo, sta in
   [`COLLAUDO.md`](./COLLAUDO.md). Serve mezz'ora e va fatto prima che ci
   siano dentro trecento ragazzi.
2. **Il calendario**, qui sotto.

## Il vincolo di calendario, che resta

Contando all'indietro dal 10 dicembre: la consegna chiude a meta novembre, la
valutazione ha bisogno di due settimane, quindi le squadre vanno formate entro
meta ottobre e le iscrizioni aperte a settembre, a scuole appena riaperte.
Sono circa dieci settimane di corso. O il percorso si comprime, o alcune fasi
si sovrappongono.

E' una decisione del consorzio, non del sito, ma condiziona quando i quattro
interruttori vanno messi su `aperte`, e vanno messi in quest'ordine:
`stato_iscrizioni`, `stato_squadre`, `stato_consegne`, `stato_valutazione`.

## Conferma automatica delle adesioni

`conferma_adesioni` in `licei_config`, modificabile dal pannello staff:
`automatica` (default) oppure `manuale`. In automatico un'adesione nuova
nasce `confermata`: il codice accetta subito le iscrizioni e il referente
riceve insieme l'email di adesione e quella di conferma. La verifica dello
staff si sposta dopo: un'adesione non autentica si mette su `ritirata`, e il
codice smette di accettare iscrizioni. La guida del docente mostra il passo
giusto per la modalità in uso. Le adesioni gia esistenti non cambiano stato.
