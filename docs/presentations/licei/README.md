# Presentazione per le scuole, Rete di Scopo 2026

La presentazione per i dirigenti e i docenti delle undici scuole della Rete di
Scopo **"Biotecnologie e Intelligenza Artificiale 2026"**, in provincia di
Taranto. Italiano, 16:9, 13 slide. Parte dal valore per gli studenti, mostra il
percorso in tre tappe e chi fa cosa in ciascuna, poi entra nei contenuti.

| File | Che cos'è |
|---|---|
| `licei-deck.html` | Il sorgente. Autoconsistente: font e immagini sono incorporati, niente viene scaricato in stampa. Si modifica questo. |
| `build-pdf.mjs` | Stampa il deck in PDF 1440 x 810 con Chromium. |
| `Biotecnologie-e-IA-Rete-di-Scopo-2026-Presentazione-Scuole.pdf` | Il PDF. |

```bash
npm install          # playwright-core, una volta
npm run build        # PDF
npm run proof        # PDF più un PNG per slide in shots/
```

## Le slide

1. Copertina, con le tre tappe
2. Perché aderire: che cosa ne ricavano gli studenti
3. Il percorso in tre tappe: formazione, finale del 10 dicembre, Showcase dell'11 dicembre
4. Chi fa cosa, tappa per tappa: scuola, studenti, famiglie, Fondazione e SafesPro, Commissione
5. Tappa 1, il programma: 21 lezioni in quattro fasi, tre percorsi tecnici
6. Tappa 1, che cosa imparano: sei competenze, le stesse dei criteri di valutazione
7. Tappa 1, chi segue i progetti: Olufemi Olusola
8. La selezione e i premi
9. Tappa 2, la finale al PalaMazzola, con i relatori in tre categorie
10. Tappa 3, lo Showcase al Teatro Fusco
11. Dopo il percorso: OncoTarget, CranioTech, le assunzioni a Taranto, il percorso di lancio
12. Per la scuola: il docente referente in sei passi, che cosa riceve la scuola, le tutele
13. Prossimi passi, contatti e le undici scuole

Le slide da 5 a 10 hanno in alto un indicatore delle tre tappe, con quella corrente evidenziata.

## Da dove vengono i contenuti

| Contenuto | Fonte |
|---|---|
| Rete, capofila, cabina di regia, PCTO e FSL, 24 settembre | L'articolo di Buonasera24 del 22 settembre 2026 |
| Premi, criteri, Commissione, impegni della scuola, autorizzazioni, squadre, podio | Il bando licei, `app/eventi/vivere-piu-a-lungo/licei/content.ts` |
| Chi fa cosa: i passi del docente referente e dello studente, la circolare già pronta | La guida `app/eventi/vivere-piu-a-lungo/licei/guida/page.tsx` e `GeneratoreCircolare.tsx` |
| Le 21 lezioni, le quattro fasi, i tre percorsi tecnici | `app/courses/course-data.ts` |
| Ore settimanali, certificato, incontri con il mentor, proprietà del progetto, percorso di lancio | `app/courses/agentic-ai/CourseIntroClient.tsx` |
| Lezioni in inglese, corso seguito dai licei | `app/eventi/vivere-piu-a-lungo/licei/README.md` |
| Relatori, programma della prima giornata, tre minuti per squadra | `app/eventi/vivere-piu-a-lungo/content.ts` |
| Showcase dell'11 dicembre | `app/eventi/vivere-piu-a-lungo/bando/content.ts` |
| Olufemi Olusola | `lib/team.ts` e le indicazioni della Fondazione |
| OncoTarget, CranioTech | Il portafoglio in `app/build-with-us/page.tsx` |
| Design | Le brand guidelines v1.1: Mulish, Mint Teal `#10D8B0`, Deep Navy `#202838` |

## Regole

- **Solo chi ha dato il consenso.** I volti dei relatori arrivano da
  `RELATORI_PUBBLICI`, mai da `RELATORI`: chi ha `daAutorizzare` resta fuori.
  Nessuno studente è nominato o ritratto.
- **Nessun trattino lungo**, come vuole `CLAUDE.md`.
- **Nessun dato inventato.** Dove l'articolo e il bando non coincidono vale il
  bando: la finale degli studenti è il 10 dicembre al PalaMazzola, non l'11.
- **Il primo premio non è indicato.** La settimana a New York non è ancora
  confermata, quindi la presentazione lo dà come "in via di definizione".

## Da confermare prima dell'uso

- **Primo premio.** Il bando sul sito (`PREMI_LICEI`) e l'articolo parlano
  ancora della settimana a New York. Se non è confermata, va corretto anche lì.
- **Posti.** La presentazione usa 2.000 posti al PalaMazzola e 500 al Teatro
  Fusco, come indicato dalla Fondazione. La configurazione del sito
  (`content.ts`, `SESSIONS.capienza`) dice ancora 300 e 150, e le iscrizioni
  online si fermano a quei numeri.
- **Giorno del podio.** Il programma del sito proclama il gruppo vincitore a
  fine 10 dicembre, il README del bando licei mette la premiazione l'11. La
  presentazione dice solo che il podio si assegna dopo le presentazioni.
- **Startup da Boston, Zurigo e Italia** allo Showcase: il bando chiude il 31
  ottobre e gli ammessi si conoscono entro il 20 novembre.
- **Durata e impegno.** Il corso è strutturato in 10 settimane e la pagina del
  corso indica da 4 a 6 ore a settimana. Il calendario reale dipende da quando
  si aprono le iscrizioni.
