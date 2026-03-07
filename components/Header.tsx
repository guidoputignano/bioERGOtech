'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight
      setScrolled(scrollTop > 10)
      setScrollProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { href: '/join-us', label: 'Join Us' },
    { href: '/partner-with-us', label: 'Partner with Us' },
    { href: '/build-with-us', label: 'Build with Us' },
    { href: '/about-us', label: 'About Us' },
  ]

  return (
    <>
      {/* Progress Bar */}
      <div className="progress-container">
        <div className="progress-bar" style={{ width: `${scrollProgress}%` }} />
      </div>

      {/* Navbar */}
      <nav className={`navbar py-4${scrolled ? ' scrolled' : ''}`} id="navbar">
        <div className="container mx-auto px-6 flex justify-between items-center">
          <Link href="/" className="flex items-center cursor-pointer">
            <Image
              src="/assets/images/Logo/full_bioergotech_nobg.webp"
              alt="bioERGOtech Logo"
              width={160}
              height={40}
              className="h-10 w-auto"
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex space-x-10">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link${pathname === link.href ? ' active' : ''}`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/member-portal"
              className={`nav-link${pathname === '/member-portal' ? ' active' : ''}`}
              style={{ color: 'var(--primary)', fontWeight: 600 }}
            >
              Member Portal
            </Link>
          </div>

          {/* Hamburger */}
          <div className="md:hidden">
            <div
              className={`menu-toggle${menuOpen ? ' active' : ''}`}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`mobile-menu${menuOpen ? ' active' : ''}`} id="mobileMenu">
        <div className="flex justify-end p-4">
          <button onClick={() => setMenuOpen(false)} className="text-gray-500 hover:text-gray-700">
            <i className="fas fa-times text-2xl" />
          </button>
        </div>
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="mobile-nav-link"
            onClick={() => setMenuOpen(false)}
          >
            {link.label}
          </Link>
        ))}
        <Link
          href="/member-portal"
          className="mobile-nav-link"
          style={{ color: 'var(--primary)', fontWeight: 600 }}
          onClick={() => setMenuOpen(false)}
        >
          Member Portal
        </Link>
      </div>
    </>
  )
}
