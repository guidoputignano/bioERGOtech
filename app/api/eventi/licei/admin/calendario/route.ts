import { NextResponse } from "next/server";
import { Resend } from "resend";
import { requireAdmin } from "@/lib/auth/admin";
import { MITTENTE_AVVISI, RISPOSTE_AVVISI } from "@/lib/eventi/licei-avvisi";
import {
  analizza,
  eseguiCalendario,
  leggiQuadro,
  migrazioneApplicata,
  ridistribuisci,
  statoCalendario,
  type Db,
} from "@/lib/eventi/licei-commissione-auto";
import * as E from "@/lib/eventi/licei-commissione-email";
import { GIUDICI_PER_PROGETTO, SCHEDE_MINIME, passo } from "@/app/eventi/vivere-piu-a-lungo/licei/smistamento";

/**
 * Il calendario automatico della Commissione, per lo staff.
 *
 * - GET: i passi con il loro stato, e i numeri dello smistamento.
 * - GET `?anteprima=<tipo>`: l'email di quel tipo, con dati di esempio,
 *   come pagina HTML. Il pannello la apre in una scheda nuova.
 * - POST `{ azione: "prova", tipo }`: la stessa email a chi la chiede.
 * - POST `{ azione: "esegui" }`: un giro del cron adesso. Fa solo i passi
 *   gia dovuti e non fatti, quindi e innocuo: serve se il cron non e
 *   partito, o per mandare l'aggiornamento prima di lunedi.
 * - POST `{ azione: "aggiornamento_ora" }`: l'aggiornamento a studenti e
 *   scuole adesso, invece che lunedi 16 alle 8.
 * - POST `{ azione: "ridistribuisci", commissario_id }`: toglie a un
 *   giudice i progetti non chiusi e li affida alla riserva (o agli altri).
 */

export const maxDuration = 300;

/** Le email in anteprima, con dati di esempio. */
const ANTEPRIME: Record<string, { subject: string | (() => string); html: () => string }> = {
  // Il talk e quello vero del momento: l'anteprima mostra cio che partirebbe adesso.
  aggiornamento_studenti: {
    subject: () => E.aggiornamentoStudentiSubject(E.talkDaAnnunciare()),
    html: () => E.aggiornamentoStudentiHtml({ nome: "Giulia", talk: E.talkDaAnnunciare() }),
  },
  aggiornamento_scuole: {
    subject: () => E.aggiornamentoScuoleSubject(E.talkDaAnnunciare()),
    html: () => E.aggiornamentoScuoleHtml({ nome: "Maria Rossi", talk: E.talkDaAnnunciare() }),
  },
  consegna_studente: {
    subject: E.promemoriaConsegnaSubject(false),
    html: () => E.promemoriaConsegnaStudenteHtml({ nome: "Giulia", squadra: "BioTeam", titolo: "Un sensore per l'acqua", ultimo: false }),
  },
  consegna_ultimo: {
    subject: E.promemoriaConsegnaSubject(true),
    html: () => E.promemoriaConsegnaStudenteHtml({ nome: "Giulia", squadra: "BioTeam", titolo: "Un sensore per l'acqua", ultimo: true }),
  },
  consegna_docente: {
    subject: E.promemoriaConsegnaDocenteSubject(),
    html: () =>
      E.promemoriaConsegnaDocenteHtml({
        nome: "Maria Rossi",
        istituto: "Liceo Scientifico di esempio",
        inBozza: [{ squadra: "BioTeam", componenti: 4 }, { squadra: "Green Lab", componenti: 3 }],
        senzaSquadra: 2,
        consegnati: 5,
      }),
  },
  giudice_smistamento: { subject: E.giudiceSmistamentoSubject(false), html: () => E.giudiceSmistamentoHtml({ nome: "Mario Bianchi", assegnati: 20, riserva: false }) },
  giudice_riserva: { subject: E.giudiceSmistamentoSubject(true), html: () => E.giudiceSmistamentoHtml({ nome: "Mario Bianchi", assegnati: 0, riserva: true }) },
  scuola_consegne: {
    subject: E.scuolaConsegneSubject(),
    html: () =>
      E.scuolaConsegneHtml({
        nome: "Maria Rossi",
        istituto: "Liceo Scientifico di esempio",
        consegnati: [{ squadra: "BioTeam", titolo: "Un sensore per l'acqua" }, { squadra: "Green Lab", titolo: "Alghe contro la CO2" }],
        nonConsegnati: 1,
      }),
  },
  studente_dopo: {
    subject: E.studenteDopoConsegnaSubject(),
    html: () => E.studenteDopoConsegnaHtml({ nome: "Giulia", squadra: "BioTeam", titolo: "Un sensore per l'acqua" }),
  },
  giudice_meta: { subject: E.giudiceMetaSubject(), html: () => E.giudiceMetaHtml({ nome: "Mario Bianchi", assegnati: 20, chiusi: 0, nonIniziato: true }) },
  giudice_tolti: { subject: E.giudiceTolteSubject(), html: () => E.giudiceTolteHtml({ nome: "Mario Bianchi", n: 20 }) },
  giudice_nuovi: { subject: E.giudiceNuoviSubject(), html: () => E.giudiceNuoviHtml({ nome: "Mario Bianchi", n: 3, entro: E.ENTRO_RISERVA }) },
  giudice_ultimo: { subject: E.giudiceUltimoGiornoSubject(), html: () => E.giudiceUltimoGiornoHtml({ nome: "Mario Bianchi", mancano: 4, assegnati: 20 }) },
};

const oggettoDi = (a: { subject: string | (() => string) }) => (typeof a.subject === "function" ? a.subject() : a.subject);

export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const db = guard.client as Db;

  const tipo = new URL(request.url).searchParams.get("anteprima");
  if (tipo) {
    const a = ANTEPRIME[tipo];
    if (!a) return NextResponse.json({ error: "Anteprima non trovata." }, { status: 404 });
    const oggetto = oggettoDi(a);
    return new NextResponse(
      `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>${oggetto}</title></head><body style="margin:0;padding:24px;background:#EEF2F5;"><p style="font-family:sans-serif;font-size:13px;color:#4A5568;max-width:600px;margin:0 auto 12px;"><strong>Oggetto:</strong> ${oggetto}</p>${a.html()}</body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" } },
    );
  }

  try {
    const [{ data: config }, migrazione] = await Promise.all([
      db.from("licei_config").select("chiave, valore").like("chiave", "auto_%"),
      migrazioneApplicata(db),
    ]);
    let numeri = null;
    if (migrazione) {
      const q = await leggiQuadro(db);
      const a = analizza(q);
      const conGiudici = new Map<string, number>();
      for (const r of a.attive) conGiudici.set(r.progetto_id, (conGiudici.get(r.progetto_id) ?? 0) + 1);
      numeri = {
        progetti: q.progetti.length,
        senza_temi: q.progetti.filter((p) => !p.temi || p.temi.length === 0).length,
        giudici: a.ordinari.length,
        riserva: a.riserva.length,
        giudici_senza_temi: a.ordinari.filter((g) => g.temi.length === 0).length,
        assegnazioni: a.attive.length,
        sotto_giudici: q.progetti.filter((p) => (conGiudici.get(p.id) ?? 0) < GIUDICI_PER_PROGETTO).length,
        sotto_schede: q.progetti.filter((p) => (a.chiusePerProgetto.get(p.id) ?? 0) < SCHEDE_MINIME).length,
      };
    }
    return NextResponse.json(
      {
        migrazione,
        cron: !!process.env.CRON_SECRET,
        passi: statoCalendario((config ?? []) as { chiave: string; valore: string | null }[]),
        numeri,
        anteprime: Object.keys(ANTEPRIME),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    console.error("Licei calendario: lettura non riuscita:", err);
    return NextResponse.json({ error: "Lettura non riuscita." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const db = guard.client as Db;
  const { chiamante } = guard;
  const body = (await request.json().catch(() => ({}))) as { azione?: string; tipo?: string; commissario_id?: string };

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Invio email non configurato: manca RESEND_API_KEY." }, { status: 503 });
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  if (body.azione === "prova") {
    const a = ANTEPRIME[body.tipo ?? ""];
    if (!a) return NextResponse.json({ error: "Email non trovata." }, { status: 404 });
    if (!chiamante.email) return NextResponse.json({ error: "Il tuo account non ha un'email." }, { status: 400 });
    const { error } = await resend.emails.send({
      from: MITTENTE_AVVISI,
      to: chiamante.email,
      replyTo: RISPOSTE_AVVISI,
      subject: `[Prova] ${oggettoDi(a)}`,
      html: a.html(),
    });
    if (error) {
      console.error("Licei calendario: prova non inviata:", error);
      return NextResponse.json({ error: "La prova non è partita. Riprova fra poco." }, { status: 502 });
    }
    return NextResponse.json({ success: true, email: chiamante.email });
  }

  if (body.azione === "esegui" || body.azione === "aggiornamento_ora") {
    try {
      // "Adesso" per l'aggiornamento: lo stesso giro, con l'orologio spostato
      // all'inizio della sua finestra se non ci siamo ancora. Gli altri passi
      // restano futuri, perche dipendono dalla data vera.
      const adesso = new Date();
      if (body.azione === "aggiornamento_ora") {
        const da = Date.parse(passo("aggiornamento").da);
        if (adesso.getTime() < da) adesso.setTime(da);
      }
      const r = await eseguiCalendario(db, resend, adesso);
      if (r.occupato) return NextResponse.json({ error: "Un altro giro è in corso. Riprova fra qualche minuto." }, { status: 409 });
      return NextResponse.json({ success: true, esiti: r.esiti });
    } catch (err) {
      console.error("Licei calendario: giro dal pannello non riuscito:", err);
      return NextResponse.json({ error: "Giro non riuscito." }, { status: 500 });
    }
  }

  if (body.azione === "ridistribuisci") {
    if (!body.commissario_id) return NextResponse.json({ error: "Giudice non indicato." }, { status: 400 });
    try {
      const q = await leggiQuadro(db);
      if (!q.assegnazioni.presente) {
        return NextResponse.json({ error: "Manca la migrazione 20261231100000." }, { status: 503 });
      }
      const { tolte, nuove } = await ridistribuisci(db, q, [body.commissario_id]);
      // A chi riceve, subito. Chi li perde lo sa gia: lo ha deciso lo staff.
      const per = new Map<string, number>();
      for (const n of nuove) per.set(n.commissario_id, (per.get(n.commissario_id) ?? 0) + 1);
      for (const [id, n] of per) {
        const g = q.giudici.find((x) => x.id === id);
        if (!g) continue;
        try {
          await resend.emails.send({
            from: MITTENTE_AVVISI,
            to: g.email,
            replyTo: RISPOSTE_AVVISI,
            subject: E.giudiceNuoviSubject(),
            html: E.giudiceNuoviHtml({ nome: `${g.nome} ${g.cognome}`.trim(), n, entro: E.ENTRO_GIUDICI }),
          });
        } catch (mailErr) {
          console.error("Licei ridistribuzione: email non partita:", mailErr);
        }
      }
      return NextResponse.json({ success: true, tolte: tolte.get(body.commissario_id) ?? 0, affidate: nuove.length });
    } catch (err) {
      console.error("Licei ridistribuzione error:", err);
      return NextResponse.json({ error: "Ridistribuzione non riuscita." }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Azione non riconosciuta." }, { status: 400 });
}
