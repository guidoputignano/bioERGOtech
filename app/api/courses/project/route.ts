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

  try {
    const state = await loadStudentState(client, chiamante.id);
    const cfg = githubConfig();
    // Licei and universita students hand in their team project through their
    // own console, assessed by a Commissione. Asking them for a GitHub repo
    // as well would give them two competing submission routes.
    const separateTrack = (await studenteLiceiConfermato()) || (await candidatoUniversitaConfermato());
    return NextResponse.json({
      ...state,
      separate_track: separateTrack,
      github_enabled: !!cfg,
      mentor_login: cfg?.mentorLogin ?? null,
      template_repo: cfg?.templateRepo ?? null,
    });
  } catch (error) {
    console.error("course project state:", (error as Error).message);
    return NextResponse.json({ error: "Could not load your course progress" }, { status: 500 });
  }
}
