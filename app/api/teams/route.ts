export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'
import { generateUniqueTeamSlug, summarizeHosts } from '@/lib/team-summary'

const teamCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(280).optional().or(z.literal('')),
})

function mapTeam(team: any) {
  const hosts = (team.members ?? []).map((member: any) => ({
    id: member?.host?.id,
    hostname: member?.host?.hostname,
    createdAt: member?.host?.createdAt,
    userId: member?.host?.userId,
    user: member?.host?.user ? { username: member.host.user.username } : undefined,
    latestReport: member?.host?.reports?.[0]
      ? {
          uptimeSeconds: member.host.reports[0].uptimeSeconds,
          reportedAt: member.host.reports[0].reportedAt,
          kernel: member.host.reports[0].kernel,
          lastPatch: member.host.reports[0].lastPatch,
        }
      : null,
  }))

  return {
    id: team.id,
    name: team.name,
    description: team.description,
    slug: team.slug,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
    memberCount: team.members?.length ?? 0,
    summary: summarizeHosts(hosts),
  }
}

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

    return NextResponse.json({
      team: {
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
