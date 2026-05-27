'use client'

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react'
import { clientFetch } from '@/lib/client-api'
import { useAuth } from './auth'
import { getGuestCart, guestCartCount, clearGuestCart } from '@/lib/guest-cart'

interface CartContextValue {
  count: number
  refresh: () => Promise<void>
  syncGuestCart: () => Promise<void>
}

const CartContext = createContext<CartContextValue>({
  count: 0,
  refresh: async () => {},
  syncGuestCart: async () => {},
})

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, initialized } = useAuth()
  const [count, setCount] = useState(0)
  const wasInitialized = useRef(false)

  const refreshFromDb = useCallback(async () => {
    try {
      const data = await clientFetch<{ items: { quantity: number }[] }>('/api/storefront/cart')
      setCount(data.items.reduce((sum, i) => sum + i.quantity, 0))
    } catch { setCount(0) }
  }, [])

  const refresh = useCallback(async () => {
    if (!isAuthenticated) { setCount(guestCartCount()); return }
    await refreshFromDb()
  }, [isAuthenticated, refreshFromDb])

  const syncGuestCart = useCallback(async () => {
    const items = getGuestCart()
    if (items.length === 0) return
    clearGuestCart()   // claim items synchronously before any await — prevents duplicate syncs
    for (const item of items) {
      await clientFetch('/api/storefront/cart', {
        method: 'POST',
        body: JSON.stringify({ product_id: item.product_id, quantity: item.quantity }),
      }).catch(() => {})
    }
    await refreshFromDb()
  }, [refreshFromDb])

  // On initial load and on auth change: refresh the cart count.
  // Guest-cart sync is handled explicitly in checkout flows (not here) to avoid double-posting.
  useEffect(() => {
    if (!initialized) return
    if (!wasInitialized.current) {
      wasInitialized.current = true
    }
    refresh()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, initialized])

  return (
    <CartContext.Provider value={{ count, refresh, syncGuestCart }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
