# Documenti per la Regione Puglia

Tre documenti A4, in italiano, per chiedere alla Regione Puglia il patrocinio
e un contributo per **"Vivere più a lungo: sport e intelligenza artificiale"**
(Taranto, 10 e 11 dicembre 2026) e per il percorso per le scuole
**"Biotecnologie e Intelligenza Artificiale"**. Ognuno si legge da solo e
rimanda agli altri due.

| File | Che cos'è |
|---|---|
| `regione-1-fondazione.html` → `bioERGOtech-Regione-Puglia-1-La-Fondazione.pdf` | Documento 1, La Fondazione. Copertina e 6 pagine. |
| `regione-2-progetto.html` → `bioERGOtech-Regione-Puglia-2-Il-progetto.pdf` | Documento 2, Il progetto: scopo e finalità sociali. Copertina e 8 pagine. |
| `regione-3-costi.html` → `bioERGOtech-Regione-Puglia-3-Piano-dei-costi.pdf` | Documento 3, Piano dei costi e richiesta di contributo. Copertina e 6 pagine. |
| `build-pdf.mjs` | Stampa un documento in PDF A4 con Chromium e segnala ciò che esce dalla pagina. |
| `check.mjs` | Controlla le regole: trattini, nomi senza consenso, contenuti non confermati, apostrofi, tono, cifre del piano. |
| `email-accompagnamento.md` | Il testo dell'email che accompagna i tre documenti, e quello della PEC per il patrocinio. |

Gli HTML sono autoconsistenti, con font e immagini incorporati. Si modificano
quelli.

```bash
npm install          # playwright-core, una volta
npm run check        # le regole, sui tre documenti
npm run build        # i tre PDF
npm run proof        # PDF più un PNG per pagina in shots/
```

## Le pagine

**1. La Fondazione:**
1. chi è;
2. come lavora;
3. che cosa ha già fatto;
4. dove opera e dove vuole arrivare;
5. il territorio e la richiesta alla Regione;
6. organizzazione e trasparenza, con contatti e firma.

**2. Il progetto:**
1. in sintesi;
2. le sei finalità sociali;
3. perché Taranto, con i dati ISTAT e ISS;
4. il percorso per le scuole;
5. la prima giornata;
6. la seconda giornata;
7. risultati attesi e indicatori;
8. le richieste alla Regione e la coerenza con la programmazione regionale.

**3. Piano dei costi e richiesta di contributo:**
1. sintesi;
2. prospetto analitico;
3. che cosa copre il contributo regionale;
4. note metodologiche;
5. impegni e rendicontazione;
6. cronoprogramma e richiesta formale, con firma.

## Le cifre

| | Euro | Quota |
|---|---:|---:|
| Costo complessivo | 184.970 | 100% |
| Contributo regionale richiesto | 65.000 | 35,1% |
| Sponsor privati, in corso di raccolta | 103.500 | 56,0% |
| Risorse proprie della Fondazione | 16.470 | 8,9% |

- Il piano è la versione 2, riclassificata, dei materiali già preparati dalla Fondazione. Il totale non cambia.
- Il contributo copre sicurezza, sede, allestimento base e accessibilità, mobilità documentata dei relatori, percorso per le scuole e documentazione in accesso aperto.
- Restano esclusi: regia e produzione, promozione, compensi dei testimonial, momento musicale, viaggio di studio, accoglienza e imprevisti.
- L'effetto leva, 1,85 euro per euro pubblico, vale solo se la quota sponsor è raccolta per intero, e il testo lo dice.

## Scelte

- **Nessun nome senza consenso.**
  - I relatori sono quelli di `RELATORI_PUBBLICI`, più la moderatrice. Le organizzazioni sono quelle di `PARTNER_PUBBLICI`.
  - Guido Putignano compare solo come Presidente, nei contatti e nella firma.
  - Non sono nominati: le scuole della rete, il team, le imprese seguite dalla Fondazione (OncoTarget, CranioTech) e chi nella vecchia brochure non ha dato il consenso.
- **Nessun premio del percorso per le scuole.** La voce E.3 da 15.000 euro, il viaggio del piano v2, resta nel piano:
  - si chiama "Viaggio di studio della squadra vincitrice, solo con sponsor";
  - non ha destinazione ed è esclusa dal contributo.
  - Se si preferisce toglierla:
    - totale 169.970 euro;
    - sponsor 88.500 (52,1%);
    - Regione 38,2%;
    - Fondazione 9,7%;
    - effetto leva 1,61.
- **Teatro Fusco senza numero di posti.** La Fondazione indica 500 posti, le fonti pubbliche 456. Il PalaMazzola resta a 2.000 posti.
- **Le sedi.** Il PalaMazzola è detto "riqualificato dal Comune in vista dei XX Giochi del Mediterraneo", come risulta dalle fonti. Non si dice che gli impianti sono stati "consegnati alla città" o costruiti dalla Regione.
- **Dalla vecchia brochure è stato tolto ciò che le fonti non sostengono:**
  - "otto startup";
  - "PalaMazzola Iacovone";
  - la giuria di sponsor;
  - la rete di ospedali;
  - la linea oncologica con la rete piemontese;
  - la ristorazione collettiva;
  - "le due metà del ciclo";
  - la frase sul primo grande evento dopo i Giochi.
- **La tappa "dal campo alla clinica"** è presentata come direzione da costruire, non come programma in corso.
- **Gli obiettivi sono valori attesi.** Per ciascuno è indicato come si misura.
- **Il contributo è chiesto "nelle forme e secondo le procedure che gli uffici regionali riterranno applicabili"**, perché non è stato individuato un avviso aperto adatto.
- **L'avvertenza interna del piano v2 non c'è.** I suoi punti sono qui sotto.
- **Nessun trattino lungo**, come vuole `CLAUDE.md`.

## Prima del deposito

Bloccanti:

- **Parità di genere.**
  - L'art. 3 della L.R. 34/1980, come sostituito dall'art. 140 della L.R. 42/2024, chiede per patrocini e contributi regionali eventi in cui i relatori rispettino la parità di genere.
  - Oggi i relatori sono 6 donne su 16, moderatrice compresa, e nessuna donna nei panel 3 e 7.
  - Riequilibrare, oppure verificare il criterio con gli uffici.
- **Identità dell'ente.** Servono:
  - i dati RUNTS;
  - la PEC;
  - le finalità statutarie e gli organi, dallo statuto;
  - la conferma dei poteri di firma del Presidente.
  - Il 347 7320692 è di SafesPro e non va indicato come recapito della Fondazione.
- **Lo strumento regionale.** Va scelto con gli uffici e citato nella richiesta: istanza di contributo, contributo straordinario o protocollo d'intesa ai sensi della DGR 420/2026, punto 5.
- **Le scadenze del patrocinio.**
  - Patrocinio del Presidente della Giunta: entro il 10 novembre 2026, via PEC.
  - Patrocinio del Consiglio regionale: entro il 25 novembre 2026.
  - Il contributo del Consiglio, fino a 2.000 euro, non si cumula con la richiesta di 65.000 euro.
- **Doppio finanziamento.** La proposta a Fondazione CON IL SUD presenta come cofinanziabili mentor, coordinamento delle scuole e viaggio. Fissare per giustificativo il confine con le voci E.2 ed E.3.
- **Chi paga che cosa.**
  - SafesPro emette contratti e fatture degli sponsor.
  - Le spese imputate al contributo devono essere intestate e pagate dalla Fondazione, come promette il Documento 3.
  - Decidere se dichiarare che la Vice Presidente dirige SafesPro.
- **Le sedi.** Confermare per iscritto con il Comune:
  - la disponibilità del PalaMazzola, la cui gestione è in assegnazione;
  - la disponibilità del Teatro Fusco, che non ha una voce di costo;
  - la capienza del Teatro Fusco.

Da definire:

- i beni della voce E.1 e le scuole che li ricevono, visto che il corso è online;
- che cosa sono gli "atti" in accesso aperto e dove saranno pubblicati;
- la base di stima di viaggi e alloggi (D.1 e D.2);
- il regime IVA;
- che cosa copre la segreteria organizzativa;
- il momento musicale: giorno, sede ed esecutore;
- il giorno della proclamazione della squadra vincitrice;
- le date di inizio e fine del corso;
- l'ultimo bilancio, o una dichiarazione sulle risorse proprie;
- riconciliare le ripartizioni delle voci originarie da 30.000 e 25.000 euro con preventivi e accordi;
- tenere cena di gala, navetta e altri benefit per gli sponsor fuori dalle voci regionali;
- l'offerta agli sponsor dei livelli più alti: oggi comprende un posto in un panel o un keynote, e un voto nella Commissione dello Showcase. Valutare se toglierli, per dire che i contenuti spettano solo alla direzione scientifica;
- la data completa nella firma, oggi "Taranto, ottobre 2026".

Sul sito, prima che la Regione lo consulti:

- la pagina del bando per le scuole (`PREMI_LICEI`) mostra ancora il viaggio a New York;
- le iscrizioni si fermano a 300 e 150 posti;
- metadati e pagina About descrivono ancora la Fondazione come attività di biologia sintetica.

## Da dove vengono i contenuti

| Contenuto | Fonte |
|---|---|
| Identità, sede, codice fiscale, Presidente, programmi di ricerca, pubblicazioni, Startup Hub, Laboratorio Distribuito, Zurigo e Riad | il sito: `components/site-footer.tsx`, `lib/team.ts`, `lib/programmes.ts`, `app/page.tsx`, `app/legal/privacy` |
| Taranto Biotech Days 2024, BioShot, presentazione a Montecitorio | il sito, l'archivio articoli e fonti di stampa |
| Programma, relatori, moderatrice, sedi, orari, Showcase, bando universitari | `app/eventi/vivere-piu-a-lungo/` (`content.ts`, `bando/`, `universita/`) |
| Percorso per le scuole, Rete di Scopo, Commissione, criteri | `app/eventi/vivere-piu-a-lungo/licei/`, `app/courses/`, `../presentations/licei/README.md` |
| Chapter dal 2027 | `../presentations/chapter/README.md` |
| Dati su giovani e salute | ISTAT (BES dei territori 2025, forze di lavoro 2025, trasferimenti di residenza, Rapporto BES 2024), ISS OKkio alla SALUTE 2023, Ministero dell'Istruzione e del Merito; vedi anche `../presentations/cofinanziamento/README.md` |
| PalaMazzola e Giochi del Mediterraneo | Commissario straordinario per i Giochi, pagina PalaMazzola; stampa locale |
| Patrocinio, avvisi, L.R. 34/1980 e L.R. 42/2024, DGR 420/2026, Piano Regionale della Prevenzione, Smart Puglia 2030, Programma Regionale FESR-FSE+, L.R. 33/2006 | portali della Regione Puglia e del Consiglio regionale, BURP |
| Piano dei costi | il piano riclassificato v2 e il piano originario della Fondazione |
