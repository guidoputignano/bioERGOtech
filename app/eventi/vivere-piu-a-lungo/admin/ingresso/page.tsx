import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { requireCheckinStaff } from "@/lib/eventi/admin-guard";
import { createClient } from "@/lib/supabase/server";
import { EVENT, giornataDiOggi } from "../../content";
import { Ingresso } from "../Ingresso";

/**
 * La modalità ingresso a schermo intero, per il telefono alla porta.
 *
 * Entrano gli admin e i volontari con l'email in EVENT_CHECKIN_EMAILS: la
 * regola è una sola, quella di requireCheckinStaff (lib/eventi/admin-guard.ts,
 * dove c'è anche come abilitare un volontario). Niente menu e niente footer:
 * una barra sottile con la giornata, il link al pannello solo per gli admin,
 * e sotto il lettore.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ingresso evento",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

const PERCORSO = "/eventi/vivere-piu-a-lungo/admin/ingresso";
const PANNELLO = "/eventi/vivere-piu-a-lungo/admin";
const NOME_EVENTO = EVENT.titolo.split(":")[0];

export default async function PaginaIngresso() {
  const guardia = await requireCheckinStaff();

  if (guardia.error !== null) {
    let email: string | null = null;
    if (guardia.status === 403) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      email = user?.email ?? null;
    }
    return <AccessoNegato status={guardia.status} email={email} />;
  }

  const oggi = giornataDiOggi();
  const isAdmin = guardia.chiamante.isAdmin;

  return (
    <div className="ingp">
      <style>{STILE_PAGINA}</style>
      <header className="ingp-testa">
        <div className="ingp-marchio">
          <span className="ingp-icona" aria-hidden="true">
            <i className="fas fa-qrcode" />
          </span>
          <div className="ingp-titoli">
            <h1 className="ingp-titolo">Ingresso</h1>
            <p className="ingp-sotto">
              {oggi ? `${oggi.giornoLabel}, ${oggi.luogoBreve}` : `${NOME_EVENTO}, ${EVENT.dataLabel}`}
            </p>
          </div>
        </div>
        {isAdmin ? (
          <Link href={PANNELLO} className="ingp-link">
            <i className="fas fa-arrow-left" aria-hidden="true" />{" "}
            Pannello
          </Link>
        ) : (
          <a href="/auth/sign-out" className="ingp-link ingp-link-tenue">
            <i className="fas fa-right-from-bracket" aria-hidden="true" />{" "}
            Esci
          </a>
        )}
      </header>
      <main className="ingp-main">
        {/* "Oggi" calcolato qui, sul server, e passato al lettore: lo stesso valore nei due lati. */}
        <Ingresso oggi={oggi?.slug ?? null} />
      </main>
    </div>
  );
}

function AccessoNegato({ status, email }: { status: number; email: string | null }) {
  const login = `/auth/login?returnTo=${encodeURIComponent(PERCORSO)}`;
  const registrazione = `/auth/sign-up?returnTo=${encodeURIComponent(PERCORSO)}`;
  const configurazione = status >= 500;

  return (
    <div className="ingp ingp-centro">
      <style>{STILE_PAGINA}</style>
      <main className="card-sm ingp-negato">
        <span className="icon-circle icon-circle-primary ingp-negato-icona" aria-hidden="true">
          <i className={`fas ${configurazione ? "fa-screwdriver-wrench" : "fa-lock"}`} />
        </span>
        <h1 className="ingp-negato-titolo">{configurazione ? "Ingresso non disponibile" : "Accesso riservato"}</h1>

        {configurazione ? (
          <p className="ingp-negato-testo">
            Il server non è configurato per la modalità ingresso. Avvisa l&apos;amministratore del sito.
          </p>
        ) : status === 403 ? (
          <>
            <p className="ingp-negato-testo">
              {email ? (
                <>
                  Hai fatto l&apos;accesso come <strong>{email}</strong>, ma questo account non è abilitato
                  all&apos;ingresso dell&apos;evento.
                </>
              ) : (
                <>Questo account non è abilitato all&apos;ingresso dell&apos;evento.</>
              )}
            </p>
            <p className="ingp-negato-testo">
              Se aiuti alla porta come volontario, chiedi alla Fondazione di abilitare la tua email, oppure accedi con
              l&apos;account che hai comunicato. Se hai appena creato l&apos;account, conferma prima l&apos;email dal
              link che ti abbiamo inviato.
            </p>
            <div className="ingp-negato-azioni">
              <Link href={login} className="btn-primary">
                Accedi con un altro account
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="ingp-negato-testo">
              La modalità ingresso di {NOME_EVENTO}{" "}è riservata allo staff e ai volontari dell&apos;evento. Accedi con
              l&apos;email che hai comunicato alla Fondazione.
            </p>
            <div className="ingp-negato-azioni">
              <Link href={login} className="btn-primary">
                Accedi
              </Link>
              <Link href={registrazione} className="btn-secondary">
                Crea un account
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

/**
 * Lo stile della pagina: solo la cornice. Il lettore ha il suo stile in
 * Ingresso.tsx. Fondo chiaro del sito, barra bianca in alto che resta ferma
 * mentre si scorre, rispetto delle aree sicure dei telefoni con il notch.
 */
const STILE_PAGINA = `
.ingp { min-height: 100vh; min-height: 100svh; background: var(--bg-light); color: var(--text-dark); }
.ingp-testa {
  position: sticky; top: 0; z-index: 40;
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  min-height: 60px; padding: 8px max(16px, env(safe-area-inset-right)) 8px max(16px, env(safe-area-inset-left));
  padding-top: max(8px, env(safe-area-inset-top));
  background: rgba(255,255,255,.96); backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border-color);
}
.ingp-marchio { display: flex; align-items: center; gap: 12px; min-width: 0; }
.ingp-icona {
  width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--primary-light); color: #0F766E; font-size: 18px;
}
.ingp-titoli { min-width: 0; }
.ingp-titolo { margin: 0; font-size: 17px; font-weight: 800; line-height: 1.2; color: var(--text-dark); }
.ingp-sotto {
  margin: 1px 0 0; font-size: 13px; color: var(--text-mid); line-height: 1.3;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.ingp-link {
  display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0;
  min-height: 44px; padding: 0 14px; border-radius: 10px;
  border: 1.5px solid var(--border-color); background: #fff;
  color: #0F766E; font-size: 14px; font-weight: 600; text-decoration: none;
}
.ingp-link:hover { border-color: var(--primary); }
.ingp-link:focus-visible { outline: 3px solid var(--primary); outline-offset: 2px; }
.ingp-link-tenue { color: var(--text-mid); }
.ingp-main {
  padding: 14px max(16px, env(safe-area-inset-right)) max(32px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
}
@media (min-width: 640px) { .ingp-main { padding-top: 24px; } }

.ingp-centro { display: flex; align-items: center; justify-content: center; padding: 24px 16px; }
.ingp-negato { width: 100%; max-width: 440px; text-align: center; padding: 28px 22px; }
.ingp-negato-icona { margin: 0 auto 14px; font-size: 22px; }
.ingp-negato-titolo { margin: 0 0 10px; font-size: 22px; font-weight: 800; color: var(--text-dark); }
.ingp-negato-testo { margin: 0 0 12px; font-size: 15px; line-height: 1.6; color: var(--text-mid); overflow-wrap: anywhere; }
.ingp-negato-testo strong { color: var(--text-dark); }
.ingp-negato-azioni { display: flex; flex-direction: column; gap: 10px; margin-top: 18px; }
.ingp-negato-azioni a { min-height: 48px; }
`;
