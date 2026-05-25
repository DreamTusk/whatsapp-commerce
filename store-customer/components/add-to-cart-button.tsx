'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth'
import { useCart } from '@/contexts/cart'
import { clientFetch } from '@/lib/client-api'

interface Props {
  productId: string
  price: number
}

export default function AddToCartButton({ productId, price }: Props) {
  const { requireAuth } = useAuth()
  const { refresh } = useCart()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState(false)

  async function doAdd() {
    setLoading(true)
    try {
      await clientFetch('/api/storefront/cart', {
        method: 'POST',
        body: JSON.stringify({ product_id: productId }),
      })
      await refresh()
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    } catch { /* silently fail */ } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex items-center gap-2">
      <div className="flex-1">
        <p className="text-xs text-gray-400">Price</p>
        <p className="font-bold text-gray-900">₹{price}</p>
      </div>
      {added ? (
        <button
          onClick={() => router.push('/cart')}
          className="flex-[2] bg-green-500 text-white font-semibold py-3 rounded-xl text-sm"
        >
          Added ✓ View cart
        </button>
      ) : (
        <button
          onClick={() => requireAuth(doAdd)}
          disabled={loading}
          className="flex-[2] bg-[#25D366] hover:bg-[#1ebe5d] active:bg-[#17a84f] disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
        >
          {loading ? 'Adding…' : 'Add to cart'}
        </button>
      )}
    </div>
  )
}
