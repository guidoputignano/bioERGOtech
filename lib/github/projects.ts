import { definitive, gh, MAX_DOC_BYTES, rawFile } from "./client";
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

export const BUSY_MESSAGE = "GitHub is busy right now. Please try again in a few minutes.";

// ── Linking ─────────────────────────────────────────────────────────────

export type LookupResult =
  | { ok: true; repo: GhRepo }
  | { ok: false; reason: "not_found" | "busy" };

/**
 * A repository as GitHub shows it to anyone. A private repository answers
 * 404 exactly like a missing one, which is why the message to the student
 * covers both. Anything that is not a clear answer about the repository is
 * "busy": the student tries again, nothing is recorded.
 */
export async function lookupRepo(fullName: string): Promise<LookupResult> {
  const res = await gh<GhRepo>(`/repos/${fullName}`);
  if (res.data) return { ok: true, repo: res.data };
  if (definitive(res)) return { ok: false, reason: "not_found" };
  if (!res.rateLimited) console.error("GitHub repo lookup failed:", res.status, res.message);
  return { ok: false, reason: "busy" };
}

// ── Text ────────────────────────────────────────────────────────────────
// Everything below runs on text a student controls, so it must stay linear:
// lazy regexes over an unclosed "<!--" or "```" rescan to the end from every
// opener, and a crafted README could hold a function for minutes.

/** Removes `open ... close` spans; an unclosed one runs to the end. */
function stripBetween(text: string, open: string, close: string): string {
  let out = "";
  let i = 0;
  for (;;) {
    const start = text.indexOf(open, i);
    if (start === -1) return out + text.slice(i);
    out += text.slice(i, start) + " ";
    const end = text.indexOf(close, start + open.length);
    if (end === -1) return out;
    i = end + close.length;
  }
}

/** Text with HTML comments removed: template guidance must not count. */
export const visible = (markdown: string) => stripBetween(markdown, "<!--", "-->");

/** Words a reader would see: comments, code, link targets and markup removed. */
export function countWords(markdown: string): number {
  const text = stripBetween(visible(markdown), "```", "```")
    .replace(/`[^`\n]{0,500}`/g, " ")
    .replace(/!?\[([^\]\n]{0,500})\]\([^)\s]{0,2000}\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/<[^>\n]{1,500}>/g, " ")
    .replace(/[#>*_|~-]/g, " ");
  return (text.match(/[\p{L}\p{N}][\p{L}\p{N}'’]*/gu) ?? []).length;
}

const DEMO_LINK =
  /(https?:\/\/)?(www\.)?(youtube\.com\/(watch|shorts|live)|youtu\.be\/|drive\.google\.com\/|loom\.com\/share\/|vimeo\.com\/\d|github\.com\/user-attachments\/assets\/)/i;
const VIDEO_FILE = /\.(mp4|mov|m4v|webm|avi|mkv)$/i;

/**
 * Images removed before looking for a demo link. A video dragged into a
 * README on GitHub becomes a bare github.com/user-attachments link; an image
 * becomes the same kind of link inside ![...](...) or <img>, and a
 * screenshot is not a demo.
 */
const withoutImages = (markdown: string) =>
  markdown.replace(/!\[[^\]\n]{0,500}\]\([^)\n]{0,2000}\)/g, " ").replace(/<img\b[^>\n]{0,2000}>/gi, " ");

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

// ── Checks ──────────────────────────────────────────────────────────────

export interface HeadResult {
  sha: string | null;
  treeSha: string | null;
  /** Not a clear answer about the repository: try again, record nothing. */
  transient: boolean;
}

/** A commit of the repository (its latest when `ref` is HEAD) and its file tree. */
export async function readCommit(fullName: string, ref = "HEAD"): Promise<HeadResult> {
  const res = await gh<{ sha: string; commit: { tree: { sha: string } } }>(
    `/repos/${fullName}/commits/${encodeURIComponent(ref)}`,
  );
  if (!res.data && !definitive(res) && !res.rateLimited) {
    console.error("GitHub commit lookup failed:", res.status, res.message);
  }
  return {
    sha: res.data?.sha ?? null,
    treeSha: res.data?.commit?.tree?.sha ?? null,
    transient: !res.data && !definitive(res),
  };
}

/**
 * Runs the automated checks on a public repository at one commit.
 *
 * Costs two GitHub API requests (the commit and its tree; one when the
 * caller already read the commit), more only for very large repositories.
 * README and ethics review come from raw.githubusercontent.com, which does
 * not count against the API limit.
 *
 * Only clear answers about the repository become failed items. When GitHub
 * itself fails, the result carries BUSY_MESSAGE and callers store nothing.
 */
export async function runProjectChecks(input: {
  fullName: string;
  /** The student's own id, shown on their lesson pages, e.g. BIO-2026-1A2B3C4D. */
  studentId: string;
  /** The submitted commit; null checks the latest one. */
  pinnedRef: string | null;
  fork: { isFork: boolean; parent: string | null };
  /** The commit, when the caller has just read it. */
  head?: HeadResult;
}): Promise<ProjectCheckResult> {
  const ranAt = new Date().toISOString();
  const fail = (error: string, ref: string | null = input.pinnedRef): ProjectCheckResult => ({
    ref,
    ran_at: ranAt,
    items: [],
    passed: false,
    error,
  });

  const head = input.head?.sha && input.head.treeSha ? input.head : await readCommit(input.fullName, input.pinnedRef ?? "HEAD");
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
    return fail(definitive(treeRes) ? `Could not read commit ${ref.slice(0, 7)}.` : BUSY_MESSAGE, ref);
  }
  const files = treeRes.data.tree.filter((e) => e.type === "blob").map((e) => e.path);

  // GitHub cuts a recursive listing off on very large repos (a committed
  // virtualenv is enough). The files the checks look for live at the root
  // or in docs/, so read those two levels directly rather than report
  // README or ethics review as missing.
  if (treeRes.data.truncated) {
    const root = await gh<{ tree: TreeEntry[] }>(`/repos/${input.fullName}/git/trees/${head.treeSha}`);
    if (!root.data) return fail(definitive(root) ? `Could not read commit ${ref.slice(0, 7)}.` : BUSY_MESSAGE, ref);
    for (const e of root.data.tree) if (e.type === "blob" && !files.includes(e.path)) files.push(e.path);
    const docsDir = root.data.tree.find((e) => e.type === "tree" && e.path.toLowerCase() === "docs");
    if (docsDir) {
      const docs = await gh<{ tree: TreeEntry[] }>(`/repos/${input.fullName}/git/trees/${docsDir.sha}`);
      if (!docs.data) return fail(definitive(docs) ? `Could not read commit ${ref.slice(0, 7)}.` : BUSY_MESSAGE, ref);
      for (const e of docs.data.tree) {
        const p = `${docsDir.path}/${e.path}`;
        if (e.type === "blob" && !files.includes(p)) files.push(p);
      }
    }
  }

  const readmePath = files.find((p) => /^readme\.(md|markdown)$/i.test(p));
  const ethicsPath =
    files.find((p) => /^(ethics[-_ ]?review|ethics)\.md$/i.test(p)) ??
    files.find((p) => /^docs\/(ethics[-_ ]?review|ethics)\.md$/i.test(p));
  const [readmeRaw, ethicsRaw] = await Promise.all([
    readmePath ? rawFile(input.fullName, ref, readmePath) : null,
    ethicsPath ? rawFile(input.fullName, ref, ethicsPath) : null,
  ]);
  // The tree just listed these files at this exact commit, so a failed or
  // missing download is GitHub's problem, not the student's.
  for (const r of [readmeRaw, ethicsRaw]) {
    if (r && ("failed" in r || "missing" in r)) return fail(BUSY_MESSAGE, ref);
  }
  const tooLarge = `is over ${Math.round(MAX_DOC_BYTES / 1000)} KB, too large to check. A README of a few pages is plenty.`;
  const readme = readmeRaw && "text" in readmeRaw ? readmeRaw.text : null;
  const ethics = ethicsRaw && "text" in ethicsRaw ? ethicsRaw.text : null;
  const readmeShown = readme === null ? null : visible(readme);

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

  const readmeWords = readme ? countWords(readme) : 0;
  items.push({
    key: "readme",
    label: `README of at least ${README_MIN_WORDS} words`,
    ok: readmeWords >= README_MIN_WORDS,
    required: true,
    detail: readme
      ? `README.md has ${readmeWords} words.`
      : readmeRaw && "tooLarge" in readmeRaw
        ? `README.md ${tooLarge}`
        : "No README.md in the root of the repository.",
  });

  const idFound = !!readmeShown && readmeShown.toUpperCase().includes(input.studentId.toUpperCase());
  items.push({
    key: "student_id",
    label: "Your Student ID is in the README",
    ok: idFound,
    required: true,
    detail: idFound
      ? `${input.studentId} found.`
      : `Add ${input.studentId} to the Team section of README.md. In a team, every member adds their own.`,
  });

  const headings = readmeShown ? (readmeShown.match(/^#{1,3}[ \t]+\S/gm) ?? []).length : 0;
  items.push({
    key: "sections",
    label: "README covers the six sections",
    ok: headings >= 6,
    required: false,
    detail: `${headings} heading${headings === 1 ? "" : "s"} found. Lesson 6.2 lists the six sections a reviewer looks for.`,
  });

  const videoFiles = files.filter((p) => VIDEO_FILE.test(p));
  const demoLinked = !!readmeShown && DEMO_LINK.test(withoutImages(readmeShown));
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

  const ethicsWords = ethics ? countWords(ethics) : 0;
  items.push({
    key: "ethics",
    label: `Ethics review of at least ${ETHICS_MIN_WORDS} words`,
    ok: ethicsWords >= ETHICS_MIN_WORDS,
    required: true,
    detail: ethics
      ? `${ethicsPath} has ${ethicsWords} words.`
      : ethicsRaw && "tooLarge" in ethicsRaw
        ? `${ethicsPath} ${tooLarge}`
        : "No ethics-review.md in the root of the repository.",
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
