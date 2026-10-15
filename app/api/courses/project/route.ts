import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/lib/auth/admin";
import { claimGithub, loadStudentState, waitMessage } from "@/lib/course/data";
import { parseRepoRef } from "@/lib/github/client";
import { BUSY_MESSAGE, lookupRepo } from "@/lib/github/projects";
import { studenteLiceiConfermato } from "@/lib/eventi/licei-server";
import { candidatoUniversitaConfermato } from "@/lib/eventi/universita-server";

/**
 * GET /api/courses/project
 *
 * The signed-in student's course state: lesson progress, Student ID,
 * project, last check result and certificate. Only ever their own.
 */
export async function GET() {
  const guard = await requireMember();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client, chiamante } = guard;

  try {
    const state = await loadStudentState(client, chiamante.id);
    // Licei and universita students hand in their team project through their
    // own console, assessed by a Commissione. Asking them for a repository
    // here as well would give them two competing submission routes.
    const separateTrack = (await studenteLiceiConfermato()) || (await candidatoUniversitaConfermato());
    return NextResponse.json({ ...state, separate_track: separateTrack });
  } catch (error) {
    console.error("course project state:", (error as Error).message);
    return NextResponse.json({ error: "Could not load your course progress" }, { status: 500 });
  }
}

/**
 * POST /api/courses/project
 * Body: { repo } a github.com link or owner/name
 *
 * Links the student to a public repository they created in their own
 * GitHub account. Teammates link the same repository. Nothing is created
 * or changed on GitHub: the site only reads public repositories.
 */
export async function POST(req: NextRequest) {
  const guard = await requireMember();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client, chiamante } = guard;

  const { repo: input } = (await req.json().catch(() => ({}))) as { repo?: string };
  const ref = parseRepoRef(input ?? "");
  if (!ref) {
    return NextResponse.json(
      { error: "That does not look like a GitHub repository link. It should look like github.com/your-name/your-project." },
      { status: 400 },
    );
  }

  const state = await loadStudentState(client, chiamante.id);
  if (state.certificate) {
    return NextResponse.json({ error: "Your certificate has been issued, so your project can no longer be changed." }, { status: 409 });
  }

  // Claimed before GitHub is called, so failed lookups count too.
  const wait = await claimGithub(client, chiamante.id, "link");
  if (wait !== null) return NextResponse.json({ error: waitMessage(wait) }, { status: 429 });

  const { data: current } = await client
    .from("course_project_members")
    .select("project_id")
    .eq("user_id", chiamante.id)
    .maybeSingle();

  const found = await lookupRepo(ref);
  if (!found.ok) {
    return found.reason === "not_found"
      ? NextResponse.json(
          { error: "We could not find that repository. Check the link, and make sure the repository is public (on GitHub: Settings, then Danger Zone, then Change visibility)." },
          { status: 404 },
        )
      : NextResponse.json({ error: BUSY_MESSAGE }, { status: 502 });
  }
  const repo = found.repo;
  if (repo.private) {
    return NextResponse.json({ error: "That repository is private. Make it public first: the course asks for public projects." }, { status: 400 });
  }

  // A teammate linking a repo that is already registered refreshes its name
  // and fork status; the first student stays recorded as created_by.
  const fields = {
    full_name: repo.full_name,
    html_url: repo.html_url,
    owner_login: repo.owner.login,
    default_branch: repo.default_branch,
    is_fork: repo.fork,
    fork_parent: repo.fork ? (repo.parent?.full_name ?? null) : null,
  };
  const { data: existing } = await client
    .from("course_projects")
    .select("id")
    .eq("github_repo_id", repo.id)
    .maybeSingle();
  const saved = existing
    ? await client.from("course_projects").update(fields).eq("id", existing.id).select("id").single()
    : await client
        .from("course_projects")
        .insert({ ...fields, github_repo_id: repo.id, created_by: chiamante.id })
        .select("id")
        .single();
  if (saved.error || !saved.data) {
    console.error("course_projects save:", saved.error?.message);
    return NextResponse.json({ error: "Could not save your repository" }, { status: 500 });
  }
  const projectId = saved.data.id as string;

  // Moving to a different repository clears the earlier submission, which
  // was about another repository. Relinking the same one keeps it.
  const now = new Date().toISOString();
  const { error: memberError } = await client.from("course_project_members").upsert(
    current?.project_id === projectId
      ? { user_id: chiamante.id, project_id: projectId, joined_at: now }
      : {
          user_id: chiamante.id,
          project_id: projectId,
          joined_at: now,
          submitted_at: null,
          submitted_commit: null,
          check_result: null,
          checked_at: null,
        },
    { onConflict: "user_id" },
  );
  if (memberError) {
    console.error("course_project_members upsert:", memberError.message);
    return NextResponse.json({ error: "Could not save your repository" }, { status: 500 });
  }

  return NextResponse.json({ state: await loadStudentState(client, chiamante.id) });
}
