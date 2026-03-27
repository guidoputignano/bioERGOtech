import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import CookieBanner from "@/components/cookie-banner";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "bioERGOtech Foundation - Making Research Smarter",
  description:
    "bioERGOtech Foundation develops Engineered Living Systems through synthetic biology, AI-driven automation, and multi-omics analytics across hubs in Taranto, Zurich, and Riyadh.",
  icons: {
    icon: "/assets/images/Logo/short_logo.webp",
    shortcut: "/assets/images/Logo/short_logo.webp",
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
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <CookieBanner />
        </ThemeProvider>
        <script src="/assets/js/main.js" defer></script>
      </body>
    </html>
  );
}
