"use client";

import { useEffect } from "react";

/**
 * Declares the page language on <html> while these pages are open, and puts
 * back the previous one on the way out. The root layout says "en" for the
 * whole site; for the Italian pages Chrome then offered "translate from
 * English", and with "always translate" on, Google Translate rewrote the
 * pages while React was updating them. The inline script in the layout
 * covers the first load, before Chrome decides; this covers navigation
 * between pages of the site.
 */
export function LinguaPagina({ lingua }: { lingua: string }) {
  useEffect(() => {
    const html = document.documentElement;
    const prima = html.lang;
    html.lang = lingua;
    return () => {
      html.lang = prima && prima !== lingua ? prima : "en";
    };
  }, [lingua]);
  return null;
}
