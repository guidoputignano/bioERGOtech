/**
 * Lo stile della pagina delle scuole, in aggiunta a STILE_MODULO
 * (modulo-utils.ts), di cui il modulo delle classi usa le classi vpl-: stessi
 * campi, stesse giornate, stessa conferma del modulo delle persone. Qui solo
 * quello che manca, con il prefisso vpc-.
 *
 * Un modulo semplice, senza "use client": lo leggono sia la pagina server sia
 * il componente client.
 */

export const STILE_PAGINA_CLASSI = `
.vpc-pagina { background: var(--bg-light); padding: 96px 0 56px; min-height: 70vh; }
.vpc-contenitore { max-width: 760px; margin: 0 auto; padding: 0 16px; }
.vpc-indietro { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; margin-bottom: 8px; color: #0F766E; font-size: 0.9375rem; font-weight: 600; text-decoration: none; }
.vpc-indietro:hover { text-decoration: underline; text-underline-offset: 3px; }
.vpc-pagina a:focus-visible { outline: 3px solid var(--primary-dark); outline-offset: 2px; border-radius: 6px; }
.vpc-occhiello { margin: 0; color: #0F766E; font-size: 0.75rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
.vpc-h1 { margin: 8px 0 10px; color: var(--text-dark); font-size: 1.75rem; font-weight: 700; line-height: 1.2; }
.vpc-lead { margin: 0; color: var(--text-mid); font-size: 1rem; line-height: 1.65; max-width: 40rem; }

.vpc-punti { list-style: none; margin: 22px 0 26px; padding: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; }
.vpc-punto { display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px; background: #fff; border: 1px solid var(--border-color); border-radius: 14px; }
.vpc-punto-icona { flex: none; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 10px; background: var(--primary-light); color: #0F766E; font-size: 15px; }
.vpc-punto h3 { margin: 1px 0 2px; color: var(--text-dark); font-size: 0.9375rem; font-weight: 700; line-height: 1.35; }
.vpc-punto p { margin: 0; color: var(--text-mid); font-size: 0.875rem; line-height: 1.5; }

.vpc-dopo { display: grid; gap: 14px; margin-top: 24px; }
.vpc-riquadro { background: #fff; border: 1px solid var(--border-color); border-radius: 14px; padding: 18px 20px; }
.vpc-riquadro h2 { display: flex; align-items: center; gap: 10px; margin: 0 0 6px; color: var(--text-dark); font-size: 1rem; font-weight: 700; line-height: 1.35; }
.vpc-riquadro h2 i { color: var(--primary-dark); }
.vpc-riquadro p { margin: 0; color: var(--text-mid); font-size: 0.9375rem; line-height: 1.6; }
.vpc-riquadro p + p { margin-top: 8px; }
.vpc-riquadro a { color: #0F766E; font-weight: 600; text-decoration: underline; text-underline-offset: 2px; }

.vpc-chiuse { background: #fff; border: 1px solid var(--border-color); border-top: 4px solid var(--primary); border-radius: 18px; box-shadow: var(--shadow); padding: 32px 24px; text-align: center; }
.vpc-chiuse h2 { margin: 14px 0 8px; color: var(--text-dark); font-size: 1.375rem; font-weight: 700; }
.vpc-chiuse p { margin: 0 auto 20px; max-width: 42ch; color: var(--text-mid); font-size: 0.9375rem; line-height: 1.65; }
.vpc-pagina .vpc-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; text-decoration: none; }

@media (min-width: 560px) {
  .vpc-punti { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
}
@media (min-width: 768px) {
  .vpc-pagina { padding: 120px 0 72px; }
  .vpc-contenitore { padding: 0 24px; }
  .vpc-h1 { font-size: 2.25rem; }
  .vpc-lead { font-size: 1.0625rem; }
}
`;

/** Le parti del modulo che il modulo delle persone non ha: il contatore, il totale, l'invito. */
export const STILE_MODULO_CLASSI = `
.vpc-contatore { display: flex; align-items: stretch; gap: 8px; max-width: 220px; }
.vpc-contatore .vpl-input { flex: 1 1 auto; min-width: 0; text-align: center; font-size: 18px; font-weight: 600; font-variant-numeric: tabular-nums; }
.vpc-passo { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 48px; min-height: 48px; padding: 0; border: 1.5px solid var(--vpl-bordo); border-radius: 12px; background: #fff; color: var(--vpl-teal-testo); font-family: inherit; font-size: 16px; cursor: pointer; transition: border-color .15s ease, background-color .15s ease; -webkit-tap-highlight-color: transparent; }
.vpc-passo:hover { border-color: var(--primary-dark); background: #F3FBFA; }
.vpc-passo:focus-visible { outline: 3px solid rgba(26, 158, 146, .5); outline-offset: 2px; }
.vpc-numeri { display: grid; grid-template-columns: minmax(0, 1fr); gap: 18px; margin-top: 14px; }
@container vpl (min-width: 440px) { .vpc-numeri { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }
.vpc-totale { display: flex; gap: 8px; align-items: flex-start; margin: 14px 0 0; font-size: 14px; font-weight: 600; line-height: 1.5; color: var(--text-dark); }
.vpc-totale i { margin-top: 3px; color: var(--primary-dark); }
.vpc-totale[data-tipo="oltre"] { color: var(--vpl-errore); }
.vpc-totale[data-tipo="oltre"] i { color: var(--vpl-errore); }
.vpc-sezione { display: flex; flex-direction: column; gap: 18px; }
.vpc-sezione-titolo { margin: 0; font-size: 17px; font-weight: 700; color: var(--text-dark); line-height: 1.35; }
.vpc-invito-ok { margin: 0; font-size: 14px; color: var(--vpl-teal-testo); font-weight: 600; display: flex; gap: 8px; align-items: flex-start; line-height: 1.5; }
.vpc-invito-ok i { margin-top: 3px; }
.vpc-ok-elenco { margin: 0; padding-left: 20px; color: var(--text-mid); font-size: 14px; line-height: 1.6; }
.vpc-ok-elenco li + li { margin-top: 4px; }
@media (forced-colors: active) {
  .vpc-passo { border: 1px solid ButtonText; }
}
`;
