# Bando universitario . Biotecnologie e Intelligenza Artificiale

Sotto modulo della pagina evento, sullo stesso modello di `licei/` e `bando/`.
Fonte: il testo del bando del 2 settembre 2026 di Fondazione bioERGOtech e
SafesPro.

## La differenza che conta

Nel bando dei licei aderisce l'istituto, tramite un docente referente, e
gli studenti vengono iscritti dalla scuola. Qui il candidato e il singolo
studente universitario. Non esistono quindi codice d'istituto, referente che
conferma, ne flusso di adesione in due passaggi. Chi lavora su questo modulo
non deve riusare niente di quella catena.

Nei testi si scrive sempre "studenti universitari". Mai "le universita" come
destinatarie o come vincitrici: gli atenei non sono parte del bando.

## Configurazione

Tutto in `content.ts`:

- `CANDIDATURE_UNIVERSITARI_APERTE`: con `false` il modulo non compare e al
  suo posto la pagina mostra il box di attesa con il contatto email. Con
  `true` il modulo e visibile. **TODO: da confermare.**
- `SCADENZA_CANDIDATURE_UNIVERSITARI`: `null` finche non c'e una data.
  L'art. 11 rimanda i termini ai canali ufficiali, quindi con `null` la pagina
  non annuncia nessuna scadenza e il modulo non si chiude da solo. Quando la
  data arriva, si valorizza `{ iso, label }` e `statoCandidatureUniversita()`
  inizia a farla rispettare, da sola e anche lato server.
  **TODO: da confermare.**
- `PREMIO_TESTO`: unico punto in cui e descritto il premio.
  **TODO: testo premio da confermare.** Il bando originale dice "rivista di
  fascia A"; qui si usa "rivista scientifica internazionale peer-reviewed,
  indicizzata Scopus o Web of Science", perche la classificazione in fasce
  dell'ANVUR riguarda l'area umanistica e sociale e non si applica alle
  scienze della vita.
- `CONSENSO_PRIVACY_UNIVERSITA_TESTO`: **TODO**, verificare che l'informativa
  del sito (`/legal/privacy`) copra anche questo trattamento, cioe finalita
  della raccolta e tempi di conservazione. Il modulo rimanda a quella, come
  gia fanno il bando startup e le iscrizioni dei licei: se va integrata, va
  integrata una volta sola.

## Il modulo

Pre-iscrizione leggera, si compila in un paio di minuti: nome, cognome,
email, universita, corso di studi, livello, area disciplinare, una riga
facoltativa sugli interessi di ricerca e due caselle obbligatorie.

L'art. 4 elenca molte altre cose (CV, competenze, proposta di progetto,
compagni di team), ma le elenca **a titolo esemplificativo**. In questa fase
serve raccogliere adesioni, non selezionare: chiederle adesso costerebbe
candidature senza aggiungere informazione utile. L'elenco completo resta
visibile in pagina, cosi il candidato sa cosa potra servire dopo.

**TODO fase 2**: se le candidature superano i posti, o quando i team dovranno
presentare il progetto, servira un secondo modulo con proposta di progetto ed
eventuale CV. Non e costruito.

## Catena tecnica

| Pezzo | File |
| --- | --- |
| Pagina | `page.tsx` |
| Barra delle sezioni | `UniversitaIndice.tsx` |
| Modulo | `PreIscrizioneForm.tsx` |
| Rotta di salvataggio | `app/api/eventi/universita/route.ts` |
| Tipi e validazione | `lib/eventi/universita.ts` |
| Client service role e finestra | `lib/eventi/universita-server.ts` |
| Email di conferma | `lib/eventi/universita-email.ts` |
| Tabella | `supabase/migrations/20261207000000_create_universita_candidature.sql` |

La finestra di candidatura e controllata anche lato server in
`verificaFinestraUniversita()`: nascondere il modulo in pagina non basta a
impedire una POST.

Un secondo invio con la stessa email aggiorna la candidatura esistente invece
di crearne una doppia. Il codice, `UNI-XXXXXXXX`, resta lo stesso.

## Iscrizione all'evento

Candidarsi al bando e iscriversi alla giornata del 10 dicembre restano due
cose distinte, come gia per il bando startup. I due moduli non sono collegati,
e la pagina lo dice in tre punti: sotto il modulo, nelle FAQ e nell'email di
conferma.

## Numerazione degli articoli

Nel documento originale le disposizioni finali sono numerate di nuovo
"Art. 10", per un errore. Sul sito sono "Art. 11".
