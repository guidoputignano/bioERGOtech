# Collaudo del percorso, da capo a fondo

Come provare che la catena funziona davvero, nei panni di tutti e quattro:
staff, istituto, docente referente e studente. Serve circa mezz'ora e va
fatto **prima** che ci siano dentro trecento ragazzi, perche buona parte di
quello che puo rompersi si rompe in silenzio: una email che non parte, un
account senza password, una conferma che nessuno riceve.

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
per il sistema e arrivano tutti nella stessa casella.

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

Compili con il meccanografico finto e l'indirizzo `lei+prof@`.

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

**Cosa deve vedere:** il nome dell'istituto con accanto il badge
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

## Che cosa ha collaudato, e cosa no

Arrivato in fondo ha verificato la catena intera: adesione, conferma, le due
email che prima non partivano, il cancello delle iscrizioni, l'iscrizione
degli studenti, la creazione degli account, il badge di chi non e mai entrato,
il rinvio del link, la conferma del referente, il conteggio del progresso, le
squadre, la consegna, la valutazione e l'iscrizione d'ufficio all'evento.

**Non** ha collaudato: il comportamento con numeri veri (trecento studenti
distribuiti su venti istituti), che e l'unica cosa che questo collaudo non
puo simulare.

## Pulizia

I dati di prova vanno tolti prima di aprire davvero, altrimenti l'istituto
finto compare nei conteggi e nell'export.

**Basta una riga.** Tutto quello che appartiene a un istituto e legato alla
sua adesione con `on delete cascade`: iscrizioni, squadre e progetti se ne
vanno insieme all'adesione, e le valutazioni se ne vanno insieme ai progetti.
Non serve cancellare in ordine, e non serve ricordarsi niente.

```sql
-- Sostituisca il meccanografico se ne ha usato un altro.
delete from public.licei_adesioni
 where codice_meccanografico = 'TATEST001X';
```

Restano fuori dalla cascata, perche non appartengono all'istituto, e vanno
tolte a mano solo se vuole ripetere il collaudo con le stesse email:

- le righe di `lesson_submissions` degli account di prova, che appartengono al
  corso e non al bando;
- gli account di prova in Authentication, Users;
- le eventuali iscrizioni all'evento in `event_registrations`;
- la sua riga in `licei_commissari`, se non deve restare in Commissione.

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
