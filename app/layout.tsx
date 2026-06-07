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
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.bioergotech.org"),
  title: {
    default: "bioERGOtech Foundation: Engineered Living Systems",
    template: "%s | bioERGOtech Foundation",
  },
  description:
    "bioERGOtech Foundation develops Engineered Living Systems through synthetic biology, AI-driven automation, and human-centred design.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "bioERGOtech Foundation: Engineered Living Systems",
    description:
      "bioERGOtech Foundation develops Engineered Living Systems through synthetic biology, AI-driven automation, and human-centred design.",
    url: "https://www.bioergotech.org",
    siteName: "bioERGOtech Foundation",
    images: [
      {
        url: "https://www.bioergotech.org/assets/images/og-image-v2.jpg",
        width: 1200,
        height: 630,
        alt: "bioERGOtech Foundation",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "bioERGOtech Foundation: Engineered Living Systems",
    description:
      "bioERGOtech Foundation develops Engineered Living Systems through synthetic biology, AI-driven automation, and human-centred design.",
    images: ["https://www.bioergotech.org/assets/images/og-image-v2.jpg"],
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
        {/* =========================================
            TRACKING — Google Analytics + Google Ads
            Single gtag.js load, two configs
        ========================================= */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-GWKKXQ2S7M"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-GWKKXQ2S7M', { send_page_view: false });
              gtag('config', 'AW-17391421551');
            `,
          }}
        />

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