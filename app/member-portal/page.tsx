import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import MemberDashboard from './MemberDashboard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Member Portal',
  description: 'Access the bioERGOtech Foundation member portal.',
}

export default async function MemberPortalPage() {
  // If Supabase is not configured, redirect to login where the form handles it gracefully
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    redirect('/auth/login')
  }

  const { createClient } = await import('@/utils/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return <MemberDashboard user={user} />
}
