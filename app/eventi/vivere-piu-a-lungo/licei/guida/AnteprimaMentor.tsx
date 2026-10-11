/**
 * Lo schema dell'area dello studente, con la freccia sul riquadro Mentor.
 *
 * E' disegnato e non e uno screenshot di proposito: l'area vera sta dietro
 * login e mostra dati di studenti e mentor reali, che in una pagina pubblica
 * non possono comparire. Le righe grigie stanno al posto dei contenuti, cosi
 * nessuno scambia un nome di esempio per un mentor vero.
 *
 * Ricalca l'ordine di `StudenteConsole` (saluto, squadra, progetto, mentor) e
 * le etichette di `MentorElenco`: se cambiano li, va aggiornato anche qui.
 */

function Righe({ larghezze }: { larghezze: string[] }) {
  return (
    <div className="am-righe" aria-hidden="true">
      {larghezze.map((w, i) => (
        <span key={i} style={{ width: w }} />
      ))}
    </div>
  );
}

export function AnteprimaMentor({ indirizzo }: { indirizzo: string }) {
  return (
    <figure className="am-figura">
      <div
        className="am-browser"
        role="img"
        aria-label="Schema della tua area: in fondo alla pagina, sotto i riquadri della squadra e del progetto, c'è il riquadro Mentor, indicato da una freccia."
      >
        <div className="am-barra" aria-hidden="true">
          <span className="am-pallini">
            <i />
            <i />
            <i />
          </span>
          <span className="am-url">{indirizzo}</span>
        </div>

        <div className="am-pagina" aria-hidden="true">
          <div>
            <div className="am-saluto">Ciao Giulia</div>
            <div className="am-sotto">Il tuo istituto . classe 4B</div>
          </div>

          <div className="am-card am-spenta">
            <div className="am-titolo">La squadra</div>
            <Righe larghezze={["72%", "48%"]} />
          </div>

          <div className="am-card am-spenta">
            <div className="am-titolo">Il progetto</div>
            <Righe larghezze={["86%", "64%", "40%"]} />
          </div>

          <div className="am-richiamo">
            <span className="am-etichetta">Qui trovi i mentor</span>
            <svg className="am-freccia" viewBox="0 0 64 44" fill="none">
              <path
                d="M58 4 C 40 4, 18 10, 12 34"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M3 27 L 12 38 L 21 28"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="am-card am-accesa">
            <div className="am-titolo">Mentor</div>
            <Righe larghezze={["94%", "70%"]} />
            <div className="am-nota">
              <b>Prima di scrivere</b>
              <Righe larghezze={["88%", "76%", "58%"]} />
            </div>
            {[0, 1].map((i) => (
              <div key={i} className="am-mentor">
                <div className="am-nome">
                  <span />
                  <em />
                </div>
                <Righe larghezze={["52%"]} />
                <span className="am-contatto">
                  <i className="fas fa-envelope" /> contatto
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <figcaption>
        Schema della tua area, con i contenuti nascosti. Il riquadro Mentor è l&apos;ultimo
        della pagina: scorri fino in fondo.
      </figcaption>
    </figure>
  );
}
