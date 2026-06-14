import { NextResponse } from "next/server";
import { getEventAdminClient } from "@/lib/eventi/admin-guard";

const VALID_STATES = new Set(["registrato", "presente", "assente"]);

/**
 * Segna lo stato di presenza (registrato/presente/assente) di un iscritto
 * per una specifica sessione. Lo stato e per sessione, perche una persona
 * puo partecipare a una giornata e non all'altra.
 */
export async function POST(request: Request) {
  const { error, status, client } = await getEventAdminClient();
  if (error || !client) return NextResponse.json({ error }, { status });

  const body = await request.json();
  const { registration_session_id, stato } = body as {
    registration_session_id?: string;
    stato?: string;
  };

  if (!registration_session_id || !stato || !VALID_STATES.has(stato)) {
    return NextResponse.json({ error: "Parametri non validi." }, { status: 400 });
  }

  const { error: updateError } = await client
    .from("event_registration_sessions")
    .update({
      stato_checkin: stato,
      checkin_ts: stato === "presente" ? new Date().toISOString() : null,
    })
    .eq("id", registration_session_id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
