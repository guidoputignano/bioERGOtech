import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";
import type { Metadata } from "next";
import { AdminPanel } from "./AdminPanel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Check-in evento . Admin",
  robots: { index: false, follow: false },
};

export default async function EventAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("partnership_level")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.partnership_level === "admin";
  }

  if (!isAdmin) {
    return (
      <>
        <Navbar />
        <div style={{ paddingTop: "110px", minHeight: "70vh" }} className="bg-light-gray">
          <div className="container mx-auto px-6 py-16">
            <div className="card max-w-md mx-auto text-center">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Accesso riservato</h1>
              <p className="text-gray-600 mb-6">
                Questa area è riservata allo staff della Fondazione. Accedi con un account admin.
              </p>
              <Link href="/auth/login" className="btn-primary inline-block">
                Accedi
              </Link>
            </div>
          </div>
        </div>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div style={{ paddingTop: "90px", minHeight: "80vh" }} className="bg-light-gray">
        <div className="container mx-auto px-6 py-10">
          <AdminPanel />
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
