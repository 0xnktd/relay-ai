'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#FDF6E9] flex items-center justify-center p-8">
        <div className="w-full max-w-md text-center">
          {/* Success icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#8FA382]/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-[#8FA382]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="font-display text-3xl font-semibold text-[#1A2744] mb-3">
            Check your email
          </h1>
          <p className="text-[#2A3A5A] mb-8">
            We&apos;ve sent a confirmation link to<br />
            <span className="font-semibold text-[#1A2744]">{email}</span>
          </p>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-[#1A2744] text-[#1A2744] font-semibold text-sm hover:bg-[#1A2744] hover:text-white transition-all duration-300"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDF6E9] flex">
      {/* Left side - decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1A2744] relative overflow-hidden items-center justify-center">
        {/* Decorative elements */}
        <div className="absolute top-20 right-20 w-64 h-64 rounded-full bg-[#D4A853] opacity-20 blur-3xl" />
        <div className="absolute bottom-20 left-20 w-80 h-80 rounded-full bg-[#C75C3B] opacity-15 blur-3xl" />

        {/* Feature highlights */}
        <div className="relative z-10 max-w-sm px-8">
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C75C3B] to-[#D4A853] flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-display font-semibold text-[#FDF6E9] mb-1">Smart Scheduling</h3>
                <p className="text-[#FDF6E9]/60 text-sm">Schedule calls at optimal times</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C75C3B] to-[#D4A853] flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-display font-semibold text-[#FDF6E9] mb-1">AI Conversations</h3>
                <p className="text-[#FDF6E9]/60 text-sm">Natural voice interactions</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C75C3B] to-[#D4A853] flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-display font-semibold text-[#FDF6E9] mb-1">Rich Analytics</h3>
                <p className="text-[#FDF6E9]/60 text-sm">Detailed call insights</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom text */}
        <div className="absolute bottom-12 left-12 right-12 text-center">
          <p className="text-[#FDF6E9]/60 text-sm">
            Trusted by 500+ businesses worldwide
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
              Create your account
            </h1>
            <p className="text-[#2A3A5A]">
              Start automating your follow-up calls today
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignup} className="space-y-6">
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
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                className="w-full px-4 py-3.5 rounded-xl border-2 border-[#E8DFD0] bg-white text-[#1A2744] placeholder:text-[#2A3A5A]/40 focus:outline-none focus:border-[#C75C3B] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-full bg-[#C75C3B] text-white font-semibold text-sm hover:bg-[#A34830] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#C75C3B]/20 hover:shadow-xl hover:shadow-[#C75C3B]/30 hover:-translate-y-0.5"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>

            <p className="text-xs text-center text-[#2A3A5A]/60">
              By signing up, you agree to our Terms of Service and Privacy Policy
            </p>
          </form>

          {/* Footer */}
          <p className="mt-8 text-center text-sm text-[#2A3A5A]">
            Already have an account?{' '}
            <Link href="/login" className="text-[#C75C3B] font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
