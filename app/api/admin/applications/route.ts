import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

async function getAdminClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401, client: null };

  const { data: requesterProfile } = await supabase.from("profiles").select("partnership_level").eq("id", user.id).single();
  if (!requesterProfile || requesterProfile.partnership_level !== "admin") {
    return { error: "Forbidden: admin access required", status: 403, client: null };
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return { error: "Server misconfiguration: missing service role key", status: 500, client: null };

  const client = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  return { error: null, status: 200, client };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function awardCoins(client: any, userId: string, amount: number, reason: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = client as any;
    const { data: existing } = await c.from("coin_balances").select("balance, lifetime_earned").eq("user_id", userId).single();
    const currentBalance = existing?.balance ?? 0;
    const currentLifetime = existing?.lifetime_earned ?? 0;
    await c.from("coin_balances").upsert({ user_id: userId, balance: currentBalance + amount, lifetime_earned: currentLifetime + amount }, { onConflict: "user_id" });
    await c.from("coin_transactions").insert({ user_id: userId, amount, reason, type: "earn" });
  } catch (e) { console.error("Failed to award coins:", e); }
}

export async function GET(request: Request) {
  const { error, status, client } = await getAdminClient();
  if (error || !client) return NextResponse.json({ error }, { status });

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status") ?? "pending";

  const query = client.from("applications").select(`id, email, full_name, contact_role, organisation_name, organisation_type, organisation_website, country, city, areas_of_interest, what_you_bring, what_you_seek, partnership_type, application_status, applied_at, reviewed_at, admin_notes, referred_by`).order("applied_at", { ascending: false });

  const { data: applications, error: fetchError } = statusFilter === "all" ? await query : await query.eq("application_status", statusFilter);
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  return NextResponse.json({ applications });
}

export async function POST(request: Request) {
  const { error, status, client } = await getAdminClient();
  if (error || !client) return NextResponse.json({ error }, { status });

  const body = await request.json();
  const { applicantId, action, adminNotes, partnershipLevel } = body;

  if (!applicantId || !action) return NextResponse.json({ error: "applicantId and action are required" }, { status: 400 });
  if (!["approve", "decline"].includes(action)) return NextResponse.json({ error: "action must be approve or decline" }, { status: 400 });

  const { data: application, error: fetchError } = await client.from("applications").select("email, full_name, organisation_name, partnership_type, referred_by").eq("id", applicantId).single();
  if (fetchError || !application) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  if (action === "approve") {
    const grantedLevel = partnershipLevel ?? (application.partnership_type === "strategic_partner" ? "partner" : "member");

    const { data: existingUsers } = await client.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === application.email);

    if (existingUser) {
      await client.from("profiles").update({ partnership_level: grantedLevel, full_name: application.full_name, updated_at: new Date().toISOString() }).eq("id", existingUser.id);
    } else {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://bioergotech.org";
      const { data: inviteData, error: inviteError } = await client.auth.admin.inviteUserByEmail(application.email, {
        redirectTo: `${siteUrl}/auth/update-password`,
        data: { full_name: application.full_name, partnership_level: grantedLevel },
      });
      if (inviteError) return NextResponse.json({ error: `Failed to send invite: ${inviteError.message}` }, { status: 500 });
      if (inviteData?.user) {
        await client.from("profiles").update({ full_name: application.full_name, partnership_level: grantedLevel, organisation_name: application.organisation_name, updated_at: new Date().toISOString() }).eq("id", inviteData.user.id);
      }
    }

    await client.from("applications").update({ application_status: "approved", reviewed_at: new Date().toISOString(), admin_notes: adminNotes ?? null }).eq("id", applicantId);

    // ── Award +100 coins to referrer if referral code was used ──
    if (application.referred_by) {
      const { data: referrer } = await client.from("profiles").select("id, full_name").eq("referral_code", application.referred_by).single();
      if (referrer?.id) {
        await awardCoins(client, referrer.id, 100, `Referral bonus: ${application.full_name} joined bioERGOtech`);
      }
    }

    return NextResponse.json({ success: true, message: `Application approved. Invite email sent to ${application.email}.` });
  }

  // Decline
  const { error: declineError } = await client.from("applications").update({ application_status: "declined", reviewed_at: new Date().toISOString(), admin_notes: adminNotes ?? null }).eq("id", applicantId);
  if (declineError) return NextResponse.json({ error: declineError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
