/**
 * Lo stile della pagina della classe: lo stesso biglietto della pagina
 * biglietto/[code] (prefisso vcl-) e la sezione "Gestisci" (prefisso vcg-).
 * Il riquadro dei numeri usa i controlli del modulo delle scuole
 * (STILE_MODULO e STILE_MODULO_CLASSI, dentro un .vpl-wrap).
 *
 * Un modulo semplice, senza "use client": lo legge la pagina server.
 */

export const STILE_CLASSE = `
.vcl-pagina { background: var(--bg-light); padding: 96px 16px 56px; min-height: 70vh; }
.vcl-contenitore { max-width: 600px; margin: 0 auto; }
/* main.css riporta .btn-primary e .btn-outline a inline-block: senza flex e gap
   icona e testo restano attaccati. */
.vcl-pagina .vcl-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; text-decoration: none; }
.vcl-pagina a:focus-visible, .vcl-pagina button:focus-visible { outline: 3px solid var(--primary-dark); outline-offset: 2px; }

/* Il biglietto della classe */
.vcl-biglietto { background: #fff; border: 1px solid var(--border-color); border-top: 4px solid var(--primary); border-radius: 18px; box-shadow: var(--shadow); overflow: hidden; }
.vcl-testa { padding: 20px 24px 0; text-align: center; }
.vcl-occhiello { margin: 0; color: var(--primary-dark); font-size: 0.75rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
.vcl-evento { margin: 6px 0 0; color: var(--text-dark); font-size: 1rem; font-weight: 700; line-height: 1.4; }
.vcl-quando { margin: 2px 0 0; color: var(--text-light); font-size: 0.8125rem; }
.vcl-corpo { padding: 20px 24px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; }
.vcl-etichetta { margin: 0; color: var(--text-light); font-size: 0.75rem; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
.vcl-nome { margin: 4px 0 2px; color: var(--text-dark); font-size: 1.625rem; line-height: 1.25; font-weight: 700; overflow-wrap: anywhere; }
.vcl-scuola { margin: 0; color: var(--text-mid); font-size: 1rem; line-height: 1.5; overflow-wrap: anywhere; }
.vcl-fatti { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; width: 100%; margin: 16px 0 0; padding: 12px 14px; border-radius: 12px; background: var(--bg-light); text-align: left; }
.vcl-fatto { display: flex; gap: 10px; align-items: baseline; min-width: 0; }
.vcl-fatto dt { flex: none; color: var(--text-light); font-size: 0.75rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; min-width: 72px; }
.vcl-fatto dd { margin: 0; color: var(--text-dark); font-size: 0.9375rem; font-weight: 600; line-height: 1.45; overflow-wrap: anywhere; min-width: 0; }
.vcl-qr { margin-top: 18px; padding: 12px; background: #fff; border: 1px solid var(--border-color); border-radius: 16px; width: 266px; max-width: 100%; aspect-ratio: 1 / 1; display: flex; align-items: center; justify-content: center; }
.vcl-qr img { display: block; width: 240px; height: auto; max-width: 100%; aspect-ratio: 1 / 1; }
.vcl-codice-etichetta { margin: 16px 0 0; color: var(--text-light); font-size: 0.75rem; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
.vcl-codice { margin: 2px 0 0; color: var(--text-dark); font-size: 1.5rem; font-weight: 800; letter-spacing: .12em; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; overflow-wrap: anywhere; }
.vcl-aiuto { margin: 8px 0 0; color: var(--text-mid); font-size: 0.875rem; line-height: 1.55; max-width: 36ch; }
.vcl-aiuto strong { color: var(--text-dark); }

.vcl-nota { display: flex; gap: 10px; align-items: flex-start; text-align: left; margin: 14px 0 0; padding: 12px 14px; border-radius: 10px; background: var(--bg-light); color: var(--text-mid); font-size: 0.875rem; line-height: 1.55; }
.vcl-nota i { color: var(--primary-dark); margin-top: 3px; }
.vcl-nota-attesa { background: #FEF6E7; color: #7A4B00; }
.vcl-nota-attesa i { color: #B7791F; }

.vcl-strappo { position: relative; height: 0; border-top: 2px dashed var(--border-color); margin: 0 18px; }
.vcl-strappo::before, .vcl-strappo::after { content: ""; position: absolute; top: -12px; width: 22px; height: 22px; border-radius: 50%; background: var(--bg-light); border: 1px solid var(--border-color); }
.vcl-strappo::before { left: -31px; }
.vcl-strappo::after { right: -31px; }

/* Le giornate */
.vcl-giornate { padding: 20px 24px 24px; }
.vcl-giornate-titolo { margin: 0 0 12px; color: var(--text-light); font-size: 0.75rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.vcl-elenco { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.vcl-giornata { border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; break-inside: avoid; }
.vcl-giornata-testa { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 12px; }
.vcl-giornata-data { margin: 0; color: var(--text-dark); font-size: 1.125rem; font-weight: 700; line-height: 1.3; }
.vcl-stato { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 999px; font-size: 0.8125rem; font-weight: 700; line-height: 1.4; }
.vcl-stato-ok { background: var(--primary-light); color: #0F5F57; }
.vcl-stato-attesa { background: #FEF3C7; color: #92400E; }
.vcl-stato-presente { background: #E8F0FE; color: #1E3A8A; }
.vcl-giornata-titolo { margin: 6px 0 10px; color: var(--text-mid); font-size: 0.9375rem; line-height: 1.5; }
.vcl-dettagli { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.vcl-dettagli li { display: flex; gap: 10px; align-items: baseline; color: var(--text-dark); font-size: 0.9375rem; line-height: 1.5; min-width: 0; }
.vcl-dettagli li > span { min-width: 0; overflow-wrap: anywhere; }
.vcl-dettagli i { color: var(--primary); width: 16px; text-align: center; flex-shrink: 0; }
.vcl-dettagli a { color: var(--text-dark); text-decoration: underline; text-decoration-color: var(--primary); text-underline-offset: 3px; }
.vcl-dettagli a:hover { color: var(--primary-dark); }
.vcl-settore { font-weight: 700; }
.vcl-giornata-nota { margin: 10px 0 0; color: #7A4B00; font-size: 0.875rem; line-height: 1.5; }
.vcl-calendario { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border-color); }
.vcl-calendario-etichetta { color: var(--text-mid); font-size: 0.8125rem; font-weight: 600; margin-right: 4px; }
.vcl-pill { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 8px 16px; border-radius: 999px; border: 1.5px solid var(--border-color); color: var(--text-dark); font-size: 0.875rem; font-weight: 600; text-decoration: none; background: #fff; transition: border-color .2s ease, color .2s ease; }
.vcl-pill i { color: var(--primary); }
.vcl-pill:hover { border-color: var(--primary); color: var(--primary-dark); }
.vcl-partire { margin: 0 24px 24px; }

/* Sotto il biglietto */
.vcl-azioni { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin: 20px 0 28px; }
.vcl-link { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; color: var(--primary-dark); font-weight: 600; font-size: 0.9375rem; text-decoration: none; }
.vcl-link:hover { text-decoration: underline; text-underline-offset: 3px; }
.vcl-gestisci { background: #fff; border: 1px solid var(--border-color); border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); padding: 24px 20px; scroll-margin-top: 96px; }
.vcl-gestisci-titolo { display: flex; align-items: center; gap: 12px; margin: 0 0 8px; color: var(--text-dark); font-size: 1.25rem; font-weight: 700; line-height: 1.3; }
.vcl-gestisci-icona { width: 40px; height: 40px; border-radius: 12px; font-size: 1rem; flex: none; }
.vcl-gestisci-testo { margin: 0 0 18px; color: var(--text-mid); font-size: 0.9375rem; line-height: 1.6; }
.vcl-contatti { margin: 20px 0 0; text-align: center; color: var(--text-mid); font-size: 0.875rem; }
.vcl-contatti a { color: var(--primary-dark); font-weight: 600; }

/* Non trovata, annullata, errore */
.vcl-avviso { background: #fff; border: 1px solid var(--border-color); border-radius: 18px; box-shadow: var(--shadow); padding: 32px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; }
.vcl-avviso-icona { font-size: 1.375rem; margin-bottom: 14px; }
.vcl-avviso-titolo { margin: 0 0 8px; color: var(--text-dark); font-size: 1.5rem; font-weight: 700; line-height: 1.3; }
.vcl-avviso-testo { margin: 0 0 22px; color: var(--text-mid); font-size: 0.9375rem; line-height: 1.65; max-width: 46ch; overflow-wrap: anywhere; }
.vcl-avviso-azioni { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }

/* Gestisci */
.vcg { display: grid; gap: 22px; }
.vcg-blocco { display: grid; gap: 10px; min-width: 0; }
.vcg-blocco + .vcg-blocco { padding-top: 20px; border-top: 1px solid var(--border-color); }
.vcg-titolo { margin: 0; color: var(--text-dark); font-size: 1.0625rem; font-weight: 700; line-height: 1.35; }
.vcg-testo { margin: 0; color: var(--text-mid); font-size: 0.9375rem; line-height: 1.6; }
.vcg-testo strong { color: var(--text-dark); }
.vcg-numeri { display: grid; gap: 14px; }
.vcg-elenco { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.vcg-riga { border: 1px solid var(--border-color); border-radius: 12px; padding: 14px 16px; background: #fff; }
.vcg-riga-aggiungi { background: var(--bg-light); border-style: dashed; }
.vcg-riga-testa { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
.vcg-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1 1 200px; }
.vcg-data { font-weight: 700; color: var(--text-dark); font-size: 1rem; }
.vcg-sotto { color: var(--text-mid); font-size: 0.875rem; line-height: 1.5; }
.vcg-motivo { margin: 10px 0 0; color: var(--text-mid); font-size: 0.875rem; line-height: 1.5; }
.vcg-motivo i { color: var(--text-light); }
.vcl-pagina .vcg-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; font-size: 0.9375rem; font-family: inherit; line-height: 1.25; padding: 10px 20px; text-align: center; white-space: normal; border-radius: 50px; }
.vcg-btn i { font-size: 0.95em; }
.vcg-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none !important; box-shadow: none; }
.vcg-btn-tenue { background: #fff; color: var(--text-mid); font-weight: 600; border: 1.5px solid var(--border-color); cursor: pointer; transition: border-color .2s ease, color .2s ease; }
.vcg-btn-tenue:hover:not(:disabled) { border-color: var(--text-light); color: var(--text-dark); }
.vcg-btn-pericolo { background: #B42318; color: #fff; font-weight: 700; border: none; cursor: pointer; transition: background-color .2s ease; }
.vcg-btn-pericolo:hover:not(:disabled) { background: #912018; }
.vcg-conferma { margin-top: 12px; padding: 14px 16px; border-radius: 10px; background: #FFF8F1; border: 1px solid #F5D9BF; }
.vcg-conferma p { margin: 0 0 12px; color: var(--text-dark); font-size: 0.9375rem; line-height: 1.6; }
.vcg-azioni { display: flex; flex-wrap: wrap; gap: 10px; }
.vcg-annuncio-vuoto { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.vcg-annuncio { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 10px; font-size: 0.9375rem; line-height: 1.55; outline: none; }
.vcg-annuncio i { margin-top: 3px; }
.vcg-annuncio:focus-visible { outline: 3px solid var(--primary-dark); outline-offset: 2px; }
.vcg-annuncio-ok { background: var(--primary-light); color: #0F5F57; }
.vcg-annuncio-ok i { color: var(--primary-dark); }
.vcg-annuncio-errore { background: #FEF3F2; color: #912018; }
.vcg .vpc-contatore { max-width: 200px; }

@media (min-width: 640px) {
  .vcl-pagina { padding: 120px 24px 72px; }
  .vcl-testa { padding: 24px 32px 0; }
  .vcl-corpo, .vcl-giornate { padding-left: 32px; padding-right: 32px; }
  .vcl-partire { margin: 0 32px 28px; }
  .vcl-strappo { margin: 0 24px; }
  .vcl-strappo::before { left: -37px; }
  .vcl-strappo::after { right: -37px; }
  .vcl-nome { font-size: 1.875rem; }
  .vcl-gestisci { padding: 28px 32px; }
}
@media (max-width: 520px) {
  .vcl-avviso-azioni .vcl-btn, .vcl-azioni > .vcg-btn { width: 100%; }
  .vcl-azioni { justify-content: center; }
  .vcg-riga-testa > .vcg-btn, .vcg-blocco > .vcg-btn, .vcg-numeri .vcg-btn { width: 100%; }
  .vcg-azioni .vcg-btn { flex: 1 1 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .vcl-pagina * { transition: none !important; }
  .vcl-pagina .fa-spin { animation: none; }
}

@media print {
  .navbar, footer, #progressBar, .no-print { display: none !important; }
  @page { margin: 12mm; }
  html, body { background: #fff !important; }
  .vcl-pagina { padding: 0 !important; background: #fff !important; min-height: 0; }
  .vcl-contenitore { max-width: none; }
  .vcl-biglietto { box-shadow: none; border: 1px solid #9AA5B1; border-top: 4px solid #1A9E92; break-inside: avoid; }
  .vcl-strappo::before, .vcl-strappo::after { background: #fff; }
  .vcl-qr { border-color: #9AA5B1; width: auto; aspect-ratio: auto; padding: 3mm; }
  .vcl-qr img { width: 62mm; max-width: none; }
  .vcl-corpo, .vcl-giornate { padding-top: 12px; padding-bottom: 12px; }
  .vcl-giornata { border-color: #9AA5B1; }
  .vcl-dettagli a { text-decoration: none; }
  .vcl-stato { border: 1px solid currentColor; }
  .vcl-fatti { background: #fff; border: 1px solid #9AA5B1; }
}
`;
