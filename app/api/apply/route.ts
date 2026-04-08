import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const required = [
      "partnership_type",
      "full_name",
      "contact_role",
      "email",
      "organisation_name",
      "organisation_type",
      "country",
      "city",
    ];

    for (const field of required) {
      if (!body[field]?.toString().trim()) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const email = body.email.toLowerCase().trim();
    let organisation_id: string | null = body.organisation_id || null;

    if (!organisation_id && body.organisation_name?.trim()) {
      const { data: newOrg, error: orgError } = await adminClient
        .from("organisations")
        .insert({
          name: body.organisation_name.trim(),
          org_type: body.organisation_type,
          city: body.city.trim(),
          country: body.country.trim(),
          website: body.organisation_website?.trim() || null,
          location: [body.city.trim(), body.country.trim()].filter(Boolean).join(", "),
          is_active: true,
        })
        .select("id")
        .single();

      if (!orgError && newOrg) {
        organisation_id = newOrg.id;
      }
    }

    const payload = {
      partnership_type: body.partnership_type?.trim(),
      full_name: body.full_name?.trim(),
      contact_role: body.contact_role?.trim(),
      email,
      organisation_name: body.organisation_name?.trim(),
      organisation_type: body.organisation_type?.trim(),
      organisation_website: body.organisation_website?.trim() || null,
      organisation_id,
      country: body.country?.trim(),
      city: body.city?.trim(),
      areas_of_interest: body.areas_of_interest || [],
      what_you_bring: body.what_you_bring?.trim() || "",
      what_you_seek: body.what_you_seek?.trim() || "",
      collaboration_type: body.collaboration_type?.trim() || null,
      expected_timeline: body.expected_timeline?.trim() || null,
      mobile_phone: body.mobile_phone?.trim() || null,
      strategic_email: body.strategic_email?.trim() || null,
      tax_id: body.tax_id?.trim() || null,
    };

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

      const { error: updateError } = await adminClient
        .from("applications")
        .update({
          ...payload,
          application_status: "pending",
          applied_at: new Date().toISOString(),
          reviewed_at: null,
          admin_notes: null,
        })
        .eq("id", existing.id);

      if (updateError) throw new Error(updateError.message);
    } else {
      const { error: insertError } = await adminClient
        .from("applications")
        .insert({
          ...payload,
          application_status: "pending",
          applied_at: new Date().toISOString(),
        });

      if (insertError) throw new Error(insertError.message);
    }

    if (body.newsletter_consent === true) {
      await adminClient
        .from("newsletter_subscribers")
        .upsert(
          {
            email,
            full_name: body.full_name.trim(),
            source: "join-us-form",
            is_active: true,
            subscribed_at: new Date().toISOString(),
          },
          { onConflict: "email" }
        );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Application submission error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Submission failed" },
      { status: 500 }
    );
  }
}