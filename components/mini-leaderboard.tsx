'use client'

import { useEffect, useState } from 'react'
import { Trophy, Clock, Server, Users, PlusCircle } from 'lucide-react'
import { formatUptime } from '@/lib/uptime'
import Link from 'next/link'

interface LeaderboardEntry {
  rank: number
  name: string
  value: number | string
  isUptime?: boolean
}

const categoryConfig: Record<string, { title: string; icon: any; color: string }> = {
  hosts_current: { title: 'Hosts: Current Uptime', icon: Clock, color: '#00d4ff' },
  hosts_record: { title: 'Hosts: Uptime Record', icon: Trophy, color: '#39ff14' },
  users_current: { title: 'Users: Current Uptime', icon: Users, color: '#00d4ff' },
  users_record: { title: 'Users: Uptime Record', icon: Trophy, color: '#39ff14' },
  new_hosts: { title: 'New Hosts', icon: Server, color: '#00d4ff' },
  new_users: { title: 'New Users', icon: PlusCircle, color: '#39ff14' },
}

export function MiniLeaderboard({ category }: { category: string }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const config = categoryConfig[category] ?? { title: category, icon: Trophy, color: '#00d4ff' }
  const Icon = config.icon

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/leaderboard?category=${category}&limit=5`)
        if (res.ok) {
          const data = await res.json()
          setEntries(data?.entries ?? [])
        }
      } catch (e) { console.error('Leaderboard load error:', e) }
    }
    load()
  }, [category])

  return (
    <div className="rounded-lg border neon-border bg-card p-4 space-y-3 hover:border-[rgba(0,212,255,0.5)] transition-all">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold flex items-center gap-2" style={{ color: config.color }}>
          <Icon className="h-4 w-4" />
          {config.title}
        </h3>
        <Link href={`/leaderboard?tab=${category}`} className="text-[10px] text-muted-foreground hover:text-[#00d4ff] transition-colors">
          View All →
        </Link>
      </div>
      <div className="space-y-1">
        {(entries?.length ?? 0) === 0 ? (
          <p className="text-xs text-muted-foreground">No data yet</p>
        ) : (
          entries.map((e: LeaderboardEntry, i: number) => (
            <div key={i} className="flex items-center justify-between text-xs py-1 table-row-glow rounded px-1">
              <span className="flex items-center gap-2">
                <span className="w-5 text-muted-foreground">#{e?.rank ?? i + 1}</span>
                <span className="text-foreground">{e?.name ?? 'Unknown'}</span>
              </span>
              <span className="text-muted-foreground font-mono">
                {e?.isUptime ? formatUptime(Number(e?.value ?? 0)) : String(e?.value ?? '')}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
