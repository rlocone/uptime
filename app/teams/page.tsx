import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { TeamsContent } from '@/components/teams-content'

export default async function TeamsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/login?next=/teams')
  }

  return <TeamsContent />
}

export async function generateMetadata() {
  return { title: 'Teams — Uptime Project' }
}
