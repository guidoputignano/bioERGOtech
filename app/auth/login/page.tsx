import type { Metadata } from 'next'
import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Sign In – Member Portal',
  description: 'Sign in or create your bioERGOtech Foundation member account.',
}

export default function LoginPage() {
  return (
    <div className="portal-auth" style={{ background: 'var(--light-gray)', display: 'flex', alignItems: 'stretch', minHeight: '100vh', paddingTop: 0 }}>
      {/* Left branding panel */}
      <div
        className="hidden md:flex flex-col justify-between"
        style={{
          width: '42%',
          minHeight: '100vh',
          background: 'linear-gradient(160deg, #0a1a16 0%, #0d2b22 50%, #0f3d2e 100%)',
          padding: '48px 52px',
          position: 'sticky',
          top: 0,
        }}
      >
        <div>
          {/* Logo */}
          <a href="/" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <img src="/assets/images/Logo/full_bioergotech_nobg.webp" alt="bioERGOtech" style={{ height: 36, filter: 'brightness(0) invert(1)' }} />
          </a>
        </div>

        <div>
          <h1 style={{ color: '#fff', fontSize: '2.4rem', fontWeight: 700, lineHeight: 1.25, marginBottom: 20 }}>
            The ecosystem for<br />
            <span style={{ color: 'var(--primary)' }}>Engineered Living<br />Systems</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,.6)', fontSize: '1rem', lineHeight: 1.7, marginBottom: 40, maxWidth: 360 }}>
            Connect with researchers, clinicians, and innovators advancing synthetic biology, AI-driven automation, and biomanufacturing.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {[
              { icon: 'fa-flask', label: 'Access shared lab infrastructure across 3 hubs' },
              { icon: 'fa-users', label: 'Network with 50+ ecosystem members globally' },
              { icon: 'fa-chart-line', label: 'Track projects and research outcomes' },
            ].map(({ icon, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(19,214,176,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`fas ${icon}`} style={{ color: 'var(--primary)', fontSize: '.9rem' }} />
                </div>
                <span style={{ color: 'rgba(255,255,255,.75)', fontSize: '.9rem' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ color: 'rgba(255,255,255,.3)', fontSize: '.8rem' }}>
          © {new Date().getFullYear()} bioERGOtech Foundation. All rights reserved.
        </p>
      </div>

      {/* Right form panel */}
      <div
        className="flex flex-col justify-center"
        style={{ flex: 1, padding: '64px 48px', overflowY: 'auto', background: '#fff' }}
      >
        {/* Mobile logo */}
        <div className="flex md:hidden justify-center mb-8">
          <a href="/">
            <img src="/assets/images/Logo/full_bioergotech_nobg.webp" alt="bioERGOtech" style={{ height: 32 }} />
          </a>
        </div>

        <div style={{ maxWidth: 480, width: '100%', margin: '0 auto' }}>
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
