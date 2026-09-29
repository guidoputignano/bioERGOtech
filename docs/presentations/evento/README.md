# Presentazione dell'evento, 10 e 11 dicembre 2026

Il PDF descrittivo di **"Vivere più a lungo: sport e intelligenza
artificiale"**, Taranto, 10 e 11 dicembre 2026. Dice perché si fa, perché a
Taranto e perché con questi relatori, poi il programma, lo Showcase di
innovazione, le modalità, i mezzi e gli interessi di ciascun pubblico.
Italiano, 16:9, 12 slide. È un documento descrittivo: non contiene prezzi né
richieste.

| File | Che cos'è |
|---|---|
| `evento-deck.html` | Il sorgente. Autoconsistente: font e immagini sono incorporati. Si modifica questo. |
| `build-pdf.mjs` | Stampa il deck in PDF 1440 x 810 con Chromium. |
| `Vivere-piu-a-lungo-2026-Presentazione-evento.pdf` | Il PDF da condividere. |

```bash
npm install          # playwright-core, una volta
npm run build        # PDF
npm run proof        # PDF più un PNG per slide in shots/
```

## Le slide

1. Copertina
2. In sintesi: i numeri e le due giornate
3. Perché si fa: salute e prevenzione, sport, tecnologia, un palco per i giovani, e la storia del percorso
4. Perché Taranto: i dati ufficiali sui giovani della provincia e che cosa c'è già
5. Perché questi relatori: medicina e scienza, sport, istituzioni e comunicazione, con i volti
6. Il programma del 10 dicembre al PalaMazzola
7. Lo Showcase di innovazione dell'11 dicembre al Teatro Fusco: categorie, premi, ambiti, calendario
8. Le modalità: in platea, sul palco con il percorso delle scuole, sul palco con il bando dello Showcase
9. I mezzi: chi organizza, le sedi, la rete delle scuole, la piattaforma, le realtà del territorio, il sostegno di partner e sponsor
10. Gli interessi: che cosa ci trovano studenti, scuole, universitari, ricerca e startup, aziende, istituzioni, cittadini e territorio
11. Dopo le due giornate, e l'obiettivo di lungo periodo
12. Iscrizione e contatti

## Scelte

- **Solo chi ha dato il consenso.** Relatori da `RELATORI_PUBBLICI`, più la
  moderatrice, e organizzazioni da `PARTNER_PUBBLICI`.
- **Nessun premio del percorso delle scuole.** Il primo premio non è
  confermato, quindi il deck parla solo della proclamazione del gruppo
  vincitore. I premi descritti sono quelli dello Showcase, fissati dal bando.
- **Nessuno sponsor nominato.** Il deck dice che partner e sponsor possono
  sostenere le due giornate e che esiste un dossier di partnership, senza
  prezzi.
- **Nessuna promessa di diretta streaming**, che non è confermata.
- **"Cinque panel su sette"** mettono scienza e sport sullo stesso palco:
  i panel 1, 3, 5 e 7 con un medico o un ricercatore, il panel 6 con un
  divulgatore.
- **I chapter dal 2027** sono citati come deciso dalla Fondazione il 28
  settembre 2026: altre province, finale a Taranto.
- **Nessun trattino lungo**, come vuole `CLAUDE.md`.

## Da dove vengono i contenuti

| Contenuto | Fonte |
|---|---|
| Titolo, sottotitolo, obiettivo, date, orari, sedi, FAQ, categorie di iscritti | `EVENT`, `SESSIONS`, `FAQ`, `CATEGORIE` in `app/eventi/vivere-piu-a-lungo/content.ts` |
| Programma del 10 dicembre, panel, relatori, moderatrice, durata dei panel | `PROGRAMMA_GIORNO1`, `RELATORI_PUBBLICI`, `MODERATRICE` nello stesso file |
| Interessi dei pubblici | `PERCHE_PARTECIPARE` nello stesso file, e il dossier di sponsorizzazione per le aziende |
| Showcase: categorie, tempi, premi, ambiti, calendario, Commissione | `app/eventi/vivere-piu-a-lungo/bando/content.ts` |
| Taranto Biotech Days 2024, Montecitorio 28 e 29 ottobre 2025, centro di ricerca | `app/eventi/vivere-piu-a-lungo/licei/page.tsx` e `universita/content.ts` |
| Taranto che si reinventa, Startup Hub, Laboratorio Distribuito | `app/taranto/page.tsx` e il dossier di sponsorizzazione |
| Dati sui giovani della provincia | ISTAT e Ministero dell'Istruzione e del Merito, ricontrollati: vedi `../cofinanziamento/README.md` |

## Da confermare prima dell'uso

- **Posti.** Il deck usa 2.000 posti al PalaMazzola e 500 al Teatro Fusco,
  come le altre presentazioni. Le iscrizioni online si fermano ancora a 300 e
  150 (`SESSIONS.capienza` e la tabella `event_sessions`): chi si iscrive
  dopo quei numeri non trova posto.
- **Giorno della proclamazione.** Il programma del sito proclama il gruppo
  vincitore dei ragazzi il 10 dicembre, e il deck segue il sito.
