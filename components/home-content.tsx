'use client'

import { StatsSidebar } from '@/components/stats-sidebar'
import { MiniLeaderboard } from '@/components/mini-leaderboard'
import { Server, Zap } from 'lucide-react'

const categories = [
  'hosts_current', 'hosts_record',
  'users_current', 'users_record',
  'new_hosts', 'new_users',
]

export function HomeContent() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6">
      {/* Hero */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border neon-border bg-card px-4 py-1.5 text-xs text-muted-foreground mb-4">
          <Zap className="h-3.5 w-3.5 text-[#39ff14]" />
          Competitive Uptime Tracking
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
          <span className="neon-text-blue">Uptime</span>{' '}
          <span className="text-foreground">Project</span>
        </h1>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Track your server uptime and compete on global leaderboards. Install the agent, report your uptime, climb the ranks.
        </p>
      </div>

      {/* Sidebar + Leaderboards layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        <aside className="space-y-4">
          <StatsSidebar />
          <div className="rounded-lg border neon-border bg-card p-4 text-xs text-muted-foreground space-y-2">
            <h3 className="text-sm font-semibold neon-text-green flex items-center gap-2">
              <Server className="h-4 w-4" />
              Quick Start
            </h3>
            <p>1. Register an account</p>
            <p>2. Get your API key from Profile</p>
            <p>3. Run the agent script on your servers</p>
            <p>4. Watch your uptime climb the leaderboards</p>
          </div>
        </aside>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((cat) => (
            <MiniLeaderboard key={cat} category={cat} />
          ))}
        </div>
      </div>
    </div>
  )
}
