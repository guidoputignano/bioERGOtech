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

/**
 * Un post di Instagram da mostrare in un'email: il link, una riga che lo
 * descrive e, se lo staff l'ha caricata, la sua immagine.
 */
export type PostInstagram = { url: string; titolo: string; immagine?: string };

/**
 * Il bucket pubblico delle immagini dei post (migrazione 20261222000000).
 * Instagram non da le immagini senza le sue API: le carica lo staff.
 */
export const BUCKET_IMMAGINI_NOTIZIE = "licei-notizie";

/** L'inizio di ogni URL pubblico di quel bucket, sul progetto Supabase del sito. */
export const prefissoImmaginiNotizie = (): string =>
  `${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "")}/storage/v1/object/public/${BUCKET_IMMAGINI_NOTIZIE}/`;

const PERCORSO_IMMAGINE = /^notizie\/[A-Za-z0-9-]+\/[A-Za-z0-9-]+\.jpg$/;

/**
 * Un'immagine caricata dal pannello: solo un URL del nostro bucket, con il
 * percorso che decide la rotta. Null per tutto il resto, cosi in un'email
 * non entra mai un'immagine da un indirizzo qualsiasi.
 */
export function immagineNotizie(v: string): string | null {
  const prefisso = prefissoImmaginiNotizie();
  const url = v.trim();
  if (!prefisso.startsWith("https://") || !url.startsWith(prefisso)) return null;
  return PERCORSO_IMMAGINE.test(url.slice(prefisso.length)) ? url : null;
}

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
    const grezzo = (r ?? {}) as { url?: unknown; titolo?: unknown; immagine?: unknown };
    const url = typeof grezzo.url === "string" ? grezzo.url.trim() : "";
    const titolo = typeof grezzo.titolo === "string" ? grezzo.titolo.replace(/\s+/g, " ").trim() : "";
    const img = typeof grezzo.immagine === "string" ? grezzo.immagine.trim() : "";
    if (!url && !titolo && !img) continue;
    const canonico = linkPostInstagram(url);
    if (!canonico) return { errore: `Post ${i + 1}: incolla il link di un post o di un reel di Instagram.` };
    if (titolo.length > TITOLO_POST_MAX) {
      return { errore: `Post ${i + 1}: la descrizione supera ${TITOLO_POST_MAX} caratteri.` };
    }
    let immagine: string | undefined;
    if (img) {
      const valida = immagineNotizie(img);
      if (!valida) return { errore: `Post ${i + 1}: immagine non valida, caricala di nuovo.` };
      immagine = valida;
    }
    post.push(immagine ? { url: canonico, titolo, immagine } : { url: canonico, titolo });
  }
  if (post.length > POST_INSTAGRAM_MAX) return { errore: `Al massimo ${POST_INSTAGRAM_MAX} post.` };
  return { post };
}
