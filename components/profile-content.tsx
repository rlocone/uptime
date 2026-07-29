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

interface UserProfile {
  id: string
  username: string
  email: string
  apiKey: string
  createdAt: string
  lastSeen: string
  emailVerified: boolean
}

export function ProfileContent() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [hosts, setHosts] = useState<HostData[]>([])
  const [newHostname, setNewHostname] = useState('')
  const [loading, setLoading] = useState(true)
  const [showKey, setShowKey] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    const load = async () => {
      try {
        const res = await fetch('/api/profile')
        if (res.ok) {
          const data = await res.json()
          setProfile(data?.user ?? null)
          setHosts(data?.hosts ?? [])
        }
      } catch (e) { console.error(e) }
      setLoading(false)
    }
    load()
  }, [status])

  const reloadHosts = async () => {
    const r = await fetch('/api/profile')
    if (r.ok) {
      const d = await r.json()
      setHosts(d?.hosts ?? [])
    }
  }

  const startEdit = (h: HostData) => {
    setEditingId(h.id)
    setEditingName(h.hostname)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const saveEdit = async (id: string) => {
    const name = editingName.trim()
    if (!name) return
    setBusyId(id)
    try {
      const res = await fetch(`/api/hosts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostname: name }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success('Host updated')
        cancelEdit()
        await reloadHosts()
      } else {
        toast.error(d?.error ?? 'Failed to update host')
      }
    } catch (e) {
      console.error(e)
      toast.error('Failed to update host')
    }
    setBusyId(null)
  }

  const deleteHost = async (h: HostData) => {
    if (!window.confirm(`Delete host "${h.hostname}"? This permanently removes it and all its uptime history.`)) return
    setBusyId(h.id)
    try {
      const res = await fetch(`/api/hosts/${h.id}`, { method: 'DELETE' })
      const d = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success('Host deleted')
        await reloadHosts()
      } else {
        toast.error(d?.error ?? 'Failed to delete host')
      }
    } catch (e) {
      console.error(e)
      toast.error('Failed to delete host')
    }
    setBusyId(null)
  }

  const copyApiKey = () => {
    if (profile?.apiKey) {
      navigator.clipboard?.writeText?.(profile.apiKey)
      toast.success('API key copied to clipboard')
    }
  }

  const addHost = async () => {
    if (!newHostname.trim()) return
    try {
      const res = await fetch('/api/hosts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostname: newHostname.trim() }),
      })
      if (res.ok) {
        toast.success('Host added!')
        setNewHostname('')
        await reloadHosts()
      } else {
        const d = await res.json()
        toast.error(d?.error ?? 'Failed to add host')
      }
    } catch (e) {
      console.error(e)
      toast.error('Failed to add host')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-12 text-center text-muted-foreground">
        Loading...
      </div>
    )
  }

  if (status === 'unauthenticated') return null

  const agentScript = `#!/usr/bin/env python3
  import os
  import time
  import platform
  from pathlib import Path

  import requests

  API_URL = "${typeof window !== 'undefined' ? window.location.origin : ''}/api/report"
  HOSTNAME = platform.node().lower()
  DEFAULT_KEY_FILES = (
      Path.home() / ".config" / "uptime-phipi-monitor" / "api-key",
      Path("/etc/uptime-phipi-monitor/api-key"),
  )

  def get_api_key():
      env_key = os.environ.get("UPTIME_API_KEY", "").strip()
      if env_key:
          return env_key

      key_file = os.environ.get("UPTIME_API_KEY_FILE", "").strip()
      if key_file:
          path = Path(key_file).expanduser()
          if path.exists():
              key = path.read_text(encoding="utf-8").strip()
              if key:
                  return key

      for path in DEFAULT_KEY_FILES:
          if path.exists():
              key = path.read_text(encoding="utf-8").strip()
              if key:
                  return key

      raise RuntimeError("Missing UPTIME_API_KEY or key file")

  API_KEY = get_api_key()

def get_uptime():
    with open('/proc/uptime') as f:
        return int(float(f.read().split()[0]))

def get_boot_time():
    return int(time.time() - get_uptime())

while True:
    data = {
        "hostname": HOSTNAME,
        "uptime_seconds": get_uptime(),
        "boot_time": get_boot_time(),
        "kernel": platform.release(),
        "last_patch": ""
    }
    try:
        r = requests.post(API_URL, json=data, headers={"X-API-Key": API_KEY})
        print(f"[{time.strftime('%H:%M:%S')}] {r.status_code} {r.json()}")
    except Exception as e:
        print(f"Error: {e}")
    time.sleep(300)  # Report every 5 minutes`

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
        <User className="h-6 w-6 text-[#00d4ff]" />
        <span className="neon-text-blue">{profile?.username ?? 'Profile'}</span>
      </h1>

      {/* User info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border neon-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold neon-text-blue flex items-center gap-2">
            <User className="h-4 w-4" />
            Account Info
          </h2>
          <div className="text-xs space-y-2 text-muted-foreground">
            <div className="flex justify-between"><span>Username:</span><span className="text-foreground">{profile?.username}</span></div>
            <div className="flex justify-between"><span>Email:</span><span className="text-foreground">{profile?.email}</span></div>
            <div className="flex justify-between"><span>Joined:</span><span className="text-foreground">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { timeZone: 'UTC' }) : ''}</span></div>
            <div className="flex justify-between"><span>Hosts:</span><span className="text-foreground">{hosts?.length ?? 0}</span></div>
          </div>
        </div>

        <div className="rounded-lg border neon-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold neon-text-green flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Key
          </h2>
          <p className="text-xs text-muted-foreground">Use the API key above via UPTIME_API_KEY or a key file. The script below reads both.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-muted/50 px-3 py-2 text-xs font-mono break-all">
              {showKey ? (profile?.apiKey ?? '') : '•'.repeat(36)}
            </code>
            <button onClick={() => setShowKey(!showKey)} className="text-xs text-[#00d4ff] hover:underline whitespace-nowrap">
              {showKey ? 'Hide' : 'Show'}
            </button>
            <button onClick={copyApiKey} className="p-1.5 rounded hover:bg-muted/50 transition-colors">
              <Copy className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          {/* Signature badge */}
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Your signature badge:</p>
            <div className="rounded bg-muted/30 p-2">
              <code className="text-[10px] text-muted-foreground break-all">
                {typeof window !== 'undefined' ? window.location.origin : ''}/api/sig/{profile?.username}
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Add host */}
      <div className="rounded-lg border neon-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold neon-text-blue flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Host
        </h2>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newHostname}
            onChange={(e) => setNewHostname(e.target.value)}
            placeholder="hostname (e.g. srv-01.example.com)"
            onKeyDown={(e) => e.key === 'Enter' && addHost()}
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00d4ff]"
          />
          <button onClick={addHost} className="px-4 py-2 rounded-md bg-[#00d4ff] text-[#0a0a0f] text-sm font-semibold hover:bg-[#00d4ff]/80 transition-all">
            Add
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground">Hosts are also auto-created when the agent reports for a new hostname.</p>
      </div>

      {/* Hosts table */}
      <div className="rounded-lg border neon-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold neon-text-blue flex items-center gap-2">
            <Server className="h-4 w-4" />
            Your Hosts ({hosts?.length ?? 0})
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Hostname</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Current Uptime</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Kernel</th>
              <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Last Report</th>
              <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(hosts?.length ?? 0) === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground text-xs">
                <AlertCircle className="h-4 w-4 mx-auto mb-2" />
                No hosts yet. Add a host or run the agent script.
              </td></tr>
            ) : (
              hosts.map((h: HostData) => (
                <tr key={h?.id} className="border-b border-border/50 table-row-glow">
                  <td className="px-4 py-2.5 text-foreground">
                    {editingId === h.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(h.id)
                          if (e.key === 'Escape') cancelEdit()
                        }}
                        autoFocus
                        className="w-full rounded border border-[#00d4ff]/50 bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#00d4ff]"
                      />
                    ) : (
                      h?.hostname ?? 'unknown'
                    )}
                  </td>
                  <td className="px-4 py-2.5 neon-text-green text-xs">{formatUptime(h?.currentUptime ?? 0)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{h?.kernel || '-'}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground text-xs">
                    {h?.lastReport ? new Date(h.lastReport).toLocaleString('en-US', { timeZone: 'UTC' }) : 'Never'}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {editingId === h.id ? (
                        <>
                          <button
                            onClick={() => saveEdit(h.id)}
                            disabled={busyId === h.id}
                            title="Save"
                            className="p-1.5 rounded hover:bg-[#39ff14]/10 text-[#39ff14] transition-colors disabled:opacity-40"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={busyId === h.id}
                            title="Cancel"
                            className="p-1.5 rounded hover:bg-muted/50 text-muted-foreground transition-colors disabled:opacity-40"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(h)}
                            disabled={busyId === h.id}
                            title="Rename host"
                            className="p-1.5 rounded hover:bg-[#00d4ff]/10 text-[#00d4ff] transition-colors disabled:opacity-40"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteHost(h)}
                            disabled={busyId === h.id}
                            title="Delete host"
                            className="p-1.5 rounded hover:bg-red-500/10 text-red-400 transition-colors disabled:opacity-40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Agent script */}
      <div className="rounded-lg border neon-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold neon-text-green flex items-center gap-2">
          <Terminal className="h-4 w-4" />
          Agent Script
        </h2>
        <p className="text-xs text-muted-foreground">Save this script and run it on each host. It reports uptime every 5 minutes.</p>
        <pre className="rounded bg-muted/30 p-4 text-xs overflow-x-auto whitespace-pre text-foreground">
          {agentScript}
        </pre>
        <button
          onClick={() => { navigator.clipboard?.writeText?.(agentScript); toast.success('Script copied!') }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-muted/50 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <Copy className="h-3.5 w-3.5" />
          Copy Script
        </button>
      </div>
    </div>
  )
}
