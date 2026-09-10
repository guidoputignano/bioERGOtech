import { NextRequest, NextResponse } from "next/server";

/**
 * Ponte verso il backend del prototipo GIC.
 *
 * Questa rotta non ha una guardia di autenticazione: e raggiungibile da
 * chiunque e inoltra la richiesta a GIC_BACKEND_URL con un timeout di 300
 * secondi. La decisione se chiuderla e di chi gestisce il pilota, perche una
 * guardia rompe l'accesso a chi non ha un account sul portale.
 *
 * Nel frattempo il testo di errore del backend non viene piu restituito al
 * chiamante: conteneva potenzialmente hostname interni e stack trace.
 */
const GIC_BACKEND_URL = process.env.GIC_BACKEND_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const caseData = await req.json();
    const response = await fetch(`${GIC_BACKEND_URL}/generate-report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(caseData),
      signal: AbortSignal.timeout(300_000),
    });
    if (!response.ok) {
      console.error("GIC backend error:", response.status, await response.text());
      return NextResponse.json({ error: "Report generation failed" }, { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("GIC report error:", err);
    return NextResponse.json({ error: "Report generation failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const payload = await req.json();
    const response = await fetch(`${GIC_BACKEND_URL}/render-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) {
      console.error("GIC PDF error:", response.status, await response.text());
      return NextResponse.json({ error: "PDF generation failed" }, { status: response.status });
    }
    const pdfBytes = await response.arrayBuffer();
    const today = new Date().toISOString().split("T")[0];
    return new Response(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=GIC_${today}.pdf`,
      },
    });
  } catch (err) {
    console.error("GIC PDF error:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
