'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/auth'
import { clientFetch } from '@/lib/client-api'

interface Props {
  productId: string
}

export default function WishlistButton({ productId }: Props) {
  const { requireAuth } = useAuth()
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  async function doToggle() {
    setLoading(true)
    try {
      if (saved) {
        await clientFetch(`/api/storefront/wishlist/${productId}`, { method: 'DELETE' })
        setSaved(false)
      } else {
        await clientFetch('/api/storefront/wishlist', {
          method: 'POST',
          body: JSON.stringify({ product_id: productId }),
        })
        setSaved(true)
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={() => requireAuth(doToggle)}
      disabled={loading}
      className={`p-2 rounded-xl border transition-colors disabled:opacity-40 ${
        saved
          ? 'border-red-200 bg-red-50 text-red-500'
          : 'border-gray-200 bg-white text-gray-400 hover:border-red-200 hover:text-red-400'
      }`}
      title={saved ? 'Remove from wishlist' : 'Save to wishlist'}
    >
      <svg className="w-5 h-5" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    </button>
  )
}
