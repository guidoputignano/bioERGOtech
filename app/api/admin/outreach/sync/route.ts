import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const getDB = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let inQuote = false;
  let cur = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (ch === "," && !inQuote) { result.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  result.push(cur.trim());
  return result;
}

// POST /api/admin/outreach/sync
// Body: { url: string } — published Google Sheets CSV URL
export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    const sheetUrl = url?.trim() || process.env.GOOGLE_SHEETS_CSV_URL;
    if (!sheetUrl) {
      return NextResponse.json({ error: "No Google Sheets URL provided" }, { status: 400 });
    }

    // Fetch CSV from Google Sheets
    const res = await fetch(sheetUrl, {
      headers: { "User-Agent": "bioERGOtech-portal/1.0" },
      next: { revalidate: 0 }, // always fresh
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Failed to fetch sheet: HTTP ${res.status}` }, { status: 502 });
    }

    const csv = await res.text();
    if (!csv.trim() || csv.trim().startsWith("<")) {
      return NextResponse.json({ error: "Sheet returned HTML instead of CSV — check that it is published as CSV" }, { status: 400 });
    }

    const lines = csv.trim().split("\n").filter(Boolean);
    if (lines.length < 2) {
      return NextResponse.json({ error: "Sheet appears to be empty" }, { status: 400 });
    }

    // Detect if first row is headers
    const firstRow = lines[0].toLowerCase();
    const hasHeaders =
      firstRow.includes("country") ||
      firstRow.includes("institution") ||
      firstRow.includes("name");
    const dataLines = hasHeaders ? lines.slice(1) : lines;

    const contacts = dataLines
      .map((line, i) => {
        const v = parseCSVLine(line);
        return {
          country:            v[0]?.trim()  || null,
          name:               v[1]?.trim()  || "Unknown",
          type:               v[2]?.trim()  || null,
          city:               v[3]?.trim()  || null,
          field_of_interest:  v[4]?.trim()  || null,
          contact_person:     v[5]?.trim()  || null,
          email:              v[6]?.trim()  || null,
          website:            v[7]?.trim()  || null,
          category:           v[8]?.trim()  || null,
          reason_for_contact: v[9]?.trim()  || null,
          email_status:       v[10]?.trim() || "Not contacted",
          response_status:    v[11]?.trim() || null,
          follow_up_date:     v[12]?.trim() || null,
          call_status:        v[13]?.trim() || null,
          mou_status:         v[14]?.trim() || null,
          notes:              v[15]?.trim() || null,
          assigned_to:        null as string | null,
          sent_date:          null as string | null,
          sheets_row_index:   i,
        };
      })
      .filter((c) => c.name && c.name !== "Unknown" || c.country);

    if (contacts.length === 0) {
      return NextResponse.json({ error: "No valid contacts found in sheet" }, { status: 400 });
    }

    const db = getDB();

    // Strategy: delete all existing + re-insert
    // This ensures the Supabase table always mirrors the Sheet exactly
    // CRM overrides (status, notes) stored in separate columns are preserved
    // because we only delete/reinsert — we do a smarter merge below

    // Fetch existing CRM data so we don't lose status updates
    const { data: existing } = await db
      .from("outreach_contacts")
      .select("id, name, email, email_status, response_status, follow_up_date, call_status, mou_status, notes, assigned_to, sent_date");

    const crmMap = new Map<string, Record<string, unknown>>();
    if (existing) {
      for (const row of existing) {
        // Key by email (most stable identifier) or name+country
        const key = row.email?.toLowerCase() || `${row.name}`;
        crmMap.set(key, row);
      }
    }

    // Merge incoming contacts with existing CRM data
    const merged = contacts.map((c) => {
      const key = c.email?.toLowerCase() || `${c.name}`;
      const crm = crmMap.get(key);
      return {
        ...c,
        // Preserve CRM fields if they were updated (non-default values)
        email_status:    (crm?.email_status && crm.email_status !== "Not contacted") ? crm.email_status : (c.email_status || "Not contacted"),
        response_status: crm?.response_status || c.response_status || null,
        follow_up_date:  crm?.follow_up_date  || c.follow_up_date  || null,
        call_status:     crm?.call_status      || c.call_status     || null,
        mou_status:      crm?.mou_status       || c.mou_status      || null,
        notes:           crm?.notes            || c.notes           || null,
        assigned_to:     crm?.assigned_to      || c.assigned_to     || null,
        sent_date:       crm?.sent_date        || null,
      };
    });

    // Clear and re-insert
    await db.from("outreach_contacts").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Insert in batches of 200 to avoid request size limits
    let insertedTotal = 0;
    const batchSize = 200;
    for (let i = 0; i < merged.length; i += batchSize) {
      const batch = merged.slice(i, i + batchSize);
      const { data: inserted, error: insertError } = await db
        .from("outreach_contacts")
        .insert(batch)
        .select("id");
      if (insertError) {
        return NextResponse.json({ error: `Batch insert failed: ${insertError.message}` }, { status: 500 });
      }
      insertedTotal += inserted?.length ?? 0;
    }

    return NextResponse.json({
      success: true,
      synced: insertedTotal,
      total: contacts.length,
      message: `Synced ${insertedTotal} contacts from Google Sheets`,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Sync failed" }, { status: 500 });
  }
}

// GET /api/admin/outreach/sync — return last sync stats
export async function GET() {
  const { count } = await getDB()
    .from("outreach_contacts")
    .select("*", { count: "exact", head: true });

  return NextResponse.json({ count: count ?? 0 });
}