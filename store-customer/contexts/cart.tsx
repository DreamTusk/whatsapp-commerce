'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { clientFetch } from '@/lib/client-api'
import { useAuth } from './auth'

interface CartContextValue {
  count: number
  refresh: () => void
}

const CartContext = createContext<CartContextValue>({ count: 0, refresh: () => {} })

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [count, setCount] = useState(0)

  const refresh = useCallback(async () => {
    if (!isAuthenticated) { setCount(0); return }
    try {
      const data = await clientFetch<{ items: { quantity: number }[] }>('/api/storefront/cart')
      setCount(data.items.reduce((sum, item) => sum + item.quantity, 0))
    } catch {
      setCount(0)
    }
  }, [isAuthenticated])

  useEffect(() => { refresh() }, [refresh])

  return (
    <CartContext.Provider value={{ count, refresh }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
