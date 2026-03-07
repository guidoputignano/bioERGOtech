'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

type Panel = 'login' | 'register' | 'forgot'

export default function LoginForm() {
  const router = useRouter()
  const supabase = createClient()
  const [panel, setPanel] = useState<Panel>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  // Login
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regName, setRegName] = useState('')

  // Forgot
  const [forgotEmail, setForgotEmail] = useState('')

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setError(null)
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      router.push('/member-portal')
      router.refresh()
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signUp({
      email: regEmail,
      password: regPassword,
      options: {
        data: { full_name: regName },
        emailRedirectTo: `${location.origin}/auth/confirm`,
      },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setInfo('Check your email to confirm your account before signing in.')
      setPanel('login')
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${location.origin}/auth/reset-password`,
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setInfo('Password reset email sent. Check your inbox.')
      setPanel('login')
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      {/* Tabs */}
      <div className="flex justify-center mb-8">
        <div style={{ display: 'inline-flex', background: 'var(--light-gray)', borderRadius: 10, padding: 4 }}>
          <button
            onClick={() => { setPanel('login'); setError(null) }}
            style={{
              padding: '10px 32px', borderRadius: 8, border: 'none',
              fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '.95rem',
              cursor: 'pointer', transition: 'all .2s ease',
              background: panel === 'login' ? 'var(--primary)' : 'transparent',
              color: panel === 'login' ? '#fff' : 'var(--dark)',
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => { setPanel('register'); setError(null) }}
            style={{
              padding: '10px 32px', borderRadius: 8, border: 'none',
              fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '.95rem',
              cursor: 'pointer', transition: 'all .2s ease',
              background: panel === 'register' ? 'var(--primary)' : 'transparent',
              color: panel === 'register' ? '#fff' : 'var(--dark)',
            }}
          >
            Join the Ecosystem
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', color: '#c53030', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: '.9rem' }}>
          {error}
        </div>
      )}
      {info && (
        <div style={{ background: '#f0fff4', border: '1px solid #c6f6d5', color: '#276749', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: '.9rem' }}>
          {info}
        </div>
      )}

      {/* LOGIN */}
      {panel === 'login' && (
        <div className="auth-card">
          <h2>Welcome Back</h2>
          <p className="auth-subtitle">Sign in to access your portal dashboard.</p>

          <OAuthButtons onOAuth={handleOAuth} dividerText="or sign in with email" />

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="loginEmail">Email</label>
              <input type="email" id="loginEmail" placeholder="you@organisation.com" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="loginPassword">Password</label>
              <input type="password" id="loginPassword" placeholder="Enter your password" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
            </div>
            <div style={{ textAlign: 'right', marginTop: -8, marginBottom: 16 }}>
              <button type="button" onClick={() => setPanel('forgot')} style={{ fontSize: '.85rem', color: 'var(--primary)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>
                Forgot password?
              </button>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </div>
          </form>
          <div className="auth-switch">
            Not a member yet?{' '}
            <button onClick={() => setPanel('register')} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              Join the Ecosystem
            </button>
          </div>
        </div>
      )}

      {/* REGISTER */}
      {panel === 'register' && (
        <div className="auth-card">
          <h2>Join the Ecosystem</h2>
          <p className="auth-subtitle">Apply to become part of the bioERGOtech network.</p>

          <OAuthButtons onOAuth={handleOAuth} dividerText="or fill in the form" />

          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label htmlFor="regName">Full Name</label>
              <input type="text" id="regName" placeholder="Your name" required value={regName} onChange={e => setRegName(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="regEmail">Email</label>
              <input type="email" id="regEmail" placeholder="you@organisation.com" required value={regEmail} onChange={e => setRegEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="regPassword">Password</label>
              <input type="password" id="regPassword" placeholder="Min. 6 characters" required minLength={6} value={regPassword} onChange={e => setRegPassword(e.target.value)} />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </div>
          </form>
          <div className="auth-switch">
            Already a member?{' '}
            <button onClick={() => setPanel('login')} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              Sign In
            </button>
          </div>
        </div>
      )}

      {/* FORGOT PASSWORD */}
      {panel === 'forgot' && (
        <div className="auth-card">
          <h2>Reset Password</h2>
          <p className="auth-subtitle">Enter your email address and we&apos;ll send you a reset link.</p>
          <form onSubmit={handleForgot}>
            <div className="form-group">
              <label htmlFor="forgotEmail">Email</label>
              <input type="email" id="forgotEmail" placeholder="you@organisation.com" required value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </div>
          </form>
          <div className="auth-switch">
            <button onClick={() => setPanel('login')} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              ← Back to Sign In
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function OAuthButtons({ onOAuth, dividerText }: { onOAuth: (p: 'google' | 'apple') => void; dividerText: string }) {
  return (
    <>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => onOAuth('google')}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 16px', border: '1.5px solid rgba(0,0,0,.15)', borderRadius: 8, background: '#fff', fontFamily: 'Poppins,sans-serif', fontSize: '.85rem', fontWeight: 500, color: '#3c4043', cursor: 'pointer' }}
        >
          <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-3.58-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Google
        </button>
        <button
          type="button"
          onClick={() => onOAuth('apple')}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 16px', border: '1.5px solid rgba(0,0,0,.15)', borderRadius: 8, background: '#000', fontFamily: 'Poppins,sans-serif', fontSize: '.85rem', fontWeight: 500, color: '#fff', cursor: 'pointer' }}
        >
          <svg width="15" height="18" viewBox="0 0 814 1000" aria-hidden="true" fill="currentColor">
            <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.9 0 663.6 0 541.5c0-194.1 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
          </svg>
          Apple
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,.1)' }} />
        <span style={{ fontSize: '.8rem', color: 'var(--medium-gray)', whiteSpace: 'nowrap' }}>{dividerText}</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,.1)' }} />
      </div>
    </>
  )
}
