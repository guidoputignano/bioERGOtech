export const dynamic = "force-dynamic";

import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Member Portal - bioERGOtech Foundation",
  description: "Access the bioERGOtech Foundation member portal. Manage projects, connect with ecosystem members, and access shared resources.",
};

export default async function MemberPortal() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  return (
    <>
      <Navbar />

      {user ? (
        /* ── AUTHENTICATED VIEW ── */
        <div style={{ paddingTop: "70px" }}>
          {/* Hero */}
          <section className="bg-light-gray" style={{ padding: "60px 0 40px" }}>
            <div className="container mx-auto px-6 text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-800">Member Portal</h1>
              <p className="text-lg max-w-2xl mx-auto text-gray-600">
                Welcome back, <strong>{user.email}</strong>. Access your projects, connect with ecosystem members, and manage shared resources.
              </p>
            </div>
          </section>

          {/* Dashboard */}
          <section className="section">
            <div className="container mx-auto px-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                {[
                  { icon: "fa-project-diagram", label: "Active Projects", value: "—" },
                  { icon: "fa-users", label: "Ecosystem Members", value: "—" },
                  { icon: "fa-calendar-alt", label: "Upcoming Events", value: "—" },
                ].map((stat) => (
                  <div key={stat.label} className="card text-center">
                    <i className={`fas ${stat.icon} text-3xl mb-3`} style={{ color: "var(--primary)" }} />
                    <div className="text-4xl font-bold text-gray-800 mb-1">{stat.value}</div>
                    <div className="text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Quick Links */}
                <div className="card">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Quick Links</h2>
                  <div className="space-y-3">
                    {[
                      { icon: "fa-project-diagram", label: "My Projects" },
                      { icon: "fa-flask", label: "Distributed Lab" },
                      { icon: "fa-calendar", label: "Events" },
                      { icon: "fa-address-book", label: "Member Directory" },
                      { icon: "fa-book", label: "Knowledge Base" },
                      { icon: "fa-user-cog", label: "Profile Settings" },
                    ].map((link) => (
                      <div key={link.label} className="flex items-center p-3 rounded-lg cursor-pointer transition" style={{ background: "rgba(19,214,176,0.05)" }}>
                        <i className={`fas ${link.icon} mr-3`} style={{ color: "var(--primary)" }} />
                        <span className="font-medium text-gray-700">{link.label}</span>
                        <span className="ml-auto text-xs bg-gray-200 text-gray-500 px-2 py-1 rounded-full">Coming Soon</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Account */}
                <div className="card">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Your Account</h2>
                  <div className="space-y-4 text-gray-700">
                    <div className="flex items-center gap-3">
                      <i className="fas fa-envelope" style={{ color: "var(--primary)" }} />
                      <span>{user.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <i className="fas fa-id-badge" style={{ color: "var(--primary)" }} />
                      <span className="text-sm text-gray-500 font-mono">{user.sub}</span>
                    </div>
                  </div>
                  <div className="mt-8">
                    <LogoutButton />
                  </div>
                </div>
              </div>

              <div className="mt-12 p-8 rounded-xl text-center" style={{ background: "rgba(19,214,176,0.08)", border: "2px dashed rgba(19,214,176,0.3)" }}>
                <i className="fas fa-tools text-4xl mb-4" style={{ color: "var(--primary)" }} />
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Portal Features Coming Soon</h3>
                <p className="text-gray-600 max-w-xl mx-auto">
                  The full member portal — including project management, the distributed lab, event booking, and member directory — is under active development. Stay tuned!
                </p>
              </div>
            </div>
          </section>
        </div>
      ) : (
        /* ── AUTH VIEW (not logged in) ── */
        <div style={{ paddingTop: "70px" }}>
          {/* Hero */}
          <section className="bg-light-gray" style={{ padding: "60px 0 40px" }}>
            <div className="container mx-auto px-6 text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-800">Member Portal</h1>
              <p className="text-lg max-w-2xl mx-auto text-gray-600">
                Access your projects, connect with ecosystem members, and manage shared resources — all in one place.
              </p>
            </div>
          </section>

          {/* Auth Section */}
          <section className="section" style={{ paddingTop: "60px", paddingBottom: "60px" }}>
            <div className="max-w-md mx-auto px-6">
              <div className="card">
                <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Welcome Back</h2>
                <p className="text-gray-600 mb-8 text-center">Sign in to access your portal dashboard.</p>

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

              {/* Benefits teaser */}
              <div className="mt-10">
                <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">What members get access to</h3>
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
      )}

      <SiteFooter />
    </>
  );
}
