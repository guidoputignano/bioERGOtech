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

// ─── Shared content sub-components ───────────────────────────────────────────

const p: React.CSSProperties = {
  fontSize: 15,
  color: TEXT_MID,
  lineHeight: 1.75,
  marginBottom: 14,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 36, marginBottom: 24, boxShadow: SHADOW }}>
      <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700, color: TEXT, marginBottom: 16, paddingBottom: 12, borderBottom: `2px solid ${TEAL_LIGHT}` }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700, color: TEXT, margin: "20px 0 10px" }}>
      {children}
    </h3>
  );
}

function KeyInsight({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: TEAL_LIGHT, border: `1px solid ${TEAL}`, borderLeft: `4px solid ${TEAL}`, borderRadius: "0 10px 10px 0", padding: "14px 18px", margin: "20px 0", fontSize: 14, color: NAVY, lineHeight: 1.65, fontWeight: 500 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: TEAL, marginBottom: 6 }}>
        Key Insight
      </div>
      {children}
    </div>
  );
}

function CalloutBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#F7F9FC", border: `1px solid ${BORDER}`, borderLeft: `4px solid ${NAVY}`, borderRadius: "0 10px 10px 0", padding: "14px 18px", margin: "20px 0", fontSize: 14, color: TEXT_MID, lineHeight: 1.65 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: NAVY, marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function ReflectionPrompt({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#FFF8E6", border: "1px solid #F0A500", borderLeft: "4px solid #F0A500", borderRadius: "0 10px 10px 0", padding: "18px 20px", marginBottom: 24, fontSize: 14, color: "#7D5A00", lineHeight: 1.7 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#F0A500", marginBottom: 8 }}>
        ✏️ Student Reflection
      </div>
      {children}
    </div>
  );
}

function ComparisonTable({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div style={{ overflowX: "auto", marginTop: 8 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} style={{ background: NAVY, color: "#fff", padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: "11px 14px", borderBottom: `1px solid ${BORDER}`, color: TEXT_MID, background: i % 2 === 1 ? "#FAFBFC" : "transparent", verticalAlign: "top" }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Lesson 1.1 ───────────────────────────────────────────────────────────────

function Lesson_1_1() {
  return (
    <>
      <Section title="What You Will Learn">
        <p style={p}>
          This lesson covers three things. By the end you should be able to define AI accurately in plain language, distinguish traditional software from machine learning and generative AI, and calibrate your own expectations. Both over-hype and under-estimation are equally unhelpful when it comes to building real systems.
        </p>
      </Section>

      <Section title="Two Ways to Build Intelligence">
        <p style={p}>Every piece of software that makes decisions is built using one of two fundamentally different approaches.</p>
        <SubHeading>Traditional Software: Rules Written by Hand</SubHeading>
        <p style={p}>In traditional software, a human developer writes every decision in advance. If the user clicks <strong>X</strong>, do <strong>Y</strong>. Always. The logic is completely explicit — you can read the code and understand exactly why the program behaves the way it does. A spam filter built this way works by checking emails against a handcrafted list of suspicious keywords and sender patterns.</p>
        <p style={p}>This approach is predictable and reliable. The limitation is rigidity: if a new type of spam appears that does not match any of the handcrafted rules, the filter fails.</p>
        <SubHeading>AI / Machine Learning: Rules Learned from Examples</SubHeading>
        <p style={p}>Machine learning takes a completely different approach. Instead of writing rules by hand, you show the system thousands or millions of labelled examples, and it extracts the patterns itself. A spam filter built this way has never been told what spam looks like — it was trained on millions of emails labelled as spam or not spam, and it learned the patterns from the data.</p>
        <p style={p}>This makes the system flexible and adaptive. It improves with more data and can handle situations the developer never anticipated.</p>
      </Section>

      <Section title="What Exactly Is a Model?">
        <p style={p}>A model is not a program in the traditional sense. It is a very large set of mathematical patterns — specifically, numerical weights extracted from data during training.</p>
        <p style={p}>You feed the system millions of examples during training. The system adjusts its internal numerical parameters — billions of them — until it can reliably predict the correct output for each input. Once training is complete, those adjusted parameters are saved. That saved set of parameters is the model.</p>
        <KeyInsight>
          A model is not a program in the traditional sense. It is a very large set of mathematical patterns extracted from data. You cannot read it like code, but it behaves as though it has learned the rules.
        </KeyInsight>
      </Section>

      <Section title="From Machine Learning to Generative AI">
        <p style={p}>Machine learning has been around for decades. The answer to what changed recently lies in a specific sequence of breakthroughs across seventy years of research.</p>
        <SubHeading>A Brief Timeline</SubHeading>
        <p style={p}>The story starts in the 1950s with the first neural network concepts. The 1980s brought multi-layer neural networks. In 2012, AlexNet demonstrated that deep learning could outperform every hand-engineered system. In 2017, the Transformer architecture was introduced in a paper titled &apos;Attention Is All You Need&apos; — every modern LLM is a transformer. From 2022 onwards, these models scaled to billions of parameters and were exposed to vast portions of the public internet during training.</p>
        <KeyInsight>
          The transformer (2017) powers every modern LLM. This jump is why agentic AI is possible now — and was not five years ago.
        </KeyInsight>
      </Section>

      <Section title="From Classifying to Creating">
        <p style={p}>Traditional machine learning is primarily about classification and prediction — is this email spam or not? Generative AI does something fundamentally different. It creates new content — text, images, code — that did not exist before. The output is not selected from a predefined list; it is generated token by token based on patterns learned during training.</p>
      </Section>

      <Section title="The Honest Picture: What LLMs Are Good and Bad At">
        <p style={p}>One of the most important things you can do before building with AI is develop an accurate sense of where these models excel and where they reliably fail.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: TEAL, marginBottom: 10 }}>✅ What LLMs Are Very Good At</div>
            {["Summarising long documents quickly and accurately", "Drafting and editing written content", "Explaining complex ideas in plain language", "Translating between languages", "Writing, reviewing, and debugging code", "Answering questions from documents"].map((item) => (
              <div key={item} style={{ display: "flex", gap: 8, fontSize: 14, color: TEXT_MID, padding: "4px 0" }}>
                <span style={{ color: TEAL, flexShrink: 0 }}>✓</span>{item}
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#E74C3C", marginBottom: 10 }}>⚠ What LLMs Struggle With</div>
            {["Remembering previous conversations without explicit memory", "Real-time information — they have a knowledge cutoff", "Verified facts — they can confidently state incorrect information", "Consistent precise arithmetic", "Self-awareness or genuine reasoning", "Acting without tools — a model alone cannot take actions in the world"].map((item) => (
              <div key={item} style={{ display: "flex", gap: 8, fontSize: 14, color: TEXT_MID, padding: "4px 0" }}>
                <span style={{ color: "#E74C3C", flexShrink: 0 }}>✗</span>{item}
              </div>
            ))}
          </div>
        </div>
        <KeyInsight>
          Treat an LLM like a very fast, very well-read assistant who is occasionally overconfident. Verify important claims. Use it to speed up tasks you already understand.
        </KeyInsight>
      </Section>

      <ReflectionPrompt>
        Think of a piece of software you use every day — an app, a website, a game. Based on what you learned in this lesson, is it traditional software, machine learning, or generative AI? How can you tell? And what would need to be different for it to be generative? Write 3–5 sentences. Connect it to your own experience.
      </ReflectionPrompt>
    </>
  );
}

// ─── Lesson 1.2a ──────────────────────────────────────────────────────────────

function Lesson_1_2a() {
  return (
    <>
      <Section title="What You Will Learn">
        <p style={p}>This lesson has three goals. First, you will be able to explain clearly why an AI agent is fundamentally different from a chatbot. Second, you will know the names and definitions of the five components that every agent is built from. Third, you will apply that framework to a real-world scenario and see how it maps onto something concrete.</p>
      </Section>

      <Section title="The Answer vs The Worker">
        <p style={p}>The most useful way to understand the difference between a chatbot and an agent is through what each one actually does when you give it a task.</p>
        <SubHeading>What a chatbot does</SubHeading>
        <p style={p}>A chatbot operates on a simple loop: one question in, one answer out, done. Ask it what time it is in Tokyo and it tells you. Each exchange is independent. It has no memory of what was said before unless explicitly shown the history. It does not take action in the world. It does not call APIs. It does not write files or send emails. It responds and stops.</p>
        <SubHeading>What an agent does</SubHeading>
        <p style={p}>Give an agent a goal — &apos;Book me a flight to Milan next Tuesday. Hotel near the centre under 150 euros. Add both to my calendar and send me a summary&apos; — and something fundamentally different happens. The agent does not produce one response. It executes a sequence of actions: searching a flight booking site, searching hotel sites, writing to a calendar API, drafting and sending a summary email.</p>
        <CalloutBox label="The One-Sentence Test">
          <strong>The chatbot answers.</strong> One prompt → one response.<br />
          <strong>The agent works.</strong> One goal → many actions. Autonomous.
        </CalloutBox>
      </Section>

      <Section title="The Five Components of Every AI Agent">
        <p style={p}>Every agent — simple or complex, no-code or full-code, for healthcare or for scheduling — is built from exactly five components.</p>
        <ComparisonTable
          headers={["#", "Component", "Definition"]}
          rows={[
            ["01", <strong key="p">Perception</strong>, "How the agent receives information. Text, documents, API responses, live web feeds — whatever it can perceive determines what it can act on. If it is not in the perception layer, the agent is blind to it."],
            ["02", <strong key="pl">Planning</strong>, "How the agent decides what to do. The LLM reasons through what actions are needed, in what order, and what to do if something fails. This is where the intelligence sits."],
            ["03", <strong key="t">Tool Use</strong>, "The agent's hands. Web search, calculators, database queries, email APIs, code executors. The agent calls these tools and uses their results to take action in the world."],
            ["04", <strong key="m">Memory</strong>, "Short-term: the current session context. Long-term: a database the agent reads and writes across sessions, enabling it to remember over time."],
            ["05", <strong key="f">Feedback Loop</strong>, "The agent checks its own output before considering the task complete. It might run a test, verify an answer against a source, or ask for human approval. This is what prevents silent failures."],
          ]}
        />
      </Section>

      <Section title="Worked Example: The School Flu Sentinel">
        <p style={p}>Knowing the five components as definitions is useful. Seeing them in action is more useful.</p>
        <CalloutBox label="Scenario">
          An agent monitors a public health data feed every morning. When flu cases in the local region cross a threshold, it emails a bulletin to school administrators with recommended actions.
        </CalloutBox>
        {[
          { component: "Perception", desc: "Reads the public health feed every morning — today's local flu case count." },
          { component: "Planning", desc: "Compares today's count vs last week's. Decides whether the threshold is crossed and action is needed." },
          { component: "Tool Use", desc: "Calls an email API to send the administrator bulletin. Could also trigger SMS for urgent alerts." },
          { component: "Memory", desc: "Stores last week's count to calculate the change. Without memory, it cannot detect trends." },
          { component: "Feedback Loop", desc: "Before sending, checks the feed was updated today — not stale. Prevents false alarms." },
        ].map(({ component, desc }) => (
          <div key={component} style={{ display: "flex", gap: 16, padding: "12px 0", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ minWidth: 120, fontWeight: 700, color: TEAL, fontSize: 14 }}>{component}</div>
            <div style={{ fontSize: 14, color: TEXT_MID, lineHeight: 1.65 }}>{desc}</div>
          </div>
        ))}
        <KeyInsight>
          Five components. One agent. A task that used to require a human to check a website every morning now runs automatically, reliably, and without being prompted.
        </KeyInsight>
      </Section>

      <ReflectionPrompt>
        Pick one repetitive task from your week — something you do the same way, more than once. Describe how an agent could handle it using all five components: What would it perceive? What would it plan? What tools would it use? What would it need to remember? How would it check its own work? Write one paragraph, 4–6 sentences. Be specific.
      </ReflectionPrompt>
    </>
  );
}

// ─── Lesson 1.2b ──────────────────────────────────────────────────────────────

function Lesson_1_2b() {
  return (
    <>
      <Section title="What You Will Learn">
        <p style={p}>Three things. What is actually happening inside an LLM — tokenisation, transformer architecture, and what &apos;parameters&apos; really means. How to use a model via a cloud API, such as the Anthropic API or Hugging Face Inference API. And how to run an open-source model on your own machine using Ollama — free, private, works completely offline.</p>
      </Section>

      <Section title="Step 1: Tokenisation — Text Becomes Numbers">
        <p style={p}>The first thing that happens when you send a message to an LLM is that your text is broken apart into pieces called tokens. A token is roughly a word or part of a word. The sentence &apos;The agent scheduled a meeting&apos; does not arrive at the model as letters or words — it arrives as a sequence of number IDs. &apos;The&apos; becomes 464. &apos;agent&apos; becomes 5797. &apos;sch&apos; becomes 8027. &apos;eduled&apos; becomes 43849.</p>
        <p style={p}>Three things worth knowing about this process. First, words do not align one-to-one with tokens — unusual or long words often split into multiple pieces, which costs more tokens and therefore more money on paid APIs. Second, every model has a context window — a maximum number of tokens it can process at once. GPT-4 can hold around 128,000 tokens; Claude can hold up to 200,000. Third, each token ID is mapped to a vector — a list of hundreds of numbers encoding its meaning.</p>
        <KeyInsight>
          LLMs don&apos;t read words — they read tokens. A token is roughly a word or part of a word. &apos;The agent scheduled a meeting&apos; becomes a sequence of number IDs, not text.
        </KeyInsight>
      </Section>

      <Section title="Step 2: The Transformer — Three Stages">
        <p style={p}>Every modern LLM — Claude, GPT, Llama, Gemini — uses the same underlying architecture: the transformer, introduced in 2017. The name GPT literally stands for Generative Pre-trained Transformer.</p>
        <SubHeading>Stage 1 — Embedding</SubHeading>
        <p style={p}>Each token ID is looked up in an embedding table and converted into a vector of hundreds of numbers. These numbers encode the meaning and context of each word. At this stage, the model has not done any reasoning yet — it has simply turned the token IDs into rich numerical representations.</p>
        <SubHeading>Stage 2 — Transformer Blocks</SubHeading>
        <p style={p}>A stack of transformer blocks processes the vectors. Each block runs two key operations. First, Attention — which words in the sequence matter most to each other? Attention resolves this by computing relationships across the entire sequence simultaneously. Second, a Feed-forward layer — a pattern lookup from training data. A large model may have 96 or more of these blocks stacked on top of each other.</p>
        <SubHeading>Stage 3 — Language Model Head</SubHeading>
        <p style={p}>The final vector is mapped to a probability score for every token in the vocabulary. The model picks the most likely next token. This repeats — the new token is added to the sequence and the whole process runs again — until the answer is complete. This is why LLM responses are generated word by word.</p>
        <CalloutBox label="The T in GPT stands for Transformer">
          Every LLM you will use — Claude, GPT, Gemini, Llama, Mistral — runs this exact three-stage loop, billions of times per second.
        </CalloutBox>
      </Section>

      <Section title="What Does '70 Billion Parameters' Actually Mean?">
        <p style={p}>Parameters are the numbers inside the model — the values learned during training that encode everything the model knows about language, facts, reasoning patterns, and style. More parameters means more capacity, but also more compute and memory required to run the model.</p>
        <ComparisonTable
          headers={["Model", "Size", "Notes", "Hosting"]}
          rows={[
            ["GPT-2 (2019)", "124M", "First impressive open model", "Runs on any laptop"],
            ["Llama 3.2 3B", "3B", "Small but capable", "Runs locally on most modern laptops"],
            ["Qwen 2.5 7B", "7B", "Strong general model", "Runs locally on 8GB RAM"],
            ["Llama 3.3 70B", "70B", "Near-frontier quality", "Needs 16GB+ VRAM locally"],
            ["Claude Sonnet 4.6", "~200B+", "Best quality", "Cloud-only. Pay per token via API"],
            ["GPT-4o", "~200B+", "OpenAI flagship", "Cloud-only. Pay per token via API"],
          ]}
        />
      </Section>

      <Section title="Two Ways to Run a Model: Online vs Local">
        <SubHeading>Online — Cloud API</SubHeading>
        <p style={p}>You send your text to a remote server operated by a company like Anthropic, OpenAI, or Hugging Face. Their hardware runs the model and returns the response. Advantages: no hardware needed, access to the largest and most capable models, always up to date. Disadvantages: costs money per token, your data leaves your machine which raises privacy considerations, requires an internet connection.</p>
        <p style={p}><strong>Services:</strong> Anthropic API · OpenAI API · Hugging Face Inference API</p>
        <SubHeading>Local — Run on Your Machine</SubHeading>
        <p style={p}>You download the model weights to your own computer and run them using a tool like Ollama. Advantages: completely free after setup, data never leaves your machine, works offline. Disadvantages: smaller models with less capability, requires decent hardware (8GB RAM minimum), requires initial setup.</p>
        <p style={p}><strong>Tool:</strong> Ollama (ollama.ai, free and open source) · <strong>Models:</strong> Llama 3, Qwen, Mistral, Gemma</p>
        <CalloutBox label="Which Should You Use?">
          For most student projects: start with a cloud API — simpler to set up and the most capable models. Switch to local if your project involves sensitive data, you need to work offline, or you want to avoid per-token costs for high-volume testing. Track B and C students: consider running local models for development and switching to an API for your final demo.
        </CalloutBox>
      </Section>

      <Section title="Hugging Face: Where Models Live">
        <p style={p}>Hugging Face (huggingface.co) is the largest open-source model repository in the world. Think of it as GitHub for AI models — a place where researchers and companies publish their models, and where anyone can download, test, or run them.</p>
        <p style={p}>Every model on Hugging Face has a model card that tells you: the model name and creator, the number of parameters, what text it was trained on and any biases that carries, what tasks it is optimised for, the license terms, and an inference widget where you can test the model directly in your browser.</p>
        <CalloutBox label="Your Activity">
          Go to huggingface.co/models. Filter by task: Text Generation. Pick any open-source model. Read the model card. Answer the three questions in the reflection below.
        </CalloutBox>
      </Section>

      <ReflectionPrompt>
        Go to huggingface.co/models. Browse the text generation models and pick one open-source model you find interesting. Read its model card and answer these three questions:
        <ol style={{ paddingLeft: 20, marginTop: 10 }}>
          <li style={{ marginBottom: 6 }}>What was it trained on, and how many parameters does it have?</li>
          <li style={{ marginBottom: 6 }}>What tasks is it designed for — and is it a good fit for an agent project?</li>
          <li style={{ marginBottom: 6 }}>Would you run this model online or locally? Why?</li>
        </ol>
        <em>Track B/C bonus: Install Ollama (ollama.ai), download a model with &apos;ollama pull llama3.2&apos;, and run it with one prompt. Screenshot the output.</em>
      </ReflectionPrompt>
    </>
  );
}

// ─── Lesson content map ───────────────────────────────────────────────────────

const LESSON_CONTENT: Record<string, React.FC> = {
  "lesson-1-1": Lesson_1_1,
  "lesson-1-2a": Lesson_1_2a,
  "lesson-1-2b": Lesson_1_2b,
};

// ─── Main client component ────────────────────────────────────────────────────

interface Props {
  lesson: Lesson;
  isAuthenticated: boolean;
  gateOpen?: boolean;
}

export default function LessonPageClient({ lesson, isAuthenticated, gateOpen = false }: Props) {
  const [showModal, setShowModal] = useState(gateOpen && !isAuthenticated);

  const lessonIndex = COURSE_LESSONS.findIndex((l) => l.slug === lesson.slug);
  const prevLesson = lessonIndex > 0 ? COURSE_LESSONS[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < COURSE_LESSONS.length - 1 ? COURSE_LESSONS[lessonIndex + 1] : null;

  const lessonHref = (l: Lesson) =>
    l.slug === "introduction" ? "/courses/agentic-ai" : `/courses/agentic-ai/lesson/${l.slug}`;

  const ContentComponent = LESSON_CONTENT[lesson.slug];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Inter', system-ui, sans-serif; background: #F7F9FC; }
      `}</style>

      {/* Lesson header bar */}
      <div style={{ background: NAVY, color: "#fff", padding: "20px 24px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" as const }}>
        <Link href="/courses/agentic-ai" style={{ color: TEAL, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
          ← Course Home
        </Link>
        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.2)" }} />
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>Phase {lesson.phase} · Week {lesson.week}</div>
        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.2)" }} />
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>⏱ {lesson.duration}</div>
        <div style={{ marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,0.55)" }}>Lesson {lesson.number}</div>
      </div>

      {/* Lesson title */}
      <div style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a3a5c 100%)`, padding: "40px 24px 36px", color: "#fff", textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: TEAL, marginBottom: 10 }}>
          Lesson {lesson.number}
        </div>
        <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: "clamp(22px, 4vw, 36px)", fontWeight: 800, color: "#fff", margin: 0, lineHeight: 1.2 }}>
          {lesson.title}
        </h1>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 80px", display: "flex", gap: 40, alignItems: "flex-start" }}>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {ContentComponent ? (
            <ContentComponent />
          ) : (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 48, textAlign: "center", boxShadow: SHADOW }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
              <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700, color: TEXT, marginBottom: 8 }}>
                Lesson Coming Soon
              </h2>
              <p style={{ fontSize: 15, color: TEXT_LIGHT }}>This lesson is being prepared. Check back soon.</p>
            </div>
          )}

          {/* Prev / Next navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginTop: 8 }}>
            {prevLesson ? (
              <Link href={lessonHref(prevLesson)} style={{ display: "flex", flexDirection: "column", gap: 4, padding: "14px 20px", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, textDecoration: "none", boxShadow: SHADOW, flex: 1 }}>
                <span style={{ fontSize: 11, color: TEXT_LIGHT }}>← Previous</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{prevLesson.number} — {prevLesson.title}</span>
              </Link>
            ) : <div />}

            {nextLesson ? (
              nextLesson.free || isAuthenticated ? (
                <Link href={lessonHref(nextLesson)} style={{ display: "flex", flexDirection: "column", gap: 4, padding: "14px 20px", background: TEAL, border: `1px solid ${TEAL}`, borderRadius: 10, textDecoration: "none", boxShadow: SHADOW, flex: 1, textAlign: "right" as const }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Next →</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{nextLesson.number} — {nextLesson.title}</span>
                </Link>
              ) : (
                <button onClick={() => setShowModal(true)} style={{ display: "flex", flexDirection: "column", gap: 4, padding: "14px 20px", background: TEAL, border: `1px solid ${TEAL}`, borderRadius: 10, cursor: "pointer", flex: 1, textAlign: "right" as const }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Next →</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{nextLesson.number} — {nextLesson.title}</span>
                </button>
              )
            ) : null}
          </div>
        </div>

        {/* Sidebar */}
        <CourseSidebar isAuthenticated={isAuthenticated} onLockedClick={() => setShowModal(true)} />
      </div>

      {showModal && <GateModal onClose={() => setShowModal(false)} />}
    </>
  );
}
