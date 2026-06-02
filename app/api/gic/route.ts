import { NextRequest, NextResponse } from "next/server";

const GIC_BACKEND_URL =
  process.env.GIC_BACKEND_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const caseData = await req.json();

    // Forward to Python FastAPI backend
    const response = await fetch(`${GIC_BACKEND_URL}/generate-report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(caseData),
      signal: AbortSignal.timeout(300_000), // 5 min timeout
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Backend error: ${error}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[GIC API] Error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
