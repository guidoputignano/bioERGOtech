import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { GeneratoreCircolare } from "./GeneratoreCircolare";
import {
  CONTATTI_LICEI,
  GUIDA_PATH,
  ISCRIZIONE_PATH,
  LICEI,
  LICEI_PATH,
  REFERENTE_PATH,
  STUDENTE_PATH,
} from "../content";
import { UNIVERSITA_PATH } from "../../universita/content";

/**
 * La guida operativa del percorso: chi fa cosa, in che ordine, con che link.
 *
 * Sta sul sito e non altrove perche i docenti la devono ritrovare da soli, e
 * la cercano accanto al bando. E' statica di proposito: descrive il
 * procedimento, non lo stato delle fasi, quindi non ha ragione di interrogare
 * la configurazione a ogni richiesta come fanno le pagine sorelle.
 *
 * I tre percorsi stanno uno sotto l'altro invece che dentro delle schede,
 * cosi la pagina si stampa e si inoltra senza che sparisca meta contenuto, e
 * chi la apre da un link vede subito che esiste anche la parte degli altri.
 */

export const metadata: Metadata = {
  title: `Chi fa cosa nel percorso . ${LICEI.titolo} . Fondazione bioERGOtech`,
  description:
    "Che cosa deve fare il docente referente, lo studente delle superiori e lo studente universitario nel percorso su biotecnologie e intelligenza artificiale, con i link giusti e il testo della circolare già pronto.",
  alternates: { canonical: GUIDA_PATH },
};

const STILE = `
.gd-page {
  --primary-dark: #0A7A66;
  --primary-light: #E1F5EE;
  --text-light: #64748B;
}
.gd-page .section { padding: 64px 0; overflow: visible; }
.gd-page section[id] { scroll-margin-top: 96px; }
.gd-page .card {
  margin: 0; background: #fff; border: 1px solid var(--border-color);
}
.gd-page .card::before { display: none; }
.gd-page .card:hover { transform: none; box-shadow: none; }

.lc-kicker { font-size: 11.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--primary-dark); }
.lc-nota { font-size: 13.5px; color: var(--text-light); line-height: 1.7; }

.gd-hero {
  background: linear-gradient(135deg, #F7F9FC 0%, #E8F8F6 55%, #EEF3FF 100%);
  padding: 116px 0 52px;
}
.gd-catena { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 26px; }
.gd-anello {
  font-size: 12.5px; font-weight: 600; padding: 6px 12px; border-radius: 999px;
  background: #fff; border: 1px solid var(--border-color); color: var(--text-mid);
}
.gd-anello[data-noi="1"] { background: var(--primary-light); border-color: transparent; color: var(--primary-dark); }

/* ── Passi ── */
.gd-passi { list-style: none; margin: 28px 0 0; padding: 0; }
.gd-passo { display: grid; grid-template-columns: 32px 1fr; gap: 0 16px; }
.gd-rail { display: flex; flex-direction: column; align-items: center; }
.gd-num {
  width: 30px; height: 30px; flex: none; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--primary-light); color: var(--primary-dark);
  font-size: 13px; font-weight: 800;
}
.gd-filo { width: 2px; flex: 1; background: var(--border-color); margin: 6px 0; min-height: 10px; }
.gd-passo:last-child .gd-filo { display: none; }
.gd-corpo { padding-bottom: 26px; display: flex; flex-direction: column; gap: 10px; max-width: 720px; }
.gd-passo:last-child .gd-corpo { padding-bottom: 0; }
.gd-corpo h3 { font-size: 16.5px; font-weight: 700; color: var(--text-dark); margin: 2px 0 0; }
.gd-corpo p { font-size: 15.5px; line-height: 1.75; color: var(--text-mid); margin: 0; }

/* ── Link, esiti, avvisi ── */
.gd-link {
  display: inline-flex; align-items: center; gap: 9px; align-self: flex-start;
  font-size: 13px; font-family: monospace; word-break: break-all;
  padding: 9px 13px; border-radius: 9px; text-decoration: none;
  background: #F8FAFB; border: 1px solid var(--border-color); color: var(--primary-dark);
  font-weight: 600;
}
.gd-link:hover { border-color: #7FD8CC; }
.gd-link b { font-family: inherit; font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--text-light); flex: none; }
.gd-poi {
  font-size: 14px; line-height: 1.7; color: var(--text-mid);
  padding-left: 13px; border-left: 2px solid #2EC4B6;
}
.gd-poi b { display: block; font-size: 12.5px; letter-spacing: .04em; color: var(--primary-dark); }
.gd-avviso { font-size: 14px; line-height: 1.7; padding: 13px 15px; border-radius: 9px; background: #FBF1DC; color: #8A6100; }
.gd-avviso[data-grave="1"] { background: #FBE7EA; color: #A8394E; }

/* ── Guasti ── */
.gd-guasto { padding: 15px 0; border-top: 1px solid var(--border-color); }
.gd-guasto dt { font-size: 15px; font-weight: 700; color: var(--text-dark); margin-bottom: 4px; }
.gd-guasto dd { margin: 0; font-size: 15px; line-height: 1.75; color: var(--text-mid); max-width: 760px; }

@media (max-width: 460px) {
  .gd-passo { grid-template-columns: 26px 1fr; gap: 0 12px; }
  .gd-num { width: 26px; height: 26px; font-size: 12px; }
}
`;

type Passo = {
  titolo: string;
  testo: string;
  link?: { etichetta: string; href: string; mostra: string };
  poi?: { titolo: string; testo: string };
  avvisi?: { grave?: boolean; forte: string; testo: string }[];
};

const DOCENTE: Passo[] = [
  {
    titolo: "Aderisca a nome dell'istituto",
    testo:
      "Le servono la denominazione completa, il codice meccanografico e i suoi recapiti. Le chiediamo anche quanti studenti prevede di coinvolgere per anno di corso: è una stima, serve a dimensionare il percorso e nessuno gliela conterà.",
    link: { etichetta: "Vai", href: LICEI_PATH, mostra: "bioergotech.org" + LICEI_PATH },
    poi: {
      titolo: "Cosa succede dopo",
      testo:
        "Riceve subito una email con il link per impostare la sua password. La apra: le servirà al passo 3.",
    },
  },
  {
    titolo: "Aspetti la nostra conferma",
    testo:
      "Verifichiamo a mano ogni adesione. Il modulo è pubblico e il codice meccanografico di una scuola si trova online: il controllo serve a impedire che qualcuno aderisca al posto vostro.",
    avvisi: [
      {
        forte: "Non diffonda ancora il codice.",
        testo:
          "Finché non confermiamo, gli studenti che provano a iscriversi vengono respinti, e lei si ritrova a rispiegare tutto.",
      },
    ],
    poi: {
      titolo: "Cosa succede dopo",
      testo:
        'Le arriva una seconda email, "Adesione confermata", con il codice del suo istituto e un link di iscrizione già pronto.',
    },
  },
  {
    titolo: "Metta in circolare il link, non il codice",
    testo:
      "Nell'email di conferma trova un indirizzo che contiene già il codice della sua scuola. Chi lo apre trova il campo compilato e deve solo mettere nome, cognome, email, classe e anno. Se invece diffonde il codice da solo, i ragazzi devono digitarlo, e qualcuno lo sbaglia.",
    poi: {
      titolo: "Se non trova l'email",
      testo: "Il testo pronto da incollare lo genera qui sotto, con il suo codice.",
    },
  },
  {
    titolo: "Riconosca i suoi studenti",
    testo:
      "Nella sua area riservata compaiono le iscrizioni arrivate. Su ciascuna sceglie È mio studente oppure Non lo riconosco. L'elenco che conferma è esattamente quello che l'art. 4 del bando chiede all'istituto di trasmettere.",
    link: {
      etichetta: "Area riservata",
      href: REFERENTE_PATH,
      mostra: "bioergotech.org" + REFERENTE_PATH,
    },
    poi: {
      titolo: "Perché tocca a lei",
      testo:
        "Il codice gira per tutta la scuola e prima o poi esce. Lei è l'unica che sa se quel ragazzo è davvero suo.",
    },
  },
  {
    titolo: "Tenga d'occhio due numeri",
    testo:
      "Nella stessa pagina, accanto a ogni studente, vede a che punto è del corso. In cima ci sono due contatori che indicano due problemi diversi.",
    avvisi: [
      {
        grave: true,
        forte: "Mai entrati nel corso.",
        testo:
          "Hanno un account ma non hanno mai impostato la password, quindi non possono aprire una lezione. Il bottone accanto al nome rimanda loro il link.",
      },
      {
        forte: "Entrati ma fermi a zero lezioni.",
        testo:
          "La password ce l'hanno, il corso non l'hanno iniziato. Qui non serve un link, serve una parola in classe.",
      },
    ],
  },
  {
    titolo: "Le resta un controllo, verso la fine",
    testo:
      "Quando apriamo la fase delle squadre, dalla sua pagina vede quali si sono formate e chi è rimasto fuori. Uno studente confermato senza squadra non può consegnare, e lei è l'unica che può accorgersene in tempo e andarlo a cercare in corridoio.",
  },
];

const STUDENTE: Passo[] = [
  {
    titolo: "Iscriviti con il link del tuo professore",
    testo:
      "Ti servono nome, cognome, email, classe e anno di corso. Nient'altro: niente data di nascita, niente codice fiscale, niente contatti dei tuoi genitori.",
    link: {
      etichetta: "Iscrizione",
      href: ISCRIZIONE_PATH,
      mostra: "bioergotech.org" + ISCRIZIONE_PATH,
    },
    poi: {
      titolo: "Usa l'email che leggi davvero",
      testo: "Tutto il resto passa da lì, e se sbagli indirizzo non te ne accorgi subito.",
    },
  },
  {
    titolo: "Apri subito il link della password",
    testo:
      "Appena ti iscrivi ti creiamo un account e ti mandiamo un link per impostare la password. Le lezioni sono dietro accesso: senza password non entri.",
    avvisi: [
      {
        grave: true,
        forte: "È qui che si perde più gente.",
        testo:
          "Chi rimanda risulta iscritto ovunque e non apre una lezione. Se il messaggio non arriva, guarda nello spam e poi chiedi al tuo professore di rimandartelo: gli basta un clic.",
      },
    ],
  },
  {
    titolo: "Aspetta che il professore ti riconosca",
    testo:
      "Serve perché il codice della scuola gira fra tutti, e l'elenco che l'istituto ci trasmette deve essere vero. Finché non ti conferma, la tua area resta chiusa.",
    poi: {
      titolo: "Cosa succede dopo",
      testo:
        "Ricevi una email di iscrizione confermata, e da quel momento il corso è aperto.",
    },
  },
  {
    titolo: "Segui il corso, una lezione alla volta",
    testo:
      "Online e fuori dall'orario scolastico. Ogni lezione si chiude con una riflessione da consegnare, ed è la consegna che sblocca quella dopo. È anche quello che fa avanzare la barra che il tuo professore vede.",
    link: {
      etichetta: "Il corso",
      href: "/courses/agentic-ai",
      mostra: "bioergotech.org/courses/agentic-ai",
    },
  },
  {
    titolo: "Fai squadra e consegnate il progetto",
    testo:
      "Da 2 a 5 persone, tutte della tua scuola. Chi crea la squadra riceve un codice SQ da passare ai compagni. Il progetto lo scrivete insieme, lo consegna il capitano.",
    link: { etichetta: "La tua area", href: STUDENTE_PATH, mostra: "bioergotech.org" + STUDENTE_PATH },
    avvisi: [
      {
        grave: true,
        forte: "La consegna è definitiva.",
        testo: "Dopo, il progetto non si modifica più e dalla squadra non si esce. Rileggete prima.",
      },
    ],
    poi: {
      titolo: "E poi",
      testo: `I ${LICEI.progettiSulPalco} progetti migliori salgono sul palco del ${LICEI.luogo}. Se siete fra quelli, vi iscriviamo noi all'evento.`,
    },
  },
];

const UNIVERSITARIO: Passo[] = [
  {
    titolo: "Candidati",
    testo:
      "Nome, cognome, email, università, corso di studi, livello e le aree che ti interessano. Una riga sui tuoi interessi basta: serve a farci un'idea, non è una proposta di progetto. Non ti chiediamo il CV, né competenze, né compagni di team, e non devi caricare niente.",
    link: {
      etichetta: "Candidatura",
      href: UNIVERSITA_PATH,
      mostra: "bioergotech.org" + UNIVERSITA_PATH,
    },
  },
  {
    titolo: "Ricevi il codice e ti fermi qui",
    testo:
      "Ti arriva una email con il codice della tua candidatura. Non c'è un'area riservata da controllare né una conferma da aspettare: i team si formano dopo, e per quello ti scriviamo noi.",
  },
];

const GUASTI = [
  {
    d: "Uno studente dice che non riesce a entrare nelle lezioni",
    r: "Non ha mai impostato la password. Il docente referente lo vede segnalato nella sua area e gli rimanda il link con un clic.",
  },
  {
    d: "Uno studente si è iscritto ma il professore non lo vede",
    r: "Ha usato il codice di un'altra scuola, oppure si è iscritto mentre era già collegato con un altro account. Ce lo segnali e lo sistemiamo.",
  },
  {
    d: "Il codice viene rifiutato",
    r: "O l'adesione dell'istituto non è ancora confermata, o le iscrizioni non sono ancora aperte. In entrambi i casi non c'è niente da correggere: bisogna aspettare.",
  },
  {
    d: "Il docente non trova l'area riservata",
    r: "Deve entrare con lo stesso indirizzo email usato nel modulo di adesione. L'area è legata a quell'account, non alla scuola.",
  },
  {
    d: "La squadra non riesce a consegnare",
    r: "Serve almeno un secondo componente: il bando chiede un lavoro in team, e una persona sola non lo è.",
  },
  {
    d: "Non arriva nessuna email",
    r: `Prima lo spam. Se non c'è nemmeno lì, scriva a ${CONTATTI_LICEI.fondazione.email} indicando il codice meccanografico dell'istituto.`,
  },
];

function Passi({ passi }: { passi: Passo[] }) {
  return (
    <ol className="gd-passi">
      {passi.map((p, i) => (
        <li key={p.titolo} className="gd-passo">
          <div className="gd-rail">
            <span className="gd-num">{i + 1}</span>
            <span className="gd-filo" />
          </div>
          <div className="gd-corpo">
            <h3>{p.titolo}</h3>
            <p>{p.testo}</p>
            {p.link && (
              <Link className="gd-link" href={p.link.href}>
                <b>{p.link.etichetta}</b>
                {p.link.mostra}
              </Link>
            )}
            {p.avvisi?.map((a) => (
              <div key={a.forte} className="gd-avviso" data-grave={a.grave ? "1" : undefined}>
                <strong>{a.forte}</strong> {a.testo}
              </div>
            ))}
            {p.poi && (
              <div className="gd-poi">
                <b>{p.poi.titolo}</b>
                {p.poi.testo}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Testata({
  numero,
  titolo,
  sommario,
}: {
  numero: string;
  titolo: string;
  sommario: string;
}) {
  return (
    <div style={{ maxWidth: 760, marginBottom: 8 }}>
      <div className="lc-kicker" style={{ marginBottom: 10 }}>
        {numero}
      </div>
      <h2 className="text-2xl md:text-3xl font-bold text-gray-800" style={{ margin: "0 0 10px" }}>
        {titolo}
      </h2>
      <p style={{ fontSize: 16, lineHeight: 1.75, color: "var(--text-mid)", margin: 0 }}>
        {sommario}
      </p>
    </div>
  );
}

export default function GuidaPage() {
  const catena = [
    { t: "L'istituto aderisce", noi: false },
    { t: "Noi confermiamo", noi: true },
    { t: "Gli studenti si iscrivono", noi: false },
    { t: "Il docente li riconosce", noi: false },
    { t: "Corso online", noi: false },
    { t: "Squadre", noi: false },
    { t: "Progetto", noi: false },
    { t: `I ${LICEI.progettiSulPalco} migliori sul palco`, noi: true },
  ];

  return (
    <>
      <style>{STILE}</style>
      <Navbar />

      <div className="gd-page">
        <header className="gd-hero">
          <div className="container mx-auto px-6">
            <div style={{ maxWidth: 800 }}>
              <div className="lc-kicker" style={{ marginBottom: 14 }}>
                {LICEI.occhiello}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4 text-gray-800">
                Chi fa cosa nel percorso
              </h1>
              <p style={{ fontSize: 18, lineHeight: 1.7, color: "var(--text-mid)", margin: 0 }}>
                {LICEI.titolo}, il percorso gratuito per il triennio degli istituti superiori di
                Taranto e provincia. Qui c&apos;è, per ciascuno, che cosa fare e su quale link
                cliccare.
              </p>
              <ul className="gd-catena">
                {catena.map((c) => (
                  <li key={c.t} className="gd-anello" data-noi={c.noi ? "1" : undefined}>
                    {c.t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </header>

        <section id="docente" className="section">
          <div className="container mx-auto px-6">
            <Testata
              numero="Percorso 1"
              titolo="Il docente referente"
              sommario="È la persona che l'istituto individua. Aderisce a nome della scuola, diffonde il codice e riconosce i propri studenti. Senza di lei il percorso non parte."
            />
            <Passi passi={DOCENTE} />
            <div style={{ maxWidth: 760, marginTop: 32 }}>
              <GeneratoreCircolare />
            </div>
          </div>
        </section>

        <section id="studente" className="section" style={{ background: "#F8FAFB" }}>
          <div className="container mx-auto px-6">
            <Testata
              numero="Percorso 2"
              titolo="Lo studente delle superiori"
              sommario="Non ti candidi a un bando: ti iscrivi a un corso a cui la tua scuola ha già aderito. Per questo ti serve il codice del tuo istituto, e per questo il tuo professore ti deve riconoscere."
            />
            <Passi passi={STUDENTE} />
          </div>
        </section>

        <section id="universita" className="section">
          <div className="container mx-auto px-6">
            <Testata
              numero="Percorso 3"
              titolo="Lo studente universitario"
              sommario="Qui non c'è nessuna scuola di mezzo, nessun codice e nessuno che ti debba riconoscere. Ti candidi da solo, e finisce lì: due passi invece di cinque."
            />
            <Passi passi={UNIVERSITARIO} />
          </div>
        </section>

        <section id="guasti" className="section" style={{ background: "#F8FAFB" }}>
          <div className="container mx-auto px-6">
            <Testata
              numero="Rimedi"
              titolo="Se qualcosa non va"
              sommario="I modi di incepparsi sono pochi, e sono quasi sempre questi."
            />
            <dl style={{ maxWidth: 800, marginTop: 22 }}>
              {GUASTI.map((g) => (
                <div key={g.d} className="gd-guasto">
                  <dt>{g.d}</dt>
                  <dd>{g.r}</dd>
                </div>
              ))}
            </dl>
            <p className="lc-nota" style={{ maxWidth: 800, marginTop: 26 }}>
              Per qualunque dubbio scriva a{" "}
              <a href={`mailto:${CONTATTI_LICEI.fondazione.email}`} style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
                {CONTATTI_LICEI.fondazione.email}
              </a>
              . I dati che raccogliamo e per quanto li conserviamo sono descritti
              nell&apos;
              <Link href="/legal/informativa-privacy" style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
                informativa sulla privacy
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
