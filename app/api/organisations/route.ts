import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const getClient = () =>
  createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

// Auto-geocode city/country using Nominatim
async function geocode(city?: string, country?: string): Promise<{ lat: number; lng: number } | null> {
  const query = [city, country].filter(Boolean).join(", ");
  if (!query) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { "User-Agent": "bioERGOtech/1.0 (info@bioergotech.org)" } }
    );
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (e) { console.error("Geocoding error:", e); }
  return null;
}

export async function GET() {
  const { data, error } = await getClient()
    .from("organisations")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ organisations: data });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Auto-geocode if city/country provided
    let lat = body.lat || null;
    let lng = body.lng || null;
    if (!lat && !lng && (body.city || body.country)) {
      const coords = await geocode(body.city?.trim(), body.country?.trim());
      if (coords) { lat = coords.lat; lng = coords.lng; }
    }

    const payload = {
      name: body.name?.trim(),
      org_type: body.org_type?.trim() || null,
      location: body.location?.trim() || [body.city, body.country].filter(Boolean).join(", ") || null,
      country: body.country?.trim() || null,
      city: body.city?.trim() || null,
      website: body.website?.trim() || null,
      areas_of_interest: Array.isArray(body.areas_of_interest) ? body.areas_of_interest : [],
      is_active: body.is_active ?? true,
      lat,
      lng,
    };

    if (!payload.name) return NextResponse.json({ error: "Organisation name is required" }, { status: 400 });

    const { data, error } = await getClient().from("organisations").insert(payload).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ organisation: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: "Missing organisation id" }, { status: 400 });

    const updatePayload: Record<string, unknown> = {};
    if (fields.name !== undefined) updatePayload.name = fields.name?.trim();
    if (fields.org_type !== undefined) updatePayload.org_type = fields.org_type?.trim() || null;
    if (fields.location !== undefined) updatePayload.location = fields.location?.trim() || null;
    if (fields.country !== undefined) updatePayload.country = fields.country?.trim() || null;
    if (fields.city !== undefined) updatePayload.city = fields.city?.trim() || null;
    if (fields.website !== undefined) updatePayload.website = fields.website?.trim() || null;
    if (fields.areas_of_interest !== undefined) updatePayload.areas_of_interest = Array.isArray(fields.areas_of_interest) ? fields.areas_of_interest : [];
    if (fields.is_active !== undefined) updatePayload.is_active = fields.is_active;

    // Auto-geocode if city/country changed and no coords provided
    if ((fields.city !== undefined || fields.country !== undefined) && !fields.lat && !fields.lng) {
      const coords = await geocode(fields.city?.trim(), fields.country?.trim());
      if (coords) { updatePayload.lat = coords.lat; updatePayload.lng = coords.lng; }
    } else {
      if (fields.lat !== undefined) updatePayload.lat = fields.lat;
      if (fields.lng !== undefined) updatePayload.lng = fields.lng;
    }

    const { data, error } = await getClient().from("organisations").update(updatePayload).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ organisation: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing organisation id" }, { status: 400 });
    const { error } = await getClient().from("organisations").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
