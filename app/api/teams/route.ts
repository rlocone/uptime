export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'
import { generateUniqueTeamSlug, summarizeHosts } from '@/lib/team-summary'
import { mapTeam } from '@/lib/team-api'

const teamCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(280).optional().or(z.literal('')),
  hostIds: z.array(z.string().min(1)).optional(),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    return NextResponse.json({ teams: teams.map(mapTeam) })
  } catch (error: any) {
    console.error('Teams list error:', error)
    return NextResponse.json({ error: 'Failed to load teams' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const parsed = teamCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid team data' }, { status: 400 })
    }

    const name = parsed.data.name.trim()
    const description = parsed.data.description?.trim() || null
    const hostIds = Array.from(new Set((parsed.data.hostIds ?? []).filter(Boolean)))

    if (hostIds.length > 0) {
      const ownedHosts = await prisma.host.findMany({
        where: { userId, id: { in: hostIds } },
        select: { id: true },
      })
      if (ownedHosts.length !== hostIds.length) {
        return NextResponse.json({ error: 'One or more hosts do not belong to your account' }, { status: 400 })
      }
    }

    const existing = await prisma.team.findUnique({
      where: { userId_name: { userId, name } },
      select: { id: true },
    })
    if (existing) {
      return NextResponse.json({ error: 'You already have a team with that name' }, { status: 409 })
    }

    const slug = await generateUniqueTeamSlug(userId, name)
    const team = await prisma.team.create({
      data: {
        userId,
        name,
        description,
        slug,
      },
    })

    if (hostIds.length > 0) {
      await prisma.teamMember.createMany({
        data: hostIds.map((hostId) => ({ teamId: team.id, hostId })),
      })
    }

    const updated = hostIds.length > 0 ? await prisma.team.findUnique({
      where: { id: team.id },
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
    }) : team

    return NextResponse.json({
      team: hostIds.length > 0 && updated ? mapTeam(updated) : {
        ...team,
        memberCount: 0,
        summary: summarizeHosts([]),
      },
    })
  } catch (error: any) {
    console.error('Teams create error:', error)
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 })
  }
}
