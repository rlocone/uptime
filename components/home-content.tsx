import { prisma } from '@/lib/db'
import { StatsSidebar } from '@/components/stats-sidebar'
import { MiniLeaderboard, type LeaderboardEntry } from '@/components/mini-leaderboard'
import { Server, Zap } from 'lucide-react'

const categories = [
  'hosts_current', 'hosts_record',
  'users_current', 'users_record',
  'new_hosts', 'new_users',
] as const

interface Stats {
  usersOnline: number
  totalUsers: number
  totalHosts: number
  totalReports: number
  pageviews: number
}

async function getStats(): Promise<Stats> {
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000)

  const usersOnline = await prisma.user.count({ where: { lastSeen: { gte: tenMinAgo } } })
  const totalUsers = await prisma.user.count()
  const totalHosts = await prisma.host.count()
  const totalReports = await prisma.report.count()
  const pageviewRow = await prisma.pageview.upsert({
    where: { id: 'singleton' },
    update: { count: { increment: 1 } },
    create: { id: 'singleton', count: 1 },
  })

  return {
    usersOnline,
    totalUsers,
    totalHosts,
    totalReports,
    pageviews: pageviewRow?.count ?? 0,
  }
}

async function getLeaderboardEntries(category: (typeof categories)[number]): Promise<LeaderboardEntry[]> {
  if (category === 'hosts_current') {
    const results: any[] = await prisma.$queryRaw`
      SELECT h.hostname, u.username, r.uptime_seconds, r.reported_at
      FROM hosts h
      JOIN users u ON h.user_id = u.id
      JOIN LATERAL (
        SELECT uptime_seconds, reported_at FROM reports
        WHERE host_id = h.id ORDER BY reported_at DESC LIMIT 1
      ) r ON true
      ORDER BY r.uptime_seconds DESC
      LIMIT 5
    `
    return (results ?? []).map((r: any, i: number) => ({
      rank: i + 1,
      name: `${r?.hostname ?? 'unknown'} (${r?.username ?? 'unknown'})`,
      value: Number(r?.uptime_seconds ?? 0),
      isUptime: true,
    }))
  }

  if (category === 'hosts_record') {
    const results: any[] = await prisma.$queryRaw`
      SELECT h.hostname, u.username, MAX(r.uptime_seconds) as max_uptime
      FROM hosts h
      JOIN users u ON h.user_id = u.id
      JOIN reports r ON r.host_id = h.id
      GROUP BY h.id, h.hostname, u.username
      ORDER BY max_uptime DESC
      LIMIT 5
    `
    return (results ?? []).map((r: any, i: number) => ({
      rank: i + 1,
      name: `${r?.hostname ?? 'unknown'} (${r?.username ?? 'unknown'})`,
      value: Number(r?.max_uptime ?? 0),
      isUptime: true,
    }))
  }

  if (category === 'users_current') {
    const results: any[] = await prisma.$queryRaw`
      SELECT u.username, SUM(latest.uptime_seconds)::bigint as total_uptime
      FROM users u
      JOIN hosts h ON h.user_id = u.id
      JOIN LATERAL (
        SELECT uptime_seconds FROM reports WHERE host_id = h.id ORDER BY reported_at DESC LIMIT 1
      ) latest ON true
      GROUP BY u.id, u.username
      ORDER BY total_uptime DESC
      LIMIT 5
    `
    return (results ?? []).map((r: any, i: number) => ({
      rank: i + 1,
      name: r?.username ?? 'unknown',
      value: Number(r?.total_uptime ?? 0),
      isUptime: true,
    }))
  }

  if (category === 'users_record') {
    const results: any[] = await prisma.$queryRaw`
      SELECT u.username, SUM(max_up.max_uptime)::bigint as total_record
      FROM users u
      JOIN hosts h ON h.user_id = u.id
      JOIN LATERAL (
        SELECT MAX(uptime_seconds) as max_uptime FROM reports WHERE host_id = h.id
      ) max_up ON true
      GROUP BY u.id, u.username
      ORDER BY total_record DESC
      LIMIT 5
    `
    return (results ?? []).map((r: any, i: number) => ({
      rank: i + 1,
      name: r?.username ?? 'unknown',
      value: Number(r?.total_record ?? 0),
      isUptime: true,
    }))
  }

  if (category === 'new_hosts') {
    const hosts = await prisma.host.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { user: { select: { username: true } } },
    })
    return (hosts ?? []).map((h: any, i: number) => ({
      rank: i + 1,
      name: `${h?.hostname ?? 'unknown'} (${h?.user?.username ?? 'unknown'})`,
      value: new Date(h?.createdAt ?? Date.now()).toISOString().split('T')[0],
      isUptime: false,
    }))
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { username: true, createdAt: true },
  })
  return (users ?? []).map((u: any, i: number) => ({
    rank: i + 1,
    name: u?.username ?? 'unknown',
    value: new Date(u?.createdAt ?? Date.now()).toISOString().split('T')[0],
    isUptime: false,
  }))
}

export async function HomeContent() {
  const stats = await getStats()
  const leaderboardEntries: Record<string, LeaderboardEntry[]> = {}

  for (const category of categories) {
    leaderboardEntries[category] = await getLeaderboardEntries(category)
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        <aside className="space-y-4">
          <StatsSidebar stats={stats} />
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
            <MiniLeaderboard key={cat} category={cat} entries={leaderboardEntries[cat] ?? []} />
          ))}
        </div>
      </div>
    </div>
  )
}
