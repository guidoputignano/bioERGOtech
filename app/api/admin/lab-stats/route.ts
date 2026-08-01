import { NextResponse } from "next/server";
import { requireAdmin, requireMember } from "@/lib/auth/admin";

export async function GET() {
  const guard = await requireMember();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  const { data, error } = await client
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
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  try {
    const body = await request.json();

    const { data: existing, error: existingError } = await client
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

    const { data, error } = await client
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