import { NextResponse } from "next/server";
import QRCode from "qrcode";

/**
 * Restituisce il QR code di un biglietto come SVG. Codifica solo il codice
 * univoco (non un dato personale), quindi puo comparire in email e URL.
 * Serve sia all'email di conferma sia alla pagina biglietto.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const safe = code.replace(/[^A-Z0-9-]/gi, "").slice(0, 32);

  if (!safe) {
    return NextResponse.json({ error: "Codice mancante" }, { status: 400 });
  }

  const svg = await QRCode.toString(safe, {
    type: "svg",
    margin: 1,
    width: 240,
    color: { dark: "#0A1628", light: "#FFFFFF" },
  });

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
