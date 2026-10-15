import { SUBMITTABLE_LESSONS } from "@/app/courses/course-data";

/**
 * What a student must do to earn the Agentic AI course certificate.
 *
 * This file is the single place the rule lives. The student's project box,
 * the admin Course Monitor and the approve-certificate route all read it, so
 * the three can never disagree about who is eligible.
 *
 * The rule: every core lesson reflection, at least one technical track
 * lesson, a submitted project, and every required automated project check
 * passing. An admin still approves each certificate by hand.
 */

/**
 * Lessons every student must complete.
 *
 * Track lessons (4.1 Make/n8n, 4.2 OpenClaw, 4.3 Agno) are excluded: a
 * student follows one track, and requiring all three would hold back
 * everyone who did exactly what the course asked of them.
 */
export const CORE_LESSONS = SUBMITTABLE_LESSONS.filter((l) => l.track === "all");
export const TRACK_LESSONS = SUBMITTABLE_LESSONS.filter((l) => l.track !== "all");

export interface LessonProgress {
  /** Submittable lessons with a saved reflection, any track. */
  done: number;
  total: number;
  /** Core lessons still missing, in course order. */
  missingCore: { slug: string; number: string; title: string }[];
  trackDone: boolean;
  complete: boolean;
}

export function lessonProgress(submittedSlugs: Iterable<string>): LessonProgress {
  const done = new Set(submittedSlugs);
  const missingCore = CORE_LESSONS.filter((l) => !done.has(l.slug)).map((l) => ({
    slug: l.slug,
    number: l.number,
    title: l.title,
  }));
  const trackDone = TRACK_LESSONS.some((l) => done.has(l.slug));
  return {
    done: SUBMITTABLE_LESSONS.filter((l) => done.has(l.slug)).length,
    total: SUBMITTABLE_LESSONS.length,
    missingCore,
    trackDone,
    complete: missingCore.length === 0 && trackDone,
  };
}

// ── Project checks ──────────────────────────────────────────────────────

export type CheckKey =
  | "prototype"
  | "readme"
  | "ethics"
  | "demo"
  /** The student's own Student ID in the README: shows they can edit the repo. */
  | "student_id"
  | "sections"
  /** Informational: a fork is flagged for reviewers, it does not block. */
  | "original";

export interface CheckItem {
  key: CheckKey;
  label: string;
  ok: boolean;
  /** Required items block the certificate. The rest are guidance. */
  required: boolean;
  detail: string;
}

export interface ProjectCheckResult {
  /** The commit the checks ran against. */
  ref: string | null;
  ran_at: string;
  items: CheckItem[];
  passed: boolean;
  /** Set when the checks could not run at all (repo gone, GitHub down). */
  error?: string;
}

export const README_MIN_WORDS = 400;
export const ETHICS_MIN_WORDS = 150;

// ── Eligibility ─────────────────────────────────────────────────────────

export interface EligibilityInput {
  lessons: LessonProgress;
  hasProject: boolean;
  submittedAt: string | null;
  check: ProjectCheckResult | null;
  certificateId: string | null;
}

export interface Eligibility {
  eligible: boolean;
  /** What is still missing, in plain words, for the admin and the student. */
  reasons: string[];
}

export function eligibility(input: EligibilityInput): Eligibility {
  const reasons: string[] = [];

  if (input.certificateId) {
    return { eligible: false, reasons: ["Certificate already issued"] };
  }
  if (input.lessons.missingCore.length > 0) {
    reasons.push(
      `${input.lessons.missingCore.length} core lesson${input.lessons.missingCore.length === 1 ? "" : "s"} without a reflection`,
    );
  }
  if (!input.lessons.trackDone) {
    reasons.push("No technical track lesson (4.1, 4.2 or 4.3) completed");
  }
  if (!input.hasProject) {
    reasons.push("No project repository linked");
  } else if (!input.submittedAt) {
    reasons.push("Project not yet submitted for certificate");
  } else if (!input.check) {
    reasons.push("Project checks have not run");
  } else if (input.check.error) {
    reasons.push(`Project checks failed to run: ${input.check.error}`);
  } else {
    for (const item of input.check.items) {
      if (item.required && !item.ok) reasons.push(item.label);
    }
  }

  return { eligible: reasons.length === 0, reasons };
}
