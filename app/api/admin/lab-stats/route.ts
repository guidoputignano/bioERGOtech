import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const getClient = () =>
  createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

export async function GET() {
  const { data, error } = await getClient()
    .from("lab_stats")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ stats: data });
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const { data: existing, error: existingError } = await getClient()
      .from("lab_stats")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (!existing?.id) {
      return NextResponse.json({ error: "No lab stats row found" }, { status: 404 });
    }

    const updatePayload = {
      utilization_text: body.utilization_text?.trim(),
      utilization_sub: body.utilization_sub?.trim(),
      cost_savings_text: body.cost_savings_text?.trim(),
      cost_savings_sub: body.cost_savings_sub?.trim(),
      bookings_text: body.bookings_text?.trim(),
      bookings_sub: body.bookings_sub?.trim(),
    };

    const { data, error } = await getClient()
      .from("lab_stats")
      .update(updatePayload)
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ stats: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}