import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: {
    default: 'bioERGOtech Foundation - Making Research Smarter',
    template: '%s | bioERGOtech Foundation',
  },
  description:
    'bioERGOtech Foundation develops Engineered Living Systems through synthetic biology, AI-driven automation, and multi-omics analytics across hubs in Taranto, Zurich, and Riyadh.',
  metadataBase: new URL('https://bioergotech.org'),
  openGraph: {
    siteName: 'bioERGOtech Foundation',
    images: ['/assets/images/Logo/short_logo.webp'],
  },
  icons: {
    icon: '/assets/images/Logo/short_logo.webp',
    shortcut: '/assets/images/Logo/short_logo.webp',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css"
        />
      </head>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
