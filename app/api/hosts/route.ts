export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { normalizeHostname } from '@/lib/hostname'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = (session.user as any)?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hosts = await prisma.host.findMany({
      where: { userId },
      include: {
        reports: {
          orderBy: { reportedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const hostsData = (hosts ?? []).map((h: any) => {
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

    return NextResponse.json({ hosts: hostsData })
  } catch (err: any) {
    console.error('Hosts error:', err)
    return NextResponse.json({ error: 'Failed to load hosts' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = (session.user as any)?.id
    const body = await req.json()
    const hostname = normalizeHostname(String(body?.hostname ?? ''))
    if (!hostname) {
      return NextResponse.json({ error: 'Hostname is required' }, { status: 400 })
    }

    const host = await prisma.host.upsert({
      where: { userId_hostname: { userId, hostname } },
      update: {},
      create: { userId, hostname },
    })

    return NextResponse.json({ success: true, host })
  } catch (err: any) {
    console.error('Add host error:', err)
    return NextResponse.json({ error: 'Failed to add host' }, { status: 500 })
  }
}
