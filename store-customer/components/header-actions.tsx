'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/auth'
import { useCart } from '@/contexts/cart'

export default function HeaderActions() {
  const { isAuthenticated, customer, logout } = useAuth()
  const { count } = useCart()

  return (
    <div className="flex items-center gap-2">
      {/* Cart */}
      <Link href="/cart" className="relative p-2 rounded-xl hover:bg-gray-50 transition-colors">
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4m1.6 8L5 5H3m4 8a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#25D366] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </Link>

      {/* Account */}
      {isAuthenticated ? (
        <div className="flex items-center gap-1.5">
          <Link href="/wishlist" className="p-2 rounded-xl hover:bg-gray-50 transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </Link>
          <button
            onClick={logout}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-1"
            title={`Signed in as ${customer?.phone}`}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  )
}
