'use client'

import AddToCartButton from './add-to-cart-button'
import WishlistButton from './wishlist-button'

interface Props {
  productId: string
  sellingPrice: number
  originalPrice: number | null
  inStock: boolean
}

export default function ProductDetailClient({ productId, sellingPrice, originalPrice, inStock }: Props) {
  const discount =
    originalPrice && originalPrice > sellingPrice
      ? Math.round((1 - sellingPrice / originalPrice) * 100)
      : null

  return (
    <>
      <div className="flex items-end gap-2 mt-4">
        <span className="text-3xl font-bold text-gray-900">₹{sellingPrice}</span>
        {discount && (
          <span className="mb-1 text-sm font-semibold text-green-600">{discount}% off</span>
        )}
      </div>
      {originalPrice && originalPrice > sellingPrice && (
        <p className="text-sm text-gray-400 line-through mt-0.5">₹{originalPrice}</p>
      )}

      <div className="mt-3">
        {inStock ? (
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
          {inStock
            ? <AddToCartButton productId={productId} price={sellingPrice} />
            : <div className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-400 font-semibold text-sm text-center">Out of stock</div>
          }
        </div>
      </div>
    </>
  )
}
