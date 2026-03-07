'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null)
  const [backToTopVisible, setBackToTopVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => setBackToTopVisible(window.scrollY > 400)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    const supabase = createClient()
    const { error } = await supabase.from('newsletter_subscribers').insert({ email })

    if (error) {
      if (error.code === '23505') {
        setMessage({ text: 'You are already subscribed!', success: false })
      } else {
        setMessage({ text: 'Something went wrong. Please try again.', success: false })
      }
    } else {
      setMessage({ text: 'Thank you for subscribing!', success: true })
      setEmail('')
    }
  }

  return (
    <>
      <footer className="bg-light-gray py-10">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start">

            {/* Logo */}
            <div className="mb-6 md:mb-0">
              <Link href="/" className="flex items-center cursor-pointer">
                <Image
                  src="/assets/images/Logo/full_bioergotech_nobg.webp"
                  alt="bioERGOtech Logo"
                  width={160}
                  height={40}
                  className="h-10 w-auto"
                />
              </Link>
              <p className="text-gray-600 mt-2">Making research smarter, not just faster</p>
            </div>

            {/* Navigation */}
            <div className="flex flex-col md:flex-row md:space-x-10 space-y-4 md:space-y-0 mb-6 md:mb-0">
              <Link href="/join-us" className="text-gray-600 hover:text-[var(--primary)] transition">Join Us</Link>
              <Link href="/partner-with-us" className="text-gray-600 hover:text-[var(--primary)] transition">Partner with Us</Link>
              <Link href="/build-with-us" className="text-gray-600 hover:text-[var(--primary)] transition">Build with Us</Link>
              <Link href="/about-us" className="text-gray-600 hover:text-[var(--primary)] transition">About Us</Link>
            </div>

            {/* Newsletter */}
            <div className="w-full md:w-auto" style={{ maxWidth: 320 }}>
              <p className="text-gray-700 font-semibold text-sm mb-2">Stay Updated</p>
              <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email"
                  required
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-[var(--primary)]"
                  style={{ fontFamily: 'Poppins, sans-serif', minWidth: 0 }}
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition"
                  style={{ background: 'var(--primary)', fontFamily: 'Poppins, sans-serif', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Subscribe
                </button>
              </form>
              {message && (
                <p className="text-xs mt-1" style={{ color: message.success ? 'var(--primary)' : '#e53e3e' }}>
                  {message.text}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">No spam. Unsubscribe anytime.</p>
            </div>
          </div>

          <hr className="border-gray-300 my-8" />

          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} bioERGOtech Foundation. All rights reserved.
            </p>
            <div className="flex items-center space-x-6">
              <Link href="/cookie-policy" className="text-gray-500 hover:text-[var(--primary)] transition text-sm">
                Cookie Policy
              </Link>
              <a
                href="https://www.linkedin.com/company/bioergotech"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-[var(--primary)] transition"
              >
                <i className="fab fa-linkedin-in" />
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Back to top */}
      <button
        className={`back-to-top${backToTopVisible ? ' visible' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
      >
        <i className="fas fa-arrow-up" />
      </button>
    </>
  )
}
