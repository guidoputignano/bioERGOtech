import { NextResponse } from "next/server";
import QRCode from "qrcode";

export const runtime = "nodejs";

/**
 * Il QR code di un biglietto, in PNG: Gmail e Outlook non mostrano gli SVG
 * nelle email. Codifica solo il codice univoco (non un dato personale),
 * quindi può comparire in email e URL. Serve all'email del biglietto, al
 * biglietto online e alla stampa.
 *
 * GET /api/eventi/qr/VPL-XXXXXXXX
 *
 * L'indirizzo è già nelle email inviate: non cambia. Lo stesso codice dà
 * sempre la stessa immagine, quindi la cache può tenerla un giorno intero.
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

  try {
    // 480 pixel: nitido sugli schermi ad alta densità anche quando la pagina
    // o l'email lo mostrano a 200 o 240 pixel, e alla stampa.
    const png = await QRCode.toBuffer(safe, {
      type: "png",
      errorCorrectionLevel: "M",
      margin: 2,
      width: 480,
      color: { dark: "#0A1628", light: "#FFFFFF" },
    });

    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(png.length),
        "Cache-Control": "public, max-age=86400, immutable",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (err) {
    console.error("QR del biglietto non generato:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "QR non disponibile" }, { status: 500 });
  }
}
