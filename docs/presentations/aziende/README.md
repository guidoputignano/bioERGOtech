# Il percorso delle scuole, per le aziende

La presentazione del percorso educativo della Rete di Scopo "Biotecnologie e
Intelligenza Artificiale 2026" pensata per le aziende che stanno valutando una
sponsorizzazione. Racconta il percorso e mostra come un'azienda può farne
parte. Italiano, 16:9, 12 slide. Si manda dopo la proposta di
sponsorizzazione, a chi mostra interesse per la parte educativa, per esempio
per la borsa di studio intitolata.

| File | Che cos'è |
|---|---|
| `aziende-deck.html` | Il sorgente. Autoconsistente: font e immagini sono incorporati. Si modifica questo. |
| `build-pdf.mjs` | Stampa il deck in PDF 1440 x 810 con Chromium. |
| `Biotecnologie-e-IA-Il-percorso-delle-scuole-per-le-aziende.pdf` | Il PDF da condividere. |

```bash
npm install          # playwright-core, una volta
npm run build        # PDF
npm run proof        # PDF più un PNG per slide in shots/
```

## Le slide

1. Copertina
2. In sintesi: i numeri del percorso, e un rimando a che cosa può fare un'azienda
3. Perché Taranto: i dati ufficiali sui giovani della provincia
4. La rete: undici scuole in sette comuni
5. Il percorso educativo: 21 lezioni in quattro fasi, tre percorsi tecnici
6. Che cosa imparano e che cosa ottengono gli studenti
7. Chi fa cosa, e chi segue i progetti
8. L'impatto atteso e gli indicatori, che entrano nel report consuntivo dei partner
9. Che cosa ha già fatto la Fondazione: OncoTarget, CranioTech, le assunzioni a Taranto
10. Il palco di dicembre, con relatori e organizzazioni
11. Come un'azienda può farne parte: borsa di studio, mentor, un problema reale, visibilità, e le tutele per gli studenti
12. Calendario e contatti

## Come è costruita

Parte dalla presentazione per Fondazione CON IL SUD (`../cofinanziamento/`),
che era già scritta per chi guarda il percorso da fuori. Tolte la richiesta di
cofinanziamento, le voci di costo, la slide dei premi e ogni riferimento a
Fondazione CON IL SUD. Aggiunta la slide 11.

## Scelte

- **Solo quello che c'è nel listino.** La slide 11 descrive la borsa di studio
  intitolata (inclusa nel livello Official Partner, oppure da sola), le persone
  dell'azienda come mentor o in giuria e la challenge su un problema reale
  (Main Partner, su richiesta Scientific & Innovation Partner), e la
  visibilità (ogni livello). Nessun prezzo: rimanda al dossier.
- **Le tutele per gli studenti.** Nessuna azienda riceve i dati degli studenti
  delle scuole o acquisisce diritti sui loro progetti, e i mentor incontrano le
  squadre nei momenti previsti dal programma, coordinati dalla Fondazione.
- **Nessun premio.** Il primo premio non è confermato.
- **Il certificato** non è detto "verificabile": la pagina `/verify` non esiste
  ancora.
- **Nessun link alla pagina del bando per le scuole**, che mostra ancora il
  viaggio a New York.
- **Solo chi ha dato il consenso**, come nelle altre presentazioni.
- **Nessun trattino lungo**, come vuole `CLAUDE.md`.

Le fonti sono le stesse di `../cofinanziamento/README.md` e di
`../../sponsorship/prospectus/README.md` per il listino.
