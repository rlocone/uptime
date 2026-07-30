export const dynamic = 'force-dynamic'

import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'
import { generateUniqueTeamSlug, summarizeHosts } from '@/lib/team-summary'

const teamUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(280).nullable().optional(),
  hostIds: z.array(z.string().min(1)).optional(),
})

async function loadTeam(teamId: string, userId: string) {
  return prisma.team.findFirst({
    where: { id: teamId, userId },
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
  })
}

function mapTeam(team: any) {
  const hosts = (team?.members ?? []).map((member: any) => ({
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
    memberHostIds: (team.members ?? []).map((member: any) => member.hostId),
    summary: summarizeHosts(hosts),
    hosts,
  }
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const team = await loadTeam(params.id, userId)
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    return NextResponse.json({ team: mapTeam(team) })
  } catch (error: any) {
    console.error('Team load error:', error)
    return NextResponse.json({ error: 'Failed to load team' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const team = await prisma.team.findFirst({ where: { id: params.id, userId } })
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const body = await req.json().catch(() => ({}))
    const parsed = teamUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid team data' }, { status: 400 })
    }

    const updateData: {
      name?: string
      description?: string | null
      slug?: string
    } = {}

    if (parsed.data.name !== undefined) {
      const nextName = parsed.data.name.trim()
      if (!nextName) {
        return NextResponse.json({ error: 'Team name is required' }, { status: 400 })
      }
      if (nextName !== team.name) {
        const clash = await prisma.team.findUnique({
          where: { userId_name: { userId, name: nextName } },
          select: { id: true },
        })
        if (clash && clash.id !== team.id) {
          return NextResponse.json({ error: 'You already have a team with that name' }, { status: 409 })
        }
        updateData.name = nextName
        updateData.slug = await generateUniqueTeamSlug(userId, nextName, team.id)
      }
    }

    if (parsed.data.description !== undefined) {
      updateData.description = parsed.data.description?.trim() || null
    }

    const hostIds = parsed.data.hostIds
    if (hostIds) {
      const normalizedHostIds = Array.from(new Set(hostIds.filter(Boolean)))
      const ownedHosts = await prisma.host.findMany({
        where: { userId, id: { in: normalizedHostIds } },
        select: { id: true },
      })
      if (ownedHosts.length !== normalizedHostIds.length) {
        return NextResponse.json({ error: 'One or more hosts do not belong to your account' }, { status: 400 })
      }

      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        if (Object.keys(updateData).length > 0) {
          await tx.team.update({ where: { id: team.id }, data: updateData })
        }
        await tx.teamMember.deleteMany({ where: { teamId: team.id } })
        if (normalizedHostIds.length > 0) {
          await tx.teamMember.createMany({
            data: normalizedHostIds.map((hostId) => ({ teamId: team.id, hostId })),
          })
        }
      })
    } else if (Object.keys(updateData).length > 0) {
      await prisma.team.update({ where: { id: team.id }, data: updateData })
    }

    const updated = await loadTeam(team.id, userId)
    return NextResponse.json({ team: mapTeam(updated) })
  } catch (error: any) {
    console.error('Team update error:', error)
    return NextResponse.json({ error: 'Failed to update team' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const team = await prisma.team.findFirst({ where: { id: params.id, userId }, select: { id: true } })
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    await prisma.team.delete({ where: { id: team.id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Team delete error:', error)
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 })
  }
}
