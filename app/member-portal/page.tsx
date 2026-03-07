import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import MemberDashboard from './MemberDashboard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Member Portal',
  description: 'Access the bioERGOtech Foundation member portal.',
}

export default async function MemberPortalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return <MemberDashboard user={user} />
}
