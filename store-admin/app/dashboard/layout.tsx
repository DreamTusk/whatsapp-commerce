'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Edit, Menu, X } from '@deemlol/next-icons'
import { Store } from 'lucide-react'
import api from '@/lib/api'
import { auth } from '@/lib/auth'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { NAV_ITEMS } from '@/config/nav'
import { RoleProvider } from '@/contexts/role'
import type { Store as StoreType } from '@/types'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()

  const [store, setStore]               = useState<StoreType | null>(null)
  const [storeLoading, setStoreLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen]   = useState(false)
  const [logoutOpen, setLogoutOpen]     = useState(false)
  const [user, setUser] = useState<import('@/types').User | null>(null)
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    setUser(auth.getUser())
    const cachedRole = auth.getRole()
    if (cachedRole) {
      setRole(cachedRole)
    } else {
      // Fallback for sessions created before role cookie was introduced
      api.get('/api/auth/me')
        .then(res => {
          if (res.data.role) {
            auth.setRole(res.data.role)
            setRole(res.data.role)
          }
        })
        .catch(() => {})
    }
  }, [])

  // Redirect STAFF away from OWNER-only pages
  useEffect(() => {
    if (!role) return
    const staffRestricted = ['/dashboard', '/dashboard/settings']
    if (role === 'STAFF' && staffRestricted.includes(pathname)) {
      router.replace('/dashboard/orders')
    }
  }, [role, pathname, router])

  useEffect(() => {
    if (!auth.isVerified()) {
      router.push('/verify-email')
      return
    }
    api.get('/api/store')
      .then(res => setStore(res.data.store))
      .catch(err => {
        if (err.response?.status === 404) router.push('/create-store')
      })
      .finally(() => setStoreLoading(false))
  }, [router])

  const visibleNav = NAV_ITEMS.filter(item =>
    item.roles.length === 0 || (role && item.roles.includes(role))
  )

  function handleLogoutConfirmed() {
    const refreshToken = auth.getRefreshToken()
    if (refreshToken) {
      api.post('/api/auth/logout', { refresh_token: refreshToken }).catch(() => {})
    }
    auth.clear()
    router.push('/login')
  }

  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Store identity */}
      <div className="px-4 py-4 border-b border-gray-100">
        {storeLoading ? (
          <div className="flex items-center gap-3 animate-pulse">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-gray-100 rounded w-3/4" />
              <div className="h-2.5 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        ) : store ? (
          <div className="flex items-center gap-3">
            {store.logo ? (
              <img src={store.logo} alt={store.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 bg-[#6366f1]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Store className="w-5 h-5 text-[#6366f1]" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-base truncate">{store.name}</p>
              <p className="text-sm text-gray-400 truncate">{store.phone}</p>
            </div>
            {role === 'OWNER' && (
              <Link
                href="/dashboard/settings"
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
              >
                <Edit className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        ) : null}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {visibleNav.map(({ label, href, icon: Icon }) => {
          const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium transition-colors ${
                active
                  ? 'bg-[#6366f1]/10 text-[#6366f1]'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User + logout */}
      <div className="px-4 py-4 border-t border-gray-100">
        {user && (
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-gray-600">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-sm text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setLogoutOpen(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-base text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-white border-r border-gray-100 flex-shrink-0">
        {sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl z-50">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-50 cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          {store?.logo ? (
            <img src={store.logo} alt={store.name} className="w-7 h-7 rounded-lg object-cover" />
          ) : (
            <div className="w-7 h-7 bg-[#6366f1]/10 rounded-lg flex items-center justify-center">
              <Store className="w-4 h-4 text-[#6366f1]" />
            </div>
          )}
          <span className="font-semibold text-gray-900 text-sm truncate">{store?.name ?? ''}</span>
        </header>

        <main className="flex-1 overflow-auto">
          <RoleProvider role={role as 'OWNER' | 'STAFF' | null}>
            {children}
          </RoleProvider>
        </main>
      </div>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be signed out of your account and redirected to the login page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#6366f1] hover:bg-[#4f46e5] text-white"
              onClick={handleLogoutConfirmed}
            >
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
