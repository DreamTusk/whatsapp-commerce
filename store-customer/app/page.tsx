import { headers } from 'next/headers'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import StoreHeader from '@/components/store-header'
import ProductCard from '@/components/product-card'
import BannerCarousel from '@/components/banner-carousel'
import type { Store, Category, Product, StoreCollection, Banner } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

const scrollRow = 'flex gap-4 overflow-x-auto overflow-y-hidden pb-2 scrollbar-hide'

export default async function HomePage() {
  const headersList = await headers()
  const domain = headersList.get('x-store-domain') ?? ''

  let store: Store | null = null
  let categories: Category[] = []
  let collections: StoreCollection[] = []
  let banners: Banner[] = []
  let products: Product[] = []

  try {
    const data = await apiFetch<{ store: Store; banners?: Banner[]; collections?: StoreCollection[] }>('/api/store/info', domain)
    store = data.store
    banners = data.banners ?? []
    collections = data.collections ?? []
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
  } catch { /* show what we have */ }

  const hasCollections = collections.length > 0

  // Group products by category (used only when no collections)
  const productsByCategory = new Map<string, Product[]>()
  products.forEach(p => {
    const key = p.category_id ?? '__none__'
    if (!productsByCategory.has(key)) productsByCategory.set(key, [])
    productsByCategory.get(key)!.push(p)
  })
  const categoriesWithProducts = categories.filter(c => (productsByCategory.get(c.id)?.length ?? 0) > 0)

  return (
    <main className="min-h-screen pb-24">
      <StoreHeader domain={domain} />

      {/* ── Banners ── */}
      {banners.length > 0 && <BannerCarousel banners={banners} />}

      {/* ── Round categories ── */}
      {categories.length > 0 && (
        <section className="mt-4 sm:mt-6 lg:mt-8">
          <div className="flex items-center justify-between page-x mb-3">
            <h2 className="text-[18px] sm:text-[20px] lg:text-[24px] font-bold text-gray-900 [font-family:var(--font-instrument-sans)]">Category</h2>
            <Link href="/products" className="flex items-center gap-1 text-[13px] sm:text-[14px] lg:text-[16px] font-medium text-indigo-500 [font-family:var(--font-instrument-sans)]">
              <span>See All</span><span>&gt;</span>
            </Link>
          </div>
          <div className="page-x">
            <div className="flex flex-nowrap justify-around gap-5 overflow-x-auto overflow-y-hidden pb-5 scrollbar-hide">
              {categories.map(cat => (
                <Link key={cat.id} href={`/products?category=${cat.id}`} className="flex flex-col items-center gap-[10px] lg:gap-[15px] flex-shrink-0 w-[80px] sm:w-[110px] lg:w-[150px]">
                  <div className="w-[80px] h-[80px] sm:w-[110px] sm:h-[110px] lg:w-[150px] lg:h-[150px] rounded-full overflow-hidden bg-gray-100 border-2 border-white flex-shrink-0" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                    {cat.image_url ? (
                      <img src={cat.image_url.startsWith('http') ? cat.image_url : `${API_URL}${cat.image_url}`} alt={cat.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl lg:text-2xl">🛍️</div>
                    )}
                  </div>
                  <span className="text-[11px] sm:text-[13px] lg:text-[16px] font-semibold text-gray-700 text-center w-full [font-family:var(--font-instrument-sans)]">{cat.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Collections (if store has any) ── */}
      {hasCollections && collections.map(col => col.products.length > 0 && (
        <section key={col.id} className="mt-6 sm:mt-8">
          <div className="flex items-center justify-between page-x mb-3">
            <h2 className="text-[18px] sm:text-[20px] lg:text-[24px] font-bold text-gray-900 [font-family:var(--font-instrument-sans)]">{col.name}</h2>
            <Link href={`/collection/${col.id}`} className="flex items-center gap-1 text-[13px] sm:text-[14px] lg:text-[16px] font-medium text-indigo-500 [font-family:var(--font-instrument-sans)]">
              <span>See All</span><span>&gt;</span>
            </Link>
          </div>
          <div className="page-x">
            <div className={scrollRow}>
              {col.products.slice(0, 12).map(p => (
                <ProductCard key={p.id} product={p} source={{ type: 'all' }} width={210} height={409} />
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* ── Category-wise rows (only when store has no collections) ── */}
      {!hasCollections && categoriesWithProducts.map(cat => (
        <section key={cat.id} className="mt-6">
          <div className="flex items-center justify-between page-x mb-3">
            <h2 className="text-[18px] sm:text-[20px] lg:text-[24px] font-bold text-gray-900 [font-family:var(--font-instrument-sans)]">{cat.name}</h2>
            <Link href={`/products?category=${cat.id}`} className="flex items-center gap-1 text-[13px] sm:text-[14px] lg:text-[16px] font-medium text-indigo-500 [font-family:var(--font-instrument-sans)]">
              <span>See All</span><span>&gt;</span>
            </Link>
          </div>
          <div className="page-x">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {productsByCategory.get(cat.id)!.slice(0, 6).map(p => (
                <ProductCard key={p.id} product={p} scrollable={false} height={409} source={{ type: 'category', id: cat.id, name: cat.name }} />
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* ── Empty state ── */}
      {!hasCollections && products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 page-x">
          <p className="text-5xl mb-4">🛒</p>
          <p className="font-semibold text-gray-600">No products yet</p>
          <p className="text-sm text-gray-400 mt-1">Check back soon!</p>
        </div>
      )}
    </main>
  )
}
