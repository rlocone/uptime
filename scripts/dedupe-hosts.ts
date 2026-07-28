import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function normalizeHostname(raw: string): string {
  const hostname = String(raw ?? '').trim().toLowerCase()
  if (!hostname) return ''
  if (!/^[a-z0-9][a-z0-9._-]{0,252}[a-z0-9]$/i.test(hostname)) return ''
  return hostname
}

type HostRow = {
  id: string
  userId: string
  hostname: string
  createdAt: Date
}

async function main() {
  const apply = process.env.DEDUPE_HOSTS_APPLY === '1'
  const hosts = await prisma.host.findMany({
    select: { id: true, userId: true, hostname: true, createdAt: true },
    orderBy: [{ userId: 'asc' }, { createdAt: 'asc' }],
  })

  const groups = new Map<string, HostRow[]>()
  for (const host of hosts) {
    const normalized = normalizeHostname(host.hostname)
    if (!normalized) continue
    const key = `${host.userId}:${normalized}`
    const bucket = groups.get(key) ?? []
    bucket.push({ ...host, hostname: normalized })
    groups.set(key, bucket)
  }

  const duplicates = [...groups.entries()].filter(([, bucket]) => bucket.length > 1)
  console.log(`scanned=${hosts.length} duplicate_groups=${duplicates.length} apply=${apply ? 'yes' : 'no'}`)

  for (const [key, bucket] of duplicates) {
    const [userId, hostname] = key.split(':', 2)
    const survivor = bucket[0]
    const dupIds = bucket.slice(1).map((h) => h.id)
    console.log(`- ${userId}/${hostname}: keep ${survivor.id}, merge ${dupIds.length} duplicate(s)`)

    if (!apply) continue

    await prisma.$transaction(async (tx) => {
      if (dupIds.length) {
        await tx.report.updateMany({
          where: { hostId: { in: dupIds } },
          data: { hostId: survivor.id },
        })
        await tx.host.deleteMany({ where: { id: { in: dupIds } } })
      }
      if (survivor.hostname !== hostname) {
        await tx.host.update({ where: { id: survivor.id }, data: { hostname } })
      }
    })
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
