import { gh, rawFile } from "./client";
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
  fork: boolean;
  parent?: { full_name: string } | null;
  default_branch: string;
  owner: { login: string };
}

// ── Linking ─────────────────────────────────────────────────────────────

export type LookupResult =
  | { ok: true; repo: GhRepo }
  | { ok: false; reason: "not_found" | "busy" | "error" };

/**
 * A repository as GitHub shows it to anyone. A private repository answers
 * 404 exactly like a missing one, which is why the message to the student
 * covers both.
 */
export async function lookupRepo(fullName: string): Promise<LookupResult> {
  const res = await gh<GhRepo>(`/repos/${fullName}`);
  if (res.data) return { ok: true, repo: res.data };
  if (res.status === 404) return { ok: false, reason: "not_found" };
  if (res.rateLimited || res.status === 0 || res.status >= 500) return { ok: false, reason: "busy" };
  console.error("GitHub repo lookup failed:", res.status, res.message);
  return { ok: false, reason: "error" };
}

// ── Checks ──────────────────────────────────────────────────────────────

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

/** Text with HTML comments removed: template guidance must not count. */
const visible = (markdown: string) => markdown.replace(/<!--[\s\S]*?-->/g, " ");

const DEMO_LINK =
  /(https?:\/\/)?(www\.)?(youtube\.com\/(watch|shorts|live)|youtu\.be\/|drive\.google\.com\/|loom\.com\/share\/|vimeo\.com\/\d|github\.com\/user-attachments\/assets\/)/i;
const VIDEO_FILE = /\.(mp4|mov|m4v|webm|avi|mkv)$/i;

/** Files that are not the prototype itself (a demo video is not the prototype either). */
function isScaffolding(path: string): boolean {
  const base = path.split("/").pop() ?? path;
  return (
    path.startsWith(".github/") ||
    base.startsWith(".") ||
    /\.(md|markdown|txt)$/i.test(base) ||
    VIDEO_FILE.test(base) ||
    /^(license|licence)(\..*)?$/i.test(base)
  );
}

export interface HeadResult {
  sha: string | null;
  treeSha: string | null;
  /** GitHub down or rate-limited: worth trying again, nothing is wrong with the repo. */
  transient: boolean;
}

/** A commit of the repository (its latest when `ref` is HEAD) and its file tree. */
export async function readCommit(fullName: string, ref = "HEAD"): Promise<HeadResult> {
  const res = await gh<{ sha: string; commit: { tree: { sha: string } } }>(
    `/repos/${fullName}/commits/${encodeURIComponent(ref)}`,
  );
  return {
    sha: res.data?.sha ?? null,
    treeSha: res.data?.commit?.tree?.sha ?? null,
    transient: !res.data && (res.rateLimited || res.status === 0 || res.status >= 500),
  };
}

export const BUSY_MESSAGE = "GitHub is busy right now. Please try again in a few minutes.";

/**
 * Runs the automated checks on a public repository at one commit.
 *
 * Costs two GitHub API requests (the commit and its tree), more only for
 * very large repositories. README and ethics review are read from
 * raw.githubusercontent.com, which does not count against the API limit.
 */
export async function runProjectChecks(input: {
  fullName: string;
  /** The student's own id, shown on their lesson pages, e.g. BIO-2026-1A2B3C4D. */
  studentId: string;
  /** The submitted commit; null checks the latest one. */
  pinnedRef: string | null;
  fork: { isFork: boolean; parent: string | null };
}): Promise<ProjectCheckResult> {
  const ranAt = new Date().toISOString();
  const fail = (error: string, ref: string | null = input.pinnedRef): ProjectCheckResult => ({
    ref,
    ran_at: ranAt,
    items: [],
    passed: false,
    error,
  });

  const head = await readCommit(input.fullName, input.pinnedRef ?? "HEAD");
  if (!head.sha || !head.treeSha) {
    return fail(
      head.transient
        ? BUSY_MESSAGE
        : "We could not read the repository. Check that it still exists, is public and has at least one commit.",
    );
  }
  const ref = head.sha;

  type TreeEntry = { path: string; type: string; sha: string };
  const treeRes = await gh<{ tree: TreeEntry[]; truncated: boolean }>(
    `/repos/${input.fullName}/git/trees/${head.treeSha}?recursive=1`,
  );
  if (!treeRes.data) {
    return fail(treeRes.rateLimited ? BUSY_MESSAGE : `Could not read commit ${ref.slice(0, 7)}.`, ref);
  }
  const files = treeRes.data.tree.filter((e) => e.type === "blob").map((e) => e.path);

  // GitHub cuts a recursive listing off on very large repos (a committed
  // virtualenv is enough). The files the checks look for live at the root
  // or in docs/, so read those two levels directly rather than report
  // README or ethics review as missing.
  if (treeRes.data.truncated) {
    const root = await gh<{ tree: TreeEntry[] }>(`/repos/${input.fullName}/git/trees/${head.treeSha}`);
    for (const e of root.data?.tree ?? []) if (e.type === "blob" && !files.includes(e.path)) files.push(e.path);
    const docsDir = root.data?.tree.find((e) => e.type === "tree" && e.path.toLowerCase() === "docs");
    if (docsDir) {
      const docs = await gh<{ tree: TreeEntry[] }>(`/repos/${input.fullName}/git/trees/${docsDir.sha}`);
      for (const e of docs.data?.tree ?? []) {
        const p = `${docsDir.path}/${e.path}`;
        if (e.type === "blob" && !files.includes(p)) files.push(p);
      }
    }
  }

  const items: CheckItem[] = [];

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
  const readme = readmePath ? await rawFile(input.fullName, ref, readmePath) : null;
  const readmeWords = readme ? countWords(readme) : 0;
  items.push({
    key: "readme",
    label: `README of at least ${README_MIN_WORDS} words`,
    ok: readmeWords >= README_MIN_WORDS,
    required: true,
    detail: readme ? `README.md has ${readmeWords} words.` : "No README.md in the root of the repository.",
  });

  const idFound = !!readme && visible(readme).toUpperCase().includes(input.studentId.toUpperCase());
  items.push({
    key: "student_id",
    label: "Your Student ID is in the README",
    ok: idFound,
    required: true,
    detail: idFound
      ? `${input.studentId} found.`
      : `Add ${input.studentId} to the Team section of README.md. In a team, every member adds their own.`,
  });

  const headings = readme ? (visible(readme).match(/^#{1,3}\s+\S/gm) ?? []).length : 0;
  items.push({
    key: "sections",
    label: "README covers the six sections",
    ok: headings >= 6,
    required: false,
    detail: `${headings} heading${headings === 1 ? "" : "s"} found. Lesson 6.2 lists the six sections a reviewer looks for.`,
  });

  const videoFiles = files.filter((p) => VIDEO_FILE.test(p));
  const demoLinked = !!readme && DEMO_LINK.test(visible(readme));
  items.push({
    key: "demo",
    label: "Demo recording in the repository or linked in the README",
    ok: demoLinked || videoFiles.length > 0,
    required: true,
    detail: demoLinked
      ? "Demo link found in the README."
      : videoFiles.length > 0
        ? `Video found: ${videoFiles[0]}.`
        : "Upload your 2 to 5 minute demo video to the repository, or link it in the README (YouTube unlisted, Google Drive, Loom or Vimeo).",
  });

  const ethicsPath =
    files.find((p) => /^(ethics[-_ ]?review|ethics)\.md$/i.test(p)) ??
    files.find((p) => /^docs\/(ethics[-_ ]?review|ethics)\.md$/i.test(p));
  const ethics = ethicsPath ? await rawFile(input.fullName, ref, ethicsPath) : null;
  const ethicsWords = ethics ? countWords(ethics) : 0;
  items.push({
    key: "ethics",
    label: `Ethics review of at least ${ETHICS_MIN_WORDS} words`,
    ok: ethicsWords >= ETHICS_MIN_WORDS,
    required: true,
    detail: ethics ? `${ethicsPath} has ${ethicsWords} words.` : "No ethics-review.md in the root of the repository.",
  });

  items.push({
    key: "original",
    label: "Original repository, not a fork",
    ok: !input.fork.isFork,
    required: false,
    detail: input.fork.isFork
      ? `This repository is a fork${input.fork.parent ? ` of ${input.fork.parent}` : ""}. Reviewers will compare it with the original.`
      : "Not a fork.",
  });

  return {
    ref,
    ran_at: ranAt,
    items,
    passed: items.every((i) => !i.required || i.ok),
  };
}
