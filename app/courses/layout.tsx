import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agentic AI High School Innovation Program — bioERGOtech Foundation",
  description:
    "A free ten-week course taking you from understanding AI agents to building a working prototype. No prior experience required.",
  openGraph: {
    title: "Agentic AI Course — bioERGOtech Foundation",
    description: "Free ten-week program: learn to build AI agents that solve real problems.",
    url: "https://www.bioergotech.org/courses/agentic-ai",
    images: [{ url: "https://www.bioergotech.org/assets/images/og-image-v2.jpg" }],
  },
};

export default function CoursesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
