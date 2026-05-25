import { headers } from 'next/headers'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import StoreHeader from '@/components/store-header'
import type { Product, Category } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface Props {
  searchParams: Promise<{ category?: string }>
}

export default async function ProductsPage({ searchParams }: Props) {
  const headersList = await headers()
  const domain = headersList.get('x-store-domain') ?? ''
  const { category: categoryId } = await searchParams

  let products: Product[] = []
  let categories: Category[] = []

  try {
    const params = categoryId ? `?category_id=${categoryId}` : ''
    const [prodData, catData] = await Promise.all([
      apiFetch<{ products: Product[] }>(`/api/storefront/products${params}`, domain),
      apiFetch<{ categories: Category[] }>('/api/storefront/categories', domain),
    ])
    products = prodData.products
    categories = catData.categories
  } catch { /* backend unavailable */ }

  const activeCategory = categories.find(c => c.id === categoryId)

  return (
    <main className="min-h-screen bg-gray-50">
      <StoreHeader domain={domain} />

      {/* Breadcrumb */}
      <div className="max-w-2xl mx-auto px-4 pt-4 flex items-center gap-2 text-sm">
        <Link href="/" className="text-[#25D366] font-medium hover:underline">Home</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-600">{activeCategory?.name ?? 'All Products'}</span>
      </div>

      {/* Category tabs */}
      {categories.length > 0 && (
        <div className="max-w-2xl mx-auto px-4 mt-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <Link
              href="/products"
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                !categoryId ? 'bg-[#25D366] text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:border-[#25D366] hover:text-[#25D366]'
              }`}
            >
              All
            </Link>
            {categories.map(cat => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.id}`}
                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  categoryId === cat.id ? 'bg-[#25D366] text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:border-[#25D366] hover:text-[#25D366]'
                }`}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-4">
        {products.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🛍️</p>
            <p className="font-medium">No products available</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map(p => (
              <Link
                key={p.id}
                href={`/products/${p.id}`}
                className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                {p.image_url ? (
                  <div className="relative h-36 overflow-hidden bg-gray-50">
                    <img
                      src={`${API_URL}${p.image_url}`}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {!p.in_stock && (
                      <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                        <span className="text-xs font-semibold text-gray-500 bg-white px-2 py-0.5 rounded-full border">Out of stock</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-36 bg-linear-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                    <span className="text-4xl">🛍️</span>
                  </div>
                )}
                <div className="p-3">
                  <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{p.name}</p>
                  {p.name_local && <p className="text-xs text-gray-400 truncate mt-0.5">{p.name_local}</p>}
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className="font-bold text-gray-900">₹{p.selling_price}</span>
                    {p.original_price != null && p.original_price > p.selling_price && (
                      <span className="text-xs text-gray-400 line-through">₹{p.original_price}</span>
                    )}
                  </div>
                  <div className="mt-2 w-full bg-[#25D366] text-white text-xs font-semibold py-1.5 rounded-lg text-center group-hover:bg-[#1ebe5d] transition-colors">
                    View
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
