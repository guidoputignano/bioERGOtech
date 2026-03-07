import Link from 'next/link'

export default function NotFound() {
  return (
    <section className="section" style={{ paddingTop: 120, minHeight: '80vh', display: 'flex', alignItems: 'center' }}>
      <div className="container mx-auto px-6 text-center">
        <h1 className="text-8xl font-bold mb-4" style={{ color: 'var(--primary)' }}>404</h1>
        <h2 className="text-3xl font-semibold text-gray-800 mb-6">Page Not Found</h2>
        <p className="text-xl text-gray-600 mb-10 max-w-xl mx-auto">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link href="/" className="btn-primary">← Back to Home</Link>
      </div>
    </section>
  )
}
