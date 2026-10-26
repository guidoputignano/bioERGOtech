import Link from "next/link";
import { ISCRIZIONE_PATH } from "@/app/eventi/vivere-piu-a-lungo/licei/content";

/**
 * Per gli studenti dei licei che arrivano al corso senza poter entrare.
 *
 * Chi non riceve l'email della password (un indirizzo sbagliato, la posta
 * della scuola che blocca) apre una lezione, trova "Join the Program" e si
 * crea un account dal sito. Le lezioni le segue, ma fuori dal percorso:
 * il suo professore non lo vede nell'elenco, e lui non puo entrare in una
 * squadra ne iscriversi ai talk. E successo. Questo avviso, in italiano
 * perche parla a loro, lo manda all'iscrizione con il codice della scuola.
 */
export function AvvisoStudentiLicei() {
  return (
    <div
      style={{
        background: "#F4F8FF",
        border: "1px solid #D6E4FA",
        borderRadius: 10,
        padding: "12px 14px",
        fontSize: 13,
        color: "#28456F",
        lineHeight: 1.6,
        textAlign: "left",
      }}
    >
      <strong>Studente di un liceo del percorso «Biotecnologie e Intelligenza Artificiale»?</strong>{" "}
      Non creare un account da qui: iscriviti con il codice della tua scuola, così il tuo professore ti
      trova nel suo elenco. Se l&apos;email con la password non ti arriva, chiedigli di rimandartela.{" "}
      <Link href={ISCRIZIONE_PATH} style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
        Iscriviti con il codice della scuola
      </Link>
    </div>
  );
}
