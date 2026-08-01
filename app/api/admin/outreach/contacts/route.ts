import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";

// GET /api/admin/outreach/contacts
// Fetches ALL contacts using range-based pagination to bypass Supabase's 1000-row default cap
export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  const { searchParams } = new URL(request.url);
  const country  = searchParams.get("country");
  const status   = searchParams.get("status");
  const category = searchParams.get("category");
  const search   = searchParams.get("search");

  const db = client;
  let allContacts: Record<string, unknown>[] = [];
  const PAGE_SIZE = 1000;
  let from = 0;

  // Paginate through all rows — Supabase caps at 1000 per request by default
  while (true) {
    let query = db
      .from("outreach_contacts")
      .select("*")
      .order("country", { ascending: true })
      .order("name",    { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (country)  query = query.eq("country", country);
    if (status)   query = query.eq("email_status", status);
    if (category) query = query.eq("category", category);
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,contact_person.ilike.%${search}%,email.ilike.%${search}%,country.ilike.%${search}%,field_of_interest.ilike.%${search}%`
      );
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0) break;

    allContacts = [...allContacts, ...data];
    if (data.length < PAGE_SIZE) break;   // last page reached
    from += PAGE_SIZE;
  }

  return NextResponse.json({ contacts: allContacts, total: allContacts.length });
}

// POST /api/admin/outreach/contacts
// Single contact: { ...fields }
// Bulk upsert (from sync): { contacts: [...], upsert: true }
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  try {
    const body = await request.json();

    if (body.upsert && Array.isArray(body.contacts)) {
      // Bulk upsert from Google Sheets sync
      const rows = body.contacts.map((c: Record<string, string>, i: number) => ({
        country:            c.country?.trim()            || null,
        name:               c.name?.trim()               || "Unknown",
        type:               c.type?.trim()               || null,
        city:               c.city?.trim()               || null,
        field_of_interest:  c.field_of_interest?.trim()  || null,
        contact_person:     c.contact_person?.trim()     || null,
        email:              c.email?.trim()               || null,
        website:            c.website?.trim()             || null,
        category:           c.category?.trim()            || null,
        reason_for_contact: c.reason_for_contact?.trim() || null,
        email_status:       c.email_status?.trim()       || "Not contacted",
        response_status:    c.response_status?.trim()    || null,
        follow_up_date:     c.follow_up_date?.trim()     || null,
        call_status:        c.call_status?.trim()        || null,
        mou_status:         c.mou_status?.trim()         || null,
        notes:              c.notes?.trim()               || null,
        assigned_to:        c.assigned_to?.trim()        || null,
        sheets_row_index:   i,
      }));

      // Delete all existing and re-insert (cleanest sync strategy)
      await client.from("outreach_contacts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const { data, error } = await client.from("outreach_contacts").insert(rows).select();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ contacts: data, inserted: data?.length ?? 0 });
    }

    // Single contact insert
    const { data, error } = await client
      .from("outreach_contacts")
      .insert({
        country:            body.country?.trim()            || null,
        name:               body.name?.trim()               || "Unknown",
        type:               body.type?.trim()               || null,
        city:               body.city?.trim()               || null,
        field_of_interest:  body.field_of_interest?.trim()  || null,
        contact_person:     body.contact_person?.trim()     || null,
        email:              body.email?.trim()               || null,
        website:            body.website?.trim()             || null,
        category:           body.category?.trim()            || null,
        reason_for_contact: body.reason_for_contact?.trim() || null,
        email_status:       "Not contacted",
        notes:              body.notes?.trim()               || null,
        assigned_to:        body.assigned_to?.trim()        || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ contact: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// PATCH /api/admin/outreach/contacts
// Update CRM fields for a single contact
export async function PATCH(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  try {
    const body = await request.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: "Missing contact id" }, { status: 400 });

    const allowed: Record<string, unknown> = {};
    const allowedFields = [
      "email_status", "response_status", "follow_up_date",
      "call_status", "mou_status", "notes", "assigned_to",
      "sent_date", "contact_person", "email", "category"
    ];
    for (const f of allowedFields) {
      if (f in fields) allowed[f] = fields[f] ?? null;
    }

    const { data, error } = await client
      .from("outreach_contacts")
      .update(allowed)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ contact: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// DELETE /api/admin/outreach/contacts
export async function DELETE(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const { error } = await client.from("outreach_contacts").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
