/**
 * Read-only GitHub access for the Agentic AI course.
 *
 * Students create a public repository in their own GitHub account and paste
 * its link. The site never signs in to GitHub on their behalf: it only reads
 * public repositories, which needs no account at all.
 *
 * GitHub allows 60 anonymous API requests an hour per server address.
 * GITHUB_TOKEN, optional, raises it to 5,000: a fine-grained token from any
 * existing staff GitHub account, with read-only access to public
 * repositories and no other permission. File contents are read from
 * raw.githubusercontent.com, which does not count against the API limit.
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

async function request<T>(path: string, token: string | undefined): Promise<GhResponse<T>> {
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
      signal: AbortSignal.timeout(15_000),
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

export async function gh<T = unknown>(path: string): Promise<GhResponse<T>> {
  const token = process.env.GITHUB_TOKEN;
  const res = await request<T>(path, token);
  if (token && res.status === 401) {
    // An expired or revoked token must not turn every student's repository
    // into "not found": say so in the logs and carry on anonymously.
    console.error("GITHUB_TOKEN was rejected (expired or revoked). Falling back to anonymous GitHub access.");
    return request<T>(path, undefined);
  }
  return res;
}

/**
 * Whether a failed answer says something about the repository itself, as
 * opposed to GitHub, the network or our own credentials. Only the former
 * may be recorded against a student.
 */
export function definitive(res: { status: number; rateLimited: boolean }): boolean {
  return !res.rateLimited && [404, 409, 422].includes(res.status);
}

/** Longest README or ethics review the checks will read. A real one is a few KB. */
export const MAX_DOC_BYTES = 100_000;

export type RawResult = { text: string } | { missing: true } | { tooLarge: true } | { failed: true };

/** A file of a public repository at a commit. */
export async function rawFile(fullName: string, ref: string, path: string): Promise<RawResult> {
  try {
    const res = await fetch(
      `${RAW}/${fullName}/${ref}/${path.split("/").map(encodeURIComponent).join("/")}`,
      { cache: "no-store", headers: { "User-Agent": "bioERGOtech-course" }, signal: AbortSignal.timeout(10_000) },
    );
    if (res.status === 404) return { missing: true };
    if (!res.ok) return { failed: true };
    const length = Number(res.headers.get("content-length") ?? 0);
    if (length > MAX_DOC_BYTES) return { tooLarge: true };
    const text = await res.text();
    return text.length > MAX_DOC_BYTES ? { tooLarge: true } : { text };
  } catch {
    return { failed: true };
  }
}

// ── Validation ──────────────────────────────────────────────────────────

/** GitHub's own rule for repository names, minus the edge cases it rejects. */
export function validRepoName(name: string): boolean {
  return /^[A-Za-z0-9._-]{1,100}$/.test(name) && name !== "." && name !== "..";
}

/** Accepts owner/name or any github.com URL to a repository. */
export function parseRepoRef(input: string): string | null {
  // Query and fragment first: a link copied from the browser often ends in
  // "?tab=readme-ov-file" or "#readme".
  const trimmed = input.trim().replace(/[?#].*$/, "").replace(/\/+$/, "").replace(/\.git$/, "");
  const m =
    trimmed.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100})(?:\/.*)?$/) ??
    trimmed.match(/^([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100})$/);
  // The name ends up in an API path: "." and ".." would walk out of it.
  return m && validRepoName(m[2]) ? `${m[1]}/${m[2]}` : null;
}
