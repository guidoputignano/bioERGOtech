import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const getClient = () => createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET — all documents, optionally filtered by category
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  const query = getClient()
    .from("knowledge_documents")
    .select("*")
    .order("created_at", { ascending: false });

  const { data, error } = category
    ? await query.eq("category", category)
    : await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data });
}

// POST — add a document
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data, error } = await getClient()
      .from("knowledge_documents")
      .insert({
        title: body.title?.trim(),
        category: body.category?.trim(),
        description: body.description?.trim() || null,
        url: body.url?.trim() || null,
        doc_type: body.doc_type || "link",
        is_public: body.is_public ?? true,
        added_by: body.added_by || null,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ document: data });
  } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
}

// DELETE — remove a document
export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const { error } = await getClient()
      .from("knowledge_documents")
      .delete()
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
}