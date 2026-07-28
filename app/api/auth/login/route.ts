export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { rateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body ?? {}
    const normalizedEmail = String(email ?? '').trim().toLowerCase()
    if (!normalizedEmail || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Throttle login attempts: 10/min per IP, 5/min per IP+username.
    const ip = getClientIp(req)
    const byIp = rateLimit(`login:ip:${ip}`, 10, 60_000)
    const byUser = rateLimit(`login:user:${ip}:${normalizedEmail}`, 5, 60_000)
    if (!byIp.allowed || !byUser.allowed) {
      const limited = !byUser.allowed ? byUser : byIp
      return NextResponse.json(
        { error: 'Too many login attempts. Please wait and try again.' },
        { status: 429, headers: rateLimitHeaders(limited) }
      )
    }
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: normalizedEmail }, { username: email }] },
    })
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
    await prisma.user.update({ where: { id: user.id }, data: { lastSeen: new Date() } })
    return NextResponse.json({ success: true, user: { id: user.id, username: user.username, email: user.email } })
  } catch (err: any) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
