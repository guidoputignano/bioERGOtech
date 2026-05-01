import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { COURSE_LESSONS } from "../../../course-data";
import LessonPageClient from "./LessonPageClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return COURSE_LESSONS.filter((l) => l.slug !== "introduction").map((l) => ({
    slug: l.slug,
  }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const lesson = COURSE_LESSONS.find((l) => l.slug === slug);
  return {
    title: lesson
      ? `${lesson.number} — ${lesson.title} | bioERGOtech`
      : "Lesson | bioERGOtech",
  };
}

export default async function LessonPage({ params }: Props) {
  const { slug } = await params;

  const lesson = COURSE_LESSONS.find((l) => l.slug === slug);
  if (!lesson) redirect("/courses/agentic-ai");

  // Free lessons are publicly accessible
  if (lesson.free) {
    return <LessonPageClient lesson={lesson} isAuthenticated={false} />;
  }

  // Gated lessons: check Supabase session server-side
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Not logged in — render lesson with gate modal open
    return <LessonPageClient lesson={lesson} isAuthenticated={false} gateOpen />;
  }

  return <LessonPageClient lesson={lesson} isAuthenticated={true} />;
}
