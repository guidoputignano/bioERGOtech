import Link from 'next/link';

export default function ContactThankYouPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFB] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">

        {/* Success Icon */}
        <div className="w-20 h-20 bg-[#00C896]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-[#00C896]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-[#0A1628] mb-3">Message Sent!</h1>
        <p className="text-[#4A5568] text-lg mb-2">
          Thank you for reaching out to the bioERGOtech Foundation.
        </p>
        <p className="text-[#718096] text-sm mb-8">
          We've received your message and will get back to you within 1–2 business days.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/courses/agentic-ai"
            className="bg-[#0A1628] hover:bg-[#008F6B] text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 text-sm"
          >
            Explore the AI Course
          </Link>
          <Link
            href="/"
            className="border border-[#E2E8F0] hover:border-[#00C896] text-[#0A1628] font-semibold py-3 px-6 rounded-lg transition-all duration-200 text-sm"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
