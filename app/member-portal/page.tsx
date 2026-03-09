export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";
import BioERGOtechPortal, { type PortalUser, type PartnershipLevel } from "./portal-dashboard";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Member Portal - bioERGOtech Foundation",
  description:
    "Access the bioERGOtech Foundation member portal. Manage projects, connect with ecosystem members, and access shared resources.",
};

export default async function MemberPortal() {
  // ── Auth check ────────────────────────────────────────────────────────────
  let userId: string | null = null;
  let userEmail: string | null = null;

  try {
    const supabase = await createClient();
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

    if (!claimsError && claimsData?.claims) {
      userId = claimsData.claims.sub as string ?? null;
      userEmail = claimsData.claims.email as string ?? null;
    }
  } catch {
    // getClaims failed — treat as unauthenticated
  }

  // ── Not logged in ─────────────────────────────────────────────────────────
  if (!userId || !userEmail) {
    return (
      <>
        <Navbar />
        <div style={{ paddingTop: "70px" }}>
          {/* Hero */}
          <section className="bg-light-gray" style={{ padding: "60px 0 40px" }}>
            <div className="container mx-auto px-6 text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-800">
                Member Portal
              </h1>
              <p className="text-lg max-w-2xl mx-auto text-gray-600">
                Access your projects, connect with ecosystem members, and manage
                shared resources — all in one place.
              </p>
            </div>
          </section>

          {/* Auth Section */}
          <section className="section" style={{ paddingTop: "60px", paddingBottom: "60px" }}>
            <div className="max-w-md mx-auto px-6">
              <div className="card">
                <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">
                  Welcome Back
                </h2>
                <p className="text-gray-600 mb-8 text-center">
                  Sign in to access your portal dashboard.
                </p>

                <div className="flex flex-col gap-4">
                  <Link
                    href="/auth/login"
                    className="btn-primary text-center w-full block"
                    style={{ textDecoration: "none" }}
                  >
                    Sign In
                  </Link>

                  <div className="flex items-center gap-3 my-2">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-sm text-gray-500">or</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  <Link
                    href="/auth/sign-up"
                    className="btn-outline text-center w-full block"
                    style={{ textDecoration: "none" }}
                  >
                    Join the Ecosystem
                  </Link>
                </div>

                <p className="text-center text-sm text-gray-500 mt-6">
                  <Link href="/auth/forgot-password" style={{ color: "var(--primary)" }}>
                    Forgot your password?
                  </Link>
                </p>
              </div>

              {/* Benefits teaser */}
              <div className="mt-10">
                <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">
                  What members get access to
                </h3>
                <div className="space-y-3">
                  {[
                    "Project management across hubs",
                    "Distributed lab booking",
                    "Exclusive events and workshops",
                    "Member directory and networking",
                    "Knowledge base and resources",
                  ].map((label) => (
                    <div key={label} className="flex items-center gap-3 text-gray-700">
                      <span style={{ color: "var(--primary)", fontSize: "1.1rem" }}>→</span>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
        <SiteFooter />
      </>
    );
  }

  // ── Logged in: fetch profile ───────────────────────────────────────────────
  let fullName = "";
  let partnershipLevel: PartnershipLevel = "viewer";

  try {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, partnership_level")
      .eq("id", userId)
      .single();

    if (profile) {
      fullName = profile.full_name ?? "";
      partnershipLevel = (profile.partnership_level as PartnershipLevel) ?? "viewer";
    }
  } catch {
    // Profile fetch failed — fall back to viewer defaults
  }

  const initials = fullName
    ? fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : userEmail.slice(0, 2).toUpperCase();

  const portalUser: PortalUser = {
    email: userEmail,
    sub: userId,
    full_name: fullName || undefined,
    partnership_level: partnershipLevel,
    initials,
    display_name: fullName || userEmail,
  };

  return <BioERGOtechPortal user={portalUser} />;
}
