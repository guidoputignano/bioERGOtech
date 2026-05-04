export type Track = "A" | "B" | "C" | "all";
export type Phase = 1 | 2 | 3 | 4;

export interface Lesson {
  slug: string;
  phase: Phase;
  week: number;
  number: string;
  title: string;
  duration: string;
  track: Track;
  free: boolean;
  description: string;
}

export const COURSE_LESSONS: Lesson[] = [
  // ── Phase 1: Foundation ───────────────────────────────────────────
  {
    slug: "introduction",
    phase: 1,
    week: 1,
    number: "Intro",
    title: "Course Introduction",
    duration: "5 minutes",
    track: "all",
    free: true,
    description: "What this program is, who it is for, the four phases, three technical tracks, and what you will build by the end.",
  },
  {
    slug: "lesson-1-1",
    phase: 1,
    week: 1,
    number: "1.1",
    title: "What Is AI, and What Is Generative AI?",
    duration: "9 minutes",
    track: "all",
    free: false,
    description: "Build an accurate mental model of AI — traditional software vs machine learning, what a model actually is, the transformer breakthrough, and where LLMs succeed and fail.",
  },
  {
    slug: "lesson-1-2a",
    phase: 1,
    week: 1,
    number: "1.2a",
    title: "From Prompts to Pipelines: The Anatomy of an AI Agent",
    duration: "10 minutes",
    track: "all",
    free: false,
    description: "What makes an AI agent fundamentally different from a chatbot. The five components every agent is built from: perception, planning, tool use, memory, and feedback loop — mapped onto a real-world example.",
  },
  {
    slug: "lesson-1-2b",
    phase: 1,
    week: 1,
    number: "1.2b",
    title: "Inside the Machine: How LLMs Work and How to Host Them",
    duration: "12 minutes",
    track: "all",
    free: false,
    description: "What is actually happening inside an LLM — tokenisation, transformer architecture, and parameters. Then the practical question: cloud API vs running a model locally with Ollama.",
  },
  {
    slug: "lesson-1-3",
    phase: 1,
    week: 2,
    number: "1.3",
    title: "Real Agent Demos",
    duration: "15 minutes",
    track: "all",
    free: false,
    description: "Watch three real agents in action across healthcare, research, and personal assistant domains. Analyse what is happening under the hood.",
  },
  {
    slug: "lesson-1-4",
    phase: 1,
    week: 2,
    number: "1.4",
    title: "AI Ethics and Accountability",
    duration: "11 minutes",
    track: "all",
    free: false,
    description: "Why ethics is not optional in agentic systems. The four dimensions — privacy, bias, transparency, accountability — and how to design for them.",
  },
  // ── Phase 2: Exploration ──────────────────────────────────────────
  {
    slug: "lesson-2-1",
    phase: 2,
    week: 3,
    number: "2.1",
    title: "Example Gallery: Healthcare Agents",
    duration: "14 minutes",
    track: "all",
    free: false,
    description: "Four worked agent examples from the healthcare domain. Study their architecture, tool use, and design decisions.",
  },
  {
    slug: "lesson-2-2",
    phase: 2,
    week: 3,
    number: "2.2",
    title: "Example Gallery: Research Agents",
    duration: "14 minutes",
    track: "all",
    free: false,
    description: "Four worked agent examples from the research domain. Literature review, data synthesis, and hypothesis generation.",
  },
  {
    slug: "lesson-2-3",
    phase: 2,
    week: 4,
    number: "2.3",
    title: "Track Selection and Tool Setup",
    duration: "20 minutes",
    track: "all",
    free: false,
    description: "Choose your technical track and set up your development environment. Track A: Make/n8n. Track B: OpenClaw/Hermes. Track C: Agno/Python.",
  },
  // ── Phase 3: Build ────────────────────────────────────────────────
  {
    slug: "lesson-3-1",
    phase: 3,
    week: 5,
    number: "3.1",
    title: "Architecture Design",
    duration: "18 minutes",
    track: "all",
    free: false,
    description: "Design your agent's architecture before writing a single line. Inputs, memory type, tools, output verification, and failure modes.",
  },
  {
    slug: "lesson-3-2",
    phase: 3,
    week: 6,
    number: "3.2",
    title: "Building Your First Prototype",
    duration: "30 minutes",
    track: "all",
    free: false,
    description: "Hands-on build session. Step-by-step guidance for each track to get a working agent running for the first time.",
  },
  // ── Phase 4: Showcase ─────────────────────────────────────────────
  {
    slug: "lesson-4-1",
    phase: 4,
    week: 9,
    number: "4.1",
    title: "Final Submission Guide",
    duration: "10 minutes",
    track: "all",
    free: false,
    description: "Everything you need to know to submit your prototype, demo recording, README, and ethics review.",
  },
];

export const PHASES = [
  { phase: 1, name: "Foundation", weeks: "Weeks 1–2", color: "#00C4B4" },
  { phase: 2, name: "Exploration", weeks: "Weeks 3–4", color: "#4A7DFF" },
  { phase: 3, name: "Build", weeks: "Weeks 5–8", color: "#9B59B6" },
  { phase: 4, name: "Showcase", weeks: "Weeks 9–10", color: "#E67E22" },
] as const;

export const TRACKS = [
  {
    id: "A",
    name: "No-Code",
    tools: "Make · n8n",
    desc: "Students with no coding background",
    color: "#00C4B4",
  },
  {
    id: "B",
    name: "Low-Code",
    tools: "OpenClaw · Hermes · VSCode",
    desc: "Students comfortable with basic setup and configuration",
    color: "#4A7DFF",
  },
  {
    id: "C",
    name: "Full-Code",
    tools: "Agno · Python · VSCode",
    desc: "Students confident with Python or eager to learn it",
    color: "#9B59B6",
  },
] as const;
