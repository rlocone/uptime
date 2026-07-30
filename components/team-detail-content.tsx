'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Save, Users, Check, Minus, AlertTriangle, Clock3, TrendingUp } from 'lucide-react'
import { formatUptime } from '@/lib/uptime'

interface HostSnapshot {
  id: string
  hostname: string
  createdAt: string
  userId: string
  user?: { username: string }
  latestReport: {
    uptimeSeconds: number
    reportedAt: string
    kernel?: string
    lastPatch?: string
  } | null
}

interface TeamSummary {
  totalHosts: number
  uptime24hPercent: number
  uptime7dPercent: number
  uptime30dPercent: number
  currentUptimeSecondsTotal: number
  currentUptimeSecondsAverage: number
  upCount: number
  degradedCount: number
  downCount: number
  lastIncidentAt: string | null
}

interface TeamDetail {
  id: string
  name: string
  description: string | null
  slug: string
  createdAt: string
  updatedAt: string
  memberCount: number
  memberHostIds: string[]
  summary: TeamSummary
  hosts: HostSnapshot[]
}

function getStatus(latestReport: HostSnapshot['latestReport']) {
  if (!latestReport?.reportedAt) return 'down'
  const ageMs = Date.now() - new Date(latestReport.reportedAt).getTime()
  if (ageMs <= 10 * 60 * 1000) return 'up'
  if (ageMs <= 60 * 60 * 1000) return 'degraded'
  return 'down'
}

function statusMeta(latestReport: HostSnapshot['latestReport']) {
  const status = getStatus(latestReport)
  if (status === 'up') return { label: 'Up', color: 'text-[#39ff14]', bg: 'bg-[#39ff14]/10' }
  if (status === 'degraded') return { label: 'Degraded', color: 'text-amber-400', bg: 'bg-amber-400/10' }
  return { label: 'Down', color: 'text-red-400', bg: 'bg-red-400/10' }
}

export function TeamDetailContent({ initialTeam }: { initialTeam: TeamDetail }) {
  const [team, setTeam] = useState(initialTeam)
  const [selectedHostIds, setSelectedHostIds] = useState<string[]>(initialTeam.memberHostIds ?? [])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setTeam(initialTeam)
    setSelectedHostIds(initialTeam.memberHostIds ?? [])
  }, [initialTeam])

  const availableHosts = team.hosts ?? []
  const memberHosts = availableHosts.filter((host) => selectedHostIds.includes(host.id))

  const saveMembership = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostIds: selectedHostIds }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success('Team membership updated')
        const nextTeam: TeamDetail = data?.team ?? team
        setTeam(nextTeam)
        setSelectedHostIds(nextTeam.memberHostIds ?? [])
      } else {
        toast.error(data?.error ?? 'Failed to update team membership')
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to update team membership')
    }
    setSaving(false)
  }

  const toggleHost = (hostId: string) => {
    setSelectedHostIds((current) =>
      current.includes(hostId) ? current.filter((id) => id !== hostId) : [...current, hostId]
    )
  }

  const summary = team.summary

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link href="/teams" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-[#00d4ff] transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to teams
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight flex items-center gap-3">
            <Users className="h-6 w-6 text-[#00d4ff]" />
            <span className="neon-text-blue">{team.name}</span>
          </h1>
          <p className="text-sm text-muted-foreground">/{team.slug}</p>
          {team.description ? <p className="mt-1 text-sm text-muted-foreground">{team.description}</p> : null}
        </div>
        <button
          onClick={saveMembership}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-[#00d4ff] px-4 py-2 text-sm font-semibold text-[#0a0a0f] hover:bg-[#00d4ff]/80 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save members'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Metric label="Hosts" value={String(summary?.totalHosts ?? 0)} />
        <Metric label="Current status" value={`${summary?.upCount ?? 0} up / ${summary?.degradedCount ?? 0} degraded / ${summary?.downCount ?? 0} down`} />
        <Metric label="24h uptime" value={formatPercent(summary?.uptime24hPercent ?? 0)} />
        <Metric label="Combined uptime" value={formatUptime(summary?.currentUptimeSecondsTotal ?? 0)} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="rounded-lg border neon-border bg-card p-4 space-y-4">
          <h2 className="text-sm font-semibold neon-text-green flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Member Hosts
          </h2>
          {memberHosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hosts are assigned to this team yet.</p>
          ) : (
            <div className="space-y-3">
              {memberHosts.map((host) => {
                const meta = statusMeta(host.latestReport)
                return (
                  <div key={host.id} className="rounded-md border border-border/60 bg-muted/20 p-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{host.hostname}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${meta.bg} ${meta.color}`}>
                          {meta.label}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Current uptime: {formatUptime(host.latestReport?.uptimeSeconds ?? 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last report: {host.latestReport?.reportedAt ? new Date(host.latestReport.reportedAt).toLocaleString('en-US', { timeZone: 'UTC' }) : 'Never'}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{host.user?.username ?? 'unknown'}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="rounded-lg border neon-border bg-card p-4 space-y-4">
          <h2 className="text-sm font-semibold neon-text-blue flex items-center gap-2">
            <Check className="h-4 w-4" />
            Add / Remove Hosts
          </h2>
          {availableHosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">You do not have any hosts yet.</p>
          ) : (
            <div className="space-y-2 max-h-[640px] overflow-auto pr-1">
              {availableHosts.map((host: any) => {
                const checked = selectedHostIds.includes(host.id)
                const meta = statusMeta(host.latestReport)
                return (
                  <label key={host.id} className="flex items-start gap-3 rounded-md border border-border/60 bg-muted/20 p-3 cursor-pointer hover:border-[#00d4ff]/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleHost(host.id)}
                      className="mt-1 h-4 w-4 rounded border-border text-[#00d4ff] focus:ring-[#00d4ff]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{host.hostname}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${meta.bg} ${meta.color}`}>
                          {meta.label}
                        </span>
                        {checked ? (
                          <span className="rounded-full bg-[#39ff14]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#39ff14]">
                            Member
                          </span>
                        ) : (
                          <span className="rounded-full bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            Not in team
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        <p>Current uptime: {formatUptime(host.latestReport?.uptimeSeconds ?? 0)}</p>
                        <p>Last report: {host.latestReport?.reportedAt ? new Date(host.latestReport.reportedAt).toLocaleString('en-US', { timeZone: 'UTC' }) : 'Never'}</p>
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border neon-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold neon-text-blue flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Aggregation Notes
        </h2>
        <p className="text-sm text-muted-foreground">
          Team totals use the same host-summary logic as the main dashboard: we aggregate the latest report for each host,
          then classify current state by how recently the last report arrived (up, degraded, or down).
        </p>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border neon-border bg-card p-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

function formatPercent(value: number) {
  return `${Math.max(0, Math.min(100, value)).toFixed(1)}%`
}
