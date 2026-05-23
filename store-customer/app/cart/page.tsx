'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth'
import { useCart } from '@/contexts/cart'
import { clientFetch } from '@/lib/client-api'
import type { Cart } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export default function CartPage() {
  const { isAuthenticated, requireAuth } = useAuth()
  const { refresh: refreshCount } = useCart()
  const router = useRouter()

  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const data = await clientFetch<Cart>('/api/storefront/cart')
      setCart(data)
    } catch {
      setCart(null)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { fetchCart() }, [fetchCart])

  async function updateQty(variantId: string, qty: number) {
    setUpdating(variantId)
    try {
      if (qty === 0) {
        await clientFetch(`/api/storefront/cart/${variantId}`, { method: 'DELETE' })
      } else {
        await clientFetch(`/api/storefront/cart/${variantId}`, {
          method: 'PATCH',
          body: JSON.stringify({ quantity: qty }),
        })
      }
      await fetchCart()
      await refreshCount()
    } catch {
      // silently fail
    } finally {
      setUpdating(null)
    }
  }

  async function clearCart() {
    try {
      await clientFetch('/api/storefront/cart', { method: 'DELETE' })
      setCart({ items: [], total: 0 })
      refreshCount()
    } catch { /* ignore */ }
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 pt-16 text-center">
          <p className="text-4xl mb-3">🛒</p>
          <p className="text-lg font-bold text-gray-900 mb-1">Your cart is empty</p>
          <p className="text-sm text-gray-500 mb-6">Sign in to view your cart</p>
          <button
            onClick={() => requireAuth(() => fetchCart())}
            className="bg-[#25D366] text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-[#1ebe5d] transition-colors"
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

  const items = cart?.items ?? []

  return (
    <main className="min-h-screen bg-gray-50 pb-32">
      <div className="max-w-2xl mx-auto">
        <div className="px-4 pt-6 pb-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Your cart</h1>
            <p className="text-sm text-gray-400">{items.length} item{items.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-3">
            {items.length > 0 && (
              <button onClick={clearCart} className="text-sm text-red-400 hover:text-red-600 transition-colors">
                Clear all
              </button>
            )}
            <Link href="/products" className="text-sm text-[#25D366] font-medium hover:underline">
              + Add more
            </Link>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20 text-gray-400 px-4">
            <p className="text-4xl mb-3">🛒</p>
            <p className="font-medium text-gray-600">Your cart is empty</p>
            <p className="text-sm mt-1">Browse products and add something</p>
            <Link
              href="/products"
              className="mt-5 inline-block bg-[#25D366] text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-[#1ebe5d] transition-colors"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <div className="px-4 space-y-3">
            {items.map(item => (
              <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                <Link href={`/products/${item.product.id}`} className="flex-shrink-0">
                  {item.product.image_url ? (
                    <img
                      src={`${API_URL}${item.product.image_url}`}
                      alt={item.product.name}
                      className="w-16 h-16 rounded-xl object-cover hover:opacity-90 transition-opacity"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-2xl hover:bg-gray-200 transition-colors">
                      🛍️
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/products/${item.product.id}`} className="block">
                    <p className="font-semibold text-gray-900 text-sm truncate hover:text-[#25D366] transition-colors">
                      {item.product.name}
                    </p>
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {item.variant.name}{item.variant.unit ? ` / ${item.variant.unit}` : ''} · ₹{item.variant.selling_price}
                  </p>
                  <p className="text-sm font-bold text-gray-900 mt-1">
                    ₹{item.variant.selling_price * item.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    disabled={updating === item.variant.id}
                    onClick={() => updateQty(item.variant.id, item.quantity - 1)}
                    className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-[#25D366] hover:text-[#25D366] transition-colors disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-semibold text-gray-900">
                    {updating === item.variant.id ? '…' : item.quantity}
                  </span>
                  <button
                    disabled={updating === item.variant.id}
                    onClick={() => updateQty(item.variant.id, item.quantity + 1)}
                    className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-[#25D366] hover:text-[#25D366] transition-colors disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg px-4 py-3 z-40">
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            <div className="flex-1">
              <p className="text-xs text-gray-400">Total</p>
              <p className="text-lg font-bold text-gray-900">₹{cart?.total ?? 0}</p>
            </div>
            <button
              onClick={() => router.push('/checkout')}
              className="flex-[2] bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold py-3 rounded-xl text-sm transition-colors"
            >
              Proceed to checkout →
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
