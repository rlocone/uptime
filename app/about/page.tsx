import { NavHeader } from '@/components/nav-header'
import { SiteFooter } from '@/components/site-footer'
import { Info, Newspaper, Target, Shield, Zap, Globe } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-[1200px] px-4 py-6">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3 mb-6">
            <Info className="h-6 w-6 text-[#00d4ff]" />
            <span className="neon-text-blue">About</span>
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            {/* Main content */}
            <div className="space-y-6">
              <div className="rounded-lg border neon-border bg-card p-6 space-y-4">
                <h2 className="text-lg font-semibold neon-text-blue flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  What is Uptime Project?
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Uptime Project is a competitive uptime tracking platform where system administrators
                  and server enthusiasts can monitor and compare their server uptimes. Install our
                  lightweight agent on your machines, and watch your uptime climb the global leaderboards.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Whether you are running a homelab, managing production servers, or just curious about
                  your machine's reliability, Uptime Project gives you a fun way to track and compete.
                </p>
              </div>

              <div className="rounded-lg border neon-border bg-card p-6 space-y-4">
                <h2 className="text-lg font-semibold neon-text-green flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  How It Works
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-lg bg-muted/30 p-4 space-y-2">
                    <div className="text-2xl font-bold neon-text-blue">1</div>
                    <h3 className="text-sm font-semibold text-foreground">Register</h3>
                    <p className="text-xs text-muted-foreground">Create your account and get a unique API key.</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-4 space-y-2">
                    <div className="text-2xl font-bold neon-text-blue">2</div>
                    <h3 className="text-sm font-semibold text-foreground">Install Agent</h3>
                    <p className="text-xs text-muted-foreground">Run the Python agent script on each host you want to track.</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-4 space-y-2">
                    <div className="text-2xl font-bold neon-text-blue">3</div>
                    <h3 className="text-sm font-semibold text-foreground">Compete</h3>
                    <p className="text-xs text-muted-foreground">Your uptime is tracked and ranked against all other participants.</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border neon-border bg-card p-6 space-y-4">
                <h2 className="text-lg font-semibold neon-text-blue flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Features
                </h2>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2"><span className="text-[#39ff14]">✓</span> Real-time uptime monitoring for unlimited hosts</li>
                  <li className="flex items-start gap-2"><span className="text-[#39ff14]">✓</span> Six leaderboard categories (current, record, new)</li>
                  <li className="flex items-start gap-2"><span className="text-[#39ff14]">✓</span> Signature badge images for forums and profiles</li>
                  <li className="flex items-start gap-2"><span className="text-[#39ff14]">✓</span> Simple REST API with per-user API keys</li>
                  <li className="flex items-start gap-2"><span className="text-[#39ff14]">✓</span> Lightweight Python agent script</li>
                  <li className="flex items-start gap-2"><span className="text-[#39ff14]">✓</span> Live project statistics and pageview counter</li>
                </ul>
              </div>
            </div>

            {/* Sidebar news */}
            <div className="space-y-4">
              <div className="rounded-lg border neon-border bg-card p-4 space-y-3">
                <h3 className="text-sm font-semibold neon-text-green flex items-center gap-2">
                  <Newspaper className="h-4 w-4" />
                  News
                </h3>
                <div className="space-y-3">
                  <div className="border-b border-border/50 pb-3">
                    <p className="text-xs text-muted-foreground">Jul 2026</p>
                    <p className="text-sm text-foreground">Platform launched with full leaderboard support</p>
                  </div>
                  <div className="border-b border-border/50 pb-3">
                    <p className="text-xs text-muted-foreground">Jul 2026</p>
                    <p className="text-sm text-foreground">Signature badge images now available</p>
                  </div>
                  <div className="pb-1">
                    <p className="text-xs text-muted-foreground">Jul 2026</p>
                    <p className="text-sm text-foreground">API docs and agent script released</p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border neon-border bg-card p-4 space-y-2">
                <h3 className="text-sm font-semibold neon-text-blue flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Open Source
                </h3>
                <p className="text-xs text-muted-foreground">
                  The agent script is open and can be customized for your needs. Check the API Docs for details.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
