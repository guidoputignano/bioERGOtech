import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { areaAccount, areaAlPostoDelPortale, etichettaArea } from "@/lib/eventi/area-account";

export const dynamic = "force-dynamic";

/**
 * For the navbar: the student area of the account in session, or null.
 * A student sees "Student area" where everyone else sees "Research Portal".
 * Only the account of the session, and only a path of this site.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const area = user ? await areaAccount(user.id) : null;
  const href = areaAlPostoDelPortale(area);
  return NextResponse.json(
    { area: href ? { href, etichetta: etichettaArea(area, href) } : null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
