import type { Metadata } from "next";
import Link from "next/link";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";

/**
 * Public certificate verification: bioergotech.org/verify/BIO-AI-2026-XXXXXX
 *
 * The id is printed on every certificate and in the email that delivers it,
 * so an employer or a university can check it. The page shows only what is
 * already on the certificate itself (name, course, date) plus the project
 * the student chose to make public. Never the email or anything else.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verify a Certificate | bioERGOtech",
  // A page per certificate holder is not something to index.
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ certId: string }>;
}

interface CertRecord {
  cert_id: string;
  recipient_name: string;
  student_id: string | null;
  course_title: string;
  project_url: string | null;
  issued_at: string;
  revoked_at: string | null;
  legacy: boolean;
  confirmed_at: string | null;
}

/**
 * "error" is kept apart from "missing" on purpose: during a database outage
 * the page must not tell an employer that a genuine certificate was never
 * issued.
 */
async function lookup(certId: string): Promise<{ status: "found"; cert: CertRecord } | { status: "missing" | "error" }> {
  if (!/^[A-Z0-9-]{6,40}$/.test(certId)) return { status: "missing" };
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return { status: "error" };
  const client = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client
    .from("course_certificates")
    .select("cert_id, recipient_name, student_id, course_title, project_url, issued_at, revoked_at, legacy, confirmed_at")
    .eq("cert_id", certId)
    .maybeSingle();
  if (error) {
    console.error("verify lookup failed:", error.message);
    return { status: "error" };
  }
  return data ? { status: "found", cert: data as CertRecord } : { status: "missing" };
}

export default async function VerifyPage({ params }: Props) {
  const { certId: raw } = await params;
  let certId: string;
  try {
    certId = decodeURIComponent(raw).trim().toUpperCase();
  } catch {
    // A stray "%" in a hand-typed ID: treat as not found, not a server error.
    certId = raw.trim().toUpperCase();
  }
  const result = await lookup(certId);
  const found = result.status === "found" ? result.cert : null;
  const lookupFailed = result.status === "error";
  // A legacy certificate came from a field students could write. Until staff
  // confirm it, the page neither vouches for it nor shows its details: a
  // forged row must not get a bioERGOtech page with the forger's name on it.
  // That holds after a revoke too: a never-confirmed row that staff revoked
  // was never issued by bioERGOtech, so it reads as not found.
  const unconfirmedLegacy = !!found && found.legacy && !found.confirmed_at;
  const pending = unconfirmedLegacy && !found!.revoked_at;
  const cert = unconfirmedLegacy ? null : found;
  const valid = !!cert && !cert.revoked_at;

  return (
    <>
      <Navbar />
      <main className="section bg-light-gray" style={{ minHeight: "70vh" }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--primary-dark, #1FA89C)" }}>
            Certificate verification
          </p>
          <h1 className="section-title" style={{ fontSize: "clamp(1.6rem, 4vw, 2.25rem)" }}>
            {valid
              ? "This certificate is valid"
              : cert
                ? "This certificate has been revoked"
                : pending
                  ? "This certificate is being confirmed"
                  : lookupFailed
                    ? "We could not check this certificate right now"
                    : "Certificate not found"}
          </h1>

          <div className="card-sm" style={{ padding: 28, borderLeft: `4px solid ${valid ? "#2EC4B6" : "#E67E22"}` }}>
            {cert ? (
              <dl style={{ display: "grid", gridTemplateColumns: "minmax(110px, auto) 1fr", gap: "10px 20px", margin: 0, fontSize: 15 }}>
                <dt style={{ color: "var(--text-mid)" }}>Awarded to</dt>
                <dd style={{ margin: 0, fontWeight: 700 }}>{cert.recipient_name}</dd>
                <dt style={{ color: "var(--text-mid)" }}>Programme</dt>
                <dd style={{ margin: 0 }}>{cert.course_title}</dd>
                <dt style={{ color: "var(--text-mid)" }}>Issued</dt>
                <dd style={{ margin: 0 }}>
                  {new Date(cert.issued_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </dd>
                <dt style={{ color: "var(--text-mid)" }}>Certificate ID</dt>
                <dd style={{ margin: 0, fontFamily: "monospace", overflowWrap: "anywhere" }}>{cert.cert_id}</dd>
                {cert.student_id && (
                  <>
                    <dt style={{ color: "var(--text-mid)" }}>Student ID</dt>
                    <dd style={{ margin: 0, fontFamily: "monospace" }}>{cert.student_id}</dd>
                  </>
                )}
                {valid && cert.project_url && (
                  <>
                    <dt style={{ color: "var(--text-mid)" }}>Final project</dt>
                    <dd style={{ margin: 0, overflowWrap: "anywhere" }}>
                      <a href={cert.project_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary-dark, #1FA89C)", fontWeight: 600 }}>
                        {cert.project_url.replace(/^https:\/\//, "")}
                      </a>
                    </dd>
                  </>
                )}
                {cert.revoked_at && (
                  <>
                    <dt style={{ color: "var(--text-mid)" }}>Revoked</dt>
                    <dd style={{ margin: 0 }}>
                      {new Date(cert.revoked_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                    </dd>
                  </>
                )}
              </dl>
            ) : lookupFailed ? (
              <p style={{ margin: 0, fontSize: 15, color: "var(--text-mid)", lineHeight: 1.7 }}>
                The verification service is temporarily unavailable. Please try again in a few minutes, or write to
                info@bioergotech.org to confirm certificate{" "}
                <strong style={{ fontFamily: "monospace", overflowWrap: "anywhere" }}>{certId}</strong> directly.
              </p>
            ) : pending ? (
              <p style={{ margin: 0, fontSize: 15, color: "var(--text-mid)", lineHeight: 1.7 }}>
                Certificate <strong style={{ fontFamily: "monospace", overflowWrap: "anywhere" }}>{certId}</strong> was
                issued before online verification started, and the bioERGOtech team is confirming it. Please check back
                shortly, or write to info@bioergotech.org to confirm it directly.
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: 15, color: "var(--text-mid)", lineHeight: 1.7 }}>
                No certificate with the ID <strong style={{ fontFamily: "monospace", overflowWrap: "anywhere" }}>{certId}</strong> was
                issued by the bioERGOtech Foundation. Check the ID for typing errors. IDs look like BIO-AI-2026-ABC123.
              </p>
            )}
          </div>

          <p style={{ marginTop: 24, fontSize: 14, color: "var(--text-mid)", lineHeight: 1.7 }}>
            Questions about a certificate? Write to{" "}
            <a href="mailto:info@bioergotech.org" style={{ color: "var(--primary-dark, #1FA89C)" }}>info@bioergotech.org</a>.{" "}
            <Link href="/courses/agentic-ai" style={{ color: "var(--primary-dark, #1FA89C)" }}>About the Agentic AI course</Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
