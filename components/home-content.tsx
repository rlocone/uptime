import Image from 'next/image'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth-options'
import { summarizeHosts } from '@/lib/team-summary'
import { formatUptime } from '@/lib/uptime'
import { StatsSidebar } from '@/components/stats-sidebar'
import { MiniLeaderboard, type LeaderboardEntry } from '@/components/mini-leaderboard'
import { Clock3, Server, ShieldAlert, ShieldCheck, ShieldX, Users, Zap } from 'lucide-react'

const categories = [
  'hosts_current', 'hosts_record',
  'users_current', 'users_record',
  'new_hosts', 'new_users',
] as const

type DashboardTeam = {
  id: string
  name: string
  description: string | null
  slug: string
  summary: ReturnType<typeof summarizeHosts>
}

function formatPercent(value: number) {
  return `${Math.max(0, Math.min(100, value)).toFixed(1)}%`
}

async function getGlobalSummary() {
  const hosts = await prisma.host.findMany({
    include: {
      reports: { orderBy: { reportedAt: 'desc' }, take: 1 },
      user: { select: { username: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return summarizeHosts(
    hosts.map((host: any) => ({
      id: host.id,
      hostname: host.hostname,
      createdAt: host.createdAt,
      userId: host.userId,
      user: host.user ? { username: host.user.username } : undefined,
      latestReport: host.reports?.[0]
        ? {
            uptimeSeconds: host.reports[0].uptimeSeconds,
            reportedAt: host.reports[0].reportedAt,
            kernel: host.reports[0].kernel,
            lastPatch: host.reports[0].lastPatch,
          }
        : null,
    }))
  )
}

async function getUserTeams(userId: string): Promise<DashboardTeam[]> {
  const teams = await prisma.team.findMany({
    where: { userId },
    include: {
      members: {
        include: {
          host: {
            include: {
              reports: { orderBy: { reportedAt: 'desc' }, take: 1 },
              user: { select: { username: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return teams.map((team: any) => ({
    id: team.id,
    name: team.name,
    description: team.description,
    slug: team.slug,
    summary: summarizeHosts(
      (team.members ?? []).map((member: any) => ({
        id: member.host.id,
        hostname: member.host.hostname,
        createdAt: member.host.createdAt,
        userId: member.host.userId,
        user: member.host.user ? { username: member.host.user.username } : undefined,
        latestReport: member.host.reports?.[0]
          ? {
              uptimeSeconds: member.host.reports[0].uptimeSeconds,
              reportedAt: member.host.reports[0].reportedAt,
              kernel: member.host.reports[0].kernel,
              lastPatch: member.host.reports[0].lastPatch,
            }
          : null,
      }))
    ),
  }))
}

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
  const [stats, globalSummary, session] = await Promise.all([
    getStats(),
    getGlobalSummary(),
    getServerSession(authOptions),
  ])
  const userId = (session?.user as any)?.id
  const userTeams = userId ? await getUserTeams(userId) : []
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

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-lg border neon-border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold neon-text-blue flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Combined Total — All Hosts
            </h2>
            <span className="rounded-full border border-[#00d4ff]/30 bg-[#00d4ff]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#00d4ff]">
              {globalSummary.totalHosts} hosts
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <SummaryMetric label="24h uptime" value={formatPercent(globalSummary.uptime24hPercent)} icon={Clock3} accent="#00d4ff" />
            <SummaryMetric label="7d uptime" value={formatPercent(globalSummary.uptime7dPercent)} icon={Clock3} accent="#00d4ff" />
            <SummaryMetric label="30d uptime" value={formatPercent(globalSummary.uptime30dPercent)} icon={Clock3} accent="#00d4ff" />
            <SummaryMetric label="Avg uptime" value={formatUptime(globalSummary.currentUptimeSecondsAverage)} icon={TrendingSummaryIcon} accent="#39ff14" />
          </div>
          <div className="grid grid-cols-3 gap-3 rounded-md border border-border/60 bg-muted/20 p-3 text-xs">
            <StateChip label="Up" value={globalSummary.upCount} icon={ShieldCheck} color="#39ff14" />
            <StateChip label="Degraded" value={globalSummary.degradedCount} icon={ShieldAlert} color="#f59e0b" />
            <StateChip label="Down" value={globalSummary.downCount} icon={ShieldX} color="#f87171" />
          </div>
          <p className="text-xs text-muted-foreground">
            Combined totals use the latest report for each host and classify current state by report recency so the same logic applies everywhere.
          </p>
        </div>

        <div className="rounded-lg border neon-border bg-card p-4 space-y-4">
          <h2 className="text-sm font-semibold neon-text-green flex items-center gap-2">
            <Users className="h-4 w-4" />
            Aggregation Logic
          </h2>
          <p className="text-xs text-muted-foreground">Overall totals cover every host on the site.</p>
          <p className="text-xs text-muted-foreground">Team cards reuse the same summary math but only for the hosts assigned to that team.</p>
          <p className="text-xs text-muted-foreground">Current state is inferred from the most recent report timestamp: up, degraded, or down.</p>
        </div>
      </div>

      {userTeams.length > 0 ? (
        <div className="mb-6 rounded-lg border neon-border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold neon-text-blue flex items-center gap-2">
              <Users className="h-4 w-4" />
              Your Teams
            </h2>
            <Link href="/teams" className="text-xs text-[#00d4ff] hover:underline">
              Manage teams
            </Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {userTeams.map((team) => (
              <Link key={team.id} href={`/teams/${team.slug}`} className="rounded-lg border border-border/60 bg-background/60 p-4 transition-colors hover:border-[#00d4ff]/40 hover:bg-muted/20">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{team.name}</h3>
                    <p className="text-[11px] text-muted-foreground">/{team.slug}</p>
                    {team.description ? <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{team.description}</p> : null}
                  </div>
                  <span className="rounded-full border border-[#00d4ff]/30 bg-[#00d4ff]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#00d4ff]">
                    {team.summary.totalHosts} hosts
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="rounded-md border border-border/60 bg-muted/20 p-2">
                    <p className="text-[10px] uppercase tracking-[0.2em]">Status</p>
                    <p className="mt-1 text-foreground">{team.summary.upCount} up / {team.summary.degradedCount} degraded / {team.summary.downCount} down</p>
                  </div>
                  <div className="rounded-md border border-border/60 bg-muted/20 p-2">
                    <p className="text-[10px] uppercase tracking-[0.2em]">24h</p>
                    <p className="mt-1 text-foreground">{formatPercent(team.summary.uptime24hPercent)}</p>
                  </div>
                  <div className="rounded-md border border-border/60 bg-muted/20 p-2">
                    <p className="text-[10px] uppercase tracking-[0.2em]">7d</p>
                    <p className="mt-1 text-foreground">{formatPercent(team.summary.uptime7dPercent)}</p>
                  </div>
                  <div className="rounded-md border border-border/60 bg-muted/20 p-2">
                    <p className="text-[10px] uppercase tracking-[0.2em]">Combined uptime</p>
                    <p className="mt-1 text-foreground">{formatUptime(team.summary.currentUptimeSecondsTotal)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : session?.user ? (
        <div className="mb-6 rounded-lg border neon-border bg-card p-4 text-sm text-muted-foreground">
          You do not have any teams yet. Create one in the Teams section to group hosts and track combined totals.
        </div>
      ) : null}

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

          <div className="rounded-lg border neon-border bg-card p-4 space-y-3 overflow-hidden">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 items-center rounded-full border border-[#00d4ff]/30 bg-[#00d4ff]/10 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#00d4ff]">
                SIG
              </span>
              <h3 className="text-sm font-semibold neon-text-blue">Port0 Badge</h3>
            </div>
            <a
              href="/api/sig/eXa"
              target="_blank"
              rel="noreferrer"
              className="block rounded-md focus:outline-none focus:ring-2 focus:ring-[#00d4ff]/40 focus:ring-offset-2 focus:ring-offset-background"
            >
              <Image
                src="/port0-badge.svg"
                alt="Uptime Project signature badge for eXa"
                width={400}
                height={80}
                unoptimized
                className="h-auto w-full rounded-md border border-[#00d4ff]/20 bg-[#0a0a1a]"
              />
            </a>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              A subtle, high-contrast signature badge for Port0 that stays visible without crowding the leaderboard.
            </p>
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

function SummaryMetric({ label, value, icon: Icon, accent }: { label: string; value: string; icon: any; accent: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        <Icon className="h-3.5 w-3.5" style={{ color: accent }} />
      </div>
      <p className="mt-1 text-sm font-semibold text-foreground" style={{ color: accent }}>{value}</p>
    </div>
  )
}

function StateChip({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
        <Icon className="h-3.5 w-3.5" style={{ color }} />
      </div>
      <p className="mt-1 text-lg font-semibold" style={{ color }}>{value}</p>
    </div>
  )
}

function TrendingSummaryIcon(props: any) {
  return <Clock3 {...props} />
}
