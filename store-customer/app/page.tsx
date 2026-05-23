import { headers } from 'next/headers'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import StoreHeader from '@/components/store-header'
import type { Store, Category } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export default async function HomePage() {
  const headersList = await headers()
  const domain = headersList.get('x-store-domain') ?? ''

  let store: Store | null = null
  let categories: Category[] = []

  try {
    const data = await apiFetch<{ store: Store }>('/api/store/info', domain)
    store = data.store
  } catch {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-4xl mb-3">🏪</p>
          <p className="text-gray-500 font-medium">Store not found</p>
          <p className="text-sm text-gray-400 mt-1">Check the URL and try again</p>
        </div>
      </main>
    )
  }

  try {
    const data = await apiFetch<{ categories: Category[] }>('/api/storefront/categories', domain)
    categories = data.categories
  } catch { /* show empty */ }

  return (
    <main className="min-h-screen bg-gray-50">
      <StoreHeader domain={domain} />

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#25D366] to-[#128C7E] text-white px-4 py-8 max-w-2xl mx-auto">
        <p className="text-sm font-medium opacity-80 mb-1">Welcome to</p>
        <h1 className="text-2xl font-bold">{store.name}</h1>
        {store.address && <p className="text-sm opacity-75 mt-1">{store.address}</p>}
        {store.min_order_amount > 0 && (
          <p className="text-xs mt-3 bg-white/20 inline-block px-3 py-1 rounded-full">
            Min. order ₹{store.min_order_amount}
          </p>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {categories.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🛒</p>
            <p className="font-medium">No categories yet</p>
          </div>
        ) : (
          <>
            <h2 className="text-base font-bold text-gray-900 mb-4">Shop by category</h2>
            <div className="grid grid-cols-2 gap-3">
              {categories.map(cat => (
                <Link
                  key={cat.id}
                  href={`/products?category=${cat.id}`}
                  className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  {cat.image_url ? (
                    <div className="relative h-28 overflow-hidden">
                      <img
                        src={`${API_URL}${cat.image_url}`}
                        alt={cat.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <p className="font-semibold text-white text-sm truncate">{cat.name}</p>
                        {cat.name_local && <p className="text-xs text-white/75 truncate">{cat.name_local}</p>}
                      </div>
                    </div>
                  ) : (
                    <div className="h-28 bg-gradient-to-br from-[#25D366]/10 to-[#25D366]/5 flex flex-col items-center justify-center gap-1 p-3">
                      <span className="text-3xl">🛍️</span>
                      <p className="font-semibold text-gray-800 text-sm text-center truncate w-full">{cat.name}</p>
                      {cat.name_local && <p className="text-xs text-gray-400 text-center truncate w-full">{cat.name_local}</p>}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
