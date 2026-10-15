import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { loadCourseOverview } from "@/lib/course/data";

/**
 * GET /api/admin/course/overview
 *
 * Every student who has started the Agentic AI course, with progress,
 * project, check result, certificate status and eligibility. Staff only:
 * it exposes names and emails in bulk.
 */
export async function GET() {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    return NextResponse.json(await loadCourseOverview(guard.client));
  } catch (error) {
    console.error("course overview:", (error as Error).message);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
