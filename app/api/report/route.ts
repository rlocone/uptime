export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { rateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit'
import { normalizeHostname } from '@/lib/hostname'

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key') || req.headers.get('X-API-Key')
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing X-API-Key header' }, { status: 401 })
    }

    // Rate limit by API key and by IP: 30 reports / minute each.
    const ip = getClientIp(req)
    const byKey = rateLimit(`report:key:${apiKey}`, 30, 60_000)
    const byIp = rateLimit(`report:ip:${ip}`, 60, 60_000)
    if (!byKey.allowed || !byIp.allowed) {
      const limited = !byKey.allowed ? byKey : byIp
      return NextResponse.json(
        { error: 'Rate limit exceeded. Slow down.' },
        { status: 429, headers: rateLimitHeaders(limited) }
      )
    }

    const user = await prisma.user.findUnique({ where: { apiKey } })
    if (!user) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    const body = await req.json()
    const { hostname, uptime_seconds, boot_time, kernel, last_patch } = body ?? {}

    const normalizedHostname = normalizeHostname(String(hostname ?? ''))
    if (!normalizedHostname || uptime_seconds === undefined) {
      return NextResponse.json({ error: 'hostname and uptime_seconds are required' }, { status: 400 })
    }

    // Atomic upsert avoids duplicate rows when multiple reports arrive at once.
    const host = await prisma.host.upsert({
      where: { userId_hostname: { userId: user.id, hostname: normalizedHostname } },
      update: {},
      create: { userId: user.id, hostname: normalizedHostname },
    })

    // Create report
    const report = await prisma.report.create({
      data: {
        hostId: host.id,
        uptimeSeconds: Math.max(0, Math.floor(Number(uptime_seconds))),
        bootTime: Math.floor(Number(boot_time ?? 0)),
        kernel: String(kernel ?? ''),
        lastPatch: String(last_patch ?? ''),
      },
    })

    // Update user last_seen
    await prisma.user.update({ where: { id: user.id }, data: { lastSeen: new Date() } })

    return NextResponse.json({ success: true, host_id: host.id, report_id: report.id })
  } catch (err: any) {
    console.error('Report error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
