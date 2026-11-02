import Link from "next/link";

/**
 * Il collegamento alle lezioni, in cima alle aree degli studenti.
 *
 * Dopo l'accesso gli studenti arrivavano nella loro area, che si apre sulla
 * squadra, e da li non c'era nessun collegamento al corso: ne nell'area, ne
 * nella barra in alto. Al Liceo Ferraris uno studente e entrato, ha creato
 * la squadra come la pagina gli proponeva, e da quel momento nessuno dei
 * compagni ha piu trovato le lezioni. Ora dopo l'accesso si va al corso
 * (`lib/eventi/area-account.ts`), e l'area ha questo riquadro, anche quando
 * dice "Area non disponibile" (per esempio a iscrizione ancora in attesa: il
 * corso si segue lo stesso).
 */
export function VaiAlleLezioni() {
  return (
    <div className="card" lang="it" style={{ padding: 22, borderLeft: "4px solid var(--primary)", textAlign: "left" }}>
      <h2 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 16 }}>
        Le lezioni del corso
      </h2>
      <p className="text-sm text-gray-600" style={{ lineHeight: 1.7, margin: "0 0 14px" }}>
        Le segui dalla pagina del corso, una alla volta, con il tuo account. Ogni lezione si chiude con
        la tua riflessione, ed è la consegna che sblocca quella dopo.
      </p>
      <Link href="/courses/agentic-ai" className="btn-primary" style={{ display: "inline-block", fontSize: 14 }}>
        Vai alle lezioni
      </Link>
    </div>
  );
}
