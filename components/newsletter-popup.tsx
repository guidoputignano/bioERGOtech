"use client";

import { useEffect, useState } from "react";

export default function NewsletterPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const shown = localStorage.getItem("newsletter_popup_shown");

    if (!shown) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        localStorage.setItem("newsletter_popup_shown", "true");
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, []);

  const closePopup = () => {
    setIsOpen(false);
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      setMessage("Please enter your email.");
      return;
    }

    if (!consent) {
      setMessage("Please tick the consent box.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          full_name: fullName || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Something went wrong.");
      } else {
        setMessage("Thanks for subscribing.");
        setEmail("");
        setFullName("");
        setConsent(false);

        setTimeout(() => {
          setIsOpen(false);
        }, 1200);
      }
    } catch {
      setMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        width: 360,
        maxWidth: "calc(100vw - 32px)",
        background: "#FFFFFF",
        borderRadius: 16,
        boxShadow: "0 16px 40px rgba(0,0,0,0.15)",
        padding: 20,
        zIndex: 9999,
        border: "1px solid #E8EDF3",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 10,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#1A2332",
              marginBottom: 4,
            }}
          >
            Join our newsletter
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#4A5568",
              lineHeight: 1.5,
            }}
          >
            Get updates on research, innovation, events, and funding opportunities.
          </div>
        </div>

        <button
          onClick={closePopup}
          style={{
            background: "transparent",
            border: "none",
            fontSize: 18,
            cursor: "pointer",
            color: "#8896A6",
          }}
        >
          ×
        </button>
      </div>

      <input
        type="text"
        placeholder="Your name (optional)"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        style={{
          width: "100%",
          padding: "11px 12px",
          borderRadius: 10,
          border: "1px solid #D9E1EA",
          fontSize: 14,
          outline: "none",
          marginBottom: 10,
        }}
      />

      <input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          width: "100%",
          padding: "11px 12px",
          borderRadius: 10,
          border: "1px solid #D9E1EA",
          fontSize: 14,
          outline: "none",
          marginBottom: 10,
        }}
      />

      <label
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          fontSize: 12,
          color: "#4A5568",
          lineHeight: 1.4,
          marginBottom: 12,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          style={{ marginTop: 2 }}
        />
        I agree to receive occasional updates by email.
      </label>

      {message && (
        <div
          style={{
            fontSize: 12,
            marginBottom: 10,
            color: message.toLowerCase().includes("thanks") ? "#0D9373" : "#D63563",
          }}
        >
          {message}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <button
          onClick={closePopup}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #D9E1EA",
            background: "#FFFFFF",
            color: "#4A5568",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Not now
        </button>

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 10,
            border: "none",
            background: "#2EC4B6",
            color: "#FFFFFF",
            cursor: loading ? "default" : "pointer",
            fontWeight: 700,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Submitting..." : "Subscribe"}
        </button>
      </div>
    </div>
  );
}