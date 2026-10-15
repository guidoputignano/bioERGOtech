import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";

/**
 * POST /api/admin/course/certificate
 * Body: { cert_id, action: "confirm" | "revoke", reason? }
 *
 * confirm: a legacy certificate (imported from profiles.cert_id, which
 *   students could write) has been checked against the emails the old
 *   route actually sent. From now on /verify shows it as valid.
 * revoke: the certificate stops verifying, with the reason kept. The
 *   student can then be issued a new one (wrong name, forged legacy row).
 */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  const body = (await req.json().catch(() => ({}))) as { cert_id?: string; action?: string; reason?: string };
  if (!body.cert_id || (body.action !== "confirm" && body.action !== "revoke")) {
    return NextResponse.json({ error: "cert_id and action (confirm or revoke) are required" }, { status: 400 });
  }
  const reason = body.reason?.trim() || null;
  if (body.action === "revoke" && !reason) {
    return NextResponse.json({ error: "A reason is required to revoke a certificate" }, { status: 400 });
  }

  if (body.action === "confirm") {
    // Old-system rows fall back to the email when the profile had no name.
    // Confirming would publish that address on /verify under "Awarded to".
    const { data: row } = await client
      .from("course_certificates")
      .select("recipient_name")
      .eq("cert_id", body.cert_id)
      .maybeSingle();
    if (row?.recipient_name?.includes("@")) {
      return NextResponse.json(
        { error: "This certificate carries an email address instead of a name. Revoke it, ask the student to add their name, then issue a new one." },
        { status: 422 },
      );
    }
  }

  const now = new Date().toISOString();
  const update =
    body.action === "confirm"
      ? { confirmed_at: now }
      : { revoked_at: now, revoked_reason: reason };

  const { data, error } = await client
    .from("course_certificates")
    .update(update)
    .eq("cert_id", body.cert_id)
    .is("revoked_at", null)
    .select("cert_id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "No active certificate with that id" }, { status: 404 });

  return NextResponse.json({ success: true, certId: data.cert_id, action: body.action });
}
