/**
 * Read-only GitHub access for the Agentic AI course.
 *
 * Students create a public repository in their own GitHub account and paste
 * its link. The site never signs in to GitHub on their behalf: it only reads
 * public repositories, which needs no account at all.
 *
 * GitHub allows 60 anonymous API requests an hour per server address. That
 * covers normal use. GITHUB_TOKEN, optional, raises it to 5,000: a
 * fine-grained token from any existing staff GitHub account, with read-only
 * access to public repositories and no other permission. File contents are
 * read from raw.githubusercontent.com, which does not count against it.
 */

const API = "https://api.github.com";
const RAW = "https://raw.githubusercontent.com";

export interface GhResponse<T> {
  status: number;
  data: T | null;
  /** GitHub's message on failure, for logs and error mapping. */
  message: string | null;
  /** Rate limit used up: try again later, nothing is wrong with the repo. */
  rateLimited: boolean;
}

export async function gh<T = unknown>(path: string): Promise<GhResponse<T>> {
  const token = process.env.GITHUB_TOKEN;
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "bioERGOtech-course",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });
  } catch (e) {
    return { status: 0, data: null, message: (e as Error).message, rateLimited: false };
  }

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // Some error responses have no body.
  }
  if (!res.ok) {
    const message = (json as { message?: string } | null)?.message ?? res.statusText;
    const rateLimited =
      res.status === 429 ||
      (res.status === 403 && (res.headers.get("x-ratelimit-remaining") === "0" || /rate limit/i.test(message)));
    return { status: res.status, data: null, message, rateLimited };
  }
  return { status: res.status, data: json as T, message: null, rateLimited: false };
}

/** A file of a public repository at a commit, or null if it is not there. */
export async function rawFile(fullName: string, ref: string, path: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${RAW}/${fullName}/${ref}/${path.split("/").map(encodeURIComponent).join("/")}`,
      { cache: "no-store", headers: { "User-Agent": "bioERGOtech-course" } },
    );
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

// ── Validation ──────────────────────────────────────────────────────────

/** GitHub's own rule for repository names, minus the edge cases it rejects. */
export function validRepoName(name: string): boolean {
  return /^[A-Za-z0-9._-]{1,100}$/.test(name) && name !== "." && name !== "..";
}

/** Accepts owner/name or any github.com URL to a repository. */
export function parseRepoRef(input: string): string | null {
  const trimmed = input.trim().replace(/\.git$/, "").replace(/\/+$/, "");
  const m =
    trimmed.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100})(?:\/.*)?$/) ??
    trimmed.match(/^([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100})$/);
  // The name ends up in an API path: "." and ".." would walk out of it.
  return m && validRepoName(m[2]) ? `${m[1]}/${m[2]}` : null;
}
