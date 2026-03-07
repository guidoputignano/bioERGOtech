'use client'

import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

type Section = 'dashboard' | 'projects' | 'equipment' | 'events' | 'network' | 'resources'

const NAV_ITEMS: { id: Section; icon: string; label: string }[] = [
  { id: 'dashboard', icon: 'fa-th-large', label: 'Dashboard' },
  { id: 'projects', icon: 'fa-flask', label: 'Projects' },
  { id: 'equipment', icon: 'fa-microscope', label: 'Equipment' },
  { id: 'events', icon: 'fa-calendar-alt', label: 'Events' },
  { id: 'network', icon: 'fa-users', label: 'Network' },
  { id: 'resources', icon: 'fa-book-open', label: 'Resources' },
]

const PROJECTS = [
  { name: 'Synthetic Peptide Scaffold Design', pillar: 'Synthetic Biology', phase: 'production' as const, progress: 68 },
  { name: 'AI-Driven Cell Culture Automation', pillar: 'AI Automation', phase: 'validation' as const, progress: 42 },
  { name: 'Bioreactor Optimisation Protocol', pillar: 'Biomanufacturing', phase: 'ideation' as const, progress: 15 },
]

const EQUIPMENT = [
  { name: 'Flow Cytometer BD LSRFortessa', location: 'Hub A – Basel', status: 'available' as const, utilization: 72 },
  { name: 'Next-Gen Sequencer Illumina NovaSeq', location: 'Hub B – London', status: 'booked' as const, utilization: 91 },
  { name: 'Automated Cell Counter Beckman', location: 'Hub A – Basel', status: 'available' as const, utilization: 38 },
  { name: 'HPLC System Waters Alliance', location: 'Hub C – Singapore', status: 'maintenance' as const, utilization: 0 },
  { name: 'CO₂ Incubator Thermo Scientific', location: 'Hub A – Basel', status: 'available' as const, utilization: 55 },
]

const EVENTS = [
  {
    month: 'MAR', day: '18',
    name: 'Synthetic Biology Symposium 2026',
    description: 'Annual gathering of ecosystem members presenting project milestones.',
    meta: 'Basel, Switzerland · 09:00–18:00',
  },
  {
    month: 'APR', day: '02',
    name: 'Equipment Training: Flow Cytometry',
    description: 'Hands-on session for certified use of the BD LSRFortessa.',
    meta: 'Hub A – Basel · 14:00–17:00',
  },
  {
    month: 'APR', day: '15',
    name: 'AI in Biomanufacturing Webinar',
    description: 'Expert panel on integrating ML pipelines into production workflows.',
    meta: 'Online · 16:00–17:30 CET',
  },
  {
    month: 'MAY', day: '07',
    name: 'Q2 Member Network Mixer',
    description: 'Informal networking for new and existing ecosystem members.',
    meta: 'Hub B – London · 18:00–21:00',
  },
]

const NETWORK_MEMBERS = [
  { initials: 'ML', name: 'Dr. Maria Lorenz', org: 'ETH Zurich', location: 'Basel, CH', color: '#7C5CFC' },
  { initials: 'JS', name: 'James Sullivan', org: 'CellTech Dynamics', location: 'London, UK', color: '#0D9373' },
  { initials: 'AK', name: 'Aiko Kimura', org: 'Osaka University', location: 'Osaka, JP', color: '#E8A817' },
  { initials: 'FR', name: 'Fatima Reyes', org: 'BioNova Clinic', location: 'Barcelona, ES', color: '#E74C6F' },
  { initials: 'PT', name: 'Prof. Pierre Tissot', org: 'EPFL', location: 'Lausanne, CH', color: '#13D6B0' },
  { initials: 'SC', name: 'Sarah Chen', org: 'SynBio Ventures', location: 'San Francisco, US', color: '#7C5CFC' },
]

const KB_ITEMS = [
  { title: 'Standard Operating Procedure: Flow Cytometry', category: 'Protocol', desc: 'Step-by-step guide for BD LSRFortessa setup, calibration and data acquisition.' },
  { title: 'Bioreactor Scale-Up Calculation Templates', category: 'Tools', desc: 'Excel and Python templates for fed-batch and perfusion scale-up modelling.' },
  { title: 'IP & Data Sharing Agreement Template', category: 'Legal', desc: 'Foundation-approved template for cross-member research data sharing.' },
  { title: 'AI Model Training Dataset — Cell Morphology', category: 'Dataset', desc: 'Annotated microscopy images (50k frames) for classification model training.' },
  { title: 'Grant Writing Workshop Slides (2025)', category: 'Education', desc: 'Slide deck and recording from the H2025 EIC grant writing masterclass.' },
]

export default function MemberDashboard({ user }: { user: User }) {
  const router = useRouter()
  const supabase = createClient()
  const [activeSection, setActiveSection] = useState<Section>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [rsvpdEvents, setRsvpdEvents] = useState<Set<number>>(new Set())

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const displayName = user.user_metadata?.full_name || user.email || 'Member'
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase() || 'M'
  const org = user.user_metadata?.organization || 'bioERGOtech Member'

  const navigate = (section: Section) => {
    setActiveSection(section)
    setSidebarOpen(false)
  }

  const toggleRsvp = (idx: number) => {
    setRsvpdEvents(prev => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  return (
    <div className="portal-view active" style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile toggle */}
      <button
        className="sidebar-toggle"
        onClick={() => setSidebarOpen(o => !o)}
        aria-label="Toggle sidebar"
      >
        <i className={`fas ${sidebarOpen ? 'fa-times' : 'fa-bars'}`} />
      </button>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay active"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`portal-sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-header">
          <img
            src="/assets/images/Logo/full_bioergotech_nobg.webp"
            alt="bioERGOtech"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`sidebar-nav-item${activeSection === item.id ? ' active' : ''}`}
              onClick={() => navigate(item.id)}
            >
              <i className={`fas ${item.icon}`} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{displayName}</div>
            <div className="sidebar-user-org">{org}</div>
          </div>
          <button
            className="sidebar-logout"
            onClick={handleSignOut}
            title="Sign out"
          >
            <i className="fas fa-sign-out-alt" />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="portal-main">
        {/* ── Dashboard ── */}
        <div className={`portal-section${activeSection === 'dashboard' ? ' active' : ''}`}>
          <div className="portal-main-header">
            <h1>Welcome back, {displayName.split(' ')[0]}</h1>
            <p>Here's what's happening in your ecosystem today.</p>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon stat-icon-projects"><i className="fas fa-flask" /></div>
              <div className="stat-label">Active Projects</div>
              <div className="stat-value">3</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-members"><i className="fas fa-users" /></div>
              <div className="stat-label">Network Members</div>
              <div className="stat-value">54</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-equipment"><i className="fas fa-microscope" /></div>
              <div className="stat-label">Equipment Available</div>
              <div className="stat-value">4/5</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-events"><i className="fas fa-calendar-alt" /></div>
              <div className="stat-label">Upcoming Events</div>
              <div className="stat-value">4</div>
            </div>
          </div>

          <div className="portal-two-col">
            <div className="portal-card">
              <h3>Recent Projects</h3>
              {PROJECTS.map(p => (
                <div key={p.name} className="project-item">
                  <div className="project-header">
                    <span className="project-name">{p.name}</span>
                    <span className={`project-phase phase-${p.phase}`}>
                      {p.phase.charAt(0).toUpperCase() + p.phase.slice(1)}
                    </span>
                  </div>
                  <div className="project-pillar">{p.pillar}</div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${p.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="portal-card">
              <h3>Upcoming Events</h3>
              {EVENTS.slice(0, 3).map((ev, i) => (
                <div key={i} className="event-item">
                  <div className="event-date-badge">
                    <span className="month">{ev.month}</span>
                    <span className="day">{ev.day}</span>
                  </div>
                  <div className="event-info">
                    <div className="event-name">{ev.name}</div>
                    <div className="event-meta"><i className="fas fa-map-marker-alt" />{ev.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Projects ── */}
        <div className={`portal-section${activeSection === 'projects' ? ' active' : ''}`}>
          <div className="portal-main-header">
            <h1>Projects</h1>
            <p>Track and manage your active research projects.</p>
          </div>
          <div className="portal-card">
            {PROJECTS.map(p => (
              <div key={p.name} className="project-item">
                <div className="project-header">
                  <span className="project-name">{p.name}</span>
                  <span className={`project-phase phase-${p.phase}`}>
                    {p.phase.charAt(0).toUpperCase() + p.phase.slice(1)}
                  </span>
                </div>
                <div className="project-pillar">{p.pillar}</div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${p.progress}%` }} />
                </div>
                <div style={{ fontSize: '.8rem', color: 'var(--medium-gray)', marginTop: 4 }}>
                  {p.progress}% complete
                </div>
              </div>
            ))}
            <div className="empty-state" style={{ borderTop: '1px solid rgba(0,0,0,.05)', paddingTop: 24 }}>
              <i className="fas fa-plus-circle" style={{ fontSize: '1.5rem', display: 'block', marginBottom: 8, color: 'var(--primary)' }} />
              Contact your hub coordinator to register a new project.
            </div>
          </div>
        </div>

        {/* ── Equipment ── */}
        <div className={`portal-section${activeSection === 'equipment' ? ' active' : ''}`}>
          <div className="portal-main-header">
            <h1>Equipment</h1>
            <p>Browse and book shared lab infrastructure across all hubs.</p>
          </div>
          <div className="portal-card" style={{ overflowX: 'auto' }}>
            <table className="equipment-table">
              <thead>
                <tr>
                  <th>Equipment</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Utilization</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {EQUIPMENT.map(eq => (
                  <tr key={eq.name}>
                    <td data-label="Equipment">
                      <div className="equipment-name">{eq.name}</div>
                    </td>
                    <td data-label="Location">
                      <div className="equipment-location">{eq.location}</div>
                    </td>
                    <td data-label="Status">
                      <span className={`status-badge status-${eq.status}`}>
                        {eq.status.charAt(0).toUpperCase() + eq.status.slice(1)}
                      </span>
                    </td>
                    <td data-label="Utilization">
                      <div className="utilization-bar">
                        <div className="utilization-track">
                          <div className="utilization-fill" style={{ width: `${eq.utilization}%` }} />
                        </div>
                        <span className="utilization-label">{eq.utilization}%</span>
                      </div>
                    </td>
                    <td data-label="Action">
                      <button
                        className="btn-book"
                        disabled={eq.status !== 'available'}
                      >
                        Book
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Events ── */}
        <div className={`portal-section${activeSection === 'events' ? ' active' : ''}`}>
          <div className="portal-main-header">
            <h1>Events</h1>
            <p>Upcoming workshops, symposia, and networking sessions.</p>
          </div>
          <div className="portal-card">
            {EVENTS.map((ev, i) => (
              <div key={i} className="event-item">
                <div className="event-date-badge">
                  <span className="month">{ev.month}</span>
                  <span className="day">{ev.day}</span>
                </div>
                <div className="event-info">
                  <div className="event-name">{ev.name}</div>
                  <div className="event-description">{ev.description}</div>
                  <div className="event-meta"><i className="fas fa-map-marker-alt" />{ev.meta}</div>
                </div>
                <button
                  className={`btn-rsvp${rsvpdEvents.has(i) ? ' rsvpd' : ''}`}
                  onClick={() => toggleRsvp(i)}
                >
                  {rsvpdEvents.has(i) ? 'RSVPd ✓' : 'RSVP'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Network ── */}
        <div className={`portal-section${activeSection === 'network' ? ' active' : ''}`}>
          <div className="portal-main-header">
            <h1>Network</h1>
            <p>Connect with researchers, clinicians, and innovators in the ecosystem.</p>
          </div>
          <div className="directory-grid">
            {NETWORK_MEMBERS.map(m => (
              <div key={m.name} className="directory-card">
                <div
                  className="directory-avatar"
                  style={{ background: m.color }}
                >
                  {m.initials}
                </div>
                <div className="directory-info">
                  <div className="directory-name">{m.name}</div>
                  <div className="directory-org">{m.org}</div>
                  <div className="directory-location">
                    <i className="fas fa-map-marker-alt" style={{ marginRight: 4, fontSize: '.75rem' }} />
                    {m.location}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Resources ── */}
        <div className={`portal-section${activeSection === 'resources' ? ' active' : ''}`}>
          <div className="portal-main-header">
            <h1>Resources</h1>
            <p>Protocols, datasets, legal templates, and educational materials.</p>
          </div>

          <div className="kb-search">
            <i className="fas fa-search" />
            <input type="text" placeholder="Search resources…" />
          </div>

          <div className="kb-categories">
            {['All', 'Protocol', 'Tools', 'Legal', 'Dataset', 'Education'].map(cat => (
              <button key={cat} className={`kb-category-btn${cat === 'All' ? ' active' : ''}`}>
                {cat}
              </button>
            ))}
          </div>

          {KB_ITEMS.map(item => (
            <div key={item.title} className="kb-item">
              <div className="kb-item-header">
                <span className="kb-item-title">{item.title}</span>
                <span className="kb-item-category">{item.category}</span>
              </div>
              <div className="kb-item-desc">{item.desc}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
