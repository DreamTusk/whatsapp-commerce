'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCart } from '@/contexts/cart'
import { useAuth } from '@/contexts/auth'
import { useCartDrawer } from '@/contexts/cart-drawer'
import { Package } from "@deemlol/next-icons"
import { ShoppingCart } from "@deemlol/next-icons"
import { House } from "@deemlol/next-icons"
import { AlignJustify } from "@deemlol/next-icons"
import { User } from "@deemlol/next-icons"

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Home',
    exact: true,
    icon: (
      // <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      //   <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      // </svg>
      <House/>
    ),
  },
  {
    href: '/products',
    label: 'Products',
    exact: false,
    icon: (
      // <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      //   <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      // </svg>
      <AlignJustify/>
    ),
  },
  {
    href: '/cart',
    label: 'Cart',
    exact: true,
    isCart: true,
    icon: (
      // <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      //   <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4m1.6 8L5 5H3m4 8a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4z" />
      // </svg>
      <ShoppingCart/>
    ),
  },
  {
    href: '/account',
    navigateTo: '/account?tab=orders',
    label: 'Orders',
    exact: false,
    requiresAuth: true,
    icon: (
      // <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      //   <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      // </svg>
      <Package/>
    ),
  },
  {
    href: '/account',
    label: 'Account',
    exact: false,
    requiresAuth: true,
    icon: (
      // <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      //   <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      // </svg>
      <User/>
    ),
  },
]

const HIDE_ON = ['/checkout']

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { count } = useCart()
  const { isAuthenticated, requireAuth } = useAuth()
  const { openCart } = useCartDrawer()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const hide = HIDE_ON.includes(pathname) || /^\/products\/[^/]+$/.test(pathname)
  if (hide) return null

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
      <div className="max-w-screen-lg mx-auto grid grid-cols-5 h-16">
        {NAV_ITEMS.map(item => {
          const active = mounted && (item.exact ? pathname === item.href : pathname.startsWith(item.href))

          const dest = (item as { navigateTo?: string }).navigateTo ?? item.href

          if (item.requiresAuth && !isAuthenticated) {
            return (
              <button
                key={item.label}
                onClick={() => requireAuth(() => router.push(dest))}
                className="flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span>{item.icon}</span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            )
          }

          if (item.isCart) {
            return (
              <button
                key={item.label}
                onClick={openCart}
                className={`flex flex-col items-center justify-center gap-1 transition-colors ${active ? 'text-indigo-500' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <span className="relative inline-block">
                  {item.icon}
                  {count > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-indigo-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            )
          }

          return (
            <Link
              key={item.label}
              href={dest}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${active ? 'text-indigo-500' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <span className="relative inline-block">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
