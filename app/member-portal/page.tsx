export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";
import BioERGOtechPortal, { type PortalUser, type PartnershipLevel } from "./portal-dashboard";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Research Portal",
  description:
    "The bioERGOtech Foundation research portal: active programmes, methods and evidence, facilities, and the people working on them.",
  // Behind authentication and already disallowed in robots.txt. noindex is what
  // actually keeps it out of the index if something links to it.
  robots: { index: false, follow: false },
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
                Research Portal
              </h1>
              <p className="text-lg max-w-2xl mx-auto text-gray-600">
                Where the work is documented. Programmes, methods, facilities,
                and the people running them.
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
                    <i className="fas fa-user-plus mr-2" /> Create an account
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
                  What is inside
                </h3>
                <div className="space-y-3">
                  {[
                    { icon: "fa-project-diagram", label: "Programmes, with pillar, phase and lead" },
                    { icon: "fa-book", label: "Methods and evidence: protocols, reports, shared documents" },
                    { icon: "fa-flask", label: "Facilities, and how to request instrument use" },
                    { icon: "fa-address-book", label: "People, and what each is working on" },
                    { icon: "fa-calendar", label: "Events" },
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, partnership_level, organisation_name")
    .eq("id", user.id)
    .single();


  // Il fallback torna a "viewer", che e anche il default della tabella profiles.
  //
  // Era stato alzato a "member" perche un viewer non vedeva nulla: la vecchia
  // matrice gli lasciava solo la dashboard. Ora un viewer legge programmi,
  // metodi, persone ed eventi, quindi il motivo e sparito, e le due parti
  // tornano a dire la stessa cosa: le rotte API leggono il livello vero dal
  // profilo, e questa pagina ne inventava uno piu alto per la sola interfaccia.
  const partnershipLevel: PartnershipLevel =
    (profile?.partnership_level as PartnershipLevel) ?? "viewer";

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
