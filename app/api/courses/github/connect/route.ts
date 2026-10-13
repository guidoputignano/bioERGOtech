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
  siteUrl,
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
    const to = siteUrl(next);
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

  const intentParam = url.searchParams.get("intent");
  const intent: Intent = intentParam === "create" || intentParam === "link" ? intentParam : "connect";

  // Only from our own pages. Without this, another site could send a
  // signed-in student here: GitHub skips the consent screen for an app the
  // student already approved, so a hidden redirect could create or link a
  // repository in their name and reset their submission.
  //
  // Creating and linking change things, so they must come from a click on
  // the site: "same-origin", or "same-site" for the hop from
  // bioergotech.org to www above. Not "none", which a link opened from an
  // email or chat app also sends. Browsers too old to send the header must
  // show a Referer from the site instead. Connecting only reads the public
  // profile, so a typed URL or bookmark ("none") is fine for it.
  //
  // Creating and linking must also start from a course page, where the
  // project box is. A navigation the site itself makes from anywhere else
  // (the login form following a crafted returnTo, for instance) is
  // same-origin too, and must not be able to act for the student.
  const fetchSite = req.headers.get("sec-fetch-site");
  const fromSite = fetchSite === "same-origin" || fetchSite === "same-site";
  const referer = (() => {
    try {
      const r = req.headers.get("referer");
      return r ? new URL(r) : null;
    } catch {
      return null;
    }
  })();
  // www and the bare domain are the same site: a page on bioergotech.org
  // reaches here through the canonical-host hop above with its Referer intact.
  const bare = (host: string) => host.replace(/^www\./, "");
  const site = new URL(origin);
  const refererFromSite =
    !!referer && referer.protocol === site.protocol && bare(referer.host) === bare(site.host);
  const fromCoursePage = refererFromSite && referer!.pathname.startsWith("/courses/");
  if (intent === "connect") {
    if (fetchSite && !fromSite && fetchSite !== "none") return back("expired");
  } else {
    if (fetchSite ? !fromSite : !refererFromSite) return back("expired");
    if (!fromCoursePage) return back("start_from_lesson");
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
