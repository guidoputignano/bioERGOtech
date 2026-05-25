"use client";

import { useState } from "react";
import Link from "next/link";
import CourseSidebar from "../CourseSidebar";
import GateModal from "../GateModal";

// ─── Design tokens (matching portal) ─────────────────────────────────────────
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function Block({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: 36,
        marginBottom: 24,
        boxShadow: SHADOW,
      }}
    >
      {children}
    </div>
  );
}

function BlockTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: "'Sora', sans-serif",
        fontSize: 20,
        fontWeight: 700,
        color: TEXT,
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: `2px solid ${TEAL_LIGHT}`,
      }}
    >
      {children}
    </h2>
  );
}

function DefBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        borderLeft: `3px solid ${TEAL}`,
        padding: "12px 16px",
        background: "rgba(255,255,255,0.2)",
        borderRadius: "0 8px 8px 0",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          fontFamily: "'Sora', sans-serif",
          fontSize: 14,
          fontWeight: 700,
          color: NAVY,
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 1.65 }}>
        {children}
      </div>
    </div>
  );
}

function Callout({
  variant,
  label,
  children,
}: {
  variant: "info" | "tip" | "success";
  label: string;
  children: React.ReactNode;
}) {
  const styles = {
    info: { bg: "#EBF8FF", border: "#BEE3F8", color: "#2B6CB0" },
    tip: { bg: "#F0FFF4", border: "#9AE6B4", color: "#276749" },
    success: { bg: "#F0FFF4", border: "#9AE6B4", color: "#276749" },
  }[variant];

  return (
    <div
      style={{
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        borderRadius: 10,
        padding: "16px 20px",
        margin: "20px 0",
        fontSize: 14,
        color: styles.color,
        lineHeight: 1.65,
      }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function PhasePill({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-block",
        background: TEAL,
        color: "#fff",
        fontSize: 11,
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: 4,
        whiteSpace: "nowrap" as const,
      }}
    >
      {children}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CourseIntroClient({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Inter', system-ui, sans-serif; background: #F7F9FC; }
        a { transition: opacity 0.15s; }
        a:hover { opacity: 0.85; }
        details summary { cursor: pointer; list-style: none; }
        details summary::-webkit-details-marker { display: none; }
      `}</style>

            {/* ── Hero ── */}
      <div style={{ background: '#00C896', padding: '80px 24px 0', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Dot pattern overlay */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.09) 1px, transparent 1px)', backgroundSize: '24px 24px', pointerEvents: 'none' }} />
        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 16px', borderRadius: 20, marginBottom: 28, position: 'relative', zIndex: 1 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
          Free Program · Open Enrollment
        </div>
        {/* H1 */}
        <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 'clamp(30px, 5vw, 52px)', fontWeight: 800, lineHeight: 1.12, margin: '0 auto 20px', maxWidth: 720, color: '#fff', position: 'relative', zIndex: 1 }}>
          Agentic AI{" "}
          <span style={{ color: '#0A1628' }}>High School</span>
          <br />Innovation Program
        </h1>
        {/* Subtitle */}
        <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.82)', maxWidth: 520, margin: '0 auto 56px', lineHeight: 1.7, position: 'relative', zIndex: 1 }}>
          Go from understanding what AI agents are to building and demonstrating a working prototype — no prior coding experience required.
        </p>
        {/* Stats card */}
        <div style={{ display: 'inline-flex', background: '#fff', borderRadius: '20px 20px 0 0', padding: '28px 0', boxShadow: '0 -8px 40px rgba(0,0,0,0.12)', position: 'relative', zIndex: 2 }}>
          {[
            { num: '10',   label: 'Weeks' },
            { num: '21+',  label: 'Lessons' },
            { num: '3',    label: 'Technical Tracks' },
            { num: '100%', label: 'Free Forever' },
          ].map(({ num, label }, i) => (
            <div key={label} style={{ textAlign: 'center', padding: '0 44px', borderLeft: i > 0 ? '1px solid #E2E8F0' : 'none' }}>
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 34, fontWeight: 800, color: '#0A1628', lineHeight: 1 }}>{num}</div>
              <div style={{ fontSize: 11, color: '#718096', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700, marginTop: 6 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
      {/* ── Body ── */}
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "56px 24px 80px",
          display: "flex",
          gap: 40,
          alignItems: "flex-start",
        }}
      >
        {/* Left content */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Introduction */}
          <Block>
            <BlockTitle>Introduction</BlockTitle>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", lineHeight: 1.7, marginBottom: 14 }}>
              This course will teach you about agentic AI — autonomous systems that perceive
              information, plan actions, use tools, remember context, and verify their own
              results — using real tools and frameworks including Make, n8n, OpenClaw, Hermes
              Agent, and Agno.
            </p>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", lineHeight: 1.7, marginBottom: 14 }}>
              The program is built around a single conviction: the most powerful thing a high
              school student can do in the current moment is learn to build AI agents that
              solve genuine problems in domains they care about. You do not need a university
              degree or years of programming experience. You need curiosity, a real problem
              worth solving, and the ability to think carefully about what you are building
              and why.
            </p>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", lineHeight: 1.7 }}>
              This course is completely free, without ads, and open to any student accepted
              into the program.
            </p>
          </Block>

          {/* Understanding Agentic AI */}
          <Block>
            <BlockTitle>Understanding Agentic AI</BlockTitle>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", lineHeight: 1.7, marginBottom: 16 }}>
              While this course introduces the foundations of artificial intelligence and large
              language models, its core focus is agentic AI — a specific and rapidly growing
              area that has transformed what is possible with software.
            </p>
            <h3
              style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: 15,
                fontWeight: 700,
                color: TEXT,
                margin: "0 0 12px",
              }}
            >
              What Is the Difference?
            </h3>
            <DefBlock title="AI and Machine Learning">
              The broader fields focused on enabling computers to learn from data, recognise
              patterns, and make predictions. Traditional ML encompasses techniques like
              classification, regression, and recommendation.
            </DefBlock>
            <DefBlock title="Large Language Models (LLMs)">
              AI models trained on vast amounts of text that can understand and generate human
              language across a wide range of tasks. Models like Claude, GPT-4o, Llama, and
              Gemini are examples.
            </DefBlock>
            <DefBlock title="Agentic AI">
              Systems built on top of LLMs that can perceive inputs, plan multi-step actions,
              use external tools (APIs, databases, browsers), maintain memory across a session,
              and verify their own outputs before completing a task. An agent does not just
              answer a question — it takes action.
            </DefBlock>
          </Block>

          {/* Course Phases */}
          <Block>
            <BlockTitle>What to Expect</BlockTitle>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", lineHeight: 1.7, marginBottom: 20 }}>
              The program is divided into four phases across ten weeks:
            </p>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 14,
                }}
              >
                <thead>
                  <tr>
                    {["Phase", "Weeks", "Focus", "What You Cover"].map((h) => (
                      <th
                        key={h}
                        style={{
                          background: NAVY,
                          color: "#fff",
                          padding: "10px 14px",
                          textAlign: "left",
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: "0.07em",
                          textTransform: "uppercase",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      phase: "Phase 1",
                      weeks: "1–2",
                      focus: "Foundation",
                      desc: "What AI agents are, how LLMs work, real agent demos, AI ethics, the business of AI, and a guest speaker from a real agent builder.",
                    },
                    {
                      phase: "Phase 2",
                      weeks: "3–4",
                      focus: "Exploration",
                      desc: "The Example Gallery — 12 worked agent examples. Technical track selection, first hands-on tool sessions, and Project Idea Brief submission.",
                    },
                    {
                      phase: "Phase 3",
                      weeks: "5–8",
                      focus: "Build",
                      desc: "Architecture design, environment setup, building your prototype, documentation, ethics review, mentor mid-build feedback, iteration and testing.",
                    },
                    {
                      phase: "Phase 4",
                      weeks: "9–10",
                      focus: "Showcase",
                      desc: "Final submission, launch pathways, and your program certificate.",
                    },
                  ].map((row, i) => (
                    <tr key={row.phase}>
                      <td
                        style={{
                          padding: "12px 14px",
                          borderBottom: `1px solid ${BORDER}`,
                          background: i % 2 === 1 ? "#FAFBFC" : "transparent",
                          verticalAlign: "top",
                        }}
                      >
                        <PhasePill>{row.phase}</PhasePill>
                      </td>
                      <td
                        style={{
                          padding: "12px 14px",
                          borderBottom: `1px solid ${BORDER}`,
                          color: "rgba(255,255,255,0.85)",
                          background: i % 2 === 1 ? "#FAFBFC" : "transparent",
                          verticalAlign: "top",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.weeks}
                      </td>
                      <td
                        style={{
                          padding: "12px 14px",
                          borderBottom: `1px solid ${BORDER}`,
                          color: TEXT,
                          fontWeight: 600,
                          background: i % 2 === 1 ? "#FAFBFC" : "transparent",
                          verticalAlign: "top",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.focus}
                      </td>
                      <td
                        style={{
                          padding: "12px 14px",
                          borderBottom: `1px solid ${BORDER}`,
                          color: "rgba(255,255,255,0.85)",
                          background: i % 2 === 1 ? "#FAFBFC" : "transparent",
                          verticalAlign: "top",
                        }}
                      >
                        {row.desc}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Block>

          {/* Technical Tracks */}
          <Block>
            <BlockTitle>Three Technical Tracks</BlockTitle>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", lineHeight: 1.7, marginBottom: 20 }}>
              All tracks cover the same conceptual content in Phases 1 and 2. Track-specific
              content begins in Week 4. Choose the track that matches your current skill level.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 14,
              }}
            >
              {[
                { tag: "Track A", name: "No-Code", tools: "Make · n8n", desc: "Students with no coding background", color: TEAL },
                { tag: "Track B", name: "Low-Code", tools: "OpenClaw · Hermes · VSCode", desc: "Students comfortable with basic setup and configuration", color: "#4A7DFF" },
                { tag: "Track C", name: "Full-Code", tools: "Agno · Python · VSCode", desc: "Students confident with Python or eager to learn it", color: "#9B59B6" },
              ].map((t) => (
                <div
                  key={t.tag}
                  style={{
                    border: `2px solid ${BORDER}`,
                    borderRadius: 10,
                    padding: 18,
                    transition: "border-color 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLDivElement).style.borderColor = t.color)
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLDivElement).style.borderColor = BORDER)
                  }
                >
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: t.color, marginBottom: 6 }}>
                    {t.tag}
                  </div>
                  <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 6 }}>
                    {t.name}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.color, marginBottom: 6 }}>
                    {t.tools}
                  </div>
                  <div style={{ fontSize: 13, color: TEXT_LIGHT }}>
                    {t.desc}
                  </div>
                </div>
              ))}
            </div>
          </Block>

          {/* Who Is This For */}
          <Block>
            <BlockTitle>Who Is This Course For?</BlockTitle>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", lineHeight: 1.7, marginBottom: 20 }}>
              This course is built around the belief that domain knowledge — understanding
              healthcare, research, education, or any other real-world field — is at least as
              valuable as technical skill when it comes to building agents that matter.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 20,
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEAL_DARK, marginBottom: 10 }}>
                  ✅ Good Fit If You:
                </div>
                {[
                  "Are curious about AI and want to understand it accurately — not just follow the hype",
                  "Have a problem that might benefit from automation or intelligent assistance",
                  "Can commit 4–6 hours per week across 10 weeks",
                ].map((item) => (
                  <div key={item} style={{ display: "flex", gap: 8, fontSize: 14, color: "rgba(255,255,255,0.85)", padding: "5px 0" }}>
                    <span style={{ color: TEAL, fontWeight: 700, flexShrink: 0 }}>✓</span>
                    {item}
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#E67E22", marginBottom: 10 }}>
                  ⚠ Challenging If You:
                </div>
                {[
                  "Want a passive learning experience — every lesson has a deliverable",
                  "Want AI theory without building anything — this is project-first",
                  "Are not yet comfortable using a computer for sustained work",
                ].map((item) => (
                  <div key={item} style={{ display: "flex", gap: 8, fontSize: 14, color: "rgba(255,255,255,0.85)", padding: "5px 0" }}>
                    <span style={{ color: "#E67E22", fontWeight: 700, flexShrink: 0 }}>⚠</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </Block>

          {/* What You Will Build */}
          <Block>
            <BlockTitle>What You Will Build</BlockTitle>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", lineHeight: 1.7, marginBottom: 20 }}>
              Every student produces four deliverables that constitute a genuine portfolio item.
            </p>
            {[
              {
                num: "01",
                title: "Working Agent Prototype",
                desc: "Designed, built, and tested using your chosen track. Solves a real problem for a named group of users. Partial or scoped-down prototypes are accepted — what matters is that it runs.",
              },
              {
                num: "02",
                title: "Demo Recording",
                desc: "A 2–5 minute screen recording showing the agent working, with narration explaining what it does and honestly describing its limitations.",
              },
              {
                num: "03",
                title: "Project README",
                desc: "Documentation covering the problem, how the agent works, what data it uses, known limitations, and edge case test results. Minimum 400 words.",
              },
              {
                num: "04",
                title: "Ethics Review",
                desc: "Four dimensions — privacy, bias, transparency, accountability — each with a named concern and a specific design decision you made to address it.",
              },
            ].map((d) => (
              <div
                key={d.num}
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "flex-start",
                  padding: "14px 0",
                  borderBottom: `1px solid ${BORDER}`,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: TEAL,
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontFamily: "'Sora', sans-serif",
                  }}
                >
                  {d.num}
                </div>
                <div>
                  <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 4 }}>
                    {d.title}
                  </div>
                  <div style={{ fontSize: 13, color: TEXT_LIGHT, lineHeight: 1.55 }}>
                    {d.desc}
                  </div>
                </div>
              </div>
            ))}

            <Callout variant="success" label="🚀 Launch Pathways">
              Completing the program opens access to: incubator referral, IP briefing,
              open-source release on GitHub, publication support, and letters of
              recommendation. The best projects are selected for the Launch Pathway during
              the course closing session.
            </Callout>
          </Block>

          {/* FAQ */}
          <Block>
            <BlockTitle>Frequently Asked Questions</BlockTitle>
            {[
              {
                q: "Does completing this course lead to a certificate?",
                a: "Yes. Students who complete all four submission requirements receive a digital certificate from the bioERGOtech Foundation with a unique verification link that can be shared on LinkedIn or included in university applications.",
              },
              {
                q: "Do I need to know how to code?",
                a: "No. Track A (Make and n8n) requires no coding at all. Track B requires basic comfort with installing software. Track C is for students who already know Python or are willing to learn during the program.",
              },
              {
                q: "Can I work alone, or do I need a team?",
                a: "Solo projects are permitted with mentor approval. Teams benefit from shared domain knowledge and distributed skills. Most students find 2–3 people optimal.",
              },
              {
                q: "What happens if I fall behind?",
                a: "The program has two formal mentor touchpoints — Week 7 and before final submission. Reach out early if you are struggling. The most common issue is over-ambitious scope — your mentor can help you cut to something achievable without losing the core value.",
              },
              {
                q: "Are my project and code my own intellectual property?",
                a: "Yes. Everything you build is yours. The bioERGOtech Foundation does not claim ownership over student projects. The Launch Pathway includes an IP briefing session explaining your options.",
              },
              {
                q: "Where can I ask questions?",
                a: "Each lesson page on the bioERGOtech portal has a questions section. For general program questions, use the cohort discussion channel. For project-specific questions, post in the track-specific channel so peers using the same tools can also contribute.",
              },
            ].map(({ q, a }) => (
              <details
                key={q}
                style={{
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  marginBottom: 8,
                  overflow: "hidden",
                }}
              >
                <summary
                  style={{
                    padding: "14px 18px",
                    fontSize: 14,
                    fontWeight: 600,
                    color: TEXT,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  {q}
                  <span style={{ color: TEAL, fontWeight: 700, fontSize: 18, marginLeft: 12 }}>+</span>
                </summary>
                <div
                  style={{
                    padding: "14px 18px",
                    fontSize: 14,
                    color: "rgba(255,255,255,0.85)",
                    borderTop: `1px solid ${BORDER}`,
                    lineHeight: 1.65,
                  }}
                >
                  {a}
                </div>
              </details>
            ))}
          </Block>

          <Callout variant="info" label="💡 After This Course">
            We recommend the{" "}
            <a
              href="https://huggingface.co/learn"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#2B6CB0", fontWeight: 600 }}
            >
              Hugging Face LLM Course
            </a>{" "}
            (free) for deeper technical grounding in transformers and fine-tuning, and the{" "}
            <a
              href="https://docs.agno.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#2B6CB0", fontWeight: 600 }}
            >
              Agno documentation
            </a>{" "}
            for Track C students who want to continue building.
          </Callout>

          {/* Next lesson CTA */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 8,
            }}
          >
            <button
              onClick={() => isAuthenticated ? window.location.href = "/courses/agentic-ai/lesson/lesson-1-1" : setShowModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: TEAL,
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "13px 24px",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'Sora', sans-serif",
              }}
            >
              Next: Lesson 1.1 — What Is AI? →
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <CourseSidebar
          isAuthenticated={isAuthenticated}
          onLockedClick={() => setShowModal(true)}
        />
      </div>

      {/* Gate modal */}
      {showModal && <GateModal onClose={() => setShowModal(false)} />}
    </>
  );
}
