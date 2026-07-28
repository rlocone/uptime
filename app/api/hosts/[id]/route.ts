export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { normalizeHostname } from '@/lib/hostname'

// Rename a host
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hostId = params?.id
    const body = await req.json()
    const hostname = normalizeHostname(String(body?.hostname ?? ''))
    if (!hostname) {
      return NextResponse.json({ error: 'Hostname is required' }, { status: 400 })
    }

    // Ensure the host belongs to the current user.
    const existing = await prisma.host.findUnique({ where: { id: hostId } })
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Host not found' }, { status: 404 })
    }

    const clash = await prisma.host.findUnique({
      where: { userId_hostname: { userId, hostname } },
    })
    if (clash && clash.id !== hostId) {
      return NextResponse.json({ error: 'You already have a host with that name' }, { status: 409 })
    }

    const host = await prisma.host.update({
      where: { id: hostId },
      data: { hostname },
    })

    return NextResponse.json({ success: true, host })
  } catch (err: any) {
    console.error('Update host error:', err)
    return NextResponse.json({ error: 'Failed to update host' }, { status: 500 })
  }
}

// Delete a host (its reports cascade automatically)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hostId = params?.id
    const existing = await prisma.host.findUnique({ where: { id: hostId } })
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Host not found' }, { status: 404 })
    }

    await prisma.host.delete({ where: { id: hostId } })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Delete host error:', err)
    return NextResponse.json({ error: 'Failed to delete host' }, { status: 500 })
  }
}
