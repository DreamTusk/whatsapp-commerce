'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth'
import { useCart } from '@/contexts/cart'
import { clientFetch } from '@/lib/client-api'
import { addToGuestCart } from '@/lib/guest-cart'
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
  const { isAuthenticated } = useAuth()
  const { refresh } = useCart()
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState(false)

  const hasDiscount = p.original_price != null && p.original_price > p.selling_price
  const discountPct = hasDiscount
    ? Math.round((1 - p.selling_price / p.original_price!) * 100)
    : null

  // Image takes ~60% of card height
  const imgHeight = height ? Math.round(height * 0.6) : undefined

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
      <Link
        href={productHref}
        className="relative block flex-shrink-0 bg-gray-50 overflow-hidden"
        style={{ height: imgHeight ? `${imgHeight}px` : undefined }}
      >
        {p.image_url ? (
          <img
            src={p.image_url.startsWith('http') ? p.image_url : `${API_URL}${p.image_url}`}
            alt={p.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl lg:text-4xl">🛍️</div>
        )}
        {discountPct && (
          <div className="absolute top-0 left-0 w-[42%] py-[5%] bg-rose-500 rounded-br-xl flex items-center justify-center">
            <span className="text-[9px] sm:text-[10px] lg:text-xs font-bold text-white">{discountPct}% off</span>
          </div>
        )}
        {!p.in_stock && (
          <div className="absolute inset-0 bg-white/65 flex items-center justify-center">
            <span className="text-[10px] font-semibold text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
              Out of stock
            </span>
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="flex flex-col gap-[8px] lg:gap-[11px] p-2 lg:p-3 flex-1">
        <Link href={productHref}>
          <p className="text-[11px] sm:text-xs lg:text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
            {p.name}
          </p>
        </Link>

        <p className="text-[9px] sm:text-[10px] text-gray-400 truncate -mt-1">
          {p.unit ?? ' '}
        </p>

        <div className="flex items-center gap-1.5">
          <span className="text-xs sm:text-sm font-bold text-gray-900">₹{p.selling_price}</span>
          {hasDiscount && (
            <span className="text-[10px] sm:text-xs text-gray-400 line-through">₹{p.original_price}</span>
          )}
        </div>

        <button
          onClick={handleAdd}
          disabled={loading || !p.in_stock || added}
          className={`mt-auto w-full h-[34px] sm:h-[40px] lg:h-[48px] flex items-center justify-center gap-[6px] lg:gap-[8px] px-[6px] lg:px-[8px] rounded-lg border transition-all font-semibold text-[11px] sm:text-[13px] lg:text-[16px] leading-none tracking-[0px] text-center [font-family:var(--font-instrument-sans)] ${
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
            <div className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
          ) : added ? (
            <>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
              Added!
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4m1.6 8L5 5H3m4 8a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              Add to cart
            </>
          )}
        </button>
      </div>
    </div>
  )
}
