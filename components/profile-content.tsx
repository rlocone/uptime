'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { User, Key, Server, Clock, Copy, Plus, Terminal, AlertCircle, Pencil, Trash2, Check, X } from 'lucide-react'
import { formatUptime } from '@/lib/uptime'
import { toast } from 'sonner'

interface HostData {
  id: string
  hostname: string
  createdAt: string
  currentUptime: number
  kernel: string
  lastReport: string | null
}

const formatHostLabel = (hostname: string) => {
  if (hostname === 'exa-m1') return 'eXa-m1'
  return hostname
}
