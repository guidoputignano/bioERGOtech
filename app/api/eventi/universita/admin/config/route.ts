/**
 * La configurazione delle fasi del percorso universitario.
 *
 * E' il quadro comandi dell'intera macchina: da queste sette righe dipende
 * se una candidatura entra da sola nel percorso, se le squadre si possono
 * formare, se la bacheca e visibile, se i progetti si consegnano e se la
 * Commissione puo aprire le schede. Vive a database e non in `content.ts`
 * perche l'art. 11 rimanda termini e modalita ai canali ufficiali: con le
 * date nel codice ogni comunicazione degli organizzatori richiederebbe un
 * rilascio del sito, e chi comunica non e chi rilascia.
 *
 * Da qui la severita della PUT. Una chiave sconosciuta o un valore
 * sconosciuto sono un 400 e non un salvataggio: `leggiConfigUniversita`
 * ricade sui default davanti a un valore che non riconosce, e i default
 * sono tutti "chiuso". Accettare un refuso significherebbe far vedere allo
 * staff il comando che risponde e la fase che resta chiusa, senza un errore
 * da nessuna parte e senza niente da guardare per capire perche.
 */

import { NextResponse } from "next/server";
import { getEventAdminClient } from "@/lib/eventi/admin-guard";
import { CONFIG_CHIAVI_UNIVERSITA } from "@/app/eventi/vivere-piu-a-lungo/universita/content";

const CHIAVI_VALIDE = new Set<string>(Object.keys(CONFIG_CHIAVI_UNIVERSITA));

/**
 * I valori ammessi per ogni interruttore, copiati dai `check` della
 * migrazione e dai tipi di `content.ts`. Le chiavi che non compaiono qui
 * sono testo libero: `scadenza_consegna_label` e `avviso` finiscono in
 * pagina come sono, quindi l'unico limite che ha senso e la lunghezza.
 */
const VALORI_AMMESSI: Record<string, Set<string>> = {
  conferma_automatica: new Set(["si", "no"]),
  stato_squadre: new Set(["chiuse", "aperte"]),
  stato_board: new Set(["chiusa", "aperta"]),
  stato_consegne: new Set(["chiuse", "aperte"]),
  stato_valutazione: new Set(["chiusa", "aperta"]),
};

const MAX_TESTO = 400;

type RigaConfig = { chiave: string; valore: string; updated_at: string };

/** Tutte le righe, anche quelle vuote: il pannello mostra il quadro intero. */
export async function GET() {
  const { error, status, client } = await getEventAdminClient();
  if (error || !client) return NextResponse.json({ error }, { status });

  const { data, error: erroreLettura } = await client
    .from("universita_config")
    .select("chiave, valore, updated_at")
    .order("chiave", { ascending: true });

  if (erroreLettura) {
    console.error("Universita admin config: lettura fallita:", erroreLettura);
    return NextResponse.json(
      { error: "Non è stato possibile leggere la configurazione." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    config: (data ?? []) as RigaConfig[],
    chiavi: CONFIG_CHIAVI_UNIVERSITA,
  });
}

/**
 * Cambia un interruttore per volta.
 *
 * Uno per volta e non un oggetto intero di proposito: ogni riga di questa
 * tabella apre o chiude una fase davanti a delle persone, e un salvataggio
 * cumulativo rende possibile spostarne quattro credendo di averne toccata
 * una. Il pannello chiama questa rotta tante volte quante sono le modifiche
 * che lo staff ha davvero deciso.
 */
export async function PUT(request: Request) {
  const { error, status, client } = await getEventAdminClient();
  if (error || !client) return NextResponse.json({ error }, { status });

  const body = (await request.json()) as { chiave?: unknown; valore?: unknown };

  const chiave = typeof body.chiave === "string" ? body.chiave.trim() : "";
  const valore = typeof body.valore === "string" ? body.valore.trim() : "";

  if (!chiave) return NextResponse.json({ error: "Chiave non indicata." }, { status: 400 });

  if (!CHIAVI_VALIDE.has(chiave)) {
    return NextResponse.json({ error: `Chiave non prevista: ${chiave}` }, { status: 400 });
  }

  const ammessi = VALORI_AMMESSI[chiave];
  if (ammessi && !ammessi.has(valore)) {
    return NextResponse.json(
      {
        error: `Valore non valido per ${chiave}: ${valore || "(vuoto)"}. Sono ammessi: ${[...ammessi].join(", ")}.`,
      },
      { status: 400 },
    );
  }

  if (valore.length > MAX_TESTO) {
    return NextResponse.json(
      { error: `Il valore di ${chiave} supera i ${MAX_TESTO} caratteri.` },
      { status: 400 },
    );
  }

  const { error: erroreScrittura } = await client
    .from("universita_config")
    .upsert({ chiave, valore }, { onConflict: "chiave" });

  if (erroreScrittura) {
    console.error("Universita admin config: scrittura fallita:", erroreScrittura);
    return NextResponse.json(
      { error: "Non è stato possibile salvare la configurazione." },
      { status: 500 },
    );
  }

  // Si rilegge tutto e si torna tutto: il pannello non deve ricostruire in
  // memoria lo stato di una macchina le cui righe si toccano anche da
  // altrove, e `updated_at` lo mette solo il database.
  const { data } = await client
    .from("universita_config")
    .select("chiave, valore, updated_at")
    .order("chiave", { ascending: true });

  return NextResponse.json({ success: true, config: (data ?? []) as RigaConfig[] });
}
