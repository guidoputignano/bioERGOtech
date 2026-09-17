import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import {
  COMMISSIONE_PATH,
  CONTATTI_UNIVERSITA,
  CORSO_PATH,
  GUIDA_PATH,
  MENTOR_CANDIDATURA_PATH,
  MENTOR_PATH,
  PUNTEGGIO_MASSIMO,
  SITE_URL,
  SQUADRA_MAX,
  SQUADRA_MIN,
  STUDENTE_PATH,
  UNIVERSITA,
  UNIVERSITA_PATH,
} from "../content";

/**
 * La guida operativa del percorso universitario: chi fa cosa, in che ordine,
 * con che link.
 *
 * Esiste perche fino a ieri i passi dell'universitario stavano dentro la
 * guida dei licei, in coda a quelli del docente e dello studente delle
 * superiori. Andava bene quando erano due righe e finivano con "ti fermi
 * qui". Adesso il percorso ha un account, un corso, due strade per fare
 * squadra, una consegna e una Commissione, e mandare un dottorando a leggere
 * la pagina dei licei per trovare la sua parte in fondo non e un dettaglio di
 * cortesia: e il modo in cui non la legge.
 *
 * Tre destinatari, uno sotto l'altro invece che dentro delle schede, cosi la
 * pagina si stampa e si inoltra senza che sparisca meta contenuto, e chi la
 * apre da un link vede subito che esiste anche la parte degli altri. Stessa
 * scelta della guida gemella.
 *
 * E' statica di proposito: descrive il procedimento, non lo stato delle fasi.
 * Se dicesse "le squadre sono aperte" mentirebbe il giorno dopo, e per sapere
 * se una fase e aperta basta aprire la propria area, che lo dice per davvero.
 */

export const metadata: Metadata = {
  title: `Come funziona il percorso . ${UNIVERSITA.titolo} . Fondazione bioERGOtech`,
  description:
    "Che cosa deve fare uno studente universitario, un mentor e un componente della Commissione nel percorso su biotecnologie e intelligenza artificiale, con i link giusti e i passi in ordine.",
  alternates: { canonical: GUIDA_PATH },
  openGraph: {
    title: `Come funziona il percorso . ${UNIVERSITA.titolo}`,
    description:
      "I passi del percorso universitario, in ordine: candidatura, account, corso, squadra, consegna e valutazione.",
    url: `${SITE_URL}${GUIDA_PATH}`,
    type: "website",
  },
};

const STILE = `
.gu-page { --primary-dark: #0A7A66; --text-light: #64748B; }
.gu-page .section { padding: 60px 0; overflow: visible; }
.gu-page .card { margin: 0; background: #fff; border: 1px solid var(--border-color); }
.gu-page .card::before { display: none; }
.gu-page .card:hover { transform: none; box-shadow: none; }
.gu-page section[id] { scroll-margin-top: 96px; }

.gu-hero {
  background: linear-gradient(135deg, #F7F9FC 0%, #E8F8F6 55%, #EEF3FF 100%);
  padding: 116px 0 52px;
}
.gu-kicker {
  font-size: 11.5px; font-weight: 700; letter-spacing: .12em;
  text-transform: uppercase; color: var(--primary-dark);
}
.gu-nota { font-size: 13.5px; color: var(--text-light); line-height: 1.7; }

.gu-catena { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 26px; }
.gu-anello {
  font-size: 12.5px; font-weight: 600; padding: 6px 13px; border-radius: 999px;
  background: #fff; border: 1px solid var(--border-color); color: var(--text-dark);
  transition: border-color .2s ease, color .2s ease;
}
.gu-anello:hover { border-color: var(--primary); color: var(--primary-dark); }

/* ── I passi, incolonnati su una guida verticale ── */
.gu-passi { list-style: none; padding: 0; margin: 0; max-width: 820px; }
.gu-passo { display: grid; grid-template-columns: 34px 1fr; gap: 0 18px; }
.gu-rail { display: flex; flex-direction: column; align-items: center; }
.gu-num {
  flex-shrink: 0; width: 30px; height: 30px; border-radius: 9px;
  background: var(--primary-light); color: var(--primary-dark);
  font-size: 13px; font-weight: 800;
  display: inline-flex; align-items: center; justify-content: center;
}
.gu-filo { flex: 1; width: 2px; background: var(--border-color); margin: 6px 0; }
.gu-passo:last-child .gu-filo { display: none; }
.gu-corpo { padding-bottom: 30px; }
.gu-passo:last-child .gu-corpo { padding-bottom: 0; }
.gu-titolo { font-size: 16.5px; font-weight: 700; color: var(--text-dark); margin: 4px 0 8px; }
.gu-testo { font-size: 15px; line-height: 1.75; color: var(--text-mid); margin: 0; }
.gu-link {
  display: inline-flex; align-items: center; gap: 9px; margin-top: 13px;
  font-size: 13.5px; font-weight: 600; color: var(--primary-dark);
  background: #F4FCFA; border: 1px solid #B4E3D8; border-radius: 9px; padding: 8px 14px;
  transition: background .2s ease;
}
.gu-link:hover { background: #E6F7F2; }
.gu-url {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px; color: var(--text-light);
}
.gu-poi {
  margin-top: 13px; padding: 13px 16px; border-radius: 10px;
  background: #F7F9FC; border-left: 3px solid var(--primary);
}
.gu-poi-t { font-size: 13px; font-weight: 700; color: var(--text-dark); margin: 0 0 4px; }
.gu-poi-c { font-size: 14px; line-height: 1.7; color: var(--text-mid); margin: 0; }

.gu-guasto { margin: 0 0 22px; max-width: 800px; }
.gu-guasto dt { font-size: 15px; font-weight: 700; color: var(--text-dark); margin-bottom: 4px; }
.gu-guasto dd { margin: 0; font-size: 15px; line-height: 1.75; color: var(--text-mid); }

@media (max-width: 460px) {
  .gu-passo { grid-template-columns: 26px 1fr; gap: 0 12px; }
  .gu-num { width: 26px; height: 26px; font-size: 12px; }
}
`;

type Passo = {
  titolo: string;
  testo: string;
  link?: { etichetta: string; href: string; mostra: string };
  poi?: { titolo: string; testo: string };
};

const url = (p: string) => "bioergotech.org" + p;

/* ── Lo studente ──────────────────────────────────────────────────────── */

const STUDENTE: Passo[] = [
  {
    titolo: "Candidati, da solo",
    testo:
      "Nome, cognome, email, università, corso di studi, livello e l'area disciplinare. Una riga sui tuoi interessi di ricerca è facoltativa e basta così: serve a farci un'idea di dove vorresti lavorare, non è una proposta di progetto. Non ti chiediamo il CV, né le competenze, né i compagni di team, e non devi caricare niente.",
    link: { etichetta: "Il bando e il modulo", href: UNIVERSITA_PATH, mostra: url(UNIVERSITA_PATH) },
    poi: {
      titolo: "Una candidatura per indirizzo",
      testo:
        "Un secondo invio con la stessa email viene rifiutato, non sovrascrive il primo. Se hai sbagliato qualcosa, scrivici e lo correggiamo noi.",
    },
  },
  {
    titolo: "Apri subito il link della password",
    testo:
      "Se non eri già registrato sul sito, insieme al codice della candidatura ti arriva il link per scegliere la password. Vale una volta sola: se lo rimandi a dopo e scade, ne chiedi un altro dalla pagina di accesso. Se invece un account con quella email ce l'avevi già, non ne creiamo un secondo: entri con la password che usi già.",
    poi: {
      titolo: "Perché serve subito",
      testo:
        "Le lezioni del corso sono protette da login. Senza password non entri, e nel frattempo in ogni nostra schermata risulti regolarmente candidato: nessuno si accorge che sei fermo, perché da fuori le due cose sono identiche.",
    },
  },
  {
    titolo: "Comincia il corso, senza aspettare nulla",
    testo:
      "Non c'è una conferma da attendere: basta l'account. Le lezioni sono in inglese e ognuna si chiude con una riflessione da consegnare, che apre il collegamento alla lezione dopo ed è il modo in cui sappiamo a che punto sei.",
    link: { etichetta: "Il corso", href: CORSO_PATH, mostra: url(CORSO_PATH) },
    poi: {
      titolo: "Il corso è in inglese, il resto no",
      testo:
        "Le lezioni sono aperte a chiunque nel mondo abbia un account sul sito, quindi sono in inglese. Il bando, i mentor e la Commissione restano in italiano.",
    },
  },
  {
    titolo: `Fai squadra, da ${SQUADRA_MIN} a ${SQUADRA_MAX}`,
    testo:
      "Due strade, e valgono uguale. Se i compagni li hai già, crea la squadra e passa loro il codice che ti compare. Se non conosci nessuno, entri in bacheca con una riga su cosa vorresti fare, vedi chi altro sta cercando e quali squadre hanno un posto libero, e mandi una richiesta.",
    link: { etichetta: "La tua area", href: STUDENTE_PATH, mostra: url(STUDENTE_PATH) },
    poi: {
      titolo: "In bacheca non c'è la tua email",
      testo:
        "Compaiono nome e cognome, università, corso di studi, livello, area disciplinare e la tua nota. L'email no. Chi vuole lavorare con te manda una richiesta, e i contatti si scambiano solo quando quella richiesta viene accettata. Puoi toglierti dalla bacheca quando vuoi, finché la bacheca è aperta.",
    },
  },
  {
    titolo: "Atenei diversi, ed è meglio così",
    testo:
      "Una squadra può mettere insieme università diverse e discipline diverse. Non è tollerato: è incoraggiato dall'art. 2, e a parità di tutto il resto saranno favoriti i gruppi con competenze complementari. In bacheca vedi la disciplina di ognuno proprio per questo.",
  },
  {
    titolo: "Scrivete il progetto, e consegnatelo una volta sola",
    testo:
      "Sei campi, costruiti sui criteri di valutazione: l'ipotesi di ricerca, lo stato dell'arte e cosa ci aggiungete, metodo e disegno dello studio, come le due discipline si integrano, l'impatto potenziale e gli aspetti etici. I primi due valgono entrambi per l'innovatività. Più il titolo, l'ambito e un link ai materiali, se ne avete.",
    poi: {
      titolo: "Fino alla consegna è una bozza",
      testo:
        "Potete salvarla e riprenderla per tutto il tempo in cui la fase delle consegne è aperta: finché non lo è, il modulo resta in sola lettura. La leggete voi, il vostro mentor e lo staff della Fondazione, e nessun altro: la Commissione vede i progetti solo dopo la consegna. Dopo la consegna non si tocca più, ed è quello che la Commissione legge. Può consegnare qualunque componente, non solo chi ha creato la squadra.",
    },
  },
  {
    titolo: "E poi la Commissione",
    testo:
      `I progetti consegnati vengono valutati su cento punti, con sei criteri di peso diverso. Il migliore viene avviato a un percorso di preparazione e proposta di pubblicazione su una rivista internazionale con revisione fra pari. Non è una garanzia di pubblicazione, ed è scritto nel bando con la stessa chiarezza con cui lo diciamo qui.`,
    link: { etichetta: "I criteri, articolo per articolo", href: `${UNIVERSITA_PATH}#criteri`, mostra: url(UNIVERSITA_PATH) + "#criteri" },
  },
];

/* ── Il mentor ────────────────────────────────────────────────────────── */

const MENTOR: Passo[] = [
  {
    titolo: "Si candidi, o ci lasci candidarla",
    testo:
      "Il modulo chiede chi è, dove lavora, le aree in cui può dare una mano, un profilo di due righe e quanto tempo può dare davvero. Quest'ultima è la domanda che di solito nessuno fa e che poi costa settimane: anche un solo incontro è utile, quello che non funziona è una disponibilità dichiarata e mai trovata.",
    link: {
      etichetta: "Candidarsi come mentor",
      href: MENTOR_CANDIDATURA_PATH,
      mostra: url(MENTOR_CANDIDATURA_PATH),
    },
  },
  {
    titolo: "La legge la direzione scientifica",
    testo:
      "L'approvazione non è automatica e non è un giudizio sul suo curriculum: dipende anche dalle aree che i team stanno effettivamente affrontando, e quelle cambiano a ogni edizione. Le scriviamo sia se la candidatura viene accolta sia se non lo è.",
  },
  {
    titolo: "Comparire in elenco è una scelta separata",
    testo:
      "Il consenso alla pubblicazione del profilo è facoltativo e distinto dall'approvazione: si può essere mentor del percorso senza comparire nella pagina pubblica. Chi lo dà compare con nome, ruolo, organizzazione, aree e profilo, più la foto e i collegamenti al sito e a LinkedIn se li ha indicati. Il numero di telefono non compare mai, e non solo perché la pagina non lo mostra: il database non lo concede proprio a chi legge da fuori.",
    link: { etichetta: "L'elenco dei mentor", href: MENTOR_PATH, mostra: url(MENTOR_PATH) },
  },
  {
    titolo: "L'abbinamento lo proponiamo noi",
    testo:
      "Nessun mentor si trova assegnato un team senza saperlo, e nessun team si trova un mentor che non ha mai visto. L'abbinamento tiene conto dell'area del progetto, e solo un mentor già approvato può essere abbinato: il pannello rifiuta gli altri. Da quel momento vede la bozza del team che segue, e solo quella.",
  },
  {
    titolo: "Orientamento, non esecuzione",
    testo:
      "Il progetto resta del team. Un mentor apre una strada, segnala un metodo che non regge, indica la letteratura che manca. Se il lavoro arriva alla pubblicazione, il contributo di ciascuno si riconosce secondo i criteri di integrità scientifica dell'art. 9.",
    poi: {
      titolo: "Chi segue un team non lo valuta",
      testo:
        "L'art. 8 chiede ai componenti della Commissione di dichiarare i conflitti di interesse e di astenersi, e la stessa regola vale per il mentoring: sono due ruoli, e su uno stesso progetto non si sommano.",
    },
  },
];

/* ── Il commissario ───────────────────────────────────────────────────── */

const COMMISSARIO: Passo[] = [
  {
    titolo: "L'account glielo creiamo noi",
    testo:
      "Non deve registrarsi da nessuna parte. Lo staff la aggiunge alla Commissione e le arriva una email con il link per scegliere la password. Se con quell'indirizzo risultava già registrata sul sito, entra con la password che usa già.",
  },
  {
    titolo: "Il diritto di voto dipende dal ruolo",
    testo:
      "Non è una casella che qualcuno spunta: discende dal ruolo con cui è stata inserita. Chi siede come osservatore scrive note e non numeri, e nella sua scheda i campi dei punteggi non compaiono affatto, invece di comparire disabilitati.",
  },
  {
    titolo: "Vede i progetti consegnati, non le bozze",
    testo:
      "Una bozza a metà non è un progetto: è un lavoro in corso, e giudicarlo sarebbe ingiusto. Compaiono solo i lavori consegnati, con il nome della squadra, quanti componenti ha e quante università diverse mette insieme.",
    link: { etichetta: "L'area della Commissione", href: COMMISSIONE_PATH, mostra: url(COMMISSIONE_PATH) },
  },
  {
    titolo: `Compili la scheda, ${PUNTEGGIO_MASSIMO} punti in tutto`,
    testo:
      "Sei criteri di peso diverso, dall'innovatività scientifica alla qualità della presentazione. Più un giudizio, che non dà punti, su quanto il lavoro possa diventare un articolo sottoponibile a revisione fra pari: l'art. 7 chiede di tenerne conto, e orienta la scelta del progetto da avviare alla pubblicazione.",
  },
  {
    titolo: "Vede solo le sue schede, e non è una formalità",
    testo:
      "Il punteggio degli altri commissari non le compare. Non è riservatezza fine a se stessa: un voto letto prima di dare il proprio lo tira verso di sé, e la media di cinque giudizi ancorati vale meno di cinque giudizi indipendenti. È il motivo per cui la schermata è fatta così.",
  },
  {
    titolo: "Chiudere la scheda è l'atto che conta",
    testo:
      "Finché resta aperta è un appunto privato e non entra in classifica. Si chiude intera: una scheda consegnata a metà peserebbe nella media come una completa, e abbasserebbe un progetto per una distrazione di chi lo giudica invece che per il suo merito. Dopo la chiusura non si riapre da nessuna pagina del sito: se deve correggerla, scriva alla segreteria della Commissione.",
  },
];

const GUASTI = [
  {
    d: "Mi sono candidato ma non riesco a entrare nelle lezioni",
    r: "Quasi sempre il link della password è scaduto senza essere stato usato. Ne chieda un altro dalla pagina di accesso, con l'indirizzo della candidatura. Se non funziona, ce lo scriva: dal pannello glielo rimandiamo.",
  },
  {
    d: "La mia area dice che la formazione delle squadre non è aperta",
    r: "Non c'è niente da correggere: le fasi si aprono in ordine, e questa non è ancora iniziata. Nel frattempo il corso è aperto, e ci si arriva meglio avendo già fatto qualche lezione.",
  },
  {
    d: "Il codice della squadra viene rifiutato",
    r: "È nel formato UST- seguito da sei caratteri, e non contiene lettere o cifre che si possano confondere fra loro. Se è giusto e viene comunque rifiutato: o la squadra è al completo, o non è più attiva, o la formazione delle squadre non è ancora aperta.",
  },
  {
    d: "Non vedo nessuno in bacheca",
    r: "In bacheca compare solo chi ha scelto di comparirci e non ha ancora una squadra. All'inizio è normale che sia vuota. Mettendocisi si diventa visibili agli altri, ed è il modo in cui si riempie.",
  },
  {
    d: "La squadra non riesce a consegnare",
    r: `Servono almeno ${SQUADRA_MIN} componenti: l'art. 4 parla di team, e una persona sola non lo è. Controllate anche che ci siano il titolo e l'ambito, e che tutti e sei i campi siano compilati, perché la Commissione li valuta uno per uno.`,
  },
  {
    d: "Sono un mentor approvato ma non compaio nella pagina",
    r: "Approvata e pubblicata sono due cose distinte. Se non ha dato il consenso alla pubblicazione, il profilo resta visibile solo a noi e ai team che le vengono abbinati. Basta scriverci per cambiare idea.",
  },
  {
    d: "Non arriva nessuna email",
    r: `Prima lo spam. Se non c'è nemmeno lì, scriva a ${CONTATTI_UNIVERSITA.fondazione.email} indicando il codice della candidatura, se ce l'ha.`,
  },
];

/* ── Render ───────────────────────────────────────────────────────────── */

function Passi({ passi }: { passi: Passo[] }) {
  return (
    <ol className="gu-passi">
      {passi.map((p, i) => (
        <li key={p.titolo} className="gu-passo">
          <div className="gu-rail">
            <span className="gu-num">{i + 1}</span>
            <span className="gu-filo" />
          </div>
          <div className="gu-corpo">
            <h3 className="gu-titolo">{p.titolo}</h3>
            <p className="gu-testo">{p.testo}</p>
            {p.link && (
              <div>
                <Link className="gu-link" href={p.link.href}>
                  <i className="fas fa-arrow-right" aria-hidden="true" />
                  <span>{p.link.etichetta}</span>
                </Link>
                <div className="gu-url" style={{ marginTop: 6 }}>
                  {p.link.mostra}
                </div>
              </div>
            )}
            {p.poi && (
              <div className="gu-poi">
                <p className="gu-poi-t">{p.poi.titolo}</p>
                <p className="gu-poi-c">{p.poi.testo}</p>
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

const SEZIONI = [
  { id: "studente", label: "Se sei uno studente" },
  { id: "mentor", label: "Se è un mentor" },
  { id: "commissario", label: "Se è in Commissione" },
  { id: "guasti", label: "Quando qualcosa non va" },
];

export default function GuidaUniversitaPage() {
  return (
    <>
      <style>{STILE}</style>
      <Navbar />

      <div className="gu-page">
        <section className="gu-hero">
          <div className="container mx-auto px-6">
            <span className="gu-kicker">{UNIVERSITA.occhiello}</span>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mt-3 mb-3">
              Come funziona il percorso
            </h1>
            <p className="text-lg text-gray-700" style={{ maxWidth: 780 }}>
              I passi in ordine, per chi partecipa, per chi affianca i team e per chi li valuta.
              Niente di quello che c&apos;è qui sostituisce il bando: questa pagina dice come si
              fanno le cose, il bando dice quali sono le regole.
            </p>
            <nav className="gu-catena" aria-label="Sezioni della guida">
              {SEZIONI.map((s) => (
                <a key={s.id} href={`#${s.id}`} className="gu-anello">
                  {s.label}
                </a>
              ))}
            </nav>
          </div>
        </section>

        <section className="section" id="studente">
          <div className="container mx-auto px-6">
            <div style={{ maxWidth: 800, marginBottom: 30 }}>
              <span className="gu-kicker">Se sei uno studente universitario</span>
              <h2 className="text-2xl font-bold text-gray-800 mt-2 mb-3">
                Dalla candidatura alla consegna
              </h2>
              <p className="text-gray-700" style={{ lineHeight: 1.75 }}>
                Ti candidi da solo. La squadra viene dopo, e se non conosci nessuno non sei un caso
                difficile: sei il caso normale, ed è per questo che esiste la bacheca.
              </p>
            </div>
            <Passi passi={STUDENTE} />
          </div>
        </section>

        <section className="section bg-light-gray" id="mentor">
          <div className="container mx-auto px-6">
            <div style={{ maxWidth: 800, marginBottom: 30 }}>
              <span className="gu-kicker">Se è un mentor</span>
              <h2 className="text-2xl font-bold text-gray-800 mt-2 mb-3">
                Affiancare un team
              </h2>
              <p className="text-gray-700" style={{ lineHeight: 1.75 }}>
                L&apos;art. 3 del bando prevede che le attività si svolgano con il supporto di
                ricercatori, docenti, esperti e professionisti. Questa è la parte che riguarda lei.
              </p>
            </div>
            <Passi passi={MENTOR} />
          </div>
        </section>

        <section className="section" id="commissario">
          <div className="container mx-auto px-6">
            <div style={{ maxWidth: 800, marginBottom: 30 }}>
              <span className="gu-kicker">Se è in Commissione</span>
              <h2 className="text-2xl font-bold text-gray-800 mt-2 mb-3">
                Valutare i progetti
              </h2>
              <p className="text-gray-700" style={{ lineHeight: 1.75 }}>
                La Commissione dell&apos;art. 8 non è lo staff: chi apre e chiude le fasi non
                assegna i punteggi, e chi assegna i punteggi non tocca la configurazione del
                percorso.
              </p>
            </div>
            <Passi passi={COMMISSARIO} />
          </div>
        </section>

        <section className="section bg-light-gray" id="guasti">
          <div className="container mx-auto px-6">
            <div style={{ maxWidth: 800, marginBottom: 30 }}>
              <span className="gu-kicker">Quando qualcosa non va</span>
              <h2 className="text-2xl font-bold text-gray-800 mt-2 mb-3">
                Le cose che succedono davvero
              </h2>
              <p className="text-gray-700" style={{ lineHeight: 1.75 }}>
                Quasi sempre non c&apos;è niente da riparare, e sapere quale delle due cose sta
                succedendo fa risparmiare una email.
              </p>
            </div>
            <dl style={{ maxWidth: 800 }}>
              {GUASTI.map((g) => (
                <div key={g.d} className="gu-guasto">
                  <dt>{g.d}</dt>
                  <dd>{g.r}</dd>
                </div>
              ))}
            </dl>
            <p className="gu-nota" style={{ maxWidth: 800, marginTop: 8 }}>
              Per qualsiasi altra cosa:{" "}
              <a
                href={`mailto:${CONTATTI_UNIVERSITA.fondazione.email}`}
                style={{ color: "var(--primary-dark)", fontWeight: 600 }}
              >
                {CONTATTI_UNIVERSITA.fondazione.email}
              </a>
              . Il bando completo, con gli articoli per esteso, resta{" "}
              <Link href={UNIVERSITA_PATH} style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
                a questa pagina
              </Link>
              .
            </p>
          </div>
        </section>
      </div>

      <SiteFooter />
    </>
  );
}
