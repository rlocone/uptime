import { NavHeader } from '@/components/nav-header'
import { SiteFooter } from '@/components/site-footer'
import { LeaderboardContent } from '@/components/leaderboard-content'

export default function LeaderboardPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavHeader />
      <main className="flex-1">
        <LeaderboardContent />
      </main>
      <SiteFooter />
    </div>
  )
}
