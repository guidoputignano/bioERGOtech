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
| Area del referente | `app/eventi/vivere-piu-a-lungo/licei/referente/` |
| Modulo autorizzazione | `licei/referente/generaAutorizzazione.ts` |
| Area dello studente | `app/eventi/vivere-piu-a-lungo/licei/studente/` |
| Area della Commissione | `app/eventi/vivere-piu-a-lungo/licei/commissione/` |
| Pannello staff | `app/eventi/vivere-piu-a-lungo/licei/admin/` |
| Invio adesione | `app/api/eventi/licei/adesioni/route.ts` |
| Invio iscrizione | `app/api/eventi/licei/iscrizioni/route.ts` |
| API referente | `app/api/eventi/licei/referente/` |
| API squadre | `app/api/eventi/licei/squadre/route.ts` |
| API progetto | `app/api/eventi/licei/progetto/route.ts` |
| API Commissione | `app/api/eventi/licei/commissione/route.ts` |
| API staff | `app/api/eventi/licei/admin/` |
| Tipi e validazione | `lib/eventi/licei.ts`, `licei-iscrizioni.ts`, `licei-squadre.ts` |
| Helper server | `lib/eventi/licei-server.ts` |
| Email di conferma | `lib/eventi/licei-email.ts` |
| Migrazioni | `supabase/migrations/20261204000000_create_licei_adesioni.sql`, `20261205000000_create_licei_iscrizioni.sql`, `20261206000000_create_licei_squadre_progetti.sql` |

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

Le autorizzazioni restano **cartacee e in custodia all'istituto**. Il sito
genera il modulo da far firmare (`generaAutorizzazione.ts`, che gira nel
browser del referente e non contiene dati di studenti) ma non raccoglie il
modulo firmato: in `licei_iscrizioni` non esiste alcuna colonna per i genitori,
ed e deliberato. Lo studente dichiara di averlo consegnato; la prova e il
foglio in segreteria, e chi la verifica e il referente quando conferma.

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

Il percorso e completo da capo a fondo: adesione, iscrizione, squadra,
progetto, valutazione, finalisti, evento. Quello che resta non e struttura.

1. **Agganciare le squadre alla lezione 4.4 del corso**, che oggi vivono in
   una pagina separata (`/licei/studente`). L'aggancio va fatto con un
   condizionale in `app/courses/agentic-ai/lesson/[slug]/page.tsx`, mai con un
   fork di `LessonPageClient`: e da li che nascerebbe un secondo binario da
   tenere allineato a mano. Va anche riallineato il testo della 4.4, che dice
   ancora 2-4 studenti mentre il tetto e 5.
2. **Notificare il referente** quando una sua squadra consegna. Oggi lo vede
   nella sua area, ma non gli arriva niente.
3. **Premi e graduatoria finale.** L'art. 6 assegna tre premi ai primi tre, e
   oggi il sito registra la posizione ma non distingue il podio dal resto dei
   dieci. Serve quando la Commissione delibera, non prima.

## Il vincolo di calendario, che resta

Contando all'indietro dal 10 dicembre: la consegna chiude a meta novembre, la
valutazione ha bisogno di due settimane, quindi le squadre vanno formate entro
meta ottobre e le iscrizioni aperte a settembre, a scuole appena riaperte.
Sono circa dieci settimane di corso. O il percorso si comprime, o alcune fasi
si sovrappongono.

E' una decisione del consorzio, non del sito, ma condiziona quando i quattro
interruttori vanno messi su `aperte`, e vanno messi in quest'ordine:
`stato_iscrizioni`, `stato_squadre`, `stato_consegne`, `stato_valutazione`.
