# Il programma dei chapter, dal 2027

La presentazione per chi può portare il programma **"Biotecnologie e
Intelligenza Artificiale"** in un altro territorio d'Italia aprendo un
chapter. Spiega che cosa resta centralizzato nella Fondazione (lezioni,
piattaforma, controllo, marchio in uso, struttura), che cosa fa il chapter e
quali benefici ne ricava. Italiano, 16:9, 13 slide.

| File | Che cos'è |
|---|---|
| `chapter-deck.html` | Il sorgente. Autoconsistente: font e immagini sono incorporati. Si modifica questo. |
| `build-pdf.mjs` | Stampa il deck in PDF 1440 x 810 con Chromium. |
| `Biotecnologie-e-IA-Il-programma-dei-chapter.pdf` | Il PDF da condividere. |

```bash
npm install          # playwright-core, una volta
npm run build        # PDF
npm run proof        # PDF più un PNG per slide in shots/
```

## Le slide

1. Copertina
2. Da dove partiamo: la prima edizione a Taranto, in corso, e le tre tappe del percorso
3. Che cos'è un chapter: chi può esserlo, un territorio per chapter, il nome
4. Chi fa cosa: che cosa resta centralizzato e che cosa fa il chapter
5. Che cosa dovete fare, passo per passo: prima dell'avvio, adesioni e iscrizioni, il corso, la chiusura
6. Le scuole e i mentor del territorio
7. La finale: nel territorio, a Taranto, oppure entrambe
8. I benefici per il chapter
9. I benefici per studenti, scuole e territorio
10. Le regole comuni: marchio, struttura e dati, e di chi è che cosa
11. Che cosa serve per aprire un chapter, e chi sostiene che cosa
12. Come si diventa chapter, in sette passi, e che cosa fissa l'accordo
13. Prossimi passi e contatti

## Come è stata costruita

Il modello è la sintesi di tre proposte indipendenti, scritte dal punto di
vista di chi apre un chapter, della governance della Fondazione e di chi
coordina scuole ed eventi. Le tre proposte coincidevano quasi del tutto. La
presentazione è stata poi rivista da quattro lettori (un ente che la riceve
senza spiegazioni, un verificatore dei fatti, un consulente legale, un art
director e redattore), e ogni segnalazione è stata verificata prima di
correggere.

## Scelte

- **I dati.** La presentazione non dice che i dati "appartengono" alla
  Fondazione: i dati personali non sono di proprietà di nessuno. Dice che la
  Fondazione ne è **titolare del trattamento**, che struttura, contenuti,
  piattaforma, metodo e marchio sono della Fondazione, e che i progetti restano
  degli studenti, come già promette il corso.
- **Il marchio** è concesso in uso con una licenza scritta, non cedibile e
  revocabile, per il programma, il territorio e la durata dell'accordo.
- **Il chapter è un partner autonomo**: non è una sede della Fondazione, non
  agisce in suo nome e risponde delle attività che organizza.
- **La finale** ha tre formule: nel territorio, i finalisti a Taranto, oppure
  entrambe. La finale di Taranto dell'anno prossimo non è data per certa: la
  conferma la Fondazione prima dell'accordo, con data e posti per chapter.
- **Nessun importo e nessuna quota.** La presentazione dice che cosa mette
  ciascuno e che il percorso è gratuito per famiglie e scuole. Le condizioni
  tra Fondazione e chapter sono rimandate all'accordo.
- **I numeri di Taranto sono obiettivi** di un'edizione in corso. Nessun
  premio è indicato.
- **Le lezioni** sono dette per quello che sono: di intelligenza artificiale,
  in inglese. Le biotecnologie entrano nel progetto.
- **Il certificato** non è detto "verificabile": il link di verifica stampato
  sul certificato punta a `/verify`, che sul sito non esiste ancora.
- **Nessun trattino lungo**, come vuole `CLAUDE.md`.

## Da decidere prima di diffonderla

- **La quota.** Il chapter versa qualcosa alla Fondazione, oppure ciascuno
  sostiene i propri costi? Le tre proposte suggeriscono nessuna quota nella
  prima edizione.
- **Il territorio.** Provincia, città metropolitana o altro. La presentazione
  dice che l'area si concorda.
- **La finale a Taranto nel 2027**: se ci sarà, quando e con quanti posti per
  chapter.
- **La piattaforma.** Oggi è configurata per Taranto: una sola provincia, un
  solo calendario, moduli e circolare che citano il PalaMazzola e SafesPro.
  Per più territori servono un'etichetta di chapter per scuola, report
  aggregati per coordinatore e moduli con l'evento di ciascun chapter.
- **SafesPro.** È citata come promotrice della prima edizione. Il suo ruolo nei
  chapter va concordato.
- **I mentor.** Le verifiche per chi lavora con minorenni (per esempio il
  certificato del casellario giudiziale) vanno confermate con un legale.
- **Il marchio.** Verificare che il nome e il logo del programma siano
  registrati prima di concederli in licenza.

## Sul sito, prima di condividerla

- La pagina del bando per le scuole (`PREMI_LICEI` in
  `app/eventi/vivere-piu-a-lungo/licei/content.ts`) presenta ancora come primo
  premio il viaggio a New York. Per questo la slide 13 rimanda alla guida,
  `/eventi/vivere-piu-a-lungo/licei/guida`, che non mostra i premi.
- Manca la pagina `/verify` a cui rimanda il certificato.

## Da dove vengono i contenuti

| Contenuto | Fonte |
|---|---|
| La prima edizione: rete, scuole, capofila, cabina di regia | `../licei/README.md` e l'articolo di Buonasera24 del 22 settembre 2026 |
| Lezioni, fasi, percorsi tecnici, ore, lingua, mentor, percorso di lancio | `app/courses/course-data.ts`, `app/courses/agentic-ai/CourseIntroClient.tsx` |
| Criteri, Commissione, squadre, autorizzazioni, referente, circolare | `app/eventi/vivere-piu-a-lungo/licei/content.ts` e `licei/guida/` |
| Titolare del trattamento | `app/legal/privacy/content.ts` |
| Il modello a chapter | Le indicazioni della Fondazione |
