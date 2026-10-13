/**
 * Foglio di stile delle pagine dei talk, sotto `.tk-page`.
 *
 * Stessa ragione dei licei: `/assets/css/main.css` arriva dopo il design
 * system e ne riscrive `.section` e `.card`, quindi qui si rimettono le cose
 * come le vuole `globals.css`, senza toccare il resto del sito.
 *
 * Colori del sistema: teal #2EC4B6 per bottoni, icone e bordi, #1A9E92 nei
 * gradienti, #E1F5EE per i fondi chiari. Il testo piccolo in teal (occhielli,
 * link) usa #0A7A66 come le pagine di licei e universita: #1A9E92 su bianco
 * non regge il contrasto minimo a 12 px.
 */
export const STILE_TALK = `
.tk-page { --tk-accento: #0A7A66; }
.tk-page .section { padding: 64px 0; overflow: visible; }
.tk-page section[id] { scroll-margin-top: 96px; }

.tk-page .card {
  margin: 0; background: #fff; border: 1px solid var(--border-color);
  transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease;
}
.tk-page .card::before { display: none; }
.tk-page .card:hover { transform: none; box-shadow: var(--shadow); border-color: var(--border-color); }
.tk-page a.card:hover { transform: translateY(-3px); box-shadow: 0 14px 34px rgba(26, 35, 50, .10); border-color: #CFE9E4; }

.tk-hero {
  background: linear-gradient(135deg, #F7F9FC 0%, #E8F8F6 55%, #EEF3FF 100%);
  padding: 112px 0 56px;
}
.tk-briciole { font-size: 13px; margin-bottom: 18px; }
.tk-briciole a { color: var(--tk-accento); font-weight: 600; text-decoration: none; }
.tk-briciole a:hover { text-decoration: underline; }
.tk-kicker {
  font-size: 11.5px; font-weight: 700; letter-spacing: .12em;
  text-transform: uppercase; color: var(--tk-accento);
}
.tk-h1 {
  font-size: clamp(1.9rem, 6.4vw, 3rem); line-height: 1.15; font-weight: 700;
  color: var(--text-dark); margin: 12px 0 16px;
  overflow-wrap: break-word;
}
.tk-sottotitolo { font-size: clamp(1.02rem, 3.6vw, 1.2rem); line-height: 1.6; color: var(--text-mid); margin: 0 0 26px; max-width: 680px; }

.tk-griglia { display: grid; gap: 32px; grid-template-columns: minmax(0, 1fr); align-items: start; }
@media (min-width: 1024px) { .tk-griglia { grid-template-columns: minmax(0, 1.45fr) minmax(320px, 1fr); gap: 48px; } }

/* Testata con la foto del relatore: ritratto grande accanto al titolo da
   1024 px in su, sopra il titolo su telefono e tablet (tutta la riga, fino
   a 420 px). Le larghezze sono quelle di SIZES_RITRATTO nella pagina. */
.tk-griglia-foto { display: grid; gap: 28px; grid-template-columns: minmax(0, 1fr); align-items: start; }
@media (min-width: 1024px) { .tk-griglia-foto { grid-template-columns: clamp(340px, 31vw, 400px) minmax(0, 1fr); gap: 56px; } }
.tk-ritratto { margin: 0; width: 100%; max-width: 420px; }
.tk-ritratto-foto { width: 100%; box-shadow: 0 18px 44px rgba(26, 35, 50, .14); }
.tk-ritratto-didascalia { margin-top: 16px; padding-left: 14px; border-left: 3px solid var(--primary); }
.tk-iscrizione-colonna { margin-top: 28px; max-width: 480px; }

/* Il ritratto medio della scheda nell'indice. */
.tk-ritratto-medio { width: 104px; }
@media (min-width: 480px) { .tk-ritratto-medio { width: 136px; } }

.tk-relatore { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
.tk-relatore-nome { font-size: 17px; font-weight: 700; color: var(--text-dark); line-height: 1.3; }
.tk-relatore-ruolo { font-size: 14px; color: var(--text-mid); line-height: 1.5; }

.tk-fatti { display: flex; flex-wrap: wrap; gap: 8px; }
.tk-fatto {
  display: inline-flex; align-items: center; gap: 8px;
  background: #fff; border: 1px solid var(--border-color); border-radius: 999px;
  padding: 7px 14px; font-size: 13px; font-weight: 600; color: var(--text-dark);
}
.tk-fatto i { color: var(--primary); font-size: 12.5px; }

.tk-titolo-sezione { font-size: clamp(1.45rem, 4.6vw, 1.9rem); font-weight: 700; color: var(--text-dark); line-height: 1.25; margin: 10px 0 14px; }
.tk-intro { font-size: 16.5px; line-height: 1.8; color: var(--text-mid); max-width: 780px; margin: 0 0 32px; }
.tk-testo { font-size: 15.5px; line-height: 1.8; color: var(--text-mid); max-width: 780px; }

.tk-temi { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); }
@media (min-width: 720px) { .tk-temi { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 1100px) { .tk-temi { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.tk-tema h3 { font-size: 16px; font-weight: 700; color: var(--text-dark); margin: 14px 0 6px; line-height: 1.35; }
.tk-tema p { font-size: 14.5px; line-height: 1.7; color: var(--text-mid); margin: 0; }

.tk-spunti { list-style: none; padding: 0; margin: 0 0 18px; display: grid; gap: 10px; max-width: 780px; }
.tk-spunti li {
  display: flex; gap: 12px; align-items: flex-start;
  background: #fff; border: 1px solid var(--border-color); border-radius: 12px;
  padding: 14px 16px; font-size: 15px; line-height: 1.65; color: var(--text-dark);
}
.tk-spunti li i { color: var(--primary); margin-top: 4px; flex-shrink: 0; }

.tk-nota { font-size: 13.5px; color: var(--text-light); line-height: 1.7; }
.tk-nota a { color: var(--tk-accento); font-weight: 600; }

.tk-elenco { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); }
@media (min-width: 900px) { .tk-elenco { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.tk-scheda { display: flex; flex-direction: column; gap: 14px; padding: 24px; text-decoration: none; color: inherit; }
`;
