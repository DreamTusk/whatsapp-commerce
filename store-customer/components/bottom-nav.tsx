'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCart } from '@/contexts/cart'
import { useAuth } from '@/contexts/auth'
import { theme } from '@/lib/theme'

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Home',
    exact: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/products',
    label: 'Products',
    exact: false,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
  {
    href: '/cart',
    label: 'Cart',
    exact: true,
    isCart: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4m1.6 8L5 5H3m4 8a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4z" />
      </svg>
    ),
  },
  {
    href: '/orders',
    label: 'Orders',
    exact: false,
    requiresAuth: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z" />
      </svg>
    ),
  },
  {
    href: '/wishlist',
    label: 'Wishlist',
    exact: true,
    requiresAuth: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
]

const HIDE_ON = ['/checkout']

export default function BottomNav() {
  const pathname = usePathname()
  const { count } = useCart()
  const { isAuthenticated, requireAuth } = useAuth()

  const hide = HIDE_ON.includes(pathname) || /^\/products\/[^/]+$/.test(pathname)
  if (hide) return null

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
      <div className="max-w-screen-lg mx-auto grid grid-cols-5 h-16">
        {NAV_ITEMS.map(item => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)

          if (item.requiresAuth && !isAuthenticated) {
            return (
              <button
                key={item.href}
                onClick={() => requireAuth(() => {})}
                className="flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span>{item.icon}</span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 transition-colors"
              style={{ color: active ? theme.primary : undefined }}
            >
              <span className={active ? '' : 'text-gray-400'}>
                <span className="relative inline-block">
                  {item.icon}
                  {item.isCart && count > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5"
                      style={{ backgroundColor: theme.primary }}
                    >
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </span>
              </span>
              <span
                className="text-[10px] font-medium"
                style={{ color: active ? theme.primary : undefined }}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
