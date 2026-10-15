import type { SupabaseClient } from "@supabase/supabase-js";
import { SUBMITTABLE_LESSONS } from "@/app/courses/course-data";
import {
  eligibility,
  lessonProgress,
  type Eligibility,
  type LessonProgress,
  type ProjectCheckResult,
} from "./requirements";

/**
 * Reads for the Agentic AI course monitor. Every function here expects the
 * service role client from requireAdmin / requireMember, and the caller is
 * responsible for only asking about users it may see.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any, "public", any>;

/** PostgREST truncates responses at its row cap without saying so. */
const PAGE = 1000;

async function readAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

/** `.in()` filters travel in the URL, so long id lists go in chunks. */
async function readByIds<T>(
  ids: string[],
  query: (chunk: string[]) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const CHUNK = 150;
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += CHUNK) chunks.push(ids.slice(i, i + CHUNK));
  const results = await Promise.all(chunks.map(query));
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
  return results.flatMap((r) => r.data ?? []);
}

export interface ProjectRow {
  id: string;
  full_name: string;
  html_url: string;
  owner_login: string;
  is_fork: boolean;
  fork_parent: string | null;
}

const PROJECT_COLUMNS = "id, full_name, html_url, owner_login, is_fork, fork_parent";

export interface MembershipRow {
  user_id: string;
  project_id: string;
  submitted_at: string | null;
  submitted_commit: string | null;
  check_result: ProjectCheckResult | null;
  checked_at: string | null;
}

export interface CertificateRow {
  cert_id: string;
  user_id: string | null;
  issued_at: string;
  revoked_at: string | null;
  legacy: boolean;
  confirmed_at: string | null;
  emailed_at: string | null;
}

const CERT_COLUMNS = "cert_id, user_id, issued_at, revoked_at, legacy, confirmed_at, emailed_at";

/** A legacy row stays unverified until staff confirm it (see the migration). */
export const certificateVerified = (c: Pick<CertificateRow, "revoked_at" | "legacy" | "confirmed_at">) =>
  !c.revoked_at && (!c.legacy || !!c.confirmed_at);

// ── One student ─────────────────────────────────────────────────────────

export interface StudentState {
  lessons: LessonProgress;
  /** The id on the student's lesson pages. The README must contain it. */
  student_id: string;
  project: ProjectRow | null;
  membership: MembershipRow | null;
  certificate: CertificateRow | null;
  eligibility: Eligibility;
}

export async function loadStudentState(client: Client, userId: string): Promise<StudentState> {
  const [subs, membership, certificate] = await Promise.all([
    client
      .from("lesson_submissions")
      .select("lesson_slug, student_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(PAGE),
    client
      .from("course_project_members")
      .select("user_id, project_id, submitted_at, submitted_commit, check_result, checked_at")
      .eq("user_id", userId)
      .maybeSingle(),
    client
      .from("course_certificates")
      .select(CERT_COLUMNS)
      .eq("user_id", userId)
      // Revoked ones are history: at most one active row per student.
      .is("revoked_at", null)
      .maybeSingle(),
  ]);
  for (const r of [subs, membership, certificate]) {
    if (r.error) throw new Error(r.error.message);
  }

  const m = (membership.data as MembershipRow | null) ?? null;
  let project: ProjectRow | null = null;
  if (m) {
    const p = await client
      .from("course_projects")
      .select(PROJECT_COLUMNS)
      .eq("id", m.project_id)
      .maybeSingle();
    if (p.error) throw new Error(p.error.message);
    project = (p.data as ProjectRow | null) ?? null;
  }

  const rows = (subs.data ?? []) as { lesson_slug: string; student_id: string | null }[];
  const lessons = lessonProgress(rows.map((r) => r.lesson_slug));
  const cert = (certificate.data as CertificateRow | null) ?? null;

  return {
    lessons,
    // Oldest first: the id the student has seen since their first reflection.
    student_id: rows.find((r) => r.student_id)?.student_id ?? studentIdFor(userId),
    project,
    membership: m,
    certificate: cert,
    eligibility: eligibility({
      lessons,
      hasProject: !!project,
      submittedAt: m?.submitted_at ?? null,
      check: m?.check_result ?? null,
      certificateId: cert && !cert.revoked_at ? cert.cert_id : null,
    }),
  };
}

// ── Whole course, for the admin monitor ─────────────────────────────────

export interface StudentRow {
  user_id: string;
  name: string | null;
  email: string | null;
  student_id: string;
  lessons_done: number;
  missing_core: number;
  track_done: boolean;
  lessons_complete: boolean;
  last_activity: string | null;
  open_questions: number;
  project_full_name: string | null;
  project_url: string | null;
  project_fork: boolean;
  submitted_at: string | null;
  checked_at: string | null;
  check_passed: boolean | null;
  check_error: string | null;
  cert_id: string | null;
  cert_issued_at: string | null;
  cert_legacy: boolean;
  /** False for a legacy certificate staff have not confirmed yet. */
  cert_verified: boolean;
  /** False when the certificate exists but its email never went out. */
  cert_emailed: boolean;
  eligible: boolean;
  reasons: string[];
}

export interface CourseOverview {
  students: StudentRow[];
  /** Reflections per lesson, in course order: where students drop off. */
  lessonFunnel: { slug: string; number: string; title: string; students: number }[];
  totals: {
    students: number;
    active7d: number;
    lessonsComplete: number;
    projects: number;
    submitted: number;
    eligible: number;
    certified: number;
    openQuestions: number;
  };
  lessonsTotal: number;
}

interface SubmissionLite {
  user_id: string;
  lesson_slug: string;
  student_id: string | null;
  question: string | null;
  admin_reply: string | null;
  updated_at: string | null;
  created_at: string;
}

export function studentIdFor(userId: string, year = new Date().getFullYear()): string {
  // Same derivation as /api/courses/submissions, so the id on a student's
  // lesson page and on their certificate match.
  return `BIO-${year}-${userId.slice(0, 8).toUpperCase()}`;
}

export async function loadCourseOverview(client: Client): Promise<CourseOverview> {
  const [subs, members, projects, certs] = await Promise.all([
    readAll<SubmissionLite>((from, to) =>
      client
        .from("lesson_submissions")
        .select("user_id, lesson_slug, student_id, question, admin_reply, updated_at, created_at")
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    ),
    readAll<MembershipRow>((from, to) =>
      client
        .from("course_project_members")
        .select("user_id, project_id, submitted_at, submitted_commit, check_result, checked_at")
        .order("user_id")
        .range(from, to),
    ),
    readAll<ProjectRow>((from, to) =>
      client
        .from("course_projects")
        .select(PROJECT_COLUMNS)
        .order("id")
        .range(from, to),
    ),
    readAll<CertificateRow>((from, to) =>
      client
        .from("course_certificates")
        .select(CERT_COLUMNS)
        .is("revoked_at", null)
        .order("cert_id")
        .range(from, to),
    ),
  ]);

  const byUser = new Map<string, SubmissionLite[]>();
  for (const s of subs) {
    if (!s.user_id) continue;
    const list = byUser.get(s.user_id) ?? [];
    list.push(s);
    byUser.set(s.user_id, list);
  }
  const memberBy = new Map(members.map((m) => [m.user_id, m]));
  const projectBy = new Map(projects.map((p) => [p.id, p]));
  const certBy = new Map(certs.filter((c) => c.user_id && !c.revoked_at).map((c) => [c.user_id as string, c]));

  // Certificate holders too: an imported legacy certificate can belong to
  // someone with no lessons, and staff must be able to confirm or revoke it.
  const userIds = [...new Set([...byUser.keys(), ...memberBy.keys(), ...certBy.keys()])];
  const profiles = await readByIds<{ id: string; full_name: string | null; email: string | null }>(
    userIds,
    (chunk) => client.from("profiles").select("id, full_name, email").in("id", chunk),
  );
  const profileBy = new Map(profiles.map((p) => [p.id, p]));

  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const funnel = new Map<string, number>();

  const students: StudentRow[] = userIds.map((uid) => {
    const list = byUser.get(uid) ?? [];
    const lessons = lessonProgress(list.map((s) => s.lesson_slug));
    for (const slug of new Set(list.map((s) => s.lesson_slug))) funnel.set(slug, (funnel.get(slug) ?? 0) + 1);

    const m = memberBy.get(uid) ?? null;
    const project = m ? (projectBy.get(m.project_id) ?? null) : null;
    const cert = certBy.get(uid) ?? null;
    const elig = eligibility({
      lessons,
      hasProject: !!project,
      submittedAt: m?.submitted_at ?? null,
      check: m?.check_result ?? null,
      certificateId: cert?.cert_id ?? null,
    });
    const last = list.reduce<string | null>((acc, s) => {
      const t = s.updated_at ?? s.created_at;
      return !acc || t > acc ? t : acc;
    }, null);
    const profile = profileBy.get(uid);

    return {
      user_id: uid,
      name: profile?.full_name || null,
      email: profile?.email ?? null,
      // Rows are read oldest first, so this is the id the student has seen
      // on their lesson pages since their first reflection.
      student_id: list.find((s) => s.student_id)?.student_id ?? studentIdFor(uid),
      lessons_done: lessons.done,
      missing_core: lessons.missingCore.length,
      track_done: lessons.trackDone,
      lessons_complete: lessons.complete,
      last_activity: last,
      open_questions: list.filter((s) => s.question?.trim() && !s.admin_reply).length,
      project_full_name: project?.full_name ?? null,
      project_url: project?.html_url ?? null,
      project_fork: project?.is_fork ?? false,
      submitted_at: m?.submitted_at ?? null,
      checked_at: m?.checked_at ?? null,
      check_passed: m?.check_result ? m.check_result.passed && !m.check_result.error : null,
      check_error: m?.check_result?.error ?? null,
      cert_id: cert?.cert_id ?? null,
      cert_issued_at: cert?.issued_at ?? null,
      cert_legacy: cert?.legacy ?? false,
      cert_verified: cert ? certificateVerified(cert) : false,
      // Legacy rows were emailed by the old route, which did not record it.
      cert_emailed: cert ? cert.legacy || !!cert.emailed_at : false,
      eligible: elig.eligible,
      reasons: elig.reasons,
    };
  });

  students.sort((a, b) => (b.last_activity ?? "").localeCompare(a.last_activity ?? ""));

  return {
    students,
    lessonFunnel: SUBMITTABLE_LESSONS.map((l) => ({
      slug: l.slug,
      number: l.number,
      title: l.title,
      students: funnel.get(l.slug) ?? 0,
    })),
    totals: {
      students: students.length,
      active7d: students.filter((s) => s.last_activity && Date.parse(s.last_activity) >= weekAgo).length,
      lessonsComplete: students.filter((s) => s.lessons_complete).length,
      projects: projects.length,
      submitted: students.filter((s) => s.submitted_at).length,
      eligible: students.filter((s) => s.eligible).length,
      certified: students.filter((s) => s.cert_id).length,
      openQuestions: students.reduce((n, s) => n + s.open_questions, 0),
    },
    lessonsTotal: SUBMITTABLE_LESSONS.length,
  };
}
