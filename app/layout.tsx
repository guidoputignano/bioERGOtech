import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import CookieBanner from "@/components/cookie-banner";
import NewsletterPopup from "@/components/newsletter-popup";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL("https://www.bioergotech.org"),
  title: {
    default: "bioERGOtech Foundation — Engineered Living Systems",
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
    title: "bioERGOtech Foundation — Engineered Living Systemsn",
    description:
      "bioERGOtech Foundation develops Engineered Living Systems through synthetic biology, AI-driven automation, and human-centred design.",
    url: "https://www.bioergotech.org",
    siteName: "bioERGOtech Foundation",
    images: [
      {
        url: "https://www.bioergotech.org/assets/images/og-image.jpeg?v=2",
        width: 1200,
        height: 630,
        alt: "bioERGOtech Foundation",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "bioERGOtech Foundation — Engineered Living Systems",
    description:
      "bioERGOtech Foundation develops Engineered Living Systems through synthetic biology, AI-driven automation, and human-centred design.",
    images: ["https://www.bioergotech.org/assets/images/og-image.jpg"],
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
        {/* Google Analytics */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-GWKKXQ2S7M"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-GWKKXQ2S7M', { send_page_view: false });
            `,
          }}
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
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
        <script src="/assets/js/main.js" defer></script>
      </body>
    </html>
  );
}