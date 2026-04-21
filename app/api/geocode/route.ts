import { NextRequest, NextResponse } from "next/server";

// GET /api/geocode?city=Taranto&country=Italy
// Returns { lat, lng } for a given city/country
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city")?.trim();
  const country = searchParams.get("country")?.trim();

  if (!city && !country) {
    return NextResponse.json({ error: "city or country required" }, { status: 400 });
  }

  const query = [city, country].filter(Boolean).join(", ");

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      {
        headers: {
          "User-Agent": "bioERGOtech/1.0 (info@bioergotech.org)",
        },
      }
    );

    const data = await res.json();

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    return NextResponse.json({
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      display_name: data[0].display_name,
    });
  } catch (e) {
    console.error("Geocoding error:", e);
    return NextResponse.json({ error: "Geocoding failed" }, { status: 500 });
  }
}
