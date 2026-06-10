'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth'
import { useCart } from '@/contexts/cart'
import { useWishlist } from '@/contexts/wishlist'
import { clientFetch } from '@/lib/client-api'
import { addToGuestCart, updateGuestQty } from '@/lib/guest-cart'
import type { Product } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export type ProductCardSource =
  | { type: 'all' }
  | { type: 'category'; id: string; name: string }
  | { type: 'products' }

interface Props {
  product: Product
  scrollable?: boolean
  source?: ProductCardSource
  width?: number
  height?: number
}

export default function ProductCard({ product: p, scrollable = true, source, width, height }: Props) {
  const productHref = source
    ? source.type === 'all'
      ? `/products/${p.id}?from=all`
      : source.type === 'category'
      ? `/products/${p.id}?catId=${source.id}&catName=${encodeURIComponent(source.name)}`
      : `/products/${p.id}?from=products`
    : `/products/${p.id}`
  const { isAuthenticated, requireAuth } = useAuth()
  const { refresh, items: cartItems } = useCart()
  const { has: isWishlisted, toggle: toggleWishlist } = useWishlist()
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState(false)
  const cartQty = cartItems[p.id] ?? 0

  const hasDiscount = p.original_price != null && p.original_price > p.selling_price
  const discountPct = hasDiscount
    ? Math.round((1 - p.selling_price / p.original_price!) * 100)
    : null

  // Image takes ~55% of card height — leaves enough room for info + button on lg screens
  const imgHeight = height ? Math.round(height * 0.55) : undefined

  async function handleAdd() {
    if (!p.in_stock) return
    if (!isAuthenticated) {
      addToGuestCart({
        product_id: p.id, name: p.name, image_url: p.image_url,
        selling_price: p.selling_price, original_price: p.original_price, in_stock: p.in_stock,
      })
      await refresh()
      setAdded(true)
      setTimeout(() => setAdded(false), 1500)
      return
    }
    setLoading(true)
    try {
      await clientFetch('/api/storefront/cart', { method: 'POST', body: JSON.stringify({ product_id: p.id }) })
      await refresh()
      setAdded(true)
      setTimeout(() => setAdded(false), 1500)
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }

  async function handleIncrease() {
    if (!isAuthenticated) { updateGuestQty(p.id, cartQty + 1); await refresh(); return }
    setLoading(true)
    try {
      await clientFetch(`/api/storefront/cart/${p.id}`, { method: 'PATCH', body: JSON.stringify({ quantity: cartQty + 1 }) })
      await refresh()
    } catch { /* silent */ } finally { setLoading(false) }
  }

  async function handleDecrease() {
    if (!isAuthenticated) { updateGuestQty(p.id, cartQty - 1); await refresh(); return }
    setLoading(true)
    try {
      if (cartQty <= 1) {
        await clientFetch(`/api/storefront/cart/${p.id}`, { method: 'DELETE' })
      } else {
        await clientFetch(`/api/storefront/cart/${p.id}`, { method: 'PATCH', body: JSON.stringify({ quantity: cartQty - 1 }) })
      }
      await refresh()
    } catch { /* silent */ } finally { setLoading(false) }
  }

  async function handleRemove() {
    if (!isAuthenticated) { updateGuestQty(p.id, 0); await refresh(); return }
    setLoading(true)
    try {
      await clientFetch(`/api/storefront/cart/${p.id}`, { method: 'DELETE' })
      await refresh()
    } catch { /* silent */ } finally { setLoading(false) }
  }

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col ${scrollable ? 'flex-shrink-0' : 'w-full'}`}
      style={{
        width: scrollable && width ? `${width}px` : undefined,
        height: height ? `${height}px` : undefined,
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}
    >
      {/* Image */}
      <div
        className="relative flex-shrink-0 bg-gray-50 overflow-hidden"
        style={{ height: imgHeight ? `${imgHeight}px` : undefined }}
      >
        <Link href={productHref} className="block w-full h-full">
          {p.image_url ? (
            <img
              src={p.image_url.startsWith('http') ? p.image_url : `${API_URL}${p.image_url}`}
              alt={p.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl lg:text-4xl">🛍️</div>
          )}
        </Link>
        {discountPct && (
          <div className="absolute top-0 left-0 w-[42%] py-[5%] bg-rose-500 rounded-br-xl flex items-center justify-center pointer-events-none">
            <span className="text-[9px] sm:text-[10px] lg:text-xs font-bold text-white">{discountPct}% off</span>
          </div>
        )}
        {/* Wishlist heart */}
        <button
          onClick={() => requireAuth(() => toggleWishlist(p.id))}
          className="absolute top-1.5 right-1.5 w-7 h-7 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white transition-colors z-10"
        >
          <svg className={`w-3.5 h-3.5 transition-colors ${isWishlisted(p.id) ? 'text-rose-500' : 'text-gray-400'}`} fill={isWishlisted(p.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
        {!p.in_stock && (
          <div className="absolute inset-0 bg-white/65 flex items-center justify-center pointer-events-none">
            <span className="text-[10px] font-semibold text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
              Out of stock
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-[8px] lg:gap-[11px] p-2 lg:p-3 flex-1">
        <Link href={productHref}>
          <p className="text-[11px] sm:text-xs lg:text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
            {p.name}
          </p>
        </Link>

        <p className="text-[11px] sm:text-[12px] lg:text-[13px] text-gray-400 truncate -mt-1">
          {p.unit ?? ' '}
        </p>

        <div className="flex items-center gap-1.5">
          <span className="text-xs sm:text-sm font-bold text-gray-900">₹{p.selling_price}</span>
          {hasDiscount && (
            <span className="text-[10px] sm:text-xs text-gray-400 line-through">₹{p.original_price}</span>
          )}
        </div>

        {cartQty > 0 ? (
          <div className="mt-auto w-full h-[40px] sm:h-[46px] flex items-center justify-between rounded-lg border border-indigo-400 overflow-hidden [font-family:var(--font-instrument-sans)]">
            <button onClick={cartQty === 1 ? handleRemove : handleDecrease} disabled={loading}
              className="h-full w-[36%] flex items-center justify-center text-indigo-600 hover:bg-indigo-50 active:bg-indigo-100 transition-colors disabled:opacity-40"
            >
              {loading
                ? <div className="w-3.5 h-3.5 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
                : cartQty === 1
                ? <svg className="w-3.5 h-3.5 text-rose-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                : <span className="text-xl font-bold">−</span>
              }
            </button>
            <span className="text-[13px] sm:text-[14px] lg:text-[15px] font-bold text-gray-900">{cartQty}</span>
            <button onClick={handleIncrease} disabled={loading || !p.in_stock}
              className="h-full w-[36%] flex items-center justify-center text-indigo-600 hover:bg-indigo-50 active:bg-indigo-100 transition-colors disabled:opacity-40 text-xl font-bold"
            >
              {loading ? <div className="w-3.5 h-3.5 border border-indigo-400 border-t-transparent rounded-full animate-spin" /> : '+'}
            </button>
          </div>
        ) : (
          <button
            onClick={handleAdd}
            disabled={loading || !p.in_stock || added}
            className={`mt-auto w-full h-[40px] sm:h-[46px] flex items-center justify-center gap-[6px] px-[6px] rounded-lg border transition-all font-semibold text-[12px] sm:text-[14px] leading-none tracking-[0px] text-center [font-family:var(--font-instrument-sans)] ${
              added
                ? 'bg-green-500 border-green-500 text-white'
                : loading
                ? 'border-indigo-300 text-indigo-400'
                : !p.in_stock
                ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                : 'border-indigo-400 text-indigo-600 bg-transparent hover:bg-indigo-500 hover:border-indigo-500 hover:text-white active:bg-indigo-600'
            }`}
          >
            {loading ? (
              <div className="w-4 h-4 sm:w-4 sm:h-4 lg:w-5 lg:h-5 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
            ) : added ? (
              <>
                <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
                Added!
              </>
            ) : (
              <>
                <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4m1.6 8L5 5H3m4 8a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
                Add to cart
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
