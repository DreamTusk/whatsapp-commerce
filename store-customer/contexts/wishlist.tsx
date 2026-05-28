'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { clientFetch } from '@/lib/client-api'
import { useAuth } from './auth'

interface WishlistContextValue {
  has: (productId: string) => boolean
  toggle: (productId: string) => Promise<void>
}

const WishlistContext = createContext<WishlistContextValue>({
  has: () => false,
  toggle: async () => {},
})

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, initialized } = useAuth()
  const [ids, setIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!initialized) return
    if (!isAuthenticated) { setIds(new Set()); return }
    clientFetch<{ items: { product: { id: string } }[] }>('/api/storefront/wishlist')
      .then(data => setIds(new Set(data.items.map(i => i.product.id))))
      .catch(() => {})
  }, [isAuthenticated, initialized])

  const toggle = useCallback(async (productId: string) => {
    const wasWishlisted = ids.has(productId)
    setIds(prev => {
      const next = new Set(prev)
      wasWishlisted ? next.delete(productId) : next.add(productId)
      return next
    })
    try {
      if (wasWishlisted) {
        await clientFetch(`/api/storefront/wishlist/${productId}`, { method: 'DELETE' })
      } else {
        await clientFetch('/api/storefront/wishlist', { method: 'POST', body: JSON.stringify({ product_id: productId }) })
      }
    } catch {
      // revert on failure
      setIds(prev => {
        const next = new Set(prev)
        wasWishlisted ? next.add(productId) : next.delete(productId)
        return next
      })
    }
  }, [ids])

  const has = useCallback((productId: string) => ids.has(productId), [ids])

  return (
    <WishlistContext.Provider value={{ has, toggle }}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  return useContext(WishlistContext)
}
