import { Server } from 'lucide-react'
import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer className="border-t border-border/50 bg-background/50 mt-auto">
      <div className="mx-auto max-w-[1200px] px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-[#00d4ff]" />
          <span>&copy; 2026 Uptime Project. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
          <Link href="/api-docs" className="hover:text-foreground transition-colors">API Docs</Link>
          <Link href="/leaderboard" className="hover:text-foreground transition-colors">Leaderboard</Link>
        </div>
      </div>
    </footer>
  )
}
