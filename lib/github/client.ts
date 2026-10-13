import { createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * GitHub access for the Agentic AI course.
 *
 * Two kinds of token pass through here, and neither is ever stored:
 *
 * - The student's OAuth token. It lives for one request, inside the OAuth
 *   callback, and is used to read who they are and, when they ask for it,
 *   to create or link their project repository. The database keeps their
 *   GitHub id and login, never the token.
 * - The mentor token. A personal access token for the bioERGOtech mentor
 *   account, read from the environment. It accepts collaborator invitations
 *   and runs the project checks, so the checks also work on repositories a
 *   student later makes private.
 */

const API = "https://api.github.com";

export interface GitHubConfig {
  clientId: string;
  clientSecret: string;
  mentorLogin: string;
  mentorToken: string;
  /** owner/name of the public template repository. */
  templateRepo: string;
}

/** Null when the integration is not configured; callers degrade, not crash. */
export function githubConfig(): GitHubConfig | null {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  const mentorLogin = process.env.GITHUB_MENTOR_LOGIN;
  const mentorToken = process.env.GITHUB_MENTOR_TOKEN;
  const templateRepo = process.env.GITHUB_TEMPLATE_REPO;
  if (!clientId || !clientSecret || !mentorLogin || !mentorToken || !templateRepo) return null;
  return { clientId, clientSecret, mentorLogin, mentorToken, templateRepo };
}

export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.bioergotech.org").replace(/\/+$/, "");
}

export const CALLBACK_PATH = "/api/courses/github/callback";

// ── REST ────────────────────────────────────────────────────────────────

export interface GhResponse<T> {
  status: number;
  data: T | null;
  /** GitHub's message on failure, for logs and error mapping. */
  message: string | null;
}

export async function gh<T = unknown>(
  path: string,
  token: string,
  init: { method?: string; body?: unknown } = {},
): Promise<GhResponse<T>> {
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "bioERGOtech-course",
      ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

  if (res.status === 204) return { status: 204, data: null, message: null };

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // Some error responses have no body.
  }
  if (!res.ok) {
    const message = (json as { message?: string } | null)?.message ?? res.statusText;
    return { status: res.status, data: null, message };
  }
  return { status: res.status, data: json as T, message: null };
}

// ── OAuth ───────────────────────────────────────────────────────────────

export type Intent = "connect" | "create" | "link";

/** What the student asked for, carried through GitHub in a signed cookie. */
export interface OAuthState {
  nonce: string;
  userId: string;
  intent: Intent;
  /** create: the new repository name. link: owner/name. */
  repo?: string;
  next: string;
  issuedAt: number;
}

export const STATE_COOKIE = "bt_gh_oauth";
const STATE_MAX_AGE_S = 10 * 60;

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function newState(input: Omit<OAuthState, "nonce" | "issuedAt">): OAuthState {
  return { ...input, nonce: randomBytes(16).toString("base64url"), issuedAt: Date.now() };
}

export function encodeState(state: OAuthState, secret: string): string {
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function decodeState(cookie: string | undefined, secret: string): OAuthState | null {
  if (!cookie) return null;
  const [payload, sig] = cookie.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const state = JSON.parse(Buffer.from(payload, "base64url").toString()) as OAuthState;
    if (Date.now() - state.issuedAt > STATE_MAX_AGE_S * 1000) return null;
    return state;
  } catch {
    return null;
  }
}

export const stateCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  // Lax, not Strict: the callback is a top-level navigation from
  // github.com, and Strict would drop the cookie on exactly that request.
  sameSite: "lax" as const,
  path: "/api/courses/github",
  maxAge: STATE_MAX_AGE_S,
};

/**
 * Scopes per intent. Connecting asks for nothing beyond the public profile.
 * Only creating or linking a repository asks for public_repo, and only at
 * the moment the student presses the button.
 */
export function scopesFor(intent: Intent): string {
  return intent === "connect" ? "read:user" : "read:user public_repo";
}

export function authorizeUrl(cfg: GitHubConfig, state: OAuthState): string {
  const u = new URL("https://github.com/login/oauth/authorize");
  u.searchParams.set("client_id", cfg.clientId);
  u.searchParams.set("redirect_uri", `${siteOrigin()}${CALLBACK_PATH}`);
  u.searchParams.set("scope", scopesFor(state.intent));
  u.searchParams.set("state", state.nonce);
  u.searchParams.set("allow_signup", "true");
  return u.toString();
}

export async function exchangeCode(cfg: GitHubConfig, code: string): Promise<string | null> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      code,
      redirect_uri: `${siteOrigin()}${CALLBACK_PATH}`,
    }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { access_token?: string };
  return json.access_token ?? null;
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

/** Only same-site relative paths, so the callback cannot be an open redirect. */
export function safeNext(next: string | null | undefined, fallback = "/courses/agentic-ai"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
