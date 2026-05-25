import { headers } from 'next/headers'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import { theme } from '@/lib/theme'
import StoreHeader from '@/components/store-header'
import type { Store, Category, Product } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export default async function HomePage() {
  const headersList = await headers()
  const domain = headersList.get('x-store-domain') ?? ''

  let store: Store | null = null
  let categories: Category[] = []
  let products: Product[] = []

  try {
    const data = await apiFetch<{ store: Store }>('/api/store/info', domain)
    store = data.store
  } catch {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center px-6">
          <p className="text-5xl mb-4">🏪</p>
          <p className="font-semibold text-gray-700 text-lg">Store not found</p>
          <p className="text-sm text-gray-400 mt-1">Check the URL and try again</p>
        </div>
      </main>
    )
  }

  if (!store.is_active) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center px-6">
          <p className="text-5xl mb-4">🔒</p>
          <p className="font-semibold text-gray-700 text-lg">Store is temporarily unavailable</p>
          <p className="text-sm text-gray-400 mt-1">Please check back later</p>
        </div>
      </main>
    )
  }

  try {
    const [catData, prodData] = await Promise.all([
      apiFetch<{ categories: Category[] }>('/api/storefront/categories', domain),
      apiFetch<{ products: Product[] }>('/api/storefront/products', domain),
    ])
    categories = catData.categories
    products = prodData.products
  } catch { /* show with whatever loaded */ }

  return (
    <main className="min-h-screen bg-gray-100">
      <StoreHeader domain={domain} />

    

      {/* ── Categories ── */}
      {categories.length > 0 && (
        <div className="bg-white shadow-sm">
          <div className="max-w-5xl mx-auto px-4 pt-4 pb-3">
            <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
              {/* All */}
              <Link href="/products" className="flex flex-col items-center gap-1.5 shrink-0 group">
                <div
                  className="w-15 h-15 rounded-full border-2 flex items-center justify-center transition-all group-hover:scale-105"
                  style={{ borderColor: theme.primary, backgroundColor: theme.primaryLight }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"
                    style={{ color: theme.primary }}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                  </svg>
                </div>
                <span className="text-[11px] font-medium text-gray-700 text-center w-16 truncate">All</span>
              </Link>

              {categories.map(cat => (
                <Link
                  key={cat.id}
                  href={`/products?category=${cat.id}`}
                  className="flex flex-col items-center gap-1.5 shrink-0 group"
                >
                  <div className="w-15 h-15 rounded-full overflow-hidden border-2 border-gray-200 group-hover:border-current transition-all group-hover:scale-105"
                    style={{ '--hover-color': theme.primary } as React.CSSProperties}>
                    {cat.image_url ? (
                      <img
                        src={`${API_URL}${cat.image_url}`}
                        alt={cat.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl"
                        style={{ backgroundColor: theme.primaryLight }}>
                        🛍️
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-gray-700 text-center w-16 line-clamp-1">
                    {cat.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Products ── */}
      <div className="max-w-5xl mx-auto px-3 py-4">
        {products.length === 0 ? (
          <div className="bg-white rounded-2xl text-center py-20 px-6">
            <p className="text-5xl mb-4">🛒</p>
            <p className="font-semibold text-gray-600">No products yet</p>
            <p className="text-sm text-gray-400 mt-1">Check back soon!</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3 px-0.5">
              <h2 className="font-bold text-gray-800 text-base">All Products</h2>
              <Link
                href="/products"
                className="text-xs font-semibold"
                style={{ color: theme.primary }}
              >
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {products.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}

function ProductCard({ product: p }: { product: Product }) {
  const discount =
    p.original_price && p.original_price > p.selling_price
      ? Math.round((1 - p.selling_price / p.original_price) * 100)
      : null

  return (
    <Link
      href={`/products/${p.id}`}
      className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100"
    >
      {/* Image */}
      <div className="relative w-full aspect-square bg-gray-50 overflow-hidden">
        {p.image_url ? (
          <img
            src={`${API_URL}${p.image_url}`}
            alt={p.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">🛍️</div>
        )}
        {discount && (
          <span
            className="absolute top-2 left-2 text-[10px] font-bold text-white px-1.5 py-0.5 rounded"
            style={{ backgroundColor: theme.badgeColor }}
          >
            {discount}% off
          </span>
        )}
        {!p.in_stock && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="text-xs font-semibold text-gray-500 bg-white px-2 py-1 rounded-full border border-gray-200">
              Out of stock
            </span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-2.5">
        <p className="text-xs font-semibold text-gray-800 leading-snug line-clamp-2 min-h-8">
          {p.name}
        </p>
        {p.name_local && (
          <p className="text-[10px] text-gray-400 mt-0.5 truncate">{p.name_local}</p>
        )}
        <div className="mt-1.5 flex items-baseline gap-1.5 flex-wrap">
          <span className="font-bold text-gray-900 text-sm">₹{p.selling_price}</span>
          {p.original_price != null && p.original_price > p.selling_price && (
            <span className="text-[11px] text-gray-400 line-through">₹{p.original_price}</span>
          )}
        </div>
        <div
          className="mt-2 w-full py-1.5 rounded-lg text-center text-[11px] font-bold text-white"
          style={{ backgroundColor: theme.primary }}
        >
          View
        </div>
      </div>
    </Link>
  )
}
