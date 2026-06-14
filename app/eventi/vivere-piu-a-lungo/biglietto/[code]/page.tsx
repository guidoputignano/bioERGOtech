import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { EVENT, categoriaLabel, sessionBySlug } from "../../content";
import Link from "next/link";

export const dynamic = "force-dynamic";

const admin = () =>
  createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

export default async function TicketPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const safe = decodeURIComponent(code).replace(/[^A-Z0-9-]/gi, "").slice(0, 32);

  let registration: {
    nome: string;
    cognome: string;
    categoria: string;
    codice_univoco: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    event_registration_sessions: any[];
  } | null = null;

  if (process.env.SUPABASE_SERVICE_ROLE_KEY && safe) {
    const { data } = await admin()
      .from("event_registrations")
      .select(
        `nome, cognome, categoria, codice_univoco,
         event_registration_sessions ( is_waitlist, stato_checkin, event_sessions ( slug ) )`,
      )
      .eq("codice_univoco", safe)
      .maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registration = (data as any) ?? null;
  }

  return (
    <>
      <Navbar />
      <div style={{ paddingTop: "110px", minHeight: "70vh" }} className="bg-light-gray">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-md mx-auto">
            {!registration ? (
              <div className="card text-center">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Biglietto non trovato</h1>
                <p className="text-gray-600 mb-6">
                  Il codice non corrisponde a nessuna iscrizione. Controlla il link nell&apos;email di conferma.
                </p>
                <Link href="/eventi/vivere-piu-a-lungo" className="btn-primary inline-block">
                  Torna all&apos;evento
                </Link>
              </div>
            ) : (
              <div className="card" style={{ borderTop: "4px solid var(--primary)" }}>
                <div className="text-center mb-6">
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--primary-dark)", marginBottom: 8 }}>
                    {EVENT.titolo}
                  </div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    {registration.nome} {registration.cognome}
                  </h1>
                  <p className="text-sm text-gray-600">{categoriaLabel(registration.categoria)}</p>
                </div>

                {/* QR + alternativa testuale del codice. */}
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/eventi/qr/${encodeURIComponent(registration.codice_univoco)}`}
                    alt={`QR code per il check-in, codice ${registration.codice_univoco}`}
                    width={220}
                    height={220}
                    style={{ margin: "0 auto", border: "1px solid var(--border-color)", borderRadius: 12 }}
                  />
                  <div style={{ marginTop: 12, fontSize: 22, fontWeight: 800, letterSpacing: "0.12em", fontFamily: "monospace", color: "#1A2332" }}>
                    {registration.codice_univoco}
                  </div>
                </div>

                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-light)", marginBottom: 10 }}>
                    Le tue sessioni
                  </div>
                  {registration.event_registration_sessions.map((rs, i) => {
                    const sess = sessionBySlug(rs.event_sessions?.slug);
                    if (!sess) return null;
                    return (
                      <div key={i} style={{ marginBottom: 12 }}>
                        <div style={{ fontWeight: 600, color: "#1A2332", fontSize: 14 }}>{sess.titolo}</div>
                        <div style={{ fontSize: 13, color: "var(--text-mid)" }}>
                          {sess.giornoLabel}, {sess.orario} . {sess.luogo}
                        </div>
                        {rs.is_waitlist && (
                          <div style={{ fontSize: 12, color: "#B7791F", fontWeight: 600 }}>Lista d&apos;attesa</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
