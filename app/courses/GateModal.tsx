"use client";

import Link from "next/link";

interface GateModalProps {
  onClose: () => void;
}

export default function GateModal({ onClose }: GateModalProps) {
  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(13,27,50,0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: "48px 36px",
          maxWidth: 440,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          position: "relative",
          animation: "popIn 0.22s ease",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 14,
            right: 18,
            background: "none",
            border: "none",
            fontSize: 22,
            cursor: "pointer",
            color: "#A0AEC0",
            lineHeight: 1,
          }}
        >
          ×
        </button>

        <div style={{ fontSize: 48, marginBottom: 14 }}>🔐</div>

        <h2
          style={{
            fontSize: 21,
            fontWeight: 800,
            color: "#0D1B32",
            fontFamily: "'Sora', sans-serif",
            marginBottom: 10,
          }}
        >
          Create a Free Account to Continue
        </h2>

        <p
          style={{
            fontSize: 15,
            color: "#4A5568",
            lineHeight: 1.65,
            marginBottom: 28,
          }}
        >
          Lesson 1.1 and beyond are available to enrolled members. Join the
          program for free to access all 21+ lessons, mentor sessions, and your
          completion certificate.
        </p>

        <Link
          href="/join-us"
          style={{
            display: "block",
            background: "#00C4B4",
            color: "#fff",
            padding: 14,
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 700,
            textDecoration: "none",
            marginBottom: 10,
          }}
        >
          🎓 Join the Program — It&apos;s Free
        </Link>

        <Link
          href="/auth/login"
          style={{
            display: "block",
            background: "transparent",
            color: "#4A5568",
            padding: 13,
            borderRadius: 10,
            border: "1.5px solid #E2E8F0",
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Already a member? Log in
        </Link>

        <style>{`
          @keyframes popIn {
            from { opacity: 0; transform: translateY(18px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
      </div>
    </div>
  );
}
