import { redirect, notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'
import { summarizeHosts } from '@/lib/team-summary'
import { TeamDetailContent } from '@/components/team-detail-content'

export async function generateMetadata({ params }: { params: { slug: string } }) {
  return { title: `${params.slug} — Teams — Uptime Project` }
}

export default async function TeamDetailPage({ params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/login?next=/teams')
  }

  const userId = (session.user as any)?.id
  if (!userId) {
    redirect('/login?next=/teams')
  }

  const team = await prisma.team.findFirst({
    where: { userId, slug: params.slug },
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

  if (!team) {
    notFound()
  }

  const hosts = await prisma.host.findMany({
    where: { userId },
    include: {
      reports: { orderBy: { reportedAt: 'desc' }, take: 1 },
      user: { select: { username: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const memberSnapshots = (team.members ?? []).map((member: any) => ({
    id: member.host.id,
    hostname: member.host.hostname,
    createdAt: member.host.createdAt,
    userId: member.host.userId,
    user: member.host.user ? { username: member.host.user.username } : undefined,
    latestReport: member.host.reports[0]
      ? {
          uptimeSeconds: member.host.reports[0].uptimeSeconds,
          reportedAt: member.host.reports[0].reportedAt,
          kernel: member.host.reports[0].kernel,
          lastPatch: member.host.reports[0].lastPatch,
        }
      : null,
  }))

  const initialTeam = {
    id: team.id,
    name: team.name,
    description: team.description,
    slug: team.slug,
    createdAt: team.createdAt.toISOString(),
    updatedAt: team.updatedAt.toISOString(),
    memberCount: team.members.length,
    memberHostIds: team.members.map((member) => member.hostId),
    summary: summarizeHosts(memberSnapshots),
    hosts: hosts.map((host: any) => ({
      id: host.id,
      hostname: host.hostname,
      createdAt: host.createdAt.toISOString(),
      userId: host.userId,
      user: host.user ? { username: host.user.username } : undefined,
      latestReport: host.reports[0]
        ? {
            uptimeSeconds: host.reports[0].uptimeSeconds,
            reportedAt: host.reports[0].reportedAt.toISOString(),
            kernel: host.reports[0].kernel,
            lastPatch: host.reports[0].lastPatch,
          }
        : null,
    })),
  }

  return <TeamDetailContent initialTeam={initialTeam as any} />
}
