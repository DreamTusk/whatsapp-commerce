import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import StoreHeader from '@/components/store-header'
import ProductCard from '@/components/product-card'
import type { Product } from '@/types'

interface CollectionData {
  id: string
  name: string
  type: string
  image_url: string | null
}

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const headersList = await headers()
  const domain = headersList.get('x-store-domain') ?? ''

  let collection: CollectionData | null = null
  let products: Product[] = []

  try {
    const data = await apiFetch<{ collection: CollectionData; products: Product[] }>(
      `/api/storefront/collections/${id}`,
      domain,
    )
    collection = data.collection
    products = data.products
  } catch {
    notFound()
  }

  return (
    <main className="min-h-screen pb-24">
      <StoreHeader domain={domain} />

      <div className="page-x pt-5 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Home</Link>
          <span className="text-gray-300 text-sm">/</span>
          <span className="text-sm text-gray-700 font-medium">{collection!.name}</span>
        </div>
        <h1 className="text-[22px] sm:text-[26px] font-bold text-gray-900 [font-family:var(--font-instrument-sans)]">
          {collection!.name}
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">{products.length} product{products.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="page-x pt-4">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <p className="text-5xl mb-4">🛍️</p>
            <p className="font-semibold text-gray-600">No products in this collection</p>
            <p className="text-sm text-gray-400 mt-1">Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {products.map(p => (
              <ProductCard
                key={p.id}
                product={p}
                scrollable={false}
                height={409}
                source={{ type: 'all' }}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
