'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

export interface SelectedAddress {
  id: string
  label: string | null
  door_no: string | null
  street: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  pincode: string | null
  latitude: number | null
  longitude: number | null
}

interface CartDrawerContextValue {
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
  selectedAddress: SelectedAddress | null
  setSelectedAddress: (addr: SelectedAddress | null) => void
}

const CartDrawerContext = createContext<CartDrawerContextValue | null>(null)

export function CartDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState<SelectedAddress | null>(null)

  return (
    <CartDrawerContext.Provider value={{
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      selectedAddress,
      setSelectedAddress,
    }}>
      {children}
    </CartDrawerContext.Provider>
  )
}

export function useCartDrawer() {
  const ctx = useContext(CartDrawerContext)
  if (!ctx) throw new Error('useCartDrawer must be used within CartDrawerProvider')
  return ctx
}
