"use client";

/**
 * Le email una tantum dello staff, ognuna con il suo bottone: le notizie dal
 * percorso agli studenti, l'avviso ai docenti sulle squadre e l'avviso agli
 * studenti sulle riflessioni.
 *
 * Ogni scheda dice a chi parte e quanti sono, mostra il testo esatto
 * dell'email prima di premere, chiede conferma e parte una volta sola: la
 * rotta prenota l'invio e un secondo clic, o un collega nello stesso
 * momento, riceve "gia inviato". Dopo l'invio la scheda dice quando e con
 * quale esito. L'invio vero e in `lib/eventi/licei-avvisi.ts`.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NOTIZIE_STUDENTI_OGGETTO,
  NOTIZIE_STUDENTI_TESTO,
  AVVISO_RIFLESSIONI_OGGETTO,
  AVVISO_RIFLESSIONI_TESTO,
  AVVISO_SQUADRE_OGGETTO,
  AVVISO_SQUADRE_TESTO,
  INFORMATIVA_STUDENTI_PATH,
  SITE_URL,
} from "../content";
// Solo i tipi: i moduli sono del server.
import type { EsitoAvviso, StatoAvviso } from "@/lib/eventi/licei-avvisi";
import type {
  StatoAvvisoNotizie,
  StatoAvvisoRiflessioni,
  StatoAvvisoSquadre,
} from "@/lib/eventi/licei-server";
import { POST_INSTAGRAM_MAX, SOCIAL, TITOLO_POST_MAX, leggiPostInstagram } from "@/lib/social";

const dataOra = (iso: string): string =>
  new Date(iso).toLocaleString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const testoEsito = (e: EsitoAvviso): string =>
  `${e.inviate} email partite su ${e.destinatari}${
    e.fallite > 0 ? `, ${e.fallite} non ${e.fallite === 1 ? "riuscita" : "riuscite"} (i dettagli sono nei log)` : ""
  }`;

const ANTEPRIMA_P: React.CSSProperties = { margin: "0 0 8px" };

/** La scheda comune a ogni avviso. */
function AvvisoUnaTantum({
  titolo,
  descrizione,
  stato,
  onStato,
  azione,
  azioneProva,
  conferma,
  bottone,
  conteggio,
  vuoto,
  blocco,
  onErrore,
  corpo,
  campi,
  pronto = true,
  anteprima,
}: {
  titolo: string;
  descrizione: React.ReactNode;
  stato: StatoAvviso;
  onStato: (s: Partial<StatoAvviso>) => void;
  /** L'azione per la rotta dello staff. */
  azione: string;
  /** L'azione dell'invio di prova a chi preme, se l'avviso la prevede. */
  azioneProva?: string;
  /** La domanda prima dell'invio. */
  conferma: string;
  bottone: string;
  /** Accanto al bottone: a quanti parte. Null: a nessuno, e il bottone resta spento. */
  conteggio: string | null;
  /** Il testo quando non ci sono destinatari. */
  vuoto: string;
  /** Al posto del bottone, quando l'invio non si puo ancora fare. */
  blocco?: React.ReactNode;
  /** Per i campi di una risposta d'errore propri di un avviso. */
  onErrore?: (data: Record<string, unknown>) => void;
  /** Quello che l'avviso manda in piu alla rotta, con l'invio e con la prova. */
  corpo?: Record<string, unknown>;
  /** Campi da compilare prima di inviare, sopra i bottoni. */
  campi?: React.ReactNode;
  /** Falso finche i campi non sono a posto: i bottoni restano spenti. */
  pronto?: boolean;
  /** Il testo dell'email, come parte. */
  anteprima: React.ReactNode;
}) {
  const [inviando, setInviando] = useState<"tutti" | "prova" | null>(null);
  const [messaggio, setMessaggio] = useState<{ testo: string; errore: boolean } | null>(null);

  const chiama = async (azioneDaFare: string) => {
    const res = await fetch("/api/eventi/licei/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...corpo, azione: azioneDaFare }),
    });
    return { res, data: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  };

  const invia = async () => {
    if (!window.confirm(conferma)) return;
    setInviando("tutti");
    setMessaggio(null);
    try {
      const { res, data } = await chiama(azione);
      if (res.ok) {
        const esito: EsitoAvviso = {
          destinatari: Number(data.destinatari ?? 0),
          inviate: Number(data.inviate ?? 0),
          fallite: Number(data.fallite ?? 0),
        };
        onStato({ inviato_at: typeof data.inviato_at === "string" ? data.inviato_at : new Date().toISOString(), esito });
        setMessaggio({ testo: `Inviato: ${testoEsito(esito)}.`, errore: false });
        return;
      }
      // Gia inviato da un altro, nel frattempo: il pannello lo mostra.
      if (res.status === 409 && typeof data.inviato_at === "string") onStato({ inviato_at: data.inviato_at });
      onErrore?.(data);
      setMessaggio({ testo: typeof data.error === "string" ? data.error : "Invio non riuscito.", errore: true });
    } catch {
      setMessaggio({ testo: "Invio non riuscito: controlla la connessione e riprova.", errore: true });
    } finally {
      setInviando(null);
    }
  };

  const prova = async () => {
    if (!azioneProva) return;
    setInviando("prova");
    setMessaggio(null);
    try {
      const { res, data } = await chiama(azioneProva);
      setMessaggio(
        res.ok
          ? { testo: `Prova inviata a ${String(data.email ?? "te")}.`, errore: false }
          : { testo: typeof data.error === "string" ? data.error : "Prova non inviata.", errore: true },
      );
    } catch {
      setMessaggio({ testo: "Prova non inviata: controlla la connessione e riprova.", errore: true });
    } finally {
      setInviando(null);
    }
  };

  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="flex flex-wrap items-center gap-3" style={{ marginBottom: 4 }}>
        <h2 className="font-semibold text-gray-800" style={{ fontSize: 15, margin: 0 }}>
          {titolo}
        </h2>
        {stato.inviato_at ? (
          <span className="badge" style={{ background: "#0A7A661A", color: "#0A7A66" }}>
            Inviato
          </span>
        ) : (
          <span className="badge" style={{ background: "#8A61001A", color: "#8A6100" }}>
            Non ancora inviato
          </span>
        )}
      </div>
      <p className="text-sm text-gray-600" style={{ lineHeight: 1.7, marginBottom: 12 }}>
        {descrizione}
      </p>

      {stato.inviato_at ? (
        <p className="text-sm" style={{ color: "var(--text-dark)", lineHeight: 1.7, margin: "0 0 12px" }}>
          Inviato il {dataOra(stato.inviato_at)}
          {stato.esito ? `: ${testoEsito(stato.esito)}.` : "."}
        </p>
      ) : blocco ? (
        blocco
      ) : (
        <>
        {campi}
        <div className="flex flex-wrap items-center gap-3" style={{ marginBottom: 12 }}>
          <Button type="button" disabled={inviando !== null || conteggio === null || !pronto} onClick={invia}>
            <i className="fas fa-envelope" style={{ marginRight: 8 }} />
            {inviando === "tutti" ? "Invio in corso…" : bottone}
          </Button>
          {azioneProva && (
            <Button type="button" variant="outline" disabled={inviando !== null || !pronto} onClick={prova}>
              {inviando === "prova" ? "Invio della prova…" : "Invia una prova a me"}
            </Button>
          )}
          <span style={{ fontSize: 12.5, color: "var(--text-light)" }}>{conteggio ?? vuoto}</span>
        </div>
        </>
      )}

      {messaggio && (
        <p
          role={messaggio.errore ? "alert" : "status"}
          style={{
            color: messaggio.errore ? "#E74C6F" : "#0A7A66",
            fontSize: 13.5,
            margin: "0 0 12px",
            lineHeight: 1.6,
          }}
        >
          {messaggio.testo}
        </p>
      )}

      <details className="text-sm text-gray-600">
        <summary style={{ cursor: "pointer", fontWeight: 600, color: "var(--text-dark)" }}>
          Il testo dell&apos;email
        </summary>
        <div
          style={{
            marginTop: 10,
            background: "var(--bg-light)",
            borderRadius: 10,
            padding: "12px 14px",
            lineHeight: 1.7,
          }}
        >
          {anteprima}
        </div>
      </details>
    </div>
  );
}

/**
 * L'avviso una tantum agli studenti: da ora i docenti dell'istituto leggono
 * riflessioni e domande delle consegne salvate dopo l'avviso nel box della
 * lezione, e quelle di prima tre giorni dopo che la piattaforma lo segnala
 * allo studente, salvo un suo no. Il bottone resta spento finche manca la
 * migrazione: annuncerebbe una funzione che non c'e ancora.
 */
export function AvvisoRiflessioni({
  stato,
  onAggiornato,
}: {
  stato: StatoAvvisoRiflessioni | null;
  onAggiornato: (s: StatoAvvisoRiflessioni) => void;
}) {
  if (!stato) return null;
  const informativaUrl = `${SITE_URL}${INFORMATIVA_STUDENTI_PATH}`;

  return (
    <AvvisoUnaTantum
      titolo="Avviso agli studenti sulle riflessioni"
      descrizione={
        <>
          I docenti dell&apos;istituto leggono riflessione e domanda delle consegne salvate dopo
          l&apos;avviso nel box della lezione; le precedenti tre giorni dopo che la piattaforma lo
          segnala allo studente, a meno che scelga che restino allo staff. I commenti restano sempre
          allo staff. Questa email lo comunica a tutti gli iscritti, confermati e in attesa. Parte una
          volta sola.
        </>
      }
      stato={stato}
      onStato={(p) => onAggiornato({ ...stato, ...p })}
      azione="avviso_riflessioni"
      conferma={`Inviare l'avviso sulle riflessioni a ${stato.iscritti} iscritti (confermati e in attesa)? Si può inviare una volta sola.`}
      bottone="Invia avviso sulle riflessioni"
      conteggio={stato.iscritti === 0 ? null : `${stato.iscritti} iscritti, un'email per indirizzo.`}
      vuoto="Nessuno studente iscritto per ora."
      blocco={
        stato.colonna === "assente" ? (
          <p className="text-sm" style={{ color: "#8A6100", lineHeight: 1.7, margin: "0 0 12px" }}>
            Prima applica la migrazione 20261215000000: senza la colonna condivisa_referente_at
            l&apos;avviso annuncerebbe una funzione non ancora attiva.
          </p>
        ) : stato.colonna === "errore" ? (
          <p className="text-sm" style={{ color: "#B44A5E", lineHeight: 1.7, margin: "0 0 12px" }}>
            Non è stato possibile verificare la migrazione: ricarica il pannello.
          </p>
        ) : undefined
      }
      onErrore={(data) => {
        if (data.colonna === "assente") onAggiornato({ ...stato, colonna: "assente" });
      }}
      anteprima={
        <>
          <p style={ANTEPRIMA_P}>
            <strong>Oggetto:</strong> {AVVISO_RIFLESSIONI_OGGETTO}
          </p>
          <p style={ANTEPRIMA_P}>Ciao (nome dello studente),</p>
          <p style={ANTEPRIMA_P}>{AVVISO_RIFLESSIONI_TESTO.apertura}</p>
          <p style={{ ...ANTEPRIMA_P, overflowWrap: "anywhere" }}>
            {AVVISO_RIFLESSIONI_TESTO.informativa}{" "}
            <a href={informativaUrl} target="_blank" rel="noreferrer" style={{ color: "var(--primary-dark)" }}>
              {informativaUrl}
            </a>
            .
          </p>
          <p style={{ margin: 0 }}>{AVVISO_RIFLESSIONI_TESTO.dubbi}</p>
        </>
      }
    />
  );
}

/**
 * L'avviso una tantum ai docenti: le squadre vanno da 1 a 6, i problemi
 * segnalati sono stati risolti, e se qualcosa non va ce lo scrivono. Parte
 * ai referenti delle adesioni confermate e ai docenti del progetto. Prima si
 * puo mandarne una prova a se stessi.
 */
export function AvvisoSquadre({
  stato,
  onAggiornato,
}: {
  stato: StatoAvvisoSquadre | null;
  onAggiornato: (s: StatoAvvisoSquadre) => void;
}) {
  if (!stato) return null;
  const n = stato.docenti;

  return (
    <AvvisoUnaTantum
      titolo="Avviso ai docenti sulle squadre"
      descrizione={
        <>
          Un&apos;email a ogni docente: i referenti delle adesioni confermate e i docenti del progetto
          di quegli istituti, un indirizzo per persona. Dice che le squadre vanno da 1 a 6 studenti,
          quali problemi segnalati sono stati risolti, e chiede un riscontro. Le risposte arrivano a
          info@bioergotech.org. Prima puoi mandarne una prova a te. Parte una volta sola.
        </>
      }
      stato={stato}
      onStato={(p) => onAggiornato({ ...stato, ...p })}
      azione="avviso_squadre"
      azioneProva="avviso_squadre_prova"
      conferma={`Inviare l'avviso sulle squadre a ${n ?? 0} docenti? Si può inviare una volta sola.`}
      bottone="Invia ai docenti"
      conteggio={n ? `${n} docenti, un'email per indirizzo.` : null}
      vuoto="Nessun docente con un'adesione confermata per ora."
      blocco={
        n === null ? (
          <p className="text-sm" style={{ color: "#B44A5E", lineHeight: 1.7, margin: "0 0 12px" }}>
            Non è stato possibile contare i docenti: ricarica il pannello.
          </p>
        ) : undefined
      }
      anteprima={
        <>
          <p style={ANTEPRIMA_P}>
            <strong>Oggetto:</strong> {AVVISO_SQUADRE_OGGETTO}
          </p>
          <p style={ANTEPRIMA_P}>Gentile (nome e cognome del docente),</p>
          <p style={ANTEPRIMA_P}>{AVVISO_SQUADRE_TESTO.apertura}</p>
          <p style={ANTEPRIMA_P}>{AVVISO_SQUADRE_TESTO.squadre}</p>
          <p style={{ margin: "0 0 4px" }}>{AVVISO_SQUADRE_TESTO.correzioniIntro}</p>
          <ul style={{ margin: "0 0 8px", paddingLeft: 20, listStyle: "disc" }}>
            {AVVISO_SQUADRE_TESTO.correzioni.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p style={ANTEPRIMA_P}>{AVVISO_SQUADRE_TESTO.riscontro}</p>
          <p style={ANTEPRIMA_P}>{AVVISO_SQUADRE_TESTO.grazie}</p>
          <p style={{ margin: 0 }}>
            {AVVISO_SQUADRE_TESTO.firma.map((riga, i) => (
              <span key={riga}>
                {i > 0 && <br />}
                {riga}
              </span>
            ))}
          </p>
        </>
      }
    />
  );
}

/**
 * Le notizie dal percorso agli studenti iscritti: il prossimo talk, le
 * squadre fino a 6 e gli ultimi post di Instagram, che lo staff incolla
 * qui. Una volta per edizione. L'anteprima segue i campi mentre si scrive,
 * e la prova parte con i post scritti in quel momento.
 */
export function AvvisoNotizie({
  stato,
  onAggiornato,
}: {
  stato: StatoAvvisoNotizie | null;
  onAggiornato: (s: StatoAvvisoNotizie) => void;
}) {
  const [righe, setRighe] = useState(() =>
    Array.from({ length: POST_INSTAGRAM_MAX }, () => ({ url: "", titolo: "" })),
  );
  if (!stato) return null;

  const letti = leggiPostInstagram(righe);
  const post = "post" in letti ? letti.post : [];
  const errore = "errore" in letti ? letti.errore : null;
  const T = NOTIZIE_STUDENTI_TESTO;
  const cambia = (i: number, campo: "url" | "titolo", valore: string) =>
    setRighe((r) => r.map((x, j) => (j === i ? { ...x, [campo]: valore } : x)));

  return (
    <AvvisoUnaTantum
      titolo="Notizie dal percorso agli studenti"
      descrizione={
        <>
          Un&apos;email a tutti gli iscritti, confermati e in attesa: il prossimo talk, le squadre fino a
          6 e gli ultimi post di Instagram con il bottone per seguire il profilo. È una comunicazione sul
          percorso, quindi può andare a tutti; per questo i post devono parlare del percorso. Incolla
          fino a {POST_INSTAGRAM_MAX}{" "}link (dall&apos;app: Condividi, Copia link) con una riga che li
          descrive, guarda l&apos;anteprima e manda prima una prova a te. Parte una volta sola.
        </>
      }
      stato={stato}
      onStato={(p) => onAggiornato({ ...stato, ...p })}
      azione="avviso_notizie"
      azioneProva="avviso_notizie_prova"
      corpo={{ post }}
      pronto={errore === null}
      conferma={`Inviare le notizie dal percorso a ${stato.iscritti} iscritti (confermati e in attesa), con ${post.length} post di Instagram? Si può inviare una volta sola.`}
      bottone="Invia agli studenti"
      conteggio={stato.iscritti === 0 ? null : `${stato.iscritti} iscritti, un'email per indirizzo.`}
      vuoto="Nessuno studente iscritto per ora."
      campi={
        <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
          {righe.map((r, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 8 }}>
              <Input
                aria-label={`Link del post ${i + 1}`}
                placeholder={`Link del post ${i + 1} (https://www.instagram.com/p/...)`}
                value={r.url}
                onChange={(e) => cambia(i, "url", e.target.value)}
              />
              <Input
                aria-label={`Descrizione del post ${i + 1}`}
                placeholder="Una riga che lo descrive, es. Il talk di lunedì con Emanuele Memmola"
                maxLength={TITOLO_POST_MAX}
                value={r.titolo}
                onChange={(e) => cambia(i, "titolo", e.target.value)}
              />
            </div>
          ))}
          {errore && (
            <p role="alert" style={{ color: "#B44A5E", fontSize: 13, margin: 0 }}>
              {errore}
            </p>
          )}
        </div>
      }
      anteprima={
        <>
          <p style={ANTEPRIMA_P}>
            <strong>Oggetto:</strong> {NOTIZIE_STUDENTI_OGGETTO}
          </p>
          <p style={ANTEPRIMA_P}>Ciao (nome dello studente), {T.apertura}</p>
          {stato.talk ? (
            <p style={ANTEPRIMA_P}>
              <strong>{T.talkTitolo}</strong> (con l&apos;immagine del talk): «{stato.talk.titolo}», {stato.talk.relatore}.{" "}
              {stato.talk.quando} . {stato.talk.luogo}. {T.talkInvito} [{T.talkBottone}]
            </p>
          ) : (
            <p style={{ ...ANTEPRIMA_P, color: "#8A6100" }}>
              Nessun talk in programma: la parte sul talk non compare.
            </p>
          )}
          <p style={ANTEPRIMA_P}>
            <strong>{T.squadreTitolo}</strong>. {T.squadre}
          </p>
          <p style={{ margin: "0 0 4px" }}>
            <strong>{T.instagramTitolo}</strong>. {post.length ? T.instagram : T.instagramSenzaPost}
          </p>
          {post.length > 0 && (
            <ul style={{ margin: "0 0 8px", paddingLeft: 20, listStyle: "disc" }}>
              {post.map((x) => (
                <li key={x.url} style={{ overflowWrap: "anywhere" }}>
                  <a href={x.url} target="_blank" rel="noreferrer" style={{ color: "var(--primary-dark)" }}>
                    {x.titolo || T.postSenzaTitolo}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p style={ANTEPRIMA_P}>
            [{T.instagramBottone}] ({SOCIAL.instagram})
          </p>
          <p style={{ margin: 0 }}>{T.problemi}</p>
        </>
      }
    />
  );
}
