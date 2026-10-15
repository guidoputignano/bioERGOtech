import type { Metadata } from "next";
import Link from "next/link";

/**
 * GitHub guide for the Agentic AI course: create an account, a public
 * repository, add the templates, the project and the demo, and share the
 * link. Linked from Lesson 4.4, the project box and Course Closing.
 *
 * A guide rather than a numbered lesson on purpose: a new lesson would need
 * a reflection, would change every student's lesson count, and would move
 * the progress figures the licei and universita programmes report on.
 */

export const metadata: Metadata = {
  title: "GitHub Guide | Agentic AI Course | bioERGOtech",
  description:
    "How to create a free GitHub account and a public repository for your Agentic AI course project, add your files and demo video, and share the link.",
  alternates: { canonical: "/courses/agentic-ai/github" },
};

const TEAL = "#00C4B4";
const TEAL_DARK = "#009688";
const TEAL_LIGHT = "#E6F9F7";
const NAVY = "#0D1B32";
const TEXT = "#1A2332";
const TEXT_MID = "#4A5568";
const TEXT_LIGHT = "#718096";
const BORDER = "#E2E8F0";
const CARD = "#FFFFFF";
const SHADOW = "0 2px 12px rgba(0,0,0,0.05)";

const TEMPLATES = "/assets/courses/agentic-ai-templates";
const p: React.CSSProperties = { fontSize: 15, color: TEXT_MID, lineHeight: 1.75, margin: "0 0 14px" };
const a: React.CSSProperties = { color: TEAL_DARK, fontWeight: 600 };

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "28px clamp(18px, 4vw, 36px)", marginBottom: 20, boxShadow: SHADOW }}>
      <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 19, fontWeight: 700, color: TEXT, margin: "0 0 14px", display: "flex", gap: 12, alignItems: "center" }}>
        <span aria-hidden style={{ width: 30, height: 30, borderRadius: "50%", background: TEAL, color: "#fff", fontSize: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    // listStyle explicit: the site's global CSS strips list markers.
    <ol style={{ listStyle: "decimal", margin: "0 0 14px", paddingLeft: 22, display: "grid", gap: 8, fontSize: 15, color: TEXT_MID, lineHeight: 1.65 }}>
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ol>
  );
}

function Note({ children, tone = "tip" }: { children: React.ReactNode; tone?: "tip" | "warning" }) {
  const c = tone === "tip" ? { bg: TEAL_LIGHT, border: TEAL, color: NAVY } : { bg: "#FFF8E6", border: "#F0A500", color: "#7D5A00" };
  return (
    <div style={{ background: c.bg, borderLeft: `4px solid ${c.border}`, borderRadius: "0 10px 10px 0", padding: "12px 16px", fontSize: 14, color: c.color, lineHeight: 1.65, margin: "6px 0 0" }}>
      {children}
    </div>
  );
}

export default function GitHubGuidePage() {
  return (
    <div style={{ background: "#F7F9FC", minHeight: "100vh" }}>
      <div style={{ background: NAVY, color: "#fff", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Link href="/courses/agentic-ai" style={{ color: TEAL, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>← Course Home</Link>
        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.2)" }} />
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>Guide · about 15 minutes</div>
      </div>

      <div style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a3a5c 100%)`, padding: "36px 24px 32px", color: "#fff", textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: TEAL, marginBottom: 10 }}>Project guide</div>
        <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: "clamp(22px, 4vw, 34px)", fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
          Set Up GitHub for Your Project
        </h1>
        <p style={{ maxWidth: 640, margin: "12px auto 0", fontSize: 15, color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>
          Your final project lives in a public GitHub repository in your own account. It stays yours after the course, and you can show it to universities and employers.
        </p>
      </div>

      <main style={{ maxWidth: 820, margin: "0 auto", padding: "32px 16px 80px" }}>
        <Section n={1} title="Create your free GitHub account">
          <Steps items={[
            <>Go to <a href="https://github.com/signup" target="_blank" rel="noopener noreferrer" style={a}>github.com/signup</a>.</>,
            <>Use an email address you will keep after school or work changes. You will need it to sign in.</>,
            <>Choose a username you are happy to show on a CV, for example your name. It appears in your project link.</>,
            <>Enter the code GitHub emails you to confirm the address.</>,
          ]} />
          <Note>
            GitHub accounts are free. GitHub requires you to be at least 13 years old. Turning on two-factor authentication (Settings, then Password and authentication) protects your work.
          </Note>
        </Section>

        <Section n={2} title="Create your project repository">
          <Steps items={[
            <>Signed in to GitHub, click <strong>+</strong> at the top right, then <strong>New repository</strong>.</>,
            <>Name it after your project, for example <code>flu-sentinel-agent</code>. Add a one-line description.</>,
            <>Choose <strong>Public</strong>. The course reads public repositories only, and a private one cannot be checked.</>,
            <>Turn on <strong>Add README</strong>. For <strong>.gitignore</strong>, choose <em>Python</em> for Track C or <em>Node</em> for Track B. Track A can leave it empty.</>,
            <>Click <strong>Create repository</strong>, then copy its address from the browser, for example <code>github.com/your-name/flu-sentinel-agent</code>.</>,
          ]} />
          <Note>
            Working in a team? One person creates the repository, then adds the others under Settings, then Collaborators, so everyone can upload their part. Every member adds the same link in the course.
          </Note>
        </Section>

        <Section n={3} title="Add the README and ethics review templates">
          <p style={p}>
            Two templates give you the structure the course asks for: the six README sections from Lesson 6.2 and the four-part ethics review from Lesson 8.2.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "0 0 16px" }}>
            <a href={`${TEMPLATES}/README-template.md`} download="README.md" style={{ ...a, border: `1.5px solid ${TEAL}`, borderRadius: 10, padding: "8px 14px", textDecoration: "none" }}>⬇ README template</a>
            <a href={`${TEMPLATES}/ethics-review-template.md`} download="ethics-review.md" style={{ ...a, border: `1.5px solid ${TEAL}`, borderRadius: 10, padding: "8px 14px", textDecoration: "none" }}>⬇ Ethics review template</a>
          </div>
          <Steps items={[
            <>In your repository, open <code>README.md</code>, click the pencil icon, replace everything with the README template, then click <strong>Commit changes</strong>.</>,
            <>Click <strong>Add file</strong>, then <strong>Create new file</strong>. Name it <code>ethics-review.md</code>, paste the ethics review template and commit.</>,
            <>Fill both in as you build. Text inside <code>&lt;!-- --&gt;</code> markers is guidance: it is hidden on GitHub and does not count towards the word minimums.</>,
          ]} />
        </Section>

        <Section n={4} title="Add your Student ID">
          <p style={p}>
            Your Student ID is shown in the project box in{" "}
            <Link href="/courses/agentic-ai/lesson/lesson-4-4" style={a}>Lesson 4.4</Link>{" "}
            when you are logged in, for example <code>BIO-2026-1A2B3C4D</code>. Write it in the Team section of your README, on a normal line, not inside the guidance markers.
          </p>
          <Note>
            Only someone who can edit the repository can add it, so it shows the project is yours. In a team, every member adds their own ID.
          </Note>
        </Section>

        <Section n={5} title="Upload your project files">
          <Steps items={[
            <>Click <strong>Add file</strong>, then <strong>Upload files</strong>, drag in your files or folders, and click <strong>Commit changes</strong>.</>,
            <><strong>Track A</strong>: export your Make or n8n workflow as a JSON file and upload it, with screenshots if they help explain it.</>,
            <><strong>Tracks B and C</strong>: upload your code, or push it from VS Code. The Course Closing lesson has a video for each method.</>,
          ]} />
          <Note tone="warning">
            Never upload your <code>.env</code> file or any API key. Anything in a public repository can be read by anyone. If a key was uploaded by mistake, delete it in your provider&apos;s dashboard and create a new one.
          </Note>
          <div style={{ margin: "20px 0 0" }}>
            <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 12, overflow: "hidden", border: `1px solid ${BORDER}`, boxShadow: SHADOW }}>
              <iframe
                // Privacy-enhanced mode, as in the lessons: no YouTube cookies until played.
                src="https://www.youtube-nocookie.com/embed/tlu5e0TxSzo"
                title="How to upload files and folders to GitHub"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
              />
            </div>
            <div style={{ fontSize: 12, color: TEXT_LIGHT, marginTop: 8, fontStyle: "italic", textAlign: "center" }}>
              Watch: uploading files and folders to GitHub (8 min)
            </div>
          </div>
        </Section>

        <Section n={6} title="Add your demo video">
          <p style={p}>Record 2 to 5 minutes showing your agent working with real input. Then either:</p>
          <Steps items={[
            <><strong>Link it</strong> (recommended): upload it to YouTube as <em>Unlisted</em>, or to Google Drive shared with &quot;Anyone with the link&quot;, Loom or Vimeo, and paste the link in the Demo section of your README.</>,
            <><strong>Or upload the file</strong> to the repository with Add file, then Upload files. GitHub&apos;s upload page accepts files up to 25 MB, so a longer recording works better as a link.</>,
          ]} />
        </Section>

        <Section n={7} title="Share your repository link">
          <Steps items={[
            <>Open <Link href="/courses/agentic-ai/lesson/lesson-4-4" style={a}>Lesson 4.4</Link> and paste your repository link into the project box.</>,
            <>Keep building in the same repository through the course.</>,
            <>In the <Link href="/courses/agentic-ai/lesson/course-closing" style={a}>Course Closing</Link> lesson, press <strong>Submit for certificate</strong>. The check tells you if anything is missing, and you can resubmit after fixing it.</>,
          ]} />
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: "14px 18px", background: "#FAFBFC" }}>
            <div style={{ fontWeight: 700, color: TEXT, marginBottom: 8, fontSize: 14 }}>What the check looks for</div>
            <ul style={{ listStyle: "disc", margin: 0, paddingLeft: 20, fontSize: 14, color: TEXT_MID, lineHeight: 1.7 }}>
              <li>A public repository with your project files (code, workflow export or configuration)</li>
              <li><code>README.md</code> with at least 400 words, and your Student ID in it</li>
              <li><code>ethics-review.md</code> with at least 150 words</li>
              <li>A demo video in the repository, or linked in the README</li>
            </ul>
          </div>
        </Section>

        <p style={{ ...p, textAlign: "center", fontSize: 14 }}>
          Following the course through a school or university programme? Your team hands in its project through the
          programme console at the end of Lesson 4.4 and Course Closing, as your teachers explain.
        </p>
        <p style={{ ...p, textAlign: "center", fontSize: 14 }}>
          Stuck? Ask in the question box at the end of any lesson. The bioERGOtech team will reply.
        </p>
      </main>
    </div>
  );
}
