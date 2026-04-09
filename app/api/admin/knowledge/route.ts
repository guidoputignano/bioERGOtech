import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const getClient = () =>
  createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

// GET /api/admin/knowledge
// - No params        → returns all documents (used to build docCounts on mount)
// - ?category=X      → returns only documents in that category (used when opening a category)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  let query = getClient()
    .from("knowledge_documents")
    .select("*")
    .order("created_at", { ascending: false });

  // Apply category filter only when provided
  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ documents: data });
}

// POST /api/admin/knowledge — add a document
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

// DELETE /api/admin/knowledge — remove a document by id
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