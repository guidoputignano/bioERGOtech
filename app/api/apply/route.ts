import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    const required = [
      "full_name", "contact_role", "email",
      "organisation_name", "organisation_type",
      "country", "city"
    ];
    for (const field of required) {
      if (!body[field]?.trim()) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 }
      );
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const email = body.email.toLowerCase().trim();

    // Check for existing application with same email
    const { data: existing } = await adminClient
      .from("applications")
      .select("id, application_status")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      if (existing.application_status === "pending") {
        return NextResponse.json(
          { error: "An application for this email is already under review." },
          { status: 409 }
        );
      }
      if (existing.application_status === "approved") {
        return NextResponse.json(
          { error: "This email already has an active membership. Please sign in." },
          { status: 409 }
        );
      }

      // Previously declined — update the existing row
      const { error: updateError } = await adminClient
        .from("applications")
        .update({
          full_name: body.full_name.trim(),
          contact_role: body.contact_role.trim(),
          organisation_name: body.organisation_name.trim(),
          organisation_type: body.organisation_type,
          organisation_website: body.organisation_website?.trim() || null,
          country: body.country.trim(),
          city: body.city.trim(),
          areas_of_interest: body.areas_of_interest || [],
          what_you_bring: body.what_you_bring.trim(),
          what_you_seek: body.what_you_seek.trim(),
          application_status: "pending",
          applied_at: new Date().toISOString(),
          reviewed_at: null,
          admin_notes: null,
        })
        .eq("id", existing.id);

      if (updateError) throw new Error(updateError.message);
      return NextResponse.json({ success: true });
    }

    // Fresh application — insert new row
    const { error: insertError } = await adminClient
      .from("applications")
      .insert({
        full_name: body.full_name.trim(),
        contact_role: body.contact_role.trim(),
        email,
        organisation_name: body.organisation_name.trim(),
        organisation_type: body.organisation_type,
        organisation_website: body.organisation_website?.trim() || null,
        country: body.country.trim(),
        city: body.city.trim(),
        areas_of_interest: body.areas_of_interest || [],
        what_you_bring: body.what_you_bring.trim(),
        what_you_seek: body.what_you_seek.trim(),
        application_status: "pending",
        applied_at: new Date().toISOString(),
      });

    if (insertError) throw new Error(insertError.message);

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Application submission error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Submission failed" },
      { status: 500 }
    );
  }
}
