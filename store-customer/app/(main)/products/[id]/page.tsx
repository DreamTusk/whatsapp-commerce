import { headers } from 'next/headers'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import ProductDetailClient from '@/components/product-detail-client'
import type { Product } from '@/types'
import type { ProductCardSource } from '@/components/product-card'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string; catId?: string; catName?: string; colId?: string; colName?: string }>
}

export default async function ProductDetailPage({ params, searchParams }: Props) {
  const headersList = await headers()
  const domain = headersList.get('x-store-domain') ?? ''
  const { id } = await params
  const { from, catId, catName, colId, colName } = await searchParams

  let product: Product | null = null

  try {
    const data = await apiFetch<{ product: Product }>(`/api/storefront/products/${id}`, domain)
    product = data.product
  } catch { /* not found or unavailable */ }

  if (!product) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-medium">Product not found</p>
          <Link href="/products" className="mt-4 text-sm text-indigo-500 font-medium hover:underline">
            Browse products
          </Link>
        </div>
      </main>
    )
  }

  // Build breadcrumbs based on navigation source
  const breadcrumbs: { label: string; href: string | null }[] = [
    { label: 'Home', href: '/' },
  ]

  if (colId && colName) {
    breadcrumbs.push({ label: decodeURIComponent(colName), href: `/collection/${colId}` })
  } else if (catId && catName) {
    breadcrumbs.push({ label: decodeURIComponent(catName), href: `/products?category=${catId}` })
  } else if (from === 'all') {
    breadcrumbs.push({ label: 'All Products', href: '/products' })
  } else if (from === 'products') {
    breadcrumbs.push({ label: 'Products', href: '/products' })
  } else if (product.category) {
    breadcrumbs.push({ label: product.category.name, href: `/products?category=${product.category.id}` })
  } else {
    breadcrumbs.push({ label: 'Products', href: '/products' })
  }

  breadcrumbs.push({ label: product.name, href: null })

  // Fetch related products
  let relatedProducts: Product[] = []
  let relatedSource: ProductCardSource | undefined

  try {
    if (colId) {
      // From a collection — show other products in that collection
      const data = await apiFetch<{ products: Product[] }>(`/api/storefront/collections/${colId}`, domain)
      relatedProducts = (data.products ?? []).filter(p => p.id !== product!.id).slice(0, 10)
      relatedSource = { type: 'collection', id: colId, name: colName ? decodeURIComponent(colName) : '' }
    } else if (product.category_id) {
      // No collection — show products from the same category
      const data = await apiFetch<{ products: Product[] }>(`/api/storefront/products?category_id=${product.category_id}`, domain)
      relatedProducts = (data.products ?? []).filter(p => p.id !== product!.id).slice(0, 10)
      relatedSource = product.category
        ? { type: 'category', id: product.category.id, name: product.category.name }
        : { type: 'all' }
    }
  } catch { /* related products are optional */ }

  return (
    <main>
      <ProductDetailClient
        productId={product.id}
        productName={product.name}
        productImage={product.image_url ?? null}
        images={product.images ?? []}
        sellingPrice={product.selling_price}
        originalPrice={product.original_price ?? null}
        inStock={product.in_stock}
        unit={product.unit ?? null}
        description={product.description ?? null}
        categoryName={product.category?.name ?? null}
        breadcrumbs={breadcrumbs}
        relatedProducts={relatedProducts}
        relatedSource={relatedSource}
      />
    </main>
  )
}
