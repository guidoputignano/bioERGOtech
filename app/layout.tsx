import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import CookieBanner from "@/components/cookie-banner";
import "./globals.css";
import NewsletterPopup from "@/components/newsletter-popup";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "bioERGOtech Foundation",
    template: "%s | bioERGOtech Foundation",
  },
  description:
    "bioERGOtech Foundation develops Engineered Living Systems through synthetic biology, AI-driven automation, and multi-omics analytics across hubs in Taranto, Zurich, and Riyadh.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.png",
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
        ...
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