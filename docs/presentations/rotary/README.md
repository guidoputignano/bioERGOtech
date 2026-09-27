# Aggiornamento per il Rotary, settembre 2026

La presentazione da condividere con il **Rotary**, che con una donazione di
500 euro ha aiutato ad avviare il corso online di intelligenza artificiale da
cui è partito il progetto. Ringrazia, racconta com'è cresciuto il progetto,
mostra le scuole coinvolte e le giornate di Taranto, invita il Club
all'evento e chiede il patrocinio gratuito. Italiano, 16:9, 8 slide.

| File | Che cos'è |
|---|---|
| `rotary-deck.html` | Il sorgente. Autoconsistente: font e immagini sono incorporati. Si modifica questo. |
| `build-pdf.mjs` | Stampa il deck in PDF 1440 x 810 con Chromium. |
| `Biotecnologie-e-IA-Aggiornamento-per-il-Rotary.pdf` | Il PDF da condividere. |

```bash
npm install          # playwright-core, una volta
npm run build        # PDF
npm run proof        # PDF più un PNG per slide in shots/
```

## Le slide

1. Copertina
2. Grazie: il contributo del Rotary e com'è cresciuto il progetto, dal corso online alle giornate di dicembre
3. Il progetto oggi, in numeri, con il bando per gli universitari
4. Le scuole coinvolte: undici scuole in sette comuni, con la cabina di regia della rete
5. Il percorso degli studenti in tre tappe, che cosa ottengono e chi segue i progetti
6. Le giornate del 10 e 11 dicembre, con relatori e organizzazioni
7. L'invito al Club e la richiesta di patrocinio gratuito
8. Grazie e contatti

## Scelte

- **Nessun logo del Rotary.** Il logo si usa solo dopo il consenso del Club,
  secondo le linee guida del Rotary. La slide 7 chiede proprio questo.
- **Il nome del Club non compare.** La presentazione dice "il Rotary" e "il
  Club". Quando il nome esatto è confermato va messo in copertina e nel piè di
  pagina.
- **L'importo è indicato**, 500 euro, nella slide 2. Si può togliere lasciando
  solo "il contributo del Rotary".
- **Il patrocinio è gratuito.** Nessun impegno economico per il Club. In
  cambio: nome e logo tra i patrocini, sulla pagina dell'evento e nei
  materiali, e un ringraziamento pubblico durante le giornate.
- **Posti riservati per una delegazione del Club.** Sono offerti nella slide 7:
  se non è possibile, va tolta la riga.
- **Nessun premio indicato.** Il primo premio non è ancora confermato, quindi la
  presentazione non parla di premi.
- **Solo chi ha dato il consenso.** Relatori da `RELATORI_PUBBLICI`, più la
  moderatrice, e organizzazioni da `PARTNER_PUBBLICI`, in
  `app/eventi/vivere-piu-a-lungo/content.ts`.
- **Nessun trattino lungo**, come vuole `CLAUDE.md`.

## Da dove vengono i contenuti

Le stesse fonti delle presentazioni per le scuole (`../licei/README.md`) e per
Fondazione CON IL SUD (`../cofinanziamento/README.md`), più:

| Contenuto | Fonte |
|---|---|
| Donazione del Rotary e suo uso per avviare il corso | Le indicazioni della Fondazione |
| Data del bando per le scuole, 30 luglio 2026 | `LICEI.emanato` in `app/eventi/vivere-piu-a-lungo/licei/content.ts` |
| Bando per gli universitari | `UNIVERSITA` in `app/eventi/vivere-piu-a-lungo/universita/content.ts` |
| Orari, luoghi, programma delle giornate, QR code per l'ingresso | `EVENT`, `SESSIONS` e `FAQ` in `app/eventi/vivere-piu-a-lungo/content.ts` |
| Quota del triennio statale, 6.662 su 15.632 | Ministero dell'Istruzione e del Merito, anno scolastico 2024/25, vedi `../cofinanziamento/README.md` |

## Da confermare prima dell'uso

- **Il nome del Club**, per la copertina e il piè di pagina.
- **Posti.** Come le altre presentazioni, usa 2.000 posti al PalaMazzola e 500
  al Teatro Fusco. Le iscrizioni online si fermano ancora a 300 e 150
  (`SESSIONS.capienza`).
