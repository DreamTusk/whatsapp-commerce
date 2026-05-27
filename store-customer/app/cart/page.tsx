'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth'
import { useCart } from '@/contexts/cart'
import { clientFetch } from '@/lib/client-api'
import PageHeader from '@/components/page-header'
import { getGuestCart, updateGuestQty, clearGuestCart, type GuestCartItem } from '@/lib/guest-cart'
import type { Cart } from '@/types'

export default function CartPage() {
  const { isAuthenticated, requireAuth, initialized } = useAuth()
  const { refresh: refreshCount, syncGuestCart } = useCart()
  const router = useRouter()

  // Guest cart
  const [guestItems, setGuestItems] = useState<GuestCartItem[]>([])

  // Authenticated cart
  const [cart, setCart] = useState<Cart | null>(null)
  const [dbLoading, setDbLoading] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)

  // Load from localStorage right after mount (client-only — avoids SSR mismatch)
  useEffect(() => {
    setGuestItems(getGuestCart())
  }, [])

  // When auth state resolves to authenticated, fetch DB cart
  useEffect(() => {
    if (!isAuthenticated) return
    setDbLoading(true)
    clientFetch<Cart>('/api/storefront/cart')
      .then(data => setCart(data))
      .catch(() => setCart(null))
      .finally(() => setDbLoading(false))
  }, [isAuthenticated])

  // ── Guest cart actions ─────────────────────────────────────────────────────
  function guestUpdateQty(productId: string, qty: number) {
    updateGuestQty(productId, qty)
    setGuestItems(getGuestCart())
    refreshCount()
  }

  function guestClear() {
    clearGuestCart()
    setGuestItems([])
    refreshCount()
  }

  const guestTotal = guestItems.reduce((sum, i) => sum + i.selling_price * i.quantity, 0)

  // ── Authenticated cart actions ─────────────────────────────────────────────
  async function fetchCart() {
    const data = await clientFetch<Cart>('/api/storefront/cart').catch(() => null)
    setCart(data)
    refreshCount()
  }

  async function updateQty(productId: string, qty: number) {
    setUpdating(productId)
    try {
      if (qty === 0) {
        await clientFetch(`/api/storefront/cart/${productId}`, { method: 'DELETE' })
      } else {
        await clientFetch(`/api/storefront/cart/${productId}`, {
          method: 'PATCH',
          body: JSON.stringify({ quantity: qty }),
        })
      }
      await fetchCart()
    } catch { /* silent */ } finally { setUpdating(null) }
  }

  async function clearCart() {
    await clientFetch('/api/storefront/cart', { method: 'DELETE' }).catch(() => {})
    setCart({ items: [], total: 0 })
    refreshCount()
  }

  // ── Checkout ────────────────────────────────────────────────────────────────
  function handleCheckout() {
    if (!isAuthenticated) {
      requireAuth(async () => {
        await syncGuestCart()
        router.push('/checkout')
      })
    } else {
      router.push('/checkout')
    }
  }

  // Wait for auth to initialize before deciding which view to show
  if (!initialized) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  // ── Guest cart view ────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    const totalQty = guestItems.reduce((s, i) => s + i.quantity, 0)

    const cartActions = (
      <div className="flex items-center gap-1">
        {guestItems.length > 0 && (
          <button onClick={guestClear} className="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50">
            Clear all
          </button>
        )}
        <Link href="/products" className="text-xs font-semibold px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors text-indigo-500">
          + Add
        </Link>
      </div>
    )

    return (
      <main className="min-h-screen pb-32" style={{ backgroundColor: '#F8F9FA' }}>
        <PageHeader
          title={totalQty > 0 ? `Cart (${totalQty})` : 'Cart'}
          backHref="/products"
          actions={cartActions}
        />

        {guestItems.length === 0 ? (
          <div className="text-center py-20 page-x text-gray-400">
            <p className="text-4xl mb-3">🛒</p>
            <p className="font-medium text-gray-600">Your cart is empty</p>
            <p className="text-sm mt-1">Browse products and add something</p>
            <Link href="/products" className="mt-5 inline-block bg-indigo-500 text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-indigo-600 transition-colors">
              Browse products
            </Link>
          </div>
        ) : (
          <div className="page-x py-4 space-y-3">
            {guestItems.map(item => (
              <div key={item.product_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
                  {item.image_url
                    ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    : <span className="text-2xl">🛍️</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">₹{item.selling_price}</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">₹{item.selling_price * item.quantity}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => guestUpdateQty(item.product_id, item.quantity - 1)}
                    className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-indigo-400 hover:text-indigo-500 transition-colors">−</button>
                  <span className="w-6 text-center text-sm font-semibold text-gray-900">{item.quantity}</span>
                  <button onClick={() => guestUpdateQty(item.product_id, item.quantity + 1)}
                    className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-indigo-400 hover:text-indigo-500 transition-colors">+</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {guestItems.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg px-4 py-3 z-40">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-400">Sign in to place your order</p>
                <p className="text-lg font-bold text-gray-900">₹{guestTotal}</p>
              </div>
              <button onClick={handleCheckout}
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors">
                Sign in &amp; checkout →
              </button>
            </div>
          </div>
        )}
      </main>
    )
  }

  // ── Authenticated cart view ────────────────────────────────────────────────
  if (dbLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  const items = cart?.items ?? []
  const totalQty = items.reduce((s, i) => s + i.quantity, 0)

  const cartActions = (
    <div className="flex items-center gap-1">
      {items.length > 0 && (
        <button onClick={clearCart} className="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50">
          Clear all
        </button>
      )}
      <Link href="/products" className="text-xs font-semibold px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors text-indigo-500">
        + Add
      </Link>
    </div>
  )

  return (
    <main className="min-h-screen pb-32" style={{ backgroundColor: '#F8F9FA' }}>
      <PageHeader
        title={totalQty > 0 ? `Cart (${totalQty})` : 'Cart'}
        backHref="/products"
        actions={cartActions}
      />

      {items.length === 0 ? (
        <div className="text-center py-20 page-x text-gray-400">
          <p className="text-4xl mb-3">🛒</p>
          <p className="font-medium text-gray-600">Your cart is empty</p>
          <p className="text-sm mt-1">Browse products and add something</p>
          <Link href="/products" className="mt-5 inline-block bg-indigo-500 text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-indigo-600 transition-colors">
            Browse products
          </Link>
        </div>
      ) : (
        <div className="page-x py-4 space-y-3">
          {items.map(item => (
            <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
              <Link href={`/products/${item.product.id}`} className="flex-shrink-0">
                {item.product.image_url ? (
                  <img src={item.product.image_url} alt={item.product.name}
                    className="w-16 h-16 rounded-xl object-cover hover:opacity-90 transition-opacity" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">🛍️</div>
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/products/${item.product.id}`}>
                  <p className="font-semibold text-gray-900 text-sm truncate hover:text-indigo-500 transition-colors">{item.product.name}</p>
                </Link>
                <p className="text-xs text-gray-400 mt-0.5">₹{item.product.selling_price}</p>
                <p className="text-sm font-bold text-gray-900 mt-1">₹{item.product.selling_price * item.quantity}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button disabled={updating === item.product.id}
                  onClick={() => updateQty(item.product.id, item.quantity - 1)}
                  className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-indigo-400 hover:text-indigo-500 transition-colors disabled:opacity-40">−</button>
                <span className="w-6 text-center text-sm font-semibold text-gray-900">
                  {updating === item.product.id ? '…' : item.quantity}
                </span>
                <button disabled={updating === item.product.id}
                  onClick={() => updateQty(item.product.id, item.quantity + 1)}
                  className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-indigo-400 hover:text-indigo-500 transition-colors disabled:opacity-40">+</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg px-4 py-3 z-40">
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            <div className="flex-1">
              <p className="text-xs text-gray-400">Total</p>
              <p className="text-lg font-bold text-gray-900">₹{cart?.total ?? 0}</p>
            </div>
            <button onClick={handleCheckout}
              className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors">
              Proceed to checkout →
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
