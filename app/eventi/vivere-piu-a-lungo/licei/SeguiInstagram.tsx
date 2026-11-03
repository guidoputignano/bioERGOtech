/**
 * Il profilo Instagram della Fondazione, nell'area dello studente e nella
 * console dei docenti, subito sotto i talk.
 *
 * La Fondazione vuole che studenti e docenti seguano il profilo, dove escono
 * talk, novita ed evento finale. Un'email promozionale a tutti gli iscritti
 * non si puo mandare: il consenso dell'iscrizione copre il corso, e la
 * newsletter e una scelta a parte (informativa studenti). Qui invece lo
 * vede chi gia entra nella sua area. E solo un collegamento, senza widget di
 * Instagram: niente script ne cookie di terzi.
 */

import { SOCIAL } from "@/lib/social";
import { LICEI } from "./content";

export function SeguiInstagram({ registro }: { registro: "lei" | "tu" }) {
  const evento = LICEI.dataLabel.replace(/^\S+\s/, "");
  return (
    <div
      className="card"
      lang="it"
      style={{ padding: "18px 22px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "14px 18px" }}
    >
      <i
        className="fab fa-instagram"
        aria-hidden="true"
        style={{ fontSize: 28, color: "var(--primary)", flexShrink: 0 }}
      />
      <div style={{ flex: "1 1 260px", minWidth: 0 }}>
        <h2 className="font-semibold text-gray-800" style={{ fontSize: 15, margin: "0 0 2px" }}>
          Il percorso su Instagram
        </h2>
        <p className="text-sm text-gray-600" style={{ lineHeight: 1.65, margin: 0 }}>
          {registro === "tu"
            ? `Sul profilo pubblichiamo gli aggiornamenti: i talk con gli esperti, le novità e l'evento finale del ${evento}. Seguici per non perderli.`
            : `Sul profilo pubblichiamo gli aggiornamenti: i talk con gli esperti, le novità e l'evento finale del ${evento}. Se le fa piacere, condivida il profilo con i suoi studenti.`}
        </p>
      </div>
      <a
        href={SOCIAL.instagram}
        target="_blank"
        rel="noreferrer"
        className="btn-outline"
        style={{ padding: "9px 20px", fontSize: 13.5, flexShrink: 0 }}
      >
        {registro === "tu" ? `Segui ${SOCIAL.instagramNome}` : `Apri ${SOCIAL.instagramNome}`}
      </a>
    </div>
  );
}
