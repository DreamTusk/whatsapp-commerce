'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Pencil, ImagePlus, Loader2, ArrowLeft, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'
import type { Product } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-3 border-b border-gray-100 last:border-0">
      <span className="text-base text-gray-400 w-36 flex-shrink-0">{label}</span>
      <span className="text-base text-gray-900 flex-1">{children}</span>
    </div>
  )
}

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
    return (
      <div className="flex items-center justify-center py-40">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-40 text-gray-400">
        <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-lg font-medium">Product not found</p>
        <button onClick={() => router.back()} className="mt-3 text-sm text-[#6366f1] hover:underline cursor-pointer">Go back</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard/products')}
            className="flex items-center gap-1.5 text-base text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Products
          </button>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/products/${id}/edit`)}
            className="gap-1.5"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0 bg-white">
        <div className="flex justify-center px-6 py-8">
          <div className="w-full max-w-2xl space-y-8">

            {/* Name */}
            <h1 className="text-[26px] font-bold text-gray-900">{product.name}</h1>

            {/* Image + status badges */}
            <div className="flex items-start gap-6">
              {product.image_url ? (
                <img
                  src={product.image_url.startsWith('http') ? product.image_url : `${API_URL}${product.image_url}`}
                  alt={product.name}
                  className="w-32 h-32 rounded-2xl object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-32 h-32 rounded-2xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <ImagePlus className="w-10 h-10 text-gray-300" />
                </div>
              )}
              <div className="pt-1 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                    product.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {product.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                    product.in_stock ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                  }`}>
                    {product.in_stock ? 'In stock' : 'Out of stock'}
                  </span>
                </div>
                {product.description && (
                  <p className="text-base text-gray-500 leading-relaxed">{product.description}</p>
                )}
              </div>
            </div>

            {/* Details rows */}
            <div>
              <Row label="Category">{product.category.name}</Row>
              {product.brand && (
                <Row label="Brand">{product.brand.name}</Row>
              )}
              <Row label="Selling price">
                <span className="font-semibold">₹{product.selling_price}</span>
              </Row>
              {product.original_price != null && product.original_price > product.selling_price && (
                <Row label="Original price">
                  <span className="line-through text-gray-400">₹{product.original_price}</span>
                  {product.discount_percent != null && (
                    <span className="ml-2 text-green-600 font-medium">{product.discount_percent}% off</span>
                  )}
                </Row>
              )}
              {product.unit && (
                <Row label="Unit">{product.unit}</Row>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
