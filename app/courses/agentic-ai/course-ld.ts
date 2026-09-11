import { COURSE_LESSONS, type Lesson } from "../course-data";

const BASE = "https://www.bioergotech.org";
const COURSE_URL = `${BASE}/courses/agentic-ai`;
const COURSE_ID = `${COURSE_URL}#course`;

const COURSE_NAME = "Agentic AI High School Innovation Program";
const COURSE_DESCRIPTION =
  "A free ten-week course taking you from understanding AI agents to building a working prototype. No prior experience required.";

/**
 * "5 minutes" to "PT5M".
 *
 * Durations live in course-data.ts as plain prose because that is what the
 * page prints. Parsing it here keeps one source of truth: a duration can
 * never disagree between the visible lesson header and the markup.
 */
export function isoDuration(duration: string): string | undefined {
  const minutes = duration.match(/^(\d+)\s*minutes?$/)?.[1];
  return minutes ? `PT${minutes}M` : undefined;
}

export function lessonUrl(slug: string): string {
  return `${COURSE_URL}/lesson/${slug}`;
}

/**
 * The course itself, with its lessons as parts.
 *
 * Every figure here is either on the page in words ("100% Free Forever",
 * "10 Weeks") or read straight out of the lesson table, so the markup cannot
 * drift away from what a visitor actually sees.
 */
export function courseLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    "@id": COURSE_ID,
    name: COURSE_NAME,
    description: COURSE_DESCRIPTION,
    url: COURSE_URL,
    inLanguage: "en",
    educationalLevel: "High school",
    timeRequired: "P10W",
    isAccessibleForFree: true,
    provider: {
      "@type": "Organization",
      name: "bioERGOtech Foundation",
      url: BASE,
    },
    offers: {
      "@type": "Offer",
      price: 0,
      priceCurrency: "EUR",
      category: "Free",
      availability: "https://schema.org/InStock",
    },
    // Deliberately no courseWorkload. Google wants one for the course-info
    // rich result, but the only honest figure would be the sum of the video
    // durations, and this course is mostly the build, not the videos. An
    // invented hours-per-week is worse than sitting out one rich result.
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "Online",
    },
    teaches: [
      "AI agents",
      "Large language models",
      "No-code automation with Make and n8n",
      "Agent frameworks in Python",
      "AI ethics and responsibility",
    ],
    hasPart: COURSE_LESSONS.map((l) => ({
      "@type": "LearningResource",
      name: `${l.number}: ${l.title}`,
      url: lessonUrl(l.slug),
      timeRequired: isoDuration(l.duration),
    })),
  };
}

/**
 * One lesson.
 *
 * A gated lesson ships its full text and covers it with a sign-in modal, so
 * the markup has to say so. Without the WebPageElement below, a crawler sees
 * a complete lesson where a logged out reader sees a wall, which is the
 * definition of cloaking. Naming the gated region and marking it not free is
 * how Google asks for this case to be declared.
 */
export function lessonLd(lesson: Lesson) {
  return {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    "@id": `${lessonUrl(lesson.slug)}#lesson`,
    name: `${lesson.number}: ${lesson.title}`,
    description: lesson.description,
    url: lessonUrl(lesson.slug),
    inLanguage: "en",
    learningResourceType: "Lesson",
    timeRequired: isoDuration(lesson.duration),
    isAccessibleForFree: lesson.free,
    isPartOf: {
      "@type": "Course",
      "@id": COURSE_ID,
      name: COURSE_NAME,
      url: COURSE_URL,
    },
    provider: {
      "@type": "Organization",
      name: "bioERGOtech Foundation",
      url: BASE,
    },
    ...(lesson.free
      ? {}
      : {
          hasPart: {
            "@type": "WebPageElement",
            isAccessibleForFree: false,
            cssSelector: ".lesson-content",
          },
        }),
  };
}
