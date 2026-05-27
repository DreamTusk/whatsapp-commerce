'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth'
import { useCart } from '@/contexts/cart'
import { useCartDrawer } from '@/contexts/cart-drawer'
import { clientFetch } from '@/lib/client-api'
import { addToGuestCart } from '@/lib/guest-cart'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface Crumb { label: string; href: string | null }

interface Props {
  productId: string
  productName: string
  productImage: string | null
  sellingPrice: number
  originalPrice: number | null
  inStock: boolean
  unit: string | null
  description: string | null
  categoryName: string | null
  breadcrumbs: Crumb[]
}

export default function ProductDetailClient({
  productId, productName, productImage,
  sellingPrice, originalPrice, inStock,
  unit, description, categoryName, breadcrumbs,
}: Props) {
  const router = useRouter()
  const { isAuthenticated, requireAuth } = useAuth()
  const { refresh } = useCart()
  const { openCart } = useCartDrawer()

  const [qty, setQty] = useState(1)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [wishlisted, setWishlisted] = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) return
    clientFetch<{ items: { product: { id: string } }[] }>('/api/storefront/wishlist')
      .then(data => {
        setWishlisted(data.items.some(i => i.product.id === productId))
      })
      .catch(() => {})
  }, [isAuthenticated, productId])

  const discount = originalPrice && originalPrice > sellingPrice
    ? Math.round((1 - sellingPrice / originalPrice) * 100)
    : null

  async function addToCart() {
    if (!isAuthenticated) {
      for (let i = 0; i < qty; i++) {
        addToGuestCart({
          product_id: productId, name: productName, image_url: productImage,
          selling_price: sellingPrice, original_price: originalPrice, in_stock: inStock,
        })
      }
      await refresh()
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
      return
    }
    setAdding(true)
    try {
      for (let i = 0; i < qty; i++) {
        await clientFetch('/api/storefront/cart', {
          method: 'POST',
          body: JSON.stringify({ product_id: productId }),
        })
      }
      await refresh()
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    } catch { /* silent */ } finally {
      setAdding(false)
    }
  }

  async function toggleWishlist() {
    setWishlistLoading(true)
    try {
      if (wishlisted) {
        await clientFetch(`/api/storefront/wishlist/${productId}`, { method: 'DELETE' })
        setWishlisted(false)
      } else {
        await clientFetch('/api/storefront/wishlist', {
          method: 'POST',
          body: JSON.stringify({ product_id: productId }),
        })
        setWishlisted(true)
      }
    } catch { /* silent */ } finally {
      setWishlistLoading(false)
    }
  }

  const imgSrc = productImage
    ? (productImage.startsWith('http') ? productImage : `${API_URL}${productImage}`)
    : null

  const AddToCartBtn = ({ className }: { className?: string }) => (
    added ? (
      <button onClick={openCart} className={`flex items-center justify-center gap-2 bg-green-500 text-white font-semibold rounded-xl text-sm transition-colors ${className}`}>
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
        Added · View cart
      </button>
    ) : (
      <button
        onClick={addToCart}
        disabled={adding || !inStock}
        className={`flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors ${className}`}
      >
        {adding ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4m1.6 8L5 5H3m4 8a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
        )}
        {inStock ? (adding ? 'Adding…' : 'Add to Cart') : 'Out of stock'}
      </button>
    )
  )

  return (
    <>
      {/* ══════════════════════════════════════
          MOBILE layout  (< lg)
      ══════════════════════════════════════ */}
      <div className="lg:hidden min-h-screen bg-gray-100 pb-36">
        {/* Sticky top bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
          <button onClick={() => router.back()} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={openCart} className="relative p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4m1.6 8L5 5H3m4 8a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
          </button>
        </div>

        {/* Card: image + info combined */}
        <div className="mx-3 mt-3 bg-white rounded-2xl shadow-sm overflow-hidden space-y-3">
          {/* Image */}
          <div className="w-full aspect-square overflow-hidden">
            {imgSrc ? (
              <img src={imgSrc} alt={productName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl bg-gray-50">🛍️</div>
            )}
          </div>

          {/* Info */}
          <div className="p-4 space-y-3">
            <h1 className="text-lg font-bold text-gray-900 leading-snug">{productName}</h1>

            {unit && (
              <span className="inline-block text-xs text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                Net Qty: <strong>{unit}</strong>
              </span>
            )}

            {/* Price row */}
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-gray-900">₹{sellingPrice}</span>
              {discount && (
                <span className="text-sm font-semibold text-green-600">{discount}% Off</span>
              )}
            </div>
            {originalPrice && originalPrice > sellingPrice && (
              <p className="text-xs text-gray-400 -mt-1">
                MRP <span className="line-through">₹{originalPrice}</span>
                <span className="ml-1">(incl. of all taxes)</span>
              </p>
            )}

            {/* Highlights */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-sm font-bold text-gray-900 mb-2">Highlights</p>
              <div className="space-y-2">
                {categoryName && (
                  <div className="flex text-sm">
                    <span className="text-gray-400 w-32 flex-shrink-0">Product type</span>
                    <span className="text-gray-700 font-medium">{categoryName}</span>
                  </div>
                )}
                {unit && (
                  <div className="flex text-sm">
                    <span className="text-gray-400 w-32 flex-shrink-0">Weight</span>
                    <span className="text-gray-700 font-medium">{unit}</span>
                  </div>
                )}
                <div className="flex text-sm">
                  <span className="text-gray-400 w-32 flex-shrink-0">Availability</span>
                  <span className={`font-medium ${inStock ? 'text-green-600' : 'text-red-500'}`}>
                    {inStock ? 'In stock' : 'Out of stock'}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            {description && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-sm font-bold text-gray-900 mb-1">Information</p>
                <p className="text-xs text-gray-400 mb-1">About the product</p>
                <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Fixed bottom CTA */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg px-4 py-3 z-40 flex flex-col gap-2">
          <AddToCartBtn className="w-full py-3.5" />
          <button
            onClick={() => requireAuth(toggleWishlist)}
            disabled={wishlistLoading}
            className={`w-full py-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
              wishlisted
                ? 'wishlist-saved'
                : 'border-gray-200 text-gray-600 hover:border-violet-200 hover:text-violet-500'
            }`}
          >
            <svg className="w-4 h-4" fill={wishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {wishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════
          DESKTOP layout  (lg+)
      ══════════════════════════════════════ */}
      <div className="hidden lg:block min-h-screen bg-gray-50 pb-16">
        <div className="page-x pt-6 max-w-[1360px] mx-auto">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm mb-8">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-gray-400 text-xs">&gt;</span>}
                {crumb.href ? (
                  <Link href={crumb.href} className="text-gray-500 hover:text-indigo-500 transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-gray-900 font-medium">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>

          <div className="grid grid-cols-[55%_45%] gap-10">
            {/* Left: image */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden aspect-square">
              {imgSrc ? (
                <img src={imgSrc} alt={productName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-8xl bg-gray-50">🛍️</div>
              )}
            </div>

            {/* Right: info */}
            <div className="flex flex-col gap-5">
              {inStock && (
                <span className="self-start text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full">
                  In stock
                </span>
              )}

              <h1 className="text-2xl font-bold text-gray-900 leading-snug">{productName}</h1>

              {/* Price */}
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-bold text-gray-900">₹{sellingPrice}</span>
                  {discount && (
                    <span className="text-base font-semibold text-green-600">{discount}% Off</span>
                  )}
                </div>
                {originalPrice && originalPrice > sellingPrice && (
                  <p className="text-sm text-gray-400 mt-1">
                    MRP <span className="line-through">₹{originalPrice}</span>
                    <span className="ml-1">(incl. of all taxes)</span>
                  </p>
                )}
              </div>

              {unit && (
                <p className="text-sm text-gray-600">
                  Net Qty: <strong>{unit}</strong>
                </p>
              )}

              {/* Qty selector */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-600">Quantity</span>
                <div className="flex items-center gap-3 bg-gray-100 rounded-xl px-1 py-1">
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors font-bold"
                  >
                    −
                  </button>
                  <span className="text-sm font-bold text-gray-900 w-6 text-center">{qty}</span>
                  <button
                    onClick={() => setQty(q => q + 1)}
                    className="w-8 h-8 rounded-lg bg-indigo-500 shadow-sm flex items-center justify-center text-white hover:bg-indigo-600 transition-colors font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {description && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Description</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex flex-col gap-3 mt-auto">
                <AddToCartBtn className="w-full py-4 text-base" />
                <button
                  onClick={() => requireAuth(toggleWishlist)}
                  disabled={wishlistLoading}
                  className={`w-full py-4 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                    wishlisted
                      ? 'wishlist-saved'
                      : 'border-gray-200 text-gray-600 hover:border-violet-200 hover:text-violet-500'
                  }`}
                >
                  <svg className="w-4 h-4" fill={wishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {wishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
