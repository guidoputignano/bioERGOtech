import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { RegistrationForm } from "./RegistrationForm";
import { EventoIscrivitiFisso } from "./EventoIscrivitiFisso";
import {
  EVENT,
  EVENT_SLUG,
  SITE_URL,
  SESSIONS,
  ARCHIVE_MODE,
  PROGRAMMA_GIORNO1,
  ETICHETTA_VOCE,
  nomiVoce,
  relatoriVoce,
  RELATORI_PUBBLICI,
  partnerVoce,
  MODERATRICE,
  STATS,
  PERCHE_PARTECIPARE,
  FAQ,
  elencoGiornate,
  sessionBySlug,
  type EventSession,
  type ProgrammaVoce,
  type Relatore,
} from "./content";
// Niente `statoCandidature()` qui: dipende dall'ora e congelerebbe questa
// pagina statica allo stato del giorno della build. Per la stessa ragione la
// scheda del bando non cita scadenze e invita solo a leggerlo.
import { BANDO_PATH } from "./bando/content";
import { LICEI_PATH } from "./licei/content";
import { UNIVERSITA_PATH } from "./universita/content";

/* ── Dati della pagina ──────────────────────────────────────────────────── */

/**
 * Le due giornate. Se una manca in SESSIONS la build si ferma con un messaggio
 * chiaro: una pagina senza una delle date sarebbe peggio di nessuna pagina.
 */
function giornata(slug: string): EventSession {
  const s = sessionBySlug(slug);
  if (!s) throw new Error(`Pagina evento: la giornata "${slug}" non è in SESSIONS (content.ts).`);
  return s;
}
const G10 = giornata("giorno-1");
const G11 = giornata("giorno-2");

const NOME_BREVE = EVENT.titolo.split(":")[0]; // "Vivere più a lungo"
const DATE_EVENTO = elencoGiornate(SESSIONS.map((s) => s.slug)); // "10 e 11 dicembre"
// Il layout aggiunge già "| bioERGOtech Foundation": qui niente marchio.
const TITOLO_PAGINA = `${NOME_BREVE}, ${DATE_EVENTO} a ${EVENT.citta}`;
const URL_PAGINA = `${SITE_URL}/eventi/${EVENT_SLUG}`;
const HERO_IMG = "/assets/images/eventi/vivere-piu-a-lungo/hero.webp";

/** "10 dicembre" -> "10" e "dic", per il foglietto di calendario dell'hero. */
const giornoNumero = (s: EventSession) => s.etichetta.split(" ")[0];
const meseBreve = (s: EventSession) => (s.etichetta.split(" ")[1] ?? "").slice(0, 3);
const maiuscola = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export const metadata: Metadata = {
  title: TITOLO_PAGINA,
  description: EVENT.metaDescrizione,
  alternates: { canonical: `/eventi/${EVENT_SLUG}` },
  openGraph: {
    title: TITOLO_PAGINA,
    description: EVENT.metaDescrizione,
    url: URL_PAGINA,
    siteName: "Fondazione bioERGOtech",
    locale: "it_IT",
    type: "website",
    images: [
      {
        url: EVENT.ogImage,
        width: EVENT.ogImageLarghezza,
        height: EVENT.ogImageAltezza,
        alt: EVENT.ogImageAlt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITOLO_PAGINA,
    description: EVENT.metaDescrizione,
    images: [EVENT.ogImage],
  },
};

/**
 * "Sul palco": i volti in cima alla pagina. Prima i nomi più noti, poi la
 * moderatrice, poi tutti gli altri nell'ordine del registro. Costruita su
 * RELATORI_PUBBLICI, quindi chi è nascosto o in attesa di autorizzazione non
 * compare. Ogni volto porta al panel in cui interviene.
 */
const IN_PRIMO_PIANO = ["vezzali", "montano", "bortuzzo", "abbagnale", "montervino"];

const PANEL_DEL_RELATORE = new Map<string, number>();
for (const v of PROGRAMMA_GIORNO1) {
  if (v.tipo !== "panel" || !v.n) continue;
  for (const id of v.relatori ?? []) if (!PANEL_DEL_RELATORE.has(id)) PANEL_DEL_RELATORE.set(id, v.n);
}

type Volto = { chiave: string; nome: string; ruolo: string; img: string; href: string };

const volto = (r: Relatore): Volto => {
  const n = PANEL_DEL_RELATORE.get(r.id);
  return { chiave: r.id, nome: r.nome, ruolo: r.ruolo, img: r.img, href: n ? `#panel-${n}` : "#programma" };
};

const SUL_PALCO: Volto[] = [
  ...IN_PRIMO_PIANO.map((id) => RELATORI_PUBBLICI.find((r) => r.id === id))
    .filter((r): r is Relatore => Boolean(r))
    .map(volto),
  { chiave: "moderatrice", nome: MODERATRICE.nome, ruolo: MODERATRICE.ruolo, img: MODERATRICE.img, href: "#moderatrice" },
  ...RELATORI_PUBBLICI.filter((r) => !IN_PRIMO_PIANO.includes(r.id)).map(volto),
];

/** I percorsi dedicati, in fondo alla pagina. Etichette neutre: nessuna scadenza. */
const ALTRI_MODI = [
  {
    icona: "fa-school",
    etichetta: "Scuole superiori",
    titolo: "I dieci progetti in gara",
    testo: `Un percorso formativo gratuito su biotecnologie e intelligenza artificiale per il triennio degli istituti superiori di Taranto e provincia. Dieci gruppi presentano il loro progetto sul palco del ${G10.etichetta}.`,
    cta: "Scopri il percorso",
    contesto: "per le scuole superiori",
    href: LICEI_PATH,
  },
  {
    icona: "fa-flask",
    etichetta: "Studenti universitari",
    titolo: "Un progetto di ricerca con i mentor",
    testo: "Un percorso gratuito per costruire, con ricercatori e mentor, una proposta scientifica originale tra biotecnologie e intelligenza artificiale. Ci si candida individualmente.",
    cta: "Scopri il bando",
    contesto: "per gli studenti universitari",
    href: UNIVERSITA_PATH,
  },
  {
    icona: "fa-rocket",
    etichetta: "Startup e spin-off",
    titolo: `Lo Showcase dell'${G11.etichetta}`,
    testo: "Una selezione pubblica per presentare il proprio progetto a investitori, partner e istituzioni: tre categorie, un premio per ciascuna, fino a 15 progetti sul palco.",
    cta: "Leggi il bando",
    contesto: "dello Showcase",
    href: BANDO_PATH,
  },
];

/** I tre momenti dell'11 dicembre. */
const MOMENTI_11 = [
  { icona: "fa-lightbulb", t: "Showcase di innovazione", d: "Startup, spin-off universitari, centri di ricerca e progetti del territorio in vetrina." },
  { icona: "fa-trophy", t: "Premiazione", d: "Tre premi assegnati da una commissione dedicata." },
  { icona: "fa-music", t: "Concerto", d: "Musica dal vivo per chiudere le due giornate." },
];

// Tinta morbida coerente con la homepage, più un verde acqua scuro per i link
// di testo: il #2EC4B6 su fondo chiaro non arriva al contrasto minimo.
const SOFT_BRAND: CSSProperties = { "--primary-light": "#E1F5EE", "--ev-link": "#0F766E" } as CSSProperties;

// Team organizzativo dell'evento.
type Organizzatore = {
  name: string;
  role: string;
  desc: string;
  img: string;
  imgPosition?: string;
  /**
   * La foto non è ancora in repository. La scheda resta qui, completa, ma non
   * compare nella griglia, così non pubblichiamo un'immagine rotta. Quando il
   * file arriva basta togliere questa riga.
   */
  daCaricare?: boolean;
};
const TEAM_ORGANIZZATIVO: Organizzatore[] = [
  {
    name: "Roberto Russo",
    role: "Studente Ambasciatore",
    desc: "Studente delle scuole superiori, segue l'organizzazione dell'evento nel team operativo.",
    img: "/assets/images/About-us/Roberto-Russo.jpeg",
  },
  {
    name: "Mimma Leone",
    role: "Membro del Consiglio",
    desc: "Esperta legale e imprenditrice, promuove progetti educativi e universitari.",
    img: "/assets/images/About-us/Mimma-Leone.webp",
  },
  {
    name: "Alessia Soru",
    role: "Responsabile Progetti Scientifici",
    desc: "Dottoranda in Oncologia, Ematologia e Patologia all'Università di Bologna, membro del consiglio di Women&Tech® ETS.",
    img: "/assets/images/About-us/Alessia-Soru.webp",
  },
  {
    name: "Saria Miccoli",
    role: "Responsabile Comunicazione",
    desc: "Designer, cura l'identità visiva e la comunicazione della Fondazione.",
    img: "/assets/images/About-us/Saria-Miccoli.webp",
  },
  {
    name: "Paola Cocozza",
    role: "Project Manager",
    desc: "Project manager per società sportive ed enti di formazione, segue progetti sociali nello sport su inclusione e parità di genere.",
    img: "/assets/images/About-us/Paola Cocozza.jpg",
    imgPosition: "center 15%",
  },
  {
    name: "Gianni Tartaglia",
    role: "Consigliere Comunale di Taranto",
    desc: "Consigliere comunale, si occupa di educazione, cultura, sport e inclusione per una Taranto più equa.",
    img: "/assets/images/About-us/Gianni Tartaglia.png",
    imgPosition: "center 15%",
  },
  {
    name: "Adriana Chirico",
    role: "Giurista",
    desc: "Docente presso il Dipartimento Jonico dell'Università degli Studi di Bari Aldo Moro.",
    img: "/assets/images/About-us/Adriana-Chirico.webp",
  },
  {
    name: "Giulia Chironi",
    role: "Avvocata",
    desc: "Avvocata del foro di Taranto e dottoressa di ricerca in diritto tributario. Si occupa di fiscalità ambientale e di tassazione degli alimenti salutistici.",
    img: "/assets/images/About-us/Giulia-Chironi.webp",
  },
];

/** Le schede del team che hanno già la foto, le uniche che la pagina pubblica. */
const TEAM_PUBBLICO = TEAM_ORGANIZZATIVO.filter((p) => !p.daCaricare);

/* ── Stile della pagina ─────────────────────────────────────────────────── */

/**
 * Le regole che le utility di Tailwind renderebbero illeggibili nel markup:
 * hero, linea del tempo, striscia dei volti. Tutto con il prefisso `ev-`, e
 * scritto mobile first: le media query allargano, non restringono.
 */
const CSS = `
.event-page .section-title { padding-bottom: 22px; margin-bottom: 1.5rem; }
.event-page .section-title::after { width: 72px; height: 4px; }
@media (max-width: 480px) { .event-page .section-title { font-size: 1.5rem; } }
@media (min-width: 768px) { .event-page .section-title { padding-bottom: 26px; margin-bottom: 2rem; } }

.event-page a:focus-visible, .event-page summary:focus-visible { outline: 3px solid var(--primary); outline-offset: 3px; }
.ev-link { color: var(--ev-link); font-weight: 600; text-decoration: underline; text-decoration-color: rgba(15,118,110,0.35); text-decoration-thickness: 1.5px; text-underline-offset: 3px; }
.ev-link:hover { text-decoration-color: currentColor; }
.ev-ancora { scroll-margin-top: 86px; }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
/* Sotto i 1024px c'è la barra fissa in basso: chi naviga da tastiera non deve finirci sotto. */
@media (max-width: 1023px) { html { scroll-padding-bottom: 88px; } }

/* Hero */
.ev-hero-img { position: relative; height: 300px; }
@media (min-width: 640px) { .ev-hero-img { height: 380px; } }
@media (min-width: 1024px) { .ev-hero-img { height: min(56vh, 620px); min-height: 420px; } }
.ev-hero-testo { padding-bottom: 20px; }
@media (min-width: 768px) { .ev-hero-testo { padding-bottom: 36px; } }
.ev-occhiello-hero { font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #7FE3D8; margin: 0 0 10px; text-shadow: 0 1px 10px rgba(0,0,0,0.55); }
@media (min-width: 768px) { .ev-occhiello-hero { font-size: 12px; margin-bottom: 14px; } }
.ev-h1 { font-size: 1.75rem; line-height: 1.15; font-weight: 700; color: #fff; margin: 0 0 10px; max-width: min(100%, 680px); text-shadow: 0 2px 18px rgba(0,0,0,0.55); }
@media (min-width: 640px) { .ev-h1 { font-size: 2.25rem; } }
@media (min-width: 768px) { .ev-h1 { font-size: 3rem; margin-bottom: 12px; } }
.ev-sottotitolo { font-size: 15px; line-height: 1.45; color: rgba(255,255,255,0.92); max-width: min(100%, 620px); margin: 0; text-shadow: 0 1px 12px rgba(0,0,0,0.55); }
@media (min-width: 640px) { .ev-sottotitolo { font-size: 1.125rem; } }
@media (min-width: 768px) { .ev-sottotitolo { font-size: 1.25rem; } }
.ev-hero-info { display: flex; flex-direction: column; gap: 18px; padding: 20px 0 32px; }
@media (min-width: 640px) { .ev-hero-info { padding: 28px 0 44px; } }
@media (min-width: 1024px) { .ev-hero-info { flex-direction: row; align-items: center; justify-content: space-between; gap: 40px; padding: 32px 0 56px; } }
.ev-gratis { display: inline-flex; align-items: center; gap: 8px; margin: 0 0 14px; padding: 6px 12px; border-radius: 999px; background: #fff; border: 1px solid rgba(46,196,182,0.45); box-shadow: 0 1px 2px rgba(16,24,40,0.05); font-size: 12.5px; font-weight: 600; line-height: 1.3; color: var(--text-dark); }
.ev-gratis i { color: var(--primary); }
.ev-giornate { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
@media (min-width: 640px) { .ev-giornate { grid-template-columns: repeat(2, max-content); column-gap: 36px; } }
.ev-giornata-riga { display: flex; align-items: center; gap: 12px; }
.ev-data { flex-shrink: 0; width: 46px; overflow: hidden; border-radius: 10px; background: #fff; border: 1px solid var(--border-color); box-shadow: 0 2px 8px rgba(16,24,40,0.06); text-align: center; line-height: 1; }
.ev-data-mese { display: block; padding: 3px 0 2px; background: var(--primary-dark); color: #fff; font-size: 9.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
.ev-data-giorno { display: block; padding: 5px 0 6px; font-size: 18px; font-weight: 700; color: var(--text-dark); }
.ev-giornata-testo { min-width: 0; margin: 0; font-size: 14px; line-height: 1.45; color: var(--text-mid); }
.ev-giornata-testo strong { display: block; font-size: 15px; font-weight: 600; color: var(--text-dark); }
/* Il link alla mappa resta sulla riga del testo, ma si tocca su 44px di altezza. */
.ev-mappa { display: inline-flex; align-items: center; gap: 5px; padding: 12px 4px; margin: -12px -4px; }
.ev-mappa i { font-size: 12px; color: var(--primary); }
.ev-cta-blocco { display: flex; flex-direction: column; align-items: stretch; gap: 2px; }
@media (min-width: 640px) { .ev-cta-blocco { align-items: flex-start; } }
@media (min-width: 1024px) { .ev-cta-blocco { align-items: flex-end; flex-shrink: 0; } }
/* main.css riporta .btn-primary a inline-block: senza flex e gap la freccia resta attaccata al testo. */
.event-page .ev-cta { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 50px; padding: 13px 32px; font-size: 1rem; }
@media (min-width: 640px) { .event-page .ev-cta { padding: 14px 40px; } }
.ev-scorciatoie { display: flex; flex-wrap: wrap; justify-content: center; column-gap: 20px; margin: 0; }
@media (min-width: 640px) { .ev-scorciatoie { justify-content: flex-start; } }
@media (min-width: 1024px) { .ev-scorciatoie { justify-content: flex-end; } }
.ev-scorciatoie a { display: inline-flex; align-items: center; min-height: 44px; font-size: 14px; }

/* Numeri e volti */
.ev-numeri { padding: 32px 0 36px; }
@media (min-width: 768px) { .ev-numeri { padding: 48px 0 56px; } }
.ev-stats { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; justify-content: center; row-gap: 20px; }
.ev-stats > li { flex: 0 0 33.333%; padding: 0 4px; text-align: center; }
@media (min-width: 768px) { .ev-stats > li { flex: 1 1 0; } }
@media (max-width: 639px) { .ev-stats .stat-number { font-size: 2rem; } .ev-stats .stat-label { font-size: 0.78rem; } }
.ev-palco { margin-top: 28px; padding-top: 24px; border-top: 1px solid var(--border-color); }
@media (min-width: 768px) { .ev-palco { margin-top: 44px; padding-top: 36px; } }
.ev-palco-testa { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.ev-palco-testa h2 { margin: 0; font-size: 1.125rem; font-weight: 700; color: var(--text-dark); }
.ev-palco-testa a { font-size: 14px; white-space: nowrap; }
@media (min-width: 768px) { .ev-palco-testa { justify-content: center; gap: 24px; margin-bottom: 20px; } .ev-palco-testa h2 { font-size: 1.25rem; } }
/* position: relative tiene dentro la striscia anche gli sr-only (assoluti) dei
   volti fuori schermo: senza, allargavano la pagina sotto i 768px. */
.ev-palco-lista { position: relative; list-style: none; display: flex; gap: 12px; margin: 0 -24px; padding: 6px 24px 10px; overflow-x: auto; scroll-snap-type: x proximity; scroll-padding-inline: 24px; scrollbar-width: thin; }
.ev-palco-lista > li { flex: 0 0 68px; scroll-snap-align: start; }
@media (min-width: 768px) {
  .ev-palco-lista { flex-wrap: wrap; justify-content: center; overflow: visible; margin: 0; padding: 6px 0 0; gap: 18px 14px; }
  .ev-palco-lista > li { flex-basis: 92px; }
}
.ev-volto { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 2px 0; border-radius: 12px; text-align: center; }
.ev-volto-foto { position: relative; width: 56px; height: 56px; border-radius: 50%; box-shadow: 0 0 0 2px #fff, 0 0 0 4px var(--primary-light); transition: box-shadow .2s ease, transform .2s ease; }
@media (min-width: 768px) { .ev-volto-foto { width: 72px; height: 72px; } }
.ev-volto:hover .ev-volto-foto { box-shadow: 0 0 0 2px #fff, 0 0 0 4px var(--primary); transform: translateY(-2px); }
.ev-volto-nome { font-size: 11.5px; line-height: 1.3; font-weight: 600; color: var(--text-dark); }
@media (min-width: 768px) { .ev-volto-nome { font-size: 12.5px; } }
@media (prefers-reduced-motion: reduce) { .ev-volto-foto { transition: none; } .ev-volto:hover .ev-volto-foto { transform: none; } }

/* Iscrizione */
.ev-iscrizione { scroll-margin-top: 70px; padding: 24px 0 56px; }
@media (min-width: 768px) { .ev-iscrizione { padding: 56px 0 80px; } }
@media (min-width: 1024px) { .ev-iscrizione { padding: 72px 0 96px; } }
.ev-iscrizione-intro { max-width: 40rem; margin: -4px 0 20px; font-size: 1rem; line-height: 1.6; color: var(--text-mid); }
@media (min-width: 768px) { .ev-iscrizione-intro { margin-bottom: 28px; font-size: 1.0625rem; } }
.ev-iscrizione-griglia { display: grid; gap: 28px; align-items: start; }
/* Il .card globale si solleva al passaggio del mouse: un modulo non deve muoversi mentre si compila. */
.ev-iscrizione .card:hover { transform: none; }
@media (min-width: 1024px) {
  .ev-iscrizione-griglia { grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); gap: 48px; }
  .ev-come { position: sticky; top: 96px; }
}
.ev-come h3 { margin: 0 0 16px; font-size: 1.0625rem; font-weight: 700; color: var(--text-dark); }
.ev-passi { list-style: none; margin: 0; padding: 0; display: grid; gap: 16px; }
.ev-passo { display: flex; align-items: flex-start; gap: 14px; }
.ev-passo-num { flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--primary-light); color: var(--ev-link); font-size: 14px; font-weight: 700; }
.ev-passo h4 { margin: 4px 0 2px; font-size: 15px; font-weight: 600; color: var(--text-dark); }
.ev-passo p { margin: 0; font-size: 14px; line-height: 1.5; color: var(--text-mid); }
.ev-aiuto { margin: 20px 0 0; padding-top: 16px; border-top: 1px solid var(--border-color); font-size: 14px; line-height: 1.6; color: var(--text-mid); }

/* Giornate */
.ev-meta { list-style: none; margin: -4px 0 18px; padding: 0; display: flex; flex-wrap: wrap; gap: 8px 10px; }
.ev-chip { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 6px 16px; border-radius: 999px; background: #fff; border: 1px solid var(--border-color); font-size: 14px; font-weight: 500; color: var(--text-dark); }
.ev-chip i { color: var(--primary); }
a.ev-chip { color: var(--ev-link); font-weight: 600; transition: border-color .2s ease; }
a.ev-chip:hover { border-color: var(--primary); }
.ev-lead { max-width: 48rem; margin: 0 0 28px; font-size: 1rem; line-height: 1.65; color: #374151; }
@media (min-width: 768px) { .ev-lead { margin-bottom: 36px; font-size: 1.125rem; } }
.ev-moderatrice { display: flex; align-items: center; gap: 14px; max-width: 460px; margin-bottom: 28px; padding: 14px 18px; border-left: 4px solid var(--primary); }
.ev-sopratitolo { display: block; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #6B7280; }

/* Linea del tempo del 10 dicembre */
.ev-tl { list-style: none; margin: 0 0 2.5rem; padding: 0; max-width: 880px; }
.ev-tl-voce { position: relative; display: flex; gap: 12px; padding-bottom: 14px; }
.ev-tl-voce:last-child { padding-bottom: 0; }
.ev-tl-linea { position: absolute; left: 17px; top: 0; bottom: 0; width: 2px; background: var(--primary-light); }
.ev-tl-voce:first-child .ev-tl-linea { top: 18px; }
.ev-tl-voce:last-child .ev-tl-linea { bottom: auto; height: 18px; }
.ev-tl-nodo { position: relative; z-index: 1; flex-shrink: 0; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; }
.ev-tl-num { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--primary); color: #fff; font-size: 14px; font-weight: 800; box-shadow: 0 4px 12px rgba(46,196,182,0.35); }
.ev-tl-icona { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #fff; color: var(--primary); border: 2px solid var(--primary-light); font-size: 10px; }
.ev-tl-corpo { flex: 1; min-width: 0; }
.ev-tl-card { padding: 14px 16px 16px; }
.ev-tl-raccordo { padding: 6px 2px; }
.ev-tl-badge { background: var(--primary-light); color: var(--ev-link); font-size: 10px; padding: 3px 10px; }
.ev-tl-titolo { margin: 6px 0 0; font-size: 15px; font-weight: 600; line-height: 1.3; color: #1F2937; }
.ev-tl-raccordo .ev-tl-titolo { margin-top: 3px; }
.ev-desc { margin: 4px 0 0; font-size: 13px; line-height: 1.55; color: #4B5563; }
.ev-desc-ampia { display: none; }
.ev-dettagli > summary { list-style: none; display: inline-flex; align-items: center; gap: 6px; padding: 12px 0; margin: -6px 0 -10px; cursor: pointer; font-size: 13px; font-weight: 600; color: var(--ev-link); }
.ev-dettagli > summary::-webkit-details-marker { display: none; }
.ev-dettagli > summary i { font-size: 10px; transition: transform .2s ease; }
.ev-dettagli[open] > summary { margin-bottom: -6px; }
.ev-dettagli[open] > summary i { transform: rotate(180deg); }
@media (prefers-reduced-motion: reduce) { .ev-dettagli > summary i { transition: none; } }
@media (min-width: 1024px) { .ev-desc-ampia { display: block; } .ev-dettagli { display: none; } }
.ev-nomi { margin: 6px 0 0; font-size: 12px; font-weight: 500; color: var(--ev-link); }
.ev-relatori { list-style: none; margin: 14px 0 0; padding: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px 24px; }
.ev-relatore { display: flex; align-items: center; gap: 10px; }
.ev-relatore-foto { position: relative; flex-shrink: 0; width: 40px; height: 40px; }
.ev-relatore-nome { display: block; font-size: 13px; font-weight: 600; line-height: 1.25; color: #1F2937; }
.ev-relatore-ruolo { display: block; margin-top: 2px; font-size: 11.5px; line-height: 1.35; color: #4B5563; }
@media (min-width: 640px) {
  .ev-tl-voce { gap: 20px; padding-bottom: 22px; }
  .ev-tl-linea { left: 22px; }
  .ev-tl-voce:first-child .ev-tl-linea { top: 23px; }
  .ev-tl-voce:last-child .ev-tl-linea { height: 23px; }
  .ev-tl-nodo, .ev-tl-num { width: 46px; height: 46px; }
  .ev-tl-num { font-size: 16px; }
  .ev-tl-icona { width: 30px; height: 30px; font-size: 11px; }
  .ev-tl-card { padding: 16px 20px 18px; }
  .ev-relatori { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 24px; margin-top: 16px; }
  .ev-relatore { gap: 12px; }
  .ev-relatore-foto { width: 52px; height: 52px; }
}

/* 11 dicembre */
.ev-momenti { display: grid; gap: 12px; }
.ev-momento { display: flex; align-items: flex-start; gap: 14px; padding: 16px 18px; }
.ev-momento h3 { margin: 2px 0 2px; font-size: 1rem; font-weight: 600; color: #1F2937; }
@media (min-width: 640px) {
  .ev-momenti { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
  .ev-momento { display: block; padding: 24px; }
  .ev-momento h3 { margin-top: 16px; }
}

/* Altri modi di partecipare */
.ev-modi { display: grid; gap: 14px; }
@media (min-width: 768px) { .ev-modi { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; } }
.ev-modo { position: relative; display: flex; flex-direction: column; gap: 6px; padding: 18px 20px; }
.ev-modo:hover, .ev-modo:focus-within { border-color: var(--primary); box-shadow: var(--shadow); }
.ev-modo h3 { margin: 0; font-size: 1.0625rem; font-weight: 600; color: #1F2937; }
.ev-modo p { margin: 0; font-size: 14px; line-height: 1.55; color: #4B5563; }
.ev-modo-cta { align-self: flex-start; margin-top: auto; padding-top: 6px; display: inline-flex; align-items: center; gap: 6px; font-size: 14px; }
/* Tutta la scheda si clicca, ma per chi usa un lettore di schermo il link resta uno solo. */
.ev-modo-cta::after { content: ""; position: absolute; inset: 0; border-radius: 12px; }
`;

/* ── Pezzi della pagina ─────────────────────────────────────────────────── */

function EventJsonLd() {
  const luogo = (s: EventSession) => ({
    "@type": "Place",
    name: s.luogoBreve,
    hasMap: s.mappaUrl,
    address: {
      "@type": "PostalAddress",
      addressLocality: EVENT.citta,
      addressRegion: "Puglia",
      addressCountry: "IT",
    },
  });
  const immagine = [`${SITE_URL}${EVENT.ogImage}`];
  const organizzatore = { "@type": "Organization", name: EVENT.organizzatore, url: SITE_URL };
  const offerta = ARCHIVE_MODE
    ? undefined
    : {
        "@type": "Offer",
        price: "0",
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        url: `${URL_PAGINA}#iscrizione`,
      };
  const stato = {
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: EVENT.titolo,
    description: EVENT.metaDescrizione,
    url: URL_PAGINA,
    inLanguage: "it",
    startDate: EVENT.startDateISO,
    endDate: EVENT.endDateISO,
    ...stato,
    isAccessibleForFree: true,
    image: immagine,
    location: SESSIONS.map(luogo),
    organizer: organizzatore,
    performer: [...RELATORI_PUBBLICI.map((r) => r.nome), MODERATRICE.nome].map((name) => ({
      "@type": "Person",
      name,
    })),
    ...(offerta ? { offers: offerta } : {}),
    // Una giornata per sotto-evento, ciascuna con il suo luogo e il suo orario.
    subEvent: SESSIONS.map((s) => ({
      "@type": "Event",
      name: `${NOME_BREVE}, ${s.etichetta}: ${s.titolo}`,
      description: s.descrizione,
      url: URL_PAGINA,
      startDate: s.inizioISO,
      endDate: s.fineISO,
      ...stato,
      isAccessibleForFree: true,
      image: immagine,
      location: luogo(s),
      organizer: organizzatore,
      ...(offerta ? { offers: offerta } : {}),
    })),
  };
  return (
    <script
      type="application/ld+json"
      // "<" escapato: nessun testo dei contenuti può chiudere lo script.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
    />
  );
}

/** Una riga dell'hero: foglietto di calendario, giorno, orario e luogo con la mappa. */
function GiornataRiga({ s }: { s: EventSession }) {
  return (
    <li className="ev-giornata-riga">
      <span className="ev-data" aria-hidden="true">
        <span className="ev-data-mese">{meseBreve(s)}</span>
        <span className="ev-data-giorno">{giornoNumero(s)}</span>
      </span>
      <p className="ev-giornata-testo">
        <strong>{s.giornoLabel}</strong>
        {maiuscola(s.orario)},{" "}
        <a href={s.mappaUrl} target="_blank" rel="noopener noreferrer" className="ev-link ev-mappa">
          <i className="fas fa-location-dot" aria-hidden="true" />
          {s.luogoBreve}
          <span className="sr-only">, mappa in una nuova scheda</span>
        </a>
      </p>
    </li>
  );
}

/** Orario e luogo sotto il titolo di una giornata. */
function MetaGiornata({ s }: { s: EventSession }) {
  return (
    <ul className="ev-meta">
      <li>
        <span className="ev-chip">
          <i className="fas fa-clock" aria-hidden="true" />
          {maiuscola(s.orario)}
        </span>
      </li>
      <li>
        <a href={s.mappaUrl} target="_blank" rel="noopener noreferrer" className="ev-chip">
          <i className="fas fa-location-dot" aria-hidden="true" />
          {s.luogo}
          <i className="fas fa-arrow-up-right-from-square" aria-hidden="true" style={{ fontSize: 11 }} />
          <span className="sr-only">, mappa in una nuova scheda</span>
        </a>
      </li>
    </ul>
  );
}

/** Una voce della linea del tempo del 10 dicembre. */
function VoceProgramma({ v }: { v: ProgrammaVoce }) {
  const isPanel = v.tipo === "panel";
  const relatori = relatoriVoce(v);
  const partner = partnerVoce(v);
  const ospiti = v.ospiti ?? [];
  const nomi = nomiVoce(v);
  // Nei panel i protagonisti hanno un volto. Nelle voci di raccordo restano
  // una riga di nomi, per non appesantire, salvo chi porta un logo (la
  // squadra in chiusura).
  const conVolti = (isPanel || partner.length > 0) && relatori.length + partner.length + ospiti.length > 0;

  return (
    <li id={isPanel && v.n ? `panel-${v.n}` : undefined} className="ev-tl-voce ev-ancora">
      <span aria-hidden="true" className="ev-tl-linea" />
      {/* Nodo. I panel portano un disco pieno numerato, le voci di raccordo un
          pallino più piccolo, centrato nello stesso spazio per non spostare
          la linea verticale. */}
      <span aria-hidden="true" className="ev-tl-nodo">
        {isPanel ? (
          <span className="ev-tl-num">{v.n}</span>
        ) : (
          <span className="ev-tl-icona">
            <i className={`fas ${v.icona}`} />
          </span>
        )}
      </span>

      <div className={isPanel ? "card-sm ev-tl-corpo ev-tl-card" : "ev-tl-corpo ev-tl-raccordo"}>
        {isPanel ? (
          <span className="badge ev-tl-badge">Panel {v.n}</span>
        ) : (
          <span className="ev-sopratitolo">{ETICHETTA_VOCE[v.tipo]}</span>
        )}
        <h4 className="ev-tl-titolo">{v.titolo}</h4>

        {isPanel ? (
          <>
            {/* Da 1024px in su la descrizione si legge per intero; sotto si
                apre a richiesta, così il programma resta scorrevole sul
                telefono senza nascondere nessun relatore. */}
            <p className="ev-desc ev-desc-ampia">{v.desc}</p>
            <details className="ev-dettagli">
              <summary>
                Di che cosa si parla{" "}
                <i className="fas fa-chevron-down" aria-hidden="true" />
              </summary>
              <p className="ev-desc">{v.desc}</p>
            </details>
          </>
        ) : (
          <p className="ev-desc">{v.desc}</p>
        )}

        {conVolti ? (
          <ul className="ev-relatori">
            {relatori.map((r) => (
              <li key={r.id} className="ev-relatore">
                <span className="ev-relatore-foto">
                  <Image src={r.img} alt="" fill sizes="52px" className="rounded-full object-cover" />
                </span>
                <span>
                  <span className="ev-relatore-nome">{r.nome}</span>
                  <span className="ev-relatore-ruolo">{r.ruolo}</span>
                </span>
              </li>
            ))}
            {partner.map((p) => (
              <li key={p.id} className="ev-relatore">
                {/* Riquadro fisso e `object-contain`: i loghi hanno proporzioni
                    diverse fra loro e non vanno ritagliati in tondo. */}
                <span className="ev-relatore-foto">
                  <Image src={p.img} alt="" fill sizes="52px" className="object-contain" />
                </span>
                <span>
                  <span className="ev-relatore-nome">{p.nome}</span>
                  {p.ruolo && <span className="ev-relatore-ruolo">{p.ruolo}</span>}
                </span>
              </li>
            ))}
            {ospiti.map((o) => (
              <li key={o} className="ev-relatore">
                <span className="icon-circle icon-circle-primary ev-relatore-foto" aria-hidden="true" style={{ borderRadius: "50%" }}>
                  <i className="fas fa-users" />
                </span>
                <span className="ev-relatore-nome">{o}</span>
              </li>
            ))}
          </ul>
        ) : (
          nomi.length > 0 && <p className="ev-nomi">{nomi.join(", ")}</p>
        )}
      </div>
    </li>
  );
}

/* ── Pagina ─────────────────────────────────────────────────────────────── */

export default function EventPage() {
  return (
    <>
      <EventJsonLd />
      <style>{CSS}</style>
      <Navbar />

      <main id="contenuto" lang="it" style={SOFT_BRAND} className="event-page">
        {/* ── Hero ── */}
        {/* La `.hero` del design system è un blocco centrato alto 100vh. Qui
            serve un banner a tutta larghezza con il titolo sopra, quindi
            neutralizziamo flex, altezza minima e padding e teniamo solo il
            gradiente, che prosegue sotto il banner dietro date e pulsante. Il
            padding in alto è l'altezza esatta della navbar fissa, 70px. Sul
            telefono (375x667) la prima schermata dice che cosa, quando, dove,
            che è gratis, e offre un solo pulsante. */}
        <section
          className="hero"
          aria-labelledby="evento-titolo"
          style={{ display: "block", minHeight: 0, padding: "70px 0 0" }}
        >
          {/* L'immagine è un panorama 2.3:1, a tutta larghezza. */}
          <div className="ev-hero-img">
            <Image
              src={HERO_IMG}
              alt={EVENT.ogImageAlt}
              fill
              preload
              fetchPriority="high"
              sizes="100vw"
              className="object-cover"
              /* Ancorata in alto. Su schermi larghi `object-cover` scala sulla
                 larghezza e sborda in altezza: con un'ancora centrale il taglio
                 arrivava dall'alto e tagliava le teste. Da qui in giù si perde
                 semmai il lastricato in basso, che il velo scuro copre. */
              style={{ objectPosition: "center top" }}
            />
            {/* Due veli sovrapposti. Quello dal basso regge il contrasto del
                titolo; quello da sinistra scurisce la fascia dove cade il
                testo, che altrimenti finisce sulla parte chiara della scena.
                Insieme lasciano leggibile il cielo e il castello a destra. */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                background: [
                  "linear-gradient(to top, rgba(9,20,28,0.92) 0%, rgba(9,20,28,0.70) 30%, rgba(9,20,28,0.28) 58%, rgba(9,20,28,0) 92%)",
                  "linear-gradient(to right, rgba(9,20,28,0.66) 0%, rgba(9,20,28,0.30) 45%, rgba(9,20,28,0) 78%)",
                ].join(", "),
              }}
            />
            <div className="container mx-auto px-6 relative h-full flex flex-col justify-end ev-hero-testo">
              <p className="ev-occhiello-hero">{EVENT.occhiello}</p>
              <h1 id="evento-titolo" className="ev-h1">
                {EVENT.titolo}
              </h1>
              <p className="ev-sottotitolo">{EVENT.sottotitoloBreve}</p>
            </div>
          </div>

          <div className="container mx-auto px-6 relative z-10">
            <div className="ev-hero-info">
              <div className="min-w-0">
                {!ARCHIVE_MODE && (
                  <p className="ev-gratis">
                    <i className="fas fa-ticket" aria-hidden="true" />{" "}
                    Ingresso gratuito, iscrizione obbligatoria
                  </p>
                )}
                <ul className="ev-giornate" aria-label="Date e luoghi">
                  {SESSIONS.map((s) => (
                    <GiornataRiga key={s.slug} s={s} />
                  ))}
                </ul>
              </div>

              {!ARCHIVE_MODE && (
                <div className="ev-cta-blocco">
                  {/* L'id serve alla barra fissa del telefono: compare quando
                      questo pulsante esce dallo schermo. */}
                  <a id="evento-cta-hero" href="#iscrizione" className="btn-primary ev-cta">
                    Iscriviti gratis{" "}
                    <i className="fas fa-arrow-down" aria-hidden="true" />
                  </a>
                  <p className="ev-scorciatoie">
                    <Link href="?cat=studente#iscrizione" prefetch={false} className="ev-link">
                      Sei uno studente? Iscriviti qui
                    </Link>
                    <Link href="?cat=scuola_docente#iscrizione" prefetch={false} className="ev-link">
                      Porti una classe?
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Numeri e volti ── */}
        <section className="ev-numeri" aria-labelledby="numeri-titolo">
          <div className="container mx-auto px-6">
            <h2 id="numeri-titolo" className="sr-only">
              L&apos;evento in numeri
            </h2>
            <ul className="ev-stats">
              {STATS.map((s) => (
                <li key={s.label}>
                  <div className="stat-number">{s.num}</div>
                  <div className="stat-label">{s.label}</div>
                </li>
              ))}
            </ul>

            <div className="ev-palco">
              <div className="ev-palco-testa">
                <h2 id="sul-palco">Sul palco</h2>
                <a href="#programma" className="ev-link">
                  Il programma
                </a>
              </div>
              {/* Sul telefono una striscia che scorre di lato (il volto
                  tagliato sul bordo invita a scorrere); da 768px va a capo. */}
              <ul className="ev-palco-lista" aria-labelledby="sul-palco">
                {SUL_PALCO.map((p) => (
                  <li key={p.chiave}>
                    <a href={p.href} className="ev-volto">
                      <span className="ev-volto-foto">
                        <Image
                          src={p.img}
                          alt=""
                          fill
                          sizes="(min-width: 768px) 72px, 56px"
                          className="rounded-full object-cover"
                        />
                      </span>
                      <span className="ev-volto-nome">{p.nome}</span>
                      <span className="sr-only">, {p.ruolo}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Iscrizione ── */}
        {/* L'ancora #iscrizione è stampata sui QR: l'id non cambia. Il
            margine in alto tiene il titolo fuori da sotto la navbar fissa. */}
        <section id="iscrizione" className="ev-iscrizione bg-light-gray" aria-labelledby="iscrizione-titolo">
          <div className="container mx-auto px-6">
            <h2 id="iscrizione-titolo" className="section-title">
              {ARCHIVE_MODE ? "Evento concluso" : "Iscriviti gratis"}
            </h2>
            {ARCHIVE_MODE ? (
              <p className="text-lg text-gray-700 max-w-3xl">
                Le iscrizioni sono chiuse. Grazie a tutte le persone che hanno partecipato. Per ricevere
                notizie sulle prossime iniziative della Fondazione, scrivi a{" "}
                <a href="mailto:info@bioergotech.org" className="ev-link">
                  info@bioergotech.org
                </a>
                .
              </p>
            ) : (
              <>
                <p className="ev-iscrizione-intro">
                  Ci vuole un minuto: scegli le giornate e ti mandiamo per email il biglietto con il QR code. I
                  posti sono limitati.
                </p>
                {/* Sul telefono il modulo viene subito dopo il titolo e i passi
                    dopo; da 1024px i passi stanno accanto, fermi mentre si
                    compila. */}
                <div className="ev-iscrizione-griglia">
                  <div className="min-w-0">
                    <RegistrationForm />
                  </div>
                  <aside className="ev-come" aria-labelledby="come-funziona-titolo">
                    <div className="card-sm" style={{ padding: 22 }}>
                      <h3 id="come-funziona-titolo">Come funziona</h3>
                      <ol className="ev-passi">
                        <li className="ev-passo">
                          <span className="ev-passo-num" aria-hidden="true">1</span>
                          <div>
                            <h4>Scegli le giornate</h4>
                            <p>
                              Il {G10.etichetta} al {G10.luogoBreve}, l&apos;{G11.etichetta} al {G11.luogoBreve},
                              o tutte e due.
                            </p>
                          </div>
                        </li>
                        <li className="ev-passo">
                          <span className="ev-passo-num" aria-hidden="true">2</span>
                          <div>
                            <h4>Ricevi il biglietto per email</h4>
                            <p>Con il tuo QR code personale. Se non lo trovi, guarda nella posta indesiderata.</p>
                          </div>
                        </li>
                        <li className="ev-passo">
                          <span className="ev-passo-num" aria-hidden="true">3</span>
                          <div>
                            <h4>Mostralo all&apos;ingresso</h4>
                            <p>Dal telefono o stampato. In alternativa basta il codice scritto sul biglietto.</p>
                          </div>
                        </li>
                      </ol>
                      <p className="ev-aiuto">
                        Hai una domanda? Leggi le{" "}
                        <a href="#faq" className="ev-link">
                          domande frequenti
                        </a>{" "}
                        o scrivi a{" "}
                        <a href="mailto:info@bioergotech.org" className="ev-link">
                          info@bioergotech.org
                        </a>
                        .
                      </p>
                    </div>
                  </aside>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ── 10 dicembre ── */}
        {/* id="programma": ci portano i volti di "Sul palco". */}
        <section id="programma" className="section" aria-labelledby="titolo-10" style={{ scrollMarginTop: 70 }}>
          <div className="container mx-auto px-6">
            <h2 id="titolo-10" className="section-title">
              {G10.giornoLabel}, {G10.luogoBreve}
            </h2>
            <MetaGiornata s={G10} />
            <p className="ev-lead">{G10.descrizione}</p>

            {/* Moderatrice della giornata, prima del programma che conduce */}
            <div id="moderatrice" className="card-sm ev-moderatrice ev-ancora">
              <span style={{ position: "relative", width: 48, height: 48, flexShrink: 0 }}>
                <Image src={MODERATRICE.img} alt="" fill sizes="48px" className="rounded-full object-cover" />
              </span>
              <div>
                <span className="ev-sopratitolo">Moderatrice</span>
                <h3 className="font-semibold text-gray-800" style={{ fontSize: 15, margin: "2px 0 0" }}>
                  {MODERATRICE.nome}
                </h3>
                <p className="text-gray-600" style={{ fontSize: 13, margin: 0 }}>
                  {MODERATRICE.ruolo}
                </p>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-800" style={{ margin: "0 0 16px" }}>
              Il programma della giornata
            </h3>
            <ol className="ev-tl">
              {PROGRAMMA_GIORNO1.map((v, i) => (
                <VoceProgramma key={`${v.tipo}-${v.n ?? i}`} v={v} />
              ))}
            </ol>

            <div className="card-sm" style={{ background: "var(--primary-light)", borderColor: "transparent", padding: "20px 22px" }}>
              <h3 className="text-lg font-semibold text-gray-800" style={{ margin: "0 0 6px" }}>
                I progetti dei ragazzi
              </h3>
              <p className="text-gray-700" style={{ margin: 0, fontSize: 15, lineHeight: 1.6 }}>
                Tra un panel e l&apos;altro, dieci gruppi di ragazzi presentano i loro progetti in tre
                blocchi: tre minuti a testa, due di pitch e uno di domande. Una commissione valuta le idee e
                proclama il gruppo vincitore.
              </p>
            </div>
          </div>
        </section>

        {/* ── 11 dicembre ── */}
        <section className="section bg-light-gray" aria-labelledby="titolo-11">
          <div className="container mx-auto px-6">
            <h2 id="titolo-11" className="section-title">
              {G11.giornoLabel}, {G11.luogoBreve}
            </h2>
            <MetaGiornata s={G11} />
            <p className="ev-lead">{G11.descrizione}</p>
            <div className="ev-momenti">
              {MOMENTI_11.map((c) => (
                <div key={c.t} className="card-sm ev-momento">
                  <span className="icon-circle icon-circle-primary" style={{ width: 44, height: 44 }} aria-hidden="true">
                    <i className={`fas ${c.icona} text-lg`} />
                  </span>
                  <div>
                    <h3>{c.t}</h3>
                    <p className="text-sm text-gray-600" style={{ margin: 0 }}>
                      {c.d}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Perché partecipare ── */}
        <section className="section" aria-labelledby="perche-titolo">
          <div className="container mx-auto px-6">
            <h2 id="perche-titolo" className="section-title">
              Perché partecipare
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {PERCHE_PARTECIPARE.map((p) => (
                <div key={p.titolo} className="card-sm flex items-start gap-4" style={{ padding: 20 }}>
                  <span className="icon-circle icon-circle-primary" style={{ width: 44, height: 44 }} aria-hidden="true">
                    <i className={`fas ${p.icona} text-lg`} />
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-800" style={{ fontSize: 16, margin: "2px 0 4px" }}>
                      {p.titolo}
                    </h3>
                    <p className="text-sm text-gray-600" style={{ margin: 0, lineHeight: 1.55 }}>
                      {p.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="section bg-light-gray" aria-labelledby="faq-titolo" style={{ scrollMarginTop: 70 }}>
          <div className="container mx-auto px-6">
            <h2 id="faq-titolo" className="section-title text-center">
              Domande frequenti
            </h2>
            <div className="max-w-3xl mx-auto space-y-3">
              {FAQ.map((f) => (
                <details key={f.q} className="card-sm group" style={{ padding: 0, overflow: "hidden" }}>
                  <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-5 py-4 sm:px-6 sm:py-5 font-semibold text-gray-800 [&::-webkit-details-marker]:hidden" style={{ minHeight: 44 }}>
                    <span>{f.q}</span>
                    <i
                      className="fas fa-chevron-down text-sm transition-transform group-open:rotate-180 motion-reduce:transition-none"
                      style={{ color: "var(--primary)" }}
                      aria-hidden="true"
                    />
                  </summary>
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 text-gray-700 leading-relaxed" style={{ fontSize: 15 }}>
                    {f.a}
                    {f.link && (
                      <>
                        {" "}
                        {f.link.href.startsWith("/") ? (
                          <Link href={f.link.href} className="ev-link">
                            {f.link.label}
                          </Link>
                        ) : (
                          <a href={f.link.href} className="ev-link">
                            {f.link.label}
                          </a>
                        )}
                      </>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Altri modi di partecipare ── */}
        {/* Le schede di licei, universitari e bando, che prima interrompevano
            il programma delle giornate. Qui sono compatte e non citano
            scadenze: le date vere stanno nelle pagine dei bandi. */}
        {!ARCHIVE_MODE && (
          <section className="section" aria-labelledby="altri-modi-titolo">
            <div className="container mx-auto px-6">
              <h2 id="altri-modi-titolo" className="section-title">
                Altri modi di partecipare
              </h2>
              <p className="text-gray-700 max-w-3xl" style={{ margin: "-4px 0 24px", fontSize: 16, lineHeight: 1.6 }}>
                Oltre a seguire le due giornate dal pubblico, scuole, studenti universitari e startup hanno
                percorsi dedicati.
              </p>
              <div className="ev-modi">
                {ALTRI_MODI.map((m) => (
                  <div key={m.href} className="card-sm ev-modo">
                    <span className="ev-sopratitolo" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <i className={`fas ${m.icona}`} aria-hidden="true" style={{ color: "var(--primary)", fontSize: 13 }} />
                      {m.etichetta}
                    </span>
                    <h3>{m.titolo}</h3>
                    <p>{m.testo}</p>
                    <Link href={m.href} className="ev-link ev-modo-cta">
                      {m.cta}
                      <span className="sr-only"> {m.contesto}</span>
                      <i className="fas fa-arrow-right" aria-hidden="true" style={{ fontSize: 12 }} />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Team Organizzativo ── */}
        <section className="section bg-light-gray" aria-labelledby="team-titolo">
          <div className="container mx-auto px-6">
            <h2 id="team-titolo" className="section-title text-center block">
              Il team organizzativo
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {TEAM_PUBBLICO.map((p) => (
                <div key={p.name} className="card-sm text-center" style={{ padding: 20 }}>
                  <Image
                    src={p.img}
                    width={96}
                    height={96}
                    sizes="(min-width: 640px) 96px, 72px"
                    className="w-[72px] h-[72px] sm:w-24 sm:h-24 rounded-full mx-auto mb-3 object-cover"
                    style={p.imgPosition ? { objectPosition: p.imgPosition } : undefined}
                    alt=""
                  />
                  <h3 className="font-semibold text-gray-800" style={{ fontSize: 15, margin: 0 }}>
                    {p.name}
                  </h3>
                  {p.role && (
                    <p style={{ color: "var(--ev-link)", fontSize: 13, fontWeight: 600, margin: "2px 0 0" }}>{p.role}</p>
                  )}
                  {p.desc && (
                    <p className="hidden sm:block text-gray-600 text-sm" style={{ margin: "8px 0 0", lineHeight: 1.5 }}>
                      {p.desc}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
      {!ARCHIVE_MODE && <EventoIscrivitiFisso />}
    </>
  );
}
