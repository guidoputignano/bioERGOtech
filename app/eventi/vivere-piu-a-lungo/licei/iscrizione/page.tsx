import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { IscrizioneForm } from "./IscrizioneForm";
import { leggiConfigLicei } from "@/lib/eventi/licei-server";
import { EVENT } from "../../content";
import {
  CONTATTI_LICEI,
  ISCRIZIONE_PATH,
  LICEI,
  LICEI_PATH,
  MODALITA,
  SITE_URL,
  iscrizioniAperte,
} from "../content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Iscriviti al percorso . ${LICEI.titolo}`,
  description:
    "Iscrizione degli studenti al percorso formativo gratuito su biotecnologie e intelligenza artificiale. Serve il codice del tuo istituto, che ti dà il docente referente.",
  alternates: { canonical: ISCRIZIONE_PATH },
  openGraph: {
    title: `Iscriviti . ${LICEI.titolo}`,
    description: LICEI.sottotitolo,
    url: `${SITE_URL}${ISCRIZIONE_PATH}`,
    images: [{ url: EVENT.ogImage }],
    type: "website",
  },
};

/**
 * La pagina accetta ?codice=LIC-XXXXXXXX, cosi il referente puo mettere in
 * circolare un link che precompila il campo. Uno studente che clicca e
 * trova gia il codice non lo sbaglia.
 */
export default async function IscrizionePage({
  searchParams,
}: {
  searchParams: Promise<{ codice?: string }>;
}) {
  const { codice } = await searchParams;
  const config = await leggiConfigLicei();
  const aperte = iscrizioniAperte(config.stato_iscrizioni);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let staff = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("partnership_level")
      .eq("id", user.id)
      .maybeSingle();
    staff = profile?.partnership_level === "admin";
  }

  const formVisibile = aperte || staff;

  return (
    <>
      <Navbar />

      <div style={{ paddingTop: 100 }} className="bg-light-gray">
        <div className="container mx-auto px-6 py-12">
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            <div style={{ marginBottom: 28 }}>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#0A7A66",
                }}
              >
                {LICEI.occhiello}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mt-3 mb-3">
                Iscriviti al percorso
              </h1>
              <p className="text-lg text-gray-700">{LICEI.sottotitolo}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3" style={{ marginBottom: 28 }}>
              {MODALITA.map((m) => (
                <div key={m.titolo} className="card-sm" style={{ padding: 14 }}>
                  <i
                    className={`fas ${m.icona}`}
                    style={{ color: "#0A7A66", fontSize: 15 }}
                    aria-hidden="true"
                  />
                  <div
                    className="font-semibold text-gray-800"
                    style={{ fontSize: 13, marginTop: 7 }}
                  >
                    {m.titolo}
                  </div>
                </div>
              ))}
            </div>

            {config.scadenza_iscrizioni_label && aperte && (
              <div
                style={{
                  background: "#ECFAF6",
                  border: "1px solid #B4E3D8",
                  borderRadius: 10,
                  padding: "12px 16px",
                  fontSize: 14,
                  color: "#08594A",
                  marginBottom: 22,
                }}
              >
                Le iscrizioni chiudono il {config.scadenza_iscrizioni_label}.
              </div>
            )}

            {formVisibile ? (
              <IscrizioneForm
                codiceIniziale={codice ?? ""}
                anteprimaStaff={staff && !aperte}
              />
            ) : (
              <div className="card text-center" style={{ padding: 40 }}>
                <span
                  className="icon-circle icon-circle-primary"
                  style={{ width: 56, height: 56, margin: "0 auto" }}
                >
                  <i className="fas fa-clock text-2xl" />
                </span>
                <h2 className="text-xl font-bold text-gray-800 mt-5 mb-2">
                  Le iscrizioni non sono ancora aperte
                </h2>
                <p className="text-gray-600 mb-5">
                  Stiamo raccogliendo le adesioni degli istituti. Quando apriremo, il tuo docente
                  referente riceverà il codice da darti. Chiedi a lui: è la persona che lo saprà per
                  prima.
                </p>
                <Link href={LICEI_PATH} className="btn-outline inline-block">
                  Leggi il bando
                </Link>
              </div>
            )}

            <p
              style={{
                fontSize: 12.5,
                color: "var(--text-light)",
                lineHeight: 1.7,
                marginTop: 22,
                textAlign: "center",
              }}
            >
              Sei un docente e vuoi far aderire il tuo istituto?{" "}
              <Link href={LICEI_PATH} style={{ color: "#0A7A66", fontWeight: 600 }}>
                Il modulo è qui
              </Link>
              . Per qualsiasi dubbio: {CONTATTI_LICEI.fondazione.email}
            </p>
          </div>
        </div>
      </div>

      <SiteFooter />
    </>
  );
}
