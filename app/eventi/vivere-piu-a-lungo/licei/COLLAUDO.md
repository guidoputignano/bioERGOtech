# Collaudo del percorso, da capo a fondo

Come provare che la catena funziona davvero, nei panni di tutti: staff,
istituto, docente referente, docente del progetto e studente. La prima parte
(passi 0 a 9) richiede circa mezz'ora, la seconda (passi 10 a 21) un'altra
ora. Va fatto **prima** che ci siano dentro trecento ragazzi, perche buona
parte di quello che puo rompersi si rompe in silenzio: una email che non
parte, un account senza password, una conferma che nessuno riceve.

## La trappola da conoscere prima di cominciare

Sia l'adesione sia l'iscrizione, **se il browser e gia loggato, agganciano il
record all'account loggato** invece di crearne uno nuovo per l'email indicata
nel modulo (`adesioni/route.ts` e `iscrizioni/route.ts`, entrambe partono da
`let userId = utente.id`).

Se fa tutto il collaudo in una finestra sola, loggato come staff, succede
questo: l'adesione della scuola finta risulta sua, l'iscrizione dello studente
finto risulta sua, il secondo studente sbatte contro l'indice unico
`(adesione_id, lower(email))`, e le console del referente e dello studente
mostrano lei a se stesso. Tutto sembra funzionare e non ha provato niente.

**Quindi: una finestra separata per ogni ruolo.** Una normale per lo staff, e
una in incognito (o un altro browser, o un altro profilo) per la
professoressa e per ogni studente. Non riusi la stessa finestra in incognito
per due ruoli diversi senza fare logout.

## Che cosa procurarsi

**Quattro indirizzi email distinti che puo leggere davvero.** Se usa Gmail
bastano gli alias con il piu: `lei+staff@gmail.com`, `lei+prof@gmail.com`,
`lei+studente1@gmail.com`, `lei+studente2@gmail.com`. Sono indirizzi diversi
per il sistema e arrivano tutti nella stessa casella. Per la seconda parte
(docenti del progetto, due istituti) ne servono altri tre: `lei+scuola@`
(l'indirizzo istituzionale della scuola finta), `lei+prof2@` (un collega) e
`lei+profb@` (il referente di una seconda scuola finta, meccanografico
`TATEST002X`).

**La migrazione `20261215000000` applicata**, se vuole collaudare docenti del
progetto, istruzioni e riflessioni: `supabase/migrations/VERIFICA.sql` deve
dire `OK` sulla riga `20261215000000_licei_docenti` (vedi il README, "Migrazione
da applicare a mano"). Senza, la prima parte si collauda lo stesso e la
seconda si ferma al passo 10.

**Un account staff.** Su Supabase, tabella `profiles`, metta
`partnership_level = 'admin'` sulla riga del suo account. Senza, il pannello
risponde 403.

**Le email devono partire davvero.** Servono `RESEND_API_KEY` in produzione e
`noreply@bioergotech.org` verificato come mittente su Resend. Se manca,
l'invio fallisce nei log e le schermate continuano a dire che e andato tutto
bene: il collaudo si blocca al passo 3 e non capisce perche.

> **Se le email non partono e vuole collaudare lo stesso:** dal pannello di
> Supabase, Authentication, Users, puo impostare a mano la password di un
> utente o generare un magic link. Non e il percorso vero, ma sblocca i passi
> successivi. Se sceglie questa strada, si segni che il passo delle email
> resta **non collaudato**.

**Dati finti coerenti con le validazioni:**

| Campo | Valore che passa | Perche |
| --- | --- | --- |
| Codice meccanografico | `TATEST001X` | Devono essere 10 caratteri fra lettere e numeri. Se lo cambia, resti su 10. |
| Provincia | Taranto | |
| Classe | `4A` | Testo libero, massimo 40 caratteri |
| Anno di corso | 3, 4 o 5 | Sono i soli valori previsti |

## Il collaudo

### Passo 0. Aprire la raccolta (staff)

`/eventi/vivere-piu-a-lungo/licei/admin`, scheda **Adesioni e iscrizioni**.

Metta **Stato della raccolta** su `aperte`. Lasci per ora le iscrizioni
chiuse: al passo 4 serve vedere che il cancello funzioni.

### Passo 1. La scuola aderisce (incognito, email della professoressa)

`/eventi/vivere-piu-a-lungo/licei`, modulo di adesione in fondo.

Compili con il meccanografico finto e l'indirizzo `lei+prof@`. Come email
dell'istituto metta `lei+scuola@`: al passo 11 e li che arriva l'avviso
quando il referente indica un collega.

**Cosa deve succedere:** la pagina mostra il codice `LIC-…` dell'istituto, e
all'indirizzo della professoressa arriva l'email di adesione ricevuta, che
contiene un link per impostare la password.

**Se non arriva l'email:** e il problema di Resend descritto sopra. Se la
pagina ha mostrato il codice, il record c'e comunque.

### Passo 2. Lo staff conferma (finestra normale)

Torni nel pannello. La scuola compare nell'elenco con badge **Ricevuta**.
Apra la riga e porti la tendina su **Confermata**.

**Cosa deve succedere:** alla professoressa arriva una seconda email,
"Adesione confermata", con il codice e un link di iscrizione gia precompilato.
Questa e la mail che prima non partiva: se arriva, il primo dei due buchi
storici e chiuso.

**Da controllare nel pannello:** la riga ora dice `0 iscritti su N previsti`.
Lo zero e corretto, non e un errore.

### Passo 3. La professoressa entra (incognito)

Apra il link della password dalla prima email, imposti una password, poi vada
su `/eventi/vivere-piu-a-lungo/licei/referente`.

**Prima di tutto, con la migrazione applicata:** la schermata "Prima di
iniziare" con le istruzioni per i docenti, la casella "Ho letto e accetto le
istruzioni per i docenti e l'informativa privacy per scuole e docenti
referenti." e il bottone **Accetto**, e nient'altro: nessun nome di studente,
nessun contatore. Spunti e accetti. Senza la migrazione la schermata non
compare, ed e corretto.

**Poi deve vedere:** il nome dell'istituto con accanto il badge
**Confermata**, il banner giallo "in verifica" **sparito**, il codice
dell'istituto con il bottone per copiarlo, e l'elenco studenti vuoto.

Il badge e il secondo dei due buchi storici: prima la conferma si leggeva solo
dalla sparizione del banner.

### Passo 4. Il cancello delle iscrizioni

Prima di aprirle, provi a iscrivere uno studente: `/eventi/vivere-piu-a-lungo/licei/iscrizione`.

**Cosa deve succedere:** un rifiuto, perche `stato_iscrizioni` e ancora
`chiuse`. Se invece passa, il cancello non funziona ed e un problema serio.

Poi, dal pannello, metta **Iscrizione degli studenti** su `aperte`.

### Passo 5. Due studenti si iscrivono (due finestre separate)

**Studente 1**, incognito nuovo, `lei+studente1@`: si iscriva con il codice
`LIC-…`, classe `4A`, anno 4. **Apra il link della password** che riceve e
imposti la password.

**Studente 2**, altra finestra, `lei+studente2@`: si iscriva allo stesso modo,
ma **non apra il link**. Serve apposta: e il caso dello studente che risulta
iscritto e non entrera mai nel corso.

### Passo 6. La professoressa conferma (incognito della prof)

Ricarichi la console.

**Cosa deve vedere:** due studenti in elenco, i contatori aggiornati, e sulla
riga dello **studente 2** il badge rosso **Mai entrato** con accanto il
bottone **Rimanda il link**. Sullo studente 1 il badge non c'e, perche e
entrato.

Confermi entrambi con **E mio studente**.

**Cosa deve succedere:** a ciascuno arriva l'email di iscrizione confermata.

**Provi anche il bottone** "Rimanda il link" sullo studente 2: deve arrivare
una nuova email con il link della password, e il bottone deve diventare "Link
inviato".

**Poi il bottone sopra l'elenco**, "Rimanda il link a chi non e mai entrato
(1)", con la sua conferma. Subito dopo il bottone sulla riga non deve partire
niente: la console dice "Nessun link e partito: a 1 studente un link e stato
mandato pochi minuti fa", perche un link nuovo annullerebbe quello appena
inviato. Lo riprovi dopo 5 minuti: il link deve arrivare allo studente 2 e a
nessun altro, la console deve dire "Link inviato a 1 studente alle HH:MM" e il
bottone deve restare spento per 10 minuti, anche ricaricando la pagina. E il
rimedio per una scuola che bloccava le email esterne: lo studente non rifa
l'iscrizione, che resta valida.

### Passo 7. Lo studente segue il corso (incognito dello studente 1)

Vada su `/courses/agentic-ai/lesson/lesson-1-1`, legga, e **consegni la
riflessione** in fondo alla lezione.

**Cosa deve succedere:** il bottone della lezione successiva si sblocca. La
consegna della riflessione e cio che conta una lezione come fatta.

**Torni nella console della professoressa e ricarichi:** lo studente 1 deve
mostrare la barra e **1 / 21 lezioni**. Il contatore "Mai entrati nel corso"
deve essere sceso a 1, e quello "Entrati ma fermi a zero lezioni" deve stare a
0, perche lo studente 1 una lezione l'ha fatta.

**Nel pannello staff** la riga dell'istituto deve dire `2 iscritti su N
previsti`, e aprendola deve comparire l'avanzamento medio.

### Passo 8. Squadra e progetto

Dal pannello, scheda **Squadre e progetti**, apra **Formazione delle
squadre**.

Lo studente 1, da `/eventi/vivere-piu-a-lungo/licei/studente` o dalla lezione
4.4, crea una squadra e riceve un codice `SQ-…`. Lo studente 2 entra con quel
codice: per farlo **deve avere la password**, quindi usi il link che gli ha
rimandato al passo 6.

Serve perche una squadra sotto i due componenti non puo consegnare.

Poi apra **Consegna dei progetti** e faccia consegnare al capitano.

> **Attenzione, questo passo e irreversibile.** Dopo la consegna il progetto
> non si modifica piu e dalla squadra non si esce. In collaudo va benissimo,
> ma se lo fa su dati veri resta cosi.

### Passo 9. Valutazione e finalisti

Scheda **Commissione**: aggiunga se stesso come commissario con diritto di
voto, e riceva le credenziali. Dal pannello apra **Schede della Commissione**.

Su `/eventi/vivere-piu-a-lungo/licei/commissione` compili tutti e sei i
criteri e **chiuda la scheda**: solo una scheda chiusa entra in classifica.

Torni nella scheda Squadre e progetti e usi **Designa finalisti**, poi
**Iscrivi all'evento**. Controlli che i due studenti risultino iscritti
all'evento del 10 dicembre.

## Docenti del progetto, squadre e riflessioni

Questa parte richiede la migrazione `20261215000000`. Usi le stesse finestre
separate: una per lo staff, una per la professoressa, una per il collega
(`lei+prof2@`), una per ogni studente. Per i controlli "nella risposta" apra
gli strumenti per sviluppatori del browser, scheda Rete, e guardi il JSON
della chiamata indicata.

### Passo 10. Se la migrazione non e ancora applicata

Va provato su un ambiente in cui la SQL non e stata eseguita, oppure prima di
eseguirla in produzione, perche il codice arriva prima della migrazione.

**Cosa deve succedere:** la console del referente si apre come prima, senza
schermata delle istruzioni; la card "Docenti del progetto" dice **Funzione in
attivazione**; nel box di una lezione non compare l'avviso "Chi legge quello
che scrivi", ne l'avviso "Le tue riflessioni e i docenti", e la consegna si
salva lo stesso; nell'area dello studente non compare la card "Le tue
riflessioni e i docenti", e il link diretto dice "Questa scelta non è ancora
disponibile."; nessun errore a schermo e nessuna consegna persa; nel pannello
staff il bottone **Invia avviso sulle riflessioni** e spento e dice che manca
la migrazione.
Poi applichi la migrazione come dice il README e continui.

### Passo 11. Il referente indica un collega (incognito della prof)

Dalla card **Docenti del progetto**: nome, cognome, `lei+prof2@`, classe
`4A`. Il bottone resta spento finche non spunta la dichiarazione "Dichiaro che
il docente indicato insegna nel nostro istituto, ...".

**Cosa deve succedere:** la card mostra il collega con il badge **Invitato** e
"1 su 5", e sopra la conferma "Invito inviato a ... L'istituto riceve un
avviso al suo indirizzo istituzionale.". A `lei+prof2@` arriva l'invito con il link per impostare la
password e i link alle istruzioni e all'informativa per le scuole. A
`lei+scuola@` arriva "Un nuovo docente del progetto", con il nome del
collega, la dichiarazione e "Se non è corretto scrivete a
info@bioergotech.org"; una copia arriva a info@bioergotech.org.

**Provi anche i rifiuti**, uno alla volta, e controlli che nessuno crei un
account in Authentication, Users:

- l'email della professoressa stessa: rifiutata;
- `lei+studente1@`: rifiutata con "Non è possibile indicare questa email come
  docente del progetto. ...". E lo stesso messaggio per ogni email che
  riguarda altri (uno studente, un docente di un'altra scuola): la risposta
  non deve dire se l'email ha gia un account, ne dove e iscritta;
- `lei+prof2@` una seconda volta: rifiutata, e gia invitato;
- **Rimanda invito** subito dopo l'invito: il bottone e spento per 10 minuti.

**Uno studente con l'email del collega.** In una finestra in incognito provi
a iscriversi come studente, con il codice dell'istituto, usando `lei+prof2@`:
rifiutata con "Con questa email non è possibile iscriversi come studente.
...", e in `licei_iscrizioni` non compare nessuna riga nuova.

### Passo 12. Il collega entra (incognito di prof2)

Apra il link della password, imposti la password e vada su
`/eventi/vivere-piu-a-lungo/licei/referente`.

**Cosa deve vedere:** solo la schermata delle istruzioni. Nella scheda Rete,
`GET /api/eventi/licei/referente` risponde 403 con `istruzioni_accettate:
false` e nessuno studente. **Prima di accettare** apra a mano, nella stessa
finestra, `/api/eventi/mentor`: deve rispondere 403 "Prima di vedere i dati
degli studenti accetta le istruzioni per i docenti." e nessun mentor. Torni
alla console e accetti.

**Poi:** l'intestazione "Area dei docenti del progetto . Referente: Nome
Cognome", il filtro su "Le mie classi (4A)" con "Tutte le classi
dell'istituto" fra le opzioni, i due studenti, i bottoni per confermare e
rimandare il link. **Non** deve vedere i bottoni per scaricare i CSV, ne la
card per indicare docenti: al loro posto la riga con i soli nomi dei
colleghi. Nella risposta di `GET /api/eventi/licei/referente` non ci sono
`user_id`, ne il codice `SQ-` delle squadre, ne email dei colleghi.

**L'export rifiutato:** apra a mano
`/api/eventi/licei/referente/export` nella finestra di prof2. Deve rispondere
403 "Questa funzione è riservata al docente referente.". Nella finestra della
professoressa la stessa URL scarica il CSV.

Nella card della professoressa il collega e ora **Attivo**, con la data di
accettazione. In Supabase, `licei_accettazioni` ha due righe (prof e prof2)
con `versione` uguale alla data di `ISTRUZIONI_DOCENTE.aggiornato` e il testo
in `testo`.

### Passo 13. Revoca, e nuovo invito

La professoressa preme **Revoca** sul collega. prof2 ricarica la console.

**Cosa deve succedere:** 403 "Nessuna adesione risulta associata a questo
account.", subito, senza aspettare niente. `/api/eventi/mentor` aperto a mano
da prof2 risponde 403 "L'elenco dei mentor con i contatti è riservato a chi
partecipa al percorso.": per la rotta dei mentor un docente revocato e un
account qualsiasi. Poi la professoressa lo indica di
nuovo con la stessa email. Se dall'ultimo invito sono passati meno di 10
minuti la risposta e "L'invito a questo docente è appena partito. Si può
indicare di nuovo dopo 10 minuti, ...": e il limite dei reinvii, che vale
anche dopo una revoca. Passati i 10 minuti la riga torna **Invitato**, e
prof2 al prossimo accesso rivede la schermata delle istruzioni prima di
qualsiasi dato.

Ripeta la revoca dal pannello staff: nel dettaglio dell'adesione, sotto
"Referente", "Docenti del progetto", **Revoca**. Stesso effetto.

### Passo 14. Due istituti

Con `lei+profb@`, in un'altra finestra in incognito, aderisca con il
meccanografico `TATEST002X` e ripeta per questa scuola i passi 1 a 3.

- La console di prof B non mostra nessuno studente della prima scuola, e
  quella della professoressa nessuno della seconda.
- La professoressa prova a indicare `lei+profb@` come collega: rifiutata, con
  lo stesso messaggio generico del passo 11.
- **Adesione con l'email di un docente gia legato.** In incognito, senza
  accedere, compili il modulo di adesione con un terzo meccanografico finto
  (`TATEST003X`) e come email del referente `lei+prof@`: rifiutata con "Non
  è possibile registrare l'adesione con questa email del referente. ...", e
  nessuna adesione nuova nel pannello. La console della professoressa resta
  normale. Lo stesso vale per l'email di un docente del progetto non
  revocato.
- **Account legato a due istituti.** Non si ottiene dall'interfaccia, si
  simula a mano nell'SQL editor e poi si toglie:

  ```sql
  insert into public.licei_docenti (adesione_id, user_id, nome, cognome, email, stato)
  select a.id, b.user_id, 'Prova', 'B', 'lei+profb@gmail.com', 'attivo'
    from public.licei_adesioni a, public.licei_adesioni b
   where a.codice_meccanografico = 'TATEST001X'
     and b.codice_meccanografico = 'TATEST002X';
  ```

  prof B ricarica: 409 "Questo account risulta collegato a più istituti.
  Scrivi a info@bioergotech.org e sistemiamo noi.". Poi
  `delete from public.licei_docenti where email = 'lei+profb@gmail.com';` e la
  console di prof B torna normale.

### Passo 15. Il quadro delle squadre

Dopo il passo 8, nella console della professoressa (e in quella di prof2, se
attivo) c'e "Le squadre del vostro istituto".

**Cosa deve vedere:** la squadra con nome, "formata il gg/mm . 2 su 5", lo
stato del progetto, il capitano per primo con il badge **Capitano**, l'altro
componente come "Cognome Nome . 4A". Nessuna email, nessun codice `SQ-`,
nessuna data di accesso. Sopra, i quattro numeri; sotto, "Non ancora in una
squadra" e la nota "Il quadro serve al monitoraggio del percorso. Non va
proiettato in classe né condiviso.". **Aggiorna** cambia l'ora di
"Aggiornato alle".

Poi chiuda per un momento la formazione delle squadre dal pannello: nella
console di prof B, che non ha squadre, al posto del quadro deve esserci una
riga sola, "La formazione delle squadre non è ancora aperta.". Nella console
della professoressa il quadro resta, perche una squadra c'e. Riapra la fase.

### Passo 16. Riflessioni, prima e dopo l'avviso

**Prima.** La consegna della lezione 1.1 del passo 7 deve contare come
scritta prima dell'avviso. Se al passo 7 la migrazione c'era gia, la simuli
nell'SQL editor:

```sql
update public.lesson_submissions
   set condivisa_referente_at = null
 where lesson_slug = 'lesson-1-1'
   and user_id = (select user_id from public.licei_iscrizioni
                   where email = 'lei+studente1@gmail.com');
```

Nella console della professoressa, bottone **Riflessioni** sulla riga dello
studente 1: compare "1 consegna riservata" e **nessun testo**.

**Dopo.** Lo studente 1 apre `/courses/agentic-ai/lesson/lesson-1-2a` e per
ora resta in cima alla pagina, senza scorrere fino al box della consegna.
Nell'SQL editor:

```sql
select count(*) from public.licei_accettazioni
 where documento = 'riflessioni_passate'
   and user_id = (select user_id from public.licei_iscrizioni
                   where email = 'lei+studente1@gmail.com');
```

deve dare `0`: aprire la lezione non basta, l'avviso conta come visto solo
quando e a schermo. Lo stesso se apre la lezione in una scheda che resta in
background. Poi scorra fino al box. Sopra il modulo deve vedere "Chi legge
quello che scrivi" con il nome dell'istituto e il testo dell'avviso. Sopra
compare anche l'avviso "Le tue riflessioni e i docenti" ("Dal ... potranno
leggere anche le riflessioni e le domande che hai inviato prima..."), perche
la consegna della 1.1 e di prima: e la prima volta che lo vede. Lo lasci a
schermo almeno un secondo e rilanci la query: ora da `1`. Da quel momento
partono i tre giorni. Per ora **non prema nessun bottone**: lo si prova al
passo 17. Scriva una riflessione, una domanda **e
un commento**, e consegni: la consegna si salva anche senza rispondere. La consegna mostra "Visibile anche ai docenti del tuo
istituto. Il commento lo legge solo lo staff.". Riapra la lezione 1.1: dice
"Visibile solo allo staff".

**Cosa deve vedere la professoressa:** nel pannello dello studente 1 la
riflessione e la domanda della lezione 1.2a, "Lo staff non ha ancora
risposto" e ancora "1 consegna riservata". Il commento **non** c'e, ne a
schermo ne nella risposta di `GET /api/eventi/licei/referente/riflessioni`
(cerchi il testo del commento nel JSON: non deve comparire). Lo stesso da
**Leggi per lezione**, scegliendo la lezione 1.2a.

**La risposta dello staff:** dal portale dei membri, scheda **Submissions**,
risponda alla domanda della 1.2a. La professoressa riapre il pannello: "Lo
staff ha risposto il ...", senza il testo della risposta.

Nella console di prof B non compare niente dello studente 1: le riflessioni
si leggono solo per gli studenti confermati del proprio istituto.

### Passo 17. Le riflessioni di prima: l'avviso, i tre giorni e la scelta

Si continua con lo studente 1 del passo 16: la consegna della 1.1 e di prima
(riservata), quella della 1.2a e di dopo l'avviso. Al passo 16 lo studente ha
gia visto una volta l'avviso "Le tue riflessioni e i docenti", nel box della
1.2a, scorrendo fino al box: da li si contano i tre giorni.

La regola da verificare: i docenti leggono le consegne di prima subito se lo
studente preme "Va bene"; tre giorni dopo il primo avviso se non preme
niente; mai se preme "Preferisco di no", anche dopo i tre giorni.

Per le verifiche sul database usi questa query, che ripeterà piu volte:

```sql
select documento, versione, adesione_id,
       testo->>'avvisato_at' as avvisato_at, testo->>'scelta' as scelta,
       testo->>'scelta_at' as scelta_at, testo->>'etichetta' as etichetta,
       testo->>'avviso' as avviso, accettato_at
  from public.licei_accettazioni
 where documento = 'riflessioni_passate'
   and user_id = (select user_id from public.licei_iscrizioni
                   where email = 'lei+studente1@gmail.com');
```

**Il primo avviso si registra una volta sola.** La query deve dare una riga:
`riflessioni_passate`, `2026-10-13`, l'adesione del suo istituto,
`avvisato_at` all'ora in cui, al passo 16, il box e arrivato a schermo (non
quella in cui ha aperto la lezione), `scelta` vuota, e in `avviso` il testo
"Dal ... potranno leggere ...". Lo studente apra una lezione che non ha
ancora consegnato, per esempio `/courses/agentic-ai/lesson/lesson-1-2b`, e
poi la sua area, `/eventi/vivere-piu-a-lungo/licei/studente`, scorrendo fino
all'avviso: c'e in tutte e due, con la stessa data. Rilanci la query:
`avvisato_at` e lo stesso di prima. Non cambia nemmeno riaprendo le pagine
altre volte.

**Il box.** Nella 1.2b, sopra l'avviso "Chi legge quello che scrivi", deve
vedere "Le tue riflessioni e i docenti", il testo "Dal {data} i docenti del tuo istituto che seguono il percorso potranno leggere anche le riflessioni e le domande che hai inviato prima. Servono a seguire il tuo percorso. Il commento resta comunque solo allo staff."
con {data} tre giorni dopo il passo 16, scritta come "20 ottobre" (l'anno
compare solo se e diverso da quello in corso), i due bottoni "Va bene" e
"Preferisco di no" con lo stesso aspetto (nessuno evidenziato) e sotto
"Puoi cambiare idea quando vuoi dalla tua area.", con il link all'area. Lo
stesso avviso compare anche riaprendo la 1.2a, gia consegnata, sopra la
consegna. Per ora non prema niente.

**Prima dei tre giorni, nascoste.** La professoressa ricarica il pannello
**Riflessioni** dello studente 1: la 1.1 non c'e e compare "1 consegna
riservata". La nota della console dice "Le consegne inviate prima
dell'avviso diventano visibili tre giorni dopo che lo studente ha visto
l'avviso, o subito se ha scelto «Va bene». Restano riservate se ha scelto che
restino allo staff.". Come studente, la 1.1 dice "Visibile solo allo staff".

**«Va bene», subito.** Nella 1.2b lo studente prema "Va bene". Al posto
dell'avviso e dei bottoni compare "I docenti del tuo istituto possono leggere
anche le riflessioni e le domande che hai inviato prima." con **Cambia
scelta**. La professoressa ricarica il pannello: compare anche la riflessione
della 1.1, oltre a quella della 1.2a, e "nessuna consegna riservata", anche
se i tre giorni non sono passati. Nessun segno dice che lo studente ha
scelto: le consegne di prima compaiono e basta. Il commento **non** c'e, ne a
schermo ne nel JSON della risposta. Lo stesso da **Leggi per lezione**,
lezione 1.1. Lo studente riapra la 1.1: "Visibile anche ai docenti del tuo
istituto". In un'altra lezione non consegnata l'avviso non compare piu.
Nella query: `scelta` = `si`, `etichetta` = `Va bene`, `scelta_at` e
`accettato_at` all'ora del clic, `avvisato_at` invariato.

**«Preferisco di no».** Lo studente apra la sua area: la card dice "I docenti
del tuo istituto possono leggere ..." con **Cambia scelta**. Lo prema: tornano
l'avviso e i due bottoni. Prema "Preferisco di no": compare "Le riflessioni e
le domande che hai inviato prima restano visibili solo allo staff." con
**Cambia scelta**, senza altre conferme. La professoressa ricarica: la 1.1
sparisce di nuovo e torna "1 consegna riservata"; la 1.2a resta, perche e
stata salvata dopo l'avviso. Ripeta "Va bene" e "Preferisco di no" un paio
di volte, dall'area o dal box: ogni volta il pannello della professoressa
segue la scelta, e la query mostra sempre una riga sola.

**Dopo i tre giorni, visibili senza scelta.** Per non aspettare, nell'SQL
editor tolga la scelta e sposti il primo avviso a quattro giorni fa:

```sql
update public.licei_accettazioni
   set testo = testo || jsonb_build_object(
         'scelta', null, 'scelta_at', null, 'etichetta', null,
         'avvisato_at', to_char((now() - interval '4 days') at time zone 'UTC',
                                'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
 where documento = 'riflessioni_passate'
   and user_id = (select user_id from public.licei_iscrizioni
                   where email = 'lei+studente1@gmail.com');
```

La professoressa ricarica: la 1.1 c'e, "nessuna consegna riservata", senza
che lo studente abbia premuto niente. Lo studente apra una lezione non
consegnata: l'avviso c'e ancora, ora al presente, "Dal {data} ... possono
leggere ...", con la data di ieri, e resta finche non preme un bottone. La 1.1
dice "Visibile anche ai docenti del tuo istituto".

**«Preferisco di no» anche dopo i tre giorni.** Prema "Preferisco di no": la
professoressa ricarica e la 1.1 sparisce, "1 consegna riservata". Restano
nascoste anche se i tre giorni sono passati. Rilanci la query: `scelta` =
`no`, `avvisato_at` e quello di quattro giorni fa, non e stato spostato.

**Un altro istituto, mai.** Con lo studente 1 su "Va bene", nella console di
prof B non compare niente di lui.

**Il link diretto.** Nella console della professoressa, sotto le riflessioni,
la card "Link da dare agli studenti" mostra l'indirizzo completo
`https://www.bioergotech.org/eventi/vivere-piu-a-lungo/licei/studente/riflessioni`,
la frase "Gli studenti lo aprono, accedono e vedono l'avviso sulle
riflessioni inviate prima: dopo tre giorni le vedete anche voi, a meno che
scelgano di no. Con «Va bene» le vedete subito." e il bottone **Copia**, che
per qualche secondo diventa "Copiato". La card c'e anche per prof B e per il
collega del progetto. In una finestra in incognito apra il link (su un
ambiente di prova, lo stesso percorso sul suo dominio): compare "Area
riservata" con **Accedi**. Acceda come studente 1: dopo l'accesso torna sulla
stessa pagina, che mostra solo la card "Le tue riflessioni e i docenti" con
lo stato in vigore e **Cambia scelta**. La cambi da qui: il pannello della
professoressa segue come sopra. Poi apra lo stesso link con un account che
segue il corso senza essere iscritto al percorso, o con quello della
professoressa: una frase ("Nessuna iscrizione al percorso risulta associata
a questo account.") e **Torna al bando**, nessun bottone. Nel sorgente della
pagina c'e `noindex, nofollow`.

**La scuola di oggi.** Avviso e scelta contano solo per l'istituto
dell'iscrizione attuale, per lo studente come per i docenti. Lo simuli con lo
studente 1 su "Va bene", spostando la sua riga sull'adesione di prof B:

```sql
update public.licei_accettazioni
   set adesione_id = (select id from public.licei_adesioni
                       where codice_meccanografico = 'TATEST002X')
 where documento = 'riflessioni_passate'
   and user_id = (select user_id from public.licei_iscrizioni
                   where email = 'lei+studente1@gmail.com');
```

La professoressa non legge piu la 1.1 (torna "1 consegna riservata"), e lo
studente 1, nella sua area, nel link diretto o nel box di una lezione non
consegnata, vede di nuovo l'avviso "Dal ... potranno leggere ...", con una
data nuova a tre giorni da oggi. Appena l'avviso e a schermo, la query
mostra la riga tornata sull'adesione della prima scuola, con `avvisato_at` di
adesso e nessuna scelta: per la professoressa la 1.1 resta riservata finche
lo studente non preme "Va bene" o non passano i tre giorni.

**Quando l'avviso non compare.** A chi segue il corso senza essere iscritto
al percorso, mai. Prima della migrazione, da nessuna parte (passo 10). E a
chi non ha consegne di prima e non ha mai scelto: lo simuli per lo studente 1
nell'SQL editor,

```sql
update public.lesson_submissions
   set condivisa_referente_at = now()
 where condivisa_referente_at is null
   and user_id = (select user_id from public.licei_iscrizioni
                   where email = 'lei+studente1@gmail.com');
delete from public.licei_accettazioni
 where documento = 'riflessioni_passate'
   and user_id = (select user_id from public.licei_iscrizioni
                   where email = 'lei+studente1@gmail.com');
```

poi ricarichi la sua area (la card non c'e piu) e apra una lezione non ancora
consegnata (c'e l'avviso "Chi legge quello che scrivi", quello sulle
riflessioni di prima no). Il link diretto dice "Non hai riflessioni inviate
prima dell'avviso, quindi non c'è niente da scegliere." con **Vai alla tua
area**. La query non trova righe: senza avviso mostrato non si registra
niente.

### Passo 18. L'avviso email agli studenti (staff)

Pannello staff, card "Avviso agli studenti sulle riflessioni", **Invia avviso
sulle riflessioni**, e confermi.

**Cosa deve succedere:** ai due studenti arriva "Percorso Biotecnologie e IA:
chi legge le tue riflessioni", con il link all'informativa per gli studenti.
Il testo dice che le riflessioni gia inviate "le potranno leggere tre giorni
dopo che la piattaforma te lo segnala, a meno che tu scelga che restino solo
allo staff": non chiede di rispondere all'email, avviso e scelta sono sulla
piattaforma (passo 17).
La card dice **Inviato** con data e conteggi. Un secondo invio e rifiutato.

> **Attenzione:** in produzione si invia una volta sola, e l'invio di prova
> la consuma. Se lo prova su produzione, per l'invio vero va tolta a mano la
> riga `avviso_riflessioni_inviato_at` (e `avviso_riflessioni_esito`) da
> `licei_config`. Meglio provarlo su un ambiente di prova.

### Passo 19. I mentor nell'area dei docenti

Serve almeno un mentor approvato e pubblicato, con un contatto e le linee
guida accettate (pannello staff del percorso universitario, scheda Mentor).
Senza, la scheda dice "L'elenco dei mentor si sta componendo." e del passo si
provano solo i rifiuti. Il rifiuto prima delle istruzioni e quello del
docente revocato sono ai passi 12 e 13, quello dell'adesione ancora in
verifica qui sotto, quello dell'adesione ritirata al passo 20.

**La professoressa** (istruzioni accettate) ricarica la console. In fondo,
sopra "Le regole del tuo accesso", c'e la scheda **Mentor del percorso**:
il testo per i docenti, il riquadro "Come funziona il contatto" con il link
alle linee guida e il bottone **Mostra i mentor**. **Non** ci sono le regole
"Prima di scrivere" scritte allo studente. Finche non preme il bottone,
nella scheda Rete non parte nessuna chiamata a `/api/eventi/mentor`; al clic
parte la chiamata e compare l'elenco, con il contatto per chi lo ha indicato
e "Nessun contatto messo a disposizione" per gli altri. **Nascondi i
mentor** lo richiude, e riaprirlo non rilegge.

**Nella risposta** di `GET /api/eventi/mentor` ogni mentor ha solo `id`,
`nome`, `cognome`, `ruolo`, `organizzazione`, `aree`, `bio`, `sito`,
`linkedin`, `foto_url` e `contatto_studenti`: niente email, telefono o
competenze, esattamente come per uno studente.

**prof2**, attivo e con le istruzioni accettate, vede la stessa scheda e lo
stesso elenco.

**Adesione ancora in verifica.** Nell'SQL editor riporti su `ricevuta` la
seconda scuola, quella di prof B (passo 14):

```sql
update public.licei_adesioni set stato = 'ricevuta'
 where codice_meccanografico = 'TATEST002X';
```

prof B ricarica la console: badge **Ricevuta**, banner giallo "in verifica"
e una scheda **Mentor del percorso** con la sola frase "L'elenco dei mentor
si apre quando confermiamo l'adesione del vostro istituto.", senza il
bottone. `/api/eventi/mentor` aperto a mano da prof B risponde 403 con la
stessa frase e nessun mentor. Poi la riporti su `confermata`, sempre
dall'SQL editor e non dal pannello, cosi non riparte l'email di conferma:

```sql
update public.licei_adesioni set stato = 'confermata'
 where codice_meccanografico = 'TATEST002X';
```

prof B ricarica e ritrova il bottone **Mostra i mentor**.

**Gli studenti non cambiano.** Lo studente 1 vede nella sua area il riquadro
**Mentor** come prima, con le regole "Prima di scrivere" e il consiglio per i
minorenni. Se dispone di un account di prova del percorso universitario con
la candidatura confermata, la sua area
(`/eventi/vivere-piu-a-lungo/universita/studente`) mostra il riquadro come
prima, senza il consiglio per i minorenni.

### Passo 20. Adesione ritirata

Lo staff porta la prima scuola su **Ritirata**.

**Cosa deve succedere:** la professoressa e prof2 ricaricano e ricevono 403
"L'adesione del vostro istituto è stata ritirata: l'accesso è disattivato.
Per chiarimenti scrivi a info@bioergotech.org.". Lo stesso 403, con lo
stesso messaggio, per `/api/eventi/mentor` aperto a mano da ciascuno dei
due. Lo studente 1 invece entra ancora in
`/eventi/vivere-piu-a-lungo/licei/studente` e nelle lezioni, e vede ancora i
mentor. Poi la riporti su **Confermata**.

### Passo 21. Lo staff corregge un'adesione dal modulo pubblico

Nella finestra dello staff, loggato, reinvii il modulo di adesione con il
meccanografico `TATEST001X` cambiando un numero.

**Cosa deve succedere:** la professoressa continua a entrare nella sua
console. Prima di questa correzione perdeva l'accesso, perche l'adesione
passava all'account dello staff.

### Passo 22. Chiusura (solo su un ambiente di prova)

La scheda **Chiusura** cancella i dati di tutto il percorso: non la provi su
produzione prima della fine. Su un ambiente di prova, l'anteprima conta
anche i "Docenti del progetto", revocati compresi; dopo **Cancella i dati del
percorso** l'account di prof2 non c'e piu in Authentication, Users, e
`licei_docenti` e `licei_accettazioni` sono vuote.

## Che cosa ha collaudato, e cosa no

Arrivato in fondo ha verificato la catena intera: adesione, conferma, le due
email che prima non partivano, il cancello delle iscrizioni, l'iscrizione
degli studenti, la creazione degli account, il badge di chi non e mai entrato,
il rinvio del link, la conferma del referente, il conteggio del progresso, le
squadre, la consegna, la valutazione e l'iscrizione d'ufficio all'evento.

Con la seconda parte anche: il comportamento prima della migrazione,
l'accettazione delle istruzioni prima di qualsiasi dato, l'invito di un
collega con le due email e i rifiuti (referente, studente, doppione), il
collega che vede tutto l'istituto senza export, la revoca immediata e il
nuovo invito, la separazione fra due istituti e l'account legato a due
istituti, il quadro delle squadre, le riflessioni prima e dopo l'avviso con
il commento che non esce mai, le riflessioni di prima (primo avviso
registrato una volta, nascoste prima dei tre giorni, visibili dopo senza
risposta, subito con "Va bene", nascoste con "Preferisco di no" anche dopo i
tre giorni, e di nuovo), l'avviso email una tantum, i mentor nell'area dei
docenti (solo dopo le istruzioni e con l'adesione confermata, letti su
richiesta, con le stesse colonne degli studenti, e niente per un docente
revocato), l'adesione ritirata
che ferma i docenti e non gli studenti, la correzione dello staff che non
sposta l'adesione e, su un ambiente di prova, la chiusura che cancella anche
gli account dei docenti del progetto.

**Non** ha collaudato: il comportamento con numeri veri (trecento studenti
distribuiti su venti istituti), che e l'unica cosa che questo collaudo non
puo simulare.

## Pulizia

I dati di prova vanno tolti prima di aprire davvero, altrimenti l'istituto
finto compare nei conteggi e nell'export.

**Basta una riga.** Tutto quello che appartiene a un istituto e legato alla
sua adesione con `on delete cascade`: iscrizioni, squadre, progetti, docenti
del progetto e accettazioni (istruzioni dei docenti, avvisi e scelte degli
studenti sulle riflessioni di prima) se ne vanno insieme all'adesione, e le valutazioni se ne vanno insieme ai progetti. Non serve
cancellare in ordine, e non serve ricordarsi niente.

```sql
-- Sostituisca i meccanografici se ne ha usati altri.
delete from public.licei_adesioni
 where codice_meccanografico in ('TATEST001X', 'TATEST002X');
```

Restano fuori dalla cascata, perche non appartengono all'istituto, e vanno
tolte a mano solo se vuole ripetere il collaudo con le stesse email:

- le righe di `lesson_submissions` degli account di prova, che appartengono al
  corso e non al bando;
- gli account di prova in Authentication, Users, compreso quello del collega
  (`lei+prof2@`);
- le eventuali iscrizioni all'evento in `event_registrations`;
- la sua riga in `licei_commissari`, se non deve restare in Commissione;
- le chiavi `avviso_riflessioni_inviato_at` e `avviso_riflessioni_esito` in
  `licei_config`, se ha inviato l'avviso su un ambiente che poi deve
  inviarlo davvero.

L'indice unico su `codice_meccanografico` e quello su
`(adesione_id, lower(email))` impediscono di rifare il collaudo con gli stessi
valori senza aver prima cancellato: non e un guasto, e la stessa difesa che
impedisce a due docenti della stessa scuola di creare due adesioni.

## Se qualcosa non torna

| Sintomo | Causa quasi certa |
| --- | --- |
| Nessuna email arriva mai | `RESEND_API_KEY` assente, o mittente non verificato su Resend. Gli invii falliscono nei log e le pagine dicono comunque successo. |
| Il pannello risponde 403 | Il suo account non ha `partnership_level = 'admin'`. |
| La console del referente dice "nessuna adesione" | Sta usando l'account sbagliato: l'adesione e legata all'account con cui e stato inviato il modulo. |
| Il secondo studente non riesce a iscriversi | Sta usando la stessa email del primo, oppure la stessa finestra loggata. |
| Lo studente vede "iscrizione non confermata" | La professoressa non ha ancora premuto "E mio studente". |
| Il progresso resta a zero anche dopo una lezione | Ha aperto la lezione ma non ha consegnato la riflessione. E la consegna che conta. |
| La console mostra solo le istruzioni | E giusto finche il docente non le accetta. Ricompare quando cambia la data di `ISTRUZIONI_DOCENTE.aggiornato`. |
| "Docenti del progetto" dice Funzione in attivazione | La migrazione `20261215000000` non e applicata: lo dice anche `VERIFICA.sql`. |
| Il collega vede "Nessuna adesione risulta associata a questo account" | E stato revocato, oppure e entrato con un'email diversa da quella dell'invito. |
| "Questo account risulta collegato a più istituti" | Lo stesso account e referente o docente in due scuole. Si sistema a mano, lasciando un legame solo. |
| Le riflessioni di uno studente risultano riservate | Sono state salvate prima dell'avviso nel box della lezione, e: lo studente non ha ancora visto l'avviso "Le tue riflessioni e i docenti", oppure lo ha visto da meno di tre giorni senza rispondere, oppure ha scelto "Preferisco di no". Il primo avviso conta solo quando e stato davvero a schermo: aprire una lezione o l'area senza scorrere fino all'avviso non lo registra. Diventano visibili tre giorni dopo il primo avviso, subito con "Va bene", o se lo studente le riapre e le salva di nuovo. |
| L'avviso "Le tue riflessioni e i docenti" non compare nel box | Lo studente non ha consegne salvate prima dell'avviso, ha gia scelto (nel box non ricompare; lo cambia dalla sua area o dal link diretto), non e iscritto al percorso, oppure la migrazione `20261215000000` non e applicata. |
| Lo studente aveva gia scelto e l'avviso ricompare, con una data nuova | Avviso e scelta erano stati registrati da iscritto a un altro istituto (per esempio con il codice sbagliato): valgono solo per la scuola di oggi. I tre giorni ripartono da adesso; con "Va bene" i docenti leggono subito. |
| Il link diretto dice "Nessuna iscrizione al percorso risulta associata a questo account." | Lo studente e entrato con un'email diversa da quella dell'iscrizione, oppure l'iscrizione e stata rifiutata o ritirata. |
| La scheda "Mentor del percorso" dice che l'elenco si sta componendo | Nessun mentor risulta approvato e pubblicato: escono gli stessi della pagina pubblica dei mentor, con il contatto solo per chi ha accettato le linee guida. |
| La scheda "Mentor del percorso" dice che l'elenco si apre quando confermiamo l'adesione | L'adesione dell'istituto e ancora **Ricevuta**: l'elenco si apre quando lo staff la porta su **Confermata** (o **Attiva sul corso**). |
| L'avviso sulle riflessioni non si puo inviare | Manca la colonna `condivisa_referente_at` (migrazione non applicata), manca `RESEND_API_KEY`, oppure e gia stato inviato. |
