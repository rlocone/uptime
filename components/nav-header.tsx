'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Server, BarChart3, Info, UserPlus, LogIn, User, BookOpen, LogOut, Menu, X, Users } from 'lucide-react'
import { useState } from 'react'

const navLinks = [
  { href: '/', label: 'Home', icon: Server },
  { href: '/leaderboard', label: 'Leaderboard', icon: BarChart3 },
  { href: '/teams', label: 'Teams', icon: Users },
  { href: '/about', label: 'About', icon: Info },
  { href: '/api-docs', label: 'API Docs', icon: BookOpen },
]

export function NavHeader() {
  const pathname = usePathname()
  const { data: session, status } = useSession() || {}
  const [mobileOpen, setMobileOpen] = useState(false)

  const signOutToCurrentOrigin = () => {
    const callbackUrl = typeof window !== 'undefined' ? window.location.origin : '/'
    return signOut({ callbackUrl })
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 group">
          <Server className="h-6 w-6 text-[#00d4ff] group-hover:drop-shadow-[0_0_8px_rgba(0,212,255,0.6)] transition-all" />
          <span className="text-lg font-bold tracking-tight neon-text-blue">Uptime Project</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-all ${
                  active
                    ? 'bg-[#00d4ff]/10 text-[#00d4ff]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            )
          })}
          {status === 'authenticated' ? (
            <>
              <Link href="/profile" className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-all ${pathname === '/profile' ? 'bg-[#00d4ff]/10 text-[#00d4ff]' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
                <User className="h-4 w-4" />
                {session?.user?.name ?? 'Profile'}
              </Link>
              <button onClick={signOutToCurrentOrigin} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-all ${pathname === '/login' ? 'bg-[#00d4ff]/10 text-[#00d4ff]' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
                <LogIn className="h-4 w-4" />
                Login
              </Link>
              <Link href="/register" className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#00d4ff]/10 text-[#00d4ff] text-sm hover:bg-[#00d4ff]/20 transition-all">
                <UserPlus className="h-4 w-4" />
                Register
              </Link>
            </>
          )}
        </nav>

        {/* Mobile menu button */}
        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-muted-foreground hover:text-foreground">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-border/50 bg-background px-4 pb-3 pt-2 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50">
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            )
          })}
          {status === 'authenticated' ? (
            <>
              <Link href="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50">
                <User className="h-4 w-4" />
                Profile
              </Link>
              <button onClick={() => { setMobileOpen(false); signOutToCurrentOrigin() }} className="flex items-center gap-2 px-3 py-2 rounded text-sm text-muted-foreground hover:text-destructive w-full text-left">
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50">
                <LogIn className="h-4 w-4" />
                Login
              </Link>
              <Link href="/register" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded text-sm text-[#00d4ff] hover:bg-[#00d4ff]/10">
                <UserPlus className="h-4 w-4" />
                Register
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  )
}
