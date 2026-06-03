import { NextRequest, NextResponse } from "next/server";

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
      const error = await response.text();
      return NextResponse.json({ error: `Backend error: ${error}` }, { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
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
      const error = await response.text();
      return NextResponse.json({ error: `PDF error: ${error}` }, { status: response.status });
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
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
