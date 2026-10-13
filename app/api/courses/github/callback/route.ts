import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/lib/auth/admin";
import {
  STATE_COOKIE,
  decodeState,
  exchangeCode,
  gh,
  githubConfig,
  safeNext,
  siteOrigin,
  stateCookieOptions,
} from "@/lib/github/client";
import { addMentor, createFromTemplate, mentorHasAccess, type GhRepo } from "@/lib/github/projects";

/**
 * GET /api/courses/github/callback?code=...&state=...
 *
 * GitHub sends the student back here. The token from the code exchange is
 * used within this request and then dropped: nothing below stores it.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const cfg = githubConfig();
  const state = cfg ? decodeState(req.cookies.get(STATE_COOKIE)?.value, cfg.clientSecret) : null;
  const next = safeNext(state?.next);

  const back = (code: string, extra?: Record<string, string>) => {
    const to = new URL(next, siteOrigin());
    to.searchParams.set("github", code);
    for (const [k, v] of Object.entries(extra ?? {})) to.searchParams.set(k, v);
    to.hash = "project";
    const res = NextResponse.redirect(to);
    res.cookies.set(STATE_COOKIE, "", { ...stateCookieOptions, maxAge: 0 });
    return res;
  };

  if (!cfg) return back("not_configured");
  // The state in the URL must match the nonce in our signed cookie. This is
  // what stops another site from completing a GitHub login into this
  // student's course account.
  if (!state || url.searchParams.get("state") !== state.nonce) return back("expired");
  if (url.searchParams.get("error")) return back("cancelled");

  const guard = await requireMember();
  if (guard.error !== null) return back("signed_out");
  const { client, chiamante } = guard;
  // The browser that started the flow must still be signed in as the same
  // course user, or the GitHub account would land on someone else.
  if (chiamante.id !== state.userId) return back("signed_out");

  const code = url.searchParams.get("code");
  const token = code ? await exchangeCode(cfg, code) : null;
  if (!token) return back("github_error");

  const me = await gh<{ id: number; login: string; avatar_url: string }>("/user", token);
  if (!me.data) return back("github_error");

  // One GitHub account per course account, and the other way round.
  const { error: accountError } = await client.from("course_github_accounts").upsert(
    {
      user_id: chiamante.id,
      github_id: me.data.id,
      github_login: me.data.login,
      avatar_url: me.data.avatar_url,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (accountError) {
    if (accountError.code === "23505") return back("github_in_use", { login: me.data.login });
    console.error("course_github_accounts upsert:", accountError.message);
    return back("server_error");
  }

  if (state.intent === "connect") return back("connected", { login: me.data.login });

  // Creating or linking changes which project the certificate is assessed
  // on, so it is closed once a certificate exists.
  const { data: cert } = await client
    .from("course_certificates")
    .select("cert_id")
    .eq("user_id", chiamante.id)
    .is("revoked_at", null)
    .maybeSingle();
  if (cert) return back("locked");

  let repo: GhRepo;
  let mentorOk: boolean;

  if (state.intent === "create") {
    const created = await createFromTemplate(cfg, token, me.data.login, state.repo ?? "");
    if (!created.repo) return back(created.error ?? "github_error");
    repo = created.repo;
    mentorOk = await addMentor(cfg, token, repo.full_name);
  } else {
    const found = await gh<GhRepo>(`/repos/${state.repo}`, token);
    if (!found.data) return back("repo_not_found");
    repo = found.data;
    if (!repo.permissions?.push) return back("not_your_repo");
    if (repo.private) return back("repo_private");

    if (await mentorHasAccess(cfg, repo.full_name)) {
      mentorOk = true;
    } else if (repo.permissions?.admin) {
      mentorOk = await addMentor(cfg, token, repo.full_name);
    } else {
      // A teammate with write access cannot add collaborators. The owner
      // links first, then everyone else can join.
      return back("owner_must_link", { owner: repo.owner.login });
    }
  }

  // A teammate linking a repo that is already registered refreshes its
  // name and access, but the first student keeps created_via / created_by.
  const repoFields = {
    full_name: repo.full_name,
    html_url: repo.html_url,
    owner_login: repo.owner.login,
    default_branch: repo.default_branch,
  };
  const { data: existing } = await client
    .from("course_projects")
    .select("id, mentor_access")
    .eq("github_repo_id", repo.id)
    .maybeSingle();

  const saved = existing
    ? await client
        .from("course_projects")
        .update({ ...repoFields, mentor_access: mentorOk || existing.mentor_access })
        .eq("id", existing.id)
        .select("id")
        .single()
    : await client
        .from("course_projects")
        .insert({
          ...repoFields,
          github_repo_id: repo.id,
          mentor_access: mentorOk,
          created_via: state.intent === "create" ? "template" : "linked",
          created_by: chiamante.id,
        })
        .select("id")
        .single();
  if (saved.error || !saved.data) {
    console.error("course_projects save:", saved.error?.message);
    return back("server_error");
  }
  const projectId = saved.data.id as string;

  // Moving to a different project clears the earlier submission, which was
  // about another repository. Relinking the same one keeps it.
  const { data: membership } = await client
    .from("course_project_members")
    .select("project_id")
    .eq("user_id", chiamante.id)
    .maybeSingle();
  if (membership?.project_id !== projectId) {
    const { error: memberError } = await client.from("course_project_members").upsert(
      {
        user_id: chiamante.id,
        project_id: projectId,
        joined_at: new Date().toISOString(),
        submitted_at: null,
        submitted_commit: null,
        check_result: null,
        checked_at: null,
      },
      { onConflict: "user_id" },
    );
    if (memberError) {
      console.error("course_project_members upsert:", memberError.message);
      return back("server_error");
    }
  }

  return back(mentorOk ? (state.intent === "create" ? "created" : "linked") : "mentor_failed", {
    repo: repo.full_name,
  });
}
