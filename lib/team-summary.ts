import { prisma } from '@/lib/db'

const ACTIVE_WINDOW_MS = 10 * 60 * 1000
const DEGRADED_WINDOW_MS = 60 * 60 * 1000

export const REPORTING_WINDOW_LABELS = ['24h', '7d', '30d'] as const

export type TeamHostSnapshot = {
  id: string
  hostname: string
  createdAt: Date
  userId: string
  user?: { username: string }
  latestReport?: {
    uptimeSeconds: number
    reportedAt: Date
    kernel?: string
    lastPatch?: string
  } | null
}

export type TeamSummary = {
  totalHosts: number
  uptime24hPercent: number
  uptime7dPercent: number
  uptime30dPercent: number
  currentUptimeSecondsTotal: number
  currentUptimeSecondsAverage: number
  upCount: number
  degradedCount: number
  downCount: number
  lastIncidentAt: Date | null
}

export type TeamStatus = 'up' | 'degraded' | 'down'

export function slugifyTeamName(name: string): string {
  const normalized = String(name ?? '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')

  return normalized || 'team'
}

export async function generateUniqueTeamSlug(userId: string, name: string, excludeTeamId?: string): Promise<string> {
  const base = slugifyTeamName(name)
  const existing = await prisma.team.findMany({
    where: {
      userId,
      ...(excludeTeamId ? { id: { not: excludeTeamId } } : {}),
      slug: { startsWith: base },
    },
    select: { slug: true },
  })

  const taken = new Set((existing ?? []).map((row: { slug: string }) => row.slug))
  if (!taken.has(base)) return base

  let suffix = 2
  while (taken.has(`${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}

export function getHostStatus(latestReport: TeamHostSnapshot['latestReport'], createdAt: Date, now = Date.now()): TeamStatus {
  const stamp = latestReport?.reportedAt?.getTime?.() ?? 0
  if (!stamp) return 'down'

  const age = now - stamp
  if (age <= ACTIVE_WINDOW_MS) return 'up'
  if (age <= DEGRADED_WINDOW_MS) return 'degraded'
  return 'down'
}

export function summarizeHosts(hosts: TeamHostSnapshot[]): TeamSummary {
  const now = Date.now()
  let upCount = 0
  let degradedCount = 0
  let downCount = 0
  let currentUptimeSecondsTotal = 0
  let uptime24hCount = 0
  let uptime7dCount = 0
  let uptime30dCount = 0
  let lastIncidentAt: Date | null = null

  for (const host of hosts ?? []) {
    const latestReport = host.latestReport ?? null
    const status = getHostStatus(latestReport, host.createdAt, now)
    const reportAt = latestReport?.reportedAt ?? null

    if (status === 'up') upCount += 1
    else if (status === 'degraded') degradedCount += 1
    else downCount += 1

    if (reportAt) {
      if (now - reportAt.getTime() <= 24 * 60 * 60 * 1000) uptime24hCount += 1
      if (now - reportAt.getTime() <= 7 * 24 * 60 * 60 * 1000) uptime7dCount += 1
      if (now - reportAt.getTime() <= 30 * 24 * 60 * 60 * 1000) uptime30dCount += 1
      if (status !== 'up' && (!lastIncidentAt || reportAt > lastIncidentAt)) {
        lastIncidentAt = reportAt
      }
    } else if (status === 'down' && (!lastIncidentAt || host.createdAt > lastIncidentAt)) {
      lastIncidentAt = host.createdAt
    }

    currentUptimeSecondsTotal += Number(latestReport?.uptimeSeconds ?? 0)
  }

  const totalHosts = hosts?.length ?? 0
  const uptime24hPercent = totalHosts ? (uptime24hCount / totalHosts) * 100 : 0
  const uptime7dPercent = totalHosts ? (uptime7dCount / totalHosts) * 100 : 0
  const uptime30dPercent = totalHosts ? (uptime30dCount / totalHosts) * 100 : 0

  return {
    totalHosts,
    uptime24hPercent,
    uptime7dPercent,
    uptime30dPercent,
    currentUptimeSecondsTotal,
    currentUptimeSecondsAverage: totalHosts ? currentUptimeSecondsTotal / totalHosts : 0,
    upCount,
    degradedCount,
    downCount,
    lastIncidentAt,
  }
}
