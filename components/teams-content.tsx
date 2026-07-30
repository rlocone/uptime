'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Users, Clock3, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react'
import { formatUptime } from '@/lib/uptime'
import { TeamHealthBar } from '@/components/team-health-bar'

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

interface HostItem {
  id: string
  hostname: string
  currentUptime: number
  lastReport: string | null
}

interface TeamListItem {
  id: string
  name: string
  description: string | null
  slug: string
  createdAt: string
  updatedAt: string
  memberCount: number
  summary: TeamSummary
  hosts?: HostItem[]
}

function formatPercent(value: number) {
  return `${Math.max(0, Math.min(100, value)).toFixed(1)}%`
}

export function TeamsContent() {
  const [teams, setTeams] = useState<TeamListItem[]>([])
  const [hosts, setHosts] = useState<HostItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingHosts, setLoadingHosts] = useState(true)
  const [creating, setCreating] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedHostIds, setSelectedHostIds] = useState<string[]>([])
  const [appliedHostIds, setAppliedHostIds] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingDescription, setEditingDescription] = useState('')

  const loadTeams = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/teams')
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setTeams(data?.teams ?? [])
      } else {
        toast.error(data?.error ?? 'Failed to load teams')
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to load teams')
    }
    setLoading(false)
  }

  const loadHosts = async () => {
    setLoadingHosts(true)
    try {
      const res = await fetch('/api/hosts')
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setHosts(data?.hosts ?? [])
      }
    } catch (error) {
      console.error(error)
    }
    setLoadingHosts(false)
  }

  useEffect(() => {
    loadTeams()
    loadHosts()
  }, [])

  const startEdit = (team: TeamListItem) => {
    setEditingId(team.id)
    setEditingName(team.name)
    setEditingDescription(team.description ?? '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName('')
    setEditingDescription('')
  }

  const createTeam = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) return
    setCreating(true)
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, description: description.trim(), hostIds: appliedHostIds }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success('Team created')
        setName('')
        setDescription('')
        await loadTeams()
      } else {
        toast.error(data?.error ?? 'Failed to create team')
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to create team')
    }
    setCreating(false)
  }

  const saveTeam = async (team: TeamListItem) => {
    const trimmedName = editingName.trim()
    if (!trimmedName) return
    setBusyId(team.id)
    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, description: editingDescription.trim() || null }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success('Team updated')
        const next = data?.team ?? team
        setTeams((current) => current.map((item) => (item.id === team.id ? next : item)))
        cancelEdit()
      } else {
        toast.error(data?.error ?? 'Failed to update team')
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to update team')
    }
    setBusyId(null)
  }

  const deleteTeam = async (team: TeamListItem) => {
    if (!window.confirm(`Delete team "${team.name}"? This removes the team and its member assignments.`)) return
    setBusyId(team.id)
    try {
      const res = await fetch(`/api/teams/${team.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success('Team deleted')
        setTeams((current) => current.filter((item) => item.id !== team.id))
      } else {
        toast.error(data?.error ?? 'Failed to delete team')
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to delete team')
    }
    setBusyId(null)
  }

  const combinedTotals = useMemo(() => {
    return teams.reduce(
      (acc, team) => {
        acc.hosts += team.summary?.totalHosts ?? 0
        acc.memberships += team.memberCount ?? 0
        return acc
      },
      { hosts: 0, memberships: 0 }
    )
  }, [teams])

  const hostSelectionDirty =
    selectedHostIds.length !== appliedHostIds.length || selectedHostIds.some((id) => !appliedHostIds.includes(id))

  const applySelection = () => {
    setAppliedHostIds(selectedHostIds)
    toast.success(
      selectedHostIds.length > 0
        ? `${selectedHostIds.length} host${selectedHostIds.length === 1 ? '' : 's'} staged for the new team`
        : 'Cleared staged hosts'
    )
  }

  const removeStagedHost = (hostId: string) => {
    setSelectedHostIds((current) => current.filter((id) => id !== hostId))
    setAppliedHostIds((current) => current.filter((id) => id !== hostId))
  }

  const stagedHosts = useMemo(() => hosts.filter((host) => appliedHostIds.includes(host.id)), [hosts, appliedHostIds])

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-[#00d4ff] transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight flex items-center gap-3">
            <Users className="h-6 w-6 text-[#00d4ff]" />
            <span className="neon-text-blue">Teams</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Group hosts into shared views and track combined totals per team.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            The 24h / 7d / 30d values below are reporting coverage, not literal downtime.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border neon-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Teams</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{teams.length}</p>
        </div>
        <div className="rounded-lg border neon-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Team hosts</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{combinedTotals.hosts}</p>
        </div>
        <div className="rounded-lg border neon-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Memberships</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{combinedTotals.memberships}</p>
        </div>
      </div>

      <div className="rounded-lg border neon-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold neon-text-green flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Team
        </h2>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createTeam()}
            placeholder="Team name"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00d4ff]"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createTeam()}
            placeholder="Optional description"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00d4ff]"
          />
          <button
            onClick={createTeam}
            disabled={creating}
            className="rounded-md bg-[#00d4ff] px-4 py-2 text-sm font-semibold text-[#0a0a0f] hover:bg-[#00d4ff]/80 disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
        </div>
        <div className="rounded-md border border-border/60 bg-muted/20 p-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">Add hosts now</p>
            <span className="text-xs text-muted-foreground">{selectedHostIds.length} selected</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Select any of your hosts to stage them for the new team. Click Apply selection before creating so the assignment is explicit.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={applySelection}
              disabled={!hostSelectionDirty}
              className="rounded-md bg-[#39ff14] px-3 py-1.5 text-xs font-semibold text-[#0a0a0f] hover:bg-[#39ff14]/80 disabled:opacity-50"
            >
              Apply selection
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedHostIds([])
                setAppliedHostIds([])
              }}
              disabled={selectedHostIds.length === 0 && appliedHostIds.length === 0}
              className="rounded-md border border-border/60 bg-background/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/40 disabled:opacity-50"
            >
              Clear selection
            </button>
            <span className="text-xs text-muted-foreground">
              {appliedHostIds.length > 0
                ? `${appliedHostIds.length} host${appliedHostIds.length === 1 ? '' : 's'} will be added on create`
                : 'No hosts staged yet'}
            </span>
          </div>
          {stagedHosts.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {stagedHosts.map((host) => (
                <span
                  key={host.id}
                  className="inline-flex items-center gap-2 rounded-full border border-[#39ff14]/30 bg-[#39ff14]/10 px-3 py-1 text-xs font-medium text-[#39ff14]"
                >
                  {host.hostname}
                  <button
                    type="button"
                    onClick={() => removeStagedHost(host.id)}
                    className="rounded-full px-1 text-[#39ff14]/80 hover:bg-[#39ff14]/10 hover:text-[#39ff14]"
                    aria-label={`Remove ${host.hostname} from staged hosts`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          {loadingHosts ? (
            <p className="text-sm text-muted-foreground">Loading your hosts…</p>
          ) : hosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">You do not have any hosts yet. Add a host first, then come back here to group it.</p>
          ) : (
            <div className="max-h-56 overflow-auto rounded-md border border-border/60 bg-background/60 p-2 space-y-2">
              {hosts.map((host) => {
                const checked = selectedHostIds.includes(host.id)
                return (
                  <label key={host.id} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/40 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedHostIds((current) =>
                          current.includes(host.id) ? current.filter((id) => id !== host.id) : [...current, host.id]
                        )
                      }
                      className="h-4 w-4 rounded border-border text-[#00d4ff] focus:ring-[#00d4ff]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{host.hostname}</p>
                      <p className="text-xs text-muted-foreground">
                        Current uptime: {formatUptime(host.currentUptime ?? 0)} • Last report: {host.lastReport ? new Date(host.lastReport).toLocaleString('en-US', { timeZone: 'UTC' }) : 'Never'}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold neon-text-blue">Your Teams</h2>
          <span className="text-xs text-muted-foreground">{loading ? 'Loading…' : `${teams.length} team${teams.length === 1 ? '' : 's'}`}</span>
        </div>

        {loading ? (
          <div className="rounded-lg border neon-border bg-card p-6 text-sm text-muted-foreground">Loading teams…</div>
        ) : teams.length === 0 ? (
          <div className="rounded-lg border neon-border bg-card p-6 text-sm text-muted-foreground">
            No teams yet. Create one above to start grouping hosts.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {teams.map((team) => {
              const summary = team.summary
              const isEditing = editingId === team.id
              return (
                <div key={team.id} className="rounded-lg border neon-border bg-card p-4 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="w-full rounded-md border border-[#00d4ff]/40 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00d4ff]"
                          />
                          <textarea
                            value={editingDescription}
                            onChange={(e) => setEditingDescription(e.target.value)}
                            rows={2}
                            className="w-full rounded-md border border-[#00d4ff]/40 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00d4ff]"
                            placeholder="Optional description"
                          />
                        </div>
                      ) : (
                        <>
                          <Link href={`/teams/${team.slug}`} className="text-base font-semibold text-foreground hover:text-[#00d4ff] transition-colors">
                            {team.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">/{team.slug}</p>
                          {team.description ? <p className="mt-1 text-sm text-muted-foreground">{team.description}</p> : null}
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => saveTeam(team)}
                            disabled={busyId === team.id}
                            className="rounded p-2 text-[#39ff14] hover:bg-[#39ff14]/10 disabled:opacity-40"
                            title="Save"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={busyId === team.id}
                            className="rounded p-2 text-muted-foreground hover:bg-muted/50 disabled:opacity-40"
                            title="Cancel"
                          >
                            ×
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(team)}
                            disabled={busyId === team.id}
                            className="rounded p-2 text-[#00d4ff] hover:bg-[#00d4ff]/10 disabled:opacity-40"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteTeam(team)}
                            disabled={busyId === team.id}
                            className="rounded p-2 text-red-400 hover:bg-red-500/10 disabled:opacity-40"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {!isEditing ? (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                      <Metric label="Hosts" value={String(summary?.totalHosts ?? 0)} />
                      <Metric label="Up / Degraded / Down" value={`${summary?.upCount ?? 0} / ${summary?.degradedCount ?? 0} / ${summary?.downCount ?? 0}`} />
                      <Metric label="24h coverage" value={formatPercent(summary?.uptime24hPercent ?? 0)} />
                      <Metric label="7d coverage" value={formatPercent(summary?.uptime7dPercent ?? 0)} />
                      <Metric label="30d coverage" value={formatPercent(summary?.uptime30dPercent ?? 0)} />
                    </div>
                  ) : null}

                  {!isEditing ? (
                    <div className="space-y-3">
                      <TeamHealthBar
                        compact
                        counts={{
                          totalHosts: summary?.totalHosts ?? 0,
                          upCount: summary?.upCount ?? 0,
                          degradedCount: summary?.degradedCount ?? 0,
                          downCount: summary?.downCount ?? 0,
                        }}
                      />
                      {team.hosts?.length ? (
                        <div className="space-y-2">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Members</p>
                          <div className="flex flex-wrap gap-2">
                            {team.hosts.slice(0, 6).map((host) => (
                              <span
                                key={host.id}
                                className="inline-flex items-center rounded-full border border-border/60 bg-muted/20 px-2.5 py-1 text-[11px] text-foreground"
                              >
                                {host.hostname}
                              </span>
                            ))}
                            {team.hosts.length > 6 ? (
                              <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/20 px-2.5 py-1 text-[11px] text-muted-foreground">
                                +{team.hosts.length - 6} more
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                      <div className="grid gap-2 sm:grid-cols-2 text-xs text-muted-foreground">
                        <div className="rounded-md border border-border/60 bg-muted/20 p-3">
                          <p className="text-[10px] uppercase tracking-[0.2em]">Current uptime total</p>
                          <p className="mt-1 text-foreground">{formatUptime(summary?.currentUptimeSecondsTotal ?? 0)}</p>
                        </div>
                        <div className="rounded-md border border-border/60 bg-muted/20 p-3">
                          <div className="flex items-center gap-2 text-foreground">
                            <Clock3 className="h-4 w-4 text-[#00d4ff]" />
                            Last incident
                          </div>
                          <div className="mt-1">
                            {summary?.lastIncidentAt ? new Date(summary.lastIncidentAt).toLocaleString('en-US', { timeZone: 'UTC' }) : 'None'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 p-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}
