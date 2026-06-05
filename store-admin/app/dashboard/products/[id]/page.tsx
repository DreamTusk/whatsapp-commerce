'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Pencil, ImagePlus, Loader2, ArrowLeft, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'
import type { Product } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProduct = useCallback(async () => {
    try {
      const res = await api.get(`/api/products/${id}`)
      setProduct(res.data.product)
    } catch {
      toast.error('Failed to load product')
    }
  }, [id])

  useEffect(() => {
    fetchProduct().finally(() => setLoading(false))
  }, [fetchProduct])

  if (loading) {
    return <div className="flex items-center justify-center py-40"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
  }

  if (!product) {
    return (
      <div className="text-center py-40 text-gray-400">
        <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-lg font-medium">Product not found</p>
        <button onClick={() => router.back()} className="mt-3 text-sm text-[#6366f1] hover:underline">Go back</button>
      </div>
    )
  }

  const imageUrl = product.image_url
    ? (product.image_url.startsWith('http') ? product.image_url : `${API_URL}${product.image_url}`)
    : null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-5 pb-4 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <button onClick={() => router.push('/dashboard/products')} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-3.5 h-3.5" /> Products
          </button>
          <Button variant="outline" onClick={() => router.push(`/dashboard/products/${id}/edit`)} className="gap-1.5 h-9 text-sm">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="grid grid-cols-2 gap-4 mb-4">

            {/* Image card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-gray-900">Image</h2>
                <div className="mt-2 border-t border-gray-100" />
              </div>
              {imageUrl ? (
                <img src={imageUrl} alt={product.name} className="w-full aspect-square object-cover rounded-xl" />
              ) : (
                <div className="w-full aspect-square rounded-xl bg-gray-100 flex items-center justify-center">
                  <ImagePlus className="w-12 h-12 text-gray-300" />
                </div>
              )}
            </div>

            {/* Product info card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Product Information</h2>
                <div className="mt-2 border-t border-gray-100" />
              </div>

              <div>
                <p className="text-xl font-bold text-gray-900 leading-snug">{product.name}</p>
                {product.description && (
                  <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{product.description}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${product.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  {product.is_active ? 'Active' : 'Inactive'}
                </span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${product.in_stock ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                  {product.in_stock ? 'In stock' : 'Out of stock'}
                </span>
              </div>

              <div className="space-y-2.5 pt-1">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-28 flex-shrink-0">Category</span>
                  <span className="text-sm text-gray-900">{product.category.name}</span>
                </div>
                {product.brand && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-28 flex-shrink-0">Brand</span>
                    <span className="text-sm text-gray-900">{product.brand.name}</span>
                  </div>
                )}
                {product.unit && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-28 flex-shrink-0">Unit</span>
                    <span className="text-sm text-gray-900">{product.unit}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pricing card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Pricing</h2>
              <div className="mt-2 border-t border-gray-100" />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-gray-400 mb-1">Selling price</p>
                <p className="text-2xl font-bold text-gray-900">₹{product.selling_price}</p>
              </div>
              {product.original_price != null && product.original_price > product.selling_price && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Original price</p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg text-gray-400 line-through">₹{product.original_price}</p>
                    {product.discount_percent != null && (
                      <span className="text-sm font-semibold text-green-600">{product.discount_percent}% off</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pb-4" />
        </div>
      </div>
    </div>
  )
}
