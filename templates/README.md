# Agentic AI course: GitHub projects, certificates and the Course Monitor

How the course monitoring works, and the one-time setup it needs. Until the
GitHub variables below are set, the course keeps working exactly as before:
the GitHub prompt and project box simply stay hidden.

## What students see

1. **Course start.** A "Connect your GitHub account" prompt on the course page
   and on each lesson. It asks only to read their public profile. They can
   put it off ("Later" hides it for three days); it is a prompt, not a gate.
2. **Lesson 4.4.** A project box: create a repository in their own account
   from the bioERGOtech template, or link one they already have. Either way
   the mentor account is added as a collaborator and accepts automatically.
   Teams: the owner links first, then each teammate links the same repo.
3. **Course Closing.** "Submit for certificate" pins the current commit and
   runs the checks. The student sees what is missing and can fix and resubmit
   until a certificate is issued.

Licei and universita students do not see any of this: they hand in through
their own console, which those two lessons already show them.

## What staff see

Member portal, Admin Panel, **Course Monitor** tab:

- **Students.** Everyone who has started, with lessons done, GitHub project,
  check result and certificate status. Filter "Ready to certify", select,
  and issue in bulk. "Issue anyway…" certifies outside the rule and asks for
  a reason, which is stored with the certificate.
- **Questions.** Open questions oldest first. "Draft with Claude" writes a
  reply grounded in the lesson content; read it, edit it, send it. Drafts
  that start "FLAG FOR STAFF" mean the submission needs a human.
- **Lesson drop-off.** Students per lesson, to spot where people stop.

## Certificate rule

Defined once in `lib/course/requirements.ts`:

- every core lesson reflection (all lessons except the track deep dives),
- at least one track lesson (4.1, 4.2 or 4.3),
- a linked, submitted project whose required checks pass:
  mentor access, prototype files beyond docs, README of 400+ words, a demo
  link (YouTube, Drive, Loom or Vimeo), `ethics-review.md` of 150+ words,
  and at least one commit by the student,
- then an admin approves.

Words inside `<!-- -->` comments do not count, so an untouched template never
passes.

## One-time setup

### 1. Run the migration

`supabase/migrations/20261216000000_course_github_projects_certificates.sql`
in the Supabase SQL editor. It is idempotent. It also copies certificates
already issued (from `profiles.cert_id`) into the new table, flagged `legacy`:
those values were writable by students, so confirm them by hand with the query
at the bottom of the file.

### 2. Create the mentor GitHub account

A normal GitHub **user** account, for example `bioergotech-mentor`, using a
foundation email. GitHub only lets users, not organisations, be collaborators
on personal repositories, which is why this has to be a user.

Then, signed in as that account, create a **classic** personal access token
(Settings, Developer settings, Personal access tokens, Tokens (classic)) with
the `repo` scope. It is used to accept collaborator invitations and to read
repositories for the checks. Set an expiry and a calendar reminder to rotate it.

### 3. Publish the template repository

As the mentor account, create a **public** repository named
`agentic-ai-project-template` with the contents of
`templates/agentic-ai-project/` (README.md, ethics-review.md, .gitignore,
.env.example), then tick **Settings, Template repository**.

### 4. Register the GitHub OAuth app

GitHub, Settings, Developer settings, OAuth Apps, New OAuth App (on the
mentor account or a bioERGOtech organisation):

- Application name: `bioERGOtech Agentic AI Course`
- Homepage URL: `https://www.bioergotech.org`
- Authorization callback URL: `https://www.bioergotech.org/api/courses/github/callback`

Generate a client secret.

### 5. Set the environment variables in Vercel

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://www.bioergotech.org` (must match the callback host) |
| `GITHUB_OAUTH_CLIENT_ID` | from step 4 |
| `GITHUB_OAUTH_CLIENT_SECRET` | from step 4 |
| `GITHUB_MENTOR_LOGIN` | the mentor username, without `@` |
| `GITHUB_MENTOR_TOKEN` | the token from step 2 |
| `GITHUB_TEMPLATE_REPO` | `bioergotech-mentor/agentic-ai-project-template` |
| `ANTHROPIC_API_KEY` | for "Draft with Claude" |

`RESEND_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are already in use.

## Notes

- Student OAuth tokens are never stored. Connecting asks for `read:user`
  only; creating or linking a repo asks for `public_repo` at that moment.
- The mentor token's limit is 5,000 GitHub calls an hour. A check costs
  about six, and students can re-check at most once a minute.
- Drafts use `claude-opus-5-5`. The whole course text is a cached prompt
  prefix, so each extra draft within an hour costs very little. The lesson
  text comes from `lib/course/lesson-notes.json`; after editing lessons run
  `node scripts/extract-lesson-notes.mjs`.
- Every certificate is verifiable at `/verify/<certificate id>`.
