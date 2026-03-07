import type { Metadata } from 'next'
import ResetPasswordForm from './ResetPasswordForm'

export const metadata: Metadata = { title: 'Reset Password' }

export default function ResetPasswordPage() {
  return (
    <section className="section" style={{ paddingTop: 120, paddingBottom: 80, minHeight: '100vh' }}>
      <div className="container mx-auto px-6">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-800 mb-3">Set New Password</h1>
        </div>
        <ResetPasswordForm />
      </div>
    </section>
  )
}
