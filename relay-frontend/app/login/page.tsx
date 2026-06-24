'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#FDF6E9] flex">
      {/* Left side - decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1A2744] relative overflow-hidden items-center justify-center">
        {/* Decorative elements */}
        <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-[#C75C3B] opacity-20 blur-3xl" />
        <div className="absolute bottom-20 right-20 w-80 h-80 rounded-full bg-[#D4A853] opacity-15 blur-3xl" />

        {/* Rotary dial visual */}
        <div className="relative z-10">
          <div className="w-72 h-72 rounded-full border-4 border-[#FDF6E9]/20 flex items-center justify-center">
            <div className="w-56 h-56 rounded-full bg-gradient-to-br from-[#C75C3B] to-[#A34830] flex items-center justify-center shadow-2xl">
              <div className="w-24 h-24 rounded-full bg-[#FDF6E9] flex items-center justify-center">
                <svg className="w-10 h-10 text-[#C75C3B]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
            </div>
          </div>
          {/* Dial dots */}
          {[...Array(12)].map((_, i) => {
            const angle = (i * 30 - 90) * (Math.PI / 180)
            const x = Math.cos(angle) * 160
            const y = Math.sin(angle) * 160
            return (
              <div
                key={i}
                className="absolute w-3 h-3 rounded-full bg-[#FDF6E9]/30"
                style={{
                  left: `calc(50% + ${x}px - 6px)`,
                  top: `calc(50% + ${y}px - 6px)`,
                }}
              />
            )
          })}
        </div>

        {/* Bottom text */}
        <div className="absolute bottom-12 left-12 right-12 text-center">
          <p className="text-[#FDF6E9]/60 text-sm">
            AI-powered phone calls for your business
          </p>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-[#C75C3B] rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-display font-bold text-xl">R</span>
            </div>
            <span className="font-display text-2xl font-semibold text-[#1A2744]">
              RelayAI
            </span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl font-semibold text-[#1A2744] mb-2">
              Welcome back
            </h1>
            <p className="text-[#2A3A5A]">
              Sign in to continue to your dashboard
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-[#1A2744]">
                Email address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3.5 rounded-xl border-2 border-[#E8DFD0] bg-white text-[#1A2744] placeholder:text-[#2A3A5A]/40 focus:outline-none focus:border-[#C75C3B] transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-[#1A2744]">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3.5 rounded-xl border-2 border-[#E8DFD0] bg-white text-[#1A2744] placeholder:text-[#2A3A5A]/40 focus:outline-none focus:border-[#C75C3B] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-full bg-[#C75C3B] text-white font-semibold text-sm hover:bg-[#A34830] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#C75C3B]/20 hover:shadow-xl hover:shadow-[#C75C3B]/30 hover:-translate-y-0.5"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-8 text-center text-sm text-[#2A3A5A]">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-[#C75C3B] font-semibold hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
