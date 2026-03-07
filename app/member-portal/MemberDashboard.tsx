'use client'

import type { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function MemberDashboard({ user }: { user: User }) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const displayName = user.user_metadata?.full_name || user.email

  return (
    <>
      {/* Hero */}
      <section className="bg-light-gray" style={{ padding: '100px 0 60px' }}>
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-800">Member Portal</h1>
          <p className="text-lg max-w-2xl mx-auto text-gray-600">
            Welcome back, <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{displayName}</span>
          </p>
          <button
            onClick={handleSignOut}
            className="btn-outline mt-6"
            style={{ fontSize: '.9rem' }}
          >
            Sign Out
          </button>
        </div>
      </section>

      {/* Dashboard Content */}
      <section className="section">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card">
              <div className="card-icon">
                <i className="fas fa-flask" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">My Projects</h3>
              <p className="text-gray-600 text-sm">Manage your active research projects and collaborations.</p>
            </div>
            <div className="card">
              <div className="card-icon">
                <i className="fas fa-calendar-check" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">Equipment Booking</h3>
              <p className="text-gray-600 text-sm">Reserve lab equipment and shared resources.</p>
            </div>
            <div className="card">
              <div className="card-icon">
                <i className="fas fa-users" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">Network</h3>
              <p className="text-gray-600 text-sm">Connect with other ecosystem members and researchers.</p>
            </div>
            <div className="card">
              <div className="card-icon">
                <i className="fas fa-file-alt" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">Resources</h3>
              <p className="text-gray-600 text-sm">Access shared protocols, datasets, and documentation.</p>
            </div>
            <div className="card">
              <div className="card-icon">
                <i className="fas fa-chart-line" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">Analytics</h3>
              <p className="text-gray-600 text-sm">Track your research metrics and impact data.</p>
            </div>
            <div className="card">
              <div className="card-icon">
                <i className="fas fa-cog" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">Settings</h3>
              <p className="text-gray-600 text-sm">Manage your profile, preferences, and notifications.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
