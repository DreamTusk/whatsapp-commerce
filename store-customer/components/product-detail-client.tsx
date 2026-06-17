'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useAuth } from '@/contexts/auth'
import { useCart } from '@/contexts/cart'
import { useCartDrawer } from '@/contexts/cart-drawer'
import { clientFetch } from '@/lib/client-api'
import { addToGuestCart, updateGuestQty } from '@/lib/guest-cart'
import { ChevronLeft, ChevronRight, ShoppingCart, Check, Trash, Heart } from "@deemlol/next-icons"
import type { Product, ProductImage } from '@/types'
import ProductCard, { type ProductCardSource } from '@/components/product-card'

const BlockNotePreview = dynamic(
  () => import('@/components/blocknote-editor/BlockNotePreview'),
  { ssr: false },
)

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface Crumb { label: string; href: string | null }

interface Props {
  productId: string
  productName: string
  productImage: string | null
  images: ProductImage[]
  sellingPrice: number
  originalPrice: number | null
  inStock: boolean
  unit: string | null
  description: string | null
  categoryName: string | null
  breadcrumbs: Crumb[]
  relatedProducts?: Product[]
  relatedSource?: ProductCardSource
}

function toDisplay(url: string | null): string | null {
  if (!url) return null
  return url.startsWith('http') ? url : `${API_URL}${url}`
}

export default function ProductDetailClient({
  productId, productName, productImage, images,
  sellingPrice, originalPrice, inStock,
  unit, description, categoryName, breadcrumbs,
  relatedProducts = [], relatedSource,
}: Props) {
  const router = useRouter()
  const { isAuthenticated, requireAuth } = useAuth()
  const { refresh, items: cartItems } = useCart()
  const { openCart } = useCartDrawer()

  const primaryIdx = images.findIndex(i => i.is_primary)
  const [activeIdx, setActiveIdx] = useState(primaryIdx >= 0 ? primaryIdx : 0)
  const activeUrl = images[activeIdx]?.url ?? productImage
  const activeImgSrc = toDisplay(activeUrl)

  const canNavigate = images.length >= 2
  const prev = () => setActiveIdx(i => (i - 1 + images.length) % images.length)
  const next = () => setActiveIdx(i => (i + 1) % images.length)

  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [cartLoading, setCartLoading] = useState(false)

  const cartQty = cartItems[productId] ?? 0
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
      addToGuestCart({
        product_id: productId, name: productName, image_url: productImage,
        selling_price: sellingPrice, original_price: originalPrice, in_stock: inStock,
      })
      await refresh()
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
      return
    }
    setAdding(true)
    try {
      await clientFetch('/api/storefront/cart', {
        method: 'POST',
        body: JSON.stringify({ product_id: productId }),
      })
      await refresh()
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    } catch { /* silent */ } finally {
      setAdding(false)
    }
  }

  async function handleIncrease() {
    if (!isAuthenticated) { updateGuestQty(productId, cartQty + 1); await refresh(); return }
    setCartLoading(true)
    try {
      await clientFetch(`/api/storefront/cart/${productId}`, { method: 'PATCH', body: JSON.stringify({ quantity: cartQty + 1 }) })
      await refresh()
    } catch { /* silent */ } finally { setCartLoading(false) }
  }

  async function handleDecrease() {
    if (!isAuthenticated) { updateGuestQty(productId, cartQty - 1); await refresh(); return }
    setCartLoading(true)
    try {
      if (cartQty <= 1) {
        await clientFetch(`/api/storefront/cart/${productId}`, { method: 'DELETE' })
      } else {
        await clientFetch(`/api/storefront/cart/${productId}`, { method: 'PATCH', body: JSON.stringify({ quantity: cartQty - 1 }) })
      }
      await refresh()
    } catch { /* silent */ } finally { setCartLoading(false) }
  }

  async function removeFromCart() {
    if (!isAuthenticated) { updateGuestQty(productId, 0); await refresh(); return }
    setCartLoading(true)
    try {
      await clientFetch(`/api/storefront/cart/${productId}`, { method: 'DELETE' })
      await refresh()
    } catch { /* silent */ } finally { setCartLoading(false) }
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

  const CartStepper = ({ className }: { className?: string }) => (
    <div className={`flex items-center justify-between rounded-xl border-primary border overflow-hidden [font-family:var(--font-instrument-sans)] ${className}`}>
      <button onClick={handleDecrease} disabled={cartLoading}
        className="h-full w-[36%] flex items-center justify-center c-primary hover:opacity-70 transition-opacity disabled:opacity-40 text-xl font-bold"
      >
        {cartLoading ? <div className="w-4 h-4 border border-t-transparent rounded-full animate-spin spinner-primary" /> : '−'}
      </button>
      <span className="text-base font-bold text-gray-900">{cartQty}</span>
      <button onClick={handleIncrease} disabled={cartLoading || !inStock}
        className="h-full w-[36%] flex items-center justify-center c-primary hover:opacity-70 transition-opacity disabled:opacity-40 text-xl font-bold"
      >
        {cartLoading ? <div className="w-4 h-4 border border-t-transparent rounded-full animate-spin spinner-primary" /> : '+'}
      </button>
    </div>
  )

  const AddToCartBtn = ({ className }: { className?: string }) => (
    added ? (
      <button onClick={openCart} className={`flex items-center justify-center gap-2 bg-green-500 text-white font-semibold rounded-xl text-sm transition-colors ${className}`}>
        <Check className="w-4 h-4" />
        Added · View cart
      </button>
    ) : (
      <button
        onClick={addToCart}
        disabled={adding || !inStock}
        className={`flex items-center justify-center gap-2 btn-primary-filled font-semibold rounded-xl text-sm ${className}`}
      >
        {adding ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <ShoppingCart className="w-4 h-4" />
        )}
        {inStock ? (adding ? 'Adding…' : 'Add to Cart') : 'Out of stock'}
      </button>
    )
  )

  const DescriptionBlock = ({ content }: { content: string }) => {
    const [expanded, setExpanded] = useState(false)
    return (
      <div>
        <div className={`overflow-hidden transition-all duration-300 ${expanded ? '' : 'max-h-36'}`}>
          <BlockNotePreview content={content} />
        </div>
        <button
          onClick={() => setExpanded(v => !v)}
          className="mt-1 text-xs font-semibold c-primary hover:opacity-70 transition-opacity"
        >
          {expanded ? 'Show less ↑' : 'Read more ↓'}
        </button>
      </div>
    )
  }

  // Thumbnail strip — shared between mobile and desktop
  const ThumbnailStrip = ({ size = 56 }: { size?: number }) => {
    if (images.length <= 1) return null
    return (
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {images.map((img, i) => {
          const thumbSrc = toDisplay(img.thumbnail_url ?? img.url)
          const isActive = activeIdx === i
          return (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className="flex-shrink-0 rounded-xl overflow-hidden transition-all"
              style={{
                width: size, height: size,
                border: isActive ? '2px solid #6366f1' : '2px solid #f3f4f6',
              }}
            >
              {thumbSrc ? (
                <img src={thumbSrc} alt="" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-lg">🛍️</div>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <>
      {/* ══════════════════════════════════════
          MOBILE layout  (< lg)
      ══════════════════════════════════════ */}
      <div className="lg:hidden bg-gray-100 pb-4">
        {/* Sticky top bar — docks below the store header using its measured height */}
        <div className="sticky top-[var(--store-header-h)] z-20 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
          <button onClick={() => router.back()} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <button onClick={openCart} className="relative p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
            <ShoppingCart className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* Card: image + thumbnails + info */}
        <div className="mx-3 mt-3 bg-white rounded-2xl shadow-sm overflow-hidden space-y-3">
          {/* Main image */}
          <div className="relative w-full aspect-square overflow-hidden bg-white">
            {activeImgSrc ? (
              <img src={activeImgSrc} alt={productName} className="w-full h-full object-contain transition-all duration-200" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl">🛍️</div>
            )}
            {canNavigate && (
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                <button onClick={prev} className="w-7 h-7 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors">
                  <ChevronLeft className="w-4 h-4 text-white" />
                </button>
                <span className="text-xs font-semibold text-white bg-black/30 px-2 py-0.5 rounded-full">
                  {activeIdx + 1}/{images.length}
                </span>
                <button onClick={next} className="w-7 h-7 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors">
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="px-3">
              <ThumbnailStrip size={56} />
            </div>
          )}

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
                <DescriptionBlock content={description} />
              </div>
            )}
          </div>
        </div>

        {/* Fixed bottom CTA */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg px-4 py-3 z-40 flex flex-col gap-2">
          {cartQty > 0 ? (
            <>
              <CartStepper className="w-full h-[52px]" />
              <button
                onClick={removeFromCart}
                disabled={cartLoading}
                className="w-full py-3 rounded-xl border border-rose-200 text-rose-500 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-rose-50 transition-colors disabled:opacity-40"
              >
                <Trash className="w-4 h-4" />
                Remove from cart
              </button>
            </>
          ) : (
            <AddToCartBtn className="w-full py-3.5" />
          )}
          <button
            onClick={() => requireAuth(toggleWishlist)}
            disabled={wishlistLoading}
            className={`w-full py-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
              wishlisted
                ? 'wishlist-saved'
                : 'border-gray-200 text-gray-600 hover:opacity-70'
            }`}
          >
            <Heart className="w-4 h-4" fill={wishlisted ? 'currentColor' : 'none'} />
            {wishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════
          DESKTOP layout  (lg+)
      ══════════════════════════════════════ */}
      <div className="hidden lg:block bg-gray-50 pb-6">
        <div className="page-x pt-6 max-w-[1360px] mx-auto">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm mb-8">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-gray-400 text-xs">&gt;</span>}
                {crumb.href ? (
                  <Link href={crumb.href} className="text-gray-500 hover:opacity-70 transition-opacity">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-gray-900 font-medium">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>

          <div className="grid grid-cols-[55%_45%] gap-10 items-start">
            {/* Left: image + thumbnails */}
            <div className="space-y-3">
              {/* Main image */}
              <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden aspect-square">
                {activeImgSrc ? (
                  <img src={activeImgSrc} alt={productName} className="w-full h-full object-contain transition-all duration-200" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-8xl bg-gray-50">🛍️</div>
                )}
                {canNavigate && (
                  <div className="absolute bottom-4 right-4 flex items-center gap-2">
                    <button onClick={prev} className="w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors">
                      <ChevronLeft className="w-4 h-4 text-white" />
                    </button>
                    <span className="text-xs font-semibold text-white bg-black/30 px-2.5 py-1 rounded-full">
                      {activeIdx + 1}/{images.length}
                    </span>
                    <button onClick={next} className="w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors">
                      <ChevronRight className="w-4 h-4 text-white" />
                    </button>
                  </div>
                )}
              </div>
              {/* Thumbnails */}
              <ThumbnailStrip size={72} />
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

              {description && (
                <DescriptionBlock content={description} />
              )}

              {/* Buttons */}
              <div className="flex flex-col gap-3">
                {cartQty > 0 ? (
                  <>
                    <CartStepper className="w-full h-[56px]" />
                    <button
                      onClick={removeFromCart}
                      disabled={cartLoading}
                      className="w-full py-4 rounded-xl border border-rose-200 text-rose-500 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-rose-50 transition-colors disabled:opacity-40"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Remove from cart
                    </button>
                  </>
                ) : (
                  <AddToCartBtn className="w-full py-4 text-base" />
                )}
                <button
                  onClick={() => requireAuth(toggleWishlist)}
                  disabled={wishlistLoading}
                  className={`w-full py-4 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                    wishlisted
                      ? 'wishlist-saved'
                      : 'border-gray-200 text-gray-600 hover:opacity-70'
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

      {/* Related products */}
      {relatedProducts.length > 0 && (() => {
        const seeAllHref = relatedSource?.type === 'collection'
          ? `/collection/${relatedSource.id}`
          : relatedSource?.type === 'category'
          ? `/products?category=${relatedSource.id}`
          : '/products'
        return (
          <div className="pt-5 pb-24 bg-white border-t border-gray-100">
            <div className="page-x mb-3 flex items-center justify-between">
              <p className="text-base font-bold text-gray-900 [font-family:var(--font-instrument-sans)]">
                {relatedSource?.type === 'collection' ? `More from ${relatedSource.name}` : 'More like this'}
                
              </p>
              {relatedProducts.length >= 6 && (
                <Link href={seeAllHref} className="text-xs font-semibold c-primary hover:opacity-70 transition-opacity">
                  See all →
                </Link>
              )}
            </div>
            {/* Mobile: 2-column grid */}
            <div className="lg:hidden page-x grid grid-cols-2 gap-3">
              {relatedProducts.map(p => (
                <ProductCard key={p.id} product={p} scrollable={false} source={relatedSource} />
              ))}
            </div>
            {/* Desktop: horizontal scroll */}
            <div className="hidden lg:flex page-x overflow-x-auto gap-3 no-scrollbar pb-1">
              {relatedProducts.map(p => (
                <ProductCard key={p.id} product={p} scrollable source={relatedSource} width={160} />
              ))}
            </div>
          </div>
        )
      })()}
    </>
  )
}
