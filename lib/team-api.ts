import { prisma } from '@/lib/db'
import { summarizeHosts } from '@/lib/team-summary'

export async function loadTeam(teamId: string, userId: string) {
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

export function mapTeam(team: any) {
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
