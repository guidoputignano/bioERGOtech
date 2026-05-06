"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { COURSE_LESSONS, PHASES } from "./course-data";

interface CourseSidebarProps {
  isAuthenticated: boolean;
  onLockedClick: () => void;
}

const TEAL = "#00C4B4";
const NAVY = "#0D1B32";
const BORDER = "#E2E8F0";
const TEXT = "#1A2332";
const TEXT_LIGHT = "#718096";

export default function CourseSidebar({
  isAuthenticated,
  onLockedClick,
}: CourseSidebarProps) {
  const pathname = usePathname();

  const isActive = (slug: string) =>
    pathname === `/courses/agentic-ai` && slug === "introduction"
      ? true
      : pathname.includes(slug);

  return (
    <aside
      style={{
        width: 280,
        flexShrink: 0,
        position: "sticky",
        top: 84,
        maxHeight: "calc(100vh - 100px)",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Enrol card */}
      <div
        style={{
          background: "#fff",
          border: `1px solid ${BORDER}`,
          borderRadius: 14,
          padding: 20,
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        {isAuthenticated ? (
          <>
            <div
              style={{
                fontSize: 12,
                color: TEXT_LIGHT,
                marginBottom: 10,
              }}
            >
              You are enrolled in this program
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                color: TEAL,
                fontWeight: 600,
              }}
            >
              ✓ Full access unlocked
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 12, color: TEXT_LIGHT, marginBottom: 10 }}>
              You are viewing the free introduction
            </div>
            <Link
              href="/auth/sign-up"
              style={{
                display: "block",
                background: TEAL,
                color: "#fff",
                borderRadius: 10,
                padding: "11px 16px",
                fontSize: 14,
                fontWeight: 700,
                textAlign: "center",
                textDecoration: "none",
                marginBottom: 8,
                transition: "background 0.2s",
              }}
            >
              🎓 Enrol — It&apos;s Free
            </Link>
            <Link
              href="/auth/login"
              style={{
                display: "block",
                textAlign: "center",
                fontSize: 13,
                color: TEXT_LIGHT,
                textDecoration: "none",
              }}
            >
              Already enrolled?{" "}
              <span style={{ color: TEAL, fontWeight: 600 }}>Log in →</span>
            </Link>
          </>
        )}
      </div>

      {/* Lesson list grouped by phase */}
      <div
        style={{
          background: "#fff",
          border: `1px solid ${BORDER}`,
          borderRadius: 14,
          padding: 20,
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: TEXT,
            marginBottom: 14,
          }}
        >
          📋 Course Lessons
        </div>

        {PHASES.map((p) => {
          const phaseLessons = COURSE_LESSONS.filter(
            (l) => l.phase === p.phase
          );
          return (
            <div key={p.phase} style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: p.color,
                  marginBottom: 6,
                  paddingBottom: 4,
                  borderBottom: `1px solid ${BORDER}`,
                }}
              >
                Phase {p.phase} · {p.name}
              </div>
              {phaseLessons.map((lesson) => {
                const active = isActive(lesson.slug);
                const accessible = lesson.free || isAuthenticated;

                return (
                  <div
                    key={lesson.slug}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 0",
                      borderBottom: `1px solid #F7FAFC`,
                      opacity: !accessible && !active ? 0.55 : 1,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: TEXT_LIGHT,
                        minWidth: 32,
                      }}
                    >
                      {lesson.number}
                    </span>

                    {accessible ? (
                      <Link
                        href={
                          lesson.slug === "introduction"
                            ? "/courses/agentic-ai"
                            : `/courses/agentic-ai/lesson/${lesson.slug}`
                        }
                        style={{
                          fontSize: 12,
                          color: active ? TEAL : TEXT_LIGHT,
                          fontWeight: active ? 700 : 400,
                          textDecoration: "none",
                          flex: 1,
                          lineHeight: 1.4,
                        }}
                      >
                        {lesson.title}
                      </Link>
                    ) : (
                      <button
                        onClick={onLockedClick}
                        style={{
                          fontSize: 12,
                          color: TEXT_LIGHT,
                          background: "none",
                          border: "none",
                          padding: 0,
                          cursor: "pointer",
                          flex: 1,
                          textAlign: "left",
                          lineHeight: 1.4,
                        }}
                      >
                        {lesson.title}
                      </button>
                    )}

                    {lesson.free ? (
                      <span
                        style={{
                          fontSize: 9,
                          background: "#E6F9F7",
                          color: "#009688",
                          padding: "2px 5px",
                          borderRadius: 4,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        FREE
                      </span>
                    ) : !accessible ? (
                      <span
                        onClick={onLockedClick}
                        style={{
                          fontSize: 12,
                          color: BORDER,
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                        title="Sign up to access"
                      >
                        🔒
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Includes card */}
      <div
        style={{
          background: "#fff",
          border: `1px solid ${BORDER}`,
          borderRadius: 14,
          padding: 20,
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <div
          style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 12 }}
        >
          📦 What&apos;s Included
        </div>
        {[
          "21+ structured lessons",
          "3 technical tracks",
          "Mentor feedback sessions",
          "Verified completion certificate",
          "Launch pathway access",
          "Free forever — no paywall",
        ].map((item) => (
          <div
            key={item}
            style={{
              display: "flex",
              gap: 8,
              fontSize: 13,
              color: TEXT_LIGHT,
              padding: "4px 0",
            }}
          >
            <span style={{ color: TEAL, fontWeight: 700 }}>✓</span>
            {item}
          </div>
        ))}
      </div>
    </aside>
  );
}
