'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/auth'
import { useCart } from '@/contexts/cart'
import { theme } from '@/lib/theme'
import { Heart } from "@deemlol/next-icons"
import { Package } from "@deemlol/next-icons"
import { ShoppingCart } from "@deemlol/next-icons"

export default function HeaderActions() {
  const { isAuthenticated, customer, requireAuth } = useAuth()
  const { count } = useCart()

  const iconStyle = { color: theme.headerText }

  return (
    <div className="flex items-center gap-0.5">
      {/* Cart */}
      <Link href="/cart" className="relative p-2 rounded-lg hover:bg-white/10 transition-colors" aria-label="Cart">
        <ShoppingCart className="w-5 h-5" style={iconStyle} />
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
            <Package className="w-5 h-5" style={iconStyle} />
          </Link>

          {/* Wishlist */}
          <Link href="/wishlist" className="p-2 rounded-lg hover:bg-white/10 transition-colors" aria-label="Wishlist">
            <Heart className="w-5 h-5" style={iconStyle} />
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
