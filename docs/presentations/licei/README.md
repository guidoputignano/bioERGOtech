# Presentazione per le scuole, Rete di Scopo 2026

La presentazione per i dirigenti e i docenti delle undici scuole della Rete di
Scopo **"Biotecnologie e Intelligenza Artificiale 2026"**, in provincia di
Taranto. Italiano, 16:9, 13 slide. Racconta il percorso per gli studenti e
perché la scuola dovrebbe parteciparvi.

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

1. Copertina
2. In sintesi: undici scuole, 500 studenti, dieci settimane, zero costi, dieci progetti sul palco, New York
3. La rete: le undici scuole e la cabina di regia
4. Il percorso dello studente: da 500 studenti a 10 squadre sul palco e 3 premiate
5. Dieci settimane: che cosa si fa
6. Chi guida i progetti: Olufemi Olusola
7. La selezione: sei criteri, 100 punti, la Commissione
8. I premi
9. Oltre il premio: OncoTarget, CranioTech, le assunzioni a Taranto
10. La finale del 10 dicembre al PalaMazzola, con i relatori in tre categorie
11. Lo Showcase dell'11 dicembre al Teatro Fusco
12. Che cosa riceve la scuola, che cosa fa
13. Prossimi passi e contatti

## Da dove vengono i contenuti

| Contenuto | Fonte |
|---|---|
| Rete, capofila, cabina di regia, PCTO e FSL, 24 settembre | L'articolo di Buonasera24 del 22 settembre 2026 |
| Premi, criteri, Commissione, impegni della scuola, autorizzazioni | Il bando licei, `app/eventi/vivere-piu-a-lungo/licei/content.ts` |
| Relatori, programma della prima giornata | `app/eventi/vivere-piu-a-lungo/content.ts` |
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

## Da confermare prima dell'uso

- **Posti.** La presentazione usa 2.000 posti al PalaMazzola e 500 al Teatro
  Fusco, come indicato dalla Fondazione. La configurazione del sito
  (`content.ts`, `SESSIONS.capienza`) dice ancora 300 e 150, e le iscrizioni
  online si fermano a quei numeri.
- **Startup da Boston, Zurigo e Italia** allo Showcase: il bando chiude il 31
  ottobre e gli ammessi si conoscono entro il 20 novembre.
- **Durata del corso**: l'articolo dice "circa 10 settimane", e la
  presentazione la indica come durata indicativa.
