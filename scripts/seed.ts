import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

function requirePassword(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is required for seeding`)
  }
  return value
}

async function main() {
  console.log('Seeding database...')

  const testPassword = requirePassword('SEED_TEST_PASSWORD')
  const samplePassword = requirePassword('SEED_SAMPLE_PASSWORD')

  const testPasswordHash = await bcrypt.hash(testPassword, 12)
  const testUser = await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {
      username: 'johndoe',
      passwordHash: testPasswordHash,
      emailVerified: true,
    },
    create: {
      username: 'johndoe',
      email: 'john@doe.com',
      passwordHash: testPasswordHash,
      apiKey: randomUUID(),
      emailVerified: true,
    },
  })
  console.log('Test user:', testUser.username)

  const sampleUsers = [
    { username: 'serverking', email: 'serverking@example.com' },
    { username: 'uptimewizard', email: 'uptimewizard@example.com' },
    { username: 'linuxguru', email: 'linuxguru@example.com' },
    { username: 'sysadmin42', email: 'sysadmin42@example.com' },
    { username: 'datacenter', email: 'datacenter@example.com' },
    { username: 'cloudops', email: 'cloudops@example.com' },
    { username: 'devops_ninja', email: 'devops@example.com' },
    { username: 'netadmin', email: 'netadmin@example.com' },
  ]

  const dummyHash = await bcrypt.hash(samplePassword, 12)
  const createdUsers = [testUser]

  for (const su of sampleUsers) {
    const u = await prisma.user.upsert({
      where: { email: su.email },
      update: {
        username: su.username,
        passwordHash: dummyHash,
        emailVerified: true,
      },
      create: {
        username: su.username,
        email: su.email,
        passwordHash: dummyHash,
        apiKey: randomUUID(),
        emailVerified: true,
        lastSeen: new Date(Date.now() - Math.floor(Math.random() * 600000)),
      },
    })
    createdUsers.push(u)
  }

  const hostnames = [
    'web-srv-01', 'db-primary', 'mail-gw', 'proxy-eu', 'build-ci',
    'storage-nas', 'monitor-01', 'vpn-gateway', 'app-worker-01', 'cache-redis',
    'dev-box', 'staging-srv', 'prod-api-01', 'prod-api-02', 'backup-srv',
  ]

  const kernels = [
    '6.8.0-45-generic', '6.5.0-44-generic', '5.15.0-91-generic',
    '6.1.0-26-amd64', '6.6.13-200.fc39.x86_64', '6.7.4-arch1-1',
  ]

  let hostIdx = 0
  for (const user of createdUsers) {
    const numHosts = 1 + Math.floor(Math.random() * 3)
    for (let i = 0; i < numHosts && hostIdx < hostnames.length; i++) {
      const hostname = hostnames[hostIdx++]
      const host = await prisma.host.upsert({
        where: { userId_hostname: { userId: user.id, hostname } },
        update: {},
        create: { userId: user.id, hostname },
      })

      const baseUptime = Math.floor(Math.random() * 5_000_000) + 100_000
      const numReports = 2 + Math.floor(Math.random() * 4)
      for (let j = 0; j < numReports; j++) {
        const uptimeSeconds = baseUptime + j * 300
        const reportedAt = new Date(Date.now() - (numReports - j) * 300_000)
        await prisma.report.create({
          data: {
            hostId: host.id,
            uptimeSeconds,
            bootTime: Math.floor(Date.now() / 1000) - uptimeSeconds,
            kernel: kernels[Math.floor(Math.random() * kernels.length)],
            lastPatch: '',
            reportedAt,
          },
        })
      }
      console.log(`  Host ${hostname} for ${user.username}: ${numReports} reports`)
    }
  }

  await prisma.pageview.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton', count: 42 },
  })

  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
