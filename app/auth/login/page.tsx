import type { Metadata } from 'next'
import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to the bioERGOtech Member Portal',
}

export default function LoginPage() {
  return (
    <section className="section" style={{ paddingTop: 120, paddingBottom: 80, minHeight: '100vh' }}>
      <div className="container mx-auto px-6">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-800 mb-3">Member Portal</h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Access your projects, connect with ecosystem members, and manage shared resources.
          </p>
        </div>
        <LoginForm />
      </div>
    </section>
  )
}
