'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

type Panel = 'login' | 'register' | 'forgot'

const ORG_TYPES = [
  { type: 'Startup / Biotech', icon: 'fa-rocket' },
  { type: 'Hospital / Clinical Center', icon: 'fa-hospital' },
  { type: 'University / Research Lab', icon: 'fa-university' },
  { type: 'Investor / VC', icon: 'fa-chart-line' },
  { type: 'Government / Public', icon: 'fa-landmark' },
  { type: 'Independent Researcher', icon: 'fa-user-graduate' },
]

export default function LoginForm() {
  const router = useRouter()
  const [panel, setPanel] = useState<Panel>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regOrg, setRegOrg] = useState('')
  const [regOrgTypes, setRegOrgTypes] = useState<string[]>([])
  const [regInterest, setRegInterest] = useState('')

  const [forgotEmail, setForgotEmail] = useState('')

  const supabaseReady =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)

  const switchPanel = (p: Panel) => { setPanel(p); setError(null); setInfo(null) }

  const handleOAuth = async (provider: 'google' | 'apple') => {
    if (!supabaseReady) { setError('Auth service not yet configured — please try again soon.'); return }
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabaseReady) { setError('Auth service not yet configured.'); return }
    setLoading(true); setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword })
    setLoading(false)
    if (error) { setError(error.message) }
    else { router.push('/member-portal'); router.refresh() }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabaseReady) { setError('Auth service not yet configured.'); return }
    setLoading(true); setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: regEmail,
      password: regPassword,
      options: {
        data: { full_name: regName, organisation: regOrg, org_types: regOrgTypes, interest: regInterest },
        emailRedirectTo: `${location.origin}/auth/confirm`,
      },
    })
    setLoading(false)
    if (error) { setError(error.message) }
    else { setInfo('Account created! Check your email to confirm before signing in.'); switchPanel('login') }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabaseReady) { setError('Auth service not yet configured.'); return }
    setLoading(true); setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${location.origin}/auth/reset-password`,
    })
    setLoading(false)
    if (error) { setError(error.message) }
    else { setInfo('Password reset link sent — check your inbox.'); switchPanel('login') }
  }

  const toggleOrgType = (t: string) =>
    setRegOrgTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  return (
    <>
      {/* Tab switcher */}
      {panel !== 'forgot' && (
        <div style={{ display: 'flex', background: 'var(--light-gray)', borderRadius: 12, padding: 4, marginBottom: 32 }}>
          {(['login', 'register'] as Panel[]).map(p => (
            <button key={p} onClick={() => switchPanel(p)} style={{
              flex: 1, padding: '11px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: '.9rem', transition: 'all .2s',
              background: panel === p ? 'var(--primary)' : 'transparent',
              color: panel === p ? '#fff' : 'var(--dark)',
              boxShadow: panel === p ? '0 2px 8px rgba(19,214,176,.3)' : 'none',
            }}>
              {p === 'login' ? 'Sign In' : 'Join the Ecosystem'}
            </button>
          ))}
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', color: '#c53030', borderRadius: 10, padding: '13px 16px', marginBottom: 20, fontSize: '.875rem', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fas fa-exclamation-circle" style={{ flexShrink: 0 }} />
          {error}
        </div>
      )}
      {info && (
        <div style={{ background: '#f0fff4', border: '1px solid #c6f6d5', color: '#276749', borderRadius: 10, padding: '13px 16px', marginBottom: 20, fontSize: '.875rem', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fas fa-check-circle" style={{ flexShrink: 0 }} />
          {info}
        </div>
      )}

      {/* ── LOGIN ── */}
      {panel === 'login' && (
        <div className="auth-card">
          <h2>Welcome back</h2>
          <p className="auth-subtitle">Sign in to access your dashboard and the ecosystem.</p>
          <OAuthRow onOAuth={handleOAuth} label="or sign in with email" />
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="l-email">Email</label>
              <input id="l-email" type="email" placeholder="you@organisation.com" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="l-password">Password</label>
              <input id="l-password" type="password" placeholder="Your password" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
            </div>
            <div style={{ textAlign: 'right', marginTop: -10, marginBottom: 20 }}>
              <button type="button" onClick={() => switchPanel('forgot')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 500, fontSize: '.85rem', cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>
                Forgot password?
              </button>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <><i className="fas fa-circle-notch fa-spin" style={{ marginRight: 8 }} />Signing in…</> : 'Sign In'}
              </button>
            </div>
          </form>
          <div className="auth-switch">
            New to bioERGOtech? <a style={{ cursor: 'pointer' }} onClick={() => switchPanel('register')}>Join the Ecosystem</a>
          </div>
        </div>
      )}

      {/* ── REGISTER ── */}
      {panel === 'register' && (
        <div className="register-card">
          <h2>Join the Ecosystem</h2>
          <p className="auth-subtitle">Create your account to access projects, equipment, events, and the member network.</p>
          <OAuthRow onOAuth={handleOAuth} label="or fill in the form" />
          <form onSubmit={handleRegister} className="register-form">
            <label style={{ fontWeight: 600, marginBottom: 4, display: 'block', fontSize: '.9rem' }}>
              Type of organisation
              <span style={{ fontWeight: 400, color: 'var(--medium-gray)', marginLeft: 8, fontSize: '.8rem' }}>Optional — select all that apply</span>
            </label>
            <div className="org-type-grid" style={{ marginBottom: 24 }}>
              {ORG_TYPES.map(({ type, icon }) => (
                <div key={type} className={`org-type-option${regOrgTypes.includes(type) ? ' selected' : ''}`} onClick={() => toggleOrgType(type)}>
                  <i className={`fas ${icon}`} />
                  <span>{type}</span>
                </div>
              ))}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="r-name">Full Name *</label>
                <input id="r-name" type="text" placeholder="Your name" required value={regName} onChange={e => setRegName(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="r-org">Organisation</label>
                <input id="r-org" type="text" placeholder="Company / university" value={regOrg} onChange={e => setRegOrg(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="r-email">Email *</label>
              <input id="r-email" type="email" placeholder="you@organisation.com" required value={regEmail} onChange={e => setRegEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="r-password">Password *</label>
              <input id="r-password" type="password" placeholder="Min. 6 characters" required minLength={6} value={regPassword} onChange={e => setRegPassword(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="r-interest">What brings you to bioERGOtech?</label>
              <textarea id="r-interest" placeholder="Your research interests, how you'd like to collaborate…" rows={3} value={regInterest} onChange={e => setRegInterest(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%', border: 'none', fontFamily: 'Poppins,sans-serif', fontSize: '1rem', textAlign: 'center' }} disabled={loading}>
              {loading ? <><i className="fas fa-circle-notch fa-spin" style={{ marginRight: 8 }} />Creating account…</> : 'Create Account'}
            </button>
          </form>
          <div className="auth-switch" style={{ marginTop: 20 }}>
            Already a member? <a style={{ cursor: 'pointer' }} onClick={() => switchPanel('login')}>Sign In</a>
          </div>
        </div>
      )}

      {/* ── FORGOT ── */}
      {panel === 'forgot' && (
        <div className="auth-card">
          <button onClick={() => switchPanel('login')} style={{ background: 'none', border: 'none', color: 'var(--medium-gray)', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '.85rem', padding: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="fas fa-arrow-left" /> Back to Sign In
          </button>
          <h2>Reset password</h2>
          <p className="auth-subtitle">Enter your email and we&apos;ll send a link to reset your password.</p>
          <form onSubmit={handleForgot}>
            <div className="form-group">
              <label htmlFor="f-email">Email</label>
              <input id="f-email" type="email" placeholder="you@organisation.com" required value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary" style={{ width: '100%', border: 'none', fontFamily: 'Poppins,sans-serif' }} disabled={loading}>
                {loading ? <><i className="fas fa-circle-notch fa-spin" style={{ marginRight: 8 }} />Sending…</> : 'Send Reset Link'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}

function OAuthRow({ onOAuth, label }: { onOAuth: (p: 'google' | 'apple') => void; label: string }) {
  return (
    <>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button type="button" onClick={() => onOAuth('google')}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 16px', border: '1.5px solid rgba(0,0,0,.12)', borderRadius: 9, background: '#fff', fontFamily: 'Poppins,sans-serif', fontSize: '.85rem', fontWeight: 500, color: '#3c4043', cursor: 'pointer', transition: 'box-shadow .2s' }}
          onMouseOver={e => (e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,.1)')}
          onMouseOut={e => (e.currentTarget.style.boxShadow = 'none')}
        >
          <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-3.58-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Google
        </button>
        <button type="button" onClick={() => onOAuth('apple')}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 16px', border: '1.5px solid rgba(0,0,0,.12)', borderRadius: 9, background: '#000', fontFamily: 'Poppins,sans-serif', fontSize: '.85rem', fontWeight: 500, color: '#fff', cursor: 'pointer', transition: 'opacity .2s' }}
          onMouseOver={e => (e.currentTarget.style.opacity = '.85')}
          onMouseOut={e => (e.currentTarget.style.opacity = '1')}
        >
          <svg width="14" height="17" viewBox="0 0 814 1000" aria-hidden="true" fill="currentColor">
            <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.9 0 663.6 0 541.5c0-194.1 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
          </svg>
          Apple
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,.08)' }} />
        <span style={{ fontSize: '.8rem', color: 'var(--medium-gray)', whiteSpace: 'nowrap' }}>{label}</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,.08)' }} />
      </div>
    </>
  )
}
