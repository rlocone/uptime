export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000)

    const [usersOnline, totalUsers, totalHosts, totalReports, pageviewRow] = await Promise.all([
      prisma.user.count({ where: { lastSeen: { gte: tenMinAgo } } }),
      prisma.user.count(),
      prisma.host.count(),
      prisma.report.count(),
      prisma.pageview.upsert({
        where: { id: 'singleton' },
        update: { count: { increment: 1 } },
        create: { id: 'singleton', count: 1 },
      }),
    ])

    return NextResponse.json({
      usersOnline,
      totalUsers,
      totalHosts,
      totalReports,
      pageviews: pageviewRow?.count ?? 0,
    })
  } catch (err: any) {
    console.error('Stats error:', err)
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 })
  }
}
