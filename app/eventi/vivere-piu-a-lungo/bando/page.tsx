import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { BandoForm } from "./BandoForm";
import { BandoIndice } from "./BandoIndice";
import { EVENT } from "../content";
import {
  ALLEGATI,
  AMBITI,
  BANDO,
  BANDO_PATH,
  CALENDARIO,
  CANDIDATURE_APERTURA_LABEL,
  CANDIDATURE_SCADENZA_LABEL,
  CATEGORIE_BANDO,
  COMMISSIONE,
  CONTATTI,
  COSA_OFFRE,
  CRITERI,
  CRITERIO_DIRIMENTE,
  EVENT_SLUG,
  FAQ_BANDO,
  MAX_FILE_LABEL,
  PREMI,
  PUNTEGGIO_MASSIMO,
  PUNTEGGIO_MINIMO,
  REQUISITI,
  SITE_URL,
  SOGLIA_RACCOLTA_EUR,
  VIDEO_DURATA_MAX,
  statoCandidature,
} from "./content";

// La finestra di candidatura si valuta a ogni richiesta: una pagina generata
// a build time resterebbe ferma allo stato del giorno del deploy.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${BANDO.titolo} . Bando . Fondazione bioERGOtech`,
  description:
    "Bando di partecipazione allo Showcase di Innovazione dell'11 dicembre 2026 al Teatro Fusco di Taranto. Tre categorie, tre premi, candidatura gratuita per startup, spin-off, team di ricerca e imprese innovative.",
  alternates: { canonical: BANDO_PATH },
  openGraph: {
    title: `${BANDO.titolo} . Fondazione bioERGOtech`,
    description: BANDO.sottotitolo,
    url: `${SITE_URL}${BANDO_PATH}`,
    images: [{ url: EVENT.ogImage }],
    type: "website",
  },
};

const EURO = (n: number) => `${n.toLocaleString("it-IT")} euro`;

/** Il punteggio più alto attribuibile a un singolo criterio, per le barre. */
const PUNTI_MAX_CRITERIO = Math.max(
  ...Object.values(CRITERI).flatMap((c) => c.map((k) => k.punti)),
);

/**
 * Foglio di stile della pagina.
 *
 * Vive qui e non in `globals.css` per due ragioni. La prima è che serve solo
 * a questa pagina. La seconda è che `/assets/css/main.css` viene caricato
 * dopo il design system e ne riscrive `.section`, `.card` e `.section-title`:
 * su una pagina con un occhiello sopra ogni titolo, `display: inline-block`
 * ereditato da lì faceva finire occhiello e titolo sulla stessa riga. Qui
 * rimettiamo le cose come le vuole `globals.css`, sotto `.bando-page`, senza
 * toccare il resto del sito.
 */
const STILE = `
/* ── Ambiente della pagina ─────────────────────────────────────────────── */
.bando-page {
  /* Il teal del sito su fondo bianco non arriva al contrasto richiesto per il
     testo: qui usiamo una versione profonda per tutto ciò che si legge, e
     lasciamo il teal pieno a icone, barre e bordi. */
  --primary-dark: #0A7A66;
  --primary-light: #E1F5EE;
  --text-light: #64748B;
}
.bando-page .section { padding: 76px 0; overflow: visible; }
/* 71px di menu più 58 di indice: le ancore devono atterrare sotto entrambi. */
.bando-page section[id] { scroll-margin-top: 138px; }

.bando-page .section-title {
  display: block;
  font-size: 2rem;
  line-height: 1.25;
  color: var(--text-dark);
  padding-bottom: 20px;
  margin: 0 0 20px;
}
.bando-page .section-title::after { width: 56px; height: 3px; }
.bando-page .section-title:hover::after { width: 56px; }

.bando-page .card {
  margin: 0;
  background: #fff;
  border: 1px solid var(--border-color);
  transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease;
}
.bando-page .card::before { display: none; }
.bando-page .card:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 34px rgba(26, 35, 50, .10);
  border-color: #CFE9E4;
}

/* ── Titoli di sezione ─────────────────────────────────────────────────── */
.bd-head { max-width: 800px; margin-bottom: 36px; }
.bd-head-riga { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
.bd-num {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 9px;
  background: var(--primary-light); color: var(--primary-dark);
  font-size: 12px; font-weight: 800;
}
.bd-kicker {
  font-size: 11.5px; font-weight: 700; letter-spacing: .12em;
  text-transform: uppercase; color: var(--primary-dark);
}
.bd-art {
  font-size: 10.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
  color: var(--text-light); background: #fff;
  border: 1px solid var(--border-color); border-radius: 999px; padding: 4px 10px;
}
.bd-intro { font-size: 17px; line-height: 1.75; color: var(--text-mid); max-width: 800px; margin: 0 0 34px; }
.bd-testo { font-size: 15.5px; line-height: 1.8; color: var(--text-mid); max-width: 800px; }
.bd-testo p { margin: 0 0 16px; }
.bd-testo p:last-child { margin-bottom: 0; }
.bd-nota { font-size: 13px; color: var(--text-light); line-height: 1.7; max-width: 860px; }

/* ── Hero ──────────────────────────────────────────────────────────────── */
.bando-page .hero {
  min-height: auto; display: block;
  background: linear-gradient(135deg, #F7F9FC 0%, #E8F8F6 55%, #F1EEFF 100%);
}
/* La regola .container di globals.css imposta "padding: 0 24px" dopo le
   utility di Tailwind, quindi qui pt-* e pb-* non attaccherebbero: lo spazio
   del hero lo diamo per nome. */
.bando-page .hero .container { padding-top: 26px; padding-bottom: 72px; }
.bd-hero-grid { display: grid; grid-template-columns: 1fr; gap: 40px; align-items: center; }
@media (min-width: 940px) { .bd-hero-grid { grid-template-columns: 1.08fr .92fr; gap: 56px; } }
.bd-hero-img { position: relative; border-radius: 18px; overflow: hidden; box-shadow: 0 24px 60px rgba(26, 35, 50, .18); }
.bd-hero-img img { display: block; width: 100%; height: auto; }
.bd-hero-tag {
  position: absolute; left: 16px; bottom: 16px;
  display: inline-flex; align-items: center; gap: 9px;
  background: rgba(255, 255, 255, .94); border-radius: 12px; padding: 10px 15px;
  font-size: 12.5px; font-weight: 700; color: var(--text-dark);
  box-shadow: 0 8px 24px rgba(26, 35, 50, .16);
}
.bd-hero-tag i { color: var(--primary-dark); }

.bd-fatti { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
.bd-fatto {
  display: inline-flex; align-items: center; gap: 8px;
  background: #fff; border: 1px solid var(--border-color); border-radius: 999px;
  padding: 7px 15px; font-size: 12.5px; font-weight: 600; color: var(--text-dark);
}
.bd-fatto i { color: var(--primary-dark); font-size: 12px; }

.bd-stato {
  display: flex; align-items: flex-start; gap: 11px;
  border: 1px solid; border-radius: 12px; padding: 13px 16px;
  font-size: 14px; line-height: 1.6; margin-bottom: 28px; max-width: 620px;
}
.bd-stato i { margin-top: 3px; flex-shrink: 0; }
.bd-stato-aperto { background: #ECFAF6; border-color: #B4E3D8; color: #08594A; }
.bd-stato-attesa { background: #FFF8E8; border-color: #F0DFAE; color: #75570F; }
.bd-stato-chiuso { background: #F4F6F9; border-color: var(--border-color); color: var(--text-mid); }

.bd-azioni { display: flex; flex-wrap: wrap; gap: 12px; }
.bd-btn-spento {
  display: inline-flex; align-items: center; gap: 8px;
  background: #EDF1F6; color: var(--text-mid); border: 1px solid var(--border-color);
  border-radius: 8px; padding: 12px 26px; font-size: .9rem; font-weight: 600; cursor: default;
}

.bd-meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 44px; }
@media (min-width: 880px) { .bd-meta { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.bd-meta-box { background: rgba(255, 255, 255, .88); border: 1px solid rgba(26, 35, 50, .07); border-radius: 14px; padding: 16px 18px; }
.bd-meta-et {
  display: flex; align-items: center; gap: 7px; margin-bottom: 7px;
  font-size: 10.5px; font-weight: 700; letter-spacing: .09em;
  text-transform: uppercase; color: var(--text-light);
}
.bd-meta-et i { color: var(--primary-dark); font-size: 12px; }
.bd-meta-val { font-size: 14px; font-weight: 600; color: var(--text-dark); line-height: 1.45; }

/* ── Indice appiccicato ────────────────────────────────────────────────── */
.bd-indice {
  position: sticky; top: 71px; z-index: 40;
  background: rgba(255, 255, 255, .93);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color);
}
.bd-indice-riga { display: flex; align-items: center; gap: 16px; height: 58px; }
.bd-indice-voci {
  display: flex; align-items: center; gap: 4px; flex: 1; min-width: 0;
  overflow-x: auto; scrollbar-width: none;
}
.bd-indice-voci::-webkit-scrollbar { display: none; }
.bd-voce {
  white-space: nowrap; font-size: 13px; font-weight: 600; color: var(--text-mid);
  padding: 7px 12px; border-radius: 8px; transition: background .2s ease, color .2s ease;
}
.bd-voce:hover { background: var(--bg-light); color: var(--text-dark); }
.bd-voce-attiva, .bd-voce-attiva:hover { background: var(--primary-light); color: var(--primary-dark); }
.bd-indice-cta { display: none; }
@media (min-width: 1040px) {
  .bd-indice-cta {
    display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0;
    background: var(--primary); color: #fff; font-size: 13px; font-weight: 700;
    padding: 10px 20px; border-radius: 8px;
    box-shadow: 0 4px 14px rgba(19, 214, 176, .3);
    transition: background .2s ease, transform .2s ease;
  }
  .bd-indice-cta:hover { background: var(--primary-dark); color: #fff; transform: translateY(-1px); }
}

/* ── Numeri chiave ─────────────────────────────────────────────────────── */
.bd-numeri {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 26px 18px;
  margin-top: 46px; padding-top: 36px; border-top: 1px solid var(--border-color);
}
@media (min-width: 780px) { .bd-numeri { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.bd-numero { font-size: 2.4rem; font-weight: 800; color: var(--primary-dark); line-height: 1; }
.bd-numero-et { font-size: 13px; color: var(--text-mid); margin-top: 9px; line-height: 1.45; }

/* ── Categorie ─────────────────────────────────────────────────────────── */
.bd-cats { display: grid; grid-template-columns: 1fr; gap: 22px; }
@media (min-width: 920px) { .bd-cats { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.bd-cat {
  display: flex; flex-direction: column;
  background: #fff; border: 1px solid var(--border-color); border-radius: 16px;
  padding: 26px; box-shadow: 0 6px 20px rgba(26, 35, 50, .05);
  transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease;
}
.bd-cat:hover { transform: translateY(-3px); box-shadow: 0 16px 38px rgba(26, 35, 50, .10); border-color: #CFE9E4; }
/* min-height: le tre schede restano allineate anche quando il nome di una
   categoria va a capo e le altre no. */
.bd-cat-top { display: flex; align-items: flex-start; gap: 13px; margin-bottom: 16px; min-height: 62px; }
.bd-lettera {
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
  width: 42px; height: 42px; border-radius: 12px;
  background: var(--primary-light); color: var(--primary-dark); font-size: 19px; font-weight: 800;
}
.bd-cat-et { display: block; font-size: 10px; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; color: var(--text-light); }
.bd-cat-top h3 { font-size: 17px; margin: 3px 0 0; color: var(--text-dark); line-height: 1.3; }
.bd-cat-sintesi {
  font-size: 13.5px; font-weight: 600; color: var(--primary-dark);
  background: var(--primary-light); border-radius: 10px; padding: 11px 14px;
  margin-bottom: 16px; line-height: 1.5;
}
.bd-cat-desc { font-size: 13.5px; color: var(--text-mid); line-height: 1.7; margin: 0 0 20px; }
.bd-cat-formato {
  margin-top: auto; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px; border-top: 1px solid var(--border-color); padding-top: 16px;
}
.bd-cat-formato b { display: block; font-size: 13.5px; color: var(--text-dark); font-weight: 700; }
.bd-cat-formato span {
  display: block; margin-top: 4px; font-size: 10px; font-weight: 700;
  letter-spacing: .08em; text-transform: uppercase; color: var(--text-light);
}

/* ── Schede a icona: ambiti e vantaggi ─────────────────────────────────── */
.bd-schede { display: flex; flex-wrap: wrap; gap: 16px; }
.bd-scheda {
  flex: 1 1 290px; display: flex; gap: 15px; align-items: flex-start;
  background: #fff; border: 1px solid var(--border-color); border-radius: 14px;
  padding: 20px 22px; box-shadow: 0 4px 14px rgba(26, 35, 50, .04);
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
}
.bd-scheda:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(26, 35, 50, .08); border-color: #CFE9E4; }
.bd-scheda-icona {
  width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0; font-size: 15px;
  background: var(--primary-light); color: var(--primary-dark);
  display: flex; align-items: center; justify-content: center;
}
.bd-scheda h3 { font-size: 14.5px; margin: 0 0 4px; color: var(--text-dark); line-height: 1.35; }
.bd-scheda p { font-size: 13px; color: var(--text-mid); margin: 0; line-height: 1.6; }

/* ── Premi ─────────────────────────────────────────────────────────────── */
.bd-premi { display: grid; grid-template-columns: 1fr; gap: 22px; }
@media (min-width: 920px) { .bd-premi { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.bd-premio {
  display: flex; flex-direction: column;
  background: #fff; border: 1px solid var(--border-color); border-top: 3px solid var(--primary);
  border-radius: 16px; padding: 26px; box-shadow: 0 6px 20px rgba(26, 35, 50, .05);
}
.bd-premio-top { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.bd-premio-cat { font-size: 10.5px; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; color: var(--text-light); }
.bd-premio-cat b { display: block; font-size: 14.5px; letter-spacing: 0; text-transform: none; color: var(--text-dark); margin-top: 2px; }
.bd-premio h3 { font-size: 15px; line-height: 1.5; margin: 0 0 18px; color: var(--text-dark); }
.bd-premio ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 11px; }
.bd-premio li { display: flex; gap: 11px; font-size: 13.5px; color: var(--text-mid); line-height: 1.6; }
.bd-premio li i { color: var(--primary-dark); font-size: 11px; margin-top: 5px; flex-shrink: 0; }

/* ── Criteri ───────────────────────────────────────────────────────────── */
.bd-chips { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 32px; }
.bd-chip {
  display: inline-flex; align-items: center; gap: 9px;
  background: #fff; border: 1px solid var(--border-color); border-radius: 999px;
  padding: 9px 17px; font-size: 13px; color: var(--text-mid);
}
.bd-chip i { color: var(--primary-dark); }
.bd-chip b { color: var(--text-dark); font-weight: 700; }
.bd-criteri { display: grid; grid-template-columns: 1fr; gap: 22px; }
@media (min-width: 1040px) { .bd-criteri { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.bd-crit {
  display: flex; flex-direction: column;
  background: #fff; border: 1px solid var(--border-color); border-radius: 16px;
  padding: 24px; box-shadow: 0 6px 20px rgba(26, 35, 50, .05);
}
.bd-crit-top { display: flex; align-items: center; gap: 11px; min-height: 46px; padding-bottom: 16px; border-bottom: 1px solid var(--border-color); }
.bd-crit-top h3 { font-size: 15px; margin: 0; color: var(--text-dark); line-height: 1.3; }
.bd-crit-voce { padding: 15px 0; border-bottom: 1px solid #F1F4F8; }
.bd-crit-voce:last-of-type { border-bottom: none; padding-bottom: 4px; }
.bd-crit-riga { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.bd-crit-nome { font-size: 13.5px; font-weight: 600; color: var(--text-dark); line-height: 1.35; }
.bd-crit-punti { font-size: 12.5px; font-weight: 800; color: var(--primary-dark); white-space: nowrap; }
.bd-crit-barra { height: 5px; border-radius: 999px; background: var(--primary-light); margin: 10px 0 9px; }
.bd-crit-barra span { display: block; height: 100%; border-radius: 999px; background: var(--primary); }
.bd-crit-desc { font-size: 12.5px; color: var(--text-mid); line-height: 1.55; margin: 0; }
.bd-crit-nota { font-size: 12.5px; color: var(--text-light); line-height: 1.6; margin: 16px 0 0; padding-top: 15px; border-top: 1px solid var(--border-color); }

/* ── Requisiti e allegati ──────────────────────────────────────────────── */
.bd-due { display: grid; grid-template-columns: 1fr; gap: 36px; }
@media (min-width: 920px) { .bd-due { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 48px; } }
/* Le due colonne non hanno mai la stessa lunghezza: dentro un pannello lo
   spazio che avanza smette di leggersi come un buco. */
.bd-pannello {
  display: flex; flex-direction: column;
  background: #FBFCFE; border: 1px solid var(--border-color);
  border-radius: 16px; padding: 28px;
}
.bd-due-panelli { gap: 22px; }
@media (min-width: 920px) { .bd-due-panelli { gap: 22px; } }
.bd-sotto { font-size: 15.5px; font-weight: 700; color: var(--text-dark); margin: 0 0 18px; }
.bd-lista { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 15px; }
.bd-lista li { display: flex; gap: 12px; font-size: 14px; color: var(--text-mid); line-height: 1.65; }
.bd-lista > li > i { color: var(--primary-dark); font-size: 13px; margin-top: 5px; flex-shrink: 0; }
.bd-lista b { color: var(--text-dark); font-weight: 600; }
.bd-tag {
  display: inline-block; margin-left: 7px; vertical-align: 1px;
  font-size: 9.5px; font-weight: 800; letter-spacing: .07em; text-transform: uppercase;
  border-radius: 6px; padding: 3px 7px;
}
.bd-tag-obb { background: var(--primary-light); color: var(--primary-dark); }
.bd-tag-fac { background: #EEF2F7; color: var(--text-light); }

/* ── Calendario ────────────────────────────────────────────────────────── */
.bd-tappe { list-style: none; margin: 0; padding: 0; }
.bd-tappa { position: relative; display: flex; gap: 18px; padding-bottom: 24px; }
.bd-tappa:last-child { padding-bottom: 0; }
.bd-tappa::before { content: ''; position: absolute; left: 17px; top: 40px; bottom: 0; width: 2px; background: var(--primary-light); }
.bd-tappa:last-child::before { display: none; }
.bd-tappa-n {
  position: relative; z-index: 1; flex-shrink: 0;
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 800;
  background: #fff; color: var(--primary-dark); border: 2px solid var(--primary-light);
}
.bd-tappa-ora .bd-tappa-n { background: var(--primary); color: #fff; border-color: var(--primary); box-shadow: 0 4px 12px rgba(19, 214, 176, .35); }
.bd-tappa-txt { padding-top: 5px; }
.bd-tappa-fase { display: flex; align-items: center; flex-wrap: wrap; gap: 9px; font-size: 14.5px; font-weight: 600; color: var(--text-dark); }
.bd-tappa-data { font-size: 13px; color: var(--primary-dark); font-weight: 600; margin-top: 3px; }
.bd-ora {
  font-size: 9.5px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase;
  background: var(--primary-light); color: var(--primary-dark); border-radius: 6px; padding: 3px 8px;
}

/* ── Formato del palco ─────────────────────────────────────────────────── */
.bd-formato { display: flex; flex-direction: column; gap: 12px; max-width: 940px; }
.bd-formato-riga {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px;
  background: #fff; border: 1px solid var(--border-color); border-radius: 14px; padding: 18px 22px;
}
@media (min-width: 640px) { .bd-formato-riga { grid-template-columns: 2.1fr repeat(3, minmax(0, 1fr)); align-items: center; gap: 18px; } }
.bd-formato-cat { grid-column: 1 / -1; display: flex; align-items: center; gap: 11px; }
@media (min-width: 640px) { .bd-formato-cat { grid-column: auto; } }
.bd-formato-cat b { font-size: 14.5px; color: var(--text-dark); font-weight: 600; }
.bd-formato-cella b { display: block; font-size: 14px; color: var(--text-dark); font-weight: 700; }
.bd-formato-cella span {
  display: block; margin-top: 3px; font-size: 10px; font-weight: 700;
  letter-spacing: .08em; text-transform: uppercase; color: var(--text-light);
}
.bd-lettera-sm {
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
  width: 30px; height: 30px; border-radius: 9px;
  background: var(--primary-light); color: var(--primary-dark); font-size: 14px; font-weight: 800;
}

/* ── Avviso ────────────────────────────────────────────────────────────── */
.bd-avviso {
  display: flex; gap: 14px; background: #FFF8E8; border: 1px solid #F0DFAE;
  border-radius: 14px; padding: 18px 20px;
}
.bd-avviso i { color: #B8860B; margin-top: 3px; flex-shrink: 0; }
.bd-avviso p { margin: 0; font-size: 13.5px; color: #66500F; line-height: 1.65; }

/* ── Candidatura ───────────────────────────────────────────────────────── */
.bd-passi { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 16px; }
.bd-passi li { display: flex; gap: 14px; align-items: flex-start; }
.bd-passo-n {
  flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%; margin-top: 1px;
  display: flex; align-items: center; justify-content: center;
  background: var(--primary-light); color: var(--primary-dark); font-size: 12px; font-weight: 800;
}
.bd-passi p { margin: 0; font-size: 14px; color: var(--text-mid); line-height: 1.65; }

/* ── FAQ ───────────────────────────────────────────────────────────────── */
.bd-faq { max-width: 820px; margin: 0 auto; display: flex; flex-direction: column; gap: 12px; }
.bd-faq details {
  background: #fff; border: 1px solid var(--border-color); border-radius: 14px; overflow: hidden;
  transition: border-color .2s ease, box-shadow .2s ease;
}
.bd-faq details[open] { border-color: #CFE9E4; box-shadow: 0 10px 26px rgba(26, 35, 50, .07); }
.bd-faq summary {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  cursor: pointer; list-style: none; padding: 18px 22px;
  font-size: 15px; font-weight: 600; color: var(--text-dark);
}
.bd-faq summary::-webkit-details-marker { display: none; }
.bd-faq summary:hover { background: #FAFCFE; }
.bd-faq summary i { color: var(--primary-dark); font-size: 13px; flex-shrink: 0; transition: transform .25s ease; }
.bd-faq details[open] summary i { transform: rotate(180deg); }
.bd-faq-risposta { padding: 0 22px 20px; font-size: 14px; color: var(--text-mid); line-height: 1.75; }

/* ── Contatti e chiusura ───────────────────────────────────────────────── */
.bd-contatti { display: grid; grid-template-columns: 1fr; gap: 18px; max-width: 900px; }
@media (min-width: 820px) { .bd-contatti { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.bd-contatto { background: #fff; border: 1px solid var(--border-color); border-radius: 16px; padding: 24px; }
.bd-contatto-icona {
  width: 42px; height: 42px; border-radius: 12px; margin-bottom: 15px;
  background: var(--primary-light); color: var(--primary-dark);
  display: flex; align-items: center; justify-content: center;
}
.bd-contatto-ruolo { font-size: 10.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--text-light); }
.bd-contatto h3 { font-size: 16px; margin: 6px 0 8px; color: var(--text-dark); }
.bd-contatto a { color: var(--primary-dark); font-weight: 600; font-size: 14px; }
.bd-contatto a:hover { text-decoration: underline; }
.bd-contatto p { font-size: 13.5px; color: var(--text-mid); line-height: 1.65; margin: 12px 0 0; }
.bd-chiusura {
  display: flex; flex-direction: column; align-items: flex-start; gap: 20px;
  background: #fff; border: 1px solid var(--border-color); border-left: 4px solid var(--primary);
  border-radius: 16px; padding: 26px 28px; margin: 40px 0 32px; max-width: 900px;
}
@media (min-width: 820px) { .bd-chiusura { flex-direction: row; align-items: center; justify-content: space-between; gap: 30px; } }
.bd-chiusura h3 { font-size: 18px; margin: 0 0 6px; color: var(--text-dark); }
.bd-chiusura p { margin: 0; font-size: 14px; color: var(--text-mid); line-height: 1.6; }

/* ── Adattamenti ───────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .bando-page .section { padding: 56px 0; }
  .bando-page .section-title { font-size: 1.6rem; }
  .bando-page section[id] { scroll-margin-top: 134px; }
  .bd-numero { font-size: 2rem; }
}
@media (prefers-reduced-motion: reduce) {
  .bando-page *, .bando-page *::before, .bando-page *::after { transition: none !important; animation: none !important; }
  .bando-page .card:hover, .bd-cat:hover, .bd-scheda:hover, .bd-indice-cta:hover { transform: none; }
}
@media print {
  .bd-indice, .navbar, .footer, .bd-azioni, .bd-chiusura { display: none !important; }
  .bando-page .section { padding: 22px 0; }
  .bando-page .card, .bd-cat, .bd-premio, .bd-crit, .bd-scheda { box-shadow: none; break-inside: avoid; }
}
`;

/** Testata di sezione: numero, filo narrativo, riferimento all'articolo. */
function Testata({
  n,
  kicker,
  articolo,
  titolo,
  children,
}: {
  n: number;
  kicker: string;
  articolo: string;
  titolo: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bd-head">
      <div className="bd-head-riga">
        <span className="bd-num" aria-hidden="true">
          {String(n).padStart(2, "0")}
        </span>
        <span className="bd-kicker">{kicker}</span>
        <span className="bd-art">{articolo}</span>
      </div>
      <h2 className="section-title">{titolo}</h2>
      {children ? <p className="bd-intro">{children}</p> : null}
    </div>
  );
}

function FaqJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_BANDO.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />;
}

export default async function BandoPage() {
  const stato = statoCandidature();

  // Lo staff vede il form anche prima dell'apertura, per provare il flusso.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let staff = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("partnership_level")
      .eq("id", user.id)
      .maybeSingle();
    staff = profile?.partnership_level === "admin";
  }

  const formVisibile = stato === "aperto" || staff;
  const anteprimaStaff = staff && stato !== "aperto";

  const numeri = [
    { n: "3", et: "Categorie, una per ogni stadio del progetto" },
    { n: String(BANDO.postiTotali), et: "Progetti al massimo sul palco dello Showcase" },
    { n: "3", et: "Premi, uno per ogni categoria" },
    { n: "0 €", et: "Quota di partecipazione, la candidatura è gratuita" },
  ];

  return (
    <>
      <FaqJsonLd />
      <style>{STILE}</style>
      <Navbar />

      <div className="bando-page">
        {/* ── Hero ── */}
        <section className="hero" style={{ paddingTop: 120 }}>
          <div className="container mx-auto px-6 pt-6 pb-20 relative z-10">
            <div className="bd-hero-grid">
              <div>
                <div className="bd-kicker" style={{ marginBottom: 18, letterSpacing: "0.14em", fontSize: 12 }}>
                  {BANDO.occhiello} . Bando di partecipazione
                </div>
                <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6 text-gray-800">
                  {BANDO.titolo}
                </h1>
                <p className="text-lg md:text-xl text-gray-700 mb-7">{BANDO.sottotitolo}</p>

                <div className="bd-fatti">
                  <span className="bd-fatto">
                    <i className="fas fa-circle-check" aria-hidden="true" /> Candidatura gratuita
                  </span>
                  <span className="bd-fatto">
                    <i className="fas fa-layer-group" aria-hidden="true" /> Tre categorie
                  </span>
                  <span className="bd-fatto">
                    <i className="fas fa-globe" aria-hidden="true" /> Nessun limite geografico
                  </span>
                </div>

                <div
                  className={`bd-stato ${
                    stato === "aperto"
                      ? "bd-stato-aperto"
                      : stato === "non_aperto"
                        ? "bd-stato-attesa"
                        : "bd-stato-chiuso"
                  }`}
                >
                  <i
                    className={`fas ${
                      stato === "aperto"
                        ? "fa-circle-check"
                        : stato === "non_aperto"
                          ? "fa-clock"
                          : "fa-flag-checkered"
                    }`}
                    aria-hidden="true"
                  />
                  <span>
                    {stato === "aperto" && (
                      <>
                        <strong>Candidature aperte.</strong> C&apos;è tempo fino al{" "}
                        {CANDIDATURE_SCADENZA_LABEL}.
                      </>
                    )}
                    {stato === "non_aperto" && (
                      <>
                        <strong>Candidature dal {CANDIDATURE_APERTURA_LABEL}.</strong> Si chiudono il{" "}
                        {CANDIDATURE_SCADENZA_LABEL}. Intanto puoi leggere il bando e preparare i
                        materiali.
                      </>
                    )}
                    {stato === "chiuso" && (
                      <>
                        <strong>Candidature chiuse.</strong> Per le prossime iniziative scrivi a{" "}
                        {CONTATTI.fondazione.email}.
                      </>
                    )}
                  </span>
                </div>

                <div className="bd-azioni">
                  {stato === "aperto" ? (
                    <Link href="#candidatura" className="btn-primary text-center">
                      Candida il tuo progetto
                    </Link>
                  ) : (
                    <span className="bd-btn-spento" aria-disabled="true">
                      <i className="fas fa-lock" aria-hidden="true" />
                      {stato === "non_aperto"
                        ? `Candidature dal ${CANDIDATURE_APERTURA_LABEL}`
                        : "Candidature chiuse"}
                    </span>
                  )}
                  <Link href={`/eventi/${EVENT_SLUG}`} className="btn-outline text-center">
                    Torna all&apos;evento
                  </Link>
                </div>
              </div>

              <div className="bd-hero-img">
                <Image
                  src="/assets/images/eventi/vivere-piu-a-lungo/hero.webp"
                  alt="Il pubblico di una giornata della Fondazione bioERGOtech a Taranto"
                  width={1200}
                  height={800}
                  priority
                  sizes="(max-width: 940px) 100vw, 520px"
                />
                <span className="bd-hero-tag">
                  <i className="fas fa-microphone-lines" aria-hidden="true" />
                  Fino a {BANDO.postiTotali} progetti sul palco
                </span>
              </div>
            </div>

            <div className="bd-meta">
              {[
                { icon: "fa-calendar", label: "Showcase", value: BANDO.dataLabel },
                { icon: "fa-clock", label: "Orario", value: BANDO.orarioLabel },
                { icon: "fa-location-dot", label: "Luogo", value: BANDO.luogo },
                { icon: "fa-hourglass-half", label: "Scadenza", value: CANDIDATURE_SCADENZA_LABEL },
              ].map((box) => (
                <div key={box.label} className="bd-meta-box">
                  <div className="bd-meta-et">
                    <i className={`fas ${box.icon}`} aria-hidden="true" />
                    {box.label}
                  </div>
                  <div className="bd-meta-val">{box.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Indice ── */}
        <BandoIndice ctaLabel={stato === "aperto" ? "Candidati" : "Vai al modulo"} />

        {/* ── Premessa ── */}
        <section className="section" id="premessa">
          <div className="container mx-auto px-6">
            <Testata n={1} kicker="Premessa e finalità" articolo="Art. 1" titolo="Perché questo bando" />
            <div className="bd-testo">
              <p>
                Fondazione bioERGOtech, con la direzione scientifica, e SafesPro, in qualità di ente
                organizzatore, selezionano i progetti imprenditoriali che partecipano allo Showcase di
                Innovazione della seconda giornata dell&apos;evento &quot;Vivere più a lungo: sport e
                intelligenza artificiale&quot;.
              </p>
              <p>
                L&apos;iniziativa prosegue il percorso avviato con i Taranto Biotech Days 2024 e con
                l&apos;evento di Roma dell&apos;ottobre 2025 alla Sala della Regina di Palazzo
                Montecitorio, e l&apos;azione della Fondazione per l&apos;insediamento di un centro di
                ricerca a Taranto e la nascita di un ecosistema di impresa sul territorio.
              </p>
              <p>
                L&apos;obiettivo è dare visibilità e sostegno concreto ai progetti che applicano
                biotecnologie, robotica e intelligenza artificiale alla salute, alla longevità e allo
                sport, lungo le tre fasi in cui la Fondazione articola il proprio percorso: ideazione,
                produzione, distribuzione. Progetti in stadi diversi hanno bisogni diversi, e per
                questo le categorie di partecipazione sono tre, con criteri e premi distinti.
              </p>
            </div>

            <div className="bd-numeri">
              {numeri.map((s) => (
                <div key={s.et}>
                  <div className="bd-numero">{s.n}</div>
                  <div className="bd-numero-et">{s.et}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Categorie ── */}
        <section className="section bg-light-gray" id="categorie">
          <div className="container mx-auto px-6">
            <Testata n={2} kicker="Destinatari" articolo="Art. 2" titolo="Le tre categorie">
              Il bando è rivolto a team di ricerca, spin-off universitari, startup, PMI innovative e
              imprese, senza limiti di provenienza geografica. Si sceglie una sola categoria. Nel
              computo della raccolta rientrano equity, venture debt, strumenti convertibili e
              sovvenzioni competitive già erogate o deliberate.
            </Testata>

            <div className="bd-cats">
              {CATEGORIE_BANDO.map((c) => (
                <div key={c.id} className="bd-cat">
                  <div className="bd-cat-top">
                    <span className="bd-lettera" aria-hidden="true">
                      {c.id}
                    </span>
                    <div>
                      <span className="bd-cat-et">Categoria {c.id}</span>
                      <h3>{c.stadio}</h3>
                    </div>
                  </div>
                  <p className="bd-cat-sintesi">{c.sintesi}</p>
                  <p className="bd-cat-desc">{c.chiPuoCandidarsi}</p>
                  <div className="bd-cat-formato">
                    <div>
                      <b>{c.progettiAmmessi}</b>
                      <span>Sul palco</span>
                    </div>
                    <div>
                      <b>{c.durataPitch}</b>
                      <span>Pitch</span>
                    </div>
                    <div>
                      <b>{c.domande}</b>
                      <span>Domande</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="bd-nota" style={{ marginTop: 26 }}>
              {/* Lo spazio dopo l'espressione va scritto: il compilatore JSX toglie quello
                  in testa a un blocco di testo che va a capo. */}
              La soglia dei {EURO(SOGLIA_RACCOLTA_EUR)}{" "}
              riprende la struttura di membership della
              Fondazione, che distingue le realtà seed-stage da quelle in fase Series A e successive.
              La Commissione può riassegnare d&apos;ufficio una candidatura a una categoria diversa da
              quella indicata, quando ne ricorrano manifestamente i presupposti, dandone comunicazione
              all&apos;interessato prima della valutazione.
            </p>
          </div>
        </section>

        {/* ── Ambiti tematici ── */}
        <section className="section" id="ambiti">
          <div className="container mx-auto px-6">
            <Testata n={3} kicker="Ambiti tematici" articolo="Art. 4" titolo="Su che cosa lavoriamo">
              Sono ammessi i progetti che intervengono, con approccio scientifico o tecnologico, su uno
              o più di questi ambiti.
            </Testata>
            <div className="bd-schede">
              {AMBITI.map((a) => (
                <div key={a.value} className="bd-scheda">
                  <span className="bd-scheda-icona" aria-hidden="true">
                    <i className={`fas ${a.icona}`} />
                  </span>
                  <div>
                    <h3>{a.label}</h3>
                    <p>{a.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Cosa offre ── */}
        <section className="section bg-light-gray" id="vantaggi">
          <div className="container mx-auto px-6">
            <Testata n={4} kicker="Cosa offre il bando" articolo="Art. 7" titolo="Che cosa ottieni">
              Salire sul palco dello Showcase non è solo una vetrina: la partecipazione apre l&apos;accesso
              ai servizi e alla rete che la Fondazione mette a disposizione dei progetti selezionati.
            </Testata>
            <div className="bd-schede">
              {COSA_OFFRE.map((o) => (
                <div key={o.titolo} className="bd-scheda">
                  <span className="bd-scheda-icona" aria-hidden="true">
                    <i className={`fas ${o.icona}`} />
                  </span>
                  <div>
                    <h3>{o.titolo}</h3>
                    <p>{o.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Premi ── */}
        <section className="section" id="premi">
          <div className="container mx-auto px-6">
            <Testata n={5} kicker="Premi" articolo="Art. 8" titolo="Un vincitore per categoria">
              I premi hanno natura di servizi e di accesso a infrastrutture. Sono personali, non
              cedibili e non convertibili in denaro. La Commissione può assegnare menzioni speciali,
              prive di dotazione.
            </Testata>
            <div className="bd-premi">
              {PREMI.map((p) => (
                <div key={p.categoria} className="bd-premio">
                  <div className="bd-premio-top">
                    <span className="bd-lettera" aria-hidden="true">
                      <i className="fas fa-trophy" style={{ fontSize: 16 }} />
                    </span>
                    <span className="bd-premio-cat">
                      Categoria {p.categoria}
                      <b>{p.stadio}</b>
                    </span>
                  </div>
                  <h3>{p.titolo}</h3>
                  <ul>
                    {p.voci.map((v) => (
                      <li key={v}>
                        <i className="fas fa-circle-check" aria-hidden="true" />
                        <span>{v}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Criteri di valutazione ── */}
        <section className="section bg-light-gray" id="criteri">
          <div className="container mx-auto px-6">
            <Testata
              n={6}
              kicker="Criteri di valutazione"
              articolo="Art. 9"
              titolo="Come si assegnano i punti"
            >
              La valutazione si articola in due momenti: l&apos;istruttoria sulla documentazione, che
              determina l&apos;ammissione allo Showcase, e la valutazione finale dopo la presentazione
              dal vivo.
            </Testata>

            <div className="bd-chips">
              <span className="bd-chip">
                <i className="fas fa-star" aria-hidden="true" />
                <span>
                  <b>{PUNTEGGIO_MASSIMO} punti</b> il massimo attribuibile
                </span>
              </span>
              <span className="bd-chip">
                <i className="fas fa-circle-half-stroke" aria-hidden="true" />
                <span>
                  <b>{PUNTEGGIO_MINIMO} punti</b> la soglia sotto la quale il premio non viene assegnato
                </span>
              </span>
            </div>

            <div className="bd-criteri">
              {CATEGORIE_BANDO.map((c) => (
                <div key={c.id} className="bd-crit">
                  <div className="bd-crit-top">
                    <span className="bd-lettera-sm" aria-hidden="true">
                      {c.id}
                    </span>
                    <h3>{c.stadio}</h3>
                  </div>
                  {CRITERI[c.id].map((k) => (
                    <div key={k.criterio} className="bd-crit-voce">
                      <div className="bd-crit-riga">
                        <span className="bd-crit-nome">{k.criterio}</span>
                        <span className="bd-crit-punti">{k.punti} pt</span>
                      </div>
                      <div className="bd-crit-barra" aria-hidden="true">
                        <span style={{ width: `${(k.punti / PUNTI_MAX_CRITERIO) * 100}%` }} />
                      </div>
                      <p className="bd-crit-desc">{k.desc}</p>
                    </div>
                  ))}
                  <p className="bd-crit-nota">
                    A parità di punteggio prevale il progetto con il punteggio più alto in
                    &quot;{CRITERIO_DIRIMENTE[c.id]}&quot;.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Come candidarsi ── */}
        <section className="section" id="come-candidarsi">
          <div className="container mx-auto px-6">
            <Testata
              n={7}
              kicker="Come candidarsi"
              articolo="Art. 3 e 5"
              titolo="Requisiti e documentazione"
            />

            <div className="bd-due bd-due-panelli">
              <div className="bd-pannello">
                <h3 className="bd-sotto">Requisiti di ammissibilità</h3>
                <ul className="bd-lista">
                  {REQUISITI.map((r) => (
                    <li key={r}>
                      <i className="fas fa-circle-check" aria-hidden="true" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
                <p className="bd-nota" style={{ marginTop: 20 }}>
                  Non sono ammessi progetti già presentati in edizioni precedenti dello stesso evento
                  in assenza di avanzamenti sostanziali documentabili. La partecipazione è gratuita.
                </p>
              </div>
              <div className="bd-pannello">
                <h3 className="bd-sotto">Documentazione da allegare</h3>
                <ul className="bd-lista">
                  {ALLEGATI.map((a) => (
                    <li key={a.campo}>
                      <i className="fas fa-file-pdf" aria-hidden="true" />
                      <span>
                        <b>{a.titolo}</b>
                        {a.obbligatorioPer.length > 0 ? (
                          <span className="bd-tag bd-tag-obb">
                            Obbligatorio {a.obbligatorioPer.join(" ")}
                          </span>
                        ) : (
                          <span className="bd-tag bd-tag-fac">Facoltativo</span>
                        )}
                        <br />
                        {a.desc}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="bd-nota" style={{ marginTop: 20 }}>
                  Tutti gli allegati vanno caricati in formato PDF, fino a {MAX_FILE_LABEL} ciascuno. È
                  possibile indicare anche un video dimostrativo di durata non superiore a{" "}
                  {VIDEO_DURATA_MAX}. Il modulo di candidatura previsto dal bando è il form in fondo
                  alla pagina: non serve allegarlo a parte.
                </p>
              </div>
            </div>

            <div className="bd-due" style={{ marginTop: 56 }}>
              <div>
                <h3 className="bd-sotto">Il calendario della procedura</h3>
                <p className="bd-nota">
                  Dalla candidatura alla premiazione passano poco più di tre mesi. Le date sono quelle
                  dell&apos;art. 5: gli organizzatori possono prorogarle, dandone comunicazione tramite
                  i canali ufficiali.
                </p>
              </div>
              <ol className="bd-tappe">
                {CALENDARIO.map((c, i) => (
                  <li
                    key={c.fase}
                    className={`bd-tappa${stato === "aperto" && i === 0 ? " bd-tappa-ora" : ""}`}
                  >
                    <span className="bd-tappa-n" aria-hidden="true">
                      {i + 1}
                    </span>
                    <div className="bd-tappa-txt">
                      <div className="bd-tappa-fase">
                        {c.fase}
                        {stato === "aperto" && i === 0 ? <span className="bd-ora">In corso</span> : null}
                      </div>
                      <div className="bd-tappa-data">{c.data}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ── Lo Showcase ── */}
        <section className="section bg-light-gray" id="showcase">
          <div className="container mx-auto px-6">
            <Testata n={8} kicker="Svolgimento" articolo="Art. 6" titolo="La giornata dello Showcase">
              Lo Showcase si svolge {BANDO.dataLabel.toLowerCase()}, dalle {BANDO.orarioLabel}, al{" "}
              {BANDO.luogo}, davanti a investitori, partner industriali, istituzioni e pubblico.
            </Testata>

            <div className="bd-testo" style={{ marginBottom: 34 }}>
              <p>
                Sono ammessi alla presentazione dal vivo fino a {BANDO.postiTotali}{" "}
                progetti. Gli organizzatori possono rimodulare il numero per categoria in funzione della qualità e
                del numero delle candidature, fermo restando il massimo complessivo. Ai progetti non
                ammessi al palco può essere offerta, ove disponibile, la partecipazione all&apos;area
                espositiva.
              </p>
            </div>
            <div className="bd-formato">
              {CATEGORIE_BANDO.map((c) => (
                <div key={c.id} className="bd-formato-riga">
                  <div className="bd-formato-cat">
                    <span className="bd-lettera-sm" aria-hidden="true">
                      {c.id}
                    </span>
                    <b>{c.stadio}</b>
                  </div>
                  <div className="bd-formato-cella">
                    <b>{c.progettiAmmessi}</b>
                    <span>Progetti sul palco</span>
                  </div>
                  <div className="bd-formato-cella">
                    <b>{c.durataPitch}</b>
                    <span>Durata del pitch</span>
                  </div>
                  <div className="bd-formato-cella">
                    <b>{c.domande}</b>
                    <span>Domande</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Commissione, proprietà intellettuale ── */}
        <section className="section" id="regole">
          <div className="container mx-auto px-6">
            <Testata
              n={9}
              kicker="Commissione e tutele"
              articolo="Art. 10 e 11"
              titolo="Chi valuta, e che cosa resta tuo"
            />
            <div className="bd-due bd-due-panelli">
              <div className="bd-pannello">
                <h3 className="bd-sotto">Chi valuta</h3>
                <p className="bd-testo" style={{ fontSize: 14.5, marginBottom: 20 }}>
                  La Commissione è nominata congiuntamente da Fondazione bioERGOtech e SafesPro ed è
                  composta da un numero dispari di membri, non inferiore a 5 e non superiore a 9.
                </p>
                <ul className="bd-lista">
                  {COMMISSIONE.map((m) => (
                    <li key={m}>
                      <i className="fas fa-user-check" aria-hidden="true" />
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
                <p className="bd-nota" style={{ marginTop: 22 }}>
                  Le sedute sono valide con la maggioranza dei membri con diritto di voto e le decisioni
                  si assumono a maggioranza dei presenti. Ogni componente dichiara eventuali conflitti
                  di interesse e si astiene dalla relativa valutazione. Le valutazioni della Commissione
                  sono insindacabili e non sono ammessi ricorsi.
                </p>
              </div>
              <div className="bd-pannello">
                <h3 className="bd-sotto">Le tue idee restano tue</h3>
                <p className="bd-testo" style={{ fontSize: 14.5, marginBottom: 22 }}>
                  La partecipazione non comporta alcun trasferimento di diritti di proprietà
                  intellettuale in favore di Fondazione bioERGOtech, di SafesPro o dei membri della
                  Commissione. Ogni proponente resta titolare esclusivo delle proprie idee, dei propri
                  dati e dei propri titoli di privativa.
                </p>
                <div className="bd-avviso">
                  <i className="fas fa-triangle-exclamation" aria-hidden="true" />
                  <p>
                    Lo Showcase si svolge in seduta pubblica e può essere ripreso e diffuso. Non
                    divulgare dal palco informazioni coperte da segreto industriale o suscettibili di
                    pregiudicare la brevettabilità delle tue soluzioni. Gli organizzatori non
                    sottoscrivono accordi di riservatezza per la fase di presentazione pubblica.
                  </p>
                </div>
                <p className="bd-nota" style={{ marginTop: 22 }}>
                  La documentazione trasmessa in sede di candidatura è trattata in via riservata dai
                  componenti della Commissione e utilizzata ai soli fini della valutazione. I dati
                  personali sono trattati ai sensi del Regolamento (UE) 2016/679, per le sole finalità
                  connesse alla gestione del bando e dell&apos;evento.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Candidatura ── */}
        <section className="section bg-light-gray" id="candidatura">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              <div>
                <Testata
                  n={10}
                  kicker="Modulo di candidatura"
                  articolo="Art. 5"
                  titolo={stato === "aperto" ? "Candida il tuo progetto" : "Il modulo di candidatura"}
                />
                {stato === "aperto" ? (
                  <>
                    <p className="bd-intro" style={{ marginBottom: 26 }}>
                      Sei passi, dieci minuti se hai i materiali pronti. La candidatura è gratuita e
                      resta modificabile fino al {CANDIDATURE_SCADENZA_LABEL}.
                    </p>
                    <ol className="bd-passi">
                      {[
                        "Scegli la categoria: A ideazione, B creazione d'impresa, C raccolta di capitale.",
                        "Racconta il progetto: problema, soluzione, avanzamento, impatto e aspetti etici.",
                        "Carica descrizione e pitch deck in PDF, più la documentazione richiesta dalla tua categoria.",
                        "Ricevi il codice della candidatura via email, con il calendario della procedura.",
                      ].map((t, i) => (
                        <li key={t}>
                          <span className="bd-passo-n" aria-hidden="true">
                            {i + 1}
                          </span>
                          <p>{t}</p>
                        </li>
                      ))}
                    </ol>
                    <div className="bd-fatti" style={{ marginTop: 26, marginBottom: 0 }}>
                      <span className="bd-fatto">
                        <i className="fas fa-euro-sign" aria-hidden="true" /> Nessun costo
                      </span>
                      <span className="bd-fatto">
                        <i className="fas fa-pen-to-square" aria-hidden="true" /> Modificabile fino alla
                        scadenza
                      </span>
                      <span className="bd-fatto">
                        <i className="fas fa-lock" aria-hidden="true" /> Allegati riservati alla
                        Commissione
                      </span>
                    </div>
                  </>
                ) : stato === "non_aperto" ? (
                  <p className="bd-intro">
                    Il modulo si apre il {CANDIDATURE_APERTURA_LABEL} e resta disponibile fino al{" "}
                    {CANDIDATURE_SCADENZA_LABEL}. Nel frattempo puoi preparare la descrizione del
                    progetto e il pitch deck: sono i due allegati richiesti a tutte le categorie.
                  </p>
                ) : (
                  <p className="bd-intro">
                    Le candidature si sono chiuse il {CANDIDATURE_SCADENZA_LABEL}. Per informazioni
                    sulle prossime iniziative scrivi a {CONTATTI.fondazione.email}.
                  </p>
                )}
              </div>

              {formVisibile ? (
                <BandoForm anteprimaStaff={anteprimaStaff} />
              ) : (
                <div className="card" style={{ textAlign: "center", padding: 40 }}>
                  <span
                    className="bd-lettera"
                    style={{ width: 56, height: 56, margin: "0 auto", fontSize: 22 }}
                    aria-hidden="true"
                  >
                    <i className={`fas ${stato === "non_aperto" ? "fa-hourglass-half" : "fa-flag-checkered"}`} />
                  </span>
                  <h3 className="text-xl font-bold text-gray-800 mt-5 mb-2">
                    {stato === "non_aperto" ? "Non è ancora il momento" : "Candidature chiuse"}
                  </h3>
                  <p className="text-gray-600">
                    {stato === "non_aperto"
                      ? `Torna dal ${CANDIDATURE_APERTURA_LABEL} per inviare la tua candidatura.`
                      : "Grazie a tutti i progetti che si sono candidati."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="section" id="faq">
          <div className="container mx-auto px-6">
            <h2 className="section-title text-center" style={{ marginBottom: 36 }}>
              Domande frequenti
            </h2>
            <div className="bd-faq">
              {FAQ_BANDO.map((f) => (
                <details key={f.q}>
                  <summary>
                    <span>{f.q}</span>
                    <i className="fas fa-chevron-down" aria-hidden="true" />
                  </summary>
                  <div className="bd-faq-risposta">{f.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Contatti ── */}
        <section className="section bg-light-gray" id="contatti">
          <div className="container mx-auto px-6">
            <Testata n={11} kicker="Contatti" articolo="Art. 12" titolo="Chi risponde" />
            <div className="bd-contatti">
              <div className="bd-contatto">
                <span className="bd-contatto-icona" aria-hidden="true">
                  <i className="fas fa-flask-vial" />
                </span>
                <div className="bd-contatto-ruolo">{CONTATTI.fondazione.ruolo}</div>
                <h3>{CONTATTI.fondazione.nome}</h3>
                <a href={`mailto:${CONTATTI.fondazione.email}`}>{CONTATTI.fondazione.email}</a>
                <p>Sede della Fondazione: {CONTATTI.sede}.</p>
              </div>
              <div className="bd-contatto">
                <span className="bd-contatto-icona" aria-hidden="true">
                  <i className="fas fa-building-columns" />
                </span>
                <div className="bd-contatto-ruolo">{CONTATTI.organizzazione.ruolo}</div>
                <h3>SafesPro</h3>
                <a href={`mailto:${CONTATTI.organizzazione.email}`}>{CONTATTI.organizzazione.email}</a>
                <p>
                  Telefono {CONTATTI.telefono.numero}. {CONTATTI.telefono.riferimento}
                </p>
              </div>
            </div>

            {stato === "aperto" && (
              <div className="bd-chiusura">
                <div>
                  <h3>Hai tutto quello che serve?</h3>
                  <p>
                    La candidatura è gratuita e resta modificabile fino al {CANDIDATURE_SCADENZA_LABEL}.
                  </p>
                </div>
                <Link href="#candidatura" className="btn-primary text-center whitespace-nowrap">
                  Vai al modulo
                </Link>
              </div>
            )}

            <p className="bd-nota" style={{ marginTop: stato === "aperto" ? 0 : 34 }}>
              La partecipazione al bando implica l&apos;accettazione integrale delle sue
              disposizioni. Gli organizzatori si riservano di
              modificare i termini del calendario, il numero dei progetti ammessi e le modalità di
              svolgimento dello Showcase per ragioni organizzative, di prorogarne i termini o di non
              dare corso alla procedura, dandone comunicazione tramite i canali ufficiali.{" "}
              {BANDO.emanato}.
            </p>
          </div>
        </section>
      </div>

      <SiteFooter />
    </>
  );
}
