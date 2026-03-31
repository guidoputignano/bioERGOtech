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
    .from("knowledge_documents")
    .select("*")
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ documents: data });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const payload = {
      title: body.title?.trim(),
      category: body.category?.trim(),
      description: body.description?.trim() || null,
      url: body.url?.trim(),
      doc_type: body.doc_type || "external",
      is_public: body.is_public ?? true,
      added_by: body.added_by || "admin",
    };

    if (!payload.title || !payload.category || !payload.url) {
      return NextResponse.json(
        { error: "Title, category, and URL are required" },
        { status: 400 }
      );
    }

    const { data, error } = await getClient()
      .from("knowledge_documents")
      .insert(payload)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ document: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Missing document id" }, { status: 400 });
    }

    const { error } = await getClient()
      .from("knowledge_documents")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}