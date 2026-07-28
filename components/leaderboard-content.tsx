'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Trophy, Clock, Server, Users, PlusCircle, ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react'
import { formatUptime } from '@/lib/uptime'

const tabs = [
  { key: 'hosts_current', label: 'Hosts: Current', icon: Clock },
  { key: 'hosts_record', label: 'Hosts: Record', icon: Trophy },
  { key: 'users_current', label: 'Users: Current', icon: Users },
  { key: 'users_record', label: 'Users: Record', icon: Trophy },
  { key: 'new_hosts', label: 'New Hosts', icon: Server },
  { key: 'new_users', label: 'New Users', icon: PlusCircle },
]

interface Entry {
  rank: number
  name: string
  value: number | string
  isUptime: boolean
}

export function LeaderboardContent() {
  const searchParams = useSearchParams()
  const initialTab = searchParams?.get('tab') ?? 'hosts_current'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [entries, setEntries] = useState<Entry[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const limit = 25

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/leaderboard?category=${activeTab}&limit=${limit}&page=${page}`)
        if (res.ok) {
          const data = await res.json()
          setEntries(data?.entries ?? [])
          setTotal(data?.total ?? 0)
        }
      } catch (e) { console.error(e) }
      setLoading(false)
    }
    load()
  }, [activeTab, page])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-[#00d4ff]" />
          <span className="neon-text-blue">Leaderboard</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Global rankings across all categories</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 border-b border-border pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setPage(1) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-all ${
                activeTab === tab.key
                  ? 'bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="rounded-lg border neon-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-16">Rank</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Name</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Value</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : (entries?.length ?? 0) === 0 ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No data yet</td></tr>
            ) : (
              entries.map((entry: Entry, i: number) => (
                <tr key={i} className="border-b border-border/50 table-row-glow transition-all">
                  <td className="px-4 py-2.5">
                    <span className={`font-semibold ${(entry?.rank ?? 0) <= 3 ? 'neon-text-green' : 'text-muted-foreground'}`}>
                      #{entry?.rank ?? i + 1}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-foreground">{entry?.name ?? 'Unknown'}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                    {entry?.isUptime ? formatUptime(Number(entry?.value ?? 0)) : String(entry?.value ?? '')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
        <span>Page {page} of {totalPages} ({total} entries)</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-muted/50 hover:bg-muted disabled:opacity-30 transition-all"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Prev
          </button>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-muted/50 hover:bg-muted disabled:opacity-30 transition-all"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
