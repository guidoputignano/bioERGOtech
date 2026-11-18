/**
 * Lo stile del pannello iscrizioni, con il prefisso `.eva` (evento admin)
 * così non tocca il resto del sito. Riprende il sistema del sito: Poppins,
 * il verde acqua per azioni e accenti, card bianche su fondo chiaro.
 *
 * Pensato prima per il telefono: lo staff alla porta lo usa da lì. Tutti i
 * comandi sono alti almeno 44px, i campi hanno il testo a 16px (iOS non
 * ingrandisce la pagina), il focus si vede sempre.
 *
 * Il verde acqua pieno (#2EC4B6) con il testo bianco non ha abbastanza
 * contrasto: per i pulsanti pieni si usa la sua tinta scura (#0F766E).
 */
export const STILE_PANNELLO = `
.eva {
  --eva-teal-ink: #0F766E;
  --eva-teal-ink-hover: #0B5F58;
  --eva-ok: #0F6E56; --eva-ok-bg: #E1F5EE;
  --eva-attesa: #92400E; --eva-attesa-bg: #FEF3C7;
  --eva-errore: #B42318; --eva-errore-bg: #FEF0EE; --eva-errore-bordo: #F6CBC5;
  --eva-neutro: #475467; --eva-neutro-bg: #EEF1F5;
  --eva-linea: #EEF2F6;
  color: var(--text-dark);
}
.eva *:focus-visible { outline: 3px solid var(--primary); outline-offset: 2px; }
.eva .num, .eva [data-num] { font-variant-numeric: tabular-nums; }

/* ── Intestazione ── */
.eva-kicker {
  font-size: 11.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
  color: var(--eva-teal-ink);
}
.eva-h1 { font-size: 26px; font-weight: 800; line-height: 1.2; margin: 6px 0 4px; color: var(--text-dark); }
@media (min-width: 768px) { .eva-h1 { font-size: 32px; } }
.eva-intro { font-size: 14.5px; color: var(--text-mid); margin: 0; }

/* ── Schede ── */
.eva-schede {
  position: sticky; top: 78px; z-index: 30;
  display: flex; gap: 4px; padding: 6px;
  background: rgba(255,255,255,.97); backdrop-filter: blur(8px);
  border: 1px solid var(--border-color); border-radius: 14px;
  box-shadow: 0 4px 16px rgba(26,35,50,.06);
  overflow-x: auto; scrollbar-width: none;
}
.eva-schede::-webkit-scrollbar { display: none; }
.eva-scheda {
  flex: 1 0 auto; min-height: 44px; display: inline-flex; align-items: center; justify-content: center;
  gap: 8px; padding: 0 14px; border: 0; border-radius: 10px; background: transparent;
  color: var(--text-mid); font: inherit; font-size: 14px; font-weight: 600; white-space: nowrap; cursor: pointer;
  transition: background .15s ease, color .15s ease;
}
.eva-scheda i { color: var(--text-light); transition: color .15s ease; }
.eva-scheda:hover { background: var(--bg-light); color: var(--text-dark); }
.eva-scheda[aria-selected="true"] { background: var(--primary-light); color: var(--text-dark); }
.eva-scheda[aria-selected="true"] i { color: var(--eva-teal-ink); }
/* Sul telefono le quattro schede stanno in una riga: icona sopra, testo sotto. */
@media (max-width: 520px) {
  .eva-schede { gap: 2px; padding: 4px; }
  .eva-scheda { flex: 1 1 0; flex-direction: column; gap: 3px; min-height: 52px; padding: 6px 4px; font-size: 12px; }
  .eva-scheda i { font-size: 15px; }
}

/* ── Superfici ── */
.eva-box {
  background: #fff; border: 1px solid var(--border-color); border-radius: 16px;
  padding: 18px; box-shadow: 0 2px 8px rgba(26,35,50,.04); min-width: 0;
}
@media (min-width: 768px) { .eva-box { padding: 24px; } }
.eva-h2 { font-size: 17px; font-weight: 700; color: var(--text-dark); margin: 0; line-height: 1.35; }
.eva-sub { font-size: 13.5px; color: var(--text-mid); margin: 4px 0 0; line-height: 1.55; }
.eva-nota { font-size: 12.5px; color: var(--text-mid); }
/* Colonne minmax(0, 1fr): una tabella o un grafico larghi scorrono dentro la
   loro scheda, invece di allargare la colonna e la pagina sul telefono. */
.eva-griglia { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); }
.eva-griglia > * { min-width: 0; }
@media (min-width: 900px) { .eva-griglia-2 { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }

/* ── Pulsanti ── */
.eva-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 44px; padding: 0 16px; border-radius: 10px;
  border: 1.5px solid var(--border-color); background: #fff; color: var(--text-dark);
  font: inherit; font-size: 14px; font-weight: 600; line-height: 1.2; text-align: center;
  cursor: pointer; text-decoration: none;
  transition: border-color .15s ease, background .15s ease, color .15s ease;
}
.eva-btn:hover { border-color: var(--primary); color: var(--eva-teal-ink); }
.eva-btn i { font-size: 13px; }
.eva-btn[disabled], .eva-btn[aria-disabled="true"] { opacity: .55; cursor: not-allowed; }
.eva-btn-primario { background: var(--eva-teal-ink); border-color: var(--eva-teal-ink); color: #fff; }
.eva-btn-primario:hover { background: var(--eva-teal-ink-hover); border-color: var(--eva-teal-ink-hover); color: #fff; }
.eva-btn-pericolo { color: var(--eva-errore); border-color: var(--eva-errore-bordo); }
.eva-btn-pericolo:hover { background: var(--eva-errore-bg); border-color: var(--eva-errore); color: var(--eva-errore); }
.eva-btn-pieno-pericolo { background: var(--eva-errore); border-color: var(--eva-errore); color: #fff; }
.eva-btn-pieno-pericolo:hover { background: #8F1B12; border-color: #8F1B12; color: #fff; }
.eva-btn-link {
  min-height: 44px; display: inline-flex; align-items: center; gap: 6px; padding: 0 4px;
  border: 0; background: none; color: var(--eva-teal-ink); font: inherit; font-size: 14px; font-weight: 600;
  cursor: pointer; text-decoration: none;
}
.eva-btn-link:hover { text-decoration: underline; }
.eva-azioni { display: flex; flex-wrap: wrap; gap: 8px; }

/* ── Campi ── */
.eva-label { display: block; font-size: 12.5px; font-weight: 600; color: var(--text-mid); margin-bottom: 6px; }
.eva-campo {
  width: 100%; min-height: 44px; padding: 0 12px; border-radius: 10px;
  border: 1.5px solid var(--border-color); background: #fff; color: var(--text-dark);
  font: inherit; font-size: 16px;
}
.eva-campo:focus { border-color: var(--primary); outline: none; box-shadow: 0 0 0 3px rgba(46,196,182,.25); }
.eva-cerca { position: relative; }
.eva-cerca > i { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-light); pointer-events: none; }
.eva-cerca .eva-campo { padding-left: 40px; padding-right: 44px; }
.eva-cerca-svuota {
  position: absolute; right: 2px; top: 50%; transform: translateY(-50%);
  width: 40px; height: 40px; border: 0; background: none; border-radius: 8px;
  color: var(--text-light); cursor: pointer;
}
.eva-cerca-svuota:hover { color: var(--text-dark); }
.eva-chiudi {
  flex-shrink: 0; width: 40px; height: 40px; margin: -8px -8px -8px 0; border: 0; background: none;
  border-radius: 8px; color: inherit; opacity: .7; cursor: pointer;
}
.eva-chiudi:hover { opacity: 1; background: rgba(255,255,255,.6); }
/* La ricerca su una riga sua, i quattro menu sotto: a 1280px ogni menu ha
   spazio per la sua etichetta intera. Tutto su una riga solo da 1536px. */
.eva-filtri { display: grid; gap: 12px; grid-template-columns: minmax(0, 1fr); }
@media (min-width: 640px) {
  .eva-filtri { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .eva-filtri > :first-child { grid-column: 1 / -1; }
}
@media (min-width: 1024px) { .eva-filtri { grid-template-columns: repeat(4, minmax(0, 1fr)); align-items: end; } }
@media (min-width: 1536px) {
  .eva-filtri { grid-template-columns: minmax(0, 2.2fr) repeat(4, minmax(0, 1fr)); }
  .eva-filtri > :first-child { grid-column: auto; }
}

/* ── Avvisi ── */
.eva-avviso {
  display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px; border-radius: 12px;
  border: 1px solid; font-size: 14px; line-height: 1.55;
}
.eva-avviso > i { margin-top: 3px; flex-shrink: 0; }
.eva-avviso strong { font-weight: 700; }
.eva-avviso-errore { background: var(--eva-errore-bg); border-color: var(--eva-errore-bordo); color: #6B1A12; }
.eva-avviso-errore > i { color: var(--eva-errore); }
.eva-avviso-attenzione { background: #FFF8E6; border-color: #F3DDA2; color: #5C3D05; }
.eva-avviso-attenzione > i { color: #B45309; }
.eva-avviso-info { background: #EAF8F6; border-color: #BEE7E1; color: #0B4F49; }
.eva-avviso-info > i { color: var(--eva-teal-ink); }
.eva-avviso-ok { background: var(--eva-ok-bg); border-color: #B7E4D3; color: #0B4D3D; }
.eva-avviso-ok > i { color: var(--eva-ok); }
.eva-avviso code { font-size: 12.5px; background: rgba(255,255,255,.7); padding: 1px 6px; border-radius: 6px; word-break: break-all; }

/* ── Numeri ── */
.eva-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
@media (min-width: 640px) { .eva-stats-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.eva-stat { background: var(--bg-light); border-radius: 12px; padding: 12px 14px; min-width: 0; }
.eva-stat-n {
  font-size: 30px; font-weight: 800; line-height: 1.1; color: var(--text-dark);
  font-variant-numeric: tabular-nums; letter-spacing: -.01em;
}
.eva-stat-n small { font-size: 15px; font-weight: 600; color: var(--text-mid); letter-spacing: 0; }
.eva-stat-l {
  display: flex; align-items: center; gap: 6px; margin-top: 4px;
  font-size: 12.5px; font-weight: 600; color: var(--text-mid);
}
.eva-dot { width: 8px; height: 8px; border-radius: 999px; flex-shrink: 0; }
.eva-assente-db { font-size: 14px; font-weight: 700; color: var(--eva-errore); line-height: 1.3; }

/* ── Giornata ── */
.eva-giornata-testa { display: flex; gap: 14px; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; }
.eva-giornata-data { font-size: 21px; font-weight: 800; line-height: 1.2; color: var(--text-dark); margin: 0; }
.eva-barra { height: 10px; border-radius: 999px; background: var(--eva-linea); overflow: hidden; margin: 14px 0 6px; }
.eva-barra > span { display: block; height: 100%; border-radius: 999px; background: var(--primary); transition: width .5s ease; }
.eva-barra-piena > span { background: var(--eva-teal-ink); }
.eva-barra-legenda { display: flex; justify-content: space-between; gap: 8px; font-size: 12.5px; color: var(--text-mid); }

/* ── Etichette di stato ── */
.eva-pill {
  display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 999px;
  font-size: 12px; font-weight: 700; line-height: 1.5; white-space: nowrap;
}
.eva-pill-ok { background: var(--eva-ok-bg); color: var(--eva-ok); }
.eva-pill-attesa { background: var(--eva-attesa-bg); color: var(--eva-attesa); }
.eva-pill-neutro { background: var(--eva-neutro-bg); color: var(--eva-neutro); }
.eva-pill-errore { background: var(--eva-errore-bg); color: var(--eva-errore); }
.eva-pill-teal { background: var(--primary-light); color: var(--eva-teal-ink); }

/* ── Grafico delle iscrizioni ── */
/* Sul telefono il grafico tiene una larghezza minima e scorre dentro la sua
   scheda. Le etichette ai bordi si ancorano verso l'interno, così niente
   esce dal grafico e non nasce uno scorrimento vuoto. */
.eva-grafico { position: relative; margin-top: 18px; overflow-x: auto; overflow-y: hidden; -webkit-overflow-scrolling: touch; }
.eva-grafico-tela { position: relative; min-width: 420px; }
.eva-grafico-area {
  display: flex; align-items: flex-end; gap: 3px; height: 150px; padding-top: 20px;
  border-bottom: 1px solid #CBD5E1;
}
.eva-col { position: relative; flex: 1 1 0; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; min-width: 0; }
.eva-col-barra { width: 100%; max-width: 26px; border-radius: 4px 4px 0 0; background: var(--primary); }
.eva-col-oggi .eva-col-barra { background: var(--eva-teal-ink); }
.eva-col-v { font-size: 11.5px; font-weight: 700; color: var(--text-dark); margin-bottom: 3px; font-variant-numeric: tabular-nums; }
.eva-col-tip {
  position: absolute; bottom: calc(100% - 14px); left: 50%; transform: translateX(-50%);
  background: var(--text-dark); color: #fff; font-size: 12px; font-weight: 600; white-space: nowrap;
  padding: 4px 8px; border-radius: 6px; opacity: 0; pointer-events: none; transition: opacity .12s ease; z-index: 2;
}
.eva-col:nth-child(-n+4) .eva-col-tip { left: 0; transform: none; }
.eva-col:nth-last-child(-n+4) .eva-col-tip { left: auto; right: 0; transform: none; }
.eva-col:hover .eva-col-tip { opacity: 1; }
.eva-col:hover .eva-col-barra { filter: brightness(.92); }
.eva-grafico-asse { display: flex; gap: 3px; margin-top: 6px; }
.eva-grafico-asse span {
  flex: 1 1 0; min-width: 0; text-align: center; font-size: 11px; color: var(--text-mid);
  white-space: nowrap; overflow: visible;
}
.eva-grafico-asse span:first-child { text-align: left; }
.eva-grafico-asse span:last-child { direction: rtl; text-align: right; }
.eva-grafico-guida {
  position: absolute; left: 0; right: 0; border-top: 1px dashed #E2E8F0; pointer-events: none;
}
.eva-grafico-guida span { position: absolute; right: 0; top: -16px; font-size: 11px; color: var(--text-light); }

/* ── Tabelle ── */
.eva-scorri { overflow-x: auto; -webkit-overflow-scrolling: touch; margin: 0 -4px; padding: 0 4px; }
.eva-tabella { width: 100%; border-collapse: collapse; font-size: 14px; }
.eva-tabella caption { text-align: left; }
.eva-tabella th {
  text-align: left; font-size: 11.5px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase;
  color: var(--text-mid); padding: 10px 10px; border-bottom: 1px solid var(--border-color); white-space: nowrap;
}
.eva-tabella td { padding: 11px 10px; border-bottom: 1px solid #F1F4F8; vertical-align: top; }
.eva-tabella tbody th {
  text-transform: none; letter-spacing: 0; font-size: 14px; font-weight: 600; color: var(--text-dark);
  padding: 11px 10px; border-bottom: 1px solid #F1F4F8; vertical-align: top; white-space: normal;
}
.eva-tabella tbody tr:last-child th { border-bottom: 0; }
.eva-tabella tbody tr:last-child td { border-bottom: 0; }
.eva-tabella tfoot td { border-top: 1px solid var(--border-color); border-bottom: 0; font-weight: 700; }
.eva-tabella .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.eva-tabella th.num { text-align: right; }
.eva-tabella .sotto { display: block; font-size: 11.5px; color: var(--eva-attesa); font-weight: 600; }
.eva-quota { display: block; height: 4px; border-radius: 999px; background: var(--primary); margin-top: 6px; opacity: .75; }

/* ── Schede persona ── */
.eva-persone { display: grid; gap: 12px; }
.eva-persona {
  background: #fff; border: 1px solid var(--border-color); border-radius: 14px; padding: 16px;
  box-shadow: 0 1px 4px rgba(26,35,50,.03); min-width: 0;
}
@media (min-width: 768px) { .eva-persona { padding: 20px 22px; } }
.eva-persona-testa { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 8px 12px; }
.eva-persona-nome { font-size: 17px; font-weight: 700; line-height: 1.3; margin: 0; color: var(--text-dark); overflow-wrap: anywhere; }
.eva-dettagli { display: grid; gap: 4px 18px; margin-top: 8px; font-size: 14px; color: var(--text-mid); }
@media (min-width: 768px) { .eva-dettagli { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.eva-dettagli > span, .eva-dettagli > a { display: flex; gap: 8px; align-items: baseline; min-width: 0; overflow-wrap: anywhere; }
.eva-dettagli i { width: 14px; text-align: center; color: var(--text-light); font-size: 12px; flex-shrink: 0; }
.eva-dettagli a { color: var(--text-mid); text-decoration: none; }
.eva-dettagli a:hover { color: var(--eva-teal-ink); text-decoration: underline; }
.eva-codice {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; font-weight: 600;
  color: var(--text-dark); background: var(--bg-light); border: 1px solid var(--border-color);
  border-radius: 6px; padding: 2px 8px; white-space: nowrap;
}
.eva-note {
  margin-top: 10px; padding: 10px 12px; border-radius: 10px; background: #FFFBEB; border: 1px solid #F6E7B5;
  font-size: 13.5px; color: #5C3D05; line-height: 1.55; white-space: pre-wrap; overflow-wrap: anywhere;
}
.eva-giornate { display: grid; gap: 10px; margin-top: 14px; }
.eva-g {
  border-radius: 12px; background: var(--bg-light); padding: 12px; display: grid; gap: 10px;
}
@media (min-width: 900px) { .eva-g { grid-template-columns: minmax(0, 1fr) auto; align-items: center; } }
.eva-g-testa { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; }
.eva-g-data { font-size: 15px; font-weight: 700; color: var(--text-dark); }
.eva-g-ora { font-size: 12.5px; color: var(--text-mid); }
.eva-g-comandi { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.eva-persona-piede {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px;
  margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--eva-linea);
}

/* ── Presenza: tre stati, uno scelto ── */
.eva-seg { display: inline-flex; border: 1.5px solid var(--border-color); border-radius: 10px; overflow: hidden; background: #fff; }
.eva-seg button {
  min-height: 42px; padding: 0 12px; border: 0; border-left: 1.5px solid var(--border-color);
  background: #fff; color: var(--text-mid); font: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px;
}
.eva-seg button:first-child { border-left: 0; }
.eva-seg button:hover { background: var(--bg-light); color: var(--text-dark); }
.eva-seg button[aria-pressed="true"][data-stato="presente"] { background: var(--eva-ok); color: #fff; }
.eva-seg button[aria-pressed="true"][data-stato="assente"] { background: var(--eva-errore); color: #fff; }
.eva-seg button[aria-pressed="true"][data-stato="registrato"] { background: var(--eva-neutro); color: #fff; }
.eva-seg button[disabled] { cursor: progress; }
/* Sul telefono i tre stati occupano la riga intera, divisi in parti uguali. */
@media (max-width: 480px) {
  .eva-g-comandi > .eva-seg { display: flex; width: 100%; }
  .eva-seg button { flex: 1 1 0; min-width: 0; justify-content: center; padding: 0 6px; font-size: 13px; }
  .eva-seg button i:not(.fa-spinner) { display: none; }
}
@media (max-width: 360px) {
  .eva-seg button { padding: 0 4px; font-size: 12.5px; }
}

/* ── Conferme in linea ── */
.eva-chiedi {
  margin-top: 12px; padding: 14px; border-radius: 12px; border: 1.5px solid; font-size: 14px; line-height: 1.55;
}
.eva-chiedi-normale { border-color: #BEE7E1; background: #F3FBFA; }
.eva-chiedi-pericolo { border-color: var(--eva-errore-bordo); background: #FFF7F6; }
.eva-chiedi p { margin: 0 0 10px; }
.eva-esito { margin-top: 10px; font-size: 13.5px; line-height: 1.5; display: flex; gap: 8px; align-items: flex-start; }
.eva-esito-ok { color: var(--eva-ok); }
.eva-esito-errore { color: var(--eva-errore); }
.eva-esito-attenzione { color: #92400E; }
.eva-esito i { margin-top: 3px; }

/* ── Scheletri di caricamento: stessa altezza del contenuto, niente salti ── */
.eva-scheletro {
  border-radius: 12px; background: linear-gradient(90deg, #EEF2F6 0%, #F7F9FC 50%, #EEF2F6 100%);
  background-size: 200% 100%; animation: eva-luce 1.4s ease-in-out infinite;
}
@keyframes eva-luce { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
@media (prefers-reduced-motion: reduce) {
  .eva-scheletro { animation: none; }
  .eva-barra > span { transition: none; }
}
`;
