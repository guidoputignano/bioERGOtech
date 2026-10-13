import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  STATE_COOKIE,
  authorizeUrl,
  encodeState,
  githubConfig,
  newState,
  parseRepoRef,
  safeNext,
  siteOrigin,
  stateCookieOptions,
  validRepoName,
  type Intent,
} from "@/lib/github/client";

/**
 * GET /api/courses/github/connect?intent=connect|create|link&repo=...&next=/path
 *
 * Starts the GitHub OAuth round trip. A plain link, not a fetch, so the
 * student lands on GitHub's own consent screen and comes back to `next`.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get("next"));
  const back = (code: string) => {
    const to = new URL(next, siteOrigin());
    to.searchParams.set("github", code);
    to.hash = "project";
    return NextResponse.redirect(to);
  };

  // The callback is registered on the canonical host. Start there too, or
  // the state cookie set here would not come back with the callback.
  const origin = siteOrigin();
  if (url.origin !== origin && process.env.NODE_ENV === "production") {
    return NextResponse.redirect(new URL(`${url.pathname}${url.search}`, origin));
  }

  // Only from our own pages. Without this, another site could send a
  // signed-in student here: GitHub skips the consent screen for an app the
  // student already approved, so a hidden redirect could create or link a
  // repository in their name and reset their submission.
  // "same-site" covers the hop from bioergotech.org to www above; "none" is
  // a URL typed or bookmarked by the student themself.
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) {
    return back("expired");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL(`/auth/login?returnTo=${encodeURIComponent(next)}`, origin));
  }

  const cfg = githubConfig();
  if (!cfg) return back("not_configured");

  const intentParam = url.searchParams.get("intent");
  const intent: Intent = intentParam === "create" || intentParam === "link" ? intentParam : "connect";

  let repo: string | undefined;
  if (intent === "create") {
    const name = (url.searchParams.get("repo") ?? "").trim();
    if (!validRepoName(name)) return back("bad_name");
    repo = name;
  } else if (intent === "link") {
    const ref = parseRepoRef(url.searchParams.get("repo") ?? "");
    if (!ref) return back("bad_repo");
    repo = ref;
  }

  const state = newState({ userId: user.id, intent, repo, next });
  const res = NextResponse.redirect(authorizeUrl(cfg, state));
  res.cookies.set(STATE_COOKIE, encodeState(state, cfg.clientSecret), stateCookieOptions);
  return res;
}
