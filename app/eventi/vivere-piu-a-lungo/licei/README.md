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

1. **Adesione dell'istituto.** La compila il docente referente. E l'unica cosa
   che questo modulo copre oggi.
2. **Iscrizione dello studente.** Lo studente si iscrive da solo con il codice
   `LIC-` che il referente gli ha dato, e il referente conferma l'elenco con un
   clic. Quell'elenco confermato *e* l'elenco che l'art. 4 chiede di
   trasmettere. Da costruire.
3. **Squadra e progetto.** Dentro il corso, non prima: l'art. 3 mette il lavoro
   in team fra i contenuti da insegnare, e il corso `agentic-ai` ha gia una
   lezione 4.4 "Project Idea Brief Workshop: Form your team". Da costruire.

Le squadre non hanno mai un form proprio: nascono nello stesso atto in cui il
team deposita la sua idea. Una squadra senza un'idea e una lista di nomi.

## Dove vive il codice

| Cosa | Dove |
| --- | --- |
| Configurazione | `app/eventi/vivere-piu-a-lungo/licei/content.ts` |
| Pagina pubblica | `app/eventi/vivere-piu-a-lungo/licei/page.tsx` |
| Indice appiccicato | `app/eventi/vivere-piu-a-lungo/licei/LiceiIndice.tsx` |
| Modulo di adesione | `app/eventi/vivere-piu-a-lungo/licei/AdesioneForm.tsx` |
| Pannello staff | `app/eventi/vivere-piu-a-lungo/licei/admin/` |
| Invio adesione | `app/api/eventi/licei/adesioni/route.ts` |
| API staff | `app/api/eventi/licei/admin/` |
| Tipi e validazione | `lib/eventi/licei.ts` |
| Helper server | `lib/eventi/licei-server.ts` |
| Email di conferma | `lib/eventi/licei-email.ts` |
| Migrazione | `supabase/migrations/20261204000000_create_licei_adesioni.sql` |

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

Per questo la pagina e `dynamic = "force-dynamic"`: lo stato si legge a ogni
richiesta.

## Dati degli studenti: nessuno, per ora

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

In ordine, e nessuna di queste e bloccata da lavoro tecnico:

1. **Iscrizione degli studenti** con il codice istituto, console del referente
   per confermare l'elenco, generatore del PDF di autorizzazione da far
   firmare alle famiglie, export dell'elenco per l'art. 4.
2. **Squadra e brief** alla lezione 4.4 del corso, agganciati con un
   condizionale in `app/courses/agentic-ai/lesson/[slug]/page.tsx`. Mai un
   fork di `LessonPageClient`: e da li che nascerebbe un secondo binario da
   tenere allineato a mano.
3. **Consegna del progetto** a `course-closing`, con i cinque blocchi mappati
   sui criteri dell'art. 7.
4. **Valutazione della Commissione**: pacco di valutazione, trascrizione dei
   punteggi deliberati in seduta, graduatoria. Non account individuali per
   cinque a nove commissari esterni da onboardare a novembre.
5. **Iscrizione d'ufficio dei finalisti** all'evento del 10 dicembre, fuori
   quota: chi espone dal palco non puo finire in lista d'attesa.

Prima di partire con la 2 va deciso quanti componenti ha una squadra e se puo
attraversare due istituti: oggi la lezione 4.4 dice 2-4 studenti mentre
l'art. 6 parla di rappresentanze fino a 5, e cambiarlo dopo significa
sciogliere e ricomporre squadre.
