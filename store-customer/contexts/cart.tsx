'use client'

import { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback, ReactNode } from 'react'
import { clientFetch } from '@/lib/client-api'
import { useAuth } from './auth'
import { getGuestCart, clearGuestCart } from '@/lib/guest-cart'

interface CartContextValue {
  count: number
  items: Record<string, number>
  refresh: () => Promise<void>
  syncGuestCart: () => Promise<void>
  setFromItems: (items: { quantity: number; product: { id: string } }[]) => void
  setQty: (productId: string, quantity: number) => void
}

const CartContext = createContext<CartContextValue>({
  count: 0,
  items: {},
  refresh: async () => {},
  syncGuestCart: async () => {},
  setFromItems: () => {},
  setQty: () => {},
})

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, initialized } = useAuth()
  const [items, setItems] = useState<Record<string, number>>({})
  const wasInitialized = useRef(false)

  // Derived from `items` so optimistic updates (setQty) can never leave count out of sync.
  const count = useMemo(() => Object.values(items).reduce((sum, q) => sum + q, 0), [items])

  const refreshFromDb = useCallback(async () => {
    try {
      const data = await clientFetch<{ items: { quantity: number; product: { id: string } }[] }>('/api/storefront/cart')
      const map: Record<string, number> = {}
      for (const i of data.items) map[i.product.id] = i.quantity
      setItems(map)
    } catch { setItems({}) }
  }, [])

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      const guestItems = getGuestCart()
      const map: Record<string, number> = {}
      for (const i of guestItems) map[i.product_id] = i.quantity
      setItems(map)
      return
    }
    await refreshFromDb()
  }, [isAuthenticated, refreshFromDb])

  const setFromItems = useCallback((items: { quantity: number; product: { id: string } }[]) => {
    const map: Record<string, number> = {}
    for (const i of items) map[i.product.id] = i.quantity
    setItems(map)
  }, [])

  const setQty = useCallback((productId: string, quantity: number) => {
    setItems(prev => {
      const next = { ...prev }
      if (quantity <= 0) delete next[productId]
      else next[productId] = quantity
      return next
    })
  }, [])

  const syncGuestCart = useCallback(async () => {
    const guestItems = getGuestCart()
    if (guestItems.length > 0) {
      clearGuestCart()   // claim items synchronously before any await — prevents duplicate syncs
      for (const item of guestItems) {
        await clientFetch('/api/storefront/cart', {
          method: 'POST',
          body: JSON.stringify({ product_id: item.product_id, quantity: item.quantity }),
        }).catch(() => {})
      }
    }
    await refreshFromDb()
  }, [refreshFromDb])

  // On initial load and on auth change: refresh the cart.
  // Signing in always tries to merge any guest-cart items first — this runs for
  // EVERY sign-in entry point (not just the cart drawer's guest-checkout button),
  // since it's tied to the isAuthenticated transition itself. syncGuestCart is
  // safe to call with an empty guest cart (falls through to a plain DB refresh)
  // and safe to call twice in a row (claims localStorage synchronously).
  useEffect(() => {
    if (!initialized) return
    if (!wasInitialized.current) {
      wasInitialized.current = true
    }
    if (isAuthenticated) {
      syncGuestCart()
    } else {
      refresh()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, initialized])

  return (
    <CartContext.Provider value={{ count, items, refresh, syncGuestCart, setFromItems, setQty }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
