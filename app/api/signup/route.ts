export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { rateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit'
// crypto.randomUUID() used below

export async function POST(req: NextRequest) {
  try {
    // Strict per-IP signup throttle: 5 registrations / hour.
    const ip = getClientIp(req)
    const rl = rateLimit(`signup:ip:${ip}`, 5, 60 * 60_000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many accounts created from this network. Try again later.' },
        { status: 429, headers: rateLimitHeaders(rl) }
      )
    }

    const body = await req.json()
    const { username, email, password } = body ?? {}
    const normalizedEmail = String(email ?? '').trim().toLowerCase()
    if (!username || !normalizedEmail || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: normalizedEmail }, { username }] },
    })
    if (existing) {
      return NextResponse.json({ error: 'Username or email already taken' }, { status: 409 })
    }
    const passwordHash = await bcrypt.hash(password, 12)
    const apiKey = crypto.randomUUID()
    const user = await prisma.user.create({
      data: { username, email: normalizedEmail, passwordHash, apiKey },
    })
    return NextResponse.json({ success: true, username: user.username }, { status: 201 })
  } catch (err: any) {
    console.error('Signup error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
