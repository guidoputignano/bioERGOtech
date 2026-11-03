/**
 * I profili social della Fondazione, in un posto solo: li usano il footer
 * del sito, i dati strutturati, le aree del percorso licei e le email.
 *
 * Solo collegamenti: nessun widget o incorporamento, che caricherebbe
 * script e cookie di terzi e chiederebbe il consenso nel banner.
 */
export const SOCIAL = {
  linkedin: "https://www.linkedin.com/company/bioergotech",
  instagram: "https://www.instagram.com/bioergotech/",
  instagramNome: "@bioergotech",
} as const;

/** Un post di Instagram da mostrare in un'email: il link e una riga che lo descrive. */
export type PostInstagram = { url: string; titolo: string };

/** Quanti post al massimo in un'email, e quanto lunga la riga che li descrive. */
export const POST_INSTAGRAM_MAX = 3;
export const TITOLO_POST_MAX = 120;

const LINK_POST = /^https?:\/\/(?:www\.)?instagram\.com\/(?:[A-Za-z0-9._]+\/)?(p|reel)\/([A-Za-z0-9_-]+)\/?(?:[?#].*)?$/i;

/**
 * Il link di un post o di un reel, nella forma canonica e senza i parametri
 * di tracciamento che l'app aggiunge copiandolo ("?igsh=..."). Null se non e
 * un post di Instagram.
 */
export function linkPostInstagram(v: string): string | null {
  const m = LINK_POST.exec(v.trim());
  return m ? `https://www.instagram.com/${m[1].toLowerCase()}/${m[2]}/` : null;
}

/**
 * I post scritti dallo staff, controllati: righe vuote saltate, link
 * canonici, titoli ripuliti, al piu `POST_INSTAGRAM_MAX`. Lo usano il
 * pannello, per dire subito cosa non va, e la rotta, che non si fida del
 * pannello. Il titolo e facoltativo.
 */
export function leggiPostInstagram(v: unknown): { post: PostInstagram[] } | { errore: string } {
  if (v === undefined || v === null) return { post: [] };
  if (!Array.isArray(v)) return { errore: "Post non validi." };
  const post: PostInstagram[] = [];
  for (const [i, r] of v.entries()) {
    const grezzo = (r ?? {}) as { url?: unknown; titolo?: unknown };
    const url = typeof grezzo.url === "string" ? grezzo.url.trim() : "";
    const titolo = typeof grezzo.titolo === "string" ? grezzo.titolo.replace(/\s+/g, " ").trim() : "";
    if (!url && !titolo) continue;
    const canonico = linkPostInstagram(url);
    if (!canonico) return { errore: `Post ${i + 1}: incolla il link di un post o di un reel di Instagram.` };
    if (titolo.length > TITOLO_POST_MAX) {
      return { errore: `Post ${i + 1}: la descrizione supera ${TITOLO_POST_MAX} caratteri.` };
    }
    post.push({ url: canonico, titolo });
  }
  if (post.length > POST_INSTAGRAM_MAX) return { errore: `Al massimo ${POST_INSTAGRAM_MAX} post.` };
  return { post };
}
