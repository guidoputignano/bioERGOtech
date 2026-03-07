import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'Cookie Policy for the bioERGOtech Foundation website.',
  alternates: { canonical: 'https://bioergotech.org/cookie-policy' },
}

export default function CookiePolicyPage() {
  return (
    <section className="section" style={{ paddingTop: 120 }}>
      <div className="container mx-auto px-6" style={{ maxWidth: 800 }}>
        <h1 className="text-4xl font-bold text-gray-800 mb-8">Cookie Policy</h1>
        <p className="text-gray-600 mb-6">Last updated: January 2025</p>

        <div className="space-y-8 text-gray-700 text-lg leading-relaxed">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">What Are Cookies?</h2>
            <p>
              Cookies are small text files that are stored on your device when you visit a website. They help the
              website remember your preferences and improve your browsing experience.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">How We Use Cookies</h2>
            <p className="mb-4">bioERGOtech uses the following types of cookies:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Essential Cookies:</strong> Required for the website to function, including authentication and session management via Supabase.</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how visitors interact with our website to improve the user experience.</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences for future visits.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Managing Cookies</h2>
            <p>
              You can control and delete cookies through your browser settings. Note that disabling certain cookies
              may affect the functionality of the website, including your ability to sign in to the Member Portal.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Contact</h2>
            <p>
              For questions about our cookie policy, please contact us at{' '}
              <a href="mailto:info@bioergotech.org" style={{ color: 'var(--primary)' }}>
                info@bioergotech.org
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
