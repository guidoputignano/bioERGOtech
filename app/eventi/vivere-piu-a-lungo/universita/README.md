# Percorso universitario . Biotecnologie e Intelligenza Artificiale

Sotto modulo della pagina evento, sullo stesso modello di `licei/` e `bando/`.
Fonte: il testo del bando del 2 settembre 2026 di Fondazione bioERGOtech e
SafesPro.

## La differenza che conta

Nel bando dei licei aderisce l'istituto, tramite un docente referente, e
gli studenti vengono iscritti dalla scuola. Qui il candidato e il singolo
studente universitario. Non esistono quindi codice d'istituto, referente che
conferma, ne flusso di adesione in due passaggi. Chi lavora su questo modulo
non deve riusare niente di quella catena.

Nei testi si scrive sempre "studenti universitari". Mai "le universita" come
destinatarie o come vincitrici: gli atenei non sono parte del bando.

## Le due fasi

**Fase 1**, migrazione `20261207000000`. La raccolta delle pre-iscrizioni.
Una tabella, un codice, una email di conferma.

**Fase 2**, migrazione `20261210000000`. Tutto il resto: l'account, il corso,
le squadre, la bacheca, la consegna, la Commissione, i mentor e il pannello
staff.

La fase 1 si fermava dove il candidato aveva finito di compilare. Da li in
poi, per settimane, non succedeva niente: nessun account, quindi nessun
accesso al corso, che pure esisteva gia; nessuna squadra, benche l'art. 2 le
incoraggi; nessun mentor, benche l'art. 5 li prometta. La fase 2 e la parte
che rende vero quello che la pagina diceva.

## Le tre differenze strutturali rispetto ai licei

Ritornano in quasi ogni scelta del modulo, e vale la pena tenerle in mente
prima di toccare qualcosa.

**1. Non esiste l'istituto.** Nei licei la squadra sta dentro una scuola,
`licei_squadre.adesione_id`, perche e la scuola che raccoglie le candidature
e che risponde dei suoi studenti. `universita_squadre` non ha quella colonna,
e non e una dimenticanza: l'art. 2 incoraggia i team interdisciplinari, e un
team interdisciplinare quasi sempre attraversa due dipartimenti e spesso due
atenei. Il vincolo dei licei, qui, sarebbe il contrario di quello che il
bando chiede. `universita_classifica()` conta apposta quante universita
diverse ci sono dentro ogni squadra: senza quel numero nessuno saprebbe se
l'interdisciplinarita e successa davvero.

**2. Non esiste il referente.** Nei licei e il docente che dice "questo
ragazzo e mio", e senza quella conferma lo studente non fa niente. Qui quel
ruolo se lo dividono due cose: `universita_candidature.stato`, che lo staff
controlla, e la richiesta di ingresso in squadra, che il capitano accetta.

**3. Non sono minorenni.** La cautela del modulo licei sul minimo dato
raccolto nasce dall'eta dei suoi iscritti. Qui i candidati sono adulti,
quindi la bacheca e possibile. Resta a consenso esplicito e revocabile, resta
chiusa a chi non e nel percorso, e non contiene mai l'email.

## L'account, e perche la rotta lo crea

`app/api/eventi/universita/route.ts` cerca un profilo con quella email e, se
non lo trova, crea l'utente e genera il link per impostare la password. E' lo
stesso blocco della rotta delle iscrizioni dei licei, e serve alla stessa
cosa: le lezioni del corso sono protette da login, quindi senza un account il
candidato non puo seguire il percorso a cui si e appena candidato.

Si cerca prima il profilo perche chi e gia registrato sul sito, per il Member
Portal o per un altro bando, non deve ritrovarsi un secondo account con lo
stesso indirizzo.

Chi apre l'email e rimanda a dopo si ritrova un account senza password: non
entra, mentre in ogni schermata dello staff risulta regolarmente candidato.
Il rimedio e il pulsante "Invia il link di accesso" del pannello, che rifa
`generateLink` e rimanda `universitaAccessoEmailHtml`.

## Lo stato della candidatura, e l'interruttore che lo decide

`stato` vale `candidata`, `confermata` o `esclusa`. Il default a database e
`candidata`; la rotta scrive `confermata` finche la chiave
`conferma_automatica` di `universita_config` resta a `si`.

Non e una contraddizione. Il default protegge le righe che non passano dalla
rotta, per esempio una futura importazione; l'interruttore decide il caso
normale. Lo staff lo spegne solo se l'art. 4 va davvero esercitato, cioe se
le candidature superano i posti.

L'accesso al corso NON dipende da questo stato, e dipende solo dall'account.
La ragione e che il corso e gratuito e aperto a chiunque apra un account sul
sito: tenerlo chiuso a un candidato in attesa sarebbe una recita, non un
filtro. Quello che lo stato governa e il resto, cioe squadra, bacheca e
consegna, attraverso `requireCandidato()`.

Le candidature raccolte prima della fase 2 sono state portate a `confermata`
dalla migrazione: erano state presentate quando questo stato non esisteva e
nessuno aveva chiesto loro niente di piu.

## Le squadre, e le due strade per entrarci

Chi i compagni li ha gia crea la squadra e passa il codice `UST-XXXXXX`. Chi
non conosce nessuno passa dalla bacheca e manda una richiesta, che il
capitano accetta o rifiuta.

Le due strade convivono, e la seconda non e un lusso. Nei licei la squadra si
forma in classe, fra banchi che si conoscono da anni, e chi resta fuori e
l'eccezione. Qui la candidatura e individuale e arriva da atenei diversi,
quindi il caso normale e arrivare senza conoscere nessuno: senza bacheca,
"i team si costituiscono in un secondo momento" significherebbe che si
costituiscono fra chi si conosceva gia, e l'interdisciplinarita dell'art. 2
resterebbe un augurio.

Perche una richiesta e non il solo codice: il codice basta quando lo riceve
una persona che lo ha avuto da un compagno. La bacheca mette in contatto
persone che non si sono mai viste, e se bastasse il codice anche li, una
squadra che si dichiara in cerca si troverebbe dentro chiunque passi, e per
uscirne dovrebbe sciogliersi.

Due interruttori sulla riga della persona e non uno: `consenso_board` e il
permesso, che si da una volta e si puo revocare, `cerca_squadra` e lo stato
del momento, che si spegne da solo appena si entra in una squadra. Chi torna
a cercare compagni non deve ridare un consenso mai ritirato.

La bacheca **non contiene l'email**, ne lato client ne lato rotta. E' una
presentazione, non una rubrica: i contatti si scambiano quando una richiesta
viene accettata.

Chi esce da una squadra e ne era il capitano lascia il ruolo al componente
piu anziano, e se non resta nessuno la squadra passa a `sciolta`. Una squadra
senza capitano non potrebbe rispondere alle richieste, e una squadra che non
risponde alle richieste e invisibile alla bacheca.

## I mentor, e perche sono una tabella

Il sito tiene le persone in file versionati: `app/people/people.ts`,
`lib/team.ts`, `RELATORI` nel modulo evento. E' la scelta giusta per un
elenco curato a mano, che cambia raramente e che nessuno propone da fuori.

Qui la proposta arriva da fuori. Con un array in TypeScript ogni approvazione
sarebbe un commit e un rilascio, e chi approva non e chi rilascia: le
candidature si accumulerebbero in attesa di uno sviluppatore.

Quello che non cambia e la regola del consenso. Come `daAutorizzare` per i
relatori dell'evento, un mentor compare in pagina solo se ha acconsentito a
comparirci, e **approvata e pubblicata restano due cose distinte**: si puo
essere mentor del percorso senza essere in elenco. Il pannello staff lo
segnala apposta, perche altrimenti qualcuno si chiederebbe perche la pagina
non lo mostra.

L'account del mentor nasce all'approvazione, non alla candidatura: prima di
quel momento non ha niente da vedere.

`universita_mentor_squadre` e il punto in cui il mentoring smette di essere
una riga di testo in pagina e diventa un legame fra due righe. La policy RLS
su `universita_progetti` lo usa: un mentor vede i progetti delle squadre che
segue, e solo quelli.

## Le fasi, e perche partono tutte chiuse

`universita_config`, chiave/valore, modificabile dal pannello staff. Come per
i licei, e per la stessa ragione: l'art. 11 rimanda termini e modalita ai
canali ufficiali, quindi le date non possono vivere in `content.ts`, dove
ogni comunicazione degli organizzatori richiederebbe un rilascio del sito.

- `conferma_automatica`: `si` (default) oppure `no`.
- `stato_squadre`: `chiuse` (default) o `aperte`.
- `stato_board`: `chiusa` (default) o `aperta`.
- `stato_consegne`: `chiuse` (default) o `aperte`. Chiuderlo **e** il termine.
- `scadenza_consegna_label`: il termine in chiaro, quando arriva.
- `stato_valutazione`: `chiusa` (default) o `aperta`.
- `avviso`: riga di avviso in cima alla pagina. Vuota per non mostrarla.

Ogni fase parte chiusa e si apre a mano. Non e prudenza: aprire le consegne
prima che esistano le squadre, o la valutazione prima che esistano i
progetti, produce schermate che non hanno niente da mostrare a chi le apre.

`leggiConfigUniversita()` torna ai default se la tabella non risponde, e i
default sono i piu prudenti possibili: a database irraggiungibile non si apre
nessuna fase.

Lo staff attraversa comunque ogni cancello, cosi il percorso si puo provare
da capo a fondo a fasi chiuse. Un flusso che si collauda solo aprendolo al
pubblico non si collauda.

## La Commissione

`universita_valutazioni` ha sei colonne di punteggio ai tetti dell'art. 7,
che **non sono quelli dei licei**: 25 + 25 + 20 + 15 + 10 + 5. Il totale e
una colonna generata dal database, cosi nessuna schermata puo sbagliarlo.

Schede individuali, come nei licei e per la stessa ragione: un voto letto
prima di dare il proprio lo ancora, e la media di cinque giudizi ancorati
vale meno di cinque giudizi indipendenti. La rotta non restituisce mai il
punteggio di un altro commissario, e la policy RLS dice la stessa cosa al
livello sotto.

`pubblicabile` non e un criterio a punti. L'art. 7 chiede di tenere conto
anche della possibilita che il lavoro diventi un articolo sottoponibile a
peer review: e un giudizio, e sta nella scheda perche altrimenti resterebbe
solo nella testa di chi lo da. Orienta la scelta dell'art. 9, che e il premio
vero di questo bando.

Un commissario senza diritto di voto scrive note e non numeri, e la console
gli nasconde del tutto i campi numerici: mostrare campi disabilitati a chi
strutturalmente non puo usarli e rumore.

La parita ulteriore, che l'art. 7 rimanda al voto del Presidente, non e nel
codice: e la decisione di una persona, e il database non la puo prendere.

## Sicurezza: la cosa da non rompere

Ogni rotta di questo modulo usa la service role key, che **scavalca la RLS**.
Le policy sono una rete, non il cancello. Il cancello e la guardia:
`requireCandidato`, `requireCommissarioUniversita`, `getEventAdminClient`.

Da qui la regola che vale in ogni handler: si filtra per un id che la guardia
ha dimostrato appartenere a chi chiama, cioe `ctx.candidatura.id`,
`ctx.candidatura.squadra_id`, `ctx.commissario.id`. Un id che arriva nel
corpo della richiesta non dimostra niente, e usarlo come se lo dimostrasse e
il modo in cui questo modulo si romperebbe.

## Catena tecnica

| Pezzo | File |
| --- | --- |
| Configurazione e testi | `content.ts` |
| Pagina del bando | `page.tsx` |
| Barra delle sezioni | `UniversitaIndice.tsx` |
| Modulo di pre-iscrizione | `PreIscrizioneForm.tsx` |
| Area del partecipante | `studente/` |
| Area della Commissione | `commissione/` |
| Pagina pubblica dei mentor | `mentor/` |
| Candidatura a mentor | `mentor/candidatura/` |
| Pannello staff | `admin/` |
| Aggancio al corso | `app/courses/agentic-ai/lesson/[slug]/page.tsx` (`LEZIONI_UNIVERSITA`) |
| Rotta di pre-iscrizione | `app/api/eventi/universita/route.ts` |
| Squadre | `app/api/eventi/universita/squadre/route.ts` |
| Bacheca e richieste | `app/api/eventi/universita/board/route.ts` |
| Progetto | `app/api/eventi/universita/progetto/route.ts` |
| Commissione | `app/api/eventi/universita/commissione/route.ts` |
| Mentor, pubblica | `app/api/eventi/universita/mentor/route.ts` |
| Staff | `app/api/eventi/universita/admin/` |
| Tipi e validazione | `lib/eventi/universita.ts`, `universita-squadre.ts`, `universita-mentor.ts` |
| Client service role, config e guardie | `lib/eventi/universita-server.ts` |
| Email | `lib/eventi/universita-email.ts` |
| Migrazioni | `supabase/migrations/20261207000000_create_universita_candidature.sql`, `20261210000000_universita_percorso.sql` |

## Il modulo di pre-iscrizione

Resta leggero e si compila in un paio di minuti: nome, cognome, email,
universita, corso di studi, livello, area disciplinare, una riga facoltativa
sugli interessi di ricerca e due caselle obbligatorie.

L'art. 4 elenca molte altre cose (CV, competenze, proposta di progetto,
compagni di team), ma le elenca **a titolo esemplificativo**. In questa fase
serve raccogliere adesioni, non selezionare: chiederle adesso costerebbe
candidature senza aggiungere informazione utile. L'elenco completo resta
visibile in pagina, cosi il candidato sa cosa potra servire dopo.

La proposta di progetto arriva dove ha senso che arrivi, cioe nella consegna
della squadra, dove i sei campi sono i criteri dell'art. 7 girati in domande.
Il "TODO fase 2" che stava qui e quindi chiuso, ma non nel modo in cui era
stato immaginato: non un secondo modulo di candidatura, ma il progetto di un
team.

## Iscrizione all'evento

Candidarsi al bando e iscriversi alla giornata del 10 dicembre restano due
cose distinte, come gia per il bando startup. I due moduli non sono
collegati, e la pagina lo dice in tre punti: sotto il modulo, nelle FAQ e
nell'email di conferma.

## Le email

Sette momenti, sette builder in `lib/eventi/universita-email.ts`: candidatura
ricevuta, nuovo link di accesso, candidatura confermata, richiesta ricevuta
dal capitano, esito della richiesta, candidatura a mentor ricevuta, esito
della candidatura a mentor, piu l'onboarding di un commissario.

Il guscio HTML e una funzione e non sette copie, a differenza del modulo
licei. Li la scelta di ripeterlo era giusta finche le email erano tre; sette
copie della stessa tabella di quaranta righe garantiscono solo che prima o
poi una diverga dalle altre senza che nessuno se ne accorga. Quello che non
si condivide e il testo: ogni email dice la sua cosa.

## Numerazione degli articoli

Nel documento originale le disposizioni finali sono numerate di nuovo
"Art. 10", per un errore. Sul sito sono "Art. 11".

I numeri di sequenza delle sezioni della pagina (`numero="04"` e simili) sono
la posizione nella pagina, non il numero dell'articolo, e le due cose non
coincidono: la sezione 04 e il corso, che sta dentro l'art. 3, e la sezione
10 sono le squadre, che stanno dentro gli art. 2 e 4. Chi inserisce una
sezione deve rinumerare quelle successive e ribaltare l'alternanza degli
sfondi, che va bianco / grigio senza eccezioni.

## Cosa manca ancora

- **Il premio dell'art. 6**, `PREMIO_TESTO`, resta da confermare. Il bando
  originale dice "rivista di fascia A"; qui si usa "rivista scientifica
  internazionale peer-reviewed, indicizzata Scopus o Web of Science", perche
  la classificazione in fasce dell'ANVUR riguarda l'area umanistica e sociale
  e non si applica alle scienze della vita.
- **`SCADENZA_CANDIDATURE_UNIVERSITARI`** resta `null`. L'art. 11 rimanda i
  termini ai canali ufficiali, quindi con `null` la pagina non annuncia
  nessuna scadenza e il modulo non si chiude da solo.
- **Il percorso di pubblicazione dell'art. 9** ha una colonna,
  `avviato_pubblicazione_at`, e nient'altro. Quando partira davvero servira
  decidere se merita uno spazio suo o se resta una cosa che si fa per email.
