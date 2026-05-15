'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface FormData {
  name: string;
  email: string;
  organisation: string;
  subject: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

export default function ContactPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    organisation: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.subject.trim()) newErrors.subject = 'Subject is required';
    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 20) {
      newErrors.message = 'Message must be at least 20 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send message');
      }

      router.push('/contact/thank-you');
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again or email us directly at info@bioergotech.org'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8FAFB] py-16 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[#008F6B] hover:text-[#00C896] transition-colors mb-6"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>
          <h1 className="text-4xl font-bold text-[#0A1628] mb-3">Get in Touch</h1>
          <p className="text-[#4A5568] text-lg">
            Have a question about the Agentic AI Program or a partnership inquiry? We'd love to hear from you.
          </p>
        </div>

        {/* Contact Info Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { icon: '✉️', label: 'Email', value: 'info@bioergotech.org' },
            { icon: '🌐', label: 'Website', value: 'www.bioergotech.org' },
            { icon: '📍', label: 'Location', value: 'Taranto, Italy' },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-xl p-4 border border-[#E2E8F0] flex items-start gap-3">
              <span className="text-xl">{item.icon}</span>
              <div>
                <p className="text-xs font-semibold text-[#008F6B] uppercase tracking-wider">{item.label}</p>
                <p className="text-sm text-[#0A1628] font-medium mt-0.5">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-8">
          <div className="space-y-6">

            {/* Name + Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-[#0A1628] mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  className={`w-full px-4 py-3 rounded-lg border text-[#0A1628] placeholder-[#A0AEC0] text-sm transition-colors outline-none focus:ring-2 focus:ring-[#00C896]/30 ${
                    errors.name ? 'border-red-400 bg-red-50' : 'border-[#E2E8F0] bg-[#F8FAFB] focus:border-[#00C896]'
                  }`}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#0A1628] mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  className={`w-full px-4 py-3 rounded-lg border text-[#0A1628] placeholder-[#A0AEC0] text-sm transition-colors outline-none focus:ring-2 focus:ring-[#00C896]/30 ${
                    errors.email ? 'border-red-400 bg-red-50' : 'border-[#E2E8F0] bg-[#F8FAFB] focus:border-[#00C896]'
                  }`}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>
            </div>

            {/* Organisation */}
            <div>
              <label className="block text-sm font-semibold text-[#0A1628] mb-1.5">
                Organisation / School <span className="text-[#A0AEC0] font-normal">(optional)</span>
              </label>
              <input
                type="text"
                name="organisation"
                value={formData.organisation}
                onChange={handleChange}
                placeholder="Your school, university or organisation"
                className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFB] text-[#0A1628] placeholder-[#A0AEC0] text-sm transition-colors outline-none focus:ring-2 focus:ring-[#00C896]/30 focus:border-[#00C896]"
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-semibold text-[#0A1628] mb-1.5">
                Subject <span className="text-red-500">*</span>
              </label>
              <select
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-lg border text-sm transition-colors outline-none focus:ring-2 focus:ring-[#00C896]/30 appearance-none bg-no-repeat ${
                  formData.subject ? 'text-[#0A1628]' : 'text-[#A0AEC0]'
                } ${
                  errors.subject ? 'border-red-400 bg-red-50' : 'border-[#E2E8F0] bg-[#F8FAFB] focus:border-[#00C896]'
                }`}
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23A0AEC0' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundPosition: 'right 12px center', paddingRight: '40px' }}
              >
                <option value="" disabled>Select a subject</option>
                <option value="Agentic AI Course Enquiry">Agentic AI Course Enquiry</option>
                <option value="Student Enrolment">Student Enrolment</option>
                <option value="School / Institution Partnership">School / Institution Partnership</option>
                <option value="Media / Press Enquiry">Media / Press Enquiry</option>
                <option value="Technical Support">Technical Support</option>
                <option value="General Enquiry">General Enquiry</option>
              </select>
              {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject}</p>}
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-semibold text-[#0A1628] mb-1.5">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={6}
                placeholder="Tell us how we can help you..."
                className={`w-full px-4 py-3 rounded-lg border text-[#0A1628] placeholder-[#A0AEC0] text-sm transition-colors outline-none focus:ring-2 focus:ring-[#00C896]/30 resize-none ${
                  errors.message ? 'border-red-400 bg-red-50' : 'border-[#E2E8F0] bg-[#F8FAFB] focus:border-[#00C896]'
                }`}
              />
              <div className="flex justify-between items-center mt-1">
                {errors.message ? (
                  <p className="text-red-500 text-xs">{errors.message}</p>
                ) : (
                  <span />
                )}
                <p className="text-xs text-[#A0AEC0] ml-auto">{formData.message.length} characters</p>
              </div>
            </div>

            {/* Submit Error */}
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600 text-sm">{submitError}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-[#0A1628] hover:bg-[#008F6B] text-white font-semibold py-3.5 px-6 rounded-lg transition-all duration-200 text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending your message...
                </>
              ) : (
                <>
                  Send Message
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>

            <p className="text-xs text-[#A0AEC0] text-center">
              We typically respond within 1–2 business days.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
