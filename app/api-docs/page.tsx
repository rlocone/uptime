import { NavHeader } from '@/components/nav-header'
import { SiteFooter } from '@/components/site-footer'
import { BookOpen, Terminal, Key, Send, Server, Code, FileJson } from 'lucide-react'

const agentScript = `#!/usr/bin/env python3
import os
import platform
import time
from pathlib import Path

import requests

API_URL = "https://uptime.phipi.io/api/report"
HOSTNAME = os.environ.get("UPTIME_HOSTNAME", platform.node()).strip().lower()
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


def get_uptime():
    with open('/proc/uptime') as f:
        return int(float(f.read().split()[0]))


def get_boot_time():
    return int(time.time() - get_uptime())


API_KEY = get_api_key()

while True:
    data = {
        "hostname": HOSTNAME,
        "uptime_seconds": get_uptime(),
        "boot_time": get_boot_time(),
        "kernel": platform.release(),
        "last_patch": ""
    }
    try:
        r = requests.post(API_URL, json=data, headers={"X-API-Key": API_KEY}, timeout=30)
        print(f"[{time.strftime('%H:%M:%S')}] {r.status_code} {r.json()}")
    except Exception as e:
        print(f"Error: {e}")
    time.sleep(300)  # Report every 5 minutes`

export default function ApiDocsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-[1200px] px-4 py-6 space-y-6">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-[#00d4ff]" />
            <span className="neon-text-blue">API Documentation</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Everything you need to set up the uptime agent and start reporting.
          </p>

          {/* Getting started */}
          <div className="rounded-lg border neon-border bg-card p-6 space-y-4">
            <h2 className="text-lg font-semibold neon-text-green flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Getting Started
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p><span className="text-[#39ff14] font-semibold">1.</span> Register an account and login to get your API key from the Profile page.</p>
              <p><span className="text-[#39ff14] font-semibold">2.</span> Copy the agent script below and save it as <code className="text-foreground bg-muted/50 px-1 rounded">uptime_agent.py</code></p>
              <p><span className="text-[#39ff14] font-semibold">3.</span> Set <code className="text-foreground bg-muted/50 px-1 rounded">UPTIME_API_KEY</code> in the environment before launching.</p>
              <p><span className="text-[#39ff14] font-semibold">4.</span> Run: <code className="text-foreground bg-muted/50 px-1 rounded">python3 uptime_agent.py</code> (or set up as a systemd service for continuous reporting).</p>
              <p><span className="text-[#39ff14] font-semibold">5.</span> The agent reports every 5 minutes. Adjust the interval as needed.</p>
            </div>
          </div>

          {/* API Key */}
          <div className="rounded-lg border neon-border bg-card p-6 space-y-4">
            <h2 className="text-lg font-semibold neon-text-blue flex items-center gap-2">
              <Key className="h-5 w-5" />
              Authentication
            </h2>
            <p className="text-sm text-muted-foreground">
              All API requests must include your API key in the <code className="text-foreground bg-muted/50 px-1 rounded">X-API-Key</code> header.
              Find your key on the Profile page after logging in.
            </p>
            <pre className="rounded bg-muted/30 p-4 text-xs overflow-x-auto text-foreground">
{`curl -X POST /api/report \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your_api_key_here" \\
  -d '{"hostname": "srv-01", "uptime_seconds": 86400}'`}
            </pre>
          </div>

          {/* Report endpoint */}
          <div className="rounded-lg border neon-border bg-card p-6 space-y-4">
            <h2 className="text-lg font-semibold neon-text-green flex items-center gap-2">
              <Send className="h-5 w-5" />
              POST /api/report
            </h2>
            <p className="text-sm text-muted-foreground">Submit an uptime report for a host. The host will be auto-created if it does not exist.</p>
            <div className="rounded bg-muted/30 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileJson className="h-4 w-4 text-[#00d4ff]" />
                Request Body (JSON)
              </h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-1.5 text-muted-foreground">Field</th>
                    <th className="py-1.5 text-muted-foreground">Type</th>
                    <th className="py-1.5 text-muted-foreground">Required</th>
                    <th className="py-1.5 text-muted-foreground">Description</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/50"><td className="py-1.5 text-foreground">hostname</td><td>string</td><td className="text-[#39ff14]">Yes</td><td>Machine hostname</td></tr>
                  <tr className="border-b border-border/50"><td className="py-1.5 text-foreground">uptime_seconds</td><td>int</td><td className="text-[#39ff14]">Yes</td><td>Current uptime in seconds</td></tr>
                  <tr className="border-b border-border/50"><td className="py-1.5 text-foreground">boot_time</td><td>int</td><td>No</td><td>Unix timestamp of last boot</td></tr>
                  <tr className="border-b border-border/50"><td className="py-1.5 text-foreground">kernel</td><td>string</td><td>No</td><td>Kernel version</td></tr>
                  <tr><td className="py-1.5 text-foreground">last_patch</td><td>string</td><td>No</td><td>Last patch info</td></tr>
                </tbody>
              </table>
            </div>
            <div className="rounded bg-muted/30 p-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">Response (200)</h3>
              <pre className="text-xs text-foreground">{`{"success": true, "host_id": "...", "report_id": "..."}`}</pre>
            </div>
          </div>

          {/* Signature badge */}
          <div className="rounded-lg border neon-border bg-card p-6 space-y-4">
            <h2 className="text-lg font-semibold neon-text-blue flex items-center gap-2">
              <Code className="h-5 w-5" />
              Signature Badge
            </h2>
            <p className="text-sm text-muted-foreground">
              Embed your uptime badge on forums or profiles:
            </p>
            <pre className="rounded bg-muted/30 p-4 text-xs overflow-x-auto text-foreground">
{`<img src="/api/sig/your_username" alt="Uptime Badge" />

[img]/api/sig/your_username[/img]  <!-- BBCode -->`}
            </pre>
          </div>

          {/* Agent script */}
          <div className="rounded-lg border neon-border bg-card p-6 space-y-4">
            <h2 className="text-lg font-semibold neon-text-green flex items-center gap-2">
              <Server className="h-5 w-5" />
              Agent Script
            </h2>
            <p className="text-sm text-muted-foreground">Python 3 agent script. Requires the <code className="text-foreground bg-muted/50 px-1 rounded">requests</code> library.</p>
            <pre className="rounded bg-muted/30 p-4 text-xs overflow-x-auto whitespace-pre text-foreground">
              {agentScript}
            </pre>
          </div>

          {/* Other endpoints */}
          <div className="rounded-lg border neon-border bg-card p-6 space-y-4">
            <h2 className="text-lg font-semibold neon-text-blue flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Other Endpoints
            </h2>
            <div className="space-y-3 text-sm">
              <div className="rounded bg-muted/30 p-3">
                <p className="text-foreground font-semibold">GET /api/stats</p>
                <p className="text-xs text-muted-foreground mt-1">Returns project stats (users online, total users, hosts, reports, pageviews). No auth required.</p>
              </div>
              <div className="rounded bg-muted/30 p-3">
                <p className="text-foreground font-semibold">GET /api/teams</p>
                <p className="text-xs text-muted-foreground mt-1">Returns your teams plus combined totals and current-state summaries. Requires login.</p>
              </div>
              <div className="rounded bg-muted/30 p-3">
                <p className="text-foreground font-semibold">PATCH /api/teams/[id]</p>
                <p className="text-xs text-muted-foreground mt-1">Updates a team and replaces its host membership set.</p>
              </div>
              <div className="rounded bg-muted/30 p-3">
                <p className="text-foreground font-semibold">GET /api/leaderboard?category=hosts_current&limit=25&page=1</p>
                <p className="text-xs text-muted-foreground mt-1">Returns leaderboard entries. Categories: hosts_current, hosts_record, users_current, users_record, teams_current, teams_record, new_hosts, new_users.</p>
              </div>
              <div className="rounded bg-muted/30 p-3">
                <p className="text-foreground font-semibold">GET /api/sig/[username]</p>
                <p className="text-xs text-muted-foreground mt-1">Returns an SVG signature badge image for the given username.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
