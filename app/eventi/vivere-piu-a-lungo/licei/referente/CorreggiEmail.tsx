"use client";

/**
 * La correzione dell'email di uno studente, sotto la sua riga nella console
 * dei docenti.
 *
 * Si apre solo per chi non e mai entrato: un account mai usato non ha
 * password ne lezioni, e cambiarne l'indirizzo non toglie niente a nessuno.
 * La rotta lo ricontrolla comunque (`lib/eventi/licei-correggi-email.ts`).
 * Parte gia con l'indirizzo suggerito quando quello salvato ha un refuso
 * evidente ("gmail.cpm"), e chiede una conferma quando quello nuovo
 * somiglia a un refuso ("gmial.com").
 *
 * Per un'iscrizione legata all'account di un altro (`accountAltrui`) la
 * stessa correzione, anche con l'indirizzo di sempre, collega lo studente
 * a un account suo: l'altro account non si tocca.
 */

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { refusoEmail } from "@/lib/eventi/email-refusi";

export function CorreggiEmail({
  iscrizione,
  accountAltrui = null,
  onCorretta,
  onChiudi,
}: {
  iscrizione: { id: string; email: string; stato: string };
  /** L'iscrizione e legata all'account di un altro: di chi guarda, di un docente, o con un'altra email. */
  accountAltrui?: "mio" | "docente" | "altro" | null;
  /** A correzione fatta, con la frase da mostrare sulla riga. */
  onCorretta: (messaggio: string) => void;
  onChiudi: () => void;
}) {
  const [email, setEmail] = useState(refusoEmail(iscrizione.email)?.suggerimento ?? iscrizione.email);
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  // L'indirizzo che la rotta ha chiesto di confermare: vale finche non cambia.
  const [daConfermare, setDaConfermare] = useState<string | null>(null);

  const refuso = refusoEmail(email);
  const inConferma = daConfermare !== null && daConfermare === email.trim();

  const salva = async (conferma: boolean) => {
    setSalvando(true);
    setErrore(null);
    try {
      const res = await fetch("/api/eventi/licei/referente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ azione: "correggi_email", id: iscrizione.id, email, conferma }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.richiede_conferma) setDaConfermare(email.trim());
        throw new Error(data.error || "Correzione non riuscita.");
      }
      const nuova = String(data.iscrizione?.email ?? email.trim());
      onCorretta(
        data.gia_entrato
          ? `Fatto: l'iscrizione ora è collegata all'account ${nuova}, con cui lo studente entra già. Le lezioni che ha fatto si contano. Non serve altro.`
          : data.email_inviata === true
            ? `Fatto: l'iscrizione ora usa ${nuova}, con un account dello studente. Gli abbiamo mandato il link per impostare la password.`
            : data.email_inviata === false
              ? `Fatto: l'iscrizione ora usa ${nuova}, ma l'email con il link non è partita: usi «Rimanda il link» fra qualche minuto.`
              : `Fatto: l'iscrizione ora usa ${nuova}. Se lo studente è suo, porti l'iscrizione su «Confermata»: riceverà la conferma a questo indirizzo, e con «Rimanda il link» il link per entrare.`,
      );
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Correzione non riuscita.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        salva(inConferma);
      }}
      style={{
        flexBasis: "100%",
        minWidth: 0,
        background: "var(--primary-light)",
        borderRadius: 10,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <label
        htmlFor={`correggi-${iscrizione.id}`}
        style={{ fontSize: 13, fontWeight: 600, color: "var(--text-dark)" }}
      >
        Indirizzo email corretto dello studente
      </label>
      <Input
        id={`correggi-${iscrizione.id}`}
        type="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setErrore(null);
        }}
        autoFocus
        style={{ background: "#fff" }}
      />
      {refuso && !inConferma && (
        <p style={{ fontSize: 12.5, color: refuso.impossibile ? "#8E2C43" : "#75570F", lineHeight: 1.6, margin: 0 }}>
          {refuso.impossibile ? `«${refuso.dominio}» non esiste.` : "Controlli l'indirizzo."}
          {refuso.suggerimento && (
            <>
              {" "}
              Forse è{" "}
              <button
                type="button"
                onClick={() => setEmail(refuso.suggerimento!)}
                style={{ color: "var(--primary-dark)", fontWeight: 600, textDecoration: "underline" }}
              >
                {refuso.suggerimento}
              </button>
              ?
            </>
          )}
        </p>
      )}
      <p style={{ fontSize: 12, color: "var(--text-light)", lineHeight: 1.6, margin: 0 }}>
        {accountAltrui
          ? `Salvando, colleghiamo l'iscrizione a un account dello studente con questo indirizzo: se non c'è lo creiamo e gli mandiamo il link per impostare la password. ${
              accountAltrui === "altro"
                ? "Se lo studente entra già con un suo account, scriva l'indirizzo di quello. "
                : ""
            }L'account a cui è collegata ora non viene toccato.`
          : "Si corregge solo finché lo studente non è mai entrato. Al nuovo indirizzo mandiamo il link per impostare la password. Se con questo indirizzo lo studente ha già un account, colleghiamo l'iscrizione a quello."}
      </p>
      {errore && (
        <p role="alert" style={{ color: "#E74C6F", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          {errore}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={salvando || email.trim() === ""}>
          {salvando ? "Salvataggio…" : inConferma ? "L'indirizzo è giusto, salva" : "Salva"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onChiudi} disabled={salvando}>
          Annulla
        </Button>
      </div>
    </form>
  );
}
