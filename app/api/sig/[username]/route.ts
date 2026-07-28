export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { formatUptime } from '@/lib/uptime'

export async function GET(
  req: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const username = params?.username?.replace(/\.(png|svg)$/, '') ?? ''
    // Strict allowlist: usernames are alphanumeric, underscore, or hyphen, 1-32 chars.
    if (!/^[a-zA-Z0-9_-]{1,32}$/.test(username)) {
      return new NextResponse('Not found', { status: 404 })
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        hosts: {
          include: {
            reports: {
              orderBy: { reportedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    })

    if (!user) {
      return new NextResponse('User not found', { status: 404 })
    }

    const totalCurrentUptime = (user.hosts ?? []).reduce((sum: number, h: any) => {
      const latest = h?.reports?.[0]
      return sum + (latest?.uptimeSeconds ?? 0)
    }, 0)

    const hostCount = user.hosts?.length ?? 0
    const uptimeStr = formatUptime(totalCurrentUptime)

    // Escape any text that ends up inside the SVG document (defense in depth
    // on top of the strict username allowlist above).
    const esc = (s: string) =>
      String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')

    const safeUsername = esc(username)
    const safeUptime = esc(uptimeStr)

    // Get rank
    const allUsers: any[] = await prisma.$queryRaw`
      SELECT u.id, SUM(latest.uptime_seconds)::bigint as total_uptime
      FROM users u
      JOIN hosts h ON h.user_id = u.id
      JOIN LATERAL (
        SELECT uptime_seconds FROM reports WHERE host_id = h.id ORDER BY reported_at DESC LIMIT 1
      ) latest ON true
      GROUP BY u.id
      ORDER BY total_uptime DESC
    `
    const rank = (allUsers ?? []).findIndex((u: any) => u?.id === user.id) + 1

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="80" role="img" aria-label="Uptime Project signature for ${safeUsername}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#0a0a1a;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#0f0f2a;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="400" height="80" rx="6" fill="url(#bg)" stroke="#00d4ff" stroke-width="1" stroke-opacity="0.4"/>
      <text x="15" y="22" font-family="monospace" font-size="11" fill="#00d4ff" font-weight="bold">UPTIME PROJECT</text>
      <text x="15" y="42" font-family="monospace" font-size="13" fill="#e0e0e0">${safeUsername}</text>
      <text x="15" y="62" font-family="monospace" font-size="10" fill="#888">Rank #${rank || '?'} | ${hostCount} host${hostCount !== 1 ? 's' : ''} | ${safeUptime}</text>
      <text x="385" y="22" font-family="monospace" font-size="10" fill="#39ff14" text-anchor="end">#${rank || '?'}</text>
      <rect x="300" y="35" width="85" height="20" rx="3" fill="#00d4ff" fill-opacity="0.1" stroke="#00d4ff" stroke-width="0.5" stroke-opacity="0.3"/>
      <text x="342" y="49" font-family="monospace" font-size="9" fill="#00d4ff" text-anchor="middle">ONLINE</text>
    </svg>`

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch (err: any) {
    console.error('Sig error:', err)
    return new NextResponse('Error generating signature', { status: 500 })
  }
}
