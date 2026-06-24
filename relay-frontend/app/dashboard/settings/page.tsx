'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Mail, Key, Bell, Trash2, Shield } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

export default function SettingsPage() {
  const [user, setUser] = useState<{ email: string; id: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser({ email: user.email || '', id: user.id })
      }
      setLoading(false)
    }
    getUser()
  }, [supabase.auth])

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setPasswordLoading(true)

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Password updated successfully')
      setNewPassword('')
      setConfirmPassword('')
    }

    setPasswordLoading(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-semibold text-[#1A2744]">Settings</h1>
        <p className="text-[#2A3A5A]">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-semibold text-[#1A2744]">Settings</h1>
        <p className="text-[#2A3A5A] mt-1">Manage your account settings</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-[#E8DFD0] overflow-hidden">
        <div className="p-6 border-b border-[#F5EBD8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C75C3B] to-[#D4A853] flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-[#1A2744]">Profile</h2>
              <p className="text-sm text-[#2A3A5A]">Your account information</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#2A3A5A] mb-1">Email</label>
            <div className="flex items-center gap-3 p-3 bg-[#F5EBD8] rounded-xl">
              <Mail className="h-4 w-4 text-[#2A3A5A]" />
              <span className="text-[#1A2744]">{user?.email}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#2A3A5A] mb-1">User ID</label>
            <p className="text-sm text-[#2A3A5A] font-mono bg-[#F5EBD8] p-3 rounded-xl break-all">
              {user?.id}
            </p>
          </div>
        </div>
      </div>

      {/* Password Card */}
      <div className="bg-white rounded-2xl border border-[#E8DFD0] overflow-hidden">
        <div className="p-6 border-b border-[#F5EBD8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1A2744] to-[#2A3A5A] flex items-center justify-center">
              <Key className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-[#1A2744]">Change Password</h2>
              <p className="text-sm text-[#2A3A5A]">Update your password</p>
            </div>
          </div>
        </div>
        <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-[#2A3A5A] mb-2">
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 6 characters"
              minLength={6}
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-[#E8DFD0] bg-white text-[#1A2744] placeholder:text-[#2A3A5A]/40 focus:outline-none focus:border-[#C75C3B] transition-colors"
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-[#2A3A5A] mb-2">
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              minLength={6}
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-[#E8DFD0] bg-white text-[#1A2744] placeholder:text-[#2A3A5A]/40 focus:outline-none focus:border-[#C75C3B] transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={passwordLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1A2744] text-white font-medium text-sm hover:bg-[#2A3A5A] transition-all duration-300 disabled:opacity-50"
          >
            {passwordLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Notifications Card */}
      <div className="bg-white rounded-2xl border border-[#E8DFD0] overflow-hidden">
        <div className="p-6 border-b border-[#F5EBD8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8FA382] to-[#6B8A5E] flex items-center justify-center">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-[#1A2744]">Notifications</h2>
              <p className="text-sm text-[#2A3A5A]">Configure how you receive updates</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-3 p-4 bg-[#D4A853]/10 rounded-xl border border-[#D4A853]/20">
            <Shield className="h-5 w-5 text-[#D4A853]" />
            <p className="text-sm text-[#1A2744]">
              Notification preferences coming soon. You&apos;ll be able to configure email notifications for call completions and failures.
            </p>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-2xl border-2 border-red-200 overflow-hidden">
        <div className="p-6 border-b border-red-100 bg-red-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-red-700">Danger Zone</h2>
              <p className="text-sm text-red-600">Irreversible actions</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-[#1A2744]">Delete Account</p>
              <p className="text-sm text-[#2A3A5A]">
                Permanently delete your account and all data
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="px-5 py-2.5 rounded-full bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition-colors">
                  Delete Account
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-white border-[#E8DFD0]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-display">Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription className="text-[#2A3A5A]">
                    This action cannot be undone. This will permanently delete your
                    account and remove all your data including contacts, templates,
                    and call history.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-full border-[#E8DFD0]">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="rounded-full bg-red-600 hover:bg-red-700"
                    onClick={() => toast.error('Account deletion is not yet implemented')}
                  >
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  )
}
