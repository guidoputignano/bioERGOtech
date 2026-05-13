"use client";

import { useState } from "react";
import Link from "next/link";
import { Lesson, COURSE_LESSONS } from "../../../course-data";
import CourseSidebar from "../../../CourseSidebar";
import GateModal from "../../../GateModal";

// ─── Design tokens ────────────────────────────────────────────────────────────
const TEAL = "#00C4B4";
const TEAL_LIGHT = "#E6F9F7";
const NAVY = "#0D1B32";
const TEXT = "#1A2332";
const TEXT_MID = "#4A5568";
const TEXT_LIGHT = "#718096";
const BORDER = "#E2E8F0";
const CARD = "#FFFFFF";
const SHADOW = "0 2px 12px rgba(0,0,0,0.05)";

// ─── Lesson content registry ──────────────────────────────────────────────────
// Each lesson's content is a React component. Add new lessons here.

function Lesson_1_1() {
  return (
    <>
      <Section title="What You Will Learn">
        <p style={p}>
          This lesson covers three things. By the end you should be able to define AI
          accurately in plain language, distinguish traditional software from machine
          learning and generative AI, and — perhaps most importantly — calibrate your
          own expectations. Both over-hype and under-estimation are equally unhelpful
          when it comes to building real systems.
        </p>
      </Section>

      <Section title="Two Ways to Build Intelligence">
        <p style={p}>
          Every piece of software that makes decisions is built using one of two
          fundamentally different approaches. Understanding this distinction is the
          foundation of everything that follows in this course.
        </p>

        <SubHeading>Traditional Software: Rules Written by Hand</SubHeading>
        <p style={p}>
          In traditional software, a human developer writes every decision in advance.
          If the user clicks <strong>X</strong>, do <strong>Y</strong>. Always. The
          logic is completely explicit — you can read the code and understand exactly
          why the program behaves the way it does. A spam filter built this way works
          by checking emails against a handcrafted list of suspicious keywords and
          sender patterns.
        </p>
        <p style={p}>
          This approach is predictable and reliable. It is perfect for problems that
          are well-understood, stable, and where the rules can be written down. The
          limitation is rigidity: if a new type of spam appears that does not match
          any of the handcrafted rules, the filter fails.
        </p>

        <SubHeading>AI / Machine Learning: Rules Learned from Examples</SubHeading>
        <p style={p}>
          Machine learning takes a completely different approach. Instead of writing
          rules by hand, you show the system thousands or millions of labelled
          examples, and it extracts the patterns itself. A spam filter built this way
          has never been told what spam looks like. It was trained on ten million
          emails labelled as spam or not spam, and it learned the patterns from the
          data.
        </p>
        <p style={p}>
          The developer never writes &apos;if spam then...&apos; — they write the training
          process, choose the model architecture, and let the data do the teaching.
          This makes the system flexible and adaptive. It improves with more data and
          can handle situations the developer never anticipated.
        </p>
      </Section>

      <Section title="What Exactly Is a Model?">
        <p style={p}>
          The word &apos;model&apos; is used constantly in discussions about AI, and it is
          worth being precise about what it means. A model is not a program in the
          traditional sense. It is a very large set of mathematical patterns —
          specifically, numerical weights extracted from data during training.
        </p>
        <p style={p}>
          Think of it this way. You feed the system millions of examples during a
          process called training. The system adjusts its internal numerical parameters
          — billions of them — until it can reliably predict the correct output for
          each input. Once training is complete, those adjusted parameters are saved.
          That saved set of parameters is the model. You cannot read it like code.
          There are no if-statements inside. But it behaves as though it has learned
          the rules, because it has — from the data.
        </p>

        <KeyInsight>
          A model is not a program in the traditional sense. It is a very large set of
          mathematical patterns extracted from data. You cannot read it like code, but
          it behaves as though it has learned the rules.
        </KeyInsight>

        <p style={p}>
          The flow from raw data to useful output looks like this: millions of examples
          go in as data, the training process extracts patterns, those patterns are
          stored as the model, and the model then produces predictions or generated
          text as output.
        </p>
      </Section>

      <Section title="From Machine Learning to Generative AI">
        <p style={p}>
          Machine learning has been around for decades. So what changed recently to
          make agentic AI possible? The answer lies in a specific sequence of
          breakthroughs across seventy years of research.
        </p>

        <SubHeading>A Brief Timeline</SubHeading>
        <p style={p}>
          The story starts in the 1950s with the first neural network concepts — the
          perceptron. The 1980s brought multi-layer neural networks that could learn
          more complex patterns. Then, in 2012, a model called AlexNet won the
          ImageNet competition by a margin that shocked the field. This deep learning
          breakthrough demonstrated that neural networks trained on large datasets and
          powerful hardware could outperform every hand-engineered system. It changed
          everything.
        </p>
        <p style={p}>
          2017 brought a second revolution: the Transformer architecture, introduced
          in a paper titled &apos;Attention Is All You Need.&apos; The transformer solved a
          fundamental problem in processing sequences of data — it allowed models to
          consider the relationship between all parts of an input simultaneously rather
          than word by word. Every modern large language model — Claude, GPT, Gemini,
          Llama — is a transformer.
        </p>
        <p style={p}>
          From 2022 onwards, these transformer models scaled to billions of parameters
          and were exposed to vast portions of the public internet during training. The
          result was models that could generate coherent text, write code, reason
          across documents, and respond to complex instructions — capabilities that
          simply were not possible before.
        </p>

        <KeyInsight>
          The transformer (2017) powers every modern LLM. This jump is why agentic AI
          is possible now — and was not five years ago. The tools you will use in this
          course exist because of that 2017 paper.
        </KeyInsight>
      </Section>

      <Section title="From Classifying to Creating">
        <p style={p}>
          Traditional machine learning is primarily about classification and prediction
          — it takes an input and assigns it to a category or predicts a value. Is
          this email spam or not? Which film should I recommend? Is this tumour benign
          or malignant? These are all classification problems. The output is always
          chosen from a fixed set of possibilities the model was trained on.
        </p>
        <p style={p}>
          Generative AI does something fundamentally different. It creates new content
          — text, images, code, audio — that did not exist before. The output is not
          selected from a predefined list; it is generated token by token based on the
          patterns the model learned during training. This is why you can ask a
          generative model to write a discharge summary for a specific patient,
          translate a research paper into plain English, or generate code from a
          description, and get a unique, contextually appropriate response every time.
        </p>
      </Section>

      <Section title="The Honest Picture: What LLMs Are Good and Bad At">
        <p style={p}>
          One of the most important things you can do before building with AI is
          develop an accurate sense of where these models excel and where they reliably
          fail. Neither over-confidence nor fear is useful. What you need is
          calibration.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: TEAL, marginBottom: 10 }}>
              ✅ What LLMs Are Very Good At
            </div>
            {[
              "Summarising long documents quickly and accurately",
              "Drafting and editing written content across different tones and styles",
              "Explaining complex ideas in plain language",
              "Translating between languages with strong contextual understanding",
              "Writing, reviewing, and debugging code",
              "Answering questions from documents — finding and synthesising information",
            ].map((item) => (
              <div key={item} style={{ display: "flex", gap: 8, fontSize: 14, color: TEXT_MID, padding: "4px 0" }}>
                <span style={{ color: TEAL, flexShrink: 0 }}>✓</span>
                {item}
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#E74C3C", marginBottom: 10 }}>
              ⚠ What LLMs Struggle With
            </div>
            {[
              "Remembering previous conversations — each session starts from zero unless memory is explicitly provided",
              "Real-time information — they have a knowledge cutoff and cannot access recent events without tools",
              "Verified facts — they can confidently state incorrect information (hallucination)",
              "Consistent precise arithmetic — they are probabilistic text predictors, not calculators",
              "Self-awareness or genuine reasoning — they process patterns, not logic",
              "Acting without tools — a model on its own cannot send emails, call APIs, or take actions in the world",
            ].map((item) => (
              <div key={item} style={{ display: "flex", gap: 8, fontSize: 14, color: TEXT_MID, padding: "4px 0" }}>
                <span style={{ color: "#E74C3C", flexShrink: 0 }}>✗</span>
                {item}
              </div>
            ))}
          </div>
        </div>

        <KeyInsight>
          Treat an LLM like a very fast, very well-read assistant who is occasionally
          overconfident. Verify important claims. Use it to speed up tasks you already
          understand.
        </KeyInsight>
      </Section>

      <ReflectionPrompt>
        Think of a piece of software you use every day — an app, a website, a game.
        Based on what you learned in this lesson, is it traditional software, machine
        learning, or generative AI? How can you tell? And what would need to be
        different for it to be generative? Write 3–5 sentences. There is no right
        answer — connect it to your own experience.
      </ReflectionPrompt>
    </>
  );
}

// ─── Content sub-components ───────────────────────────────────────────────────

const p: React.CSSProperties = {
  fontSize: 15,
  color: TEXT_MID,
  lineHeight: 1.75,
  marginBottom: 14,
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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
        {title}
      </h2>
      {children}
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontFamily: "'Sora', sans-serif",
        fontSize: 16,
        fontWeight: 700,
        color: TEXT,
        margin: "20px 0 10px",
      }}
    >
      {children}
    </h3>
  );
}

function KeyInsight({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: TEAL_LIGHT,
        border: `1px solid ${TEAL}`,
        borderLeft: `4px solid ${TEAL}`,
        borderRadius: "0 10px 10px 0",
        padding: "14px 18px",
        margin: "20px 0",
        fontSize: 14,
        color: NAVY,
        lineHeight: 1.65,
        fontWeight: 500,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: TEAL,
          marginBottom: 6,
        }}
      >
        Key Insight
      </div>
      {children}
    </div>
  );
}

function ReflectionPrompt({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#FFF8E6",
        border: "1px solid #F0A500",
        borderLeft: "4px solid #F0A500",
        borderRadius: "0 10px 10px 0",
        padding: "18px 20px",
        marginBottom: 24,
        fontSize: 14,
        color: "#7D5A00",
        lineHeight: 1.7,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#F0A500",
          marginBottom: 8,
        }}
      >
        ✏️ Student Reflection
      </div>
      {children}
    </div>
  );
}

// ─── Lesson content map ───────────────────────────────────────────────────────

const LESSON_CONTENT: Record<string, React.FC> = {
  "lesson-1-1": Lesson_1_1,
  // Add future lessons here: "lesson-1-2": Lesson_1_2, etc.
};

// ─── Main client component ────────────────────────────────────────────────────

interface Props {
  lesson: Lesson;
  isAuthenticated: boolean;
  gateOpen?: boolean;
}

export default function LessonPageClient({
  lesson,
  isAuthenticated,
  gateOpen = false,
}: Props) {
  const [showModal, setShowModal] = useState(gateOpen && !isAuthenticated);

  const lessonIndex = COURSE_LESSONS.findIndex((l) => l.slug === lesson.slug);
  const prevLesson = lessonIndex > 0 ? COURSE_LESSONS[lessonIndex - 1] : null;
  const nextLesson =
    lessonIndex < COURSE_LESSONS.length - 1
      ? COURSE_LESSONS[lessonIndex + 1]
      : null;

  const lessonHref = (l: Lesson) =>
    l.slug === "introduction"
      ? "/courses/agentic-ai"
      : `/courses/agentic-ai/lesson/${l.slug}`;

  const ContentComponent = LESSON_CONTENT[lesson.slug];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Inter', system-ui, sans-serif; background: #F7F9FC; }
      `}</style>

      {/* Lesson header bar */}
      <div
        style={{
          background: NAVY,
          color: "#fff",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/courses/agentic-ai"
          style={{
            color: TEAL,
            textDecoration: "none",
            fontSize: 13,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ← Course Home
        </Link>
        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.2)" }} />
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
          Phase {lesson.phase} · Week {lesson.week}
        </div>
        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.2)" }} />
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
          ⏱ {lesson.duration}
        </div>
        <div style={{ marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
          Lesson {lesson.number}
        </div>
      </div>

      {/* Lesson title */}
      <div
        style={{
          background: `linear-gradient(135deg, ${NAVY} 0%, #1a3a5c 100%)`,
          padding: "40px 24px 36px",
          color: "#fff",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: TEAL,
            marginBottom: 10,
          }}
        >
          Lesson {lesson.number}
        </div>
        <h1
          style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: "clamp(22px, 4vw, 36px)",
            fontWeight: 800,
            color: "#fff",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {lesson.title}
        </h1>
      </div>

      {/* Body */}
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "40px 24px 80px",
          display: "flex",
          gap: 40,
          alignItems: "flex-start",
        }}
      >
        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {ContentComponent ? (
            <ContentComponent />
          ) : (
            <div
              style={{
                background: CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 14,
                padding: 48,
                textAlign: "center",
                boxShadow: SHADOW,
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
              <h2
                style={{
                  fontFamily: "'Sora', sans-serif",
                  fontSize: 20,
                  fontWeight: 700,
                  color: TEXT,
                  marginBottom: 8,
                }}
              >
                Lesson Coming Soon
              </h2>
              <p style={{ fontSize: 15, color: TEXT_LIGHT }}>
                This lesson is being prepared. Check back soon.
              </p>
            </div>
          )}

          {/* Prev / Next navigation */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              marginTop: 8,
            }}
          >
            {prevLesson ? (
              <Link
                href={lessonHref(prevLesson)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  padding: "14px 20px",
                  background: CARD,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 10,
                  textDecoration: "none",
                  boxShadow: SHADOW,
                  flex: 1,
                }}
              >
                <span style={{ fontSize: 11, color: TEXT_LIGHT }}>← Previous</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>
                  {prevLesson.number} — {prevLesson.title}
                </span>
              </Link>
            ) : (
              <div />
            )}

            {nextLesson ? (
              nextLesson.free || isAuthenticated ? (
                <Link
                  href={lessonHref(nextLesson)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    padding: "14px 20px",
                    background: TEAL,
                    border: `1px solid ${TEAL}`,
                    borderRadius: 10,
                    textDecoration: "none",
                    boxShadow: SHADOW,
                    flex: 1,
                    textAlign: "right",
                  }}
                >
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Next →</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>
                    {nextLesson.number} — {nextLesson.title}
                  </span>
                </Link>
              ) : (
                <button
                  onClick={() => setShowModal(true)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    padding: "14px 20px",
                    background: TEAL,
                    border: `1px solid ${TEAL}`,
                    borderRadius: 10,
                    cursor: "pointer",
                    flex: 1,
                    textAlign: "right",
                  }}
                >
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Next →</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>
                    {nextLesson.number} — {nextLesson.title}
                  </span>
                </button>
              )
            ) : null}
          </div>
        </div>

        {/* Sidebar */}
        <CourseSidebar
          isAuthenticated={isAuthenticated}
          onLockedClick={() => setShowModal(true)}
        />
      </div>

      {showModal && <GateModal onClose={() => setShowModal(false)} />}
    </>
  );
}
