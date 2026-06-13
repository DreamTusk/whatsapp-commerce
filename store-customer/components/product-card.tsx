'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth'
import { useCart } from '@/contexts/cart'
import { useWishlist } from '@/contexts/wishlist'
import { clientFetch } from '@/lib/client-api'
import { addToGuestCart, updateGuestQty } from '@/lib/guest-cart'
import type { Product } from '@/types'
import { Heart, ShoppingCart, Check, Trash } from "@deemlol/next-icons"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export type ProductCardSource =
  | { type: 'all' }
  | { type: 'category'; id: string; name: string }
  | { type: 'collection'; id: string; name: string }
  | { type: 'products' }

interface Props {
  product: Product
  scrollable?: boolean
  source?: ProductCardSource
  width?: number
  showOffer?: boolean
}

export default function ProductCard({ product: p, scrollable = true, source, width, showOffer = true }: Props) {
  const productHref = source
    ? source.type === 'all'
      ? `/products/${p.id}?from=all`
      : source.type === 'category'
      ? `/products/${p.id}?catId=${source.id}&catName=${encodeURIComponent(source.name)}`
      : source.type === 'collection'
      ? `/products/${p.id}?colId=${source.id}&colName=${encodeURIComponent(source.name)}`
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
      className={`group relative bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col transition-all duration-300 hover:border-indigo-200 hover:shadow-[0_4px_16px_rgba(99,102,241,0.15)] ${scrollable ? 'flex-shrink-0' : 'w-full'}`}
      style={{
        width: scrollable && width ? `${width}px` : undefined,
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}
    >
      {/* Full-card link overlay — above content, below buttons */}
      <Link href={productHref} className="absolute inset-0 z-10" aria-label={p.name} />

      {/* Image */}
      <div className="relative w-full aspect-[4/5] bg-gray-50 overflow-hidden">
        {p.image_url ? (
          <img
            src={p.image_url.startsWith('http') ? p.image_url : `${API_URL}${p.image_url}`}
            alt={p.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl lg:text-4xl transition-transform duration-300 group-hover:scale-110">🛍️</div>
        )}
        {showOffer && discountPct && (
          <div className="absolute top-0 left-0 w-[42%] py-[5%] bg-rose-500 rounded-br-xl flex items-center justify-center pointer-events-none">
            <span className="text-[9px] sm:text-[10px] lg:text-xs font-bold text-white">{discountPct}% off</span>
          </div>
        )}
        {/* Wishlist heart */}
        <button
          onClick={() => requireAuth(() => toggleWishlist(p.id))}
          className="absolute top-1.5 right-1.5 w-7 h-7 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white transition-colors z-20"
        >
          <Heart className={`w-3.5 h-3.5 transition-colors ${isWishlisted(p.id) ? 'text-rose-500' : 'text-gray-400'}`} fill={isWishlisted(p.id) ? 'currentColor' : 'none'} />
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
      <div className="relative flex flex-col gap-[8px] lg:gap-[11px] p-2 lg:p-3 flex-1">
        <p className="text-[13px] sm:text-[15px] font-semibold text-gray-900 leading-snug line-clamp-2">
          {p.name}
        </p>

        <p className="text-[10px] sm:text-[11px] text-gray-400 truncate -mt-1">
          {p.unit ?? ' '}
        </p>

        <div className="flex items-center gap-1.5">
          <span className="text-sm sm:text-base font-bold text-gray-900">₹{p.selling_price}</span>
          {showOffer && hasDiscount && (
            <span className="text-[10px] sm:text-xs text-gray-400 line-through">₹{p.original_price}</span>
          )}
        </div>

        {cartQty > 0 ? (
          <div className="relative z-20 mt-auto w-full h-[40px] sm:h-[46px] flex items-center justify-between rounded-lg border border-indigo-400 overflow-hidden [font-family:var(--font-instrument-sans)]">
            <button onClick={cartQty === 1 ? handleRemove : handleDecrease} disabled={loading}
              className="h-full w-[36%] flex items-center justify-center text-indigo-600 hover:bg-indigo-50 active:bg-indigo-100 transition-colors disabled:opacity-40"
            >
              {loading
                ? <div className="w-3.5 h-3.5 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
                : cartQty === 1
                ? <Trash className="w-3.5 h-3.5 text-rose-400" />
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
            className={`relative z-20 mt-auto w-full h-[40px] sm:h-[46px] flex items-center justify-center gap-[6px] px-[6px] rounded-lg border transition-all font-semibold text-[12px] sm:text-[14px] leading-none tracking-[0px] text-center [font-family:var(--font-instrument-sans)] ${
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
                <Check className="w-4 h-4 lg:w-5 lg:h-5" />
                Added!
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4 lg:w-5 lg:h-5" />
                Add to cart
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
