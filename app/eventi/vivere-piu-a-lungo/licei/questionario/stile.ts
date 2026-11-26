/**
 * Lo stile della pagina del questionario (prefisso vpq-), accanto a
 * STILE_MODULO per i campi. In un modulo .ts semplice: una costante esportata
 * da un file "use client" non arriva al server come testo.
 */
export const STILE_QUESTIONARIO = `
.vpq-pagina { background: var(--bg-light); padding: 96px 16px 56px; min-height: 70vh; }
.vpq-contenitore { max-width: 680px; margin: 0 auto; }
.vpq-pagina a:focus-visible, .vpq-pagina button:focus-visible { outline: 3px solid var(--primary-dark); outline-offset: 2px; }
.vpq-pagina .vpq-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; text-decoration: none; }

.vpq-testa { margin: 0 0 20px; }
.vpq-occhiello { margin: 0; color: var(--primary-dark); font-size: 0.75rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
.vpq-titolo { margin: 6px 0 10px; color: var(--text-dark); font-size: 1.75rem; font-weight: 700; line-height: 1.2; }
.vpq-intro { margin: 0; color: var(--text-mid); font-size: 16px; line-height: 1.6; }
.vpq-anteprima { display: flex; gap: 10px; align-items: flex-start; margin: 0 0 16px; padding: 12px 14px; border-radius: 12px; background: #FFF8E6; border: 1px solid #F0D89B; color: #75570F; font-size: 14px; line-height: 1.55; }
.vpq-anteprima i { margin-top: 3px; }

.vpq-numero { display: inline-flex; align-items: center; justify-content: center; min-width: 26px; height: 26px; margin-right: 8px; padding: 0 6px; border-radius: 999px; background: var(--primary-light); color: #0F5F57; font-size: 13px; font-weight: 700; vertical-align: 2px; }
.vpq-domanda { scroll-margin-top: 110px; }
.vpq-domanda .vpl-chips { margin-top: 12px; }
.vpq-scala .vpl-chip { min-width: 48px; justify-content: center; padding: 9px 12px; font-variant-numeric: tabular-nums; }
/* La scala da 0 a 10 in griglia: 6 e 5 sul telefono, 11 su una riga sullo
   schermo largo. A capo con il flex, il 10 restava da solo su una terza riga. */
.vpl-chips.vpq-scala-10 { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); }
.vpq-scala-10 .vpl-chip { min-width: 0; padding: 9px 0; }
@container vpl (min-width: 560px) { .vpl-chips.vpq-scala-10 { grid-template-columns: repeat(11, minmax(0, 1fr)); } }
.vpq-estremi { display: flex; justify-content: space-between; gap: 12px; margin: 8px 0 0; font-size: 13px; color: var(--text-mid); }
.vpq-contatore { margin: 0; font-size: 12.5px; color: var(--text-mid); text-align: right; font-variant-numeric: tabular-nums; }
.vpq-contatore[data-pieno="true"] { color: #8A6100; font-weight: 600; }

/* Gli stati senza modulo: link non valido, gia risposto, chiuso */
.vpq-avviso { background: #fff; border: 1px solid var(--border-color); border-top: 4px solid var(--primary); border-radius: 18px; box-shadow: var(--shadow); padding: 32px 24px; text-align: center; }
.vpq-avviso .icon-circle { width: 56px; height: 56px; margin: 0 auto 14px; font-size: 22px; }
.vpq-avviso-titolo { margin: 0 0 10px; color: var(--text-dark); font-size: 1.4rem; font-weight: 700; line-height: 1.25; }
.vpq-avviso-titolo:focus { outline: none; }
.vpq-avviso-testo { margin: 0 auto; max-width: 460px; color: var(--text-mid); font-size: 15.5px; line-height: 1.6; }
.vpq-avviso-testo a { color: #0F7F75; font-weight: 600; }

@media (min-width: 520px) { .vpq-titolo { font-size: 2rem; } .vpq-avviso { padding: 40px 36px; } }
`;
