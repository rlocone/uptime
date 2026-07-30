export const dynamic = 'force-dynamic'

import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'
import { loadTeam, mapTeam } from '@/lib/team-api'

const memberSchema = z.object({
  hostId: z.string().min(1).optional(),
  hostIds: z.array(z.string().min(1)).optional(),
})

function normalizeHostIds(body: z.infer<typeof memberSchema>) {
  return Array.from(new Set([...(body.hostIds ?? []), ...(body.hostId ? [body.hostId] : [])].filter(Boolean)))
}

async function verifyOwnership(userId: string, hostIds: string[]) {
  const ownedHosts = await prisma.host.findMany({
    where: { userId, id: { in: hostIds } },
    select: { id: true },
  })
  return ownedHosts.length === hostIds.length
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
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

    const body = await req.json().catch(() => ({}))
    const parsed = memberSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid membership data' }, { status: 400 })
    }

    const hostIds = normalizeHostIds(parsed.data)
    if (hostIds.length === 0) {
      return NextResponse.json({ error: 'At least one host is required' }, { status: 400 })
    }

    if (!(await verifyOwnership(userId, hostIds))) {
      return NextResponse.json({ error: 'One or more hosts do not belong to your account' }, { status: 400 })
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.teamMember.createMany({
        data: hostIds.map((hostId) => ({ teamId: team.id, hostId })),
        skipDuplicates: true,
      })
    })

    const updated = await loadTeam(team.id, userId)
    return NextResponse.json({ team: mapTeam(updated) })
  } catch (error: any) {
    console.error('Team member add error:', error)
    return NextResponse.json({ error: 'Failed to add team members' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
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

    const body = await req.json().catch(() => ({}))
    const parsed = memberSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid membership data' }, { status: 400 })
    }

    const hostIds = normalizeHostIds(parsed.data)
    if (hostIds.length === 0) {
      return NextResponse.json({ error: 'At least one host is required' }, { status: 400 })
    }

    if (!(await verifyOwnership(userId, hostIds))) {
      return NextResponse.json({ error: 'One or more hosts do not belong to your account' }, { status: 400 })
    }

    await prisma.teamMember.deleteMany({
      where: { teamId: team.id, hostId: { in: hostIds } },
    })

    const updated = await loadTeam(team.id, userId)
    return NextResponse.json({ team: mapTeam(updated) })
  } catch (error: any) {
    console.error('Team member remove error:', error)
    return NextResponse.json({ error: 'Failed to remove team members' }, { status: 500 })
  }
}
