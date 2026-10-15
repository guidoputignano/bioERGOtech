# Agentic AI course: project submission, certificates and the Course Monitor

How the course monitoring works, and what has to happen once to switch it on.

## What students see

1. **GitHub guide** (`/courses/agentic-ai/github`, linked from Lesson 4.4 and
   Course Closing). How to create a free GitHub account and a public
   repository, add the README and ethics review templates, their Student ID,
   their project files and demo video. The templates are downloads served by
   the site (`public/assets/courses/agentic-ai-templates/`), so no GitHub
   account of ours is involved.
2. **Lesson 4.4.** A project box shows the student's Student ID (with a copy
   button) and takes their repository link. Teams all add the same link.
3. **Course Closing.** "Submit for certificate" pins the repository's current
   commit and runs the checks. The student sees what is missing and can fix
   and resubmit until a certificate is issued.

Licei and universita students do not see the project box: they hand in
through their own console, which those two lessons already show them.

## What staff see

Member portal, Admin Panel, **Course Monitor** tab:

- **Students.** Everyone who has started, with lessons done, repository,
  check result and certificate status. Filter "Ready to certify", select,
  and issue in bulk. "Issue anyway…" certifies outside the rule and asks for
  a reason, which is stored with the certificate. A certificate whose email
  failed is marked "Not emailed": press Resend. "Revoke…" withdraws a
  certificate (it stops verifying) and lets a corrected one be issued.
  Forks are flagged so you can compare them with the original.
- **Questions.** Open questions oldest first. "Draft with Claude" writes a
  reply grounded in the lesson content; read it, edit it, send it. Drafts
  that start "FLAG FOR STAFF" mean the submission needs a human.
- **Lesson drop-off.** Students per lesson, to spot where people stop.
- **Email alerts.** With `COURSE_NOTIFY_EMAILS` set, the team gets an email
  as soon as a student submits a new or changed question or comment, with
  the text and a link to the Course Monitor. Edits to a reflection alone do
  not trigger one. Sent after the student's save, so a mail problem never
  blocks a submission.

## Certificate rule

Defined once in `lib/course/requirements.ts`:

- every core lesson reflection (all lessons except the track deep dives),
- at least one track lesson (4.1, 4.2 or 4.3),
- a submitted public repository whose required checks pass: project files
  beyond docs and video, README of 400+ words, the student's own Student ID
  in the README, a demo video (a video file in the repository, or a YouTube,
  Drive, Loom or Vimeo link in the README), and `ethics-review.md` of 150+
  words,
- then an admin approves.

Words inside `<!-- -->` comments do not count, so an untouched template never
passes. The Student ID is how a student shows the repository is theirs:
only someone who can edit it can add the ID. A copied or forked repository
still needs a reviewer's eye, which is why forks are flagged.

## Switching it on

### 1. Run the migration, then merge (in that order)

1. Run `supabase/migrations/20261220000000_course_projects_certificates.sql`
   in the Supabase SQL editor.
2. Merge the pull request and wait for the Vercel deploy to go live.
3. Between steps 1 and 2, do not issue certificates from the old Submissions
   tab: the copy below has already run and would miss them.

The migration copies certificates already issued (from `profiles.cert_id`)
into the new table, once, marked as from the old system. Students could
write that field, so those certificates show as "being confirmed" on
`/verify` until you check each against the certificate emails the old system
actually sent (Resend log), then press **Confirm** on the student's row in the
Course Monitor (filter "Certificate needs action"). Use **Revoke** for any
that do not match. Re-running the file is safe: the copy is recorded and
does not run again.

Two cases the copy cannot settle on its own:
- An old certificate stored with an email address instead of a name (the
  profile had no name) cannot be confirmed, because /verify would publish
  the address. Revoke it, ask the student to add their name, issue again.
- A certificate id claimed by two profiles is skipped (one is a copy). The
  query at the end of the migration lists them; issue the genuine holder a
  new certificate with "Issue anyway".

New certificates also need a name on the student's profile: the Course
Monitor says so instead of issuing one with an email address on it.

### 2. Set the environment variables in Vercel

| Variable | Value |
| --- | --- |
| `ANTHROPIC_API_KEY` | for "Draft with Claude" |
| `COURSE_NOTIFY_EMAILS` | who is emailed about new student questions and comments, comma separated (for example `info@bioergotech.org,mentors@bioergotech.org`). Empty turns it off. |
| `GITHUB_TOKEN` | optional, see below |
| `NEXT_PUBLIC_SITE_URL` | `https://www.bioergotech.org`, for links in the alert emails (falls back to that address if unset) |

`RESEND_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are already in use.

### About `GITHUB_TOKEN` (optional, recommended near deadlines)

The checks read public repositories without signing in to GitHub. GitHub
allows 60 such requests an hour per server address, shared by everyone; a
check uses two and adding a repository one. Each student may add a
repository or run a check at most 10 times an hour each. Outside busy
periods that is enough. When many students submit in the same hour, some
see "GitHub is busy, please try again in a few minutes"; nothing is lost and
their earlier result is kept.

To raise the limit to 5,000 an hour, create a token on any GitHub account
the team already has (no new account): GitHub, Settings, Developer settings,
Fine-grained tokens, Generate new token, Repository access "Public
repositories (read-only)", no other permissions. Put it in `GITHUB_TOKEN`.
Tokens expire (30 days unless you choose longer): set a reminder. An expired
token is logged and the site carries on with the anonymous limit.

## Notes

- Drafts use `claude-opus-5-5`. The whole course text is a cached prompt
  prefix, so each extra draft within an hour costs very little. The lesson
  text comes from `lib/course/lesson-notes.json`; after editing lessons run
  `node scripts/extract-lesson-notes.mjs`.
- Every certificate is verifiable at `/verify/<certificate id>`.
