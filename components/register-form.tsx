'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserPlus, Mail, Lock, User, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export function RegisterForm() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== password2) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error ?? 'Registration failed')
        setLoading(false)
        return
      }
      // Auto-login after signup
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })
      if (result?.ok) {
        toast.success('Account created successfully!')
        router.replace('/profile')
      } else {
        toast.success('Account created! Please login.')
        router.replace('/login')
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
          <UserPlus className="h-8 w-8 text-[#00d4ff] mx-auto mb-2" />
          <h1 className="text-xl font-bold neon-text-blue">Create Account</h1>
          <p className="text-xs text-muted-foreground mt-1">Join the competitive uptime tracking community</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="your_username"
                className="w-full rounded-md border border-border bg-background pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00d4ff] focus:border-[#00d4ff]"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded-md border border-border bg-background pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00d4ff] focus:border-[#00d4ff]"
              />
            </div>
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
                minLength={6}
                placeholder="••••••••"
                className="w-full rounded-md border border-border bg-background pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00d4ff] focus:border-[#00d4ff]"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-md border border-border bg-background pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00d4ff] focus:border-[#00d4ff]"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[#00d4ff] text-[#0a0a0f] py-2 text-sm font-semibold hover:bg-[#00d4ff]/80 transition-all disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <p className="text-xs text-center text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-[#00d4ff] hover:underline">Login here</Link>
        </p>
      </div>
    </div>
  )
}
