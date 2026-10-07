# Stampa: cartella, comunicati, guida e rassegna

Il materiale per la stampa di **"Vivere più a lungo: sport e intelligenza
artificiale"** (Taranto, 10 e 11 dicembre 2026) e il necessario per fare la
rassegna stampa.

La rassegna stampa è la raccolta degli articoli e dei servizi usciti. Per
averne bisogna dare ai giornalisti materiale pronto, al momento giusto. Questa
cartella contiene l'uno e l'altro: i documenti da mandare, la guida per farlo e
il registro dove annotare ogni uscita. Il dossier di sponsorizzazione promette
agli sponsor un report finale con la rassegna stampa, quindi va fatta bene fin
dall'inizio.

## I documenti

| File | Che cos'è | A chi, quando |
|---|---|---|
| `bioERGOtech-Cartella-stampa-Vivere-piu-a-lungo-2026.pdf` | **Cartella stampa**, 12 pagine. È il documento di riferimento: in breve, il progetto, perché Taranto, il programma, i relatori, lo Showcase, il percorso per le scuole, chi organizza, la Fondazione, domande frequenti, informazioni per i giornalisti. | Allegata o collegata a ogni invio. Si aggiorna dopo il 31 ottobre e dopo il 20 novembre. |
| `bioERGOtech-Comunicato-stampa-lancio.pdf` e `testi/comunicato-lancio.md` | **Comunicato di lancio**, 2 pagine. Il testo `.md` si incolla nel corpo dell'email, con l'oggetto già pronto. | A tutta la media list, martedì 13 ottobre, comunque prima del 31 ottobre (scadenza dello Showcase). |
| `bioERGOtech-Nota-per-le-redazioni.pdf` e `testi/nota-redazioni.md` | **Invito stampa**, 1 pagina: dove, quando, accrediti, interviste, riprese. | 1 dicembre, poi di nuovo il 7 e il 9. |
| `testi/comunicato-chiusura-modello.md` | **Comunicato di chiusura**, modello con i campi `[DA COMPILARE]` per i numeri veri. | L'11 dicembre entro le 16, per le edizioni di sabato. |
| `bioERGOtech-Guida-ufficio-stampa-e-rassegna.pdf` | **Guida operativa**, interna, 13 pagine. Spiega che cosa sono gli strumenti, il calendario dal 7 ottobre al 20 dicembre, a chi scrivere, due modelli di email, il giorno dell'evento, immagini e consensi, messaggi chiave e domande difficili, come raccogliere le uscite e comporre la rassegna, il report agli sponsor. | Per il Presidente e chi lo aiuta. Non si invia. |
| `bioERGOtech-Rassegna-stampa-2024-2025.pdf` | **Prima rassegna stampa**, 7 pagine: 15 uscite di 9 testate, dai Taranto Biotech Days 2024 alla presentazione a Montecitorio del 29 ottobre 2025. | Per sponsor, enti e giornalisti, come storia della Fondazione. Dopo l'evento si aggiorna. |
| `Registro-stampa.xlsx` | **Registro stampa**. "Media list" con 60 testate verificate (19 di priorità A), "Uscite" con 56 uscite già pubblicate, "Riepilogo" calcolato con formule per la rassegna e il report agli sponsor, "Istruzioni". | Si compila man mano: celle gialle. |

Gli HTML sono autoconsistenti, con font e immagini incorporati: si modificano
quelli e si ristampa.

```bash
npm install          # playwright-core, una volta
npm run check        # le regole, sui cinque documenti
npm run build        # i PDF
npm run proof        # PDF più un PNG per pagina in shots/
```

I comunicati sono testo che scorre: carta intestata solo sulla prima pagina,
piede con indirizzo e numero di pagina. La cartella, la guida e la rassegna
sono a pagine fisse, come i documenti per la Regione.

## Scelte

- **Nessun nome senza consenso.** Relatori da `RELATORI_PUBBLICI`, più la moderatrice; organizzazioni da `PARTNER_PUBBLICI`, più SafesPro come ente organizzatore. Guido Putignano è l'unica persona citata.
- **Una sola citazione, da approvare.** La frase del Presidente è la stessa nella cartella e nel comunicato. Se cambia, va cambiata in entrambi.
- **Nessun premio del percorso per le scuole, nessun giorno della proclamazione.** I premi citati sono quelli dello Showcase, come nel bando.
- **Nessuno sponsor e nessun ente pubblico.** Non si scrive che la Regione, il Comune o altri sostengono l'evento: nulla è ancora concesso. La riga del patrocinio si aggiunge solo dopo la concessione. Gli sponsor si nominano a contratto firmato: il dossier promette al primo livello un comunicato dedicato e agli altri una menzione nei comunicati.
- **Posti.** 2.000 al PalaMazzola; nessun numero per il Teatro Fusco (la Fondazione dice 500, le fonti pubbliche 456).
- **Rassegna: solo titolo e link.** Le sintesi sono scritte da noi; nessun testo degli articoli è riprodotto. Le copie integrali vanno solo dove le licenze degli editori lo permettono.
- **Fuori dalla prima rassegna.** Non ci sono:
  - gli articoli di settembre 2026 sulla rete delle scuole (Buonasera24, Blunote), che annunciano il viaggio a New York e nominano scuole e una dirigente;
  - le uscite che riportano numeri di telefono personali o nomi fuori dagli elenchi consentiti.
  Restano tutte nel registro, con il motivo.
- **Nessuna firma** e **nessun trattino lungo**, come negli altri documenti.

## Prima di inviare qualsiasi cosa

Bloccanti:

- **Le iscrizioni al 10 dicembre non vengono salvate.**
  - Sul sito pubblico, `/api/eventi/seats` mostra ancora le sessioni vecchie: `giorno-1-mattina`, `giorno-1-pomeriggio` e `giorno-2`.
  - Il modulo invia `giorno-1`. La funzione di iscrizione salta in silenzio una sessione che non conosce e risponde comunque "Iscrizione confermata".
  - Le migrazioni da applicare su Supabase sono `20261101000000_update_event_sessions.sql` e `20261201000000_update_event_sessions_palamazzola.sql`. Va verificato anche lo stato delle successive.
- **I limiti di iscrizione sono 300 e 150 posti**, mentre i comunicati parlano di 2.000 posti al PalaMazzola.
- **Il sito.**
  - La pagina del bando per le scuole (`PREMI_LICEI`) mostra ancora il viaggio a New York, e "3 Premi" accanto ai progetti degli studenti.
  - La pagina dell'evento non nomina SafesPro e mostra nel team un "Consigliere Comunale".
  - La pagina About descrive ancora la Fondazione come biologia sintetica.
- **Un referente stampa** con nome, email e cellulare per il 10 e l'11 dicembre. Oggi i documenti indicano il Presidente e info@bioergotech.org. Non usare il 347 7320692, che è di SafesPro.
- **La citazione del Presidente**, da approvare.
- **L'immagine di copertina** è un'illustrazione con un logo di abbigliamento sportivo sulle scarpe. Va ritoccata prima di darla ai media, e vanno chiariti i diritti d'uso.

Da confermare:

- **Le date di invio** proposte dalla guida: comunicato martedì 13 ottobre; eventuale conferenza stampa il 24 o 25 novembre; nota il 1° dicembre; chiusura l'11 dicembre; report agli sponsor entro il 15 gennaio 2027.
- **Accrediti:** a info@bioergotech.org entro venerdì 4 dicembre, oppure a un indirizzo dedicato. Desk stampa dalle 8:30.
- **Interviste:** la disponibilità del Presidente e dei relatori.
- **Riprese degli studenti.** Che cosa coprono le autorizzazioni delle famiglie, se anche l'invio di foto ai giornali. Serve la lista di chi non è autorizzato. Va previsto un avviso sulle riprese nella pagina di iscrizione e agli ingressi.
- **Fotografo e video:** un accordo che copra l'uso per la stampa e per gli sponsor.
- **Le risposte alle domande difficili** nella guida: chi paga, contributi pubblici chiesti, compensi dei testimonial, equilibrio tra donne e uomini sul palco (6 su 16), il legame tra la Vice Presidente e SafesPro.
- **Oltre il Fatto.** Due articoli della rassegna portano una firma legata a SafesPro. Restano inclusi; in `build_rassegna.py`, `ESCLUDI_FIRMA_OIF = True` li toglie.
- **Chi tiene il registro** e compone la rassegna.

## Da dove vengono i contenuti

| Contenuto | Fonte |
|---|---|
| Programma, relatori e ruoli, sedi, orari, iscrizioni | `app/eventi/vivere-piu-a-lungo/` (`content.ts`, `page.tsx`, `RegistrationForm.tsx`) e le schede verificate per i documenti della Regione |
| Showcase: categorie, premi, calendario, Commissione | `app/eventi/vivere-piu-a-lungo/bando/content.ts` |
| Percorso per le scuole | `app/eventi/vivere-piu-a-lungo/licei/` e `../presentations/licei/README.md` |
| Dati su giovani e salute | ISTAT e ISS, come in `../regione-puglia/README.md` |
| La Fondazione | il sito e `../regione-puglia/README.md` |
| Uscite già pubblicate (rassegna e registro) | pagine delle testate, aperte e verificate il 7 ottobre 2026 |
| Media list | siti delle testate, aperti il 7 ottobre 2026. Indirizzi email solo se pubblicati dalla testata stessa; nessun contatto personale di giornalisti |
