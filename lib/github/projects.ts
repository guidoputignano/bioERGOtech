import { gh, type GitHubConfig } from "./client";
import {
  ETHICS_MIN_WORDS,
  README_MIN_WORDS,
  type CheckItem,
  type ProjectCheckResult,
} from "@/lib/course/requirements";

export interface GhRepo {
  id: number;
  full_name: string;
  html_url: string;
  private: boolean;
  default_branch: string;
  owner: { login: string };
  permissions?: { admin?: boolean; push?: boolean; pull?: boolean };
}

// ── Repository setup (student token) ────────────────────────────────────

export async function createFromTemplate(
  cfg: GitHubConfig,
  studentToken: string,
  owner: string,
  name: string,
): Promise<{ repo: GhRepo | null; error: string | null }> {
  const res = await gh<GhRepo>(`/repos/${cfg.templateRepo}/generate`, studentToken, {
    method: "POST",
    body: {
      owner,
      name,
      description: "Agentic AI prototype built in the bioERGOtech Agentic AI course",
      private: false,
      include_all_branches: false,
    },
  });
  if (res.data) return { repo: res.data, error: null };
  if (res.status === 422) return { repo: null, error: "repo_exists" };
  if (res.status === 404) return { repo: null, error: "template_missing" };
  console.error("GitHub generate failed:", res.status, res.message);
  return { repo: null, error: "github_error" };
}

/**
 * Makes the mentor account a collaborator and accepts the invitation.
 *
 * On a personal repository only users can be collaborators, never an
 * organization, which is why bioERGOtech needs a mentor user account.
 * The invite is accepted at once with the mentor's own token, so nobody
 * has to click through an email per student.
 */
export async function addMentor(
  cfg: GitHubConfig,
  studentToken: string,
  fullName: string,
): Promise<boolean> {
  // No `permission` field: it is only valid on organization repositories,
  // and the default on a personal one is already push.
  const invite = await gh<{ id: number }>(
    `/repos/${fullName}/collaborators/${cfg.mentorLogin}`,
    studentToken,
    { method: "PUT" },
  );
  // 204: already a collaborator.
  if (invite.status === 204) return true;
  if (!invite.data) {
    console.error("GitHub add collaborator failed:", invite.status, invite.message);
    return false;
  }
  const accept = await gh(`/user/repository_invitations/${invite.data.id}`, cfg.mentorToken, {
    method: "PATCH",
  });
  if (accept.status !== 204) {
    console.error("GitHub accept invitation failed:", accept.status, accept.message);
    return false;
  }
  return true;
}

/** Whether the mentor can already push, for teammates linking a repo. */
export async function mentorHasAccess(cfg: GitHubConfig, fullName: string): Promise<boolean> {
  const res = await gh<GhRepo>(`/repos/${fullName}`, cfg.mentorToken);
  if (res.data?.permissions?.push) return true;
  return acceptPendingInvite(cfg, fullName);
}

/**
 * Accepts a collaborator invitation the mentor has not accepted yet.
 *
 * Covers a student who added the mentor by hand, and an automatic accept
 * that failed (rate limit, network). Without it the invitation would sit
 * pending, the access check would fail, and nobody would know why.
 */
export async function acceptPendingInvite(cfg: GitHubConfig, fullName: string): Promise<boolean> {
  const list = await gh<{ id: number; repository: { full_name: string } }[]>(
    "/user/repository_invitations?per_page=100",
    cfg.mentorToken,
  );
  const invite = list.data?.find((i) => i.repository.full_name.toLowerCase() === fullName.toLowerCase());
  if (!invite) return false;
  const accept = await gh(`/user/repository_invitations/${invite.id}`, cfg.mentorToken, { method: "PATCH" });
  return accept.status === 204;
}

// ── Checks (mentor token) ───────────────────────────────────────────────

/** Words a reader would see: comments, code, link targets and markup removed. */
export function countWords(markdown: string): number {
  const text = markdown
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_|~-]/g, " ");
  return (text.match(/[\p{L}\p{N}][\p{L}\p{N}'’]*/gu) ?? []).length;
}

const DEMO_LINK =
  /(https?:\/\/)?(www\.)?(youtube\.com\/(watch|shorts|live)|youtu\.be\/|drive\.google\.com\/|loom\.com\/share\/|vimeo\.com\/\d)/i;

/** Files that are not the prototype itself. */
function isScaffolding(path: string): boolean {
  const base = path.split("/").pop() ?? path;
  return (
    path.startsWith(".github/") ||
    base.startsWith(".") ||
    /\.(md|markdown|txt)$/i.test(base) ||
    /^(license|licence)(\..*)?$/i.test(base)
  );
}

async function fileText(
  token: string,
  fullName: string,
  path: string,
  ref: string,
): Promise<string | null> {
  const res = await gh<{ content?: string; encoding?: string }>(
    `/repos/${fullName}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${ref}`,
    token,
  );
  if (!res.data?.content || res.data.encoding !== "base64") return null;
  return Buffer.from(res.data.content, "base64").toString("utf8");
}

/** The commit a check runs against when the student has not pinned one. */
export async function headCommit(cfg: GitHubConfig, fullName: string): Promise<string | null> {
  const res = await gh<{ sha: string }[]>(`/repos/${fullName}/commits?per_page=1`, cfg.mentorToken);
  return res.data?.[0]?.sha ?? null;
}

export async function runProjectChecks(
  cfg: GitHubConfig,
  fullName: string,
  studentLogin: string | null,
  pinnedRef: string | null,
  /** The repo was generated from the template, so its first commit is not the student's work. */
  createdViaTemplate = false,
): Promise<ProjectCheckResult> {
  const ranAt = new Date().toISOString();
  const fail = (error: string): ProjectCheckResult => ({
    ref: pinnedRef,
    ran_at: ranAt,
    items: [],
    passed: false,
    error,
  });

  const repoRes = await gh<GhRepo>(`/repos/${fullName}`, cfg.mentorToken);
  if (!repoRes.data) {
    return fail(
      repoRes.status === 404
        ? "Repository not found. It may have been deleted, renamed or made private without mentor access."
        : `GitHub returned ${repoRes.status}`,
    );
  }
  let repo = repoRes.data;
  if (!repo.permissions?.push && (await acceptPendingInvite(cfg, fullName))) {
    repo = (await gh<GhRepo>(`/repos/${fullName}`, cfg.mentorToken)).data ?? repo;
  }

  const ref = pinnedRef ?? (await headCommit(cfg, fullName));
  if (!ref) return fail("The repository has no commits yet.");

  type TreeEntry = { path: string; type: string; sha: string };
  const treeRes = await gh<{ tree: TreeEntry[]; truncated: boolean }>(
    `/repos/${fullName}/git/trees/${ref}?recursive=1`,
    cfg.mentorToken,
  );
  if (!treeRes.data) return fail(`Could not read commit ${ref.slice(0, 7)}`);
  const files = treeRes.data.tree.filter((e) => e.type === "blob").map((e) => e.path);

  // GitHub cuts a recursive listing off on very large repos (a committed
  // virtualenv is enough). The files the checks look for live at the root
  // or in docs/, so read those two levels directly rather than report
  // README or ethics review as missing.
  if (treeRes.data.truncated) {
    const root = await gh<{ tree: TreeEntry[] }>(`/repos/${fullName}/git/trees/${ref}`, cfg.mentorToken);
    for (const e of root.data?.tree ?? []) if (e.type === "blob" && !files.includes(e.path)) files.push(e.path);
    const docsDir = root.data?.tree.find((e) => e.type === "tree" && e.path.toLowerCase() === "docs");
    if (docsDir) {
      const docs = await gh<{ tree: TreeEntry[] }>(`/repos/${fullName}/git/trees/${docsDir.sha}`, cfg.mentorToken);
      for (const e of docs.data?.tree ?? []) {
        const p = `${docsDir.path}/${e.path}`;
        if (e.type === "blob" && !files.includes(p)) files.push(p);
      }
    }
  }

  const items: CheckItem[] = [];

  items.push({
    key: "mentor_access",
    label: "bioERGOtech mentor has access",
    ok: !!repo.permissions?.push,
    required: true,
    detail: repo.permissions?.push
      ? `@${cfg.mentorLogin} is a collaborator.`
      : `Link the repository again from Lesson 4.4 so we can add @${cfg.mentorLogin}.`,
  });

  const prototypeFiles = files.filter((p) => !isScaffolding(p));
  items.push({
    key: "prototype",
    label: "Prototype files in the repository",
    ok: prototypeFiles.length > 0,
    required: true,
    detail:
      prototypeFiles.length > 0
        ? `${prototypeFiles.length} project file${prototypeFiles.length === 1 ? "" : "s"} found.`
        : "Only documentation was found. Upload your code, workflow export or configuration files.",
  });

  const readmePath = files.find((p) => /^readme\.(md|markdown)$/i.test(p));
  const readme = readmePath ? await fileText(cfg.mentorToken, fullName, readmePath, ref) : null;
  const readmeWords = readme ? countWords(readme) : 0;
  items.push({
    key: "readme",
    label: `README of at least ${README_MIN_WORDS} words`,
    ok: readmeWords >= README_MIN_WORDS,
    required: true,
    detail: readme
      ? `README.md has ${readmeWords} words.`
      : "No README.md in the root of the repository.",
  });

  const headings = readme ? (readme.match(/^#{1,3}\s+\S/gm) ?? []).length : 0;
  items.push({
    key: "sections",
    label: "README covers the six sections",
    ok: headings >= 6,
    required: false,
    detail: `${headings} heading${headings === 1 ? "" : "s"} found. Lesson 6.2 lists the six sections a reviewer looks for.`,
  });

  items.push({
    key: "demo",
    label: "Demo recording linked in the README",
    ok: !!readme && DEMO_LINK.test(readme),
    required: true,
    detail:
      readme && DEMO_LINK.test(readme)
        ? "Demo link found."
        : "Add a YouTube (unlisted), Google Drive, Loom or Vimeo link to your 2 to 5 minute demo.",
  });

  const ethicsPath =
    files.find((p) => /^(ethics[-_ ]?review|ethics)\.md$/i.test(p)) ??
    files.find((p) => /^docs\/(ethics[-_ ]?review|ethics)\.md$/i.test(p));
  const ethics = ethicsPath ? await fileText(cfg.mentorToken, fullName, ethicsPath, ref) : null;
  const ethicsWords = ethics ? countWords(ethics) : 0;
  items.push({
    key: "ethics",
    label: `Ethics review of at least ${ETHICS_MIN_WORDS} words`,
    ok: ethicsWords >= ETHICS_MIN_WORDS,
    required: true,
    detail: ethics
      ? `${ethicsPath} has ${ethicsWords} words.`
      : "No ethics-review.md in the root of the repository.",
  });

  if (studentLogin) {
    // Newest first. A repo generated from the template starts with a
    // parentless "Initial commit" credited to whoever generated it: that is
    // the template, not their work, so it only counts on a linked repo.
    const commits = await gh<{ parents: unknown[] }[]>(
      `/repos/${fullName}/commits?sha=${ref}&author=${encodeURIComponent(studentLogin)}&per_page=2`,
      cfg.mentorToken,
    );
    const authored = (commits.data ?? []).some((c) => !createdViaTemplate || (c.parents?.length ?? 0) > 0);
    items.push({
      key: "authored",
      label: "You have commits in this repository",
      ok: authored,
      required: true,
      detail: authored
        ? `Commits by @${studentLogin} found.`
        : `No commits by @${studentLogin}. In a team, each member should commit their own part.`,
    });
  }

  return {
    ref,
    ran_at: ranAt,
    items,
    passed: items.every((i) => !i.required || i.ok),
  };
}
