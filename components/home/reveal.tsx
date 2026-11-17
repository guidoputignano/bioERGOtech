"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * Fades its content in when it scrolls into view. The server renders it
 * visible: without JavaScript, for search engines and for screenshots,
 * nothing is hidden. Only content that is still below the fold when the
 * page loads gets hidden and then revealed, so nothing on screen flickers.
 * With "reduce motion" on, nothing moves.
 */
export function Reveal({
  children,
  ritardo = 0,
  className,
  style,
  as: Tag = "div",
}: {
  children: ReactNode;
  /** Delay in ms, to stagger cards in a row. */
  ritardo?: number;
  className?: string;
  style?: CSSProperties;
  as?: "div" | "section" | "li" | "article";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [stato, setStato] = useState<"fermo" | "nascosto" | "visibile">("fermo");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.92) return; // already on screen: leave it alone
    setStato("nascosto");
    const io = new IntersectionObserver(
      (voci) => {
        if (voci.some((v) => v.isIntersecting)) {
          setStato("visibile");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const stile: CSSProperties =
    stato === "fermo"
      ? {}
      : {
          opacity: stato === "visibile" ? 1 : 0,
          transform: stato === "visibile" ? "none" : "translateY(28px)",
          transition: `opacity 0.8s cubic-bezier(.2,.7,.2,1) ${ritardo}ms, transform 0.8s cubic-bezier(.2,.7,.2,1) ${ritardo}ms`,
          willChange: "opacity, transform",
        };

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag ref={ref as any} className={className} style={{ ...style, ...stile }}>
      {children}
    </Tag>
  );
}
