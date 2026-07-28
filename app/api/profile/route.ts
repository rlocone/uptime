export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = (session.user as any)?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        apiKey: true,
        createdAt: true,
        lastSeen: true,
        emailVerified: true,
        hosts: {
          include: {
            reports: {
              orderBy: { reportedAt: 'desc' },
              take: 1,
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const hostsWithUptime = (user.hosts ?? []).map((h: any) => {
      const latest = h?.reports?.[0]
      return {
        id: h?.id,
        hostname: h?.hostname,
        createdAt: h?.createdAt,
        currentUptime: latest?.uptimeSeconds ?? 0,
        kernel: latest?.kernel ?? '',
        lastReport: latest?.reportedAt ?? null,
      }
    })

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        apiKey: user.apiKey,
        createdAt: user.createdAt,
        lastSeen: user.lastSeen,
        emailVerified: user.emailVerified,
      },
      hosts: hostsWithUptime,
    })
  } catch (err: any) {
    console.error('Profile error:', err)
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 })
  }
}
