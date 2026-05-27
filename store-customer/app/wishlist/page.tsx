'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth'
import { clientFetch } from '@/lib/client-api'
import PageHeader from '@/components/page-header'
import type { WishlistItem } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export default function WishlistPage() {
  const { isAuthenticated, requireAuth } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)

  const fetchWishlist = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const data = await clientFetch<{ items: WishlistItem[] }>('/api/storefront/wishlist')
      setItems(data.items)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { fetchWishlist() }, [fetchWishlist])

  async function removeFromWishlist(productId: string) {
    setRemoving(productId)
    try {
      await clientFetch(`/api/storefront/wishlist/${productId}`, { method: 'DELETE' })
      setItems(prev => prev.filter(i => i.product.id !== productId))
    } catch { /* ignore */ } finally {
      setRemoving(null)
    }
  }


  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl mb-3">♡</p>
          <p className="font-bold text-gray-900 mb-1">Sign in to view your wishlist</p>
          <button
            onClick={() => requireAuth(() => fetchWishlist())}
            className="mt-4 bg-[#25D366] text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-[#1ebe5d] transition-colors"
          >
            Sign in
          </button>
        </div>
      </main>
    )
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#25D366] border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      <PageHeader
        title={`Wishlist${items.length > 0 ? ` (${items.length})` : ''}`}
        backHref="/products"
        actions={
          <Link href="/products" className="text-xs font-semibold px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors" style={{ color: 'var(--primary)' }}>
            + Add
          </Link>
        }
      />
      <div className="page-x pt-4">

        {items.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">♡</p>
            <p className="font-medium text-gray-600">Your wishlist is empty</p>
            <p className="text-sm mt-1">Save products you love</p>
            <Link
              href="/products"
              className="mt-5 inline-block bg-[#25D366] text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-[#1ebe5d] transition-colors"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                {item.product.image_url ? (
                  <img
                    src={item.product.image_url.startsWith('http') ? item.product.image_url : `${API_URL}${item.product.image_url}`}
                    alt={item.product.name}
                    className="w-16 h-16 rounded-xl object-cover shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 text-2xl">
                    🛍️
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{item.product.name}</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">₹{item.product.selling_price}</p>
                  {!item.product.in_stock && (
                    <span className="text-xs text-red-500 mt-0.5 block">Out of stock</span>
                  )}
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => router.push(`/products/${item.product.id}`)}
                    className="text-xs font-semibold px-3 py-1.5 bg-[#25D366] text-white rounded-lg hover:bg-[#1ebe5d] transition-colors"
                  >
                    View
                  </button>
                  <button
                    disabled={removing === item.product.id}
                    onClick={() => removeFromWishlist(item.product.id)}
                    className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-40 transition-colors"
                  >
                    {removing === item.product.id ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
