'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })
      if (result?.ok) {
        toast.success('Logged in successfully!')
        router.replace('/profile')
      } else {
        setError('Check your username/email and password')
      }
    } catch (err: any) {
      setError('Something went wrong')
      console.error(err)
    }
    setLoading(false)
  }

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div className="rounded-lg border neon-border bg-card p-6 space-y-6">
        <div className="text-center">
          <LogIn className="h-8 w-8 text-[#00d4ff] mx-auto mb-2" />
          <h1 className="text-xl font-bold neon-text-blue">Welcome Back</h1>
          <p className="text-xs text-muted-foreground mt-1">Use your username or email address to sign in</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Username or Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="username or email"
                className="w-full rounded-md border border-border bg-background pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00d4ff] focus:border-[#00d4ff]"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground/80">
              Usernames are case-insensitive. Email addresses are lowercased before lookup.
            </p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-md border border-border bg-background pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00d4ff] focus:border-[#00d4ff]"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="remember" className="rounded border-border" />
            <label htmlFor="remember" className="text-xs text-muted-foreground">Remember me for 30 days</label>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[#00d4ff] text-[#0a0a0f] py-2 text-sm font-semibold hover:bg-[#00d4ff]/80 transition-all disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="text-xs text-center text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-[#00d4ff] hover:underline">Register here</Link>
        </p>
      </div>
    </div>
  )
}
