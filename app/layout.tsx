import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
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
            FONTS
        ========================================= */}
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />

        {/* =========================================
            ICONS & STYLES
        ========================================= */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css"
        />
        <link rel="stylesheet" href="/assets/css/main.css" />
        <link rel="stylesheet" href="/assets/css/article.css" />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />
      </head>
      <body className="antialiased">
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