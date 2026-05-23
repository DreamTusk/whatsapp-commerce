'use client'

import { useState } from 'react'
import AddToCartButton from './add-to-cart-button'
import WishlistButton from './wishlist-button'
import type { ProductVariant } from '@/types'

interface Props {
  productId: string
  variants: ProductVariant[]
}

export default function ProductDetailClient({ productId, variants }: Props) {
  const firstInStock = variants.find(v => v.in_stock) ?? variants[0]
  const [selectedId, setSelectedId] = useState(firstInStock?.id ?? '')

  const selected = variants.find(v => v.id === selectedId) ?? variants[0]
  if (!selected) return null

  const discount =
    selected.original_price && selected.original_price > selected.selling_price
      ? Math.round((1 - selected.selling_price / selected.original_price) * 100)
      : null

  return (
    <>
      {variants.length > 1 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Choose variant</p>
          <div className="flex flex-wrap gap-2">
            {variants.map(v => (
              <button
                key={v.id}
                onClick={() => setSelectedId(v.id)}
                disabled={!v.in_stock}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  v.id === selectedId
                    ? 'border-[#25D366] bg-[#25D366]/10 text-[#25D366]'
                    : v.in_stock
                    ? 'border-gray-200 text-gray-700 hover:border-[#25D366] hover:text-[#25D366]'
                    : 'border-gray-100 text-gray-300 cursor-not-allowed line-through'
                }`}
              >
                {v.name}{v.unit ? ` / ${v.unit}` : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-end gap-2 mt-4">
        <span className="text-3xl font-bold text-gray-900">₹{selected.selling_price}</span>
        {selected.unit && <span className="text-sm text-gray-400 mb-1">/ {selected.unit}</span>}
        {discount && (
          <span className="mb-1 text-sm font-semibold text-green-600">{discount}% off</span>
        )}
      </div>
      {selected.original_price && selected.original_price > selected.selling_price && (
        <p className="text-sm text-gray-400 line-through mt-0.5">₹{selected.original_price}</p>
      )}

      <div className="mt-3">
        {selected.in_stock ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            In stock
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-500 bg-red-50 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
            Out of stock
          </span>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg px-4 py-3 z-40">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <WishlistButton productId={productId} />
          {selected.in_stock
            ? <AddToCartButton variantId={selected.id} price={selected.selling_price} />
            : <div className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-400 font-semibold text-sm text-center">Out of stock</div>
          }
        </div>
      </div>
    </>
  )
}
