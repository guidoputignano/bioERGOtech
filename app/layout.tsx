import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { ThemeProvider } from "next-themes";

// Self-host Poppins via next/font: removes the render-blocking Google Fonts
// request and prevents layout shift. Exposed as a CSS variable so the existing
// stylesheets can keep referencing it.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});
import CookieBanner from "@/components/cookie-banner";
import NewsletterPopup from "@/components/newsletter-popup";
import { StructuredData } from "@/components/structured-data";
import { SCRIPT_TRADUTTORI } from "@/lib/traduttori";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.bioergotech.org"),
  title: {
    default: "bioERGOtech Foundation: training students to build digital scientists",
    template: "%s | bioERGOtech Foundation",
  },
  description:
    "bioERGOtech Foundation trains high-school and university students to build digital scientists: AI agents for health, sport and longevity. Free programmes in Taranto and online.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "bioERGOtech Foundation: training students to build digital scientists",
    description:
      "bioERGOtech Foundation trains high-school and university students to build digital scientists: AI agents for health, sport and longevity. Free programmes in Taranto and online.",
    url: "https://www.bioergotech.org",
    siteName: "bioERGOtech Foundation",
    images: [
      {
        url: "https://www.bioergotech.org/assets/images/og-home.jpg",
        width: 1200,
        height: 630,
        alt: "bioERGOtech Foundation: we train students to build digital scientists",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "bioERGOtech Foundation: training students to build digital scientists",
    description:
      "bioERGOtech Foundation trains high-school and university students to build digital scientists: AI agents for health, sport and longevity. Free programmes in Taranto and online.",
    images: ["https://www.bioergotech.org/assets/images/og-home.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Before anything else: keeps React working when Google Translate
            or an extension rewrites the page's text (lib/traduttori.ts). */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TRADUTTORI }} />
        {/* =========================================
            TRACKING
            Google Analytics e Google Ads NON si caricano qui: li carica
            il banner dei cookie (components/cookie-banner.tsx) solo dopo
            il consenso, e il tag pubblicitario mai nelle pagine del corso
            e delle aree riservate, usate anche da studenti minorenni.
        ========================================= */}

        {/* =========================================
            ICONS & STYLES
            Poppins is now self-hosted via next/font. Leaflet CSS is
            scoped to the member map component that uses it.
        ========================================= */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css"
        />
        <link rel="stylesheet" href="/assets/css/main.css" />
        <link rel="stylesheet" href="/assets/css/article.css" />
      </head>
      <body className={`antialiased ${poppins.variable}`}>
        <StructuredData />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <NewsletterPopup />
          <CookieBanner />
        </ThemeProvider>

        {/* Deferred global JS */}
        <script src="/assets/js/main.js" defer />
      </body>
    </html>
  );
}