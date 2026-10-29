"use client";

/**
 * Chi e collegato, quando un'area riservata dice "non disponibile".
 *
 * Su un computer della scuola, quando uno studente sceglie la password dal
 * link della sua email, il browser passa al suo account. Il docente che poi
 * apre la sua area dal link di sempre si trova "Nessuna adesione risulta
 * associata a questo account" senza sapere che l'account e quello di un
 * altro, e senza un modo di uscirne. E successo. Qui si dice con quale
 * account si e collegati e si offre di uscire (solo da questo dispositivo)
 * e accedere con il proprio, tornando poi alla stessa area.
 */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function AccountCollegato({
  destinazione,
  registro,
}: {
  /** L'area a cui tornare dopo il nuovo accesso. */
  destinazione: string;
  /** "lei" per i docenti, "tu" per gli studenti. */
  registro: "lei" | "tu";
}) {
  const [account, setAccount] = useState<{ email: string; nome: string } | null>(null);
  const [uscendo, setUscendo] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    let attivo = true;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (attivo && data.user?.email) {
          setAccount({ email: data.user.email, nome: String(data.user.user_metadata?.full_name ?? "").trim() });
        }
      })
      .catch(() => {});
    return () => {
      attivo = false;
    };
  }, []);

  if (!account) return null;

  const esci = async () => {
    setUscendo(true);
    setErrore(null);
    const { error } = await createClient().auth.signOut({ scope: "local" });
    if (error) {
      setUscendo(false);
      setErrore(registro === "lei" ? "Non è stato possibile uscire. Ricarichi la pagina e riprovi." : "Non è stato possibile uscire. Ricarica la pagina e riprova.");
      return;
    }
    window.location.assign(`/auth/login?returnTo=${encodeURIComponent(destinazione)}`);
  };

  const chi = account.nome ? `${account.nome} (${account.email})` : account.email;

  return (
    <div
      style={{
        background: "#FFF8E6",
        border: "1px solid #F0D89B",
        borderRadius: 10,
        padding: "12px 16px",
        fontSize: 13.5,
        color: "#75570F",
        lineHeight: 1.6,
        textAlign: "left",
        marginTop: 16,
      }}
    >
      {registro === "lei" ? (
        <>
          Ha fatto l&apos;accesso come <strong>{chi}</strong>. Se non è il suo account, per esempio su un
          computer della scuola su cui è entrato uno studente, esca e acceda con l&apos;email con cui ha
          aderito o a cui è arrivato l&apos;invito.
        </>
      ) : (
        <>
          Hai fatto l&apos;accesso come <strong>{chi}</strong>. Se non è il tuo account, per esempio su un
          computer della scuola, esci e accedi con l&apos;email con cui ti sei iscritto.
        </>
      )}
      <div style={{ marginTop: 10 }}>
        <Button type="button" size="sm" variant="outline" onClick={esci} disabled={uscendo}>
          {uscendo ? "Uscita…" : "Esci e accedi con un altro account"}
        </Button>
      </div>
      {errore && (
        <p role="alert" style={{ color: "#B44A5E", margin: "8px 0 0" }}>
          {errore}
        </p>
      )}
    </div>
  );
}
