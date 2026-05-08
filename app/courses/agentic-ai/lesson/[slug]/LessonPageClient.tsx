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

// ─── Shared sub-components ────────────────────────────────────────────────────

const p: React.CSSProperties = { fontSize: 15, color: TEXT_MID, lineHeight: 1.75, marginBottom: 14 };

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
  return <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700, color: TEXT, margin: "20px 0 10px" }}>{children}</h3>;
}

function KeyInsight({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: TEAL_LIGHT, border: `1px solid ${TEAL}`, borderLeft: `4px solid ${TEAL}`, borderRadius: "0 10px 10px 0", padding: "14px 18px", margin: "20px 0", fontSize: 14, color: NAVY, lineHeight: 1.65, fontWeight: 500 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: TEAL, marginBottom: 6 }}>Key Insight</div>
      {children}
    </div>
  );
}

function CalloutBox({ label, children, variant = "default" }: { label: string; children: React.ReactNode; variant?: "default" | "warning" | "tip" }) {
  const styles = {
    default: { bg: "#F7F9FC", border: BORDER, borderLeft: NAVY, color: TEXT_MID },
    warning: { bg: "#FFF8E6", border: "#F0A500", borderLeft: "#F0A500", color: "#7D5A00" },
    tip: { bg: "#F0FFF4", border: "#9AE6B4", borderLeft: "#276749", color: "#276749" },
  }[variant];
  return (
    <div style={{ background: styles.bg, border: `1px solid ${styles.border}`, borderLeft: `4px solid ${styles.borderLeft}`, borderRadius: "0 10px 10px 0", padding: "14px 18px", margin: "20px 0", fontSize: 14, color: styles.color, lineHeight: 1.65 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function ReflectionPrompt({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#FFF8E6", border: "1px solid #F0A500", borderLeft: "4px solid #F0A500", borderRadius: "0 10px 10px 0", padding: "18px 20px", marginBottom: 24, fontSize: 14, color: "#7D5A00", lineHeight: 1.7 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#F0A500", marginBottom: 8 }}>✏️ Student Reflection</div>
      {children}
    </div>
  );
}

function ExampleCard({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, marginBottom: 16, background: "#FAFBFC" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: TEAL, color: "#fff", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "'Sora', sans-serif" }}>{number}</div>
        <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 700, color: TEXT, paddingTop: 4 }}>{title}</div>
      </div>
      {children}
    </div>
  );
}

function TrackBadge({ track }: { track: "A" | "B" | "C" }) {
  const styles = { A: { color: "#009688", bg: "#E6F9F7", label: "Track A — No-Code" }, B: { color: "#4A7DFF", bg: "#EBF1FF", label: "Track B — Low-Code" }, C: { color: "#9B59B6", bg: "#F3EDFF", label: "Track C — Full-Code" } }[track];
  return <div style={{ display: "inline-block", background: styles.bg, color: styles.color, fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 20, marginBottom: 16 }}>{styles.label}</div>;
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre style={{ background: NAVY, color: "#E2E8F0", padding: "18px 20px", borderRadius: 10, fontSize: 13, lineHeight: 1.6, overflowX: "auto", margin: "16px 0", fontFamily: "monospace" }}>
      <code>{children}</code>
    </pre>
  );
}


function SlideImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div style={{ margin: "24px 0", borderRadius: 12, overflow: "hidden", border: `1px solid ${BORDER}`, boxShadow: SHADOW }}>
      <img
        src={src}
        alt={alt}
        style={{ width: "100%", display: "block" }}
        loading="lazy"
      />
    </div>
  );
}

function ComparisonTable({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div style={{ overflowX: "auto", marginTop: 8 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr>{headers.map((h) => <th key={h} style={{ background: NAVY, color: "#fff", padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>{row.map((cell, j) => <td key={j} style={{ padding: "11px 14px", borderBottom: `1px solid ${BORDER}`, color: TEXT_MID, background: i % 2 === 1 ? "#FAFBFC" : "transparent", verticalAlign: "top" }}>{cell}</td>)}</tr>
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
        <p style={p}>This lesson covers three things. By the end you should be able to define AI accurately in plain language, distinguish traditional software from machine learning and generative AI, and calibrate your own expectations. Both over-hype and under-estimation are equally unhelpful when it comes to building real systems.</p>
      <SlideImage src="/assets/courses/lesson-1-1/slide-1.png" alt="Slide 1" />
      </Section>
      <Section title="Two Ways to Build Intelligence">
        <p style={p}>Every piece of software that makes decisions is built using one of two fundamentally different approaches. Understanding this distinction is the foundation of everything that follows in this course.</p>
        <SubHeading>Traditional Software: Rules Written by Hand</SubHeading>
        <p style={p}>In traditional software, a human developer writes every decision in advance. If the user clicks <strong>X</strong>, do <strong>Y</strong>. Always. A spam filter built this way works by checking emails against a handcrafted list of suspicious keywords. This approach is predictable and reliable — but rigid. If a new type of spam appears that does not match any handcrafted rules, the filter fails.</p>
        <SubHeading>AI / Machine Learning: Rules Learned from Examples</SubHeading>
        <p style={p}>Machine learning takes a completely different approach. Instead of writing rules by hand, you show the system millions of labelled examples, and it extracts the patterns itself. A spam filter built this way was trained on millions of emails labelled as spam or not spam. It learned the patterns from the data. This makes the system flexible and adaptive — it improves with more data and can handle situations the developer never anticipated.</p>
      <SlideImage src="/assets/courses/lesson-1-1/slide-2.png" alt="Slide 2" />
      </Section>
      <Section title="What Exactly Is a Model?">
        <p style={p}>A model is not a program in the traditional sense. It is a very large set of mathematical patterns — specifically, numerical weights extracted from data during training. You feed the system millions of examples. The system adjusts its internal parameters — billions of them — until it can reliably predict the correct output for each input. Once training is complete, those adjusted parameters are saved. That saved set of parameters is the model.</p>
        <KeyInsight>A model is not a program in the traditional sense. It is a very large set of mathematical patterns extracted from data. You cannot read it like code, but it behaves as though it has learned the rules.</KeyInsight>
      <SlideImage src="/assets/courses/lesson-1-1/slide-3.png" alt="Slide 3" />
      </Section>
      <Section title="From Machine Learning to Generative AI">
        <p style={p}>Machine learning has been around for decades. The answer to what changed recently lies in a specific sequence of breakthroughs. In 2012, AlexNet demonstrated that deep learning could outperform every hand-engineered system. In 2017, the Transformer architecture was introduced in 'Attention Is All You Need' — every modern LLM is a transformer. From 2022 onwards, these models scaled to billions of parameters and were exposed to vast portions of the public internet during training.</p>
        <KeyInsight>The transformer (2017) powers every modern LLM. This jump is why agentic AI is possible now — and was not five years ago.</KeyInsight>
        <p style={p}>Traditional machine learning classifies and predicts — is this email spam? Generative AI creates new content — text, images, code — that did not exist before. The output is generated token by token based on patterns learned during training.</p>
      <SlideImage src="/assets/courses/lesson-1-1/slide-4.png" alt="Slide 4" />
      </Section>
      <Section title="What LLMs Are Good and Bad At">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 8 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: TEAL, marginBottom: 10 }}>✅ What LLMs Are Very Good At</div>
            {["Summarising long documents quickly", "Drafting and editing written content", "Explaining complex ideas in plain language", "Writing, reviewing, and debugging code", "Translating between languages", "Answering questions from documents"].map((item) => (
              <div key={item} style={{ display: "flex", gap: 8, fontSize: 14, color: TEXT_MID, padding: "4px 0" }}><span style={{ color: TEAL, flexShrink: 0 }}>✓</span>{item}</div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#E74C3C", marginBottom: 10 }}>⚠ What LLMs Struggle With</div>
            {["Remembering previous conversations without explicit memory", "Real-time information — they have a knowledge cutoff", "Verified facts — they can state incorrect information confidently", "Consistent precise arithmetic", "Acting without tools — a model alone cannot take actions in the world"].map((item) => (
              <div key={item} style={{ display: "flex", gap: 8, fontSize: 14, color: TEXT_MID, padding: "4px 0" }}><span style={{ color: "#E74C3C", flexShrink: 0 }}>✗</span>{item}</div>
            ))}
          </div>
        </div>
        <KeyInsight>Treat an LLM like a very fast, very well-read assistant who is occasionally overconfident. Verify important claims. Use it to speed up tasks you already understand.</KeyInsight>
      <SlideImage src="/assets/courses/lesson-1-1/slide-6.png" alt="Slide 6" />
      </Section>
      <ReflectionPrompt>Think of a piece of software you use every day. Based on what you learned in this lesson, is it traditional software, machine learning, or generative AI? How can you tell? Write 3–5 sentences connecting it to your own experience.</ReflectionPrompt>
    </>
  );
}

// ─── Lesson 1.2a ──────────────────────────────────────────────────────────────
function Lesson_1_2a() {
  return (
    <>
      <SlideImage src="/assets/courses/lesson-1-2a/slide-1.png" alt="Slide 1" />
      <Section title="What You Will Learn">
        <p style={p}>Three goals. First, you will be able to explain clearly why an AI agent is fundamentally different from a chatbot. Second, you will know the names and definitions of the five components every agent is built from. Third, you will apply that framework to a real-world scenario and see how it maps onto something concrete.</p>
      <SlideImage src="/assets/courses/lesson-1-2a/slide-2.png" alt="Slide 2" />
      </Section>
      <Section title="The Answer vs The Worker">
        <SubHeading>What a chatbot does</SubHeading>
        <p style={p}>A chatbot operates on a simple loop: one question in, one answer out, done. Ask it what time it is in Tokyo and it tells you. Each exchange is independent. It has no memory of what was said before unless explicitly shown the history. It does not take action in the world. It does not call APIs. It responds and stops.</p>
        <SubHeading>What an agent does</SubHeading>
        <p style={p}>Give an agent a goal — 'Book me a flight to Milan next Tuesday. Hotel near the centre under 150 euros. Add both to my calendar and send me a summary' — and something fundamentally different happens. The agent does not produce one response. It executes a sequence of actions: searching a flight booking site, searching hotel sites, writing to a calendar API, drafting and sending a summary email.</p>
        <CalloutBox label="The One-Sentence Test"><strong>The chatbot answers.</strong> One prompt → one response.<br /><strong>The agent works.</strong> One goal → many actions. Autonomous.</CalloutBox>
      </Section>
      <Section title="The Five Components of Every AI Agent">
      <SlideImage src="/assets/courses/lesson-1-2a/slide-3.png" alt="Slide 3" />
        <p style={p}>Every agent — simple or complex, no-code or full-code — is built from exactly five components.</p>
      <SlideImage src="/assets/courses/lesson-1-2a/slide-4.png" alt="Slide 4" />
        <ComparisonTable
          headers={["#", "Component", "Definition"]}
          rows={[
            ["01", <strong key="p">Perception</strong>, "How the agent receives information. Text, documents, API responses, live web feeds. If it is not in the perception layer, the agent is blind to it."],
            ["02", <strong key="pl">Planning</strong>, "How the agent decides what to do. The LLM reasons through what actions are needed, in what order, and what to do if something fails."],
            ["03", <strong key="t">Tool Use</strong>, "The agent's hands. Web search, calculators, database queries, email APIs, code executors. The agent calls these tools and uses their results to take action in the world."],
            ["04", <strong key="m">Memory</strong>, "Short-term: the current session context. Long-term: a database the agent reads and writes across sessions, enabling it to remember over time."],
            ["05", <strong key="f">Feedback Loop</strong>, "The agent checks its own output before considering the task complete. This is what prevents silent failures."],
          ]}
        />
      <SlideImage src="/assets/courses/lesson-1-2a/slide-5.png" alt="Slide 5" />
      </Section>
      <Section title="Worked Example: The School Flu Sentinel">
      <SlideImage src="/assets/courses/lesson-1-2a/slide-3.png" alt="Slide 3" />
        <CalloutBox label="Scenario">An agent monitors a public health data feed every morning. When flu cases in the local region cross a threshold, it emails a bulletin to school administrators with recommended actions.</CalloutBox>
        {[
          { component: "Perception", desc: "Reads the public health feed every morning — today's local flu case count." },
          { component: "Planning", desc: "Compares today's count vs last week's. Decides whether the threshold is crossed and action is needed." },
          { component: "Tool Use", desc: "Calls an email API to send the administrator bulletin." },
          { component: "Memory", desc: "Stores last week's count to calculate the change. Without memory, it cannot detect trends." },
          { component: "Feedback Loop", desc: "Before sending, checks the feed was updated today — not stale. Prevents false alarms." },
        ].map(({ component, desc }) => (
          <div key={component} style={{ display: "flex", gap: 16, padding: "12px 0", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ minWidth: 120, fontWeight: 700, color: TEAL, fontSize: 14 }}>{component}</div>
            <div style={{ fontSize: 14, color: TEXT_MID, lineHeight: 1.65 }}>{desc}</div>
          </div>
        ))}
      <SlideImage src="/assets/courses/lesson-1-2a/slide-7.png" alt="Slide 7" /> 
        <KeyInsight>Five components. One agent. A task that used to require a human to check a website every morning now runs automatically, reliably, and without being prompted.</KeyInsight>
      </Section>
      <ReflectionPrompt>Pick one repetitive task from your week. Describe how an agent could handle it using all five components: What would it perceive? What would it plan? What tools would it use? What would it need to remember? How would it check its own work? Write one paragraph, 4–6 sentences. Be specific.</ReflectionPrompt>
    </>
  );
}

// ─── Lesson 1.2b ──────────────────────────────────────────────────────────────
function Lesson_1_2b() {
  return (
    <>
    <SlideImage src="/assets/courses/lesson-1-2b/slide-1.png" alt="Slide 1" />
      <Section title="What You Will Learn">
        <p style={p}>Three things. What is actually happening inside an LLM — tokenisation, transformer architecture, and what 'parameters' really means. How to use a model via a cloud API. And how to run an open-source model on your own machine using Ollama — free, private, works completely offline.</p>
      <SlideImage src="/assets/courses/lesson-1-2b/slide-2.png" alt="Slide 2" />
      </Section>
      <Section title="Step 1: Tokenisation — Text Becomes Numbers">
        <p style={p}>The first thing that happens when you send a message to an LLM is that your text is broken apart into tokens. A token is roughly a word or part of a word. The sentence 'The agent scheduled a meeting' does not arrive at the model as letters or words — it arrives as a sequence of number IDs.</p>
        <KeyInsight>LLMs don't read words — they read tokens. Every modern LLM has a context window — a maximum number of tokens it can process at once. GPT-4 holds ~128,000 tokens; Claude holds up to 200,000.</KeyInsight>
      <SlideImage src="/assets/courses/lesson-1-2b/slide-3.png" alt="Slide 3" />
      </Section>
      <Section title="Step 2: The Transformer — Three Stages">
        <p style={p}>Every modern LLM — Claude, GPT, Llama, Gemini — uses the same underlying architecture: the transformer, introduced in 2017. The name GPT literally stands for Generative Pre-trained Transformer.</p>
        <SubHeading>Stage 1 — Embedding</SubHeading>
        <p style={p}>Each token ID is looked up in an embedding table and converted into a vector of hundreds of numbers. These numbers encode the meaning and context of each word.</p>
        <SubHeading>Stage 2 — Transformer Blocks</SubHeading>
        <p style={p}>A stack of transformer blocks processes the vectors. Each block runs Attention (which words matter most to each other?) and a feed-forward layer (pattern lookup from training). A large model may have 96 or more of these blocks stacked.</p>
        <SubHeading>Stage 3 — Language Model Head</SubHeading>
        <p style={p}>The final vector is mapped to a probability score for every token in the vocabulary. The model picks the most likely next token. This repeats until the answer is complete. This is why LLM responses are generated word by word.</p>
       <SlideImage src="/assets/courses/lesson-1-2b/slide-4.png" alt="Slide 4" />
      </Section>
      <Section title="What Does '70 Billion Parameters' Actually Mean?">
        <p style={p}>Parameters are the numbers inside the model — the values learned during training. More parameters means more capacity, but also more compute required to run the model.</p>
        <ComparisonTable
          headers={["Model", "Size", "Notes", "Hosting"]}
          rows={[
            ["Llama 3.2 3B", "3B", "Small but capable", "Runs locally on most laptops"],
            ["Qwen 2.5 7B", "7B", "Strong general model", "Runs locally on 8GB RAM"],
            ["Llama 3.3 70B", "70B", "Near-frontier quality", "Needs 16GB+ VRAM locally"],
            ["Claude Sonnet 4.6", "~200B+", "Best quality", "Cloud-only. Pay per token via API"],
          ]}
        />
       <SlideImage src="/assets/courses/lesson-1-2b/slide-5.png" alt="Slide 5" />
      </Section>
      <Section title="Two Ways to Run a Model">
        <SubHeading>Online — Cloud API</SubHeading>
        <p style={p}>You send text to a remote server. Their hardware runs the model and returns the response. Advantages: no hardware needed, access to the largest models. Disadvantages: costs money per token, your data leaves your machine.</p>
        <p style={p}><strong>Services:</strong> Anthropic API · OpenAI API · Hugging Face Inference API</p>
        <SubHeading>Local — Run on Your Machine</SubHeading>
        <p style={p}>You download the model weights to your own computer and run them using Ollama. Advantages: completely free after setup, data never leaves your machine, works offline. Disadvantages: smaller models with less capability, requires decent hardware.</p>
        <CalloutBox label="Which Should You Use?" variant="tip">For most student projects: start with a cloud API. Switch to local if your project involves sensitive data, you need to work offline, or you want to avoid per-token costs for high-volume testing.</CalloutBox>
      <SlideImage src="/assets/courses/lesson-1-2b/slide-7.png" alt="Slide 7" />. 
      </Section>
      <ReflectionPrompt>Go to huggingface.co/models Browse the text generation models and pick one open-source model. Read its model card and answer: What was it trained on and how many parameters does it have? Is it a good fit for an agent project? Would you run it online or locally? Why?</ReflectionPrompt>
    </>
  );
}

// ─── Lesson 1.3 ───────────────────────────────────────────────────────────────
function Lesson_1_3() {
  return (
    <>
      <Section title="What You Will Watch">
        <p style={p}>Three demos, each covering a different domain and a different combination of the five components. After each demo, use the component breakdown to check your own reading of what just happened against the framework.</p>
        {[
          { num: "1", title: "Browsing Agent", desc: "Watch an agent search ClinicalTrials.gov, read results, extract structured fields, and format output — without a single manual step." },
          { num: "2", title: "Coding Agent", desc: "Watch an agent read a CSV, write Python, run it, catch its own error, fix it autonomously, and produce a chart. Spot the feedback loop." },
          { num: "3", title: "Scheduling Agent", desc: "Watch an agent read three calendars, find a free slot, send an invite, and add a personal reminder — in under 30 seconds." },
        ].map((d) => (
          <div key={d.num} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: NAVY, color: "#fff", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{d.num}</div>
            <div><strong style={{ color: TEXT }}>{d.title}</strong><br /><span style={{ fontSize: 14, color: TEXT_MID }}>{d.desc}</span></div>
          </div>
        ))}
      </Section>
      <Section title="Demo 1 — The Browsing Agent">
        <CalloutBox label="Task Given to Agent">'Find three Italian clinical trials currently recruiting for lung cancer patients. Return their titles, locations, and contact emails.'</CalloutBox>
        <p style={p}>The agent navigates to ClinicalTrials.gov, applies the correct search filters, reads the DOM of the results page, identifies the relevant fields, and formats three clean records. A search engine would have returned a page of links. The agent read those pages, extracted specific fields, and produced something the human can use immediately. That is the difference.</p>
        <SubHeading>Component Breakdown</SubHeading>
        {[
          ["Perception", "Reads ClinicalTrials.gov page content (the DOM of the web page)."],
          ["Planning", "Decides which search filters to apply and which fields to extract from each result."],
          ["Tool Use", "Calls the browser tool — navigates to the URL, searches, reads the page."],
          ["Memory", "Holds the search results in context while formatting the output."],
          ["Feedback Loop", "Checks that three results were found before returning. Retries with broader filters if fewer than three."],
        ].map(([c, d]) => (
          <div key={c as string} style={{ display: "flex", gap: 16, padding: "8px 0", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ minWidth: 110, fontWeight: 700, color: TEAL, fontSize: 13 }}>{c}</div>
            <div style={{ fontSize: 14, color: TEXT_MID }}>{d}</div>
          </div>
        ))}
      </Section>
      <Section title="Demo 2 — The Coding Agent">
        <CalloutBox label="Task Given to Agent">'Read the attached CSV file and produce a bar chart showing total sales by region. Save the chart as a PNG.'</CalloutBox>
        <p style={p}>The agent reads the CSV, writes Python code to parse and chart it, executes the code, reads the error message when it fails, fixes the bug autonomously, re-executes, and saves the PNG. The feedback loop is visible: the agent does not give up when the code fails — it reads the error and corrects itself.</p>
        <KeyInsight>This is the feedback loop in action. The agent's output was its own error. It perceived it, planned a fix, and executed again. No human intervention.</KeyInsight>
      </Section>
      <Section title="Demo 3 — The Scheduling Agent">
        <CalloutBox label="Task Given to Agent">'Find a 45-minute slot this week where all three team members are free. Book it and send a calendar invite. Add a personal reminder for me 30 minutes before.'</CalloutBox>
        <p style={p}>The agent reads three calendar APIs simultaneously, identifies overlapping free slots, selects the earliest that works, creates a calendar event via the Google Calendar API, sends invites to all three attendees, and creates a personal reminder. Total time: under 30 seconds. The equivalent manual process takes several minutes of checking and email exchanges.</p>
      </Section>
      <ReflectionPrompt>Pick one of the three demos. Write a short paragraph (3–5 sentences) describing what you found most surprising about how the agent worked. Then describe one scenario from your own life or field of interest where a similar agent could be useful. Be specific about what it would perceive, what it would do, and what the output would be.</ReflectionPrompt>
    </>
  );
}

// ─── Lesson 2.1 ───────────────────────────────────────────────────────────────
function Lesson_2_1() {
  return (
    <>
      <SlideImage src="/assets/courses/lesson-2-1/slide-1.png" alt="Slide 1" />
      <Section title="What You Will Learn">
        <p style={p}>Three things. First, why accountability in AI systems is more complex than in traditional software — using a concrete hospital scenario that reveals the gap clearly. Second, the three core ethical dimensions that apply to every agentic system: privacy and consent, bias and fairness, and transparency. Third, that ethical decisions are not separate from technical decisions — every architecture choice has ethical implications.</p>
      <SlideImage src="/assets/courses/lesson-2-1/slide-2.png" alt="Slide 2" />
      </Section>
      <Section title="The Accountability Gap — A Real Scenario">
        <CalloutBox label="Scenario" variant="warning">A hospital deploys an agent that reads discharge letters and sends patients a plain-language checklist of follow-up actions. The agent misreads one letter and tells a patient they can stop taking a medication when the letter said the opposite. The patient follows the instruction and is readmitted two weeks later.</CalloutBox>
        <p style={p}>When something goes wrong in a system like this, the natural response is to ask who is responsible. In an AI agent system, the answer is genuinely complicated.</p>
        {[
          ["The hospital", "deployed the agent and chose to use it for patient communication without adequate clinical review."],
          ["The developers", "built the system knowing the model could hallucinate. They did not build a clinical review step before output delivery."],
          ["The AI company", "provided the model whose training data and error rate are now operating in a clinical setting."],
          ["The patient", "trusted the output without checking it against the original letter. Is any blame here? This is genuinely contested."],
        ].map(([who, desc]) => (
          <div key={who as string} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ minWidth: 120, fontWeight: 700, color: TEXT, fontSize: 14 }}>{who}</div>
            <div style={{ fontSize: 14, color: TEXT_MID }}>{desc}</div>
          </div>
        ))}
        
      <KeyInsight>AI agents make decisions that were not explicitly programmed. When they cause harm, it can be impossible to trace exactly which training data or probabilistic step led to the error. This is not an excuse to avoid accountability — it is a reason to design accountability in from the start.</KeyInsight>
      <SlideImage src="/assets/courses/lesson-2-1/slide-3.png" alt="Slide 3" />
      </Section>
      <Section title="Three Core Ethical Dimensions">
        <SubHeading>1. Privacy and Consent</SubHeading>
        <p style={p}>Every agent that processes personal data creates a privacy obligation. The questions are: What data does the agent actually need? Who consented to it being used? How long is it retained? Can users request deletion? Privacy is not just about preventing data breaches — it is about using only what you need for only as long as you need it.</p>
        <SubHeading>2. Bias and Fairness</SubHeading>
        <p style={p}>LLMs are trained on human-generated data — which contains human biases. An agent trained on English-language medical literature may perform worse for patients whose conditions are underrepresented in that literature. A hiring agent trained on historical data may systematically disadvantage candidates from certain backgrounds. The obligation is to identify which groups your agent affects and test whether its outputs are equitable across them.</p>
        <SubHeading>3. Transparency</SubHeading>
        <p style={p}>Can a user understand what the agent did and why? If your agent sends a message, makes a recommendation, or takes an action that affects someone — can that person request an explanation? Transparency is the bridge between AI capability and human trust. Without it, even a high-performing agent is difficult to use responsibly in high-stakes settings.</p>
      <SlideImage src="/assets/courses/lesson-2-1/slide-5.png" alt="Slide 5" /> 
      </Section>
      <ReflectionPrompt>Think about an agent you could imagine building for a domain you care about. Name one specific privacy concern it raises, one potential bias in its data or training, and one transparency question a user might reasonably ask. For each — describe one design decision you could make to address it. Write 2–3 sentences per dimension.</ReflectionPrompt>
    </>
  );
}

// ─── Lesson 2.2 ───────────────────────────────────────────────────────────────
function Lesson_2_2() {
  return (
    <>
      <Section title="What You Will Learn">
        <p style={p}>Three things. Concrete examples of agents already generating commercial value in healthcare, legal, and customer operations. The distinction between the infrastructure layer and the application layer where products are built. And why the barrier to building something real is not technical or financial — it is the scarcity of domain knowledge combined with a specific problem worth solving.</p>
      </Section>
      <Section title="Three Industries Already Using Agents Commercially">
      <SlideImage src="/assets/courses/lesson-2-2/slide-1.png" alt="Slide 1" />
        {[
          { industry: "Healthcare", examples: ["Triage agents read patient messages and route them to the right clinical team — processing in seconds what previously took hours of manual review.", "Claim processing agents read, categorise, and approve low-complexity insurance claims in minutes instead of days.", "Research agents scan thousands of published papers and surface relevant findings for a specific clinical experiment."] },
          { industry: "Legal", examples: ["Contract review agents read thousands of pages, flag clauses that deviate from standard terms, and produce risk summaries — a task that used to take a junior lawyer a week now takes an agent a few hours.", "Due diligence agents cross-reference filings, court records, and public data to surface risks before a deal closes."] },
          { industry: "Customer Operations", examples: ["First-line agents handle routine enquiries autonomously and escalate complex cases — with full context already prepared for the human agent who picks it up.", "Resolution time for standard requests drops from days to minutes."] },
        ].map(({ industry, examples }) => (
          <div key={industry} style={{ marginBottom: 24 }}>
            <SubHeading>{industry}</SubHeading>
            {examples.map((ex, i) => (
              <div key={i} style={{ display: "flex", gap: 10, fontSize: 14, color: TEXT_MID, padding: "4px 0" }}>
                <span style={{ color: TEAL, flexShrink: 0 }}>→</span>{ex}
              </div>
            ))}
          </div>
        ))}
      </Section>
      <Section title="Infrastructure vs Application Layer">
      <SlideImage src="/assets/courses/lesson-2-2/slide-2.png" alt="Slide 2" />
        <SubHeading>The Infrastructure Layer</SubHeading>
        <p style={p}>The infrastructure layer consists of the large language models themselves — Claude, GPT, Gemini, Llama — and the compute required to run them. Building at this layer requires hundreds of millions of dollars, vast datasets, and teams of ML researchers. This is not where student builders operate.</p>
        <SubHeading>The Application Layer</SubHeading>
        <p style={p}>The application layer is where products are built on top of the infrastructure. You do not need to understand how a transformer works to build a useful agent — just as you do not need to know how a database engine works to build a web app that uses one. The application layer is where domain knowledge becomes the primary differentiator. An agent that helps school nurses triage flu symptoms requires deep understanding of school health workflows — not a PhD in machine learning.</p>
        <KeyInsight>The real scarcity is not technical skill — it is domain knowledge combined with a specific problem worth solving. If you understand a domain well enough to recognise a problem that repeats, you have the most important ingredient.</KeyInsight>
      </Section>
      <ReflectionPrompt>Name one domain you know well
      <SlideImage src="/assets/courses/lesson-2-2/slide-3.png" alt="Slide 3" /> — from school, family, volunteering, or personal experience. Describe one repetitive task in that domain that currently takes human time and attention. How would an agent handle it? What would be the measurable benefit? Write 3–5 sentences. This is the seed of your project brief.</ReflectionPrompt>
    </>
  );
}

// ─── Lesson 3.1 ───────────────────────────────────────────────────────────────
function Lesson_3_1() {
  return (
    <>
      <Section title="How to Use This Gallery">
        <p style={p}>For each example: understand the pattern, then ask yourself the activation question. The gallery is a tool for developing project instinct, not a reading exercise.</p>
        <p style={p}>Read what the agent does. Identify who it helps and why it matters. Note what it needs to work. Answer the activation question.</p>
      </Section>
      <Section title="Healthcare Examples">
      <SlideImage src="/assets/courses/lesson-3-1/slide-1.png" alt="Slide 1" />
        <ExampleCard number="01" title="Medication Reminder and Missed-Dose Alert">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 14 }}>
            <div><strong style={{ color: TEXT }}>What it does:</strong><p style={{ ...p, marginBottom: 0 }}>Monitors a patient's medication schedule, sends reminders via SMS, and alerts a caregiver if a dose is missed for more than two hours.</p></div>
            <div><strong style={{ color: TEXT }}>Who it helps:</strong><p style={{ ...p, marginBottom: 0 }}>Elderly patients managing multiple medications. Their families who cannot be present for every dose.</p></div>
            <div><strong style={{ color: TEXT }}>Why it matters:</strong><p style={{ ...p, marginBottom: 0 }}>Missed doses cause thousands of preventable hospital readmissions every year. A consistent reminder system costs pennies per day.</p></div>
            <div><strong style={{ color: TEXT }}>What it needs:</strong><p style={{ ...p, marginBottom: 0 }}>A messaging API (Twilio), a simple schedule database, a PDF reader for prescription documents.</p></div>
          </div>
        </ExampleCard>
        <ExampleCard number="02" title="Discharge Letter Decoder">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 14 }}>
            <div><strong style={{ color: TEXT }}>What it does:</strong><p style={{ ...p, marginBottom: 0 }}>Reads a hospital discharge letter, extracts key action items, and presents them as a plain-language checklist the patient can actually follow.</p></div>
            <div><strong style={{ color: TEXT }}>Who it helps:</strong><p style={{ ...p, marginBottom: 0 }}>Patients and families navigating post-hospital care. Discharge letters are written for clinicians, not patients.</p></div>
            <div><strong style={{ color: TEXT }}>Why it matters:</strong><p style={{ ...p, marginBottom: 0 }}>Failure to follow discharge instructions is a leading cause of 30-day readmission. Most patients do not understand their own letters.</p></div>
            <div><strong style={{ color: TEXT }}>What it needs:</strong><p style={{ ...p, marginBottom: 0 }}>A PDF/document parser, a language model for summarisation, a basic interface for output delivery.</p></div>
          </div>
        </ExampleCard>
        <ExampleCard number="03" title="School Flu Sentinel">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 14 }}>
            <div><strong style={{ color: TEXT }}>What it does:</strong><p style={{ ...p, marginBottom: 0 }}>Monitors public flu incidence data and automatically sends a bulletin to school administrators when regional thresholds are crossed.</p></div>
            <div><strong style={{ color: TEXT }}>Who it helps:</strong><p style={{ ...p, marginBottom: 0 }}>School health coordinators, parents, and public health teams who currently check data manually and inconsistently.</p></div>
            <div><strong style={{ color: TEXT }}>Why it matters:</strong><p style={{ ...p, marginBottom: 0 }}>Early warning gives schools time to implement preventive measures before an outbreak becomes a closure.</p></div>
            <div><strong style={{ color: TEXT }}>What it needs:</strong><p style={{ ...p, marginBottom: 0 }}>A public health data API, email or messaging integration, simple threshold logic.</p></div>
          </div>
        </ExampleCard>
        <ExampleCard number="04" title="Mental Health Check-In Agent">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 14 }}>
            <div><strong style={{ color: TEXT }}>What it does:</strong><p style={{ ...p, marginBottom: 0 }}>Sends daily check-in questions about mood and sleep, tracks trends over time, and shares a weekly summary with a counsellor if patterns suggest distress.</p></div>
            <div><strong style={{ color: TEXT }}>Who it helps:</strong><p style={{ ...p, marginBottom: 0 }}>Students and young adults who would not proactively seek support.</p></div>
            <div><strong style={{ color: TEXT }}>Why it matters:</strong><p style={{ ...p, marginBottom: 0 }}>Early detection of mental health decline dramatically improves outcomes.</p></div>
            <div><strong style={{ color: TEXT }}>What it needs:</strong><p style={{ ...p, marginBottom: 0 }}>A conversational interface, a mood-tracking database, strict privacy controls and explicit consent mechanisms.</p></div>
          </div>
        </ExampleCard>
      </Section>
      <ReflectionPrompt>Which of these four examples connects
      <SlideImage src="/assets/courses/lesson-3-1/slide-2.png" alt="Slide 2" /> most directly to a problem you have personally encountered or witnessed? Describe what you would change or extend to make it more useful for your specific context. Write 3–5 sentences.</ReflectionPrompt>
    </>
  );
}

// ─── Lesson 3.2 ───────────────────────────────────────────────────────────────
function Lesson_3_2() {
  return (
    <>
      <Section title="Research and Science Examples">
        <ExampleCard number="01" title="Weekly Paper Digest">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 14 }}>
            <div><strong style={{ color: TEXT }}>What it does:</strong><p style={{ ...p, marginBottom: 0 }}>Searches Semantic Scholar, arXiv, or PubMed for a specified topic, retrieves the five most-cited papers from the past month, and sends a structured weekly digest with title, abstract summary, and relevance score.</p></div>
            <div><strong style={{ color: TEXT }}>Who it helps:</strong><p style={{ ...p, marginBottom: 0 }}>University applicants, science students, teachers preparing lessons, and researchers who cannot read every new paper.</p></div>
            <div><strong style={{ color: TEXT }}>Why it matters:</strong><p style={{ ...p, marginBottom: 0 }}>Staying current in a fast-moving field is a full-time job. An agent does the triage so the human can do the thinking.</p></div>
            <div><strong style={{ color: TEXT }}>What it needs:</strong><p style={{ ...p, marginBottom: 0 }}>A scientific paper API, a summarisation model, an email delivery tool.</p></div>
          </div>
        </ExampleCard>
        <ExampleCard number="02" title="Contradiction Spotter">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 14 }}>
            <div><strong style={{ color: TEXT }}>What it does:</strong><p style={{ ...p, marginBottom: 0 }}>Given two datasets or papers on the same phenomenon, reads both, identifies claims that appear to contradict each other, and produces a structured comparison noting sample sizes, methods, and divergence points.</p></div>
            <div><strong style={{ color: TEXT }}>Why it matters:</strong><p style={{ ...p, marginBottom: 0 }}>Contradictions in the literature are often where the most interesting science lives — and where the most dangerous misinformation originates.</p></div>
            <div><strong style={{ color: TEXT }}>What it needs:</strong><p style={{ ...p, marginBottom: 0 }}>Document parsing, a reasoning model, a comparison output template.</p></div>
            <div><strong style={{ color: TEXT }}>Who it helps:</strong><p style={{ ...p, marginBottom: 0 }}>Science teachers, students writing literature reviews, journalists covering research.</p></div>
          </div>
        </ExampleCard>
        <ExampleCard number="03" title="Bibliography Builder">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 14 }}>
            <div><strong style={{ color: TEXT }}>What it does:</strong><p style={{ ...p, marginBottom: 0 }}>Accepts a list of URLs, DOIs, or uploaded PDFs. Retrieves metadata, formats citations in the chosen style (APA, MLA, Chicago), checks for duplicates, and exports a ready-to-use bibliography.</p></div>
            <div><strong style={{ color: TEXT }}>Why it matters:</strong><p style={{ ...p, marginBottom: 0 }}>Citation formatting is pure mechanical work. An agent handles it in seconds instead of hours, with fewer errors.</p></div>
            <div><strong style={{ color: TEXT }}>What it needs:</strong><p style={{ ...p, marginBottom: 0 }}>A DOI/metadata API (CrossRef), a citation formatting library, a file export tool.</p></div>
            <div><strong style={{ color: TEXT }}>Who it helps:</strong><p style={{ ...p, marginBottom: 0 }}>Any student writing an academic paper.</p></div>
          </div>
        </ExampleCard>
        <ExampleCard number="04" title="Climate Data Explainer">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 14 }}>
            <div><strong style={{ color: TEXT }}>What it does:</strong><p style={{ ...p, marginBottom: 0 }}>Connected to open climate datasets (NASA, Copernicus, NOAA), answers plain-language questions like 'How has average July temperature in Rome changed since 1980?', generates a chart, and explains the trend accessibly.</p></div>
            <div><strong style={{ color: TEXT }}>Why it matters:</strong><p style={{ ...p, marginBottom: 0 }}>Climate data is publicly available but practically inaccessible to most people without technical skills. An agent closes that gap.</p></div>
            <div><strong style={{ color: TEXT }}>What it needs:</strong><p style={{ ...p, marginBottom: 0 }}>A public climate API, a data visualisation library, a language model for narration.</p></div>
            <div><strong style={{ color: TEXT }}>Who it helps:</strong><p style={{ ...p, marginBottom: 0 }}>Students, teachers, journalists, and curious citizens who cannot interpret raw climate data.</p></div>
          </div>
        </ExampleCard>
      </Section>
      <ReflectionPrompt>Pick one of the four examples and describe a specific dataset
      <SlideImage src="/assets/courses/lesson-3-2/slide-1.png" alt="Slide 1" /> or API it would need that you have not worked with before. How would you find out whether that data is publicly available and freely accessible? Write 2–3 sentences. The data sourcing question is one you will need to answer for your own project in Week 4.</ReflectionPrompt>
    </>
  );
}

// ─── Lesson 4.1 ───────────────────────────────────────────────────────────────
function Lesson_4_1() {
  return (
    <>
      <TrackBadge track="A" />
      <Section title="Before This Session — Pre-Session Requirements">
        <p style={p}>Complete all three before attending. This session is practical — it assumes you have watched the tutorials.</p>
        {[
          { num: "01", label: "Make.com Full Tutorial for Beginners 2026 (~25 min)", desc: "YouTube — search 'Make automation full tutorial 2026'. Watch fully — covers triggers, actions, filters, and scheduling." },
          { num: "02", label: "n8n Quick Start — Build Your First Workflow (~15 min)", desc: "YouTube — search 'n8n quick start workflow'. Focus on understanding nodes, connections, and the canvas layout." },
          { num: "03", label: "n8n AI Agent Tutorial for Beginners (~20 min)", desc: "Optional but highly recommended. YouTube — search 'n8n AI agent tutorial beginners'. Shows the AI node in action." },
        ].map(({ num, label, desc }) => (
          <div key={num} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: TEAL, color: "#fff", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{num}</div>
            <div><strong style={{ color: TEXT, fontSize: 14 }}>{label}</strong><br /><span style={{ fontSize: 13, color: TEXT_MID }}>{desc}</span></div>
          </div>
        ))}
      </Section>
      <Section title="Make vs n8n — How to Choose">
      <SlideImage src="/assets/courses/lesson-4-1/slide-1.png" alt="Slide 1" />
        <ComparisonTable
          headers={["Feature", "Make", "n8n"]}
          rows={[
            ["Learning curve", "Beginner-friendly, polished UI", "Slightly steeper, more technical"],
            ["Integrations", "1,000+ built-in", "400+ plus custom HTTP nodes"],
            ["Free tier", "1,000 operations/month", "Self-hosted free, cloud has limits"],
            ["AI agent features", "Limited", "Strong — dedicated AI agent node"],
            ["Data privacy", "Cloud-only (data leaves machine)", "Self-hosted option available"],
            ["Best for", "Quick integrations, forms, Sheets", "Complex multi-step AI workflows"],
          ]}
        />
        <CalloutBox label="Recommendation" variant="tip">If you are completely new to automation, start with Make — the interface is more forgiving. If your project involves AI reasoning or multi-step logic, n8n gives you more control.</CalloutBox>
      </Section>
      <Section title="Your First Trigger — Step by Step">
      <SlideImage src="/assets/courses/lesson-4-1/slide-2.png" alt="Slide 2" />
        <p style={p}>By the end of this session, you must have one working trigger connected to at least one action. Here is the minimum viable workflow for a student project:</p>
        {["Create a free account on Make.com or n8n.io", "Create a new scenario/workflow", "Add a trigger — a Webhook, a Schedule, or a Google Sheets 'New Row' trigger", "Add one action — send an email, write to a Google Sheet, or post a Slack message", "Run the trigger manually and verify the action fires", "Screenshot the workflow canvas and paste in your project log"].map((step, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: NAVY, color: "#fff", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
            <div style={{ fontSize: 14, color: TEXT_MID, paddingTop: 2 }}>{step}</div>
          </div>
        ))}
      </Section>
      <ReflectionPrompt>After completing your first trigger
      <SlideImage src="/assets/courses/lesson-4-1/slide-3.png" alt="Slide 3" />: What did you build? What was harder than you expected? What would you want your agent to do next if you had one more hour? Write 3–4 sentences in your project log.</ReflectionPrompt>
    </>
  );
}

// ─── Lesson 4.2 ───────────────────────────────────────────────────────────────
function Lesson_4_2() {
  return (
    <>
      <TrackBadge track="B" />
      <Section title="Before This Session — Pre-Session Requirements">
        {[
          { num: "01", label: "OpenClaw Full Tutorial for Beginners — Step by Step (~30 min)", desc: "Search YouTube: 'OpenClaw full tutorial beginners'. Core tutorial covering installation, onboarding, skills, and Telegram connection. Watch fully." },
          { num: "02", label: "The Ultimate Beginner's Guide to OpenClaw (written)", desc: "freecodecamp.org — Written companion tutorial, useful to reference during setup. Read before the session." },
          { num: "03", label: "VSCode for Beginners (~15 min)", desc: "Search YouTube: 'VSCode beginners tutorial 2025'. Essential if new to VSCode — covers workspace, terminal, and extensions." },
        ].map(({ num, label, desc }) => (
          <div key={num} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#4A7DFF", color: "#fff", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{num}</div>
            <div><strong style={{ color: TEXT, fontSize: 14 }}>{label}</strong><br /><span style={{ fontSize: 13, color: TEXT_MID }}>{desc}</span></div>
          </div>
        ))}
      </Section>
      <Section title="What Is OpenClaw?">
      <SlideImage src="/assets/courses/lesson-4-2/slide-1.png" alt="Slide 1" />
        <p style={p}>OpenClaw is an open-source personal AI agent platform. Unlike cloud-only tools, it runs on your own machine — which means your data stays private, it works offline, and you have full control over what it does and what it can access. You interact with it through Telegram, giving you a conversational interface from day one without needing to build any front end.</p>
        {[
          ["Personal AI Agent", "A persistent agent that lives on your machine. You talk to it through Telegram. It remembers context, follows instructions, and can be given new capabilities."],
          ["Skills System", "Capabilities are added as 'skills' — small Python modules that give the agent new tools. The ClawHub marketplace has community-built skills you can install."],
          ["Privacy by Default", "Because OpenClaw runs locally, your data stays on your machine. For student projects involving sensitive data, this is a meaningful advantage over cloud-only tools."],
          ["Telegram Interface", "You interact with your agent through a private Telegram bot. No need to build a UI — focus on the agent logic."],
        ].map(([title, desc]) => (
          <div key={title as string} style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: TEXT, fontSize: 14, marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: 14, color: TEXT_MID }}>{desc}</div>
          </div>
        ))}
      </Section>
      <Section title="Session Deliverables">
      <SlideImage src="/assets/courses/lesson-4-2/slide-2.png" alt="Slide 2" />
        {["Install OpenClaw and complete the onboarding wizard", "Connect to a private Telegram bot", "Install one skill from ClawHub relevant to your project domain", "Set a domain-specific system prompt for your agent", "Send your agent a domain-relevant test message and screenshot the response"].map((step, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#4A7DFF", color: "#fff", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
            <div style={{ fontSize: 14, color: TEXT_MID, paddingTop: 2 }}>{step}</div>
          </div>
        ))}
      </Section>
      <ReflectionPrompt>After your first Telegram conversation
      <SlideImage src="/assets/courses/lesson-4-2/slide-3.png" alt="Slide 3" /> with your agent: What skill did you install and why? What was the agent's response to your domain-specific test message? What would you want it to do differently? Write 3–4 sentences.</ReflectionPrompt>
    </>
  );
}

// ─── Lesson 4.3 ───────────────────────────────────────────────────────────────
function Lesson_4_3() {
  return (
    <>
      <TrackBadge track="C" />
      <Section title="Before This Session — Pre-Session Requirements">
        {[
          { num: "01", label: "Agentic AI Tutorial using Agno — Krish Naik (~45 min)", desc: "YouTube — search 'Krish Naik Agno agentic AI tutorial'. Most comprehensive single resource. Essential." },
          { num: "02", label: "Agno AI Agent Tutorial Playlist (official) (~60 min)", desc: "youtube.com/playlist?list=PL3JVwFmb_BnTItOu5wk67Vb2lrp2zMb2o — Official playlist. Dip into specific videos relevant to your project." },
          { num: "03", label: "VSCode Python Setup for Beginners (~15 min)", desc: "YouTube — search 'VSCode Python setup 2025'. Essential if new to VSCode — covers Python interpreter, terminal, virtual environments." },
        ].map(({ num, label, desc }) => (
          <div key={num} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#9B59B6", color: "#fff", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{num}</div>
            <div><strong style={{ color: TEXT, fontSize: 14 }}>{label}</strong><br /><span style={{ fontSize: 13, color: TEXT_MID }}>{desc}</span></div>
          </div>
        ))}
      </Section>
      <Section title="What Is Agno?">
      <SlideImage src="/assets/courses/lesson-4-3/slide-1.png" alt="Slide 1" />
        <p style={p}>Agno is a Python framework for building, running, and managing agentic software — from a single agent to multi-agent teams. It is lightweight, model-agnostic, and built around four core concepts.</p>
        <ComparisonTable
          headers={["Concept", "What It Is"]}
          rows={[
            [<strong key="a">Agent</strong>, "The core unit. An Agent has a model, a set of tools, optional memory, and instructions. You instantiate it in Python and call agent.print_response() to run it."],
            [<strong key="t">Tool</strong>, "A Python function the agent can call. The @tool decorator turns any function into something the agent can use — web search, database query, API call."],
            [<strong key="m">Memory</strong>, "Agents can store and retrieve information across sessions. SQLite for local development, PostgreSQL for production."],
            [<strong key="ao">AgentOS</strong>, "The runtime that manages agents, tools, and sessions. Makes agents composable — you can build multi-agent pipelines where agents call each other."],
          ]}
        />
      </Section>
      <Section title="Your First Agno Agent — 10 Lines">
      <SlideImage src="/assets/courses/lesson-4-3/slide-2.png" alt="Slide 2" />
        <p style={p}>This is the complete code for a working agent with web search capability. Every line is annotated.</p>
        <CodeBlock>{`# Install first: pip install agno anthropic
from agno.agent import Agent
from agno.models.anthropic import Claude
from agno.tools.duckduckgo import DuckDuckGoTools

agent = Agent(
    model=Claude(id='claude-sonnet-4-6'),
    tools=[DuckDuckGoTools()],
    instructions=['Search the web and answer accurately'],
    show_tool_calls=True,
)

agent.print_response('What is Agno?', stream=True)`}</CodeBlock>
        <CalloutBox label="Session Deliverable" variant="tip">Run this agent from your terminal. Modify the instructions to match your project domain. Screenshot the output. Paste in your project log as environment setup proof.</CalloutBox>
      </Section>
      <ReflectionPrompt>After running your first Agno agent
      <SlideImage src="/assets/courses/lesson-4-3/slide-3.png" alt="Slide 3" />: What did it return? What would you need to change about the model, tools, or instructions to make it useful for your specific project? Write 3–4 sentences in your project log.</ReflectionPrompt>
    </>
  );
}

// ─── Lesson 4.4 ───────────────────────────────────────────────────────────────
function Lesson_4_4() {
  return (
    <>
      <Section title="Project Idea Brief Workshop">
        <p style={p}>This is the final session of Phase 2. By the end, every team will have submitted a completed one-page Project Idea Brief. Submitting the brief is not the end of Week 4 — it is the beginning of Phase 3.</p>
        <CalloutBox label="Team Size">2–4 students per team. Solo projects are permitted only with mentor approval. Mixed-track teams are allowed — a Track A student and a Track C student can collaborate if the project suits both skill levels.</CalloutBox>
      </Section>
      <Section title="The Project Idea Brief — Six Sections">
      <SlideImage src="/assets/courses/lesson-4-4/slide-1.png" alt="Slide 1" />
        <p style={p}>One page. Fill every section before submitting. Incomplete briefs are returned.</p>
        {[
          { num: "01", title: "The Problem", desc: "What specific problem are you solving? Who has it? How often? What happens when it is not solved?" },
          { num: "02", title: "The Agent", desc: "Describe what the agent does step by step — like a recipe. What does it perceive, plan, use, remember, and check?" },
          { num: "03", title: "The Domain", desc: "Healthcare · Research · Personal assistant · Other (specify). Why this domain for your team?" },
          { num: "04", title: "Data and Tools", desc: "What data sources will the agent need? What APIs or tools? Are these publicly available?" },
          { num: "05", title: "Success Metric", desc: "How will you know the agent is working? What does good output look like vs bad output? Be specific and measurable." },
          { num: "06", title: "Ethical Consideration", desc: "Name one ethical concern your agent raises and describe one design decision you will make to address it." },
        ].map(({ num, title, desc }) => (
          <div key={num} style={{ display: "flex", gap: 16, padding: "14px 0", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: TEAL, color: "#fff", fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "'Sora', sans-serif" }}>{num}</div>
            <div>
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 14, color: TEXT_MID }}>{desc}</div>
            </div>
          </div>
        ))}
      </Section>
      <ReflectionPrompt>Before submitting your brief
      <SlideImage src="/assets/courses/lesson-4-4/slide-2.png" alt="Slide 2" /> — answer this honestly: Is the problem you are solving specific enough that you could describe the exact person who has it and how often they encounter it? If not, your problem statement needs sharpening before submission.</ReflectionPrompt>
    </>
  );
}

// ─── Lesson 5.1 ───────────────────────────────────────────────────────────────
function Lesson_5_1() {
  return (
    <>
      <Section title="Why Architecture Comes First">
        {[
          ["Starting without a plan costs more time, not less.", "When you code before designing, you hit decision points you have not thought through. You stop, backtrack, redesign. The architecture sketch is faster than the debugging session it prevents."],
          ["Ethical decisions must be made at design time.", "Where does the human review step sit? What data does the agent actually need? What happens if it fails? These cannot be bolted on after the agent is built."],
          ["The sketch is the contract with your mentor.", "Your mentor can give very useful feedback on a diagram that shows data flow, tools, memory stores, and decision points. They cannot give useful feedback on code they have not seen."],
        ].map(([title, desc]) => (
          <div key={title as string} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: `1px solid ${BORDER}` }}>
            <span style={{ color: TEAL, fontWeight: 700, flexShrink: 0, fontSize: 18 }}>→</span>
            <div><strong style={{ color: TEXT, fontSize: 14 }}>{title}</strong><p style={{ ...p, marginBottom: 0, marginTop: 4 }}>{desc}</p></div>
          </div>
        ))}
      </Section>
      <Section title="The Five Architecture Questions">
      <SlideImage src="/assets/courses/lesson-5-1/slide-1.png" alt="Slide 1" />
        <p style={p}>Answer these before opening VSCode, Make, or n8n.</p>
        {[
          ["Q1 — What does the agent perceive?", "List every input: file types, API responses, user messages, database records, web content. If it is not in this list, the agent cannot act on it."],
          ["Q2 — What decisions does it make?", "Map the decision tree. If X then Y, if not X then Z. Where does a human need to approve? Where does the agent decide alone?"],
          ["Q3 — What tools does it call, and in what order?", "Name every API, database query, or external service. Define the sequence. Define what happens if a tool call fails."],
          ["Q4 — What does it need to remember?", "Session context vs long-term memory. What does the agent need to know from last time? How is that stored and retrieved?"],
          ["Q5 — Where does the feedback loop sit?", "What does the agent check before considering a task complete? What triggers a retry? What escalates to a human?"],
        ].map(([q, a]) => (
          <div key={q as string} style={{ padding: "14px 0", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 700, color: TEAL, marginBottom: 6 }}>{q}</div>
            <div style={{ fontSize: 14, color: TEXT_MID }}>{a}</div>
          </div>
        ))}
      </Section>
      <Section title="Common Architecture Mistakes">
      <SlideImage src="/assets/courses/lesson-5-1/slide-2.png" alt="Slide 2" />
        {[
          ["Starting with the tool, not the problem.", "'We will use n8n because we know it.' Wrong starting point. Start with the problem and choose the tool that fits."],
          ["No human checkpoint in high-stakes outputs.", "Any agent that communicates with real users about health, money, or legal matters must have a human review step before output is delivered."],
          ["Memory as an afterthought.", "If your agent needs to compare today's data with last week's, the memory store must be in the architecture from day one."],
          ["No failure path.", "Every tool call can fail. Every API has rate limits. Design what happens when things go wrong before they go wrong."],
        ].map(([mistake, fix]) => (
          <div key={mistake as string} style={{ padding: "12px 16px", background: "#FFF8E6", borderRadius: 8, marginBottom: 10, borderLeft: `3px solid #F0A500` }}>
            <div style={{ fontWeight: 700, color: "#7D5A00", fontSize: 14, marginBottom: 4 }}>⚠ {mistake}</div>
            <div style={{ fontSize: 13, color: TEXT_MID }}>{fix}</div>
          </div>
        ))}
      </Section>
      <ReflectionPrompt>Answer the five architecture questions
      <SlideImage src="/assets/courses/lesson-5-1/slide-3.png" alt="Slide 3" /> for your project. Write your answers in your project log. If you cannot answer any of them — that is the gap your mentor needs to know about. Bring unanswered questions to your architecture review.</ReflectionPrompt>
    </>
  );
}

// ─── Lesson 5.2 ───────────────────────────────────────────────────────────────
function Lesson_5_2() {
  return (
    <>
      <Section title="Session Deliverable — All Tracks">
        <CalloutBox label="What You Must Complete Today" variant="tip">One successful test run connected to your actual project domain, with a screenshot in your project log. The environment must be set up for your project — not a generic test.</CalloutBox>
      </Section>
      <Section title="Track A — Make / n8n: Project Scenario Setup">
      <SlideImage src="/assets/courses/lesson-5-2/slide-1.png" alt="Slide 1" />
        <TrackBadge track="A" />
        {["Open your Make scenario or n8n workflow. Start a new scenario/workflow specifically for your project — not the test one from Week 4. Name it clearly.", "Connect your data source. Add your first trigger or data input node. Connect it now and verify it returns data.", "Add a placeholder for each action in your architecture. Do not wire logic yet — just add empty action nodes matching your architecture sketch.", "Test trigger with live data. Run the trigger manually. Confirm real data flows through.", "Screenshot and log. Screenshot the workflow canvas with nodes connected. Paste in your project log as environment setup proof."].map((step, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: TEAL, color: "#fff", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
            <div style={{ fontSize: 14, color: TEXT_MID, paddingTop: 2 }}>{step}</div>
          </div>
        ))}
      </Section>
      <Section title="Track B — OpenClaw / Hermes Agent: Project Agent Configuration">
      <SlideImage src="/assets/courses/lesson-5-2/slide-2.png" alt="Slide 2" />
        <TrackBadge track="B" />
        {["Create a project folder in VSCode named after your project.", "Set a domain-specific system prompt. Edit your agent's system prompt to match your project domain. Be specific — it affects every response.", "Install one relevant skill from ClawHub. Review the source code before installing. Connect and test via Telegram.", "Create a .env file for API keys. Never commit this file to GitHub — add .env to .gitignore.", "Send a domain-specific test message. Ask your agent something relevant to your project. Screenshot the conversation."].map((step, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#4A7DFF", color: "#fff", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
            <div style={{ fontSize: 14, color: TEXT_MID, paddingTop: 2 }}>{step}</div>
          </div>
        ))}
      </Section>
      <Section title="Track C — Agno: Project Agent Setup in VSCode">
      <SlideImage src="/assets/courses/lesson-5-2/slide-3.png" alt="Slide 3" />
        <TrackBadge track="C" />
        {["Create a new project folder in VSCode. This is where all code, configuration, and logs will live.", "Create a virtual environment: python -m venv venv. Activate it. Install Agno: pip install agno.", "Create a .env file with your ANTHROPIC_API_KEY. Add .env to .gitignore.", "Write your project agent file. Start from the 10-line template from Lesson 4.3. Modify the model, tools, and instructions to match your project domain.", "Run a domain-specific test prompt. Screenshot the terminal output showing the agent's response. Paste in your project log."].map((step, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#9B59B6", color: "#fff", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
            <div style={{ fontSize: 14, color: TEXT_MID, paddingTop: 2 }}>{step}</div>
          </div>
        ))}
      </Section>
      <ReflectionPrompt>After your environment session
      <SlideImage src="/assets/courses/lesson-5-2/slide-4.png" alt="Slide 4" />: What worked on the first try? What took longer than expected? Is there any part of your architecture that you now realise you cannot implement with your chosen track? If yes — flag it to your mentor before Week 6.</ReflectionPrompt>
    </>
  );
}

// ─── Lesson 6.1 ───────────────────────────────────────────────────────────────
function Lesson_6_1() {
  return (
    <>
      <Section title="What Counts as a Working Prototype?">
        {[
          { label: "ACCEPTED ✓", title: "Hardcoded Responses", desc: "Agent responds correctly to one specific input using a fixed answer. Proves the pipeline works end to end, even without real logic.", color: "#276749", bg: "#F0FFF4" },
          { label: "ACCEPTED ✓", title: "Simulated Data", desc: "Agent uses a mock dataset or sample API response instead of live data. Valid until the real data source is connected.", color: "#276749", bg: "#F0FFF4" },
          { label: "ACCEPTED ✓", title: "Partial Functionality", desc: "Agent handles one of the three planned scenarios correctly. The others are placeholders. This is exactly what Week 7 is for.", color: "#276749", bg: "#F0FFF4" },
          { label: "NOT ACCEPTED ✗", title: "Nothing Running", desc: "A plan, a diagram, a description of what the agent will do. These are not prototypes. A prototype must execute.", color: "#9B2335", bg: "#FFF5F5" },
        ].map(({ label, title, desc, color, bg }) => (
          <div key={title} style={{ background: bg, borderRadius: 10, padding: "14px 18px", marginBottom: 10, borderLeft: `4px solid ${color}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color, marginBottom: 4 }}>{label}</div>
            <div style={{ fontWeight: 700, color: TEXT, fontSize: 14, marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: 14, color: TEXT_MID }}>{desc}</div>
          </div>
        ))}
      </Section>
      <Section title="Five Build Principles — All Tracks">
      <SlideImage src="/assets/courses/lesson-6-1/slide-1.png" alt="Slide 1" />
        {[
          ["01 — Build the happy path first.", "Get the single most important scenario working end to end before adding any other feature. One complete path beats three half-paths."],
          ["02 — One component at a time.", "Get the trigger working. Test it. Then add the first action. Test it. Then add the second. Do not wire everything and test at the end."],
          ["03 — Hardcode to unblock yourself.", "If an API is not connected yet, hardcode a sample response and keep building. Remove the hardcode later. Do not let a missing integration stop the whole build."],
          ["04 — Log everything.", "Every successful step deserves a comment, a log line, or a screenshot. When something breaks, your logs tell you where it broke."],
          ["05 — Define done before you start.", "What does 'working' mean for your agent? Write it down before you start building. 'The agent reads a CSV and returns the three highest-revenue regions' is a definition of done. 'The agent works' is not."],
        ].map(([title, desc]) => (
          <div key={title as string} style={{ padding: "14px 0", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 700, color: TEAL, marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: 14, color: TEXT_MID }}>{desc}</div>
          </div>
        ))}
      </Section>
      <ReflectionPrompt>At the end of this build session
      <SlideImage src="/assets/courses/lesson-6-1/slide-2.png" alt="Slide 2" />: Write two sentences describing exactly what your prototype does right now — not what it will do, what it does. Then write one sentence describing the next specific thing you need to add. Add both to your project log.</ReflectionPrompt>
    </>
  );
}

// ─── Lesson 6.2 ───────────────────────────────────────────────────────────────
function Lesson_6_2() {
  return (
    <>
      <Section title="Mid-Build Ethics Checklist">
        <p style={p}>Answer each question honestly. If the answer is 'I don't know' — that is a red flag to address before Week 8.</p>
        {[
          ["Privacy", "What personal or sensitive data does the agent access? Who explicitly consented to it being used? How is it stored? How long is it retained?"],
          ["Bias", "What training data or assumptions does the agent rely on? Which groups could be systematically disadvantaged by its outputs? Have you tested for this?"],
          ["Transparency", "Can a user understand what the agent did and why? If your agent sends a message or makes a recommendation — can the affected person request an explanation?"],
          ["Accountability", "Who is responsible when the agent makes a mistake? Is that person named in your documentation? Do they have a way to be alerted and override?"],
        ].map(([dim, question]) => (
          <div key={dim as string} style={{ padding: "14px 16px", background: "#F7F9FC", borderRadius: 8, marginBottom: 10, borderLeft: `3px solid ${NAVY}` }}>
            <div style={{ fontWeight: 700, color: NAVY, fontSize: 14, marginBottom: 6 }}>{dim}</div>
            <div style={{ fontSize: 14, color: TEXT_MID }}>{question}</div>
          </div>
        ))}
      </Section>
      <Section title="Your Project README — Six Required Sections">
      <SlideImage src="/assets/courses/lesson-6-2/slide-1.png" alt="Slide 1" />
        <p style={p}>Start it now. Add to it every session. Your final README is part of the assessed submission.</p>
        {[
          ["01 — Project name and one-sentence description.", "What does this agent do, for whom, in one sentence. If you cannot write this sentence, the project scope is still unclear."],
          ["02 — The problem being solved.", "Two to three sentences. Who has this problem? What currently happens without the agent? Why does it matter?"],
          ["03 — How the agent works — step by step.", "Like a recipe. Input → processing → output. Name every tool called. Name every decision point."],
          ["04 — Data sources and APIs used.", "Name every data source. Note whether it is live or simulated. Note the API terms of service — some prohibit commercial use."],
          ["05 — Known limitations and edge cases.", "What does the agent not handle? What inputs break it? What assumptions is it making?"],
          ["06 — Ethics review.", "Privacy, bias, transparency, accountability — each with a named concern and a specific design decision you made to address it."],
        ].map(([title, desc]) => (
          <div key={title as string} style={{ display: "flex", gap: 16, padding: "12px 0", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 700, color: TEAL, minWidth: 36 }}>{(title as string).split(" — ")[0]}</div>
            <div>
              <div style={{ fontWeight: 700, color: TEXT, fontSize: 14, marginBottom: 3 }}>{(title as string).split(" — ")[1]}</div>
              <div style={{ fontSize: 13, color: TEXT_MID }}>{desc}</div>
            </div>
          </div>
        ))}
      </Section>
      <ReflectionPrompt>Complete sections 01–04 of your README
      <SlideImage src="/assets/courses/lesson-6-2/slide-2.png" alt="Slide 2" /> today. For section 03, write the step-by-step description as if explaining it to someone who has never heard of your project. If you cannot explain it simply, the design is not clear enough yet.</ReflectionPrompt>
    </>
  );
}

// ─── Lesson 7.1 ───────────────────────────────────────────────────────────────
function Lesson_7_1() {
  return (
    <>
      <Section title="How to Prepare for Your Mentor Session">
        <CalloutBox label="Rule">Come with three specific questions. Not 'is this good?' — that is not a question. 'We cannot get the API to return data when the input contains special characters — here is the error we are seeing' is a question.</CalloutBox>
        {[
          ["Have your demo ready.", "Run your prototype before the call. Know what works and what does not. Be ready to share your screen and show it live."],
          ["Bring three specific questions.", "Name every question in advance. The more specific the question, the more useful the answer."],
          ["Know your biggest blocker.", "The single biggest obstacle between your current prototype and a demo-ready version. Name it before the call, not during it."],
          ["What not to do.", "Do not spend the first 15 minutes explaining the project. Your mentor has read your brief and README. Start at the problem, not the backstory."],
        ].map(([title, desc]) => (
          <div key={title as string} style={{ padding: "12px 0", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ fontWeight: 700, color: TEXT, fontSize: 14, marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: 14, color: TEXT_MID }}>{desc}</div>
          </div>
        ))}
      </Section>
      <Section title="What Your Mentor Is Looking For — Four Lenses">
      <SlideImage src="/assets/courses/lesson-7-1/slide-1.png" alt="Slide 1" />
        {[
          ["Scope realism.", "Is what you are trying to build achievable in two weeks? Mentors often help teams cut features that are not essential to the core demo — and this almost always makes the final product stronger."],
          ["Technical unblocking.", "What is the hardest technical problem you are facing? Mentors can suggest approaches, libraries, or workarounds."],
          ["Ethics gaps.", "Has the ethics checklist revealed anything that needs a design change? Mentors flag concerns that may affect the final submission before they become unfixable."],
          ["Pitch readiness.", "Can you explain what the agent does in 30 seconds? Can you show it doing something real? If not — this is the moment to think about final presentation."],
        ].map(([title, desc]) => (
          <div key={title as string} style={{ padding: "12px 16px", background: "#F7F9FC", borderRadius: 8, marginBottom: 10 }}>
            <div style={{ fontWeight: 700, color: NAVY, fontSize: 14, marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: 14, color: TEXT_MID }}>{desc}</div>
          </div>
        ))}
      </Section>
      <ReflectionPrompt>After the mentor session
      <SlideImage src="/assets/courses/lesson-7-1/slide-2.png" alt="Slide 2" />: Update your architecture sketch to reflect any scope changes discussed. Document one specific decision you changed as a result of mentor feedback — and why. Set your Week 7–8 milestones in your project log within 24 hours of the call.</ReflectionPrompt>
    </>
  );
}

// ─── Lesson 7.2 ───────────────────────────────────────────────────────────────
function Lesson_7_2() {
  return (
    <>
      <Section title="How Agents Fail — And What to Do About It">
        {[
          ["Input failure.", "User provides input the agent was not designed for — wrong language, wrong format, unexpected characters.", "Validate inputs early. Return a helpful error message. Never let unexpected input reach core logic without sanitisation."],
          ["Tool failure.", "An API returns an error, rate limit, or timeout.", "Wrap every tool call in error handling. Log the failure. Retry with backoff. If retries fail — escalate to a human or return a clear failure message."],
          ["Logic failure.", "The agent reaches a decision point where none of the expected conditions are met.", "Add a default case to every decision branch. Always return something — even 'I was not able to handle this request, here is why.'"],
          ["Output failure.", "The agent produces a response that is technically valid but factually wrong or harmful.", "Add a verification step before final output is delivered. For high-stakes domains, require human review before the output reaches the end user."],
        ].map(([type, cause, fix]) => (
          <div key={type as string} style={{ padding: "14px 16px", background: "#FFF8E6", borderRadius: 8, marginBottom: 10, borderLeft: `3px solid #F0A500` }}>
            <div style={{ fontWeight: 700, color: "#7D5A00", fontSize: 14, marginBottom: 4 }}>{type}</div>
            <div style={{ fontSize: 13, color: TEXT_MID, marginBottom: 6 }}><strong>What happens:</strong> {cause}</div>
            <div style={{ fontSize: 13, color: TEXT_MID }}><strong>Fix:</strong> {fix}</div>
          </div>
        ))}
      </Section>
      <Section title="The Five Edge Case Tests">
      <SlideImage src="/assets/courses/lesson-7-2/slide-1.png" alt="Slide 1" />
        <p style={p}>Run all five. Document results honestly in your project log.</p>
        {[
          ["T1 — Empty input.", "What happens when the user sends nothing, or just whitespace? Does the agent crash, loop, or return a helpful message?"],
          ["T2 — Unexpected format.", "If the agent expects a date — what happens when it receives 'Tuesday'? If it expects English — what happens when it receives Italian?"],
          ["T3 — Adversarial input.", "What if a user asks the agent to do something it is not supposed to do? Does it refuse gracefully or produce harmful output?"],
          ["T4 — Tool unavailable.", "Disconnect the API or simulate a 503 error. Does the agent fail silently, crash, or return a useful error message?"],
          ["T5 — Correct input, wrong result.", "Give the agent a valid input where you already know the correct answer. Does it get it right? If not — is the error predictable?"],
        ].map(([test, desc]) => (
          <div key={test as string} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ minWidth: 90, fontWeight: 700, color: TEAL, fontSize: 13 }}>{test}</div>
            <div style={{ fontSize: 14, color: TEXT_MID }}>{desc}</div>
          </div>
        ))}
        <KeyInsight>You do not need to fix all failures — but you must document all of them honestly. The edge case test results become the testing section of your final README.</KeyInsight>
      </Section>
      <ReflectionPrompt>Run all five edge case tests
      <SlideImage src="/assets/courses/lesson-7-2/slide-2.png" alt="Slide 2" /> on your prototype. For each test, document: the input you used, what the agent returned, whether this is acceptable behaviour or a bug to fix, and if it is a bug — what you will do about it before Week 8. Add all results to your project log.</ReflectionPrompt>
    </>
  );
}

// ─── Lesson 8.1 ───────────────────────────────────────────────────────────────
function Lesson_8_1() {
  return (
    <>
      <Section title="The Final Scope Decision">
        <p style={p}>You have two weeks of build time left. Make the scope decision now — not in Week 10.</p>
        {[
          ["What must be in the demo?", "The single most important thing your agent does — the one scenario that proves the concept. This is non-negotiable. Everything else is optional."],
          ["What should be in the demo?", "One or two additional scenarios that show range or depth. Include these only if the core scenario is already stable and tested."],
          ["What can be cut?", "Everything that is not the above. Cut it. Document it as 'planned for future development.' A cut feature you document is not a failure — it is mature scope management."],
        ].map(([q, a]) => (
          <div key={q as string} style={{ padding: "14px 16px", background: "#F7F9FC", borderRadius: 8, marginBottom: 10 }}>
            <div style={{ fontWeight: 700, color: NAVY, fontSize: 14, marginBottom: 6 }}>{q}</div>
            <div style={{ fontSize: 14, color: TEXT_MID }}>{a}</div>
          </div>
        ))}
      </Section>
      <Section title="Recording Your Final Demo">
      <SlideImage src="/assets/courses/lesson-8-1/slide-1.png" alt="Slide 1" />
        <p style={p}>Three minutes maximum. Show the agent working. Narrate what it is doing and why it matters.</p>
        {[
          ["01 — State the problem in one sentence.", "'This agent solves X for Y.' Say it before showing anything."],
          ["02 — Show the agent receiving a real input.", "Not a test input. The kind of input the real user would actually provide."],
          ["03 — Narrate what the agent is doing.", "'It is now calling the API... reading the response...' Never let the agent work in silence."],
          ["04 — Show the output and explain why it is correct.", "'Notice it correctly identified the region and included the recommended actions.'"],
          ["05 — Acknowledge one known limitation.", "'It currently only works in English — we plan to add Italian language support.' Honesty builds more trust than hiding flaws."],
        ].map(([step, desc]) => (
          <div key={step as string} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ minWidth: 40, fontWeight: 700, color: TEAL, fontSize: 13 }}>{(step as string).split(" — ")[0]}</div>
            <div>
              <strong style={{ color: TEXT, fontSize: 14 }}>{(step as string).split(" — ")[1]}</strong>
              <p style={{ ...p, marginBottom: 0, marginTop: 3 }}>{desc}</p>
            </div>
          </div>
        ))}
      </Section>
      <ReflectionPrompt>Write your scope decision
      <SlideImage src="/assets/courses/lesson-8-1/slide-2.png" alt="Slide 2" /> in your project log now: What is in the demo? What is cut? Record your demo this week. Watch it back once before submitting — the best demos are the ones where the builder clearly understands the limitations.</ReflectionPrompt>
    </>
  );
}

// ─── Lesson 8.2 ───────────────────────────────────────────────────────────────
function Lesson_8_2() {
  return (
    <>
      <Section title="The Ethics Rubric — What Reviewers Will Read">
        <p style={p}>This is the same rubric mentors and reviewers use. Read it before writing your final ethics section.</p>
        <ComparisonTable
          headers={["Dimension", "Marks", "What It Requires"]}
          rows={[
            ["Identification", "0–1", "Name at least two specific ethical concerns that apply to your agent. Generic statements ('AI can be biased') do not count. Specifics do ('our agent trained on English data may fail for non-native speakers')."],
            ["Analysis", "0–2", "Explain why each concern matters in your specific context. Consider the actual users, not hypothetical ones."],
            ["Design Response", "0–1", "For each concern — describe a specific design decision you made to address it. 'We thought about it' is not a design response. 'We added a human review step before any message is sent to a patient' is."],
            ["Honest Limitations", "0–1", "Acknowledge what you could not fix within the time and scope — and what you would address next if you had more time."],
          ]}
        />
      </Section>
      <Section title="Phase 3 Complete — You Built Something Real">
      <SlideImage src="/assets/courses/lesson-8-2/slide-1.png" alt="Slide 1" />
        <p style={p}>Four weeks ago you had an idea. Now you have a working prototype with documentation and ethics review.</p>
        {[
          "A working prototype — demonstrated in a recorded video",
          "A project README covering problem, mechanism, data, limitations",
          "An ethics review with identified concerns, design responses, and honest limits",
          "Five documented edge case tests showing how the agent handles unexpected inputs",
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 10, fontSize: 14, color: TEXT_MID, padding: "6px 0" }}>
            <span style={{ color: TEAL, fontWeight: 700 }}>✓</span>{item}
          </div>
        ))}
        <KeyInsight>You do not need a perfect agent. You need an honest one — one whose limitations are named, whose design decisions are justified, and whose outputs are demonstrably real.</KeyInsight>
      </Section>
      <ReflectionPrompt>Write your final ethics review
      <SlideImage src="/assets/courses/lesson-8-2/slide-2.png" alt="Slide 2" /> using the four dimensions: Identification, Analysis, Design Response, and Honest Limitations. For each dimension, write 2–3 sentences. Add it to your README before final submission.</ReflectionPrompt>
    </>
  );
}

// ─── Course Closing ───────────────────────────────────────────────────────────
function CourseClosing() {
  return (
    <>
      <Section title="What You Have Learned Across Ten Weeks">
        {[
          { phase: "Phase 1 — Foundation (Weeks 1–2)", items: ["What AI agents are and how they differ from chatbots", "The five components of every agent: perception, planning, tool use, memory, feedback loop", "How LLMs work internally — tokenisation, transformers, parameters", "Online vs local model hosting — APIs and Ollama", "AI ethics and accountability — privacy, bias, transparency"] },
          { phase: "Phase 2 — Exploration (Weeks 3–4)", items: ["12 worked agent examples across healthcare, research, and personal assistant domains", "How to choose between Make, n8n, OpenClaw/Hermes, and Agno for your project", "How to write a one-page Project Idea Brief that defines a real problem", "The infrastructure vs application layer distinction"] },
          { phase: "Phase 3 — Build (Weeks 5–8)", items: ["How to design an agent architecture before writing a single line", "How to build a working prototype iteratively — happy path first", "How to document a project README that is useful to others", "How to run edge case tests and document failures honestly", "How to write an ethics review that goes beyond generic statements"] },
          { phase: "Phase 4 — Showcase (Weeks 9–10)", items: ["How to record a compelling 3-minute demo", "How to present your work to a real audience", "How to receive and incorporate feedback on a live prototype"] },
        ].map(({ phase, items }) => (
          <div key={phase} style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${BORDER}` }}>{phase}</div>
            {items.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 10, fontSize: 14, color: TEXT_MID, padding: "3px 0" }}>
                <span style={{ color: TEAL, flexShrink: 0 }}>✓</span>{item}
              </div>
            ))}
          </div>
        ))}
      </Section>
      <Section title="What to Submit">
      <SlideImage src="/assets/courses/course-closing/slide-1.png" alt="Slide 1" />
        <p style={p}>To receive your certificate, submit all four deliverables through the portal before the deadline.</p>
        {[
          ["01", "Working Agent Prototype", "A link to your GitHub repository or a ZIP file containing all project files. The prototype must be runnable — include a README with setup instructions."],
          ["02", "Demo Recording", "A 2–5 minute screen recording showing the agent working with real input. Upload to YouTube (unlisted) or Google Drive and include the link."],
          ["03", "Project README", "The six-section README completed during Phases 2 and 3. Minimum 400 words. Include your edge case test results."],
          ["04", "Ethics Review", "The four-dimension ethics review. This is assessed separately from the README — submit it as a standalone section or document."],
        ].map(({ "0": num, "1": title, "2": desc }) => (
          <div key={num} style={{ display: "flex", gap: 16, padding: "14px 0", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: TEAL, color: "#fff", fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "'Sora', sans-serif" }}>{num}</div>
            <div>
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 14, color: TEXT_MID }}>{desc}</div>
            </div>
          </div>
        ))}
      </Section>
      <Section title="Launch Pathways">
      <SlideImage src="/assets/courses/course-closing/slide-2.png" alt="Slide 2" />
        <p style={p}>The best projects are selected for the Launch Pathway during the course closing session. Five options are available.</p>
        {[
          ["Incubator Referral", "Introduction to a bioERGOtech partner incubator for projects with commercial potential."],
          ["IP Briefing", "A session with a legal professional covering your options for protecting, licensing, or open-sourcing your work."],
          ["Open-Source Release", "Support for releasing your project on GitHub with proper documentation and licensing."],
          ["Publication Support", "Guidance on writing up your project as a case study or technical note for publication."],
          ["Letter of Recommendation", "A personalised letter from the bioERGOtech Foundation for university applications or future employment."],
        ].map(([title, desc]) => (
          <div key={title as string} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: `1px solid ${BORDER}` }}>
            <span style={{ color: TEAL, fontWeight: 700, flexShrink: 0 }}>→</span>
            <div><strong style={{ color: TEXT, fontSize: 14 }}>{title}</strong><p style={{ ...p, marginBottom: 0, marginTop: 2 }}>{desc}</p></div>
          </div>
        ))}
      </Section>
      <div style={{ background: `linear-gradient(135deg, ${NAVY}
      <SlideImage src="/assets/courses/course-closing/slide-3.png" alt="Slide 3" /> 0%, #1a3a5c 100%)`, borderRadius: 14, padding: 36, textAlign: "center", color: "#fff", marginBottom: 24 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🎓</div>
        <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 10 }}>You started with an idea.</h2>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.75)", lineHeight: 1.65, maxWidth: 480, margin: "0 auto" }}>You built something real. You thought carefully about what it means to build with AI. That combination — technical capability, domain knowledge, and ethical awareness — is genuinely rare and genuinely valuable.</p>
      </div>
    </>
  );
}

// ─── Lesson content map ───────────────────────────────────────────────────────
const LESSON_CONTENT: Record<string, React.FC> = {
  "lesson-1-1": Lesson_1_1,
  "lesson-1-2a": Lesson_1_2a,
  "lesson-1-2b": Lesson_1_2b,
  "lesson-1-3": Lesson_1_3,
  "lesson-2-1": Lesson_2_1,
  "lesson-2-2": Lesson_2_2,
  "lesson-3-1": Lesson_3_1,
  "lesson-3-2": Lesson_3_2,
  "lesson-4-1": Lesson_4_1,
  "lesson-4-2": Lesson_4_2,
  "lesson-4-3": Lesson_4_3,
  "lesson-4-4": Lesson_4_4,
  "lesson-5-1": Lesson_5_1,
  "lesson-5-2": Lesson_5_2,
  "lesson-6-1": Lesson_6_1,
  "lesson-6-2": Lesson_6_2,
  "lesson-7-1": Lesson_7_1,
  "lesson-7-2": Lesson_7_2,
  "lesson-8-1": Lesson_8_1,
  "lesson-8-2": Lesson_8_2,
  "course-closing": CourseClosing,
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

      {/* Header bar */}
      <div style={{ background: NAVY, color: "#fff", padding: "16px 24px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" as const }}>
        <Link href="/courses/agentic-ai" style={{ color: TEAL, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>← Course Home</Link>
        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.2)" }} />
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>Phase {lesson.phase} · Week {lesson.week}</div>
        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.2)" }} />
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>⏱ {lesson.duration}</div>
        {lesson.track !== "all" && (
          <>
            <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.2)" }} />
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>Track {lesson.track} only</div>
          </>
        )}
        <div style={{ marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,0.55)" }}>Lesson {lesson.number}</div>
      </div>

      {/* Lesson title */}
      <div style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a3a5c 100%)`, padding: "36px 24px 32px", color: "#fff", textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: TEAL, marginBottom: 10 }}>Lesson {lesson.number}</div>
        <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: "clamp(20px, 4vw, 34px)", fontWeight: 800, color: "#fff", margin: 0, lineHeight: 1.2 }}>{lesson.title}</h1>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 80px", display: "flex", gap: 40, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {ContentComponent ? (
            <ContentComponent />
          ) : (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 48, textAlign: "center", boxShadow: SHADOW }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
              <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700, color: TEXT, marginBottom: 8 }}>Lesson Coming Soon</h2>
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

        <CourseSidebar isAuthenticated={isAuthenticated} onLockedClick={() => setShowModal(true)} />
      </div>

      {showModal && <GateModal onClose={() => setShowModal(false)} />}
    </>
  );
}
