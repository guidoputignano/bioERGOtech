import type { Metadata } from "next";

/**
 * /courses only redirects to /courses/agentic-ai, so the course's own metadata
 * moved down to that route where it can carry a canonical of its own. A
 * canonical set on this layout would have been inherited by every child,
 * including the lessons, and pointed them all at the wrong URL.
 *
 * Deliberately no `robots` here either. Layout metadata cascades to every
 * descendant, so a noindex on this redirect would have taken the course page
 * and all 22 lessons out of the index with it. The redirect itself is what
 * keeps /courses from being indexed as a URL of its own.
 */
export const metadata: Metadata = {
  title: "Courses",
};

export default function CoursesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
