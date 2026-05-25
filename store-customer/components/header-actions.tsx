'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/auth'
import { useCart } from '@/contexts/cart'
import { theme } from '@/lib/theme'

export default function HeaderActions() {
  const { isAuthenticated, customer, requireAuth } = useAuth()
  const { count } = useCart()

  const iconStyle = { color: theme.headerText }

  return (
    <div className="flex items-center gap-0.5">
      {/* Cart */}
      <Link href="/cart" className="relative p-2 rounded-lg hover:bg-white/10 transition-colors" aria-label="Cart">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={iconStyle}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4m1.6 8L5 5H3m4 8a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-yellow-400 text-gray-900 text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </Link>

      {isAuthenticated ? (
        <>
          {/* Orders */}
          <Link href="/orders" className="p-2 rounded-lg hover:bg-white/10 transition-colors" aria-label="My orders">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={iconStyle}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z" />
            </svg>
          </Link>

          {/* Wishlist */}
          <Link href="/wishlist" className="p-2 rounded-lg hover:bg-white/10 transition-colors" aria-label="Wishlist">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={iconStyle}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </Link>
        </>
      ) : (
        <button
          onClick={() => requireAuth(() => {})}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/30 hover:bg-white/10 transition-colors ml-1"
          style={iconStyle}
        >
          Sign in
        </button>
      )}
    </div>
  )
}
