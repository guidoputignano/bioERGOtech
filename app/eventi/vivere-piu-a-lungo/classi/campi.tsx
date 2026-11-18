"use client";

import { ids } from "../modulo-utils";
import { numeroDa } from "./classi-utils";

/**
 * I pezzi di modulo che servono sia alla prenotazione sia alla pagina della
 * classe: l'errore accanto al campo, l'Invio che passa al campo successivo e
 * il contatore con meno e più. Usano le classi vpl- di STILE_MODULO e vpc-
 * di STILE_MODULO_CLASSI, dentro un contenitore .vpl-wrap.
 */

export function ErroreCampo({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="vpl-errore">
      <i className="fas fa-circle-exclamation" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/** Invio sulla tastiera: al campo di testo successivo, invece di inviare a metà. */
export function avanti(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
  e.preventDefault();
  const form = e.currentTarget.form;
  if (!form) return;
  const campi = Array.from(form.querySelectorAll<HTMLInputElement>("input.vpl-input"));
  const prossimo = campi[campi.indexOf(e.currentTarget) + 1];
  if (prossimo) prossimo.focus();
  else e.currentTarget.blur();
}

/**
 * Un numero con i pulsanti meno e più: sul telefono si tocca invece di
 * aprire la tastiera. Il campo resta scrivibile, e le frecce su e giù della
 * tastiera cambiano il numero di uno.
 */
export function Contatore({
  id,
  etichetta,
  aiuto,
  valore,
  onValore,
  min,
  max,
  unoInMeno,
  unoInPiu,
  errore,
  inputRef,
  inviaConInvio = false,
}: {
  id: string;
  etichetta: string;
  aiuto: string;
  valore: string;
  onValore: (v: string) => void;
  min: number;
  max: number;
  unoInMeno: string;
  unoInPiu: string;
  errore?: string;
  inputRef?: (el: HTMLInputElement | null) => void;
  /** Invio manda il modulo, invece di passare al campo dopo (un modulo di due soli numeri). */
  inviaConInvio?: boolean;
}) {
  const cambia = (delta: number) => {
    const n = numeroDa(valore);
    const prossimo = Number.isFinite(n) ? Math.min(max, Math.max(min, n + delta)) : min;
    onValore(String(prossimo));
  };
  return (
    <div className="vpl-campo">
      <label htmlFor={id} className="vpl-label">
        {etichetta}
      </label>
      <p id={`${id}-aiuto`} className="vpl-aiuto">
        {aiuto}
      </p>
      <div className="vpc-contatore">
        <button type="button" className="vpc-passo" aria-label={unoInMeno} aria-controls={id} onClick={() => cambia(-1)}>
          <i className="fas fa-minus" aria-hidden="true" />
        </button>
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          enterKeyHint={inviaConInvio ? "done" : "next"}
          maxLength={2}
          className="vpl-input"
          required
          value={valore}
          onChange={(e) => onValore(e.target.value.replace(/\D/g, "").slice(0, 2))}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              cambia(e.key === "ArrowUp" ? 1 : -1);
              return;
            }
            if (!inviaConInvio) avanti(e);
          }}
          aria-invalid={errore ? true : undefined}
          aria-describedby={ids(`${id}-aiuto`, errore && `${id}-errore`)}
        />
        <button type="button" className="vpc-passo" aria-label={unoInPiu} aria-controls={id} onClick={() => cambia(1)}>
          <i className="fas fa-plus" aria-hidden="true" />
        </button>
      </div>
      {errore && <ErroreCampo id={`${id}-errore`}>{errore}</ErroreCampo>}
    </div>
  );
}
