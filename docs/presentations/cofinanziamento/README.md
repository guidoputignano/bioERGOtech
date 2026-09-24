# Proposta di cofinanziamento, progetto formativo 2026/2027

La presentazione da condividere con **Fondazione CON IL SUD**. Descrive il
percorso educativo e di orientamento di dieci settimane della Rete di Scopo
"Biotecnologie e Intelligenza Artificiale 2026", i premi che lo concludono e
l'impatto sul territorio, e propone un cofinanziamento. Italiano, 16:9, 13 slide.

Fondazione CON IL SUD sostiene progetti formativi, non eventi. Per questo le
giornate del 10 e 11 dicembre compaiono solo alla fine, come opportunità in più
e dichiaratamente fuori dalla richiesta.

| File | Che cos'è |
|---|---|
| `fcs-deck.html` | Il sorgente. Autoconsistente: font e immagini sono incorporati. Si modifica questo. |
| `build-pdf.mjs` | Stampa il deck in PDF 1440 x 810 con Chromium. |
| `Biotecnologie-e-IA-Percorso-educativo-Proposta-Fondazione-CON-IL-SUD.pdf` | Il PDF da condividere. |

```bash
npm install          # playwright-core, una volta
npm run build        # PDF
npm run proof        # PDF più un PNG per slide in shots/
```

## Le slide

1. Copertina
2. La proposta in sintesi: un progetto formativo, non un evento
3. Il territorio: dati ufficiali su Taranto e la risposta del progetto
4. La rete: undici scuole in sette comuni, 550 studenti
5. Il percorso educativo: 21 lezioni in quattro fasi, tre percorsi tecnici
6. Che cosa imparano e che cosa ottengono
7. Chi fa cosa, e chi segue i progetti
8. I premi, con il viaggio studio a New York e l'incubazione
9. L'impatto atteso sul territorio, gli indicatori di monitoraggio e la valutazione di impatto
10. Che cosa ha già fatto la Fondazione: OncoTarget, CranioTech, le assunzioni a Taranto
11. Le voci di costo, senza importi, e la proposta
12. Fuori dalla richiesta: le giornate di dicembre, con relatori e organizzazioni
13. Calendario e contatti

## Scelte concordate

- **Nessun importo.** Le voci di costo ci sono, le cifre no: la misura del
  cofinanziamento la propone Fondazione CON IL SUD.
- **550 studenti**, cioè 50 per ciascuna delle undici scuole, come obiettivo.
  L'articolo di settembre parlava di "fino a 500 partecipanti".
- **Premi da rendere possibili.** Il viaggio studio a New York e l'incubazione
  sono presentati come le voci che il cofinanziamento renderebbe possibili, non
  come premi già garantiti.
- **Con i Bambini non è nominata.** L'impatto è descritto in modo che il
  raccordo resti possibile, se Fondazione CON IL SUD vorrà proporlo.
- **Solo chi ha dato il consenso.** Relatori da `RELATORI_PUBBLICI` e
  organizzazioni da `PARTNER_PUBBLICI`, in `app/eventi/vivere-piu-a-lungo/content.ts`.
- **Percorso educativo, non corso di formazione.** I regolamenti di
  cofinanziamento escludono le proposte principalmente formative o legate a
  singoli eventi: vedi la sezione "Da sapere prima di inviarla".
- **Proponente**: Fondazione bioERGOtech ETS, con sede a Taranto, e SafesPro.
- **Nessun trattino lungo**, come vuole `CLAUDE.md`.

## Da dove vengono i contenuti

Le stesse fonti della presentazione per le scuole (`../licei/README.md`), più:

| Contenuto | Fonte |
|---|---|
| Dati sul territorio | Vedi la sezione qui sotto: ogni cifra è stata ricontrollata sulla fonte |
| Organizzazioni coinvolte nelle giornate | `PARTNER_PUBBLICI` in `app/eventi/vivere-piu-a-lungo/content.ts` |
| Percorso di incubazione | La pagina del corso (Launch Pathways) e le indicazioni della Fondazione |

## Dati sul territorio

Ogni cifra è stata cercata su fonti ufficiali e poi ricontrollata da una
verifica indipendente, riaprendo la fonte.

| Nella presentazione | Valore | Fonte |
|---|---|---|
| Giovani 15 a 29 anni che non studiano e non lavorano (NEET), provincia di Taranto, 2024 | 34,6% (Puglia 21,4%, Italia 15,2%) | ISTAT, BES dei territori, edizione 2025, indicatore 02IST006 |
| Giovani 15 a 29 anni occupati, provincia di Taranto, 2025 | 14,6% (Puglia 26,2%, Italia 33,1%) | ISTAT, Rilevazione sulle forze di lavoro, IstatData, tasso di occupazione provinciale |
| Saldo dei trasferimenti di residenza, cittadini italiani 18 a 39 anni, provincia di Taranto, 2019 a 2025 | meno 12.261 (22.215 partiti, 9.954 arrivati; 2025 provvisorio) | ISTAT, IstatData, Migrazioni (trasferimenti di residenza) per provincia |
| Mobilità dei laureati italiani 25 a 39 anni, provincia di Taranto, 2023 | meno 42,5 per mille (Puglia meno 32,7; dato provvisorio) | ISTAT, BES dei territori, edizione 2025, indicatore 11RIC025 |
| Studenti del triennio nelle undici scuole, a.s. 2024/25 | 6.662, il 42,6% dei 15.632 del triennio statale della provincia | Ministero dell'Istruzione e del Merito, Portale Unico dei Dati della Scuola, dataset ALUCORSOINDCLASTA e anagrafe SCUANAGRAFESTAT 2024/25 |

Altre cifre verificate ma non usate, utili a voce: popolazione della provincia
da 568.258 (2019) a 547.928 (2026, stima), meno 3,6%; residenti 15 a 34 anni
meno 8,8% nello stesso periodo, contro meno 0,9% in Italia; disoccupazione
15 a 24 anni 67,9% nel 2025 (stima su campione piccolo, da usare con cautela);
laureati 25 a 34 anni in Puglia 27,8% nel 2025, contro 31,1% in Italia.

## Da sapere prima di inviarla

I regolamenti di cofinanziamento di Fondazione CON IL SUD e di Con i Bambini
escludono le proposte "principalmente finalizzate ad attività di studio,
ricerca, formazione [...] alla realizzazione di singoli eventi". Per questo la
presentazione parla di percorso educativo e di orientamento, e di comunità
educante. Il Documento programmatico triennale 2025 a 2027 di Fondazione CON IL
SUD indica che il budget per l'educazione dei giovani è confluito in Con i
Bambini. Il regolamento 2025 delle Iniziative in cofinanziamento di Con i
Bambini chiede, tra l'altro: minori in situazione di particolare vulnerabilità,
durata da 36 a 48 mesi, contributo fino al 50% del costo, la restante parte da
enti erogatori privati esterni al partenariato, capofila del Terzo Settore
iscritto al RUNTS, valutazione di impatto con un ente di ricerca qualificato.
