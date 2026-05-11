"use client";

import { useState, useEffect, useCallback } from "react";

const TEAL = "#00C4B4";
const TEAL_LIGHT = "#E6F9F7";
const NAVY = "#0D1B32";
const TEXT = "#1A2332";
const TEXT_MID = "#4A5568";
const TEXT_LIGHT = "#718096";
const BORDER = "#E2E8F0";
const CARD = "#FFFFFF";
const SHADOW = "0 2px 12px rgba(0,0,0,0.05)";

interface Submission {
  id: string;
  lesson_slug: string;
  lesson_title: string;
  student_id: string;
  reflection: string | null;
  question: string | null;
  comment: string | null;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
  profiles: {
    id: string;
    full_name: string | null;
    email: string;
    student_id: string | null;
    partnership_level: string;
  };
}

interface AdminSubmissionsPanelProps {
  adminUserId: string;
}

export default function AdminSubmissionsPanel({ adminUserId }: AdminSubmissionsPanelProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<string>("all");
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [reply, setReply] = useState("");
  const [replying, setReplying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedLesson === "all"
        ? "/api/admin/submissions"
        : `/api/admin/submissions?lesson_slug=${selectedLesson}`;
      const res = await fetch(url);
      const data = await res.json();
      setSubmissions(data.submissions ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [selectedLesson]);

  useEffect(() => { load(); }, [load]);

  const handleReply = async () => {
    if (!selectedSubmission || !reply.trim()) return;
    setReplying(true);
    try {
      const res = await fetch("/api/admin/submissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedSubmission.id,
          admin_reply: reply.trim(),
          replied_by: adminUserId,
        }),
      });
      const data = await res.json();
      if (!res.ok) { showToast("Failed to save reply"); return; }
      // Update in local state
      setSubmissions((prev) =>
        prev.map((s) => s.id === data.submission.id ? { ...s, ...data.submission } : s)
      );
      setSelectedSubmission({ ...selectedSubmission, ...data.submission });
      setReply("");
      showToast("✓ Reply sent to student");
    } catch {
      showToast("Network error");
    } finally {
      setReplying(false);
    }
  };

  // Get unique lesson slugs for filter
  const lessons = Array.from(
    new Map(submissions.map((s) => [s.lesson_slug, s.lesson_title])).entries()
  ).sort((a, b) => a[0].localeCompare(b[0]));

  const pending = submissions.filter((s) => !s.admin_reply).length;
  const replied = submissions.filter((s) => s.admin_reply).length;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 120px)", gap: 0, background: "#F7F9FC" }}>

      {/* Left — submission list */}
      <div style={{ width: 380, flexShrink: 0, borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", background: CARD }}>

        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700, color: TEXT, marginBottom: 4 }}>
            Course Submissions
          </div>
          <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
            <span style={{ color: "#E67E22", fontWeight: 600 }}>⏳ {pending} pending</span>
            <span style={{ color: TEAL, fontWeight: 600 }}>✓ {replied} replied</span>
            <span style={{ color: TEXT_LIGHT }}>{submissions.length} total</span>
          </div>
        </div>

        {/* Lesson filter */}
        <div style={{ padding: "12px 24px", borderBottom: `1px solid ${BORDER}` }}>
          <select
            value={selectedLesson}
            onChange={(e) => setSelectedLesson(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, color: TEXT, background: "#F7F9FC", outline: "none" }}
          >
            <option value="all">All Lessons</option>
            {lessons.map(([slug, title]) => (
              <option key={slug} value={slug}>{title}</option>
            ))}
          </select>
        </div>

        {/* Submission list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: "center", color: TEXT_LIGHT, fontSize: 14 }}>Loading…</div>
          ) : submissions.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: TEXT_LIGHT, fontSize: 14 }}>No submissions yet.</div>
          ) : (
            submissions.map((s) => (
              <div
                key={s.id}
                onClick={() => { setSelectedSubmission(s); setReply(s.admin_reply ?? ""); }}
                style={{
                  padding: "16px 24px",
                  borderBottom: `1px solid ${BORDER}`,
                  cursor: "pointer",
                  background: selectedSubmission?.id === s.id ? TEAL_LIGHT : "transparent",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { if (selectedSubmission?.id !== s.id) (e.currentTarget as HTMLDivElement).style.background = "#FAFBFC"; }}
                onMouseLeave={(e) => { if (selectedSubmission?.id !== s.id) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 700, color: TEXT }}>
                    {s.profiles?.full_name || s.profiles?.email || "Unknown"}
                  </div>
                  <div style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 10,
                    background: s.admin_reply ? TEAL_LIGHT : "#FFF8E6",
                    color: s.admin_reply ? TEAL : "#E67E22",
                  }}>
                    {s.admin_reply ? "Replied" : "Pending"}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: TEXT_LIGHT, marginBottom: 4 }}>
                  {s.student_id || s.profiles?.student_id || "—"} · {s.lesson_title}
                </div>
                <div style={{ fontSize: 12, color: TEXT_MID, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                  {s.reflection || s.question || s.comment || "No content"}
                </div>
                <div style={{ fontSize: 11, color: TEXT_LIGHT, marginTop: 4 }}>
                  {new Date(s.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right — detail + reply */}
      <div style={{ flex: 1, overflowY: "auto", padding: 32 }}>
        {!selectedSubmission ? (
          <div style={{ textAlign: "center", paddingTop: 80, color: TEXT_LIGHT }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
            <p style={{ fontSize: 15 }}>Select a submission to view details and reply</p>
          </div>
        ) : (
          <div style={{ maxWidth: 680 }}>

            {/* Student header */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24, marginBottom: 20, boxShadow: SHADOW }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 700, color: TEXT, marginBottom: 4 }}>
                    {selectedSubmission.profiles?.full_name || "Unknown Student"}
                  </div>
                  <div style={{ fontSize: 13, color: TEXT_LIGHT }}>
                    {selectedSubmission.profiles?.email}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: TEXT, marginBottom: 2, fontFamily: "monospace" }}>
                    {selectedSubmission.student_id || selectedSubmission.profiles?.student_id || "—"}
                  </div>
                  <div style={{ fontSize: 11, color: TEXT_LIGHT }}>Student ID</div>
                </div>
              </div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BORDER}`, display: "flex", gap: 16, fontSize: 12, color: TEXT_MID }}>
                <span><strong>Lesson:</strong> {selectedSubmission.lesson_title}</span>
                <span><strong>Submitted:</strong> {new Date(selectedSubmission.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>
            </div>

            {/* Submission content */}
            {selectedSubmission.reflection && (
              <SubmissionCard label="Reflection" content={selectedSubmission.reflection} color={TEAL} />
            )}
            {selectedSubmission.question && (
              <SubmissionCard label="Question" content={selectedSubmission.question} color="#4A7DFF" />
            )}
            {selectedSubmission.comment && (
              <SubmissionCard label="Comment" content={selectedSubmission.comment} color="#9B59B6" />
            )}

            {/* Reply section */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24, boxShadow: SHADOW, marginTop: 8 }}>
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 14 }}>
                {selectedSubmission.admin_reply ? "Your Reply" : "Reply to Student"}
              </div>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write your reply here. The student will see this reply on their lesson page..."
                rows={6}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: `1.5px solid ${reply ? TEAL : BORDER}`,
                  fontSize: 14,
                  color: TEXT,
                  lineHeight: 1.65,
                  resize: "vertical",
                  outline: "none",
                  background: CARD,
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                  marginBottom: 14,
                }}
              />
              {selectedSubmission.replied_at && (
                <p style={{ fontSize: 12, color: TEXT_LIGHT, marginBottom: 10 }}>
                  Last replied: {new Date(selectedSubmission.replied_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              )}
              <button
                onClick={handleReply}
                disabled={replying || !reply.trim()}
                style={{
                  background: TEAL,
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "12px 24px",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: replying || !reply.trim() ? "not-allowed" : "pointer",
                  opacity: replying || !reply.trim() ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {replying ? "Sending…" : selectedSubmission.admin_reply ? "Update Reply" : "Send Reply"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          background: NAVY,
          color: "#fff",
          padding: "12px 20px",
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 600,
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          zIndex: 9999,
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

function SubmissionCard({ label, content, color }: { label: string; content: string; color: string }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${color}`, borderRadius: "0 14px 14px 0", padding: 20, marginBottom: 14, boxShadow: SHADOW }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color, marginBottom: 8 }}>
        {label}
      </div>
      <p style={{ fontSize: 14, color: TEXT_MID, lineHeight: 1.7, margin: 0 }}>{content}</p>
    </div>
  );
}
