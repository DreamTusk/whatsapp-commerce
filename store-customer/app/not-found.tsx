import { headers } from 'next/headers'
import Link from 'next/link'
import { ArrowLeft } from '@deemlol/next-icons'
import { apiFetch } from '@/lib/api'
import type { Store, Category } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3010'

export default async function NotFound() {
  const headersList = await headers()
  const domain = headersList.get('x-store-domain') ?? ''

  let store: Store | null = null
  let categories: Category[] = []

  try {
    const [storeData, catData] = await Promise.all([
      apiFetch<{ store: Store }>('/api/store/info', domain),
      apiFetch<{ categories: Category[] }>('/api/storefront/categories', domain),
    ])
    store = storeData.store
    categories = catData.categories.slice(0, 6)
  } catch { /* show without data */ }

  return (
    <main className="min-h-[80vh] flex flex-col items-center justify-center page-x py-12">

      {/* Store branding */}
      {store && (
        <div className="mb-8">
          <span className="text-lg font-semibold text-gray-700">{store.name}</span>
        </div>
      )}

      {/* 404 content */}
      <p className="text-7xl font-black leading-none mb-4" style={{ color: 'color-mix(in srgb, var(--color-primary) 20%, transparent)' }}>404</p>
      <h1 className="text-xl font-bold text-gray-800 mb-2 text-center">Page not found</h1>
      <p className="text-sm text-gray-400 max-w-xs mb-8 text-center">
        The page you're looking for doesn't exist or may have been moved.
      </p>

      <Link
        href="/"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl btn-primary-filled text-sm font-semibold"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      {/* Categories */}
      {categories.length >= 3 && (
        <div className="mt-12 w-full max-w-lg">
          <p className="text-sm font-semibold text-gray-500 text-center mb-4">
            We have some useful stuff for you
          </p>
          <div className="grid grid-cols-3 gap-3">
            {categories.map(cat => {
              const imgSrc = cat.image_url
                ? (cat.image_url.startsWith('http') ? cat.image_url : `${API_URL}${cat.image_url}`)
                : null
              return (
                <Link
                  key={cat.id}
                  href={`/products?category=${cat.id}`}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-gray-100 bg-white hover:border-primary hover:shadow-md transition-all group"
                >
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                    {imgSrc ? (
                      <img src={imgSrc} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🛍️</div>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-gray-700 text-center line-clamp-2 leading-tight">
                    {cat.name}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </main>
  )
}
