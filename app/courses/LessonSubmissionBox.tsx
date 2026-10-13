"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AvvisoRiflessioniPassate,
  avvisoPassateNelBox,
  type StatoSceltaPassate,
} from "@/app/eventi/vivere-piu-a-lungo/licei/studente/RiflessioniPassate";
import {
  TITOLO_RIFLESSIONI_PASSATE,
  riflessioniPassateVisibili,
} from "@/app/eventi/vivere-piu-a-lungo/licei/content";

const TEAL = "#00C4B4";
const TEAL_DARK = "#009688";
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
  student_id: string;
  reflection: string | null;
  question: string | null;
  comment: string | null;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
  /** Percorso licei: saved after the notice, so the school's teachers read it. */
  condivisa_referente_at?: string | null;
}

/**
 * Percorso licei only. What the student reads before writing: reflection and
 * question are also read by the teachers of their school. Shown only when
 * the server says the student is enrolled (`avviso_referente`), and the
 * submission is shared only when this was on screen. Italian, like the rest
 * of the licei programme.
 */
const AVVISO_REFERENTE_TESTO =
  "Quello che scrivi in Riflessione e Domanda lo leggono lo staff della Fondazione e i docenti del tuo istituto che seguono il percorso. Il commento lo legge solo lo staff. Per qualcosa che vuoi dire solo alla Fondazione scrivi a info@bioergotech.org.";

interface Props {
  lessonSlug: string;
  lessonTitle: string;
  isAuthenticated: boolean;
  onGateOpen: () => void;
  onSubmitted?: () => void;
}

export default function LessonSubmissionBox({
  lessonSlug,
  lessonTitle,
  isAuthenticated,
  onGateOpen,
  onSubmitted,
}: Props) {
  const [reflection, setReflection] = useState("");
  const [question, setQuestion] = useState("");
  const [comment, setComment] = useState("");
  const [existing, setExisting] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  // Licei students only: `{ istituto }` when the notice must be shown.
  const [avviso, setAvviso] = useState<{ istituto: string } | null>(null);
  // Licei students only: the notice on the submissions saved before the
  // lesson notice, and the student's choice. Shown here, in any lesson,
  // only while no choice is recorded and there is at least one such
  // submission; after an answer it stays on screen until the page is
  // reloaded, and then it is no longer shown.
  const [passate, setPassate] = useState<StatoSceltaPassate | null>(null);
  const [mostraPassate, setMostraPassate] = useState(false);
  const aggiornaPassate = useCallback(
    (nuovo: Partial<StatoSceltaPassate>) => setPassate((p) => (p ? { ...p, ...nuovo } : p)),
    [],
  );

  const load = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return; }
    try {
      const res = await fetch(`/api/courses/submissions?lesson_slug=${lessonSlug}`);
      const data = await res.json();
      setAvviso(data.avviso_referente ?? null);
      const rp = data.avviso_referente ? (data.riflessioni_passate ?? null) : null;
      setPassate(
        rp
          ? {
              scelta: rp.scelta ?? null,
              avvisato_at: rp.avvisato_at ?? null,
              visibili_dal: rp.visibili_dal ?? null,
              ...(typeof rp.visibili === "boolean" ? { visibili: rp.visibili } : {}),
            }
          : null,
      );
      setMostraPassate(avvisoPassateNelBox(rp));
      if (data.submission) {
        setExisting(data.submission);
        setReflection(data.submission.reflection ?? "");
        setQuestion(data.submission.question ?? "");
        setComment(data.submission.comment ?? "");
        onSubmitted?.();
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [lessonSlug, isAuthenticated]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!isAuthenticated) { onGateOpen(); return; }
    if (!reflection.trim()) {
      setError("Reflection is required. Please share your thoughts on this lesson before submitting.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/courses/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_slug: lessonSlug,
          lesson_title: lessonTitle,
          reflection,
          question,
          comment,
          // Sent only when the notice is on screen: the form below shows it
          // whenever `avviso` is set, and this runs only from that form. The
          // server checks the enrolment again before sharing anything.
          ...(avviso ? { avviso_referente: true } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save"); return; }
      setExisting(data.submission);
      setSaved(true);
      setEditing(false);
      onSubmitted?.();
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const showForm = !existing || editing;
  // Read by the school's teachers: saved after the notice, or saved before
  // it and readable under the rule for earlier submissions ("Va bene", or
  // no answer three days after the first notice). The server computes that
  // rule with its own clock (`visibili`); the device clock, which may be
  // behind, is used only if the field is missing.
  const visibileDocenti =
    !!existing?.condivisa_referente_at ||
    (!!avviso && !!passate && (passate.visibili ?? riflessioniPassateVisibili(passate)));

  return (
    <div style={{
      background: CARD,
      border: `1px solid ${BORDER}`,
      borderRadius: 14,
      padding: 36,
      marginTop: 32,
      boxShadow: SHADOW,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, paddingBottom: 14, borderBottom: `2px solid ${TEAL_LIGHT}` }}>
        <div>
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 700, color: TEXT, margin: 0, marginBottom: 4 }}>
            📝 Your Lesson Submission
          </h2>
          <p style={{ fontSize: 13, color: TEXT_LIGHT, margin: 0 }}>
            Share your reflection, ask a question, or leave a comment. The bioERGOtech team will respond.
          </p>
        </div>
        {existing && !editing && (
          <button
            onClick={() => setEditing(true)}
            style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "6px 14px", fontSize: 13, color: TEXT_MID, cursor: "pointer", fontWeight: 600 }}
          >
            Edit
          </button>
        )}
      </div>

      {/* Not logged in */}
      {!isAuthenticated && (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🔐</div>
          <p style={{ fontSize: 15, color: TEXT_MID, marginBottom: 16 }}>
            You need to be logged in to submit your reflection.
          </p>
          <button
            onClick={onGateOpen}
            style={{ background: TEAL, color: "#fff", border: "none", borderRadius: 10, padding: "11px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
          >
            Log in or Sign up
          </button>
        </div>
      )}

      {/* Loading */}
      {isAuthenticated && loading && (
        <div style={{ textAlign: "center", padding: 24 }}>
          <div style={{ width: 24, height: 24, border: `2px solid ${TEAL}`, borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Percorso licei: the notice on the earlier submissions, in any
          lesson, above the read view or the form. It has its own requests
          and never touches the submission. */}
      {isAuthenticated && !loading && avviso && passate && mostraPassate && (
        <div
          lang="it"
          role="group"
          aria-label={TITOLO_RIFLESSIONI_PASSATE}
          style={{ marginBottom: 12, padding: "12px 16px", background: "#F7F9FC", border: `1px solid ${BORDER}`, borderRadius: 8 }}
        >
          <strong style={{ display: "block", fontSize: 13.5, color: TEAL_DARK, marginBottom: 4 }}>
            {TITOLO_RIFLESSIONI_PASSATE}
          </strong>
          <AvvisoRiflessioniPassate stato={passate} onCambio={aggiornaPassate} compatta />
        </div>
      )}

      {/* Existing submission: read view */}
      {isAuthenticated && !loading && existing && !editing && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{ background: TEAL_LIGHT, color: TEAL_DARK, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
              ✓ Submitted
            </div>
            <span style={{ fontSize: 12, color: TEXT_LIGHT }}>
              Student ID: <strong style={{ color: TEXT, fontFamily: "monospace" }}>{existing.student_id}</strong>
            </span>
            <span style={{ fontSize: 12, color: TEXT_LIGHT }}>·</span>
            <span style={{ fontSize: 12, color: TEXT_LIGHT }}>
              {new Date(existing.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>

          {/* Percorso licei: who can read this submission. */}
          {(avviso || existing.condivisa_referente_at) && (
            <p lang="it" style={{ fontSize: 12.5, color: TEXT_MID, margin: "-8px 0 18px", lineHeight: 1.6 }}>
              <strong style={{ color: visibileDocenti ? TEAL_DARK : TEXT }}>
                {visibileDocenti
                  ? "Visibile anche ai docenti del tuo istituto"
                  : "Visibile solo allo staff"}
              </strong>
              {visibileDocenti && existing.comment ? ". Il commento lo legge solo lo staff." : ""}
            </p>
          )}

          {existing.reflection && (
            <SubmissionField label="Reflection" value={existing.reflection} color={TEAL} />
          )}
          {existing.question && (
            <SubmissionField label="Question" value={existing.question} color="#4A7DFF" />
          )}
          {existing.comment && (
            <SubmissionField label="Comment" value={existing.comment} color="#9B59B6" />
          )}

          {/* Admin reply */}
          {existing.admin_reply && (
            <div style={{ marginTop: 20, background: "#F7F9FC", border: `1px solid ${BORDER}`, borderLeft: `4px solid ${TEAL}`, borderRadius: "0 10px 10px 0", padding: "14px 18px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: TEAL, marginBottom: 8 }}>
                💬 Reply from the bioERGOtech team
              </div>
              {/* pre-wrap: a reply of more than one paragraph keeps its breaks */}
              <p style={{ fontSize: 14, color: TEXT_MID, lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap" }}>{existing.admin_reply}</p>
              {existing.replied_at && (
                <p style={{ fontSize: 11, color: TEXT_LIGHT, margin: "8px 0 0" }}>
                  {new Date(existing.replied_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              )}
            </div>
          )}

          {!existing.admin_reply && (
            <div style={{ marginTop: 16, padding: "12px 16px", background: "#FFF8E6", borderRadius: 8, fontSize: 13, color: "#7D5A00" }}>
              ⏳ Awaiting a reply. You will see it here once the bioERGOtech team responds.
            </div>
          )}
        </div>
      )}

      {/* Form: new or editing */}
      {isAuthenticated && !loading && showForm && (
        <div>
          {avviso && (
            <div
              lang="it"
              role="note"
              style={{ marginBottom: 16, padding: "12px 16px", background: TEAL_LIGHT, border: `1px solid ${TEAL}`, borderRadius: 8, fontSize: 13.5, color: NAVY, lineHeight: 1.6 }}
            >
              <strong style={{ display: "block", color: TEAL_DARK, marginBottom: 4 }}>
                Chi legge quello che scrivi
                {avviso.istituto && <span style={{ fontWeight: 400, color: TEXT_MID }}> . {avviso.istituto}</span>}
              </strong>
              {AVVISO_REFERENTE_TESTO}
            </div>
          )}

          {existing && (
            <div style={{ marginBottom: 16, padding: "10px 14px", background: "#EBF8FF", borderRadius: 8, fontSize: 13, color: "#2B6CB0" }}>
              ✏️ You are editing your existing submission. The team&apos;s reply will be preserved.
            </div>
          )}

          <FormField
            label="Reflection"
            placeholder="Write your reflection on this lesson: what stood out to you, what confirmed or challenged your thinking, what you want to explore further..."
            value={reflection}
            onChange={setReflection}
            color={TEAL}
            required
          />
          <FormField
            label="Question"
            placeholder="Any question you want the bioERGOtech team to answer: technical, conceptual, or about your specific project..."
            value={question}
            onChange={setQuestion}
            color="#4A7DFF"
          />
          <FormField
            label="Comment or Note"
            placeholder="Anything else: feedback on the lesson, something you want to flag, a thought that doesn't fit elsewhere..."
            value={comment}
            onChange={setComment}
            color="#9B59B6"
          />

          {error && (
            <p style={{ fontSize: 13, color: "#E74C3C", marginBottom: 12 }}>{error}</p>
          )}

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{
                background: TEAL,
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {saving && <span style={{ width: 14, height: 14, border: "2px solid #fff", borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />}
              {saving ? "Saving…" : existing ? "Update Submission" : "Submit"}
            </button>
            {editing && (
              <button
                onClick={() => setEditing(false)}
                style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 20px", fontSize: 14, color: TEXT_MID, cursor: "pointer" }}
              >
                Cancel
              </button>
            )}
            {saved && (
              <span style={{ fontSize: 13, color: TEAL, fontWeight: 600 }}>✓ Saved successfully</span>
            )}
          </div>
          <p style={{ fontSize: 12, color: TEXT_LIGHT, marginTop: 10 }}>
            All fields are optional. Fill in whichever are relevant to you.
          </p>
        </div>
      )}
    </div>
  );
}

function SubmissionField({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color, marginBottom: 6 }}>
        {label}
      </div>
      <p style={{ fontSize: 14, color: TEXT_MID, lineHeight: 1.65, margin: 0, padding: "12px 14px", background: "#FAFBFC", borderRadius: 8, border: `1px solid ${BORDER}` }}>
        {value}
      </p>
    </div>
  );
}

function FormField({
  label,
  placeholder,
  value,
  onChange,
  color,
  required,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  color: string;
  required?: boolean;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 700, color, marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>
        {label} {required ? <span style={{ fontSize: 11, color: "#E74C3C", fontWeight: 700 }}>*required</span> : <span style={{ fontSize: 11, color: TEXT_LIGHT, fontWeight: 400, textTransform: "none" as const, letterSpacing: 0 }}>(optional)</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        style={{
          width: "100%",
          padding: "12px 14px",
          borderRadius: 10,
          border: `1.5px solid ${value ? color : BORDER}`,
          fontSize: 14,
          color: TEXT,
          lineHeight: 1.6,
          resize: "vertical",
          outline: "none",
          background: CARD,
          fontFamily: "inherit",
          transition: "border-color 0.2s",
          boxSizing: "border-box",
        }}
        onFocus={(e) => (e.target.style.borderColor = color)}
        onBlur={(e) => (e.target.style.borderColor = value ? color : BORDER)}
      />
    </div>
  );
}
