import { headers } from 'next/headers'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import StoreHeader from '@/components/store-header'
import ProductCard from '@/components/product-card'
import type { Product, Category } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface Props {
  searchParams: Promise<{ category?: string; search?: string }>
}

export default async function ProductsPage({ searchParams }: Props) {
  const headersList = await headers()
  const domain = headersList.get('x-store-domain') ?? ''
  const { category: categoryId, search } = await searchParams

  let products: Product[] = []
  let categories: Category[] = []

  try {
    const catData = await apiFetch<{ categories: Category[] }>('/api/storefront/categories', domain)
    categories = catData.categories

    if (search) {
      const searchData = await apiFetch<{ products: Product[] }>(
        `/api/storefront/search?q=${encodeURIComponent(search)}`,
        domain
      )
      products = searchData.products
    } else {
      const qs = categoryId ? `?category_id=${categoryId}` : ''
      const prodData = await apiFetch<{ products: Product[] }>(`/api/storefront/products${qs}`, domain)
      products = prodData.products
    }
  } catch { /* backend unavailable */ }

  const activeCategory = categories.find(c => c.id === categoryId)

  return (
    // Full viewport height, flex column so header + panels fit exactly
    <main className="h-screen flex flex-col overflow-hidden">

      <StoreHeader domain={domain} />

      {/* Panel row — fills remaining height, each column scrolls independently */}
      <div className="page-x flex flex-1 min-h-0 bg-gray-50">

        {/* ── Category sidebar (scrolls on its own) ── */}
        <aside className="w-[80px] sm:w-[100px] lg:w-[250px] flex-shrink-0 bg-white border-r border-gray-100 overflow-y-auto scrollbar-hide">

          {/* All */}
          <Link
            href="/products"
            className={`flex flex-col lg:flex-row items-center gap-1 lg:gap-3 px-1 lg:px-4 py-3 border-r-2 transition-colors ${
              !categoryId && !search
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-transparent hover:bg-gray-50'
            }`}
          >
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">
              🛍️
            </div>
            <span className={`text-[10px] sm:text-[11px] lg:text-sm font-semibold text-center lg:text-left line-clamp-2 leading-tight ${!categoryId && !search ? 'text-indigo-600' : 'text-gray-600'}`}>
              All
            </span>
          </Link>

          {categories.map(cat => {
            const active = categoryId === cat.id
            const imgSrc = cat.image_url
              ? (cat.image_url.startsWith('http') ? cat.image_url : `${API_URL}${cat.image_url}`)
              : null
            return (
              <Link
                key={cat.id}
                href={`/products?category=${cat.id}`}
                className={`flex flex-col lg:flex-row items-center gap-1 lg:gap-3 px-1 lg:px-4 py-3 border-r-2 transition-colors ${
                  active
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-transparent hover:bg-gray-50'
                }`}
              >
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                  {imgSrc ? (
                    <img src={imgSrc} alt={cat.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg">🛍️</div>
                  )}
                </div>
                <span className={`text-[10px] sm:text-[11px] lg:text-sm font-semibold text-center lg:text-left line-clamp-2 leading-tight ${active ? 'text-indigo-600' : 'text-gray-600'}`}>
                  {cat.name}
                </span>
              </Link>
            )
          })}
        </aside>

        {/* ── Products area (scrolls on its own) ── */}
        <div className="flex-1 min-w-0 overflow-y-auto px-3 lg:px-6 pt-4 pb-20 lg:pb-8">

          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-bold text-gray-900 text-base lg:text-xl">
                {search
                  ? `Results for "${search}"`
                  : activeCategory
                  ? `Buy ${activeCategory.name}`
                  : 'All Products'}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {products.length} item{products.length !== 1 ? 's' : ''}
              </p>
            </div>
            {search && (
              <Link href="/products" className="text-xs font-semibold text-indigo-500 hover:text-indigo-700">
                Clear
              </Link>
            )}
          </div>

          {/* Products grid */}
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <p className="text-4xl mb-3">🛍️</p>
              <p className="font-semibold text-gray-600">No products found</p>
              {search && <p className="text-sm mt-1">Try a different search term</p>}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {products.map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  scrollable={false}
                  width={210}
                  height={409}
                  source={activeCategory
                    ? { type: 'category', id: activeCategory.id, name: activeCategory.name }
                    : { type: 'products' }
                  }
                />
              ))}
            </div>
          )}

        </div>
      </div>
    </main>
  )
}
