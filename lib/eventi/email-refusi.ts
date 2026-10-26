/**
 * Refusi nel dominio di un indirizzo email: "gmail.cpm" invece di
 * "gmail.com".
 *
 * Un indirizzo sbagliato passa ogni controllo di forma, e chi lo scrive non
 * se ne accorge: l'email con il link della password non arriva, lo studente
 * non entra nel corso, e nella console del docente risulta "Mai entrato"
 * senza che nessuno sappia perche. E successo con "gmail.cpm".
 *
 * Due livelli, perche non tutti i refusi sono certi:
 *
 * - **impossibile**: il dominio finisce con una terminazione che non esiste
 *   (".cpm", ".con", ".ti"). Non c'e niente da confermare: l'indirizzo e
 *   sbagliato e va corretto;
 * - **sospetto**: il dominio e a una lettera da quello di un servizio
 *   diffuso ("gmial.com", "hotmail.ti", "libero.tt") o e Gmail con la
 *   terminazione sbagliata ("gmail.it"). Quasi sempre e un refuso, ma un
 *   dominio vero vicino a uno noto puo esistere: chi scrive puo confermare
 *   che e giusto cosi.
 *
 * Senza React e senza rete: lo stesso modulo gira nel modulo, per il
 * suggerimento immediato, e nelle rotte, dove il controllo conta davvero.
 */

/**
 * I domini che si accettano cosi come sono. Comprende quelli a una lettera
 * da un altro della lista ("tim.it" e "tin.it", "mail.com" e "gmail.com"),
 * che altrimenti si suggerirebbero a vicenda.
 */
const DOMINI_NOTI = new Set([
  "gmail.com",
  "googlemail.com",
  "hotmail.it",
  "hotmail.com",
  "outlook.it",
  "outlook.com",
  "live.it",
  "live.com",
  "msn.com",
  "yahoo.it",
  "yahoo.com",
  "ymail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "libero.it",
  "virgilio.it",
  "alice.it",
  "tin.it",
  "tim.it",
  "tiscali.it",
  "email.it",
  "email.com",
  "mail.com",
  "fastwebnet.it",
  "inwind.it",
  "iol.it",
  "gmx.it",
  "gmx.com",
  "proton.me",
  "protonmail.com",
]);

/**
 * I servizi verso cui si suggerisce una correzione. Solo domini lunghi e
 * diffusi: a una lettera da un dominio corto ("me.com") ce ne sono troppi
 * di veri per indovinare.
 */
const DOMINI_SUGGERIBILI = [
  "gmail.com",
  "hotmail.it",
  "hotmail.com",
  "outlook.it",
  "outlook.com",
  "yahoo.it",
  "yahoo.com",
  "icloud.com",
  "libero.it",
  "virgilio.it",
  "alice.it",
  "tiscali.it",
  "live.it",
  "live.com",
];

/**
 * Terminazioni che non esistono e che sono refusi di ".com", ".it", ".org"
 * e ".net". Nessuna e un dominio di primo livello vero: ".co", ".cm" e
 * ".om" invece lo sono (Colombia, Camerun, Oman), e restano fra i sospetti.
 */
const TERMINAZIONI_INESISTENTI = new Set([
  "cpm",
  "con",
  "cmo",
  "ocm",
  "vom",
  "xom",
  "cim",
  "cok",
  "clm",
  "ckm",
  "comm",
  "coom",
  "ccom",
  "cpom",
  "itt",
  "iit",
  "ti",
  "iy",
  "ut",
  "ot",
  "ogr",
  "orgg",
  "nett",
]);

/**
 * Distanza fra due stringhe contando come un errore solo anche lo scambio
 * di due lettere vicine ("gmial" e "gmail"): e il refuso piu comune su una
 * tastiera.
 */
function distanza(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + costo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/** Il servizio piu vicino entro `soglia`, o null. A parita vince il primo della lista. */
function piuVicino(dominio: string, soglia: number): string | null {
  let migliore: string | null = null;
  let minima = soglia + 1;
  for (const candidato of DOMINI_SUGGERIBILI) {
    const dist = distanza(dominio, candidato);
    if (dist < minima) {
      minima = dist;
      migliore = candidato;
    }
  }
  return migliore;
}

export type RefusoEmail = {
  /** La terminazione non esiste: l'indirizzo e sbagliato di sicuro. */
  impossibile: boolean;
  /** Il dominio come e stato scritto, per dirlo nel messaggio. */
  dominio: string;
  /** L'indirizzo corretto, se si riesce a indovinarlo. */
  suggerimento: string | null;
};

/**
 * Il refuso nel dominio di un indirizzo, o null se non se ne vede nessuno.
 * Non giudica la forma dell'indirizzo, che resta compito di chi lo valida:
 * un indirizzo senza "@" torna null.
 */
export function refusoEmail(email: string): RefusoEmail | null {
  const pulita = email.trim().toLowerCase();
  const chiocciola = pulita.lastIndexOf("@");
  if (chiocciola <= 0 || chiocciola === pulita.length - 1) return null;
  const locale = pulita.slice(0, chiocciola);
  const dominio = pulita.slice(chiocciola + 1);
  if (DOMINI_NOTI.has(dominio)) return null;

  const punto = dominio.lastIndexOf(".");
  const nome = punto > 0 ? dominio.slice(0, punto) : dominio;
  const terminazione = punto > 0 ? dominio.slice(punto + 1) : "";
  // Un dominio di primo livello vero ha almeno due lettere: un punto finale,
  // una cifra o una lettera sola sono refusi anche loro.
  const impossibile =
    TERMINAZIONI_INESISTENTI.has(terminazione) ||
    !/^(?:[a-z]{2,}|xn--[a-z0-9-]+)$/.test(terminazione);

  let corretto: string | null = null;
  if (nome === "gmail") {
    // Gmail ha una sola terminazione: "gmail.it" e "gmail.co" sono refusi.
    corretto = "gmail.com";
  } else {
    // Se la terminazione e impossibile, l'indirizzo e sbagliato comunque e
    // si puo cercare un po' piu lontano.
    corretto = piuVicino(dominio, impossibile ? 2 : 1);
  }

  if (!impossibile && !corretto) return null;
  return {
    impossibile,
    dominio,
    suggerimento: corretto ? `${locale}@${corretto}` : null,
  };
}

/**
 * Il messaggio per un indirizzo con un refuso, o null. Con `confermata` uno
 * sospetto passa: chi scrive ha detto che e giusto cosi. Uno impossibile no.
 * `confermaComeDire` e il modo in cui si conferma, detto a parole ("scegli
 * «È giusto così» sotto il campo").
 */
export function messaggioRefusoEmail(
  email: string,
  opzioni: { confermata?: boolean; confermaComeDire: string },
): string | null {
  const refuso = refusoEmail(email);
  if (!refuso) return null;
  if (refuso.impossibile) {
    return refuso.suggerimento
      ? `L'indirizzo email finisce con «${refuso.dominio}», che non esiste: forse è ${refuso.suggerimento}? Correggilo, altrimenti l'email per entrare nel corso non arriva.`
      : `L'indirizzo email finisce con «${refuso.dominio}», che non esiste. Correggilo, altrimenti l'email per entrare nel corso non arriva.`;
  }
  if (opzioni.confermata) return null;
  return `Controlla l'indirizzo email: forse è ${refuso.suggerimento}? Correggilo, oppure ${opzioni.confermaComeDire}.`;
}
