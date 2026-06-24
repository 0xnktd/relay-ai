'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
    LayoutDashboard,
    Users,
    FileText,
    Phone,
    Settings,
    LogOut
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/contacts', label: 'Contacts', icon: Users },
    { href: '/dashboard/templates', label: 'Templates', icon: FileText },
    { href: '/dashboard/calls', label: 'Calls', icon: Phone },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <aside className="w-72 bg-[#1A2744] h-screen flex flex-col relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute -top-20 -left-20 w-40 h-40 rounded-full bg-[#C75C3B] opacity-10" />
            <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-[#D4A853] opacity-10" />

            {/* Logo */}
            <div className="p-6 border-b border-white/10 relative z-10">
                <Link href="/dashboard" className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#C75C3B] rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-white font-display font-bold text-lg">R</span>
                    </div>
                    <span className="font-display text-xl font-semibold text-[#FDF6E9]">
                        RelayAI
                    </span>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 relative z-10">
                {navItems.map((item) => {
                    const isActive = pathname === item.href ||
                        (item.href !== '/dashboard' && pathname.startsWith(item.href))

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                                isActive
                                    ? 'bg-[#C75C3B] text-white shadow-lg shadow-[#C75C3B]/20'
                                    : 'text-[#FDF6E9]/70 hover:bg-white/5 hover:text-[#FDF6E9]'
                            )}
                        >
                            <item.icon className={cn(
                                'h-5 w-5 transition-transform',
                                isActive && 'scale-110'
                            )} />
                            {item.label}
                            {isActive && (
                                <div className="ml-auto w-2 h-2 rounded-full bg-white/80" />
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* User section */}
            <div className="p-4 border-t border-white/10 relative z-10">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#FDF6E9]/70 hover:bg-white/5 hover:text-[#FDF6E9] transition-all duration-200"
                >
                    <LogOut className="h-5 w-5" />
                    Sign out
                </button>
            </div>
        </aside>
    )
}
