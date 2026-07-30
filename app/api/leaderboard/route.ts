export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const category = url.searchParams.get('category') ?? 'hosts_current'

    const validCategories = new Set([
      'hosts_current',
      'hosts_record',
      'users_current',
      'users_record',
      'teams_current',
      'teams_record',
      'new_hosts',
      'new_users',
    ])
    if (!validCategories.has(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 25)))
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1))
    const skip = (page - 1) * limit

    let entries: any[] = []
    let total = 0

    if (category === 'hosts_current') {
      // Latest report per host, ranked by uptime_seconds
      const results: any[] = await prisma.$queryRaw`
        SELECT h.hostname, u.username, r.uptime_seconds, r.reported_at
        FROM hosts h
        JOIN users u ON h.user_id = u.id
        JOIN LATERAL (
          SELECT uptime_seconds, reported_at FROM reports
          WHERE host_id = h.id ORDER BY reported_at DESC LIMIT 1
        ) r ON true
        ORDER BY r.uptime_seconds DESC
        LIMIT ${limit} OFFSET ${skip}
      `
      const countRes: any[] = await prisma.$queryRaw`SELECT COUNT(*)::int as c FROM hosts WHERE EXISTS (SELECT 1 FROM reports WHERE host_id = hosts.id)`
      total = countRes?.[0]?.c ?? 0
      entries = (results ?? []).map((r: any, i: number) => ({
        rank: skip + i + 1,
        name: `${r?.hostname ?? 'unknown'} (${r?.username ?? 'unknown'})`,
        value: Number(r?.uptime_seconds ?? 0),
        isUptime: true,
      }))
    } else if (category === 'hosts_record') {
      const results: any[] = await prisma.$queryRaw`
        SELECT h.hostname, u.username, MAX(r.uptime_seconds) as max_uptime
        FROM hosts h
        JOIN users u ON h.user_id = u.id
        JOIN reports r ON r.host_id = h.id
        GROUP BY h.id, h.hostname, u.username
        ORDER BY max_uptime DESC
        LIMIT ${limit} OFFSET ${skip}
      `
      const countRes: any[] = await prisma.$queryRaw`SELECT COUNT(DISTINCT h.id)::int as c FROM hosts h JOIN reports r ON r.host_id = h.id`
      total = countRes?.[0]?.c ?? 0
      entries = (results ?? []).map((r: any, i: number) => ({
        rank: skip + i + 1,
        name: `${r?.hostname ?? 'unknown'} (${r?.username ?? 'unknown'})`,
        value: Number(r?.max_uptime ?? 0),
        isUptime: true,
      }))
    } else if (category === 'users_current') {
      const results: any[] = await prisma.$queryRaw`
        SELECT u.username, SUM(latest.uptime_seconds)::bigint as total_uptime
        FROM users u
        JOIN hosts h ON h.user_id = u.id
        JOIN LATERAL (
          SELECT uptime_seconds FROM reports WHERE host_id = h.id ORDER BY reported_at DESC LIMIT 1
        ) latest ON true
        GROUP BY u.id, u.username
        ORDER BY total_uptime DESC
        LIMIT ${limit} OFFSET ${skip}
      `
      const countRes: any[] = await prisma.$queryRaw`SELECT COUNT(DISTINCT u.id)::int as c FROM users u JOIN hosts h ON h.user_id = u.id JOIN reports r ON r.host_id = h.id`
      total = countRes?.[0]?.c ?? 0
      entries = (results ?? []).map((r: any, i: number) => ({
        rank: skip + i + 1,
        name: r?.username ?? 'unknown',
        value: Number(r?.total_uptime ?? 0),
        isUptime: true,
      }))
    } else if (category === 'users_record') {
      const results: any[] = await prisma.$queryRaw`
        SELECT u.username, SUM(max_up.max_uptime)::bigint as total_record
        FROM users u
        JOIN hosts h ON h.user_id = u.id
        JOIN LATERAL (
          SELECT MAX(uptime_seconds) as max_uptime FROM reports WHERE host_id = h.id
        ) max_up ON true
        GROUP BY u.id, u.username
        ORDER BY total_record DESC
        LIMIT ${limit} OFFSET ${skip}
      `
      const countRes: any[] = await prisma.$queryRaw`SELECT COUNT(DISTINCT u.id)::int as c FROM users u JOIN hosts h ON h.user_id = u.id JOIN reports r ON r.host_id = h.id`
      total = countRes?.[0]?.c ?? 0
      entries = (results ?? []).map((r: any, i: number) => ({
        rank: skip + i + 1,
        name: r?.username ?? 'unknown',
        value: Number(r?.total_record ?? 0),
        isUptime: true,
      }))
    } else if (category === 'teams_current') {
      const results: any[] = await prisma.$queryRaw`
        SELECT t.name, u.username, COALESCE(SUM(latest.uptime_seconds), 0)::bigint as total_uptime
        FROM teams t
        JOIN users u ON t.user_id = u.id
        LEFT JOIN team_members tm ON tm.team_id = t.id
        LEFT JOIN LATERAL (
          SELECT uptime_seconds
          FROM reports
          WHERE host_id = tm.host_id
          ORDER BY reported_at DESC
          LIMIT 1
        ) latest ON true
        GROUP BY t.id, t.name, u.username
        ORDER BY total_uptime DESC, t.name ASC
        LIMIT ${limit} OFFSET ${skip}
      `
      const countRes: any[] = await prisma.$queryRaw`SELECT COUNT(*)::int as c FROM teams`
      total = countRes?.[0]?.c ?? 0
      entries = (results ?? []).map((r: any, i: number) => ({
        rank: skip + i + 1,
        name: `${r?.name ?? 'unknown'} (${r?.username ?? 'unknown'})`,
        value: Number(r?.total_uptime ?? 0),
        isUptime: true,
      }))
    } else if (category === 'teams_record') {
      const results: any[] = await prisma.$queryRaw`
        SELECT t.name, u.username, COALESCE(SUM(max_up.max_uptime), 0)::bigint as total_record
        FROM teams t
        JOIN users u ON t.user_id = u.id
        LEFT JOIN team_members tm ON tm.team_id = t.id
        LEFT JOIN LATERAL (
          SELECT MAX(r.uptime_seconds) as max_uptime
          FROM reports r
          WHERE r.host_id = tm.host_id
        ) max_up ON true
        GROUP BY t.id, t.name, u.username
        ORDER BY total_record DESC, t.name ASC
        LIMIT ${limit} OFFSET ${skip}
      `
      const countRes: any[] = await prisma.$queryRaw`SELECT COUNT(*)::int as c FROM teams`
      total = countRes?.[0]?.c ?? 0
      entries = (results ?? []).map((r: any, i: number) => ({
        rank: skip + i + 1,
        name: `${r?.name ?? 'unknown'} (${r?.username ?? 'unknown'})`,
        value: Number(r?.total_record ?? 0),
        isUptime: true,
      }))
    } else if (category === 'new_hosts') {
      const [hosts, countRes] = await Promise.all([
        prisma.host.findMany({
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip,
          include: { user: { select: { username: true } } },
        }),
        prisma.host.count(),
      ])
      total = countRes
      entries = (hosts ?? []).map((h: any, i: number) => ({
        rank: skip + i + 1,
        name: `${h?.hostname ?? 'unknown'} (${h?.user?.username ?? 'unknown'})`,
        value: new Date(h?.createdAt ?? Date.now()).toISOString().split('T')[0],
        isUptime: false,
      }))
    } else if (category === 'new_users') {
      const [users, countRes] = await Promise.all([
        prisma.user.findMany({
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip,
          select: { username: true, createdAt: true },
        }),
        prisma.user.count(),
      ])
      total = countRes
      entries = (users ?? []).map((u: any, i: number) => ({
        rank: skip + i + 1,
        name: u?.username ?? 'unknown',
        value: new Date(u?.createdAt ?? Date.now()).toISOString().split('T')[0],
        isUptime: false,
      }))
    }

    return NextResponse.json({ entries, total, page, limit, category })
  } catch (err: any) {
    console.error('Leaderboard error:', err)
    return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 })
  }
}
