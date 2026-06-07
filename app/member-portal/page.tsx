export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";
import BioERGOtechPortal, { type PortalUser, type PartnershipLevel } from "./portal-dashboard";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Member Portal",
  description:
    "Access the bioERGOtech Foundation member portal. Manage projects, connect with ecosystem members, and access shared resources.",
};

export default async function MemberPortal() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user || authError) {
    return (
      <>
        <Navbar />
        <div style={{ paddingTop: "70px" }}>
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
                    <i className="fas fa-sign-in-alt mr-2" /> Sign In
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
                    <i className="fas fa-user-plus mr-2" /> Join the Ecosystem
                  </Link>
                </div>
                <p className="text-center text-sm text-gray-500 mt-6">
                  <Link href="/auth/forgot-password" style={{ color: "var(--primary)" }}>
                    Forgot your password?
                  </Link>
                </p>
              </div>

              <div className="mt-10">
                <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">
                  What members get access to
                </h3>
                <div className="space-y-3">
                  {[
                    { icon: "fa-project-diagram", label: "Project management across hubs" },
                    { icon: "fa-flask", label: "Distributed lab booking" },
                    { icon: "fa-calendar", label: "Exclusive events and workshops" },
                    { icon: "fa-address-book", label: "Member directory and networking" },
                    { icon: "fa-book", label: "Knowledge base and resources" },
                  ].map((b) => (
                    <div key={b.label} className="flex items-center gap-3 text-gray-700">
                      <i className={`fas ${b.icon}`} style={{ color: "var(--primary)", width: "20px" }} />
                      <span>{b.label}</span>
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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, partnership_level, organisation_name")
    .eq("id", user.id)
    .single();

  console.log("USER ID:", user.id);
  console.log("PROFILE:", profile);
  console.log("PROFILE ERROR:", profileError);

  // FIX: new users now default to "member" instead of "viewer"
  // so they immediately have access to events and the member network
  const partnershipLevel: PartnershipLevel =
    (profile?.partnership_level as PartnershipLevel) ?? "member";

  const fullName = profile?.full_name || "";
  const initials = fullName
    ? fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email!.slice(0, 2).toUpperCase();

  const portalUser: PortalUser = {
    email: user.email!,
    sub: user.id,
    full_name: fullName || undefined,
    partnership_level: partnershipLevel,
    initials,
    display_name: fullName || profile?.organisation_name || user.email!,
  };

  return <BioERGOtechPortal user={portalUser} />;
}
