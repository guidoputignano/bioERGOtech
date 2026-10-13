import { NextResponse } from "next/server";
import { requireMember } from "@/lib/auth/admin";
import { loadStudentState } from "@/lib/course/data";
import { githubConfig } from "@/lib/github/client";
import { studenteLiceiConfermato } from "@/lib/eventi/licei-server";
import { candidatoUniversitaConfermato } from "@/lib/eventi/universita-server";

/**
 * GET /api/courses/project
 *
 * The signed-in student's course state: lesson progress, GitHub account,
 * project, last check result and certificate. Only ever their own.
 */
export async function GET() {
  const guard = await requireMember();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client, chiamante } = guard;

  // Every lesson page asks this for signed-in students. Until GitHub is set
  // up, answer without touching the course tables, which may not exist yet
  // (the migration is run by hand): the prompt and project box then stay
  // hidden instead of 500s on every lesson view.
  const cfg = githubConfig();
  if (!cfg) return NextResponse.json({ github_enabled: false });

  try {
    const state = await loadStudentState(client, chiamante.id);
    // Licei and universita students hand in their team project through their
    // own console, assessed by a Commissione. Asking them for a GitHub repo
    // as well would give them two competing submission routes.
    const separateTrack = (await studenteLiceiConfermato()) || (await candidatoUniversitaConfermato());
    return NextResponse.json({
      ...state,
      separate_track: separateTrack,
      github_enabled: true,
      mentor_login: cfg.mentorLogin,
      template_repo: cfg.templateRepo,
    });
  } catch (error) {
    console.error("course project state:", (error as Error).message);
    return NextResponse.json({ error: "Could not load your course progress" }, { status: 500 });
  }
}
