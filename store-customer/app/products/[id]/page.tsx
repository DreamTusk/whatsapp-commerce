import { headers } from 'next/headers'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import StoreHeader from '@/components/store-header'
import ProductDetailClient from '@/components/product-detail-client'
import type { ProductVariant } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface ProductDetail {
  id: string
  name: string
  name_local: string | null
  description: string | null
  image_url: string | null
  in_stock: boolean
  category: { id: string; name: string; name_local: string | null } | null
  variants: ProductVariant[]
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProductDetailPage({ params }: Props) {
  const headersList = await headers()
  const domain = headersList.get('x-store-domain') ?? ''
  const { id } = await params

  let product: ProductDetail | null = null

  try {
    const data = await apiFetch<{ product: ProductDetail }>(`/api/storefront/products/${id}`, domain)
    product = data.product
  } catch { /* not found or unavailable */ }

  if (!product) {
    return (
      <main className="min-h-screen bg-gray-50">
        <StoreHeader domain={domain} />
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-medium">Product not found</p>
          <Link href="/products" className="mt-4 text-sm text-[#25D366] font-medium hover:underline">
            Browse products
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-28">
      <StoreHeader domain={domain} />

      <div className="max-w-2xl mx-auto px-4 pt-4">
        <Link
          href={product.category ? `/products?category=${product.category.id}` : '/products'}
          className="inline-flex items-center gap-1.5 text-sm text-[#25D366] font-medium hover:underline"
        >
          <span>←</span>
          <span>{product.category?.name ?? 'Products'}</span>
        </Link>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Product image */}
        <div className="mt-3 mx-4 rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-100">
          {product.image_url ? (
            <img
              src={`${API_URL}${product.image_url}`}
              alt={product.name}
              className="w-full h-72 object-cover"
            />
          ) : (
            <div className="w-full h-72 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
              <span className="text-7xl">🛍️</span>
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="mx-4 mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          {product.category && (
            <span className="inline-block text-xs font-medium text-[#25D366] bg-[#25D366]/10 px-2.5 py-1 rounded-full mb-3">
              {product.category.name}
            </span>
          )}

          <h1 className="text-xl font-bold text-gray-900 leading-snug">{product.name}</h1>
          {product.name_local && (
            <p className="text-sm text-gray-400 mt-0.5">{product.name_local}</p>
          )}

          {/* Variant selector, price, stock, add to cart — all interactive */}
          <ProductDetailClient productId={product.id} variants={product.variants} />

          {product.description && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-semibold text-gray-700 mb-1">About this product</p>
              <p className="text-sm text-gray-500 leading-relaxed">{product.description}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
