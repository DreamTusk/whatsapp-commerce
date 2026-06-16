'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useCartDrawer, type SelectedAddress } from '@/contexts/cart-drawer'
import { useCart } from '@/contexts/cart'
import { useAuth } from '@/contexts/auth'
import { clientFetch } from '@/lib/client-api'
import { getGuestCart, updateGuestQty, type GuestCartItem } from '@/lib/guest-cart'
import { X, ChevronRight, Plus } from "@deemlol/next-icons"
import type { Cart, CustomerAddress } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export default function CartDrawer() {
  const { isOpen, closeCart, selectedAddress, setSelectedAddress } = useCartDrawer()
  const { refresh: refreshCount, syncGuestCart } = useCart()
  const { isAuthenticated, requireAuth } = useAuth()
  const router = useRouter()

  const [guestItems, setGuestItems] = useState<GuestCartItem[]>([])
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  const [addresses, setAddresses] = useState<CustomerAddress[]>([])
  const [showAddressPicker, setShowAddressPicker] = useState(false)
  const [loadingAddresses, setLoadingAddresses] = useState(false)
  const selectedAddressRef = useRef(selectedAddress)
  selectedAddressRef.current = selectedAddress

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) { setCart(null); return }
    setLoading(true)
    try {
      const data = await clientFetch<Cart>('/api/storefront/cart')
      setCart(data)
    } catch {
      setCart(null)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  const fetchAddresses = useCallback(async () => {
    if (!isAuthenticated) return
    setLoadingAddresses(true)
    try {
      const data = await clientFetch<{ addresses: CustomerAddress[] }>('/api/storefront/addresses')
      setAddresses(data.addresses)
      return data.addresses
    } catch {
      setAddresses([])
      return []
    } finally {
      setLoadingAddresses(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!isOpen) return
    if (!isAuthenticated) {
      setGuestItems(getGuestCart())
      return
    }
    fetchCart()
    fetchAddresses().then(addrs => {
      if (!addrs?.length || selectedAddressRef.current) return
      const def = addrs.find(a => a.is_default) ?? addrs[0]
      if (def) setSelectedAddress({ id: def.id, label: def.label, door_no: def.door_no, street: def.street, address: def.address, city: def.city, state: def.state, country: def.country, pincode: def.pincode, latitude: def.latitude, longitude: def.longitude })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isAuthenticated])

  // Prevent body scroll when drawer open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      setShowAddressPicker(false)
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  async function updateQty(productId: string, qty: number) {
    setUpdating(productId)
    try {
      if (qty === 0) {
        await clientFetch(`/api/storefront/cart/${productId}`, { method: 'DELETE' })
      } else {
        await clientFetch(`/api/storefront/cart/${productId}`, {
          method: 'PATCH',
          body: JSON.stringify({ quantity: qty }),
        })
      }
      await fetchCart()
      refreshCount()
    } catch { /* silent */ } finally {
      setUpdating(null)
    }
  }

  function pickAddress(addr: CustomerAddress) {
    const sel: SelectedAddress = { id: addr.id, label: addr.label, door_no: addr.door_no, street: addr.street, address: addr.address, city: addr.city, state: addr.state, country: addr.country, pincode: addr.pincode, latitude: addr.latitude, longitude: addr.longitude }
    setSelectedAddress(sel)
    setShowAddressPicker(false)
  }

  function guestUpdateQtyLocal(productId: string, qty: number) {
    updateGuestQty(productId, qty)
    setGuestItems(getGuestCart())
    refreshCount()
  }

  function handleGuestCheckout() {
    requireAuth(async () => {
      await syncGuestCart()
      closeCart()
      router.push('/checkout')
    })
  }

  function handleCheckout() {
    closeCart()
    router.push('/checkout')
  }

  const items = cart?.items ?? []
  const subtotal = cart?.total ?? 0

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
          onClick={closeCart}
        />
      )}

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm z-50 bg-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-bold text-gray-900 text-base">Your Cart</h2>
            {items.length > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">{items.length} item{items.length !== 1 ? 's' : ''}</p>
            )}
          </div>
          <button
            onClick={closeCart}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">

          {/* Guest cart (not authenticated) */}
          {!isAuthenticated ? (
            guestItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-6 text-center">
                <div className="text-5xl mb-4">🛒</div>
                <p className="font-semibold text-gray-900 mb-1">Your cart is empty</p>
                <p className="text-sm text-gray-400 mb-6">Browse products and add items to get started</p>
                <button
                  onClick={() => { closeCart(); router.push('/products') }}
                  className="btn-primary-filled font-semibold px-6 py-2.5 rounded-xl text-sm"
                >
                  Browse products
                </button>
              </div>
            ) : (
              <div className="px-4 pt-3 pb-4 space-y-3">
                {guestItems.map(item => (
                  <div key={item.product_id} className="flex items-center gap-3 py-2">
                    {item.image_url ? (
                      <img
                        src={item.image_url.startsWith('http') ? item.image_url : `${API_URL}${item.image_url}`}
                        alt={item.name}
                        className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-gray-100"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">🛍️</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">₹{item.selling_price} each</p>
                      <p className="text-sm font-bold text-gray-900 mt-0.5">₹{item.selling_price * item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => guestUpdateQtyLocal(item.product_id, item.quantity - 1)}
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-primary hover:opacity-70 transition-colors text-base leading-none">−</button>
                      <span className="w-5 text-center text-sm font-semibold text-gray-900">{item.quantity}</span>
                      <button onClick={() => guestUpdateQtyLocal(item.product_id, item.quantity + 1)}
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-primary hover:opacity-70 transition-colors text-base leading-none">+</button>
                    </div>
                  </div>
                ))}

                <div className="border-t border-dashed border-gray-200 my-2" />
                <div className="flex justify-between text-sm font-bold text-gray-900 pt-1">
                  <span>Total</span>
                  <span>₹{guestItems.reduce((s, i) => s + i.selling_price * i.quantity, 0)}</span>
                </div>
              </div>
            )
          ) : loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin spinner-primary" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6 text-center">
              <div className="text-5xl mb-4">🛒</div>
              <p className="font-semibold text-gray-900 mb-1">Your cart is empty</p>
              <p className="text-sm text-gray-400 mb-6">Browse products and add items to get started</p>
              <button
                onClick={() => { closeCart(); router.push('/products') }}
                className="btn-primary-filled font-semibold px-6 py-2.5 rounded-xl text-sm"
              >
                Browse products
              </button>
            </div>
          ) : (
            <div className="px-4 pt-3 pb-4 space-y-3">
              {/* Cart items */}
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-3 py-2">
                  <button
                    onClick={() => { closeCart(); router.push(`/products/${item.product.id}`) }}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    {item.product.image_url ? (
                      <img
                        src={item.product.image_url.startsWith('http') ? item.product.image_url : `${API_URL}${item.product.image_url}`}
                        alt={item.product.name}
                        className="w-14 h-14 rounded-xl object-cover border border-gray-100 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">
                        🛍️
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{item.product.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">₹{item.product.selling_price} each</p>
                      <p className="text-sm font-bold text-gray-900 mt-0.5">
                        ₹{item.product.selling_price * item.quantity}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      disabled={updating === item.product.id}
                      onClick={() => updateQty(item.product.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-primary hover:opacity-70 transition-colors disabled:opacity-40 text-base leading-none"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-sm font-semibold text-gray-900">
                      {updating === item.product.id ? '…' : item.quantity}
                    </span>
                    <button
                      disabled={updating === item.product.id}
                      onClick={() => updateQty(item.product.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-primary hover:opacity-70 transition-colors disabled:opacity-40 text-base leading-none"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}

              {/* Divider */}
              <div className="border-t border-dashed border-gray-200 my-2" />

              {/* Bill summary */}
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">Bill Summary</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span>
                    <span>₹{subtotal}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Delivery</span>
                    <span className="text-green-600 font-medium">Free</span>
                  </div>
                  <div className="border-t border-gray-100 pt-1.5 flex justify-between text-sm font-bold text-gray-900">
                    <span>Total</span>
                    <span>₹{subtotal}</span>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-gray-200 my-2" />

              {/* Delivery address section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-900">Delivery Address</p>
                  {addresses.length > 0 && (
                    <button
                      onClick={() => setShowAddressPicker(v => !v)}
                      className="text-xs c-primary font-medium hover:opacity-70 transition-opacity"
                    >
                      {showAddressPicker ? 'Cancel' : 'Change'}
                    </button>
                  )}
                </div>

                {loadingAddresses ? (
                  <div className="h-10 flex items-center">
                    <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin spinner-primary" />
                  </div>
                ) : showAddressPicker ? (
                  <div className="space-y-2">
                    {addresses.map(addr => (
                      <button
                        key={addr.id}
                        onClick={() => pickAddress(addr)}
                        className={`w-full text-left p-3 rounded-xl border transition-colors ${selectedAddress?.id === addr.id ? 'border-primary bg-gray-50' : 'border-gray-200 hover:border-primary hover:bg-gray-50'}`}
                      >
                        {addr.label && (
                          <p className="text-xs font-semibold text-gray-700 mb-0.5">{addr.label}</p>
                        )}
                        <p className="text-xs text-gray-500 leading-snug">
                          {[addr.address, addr.street, addr.city, addr.pincode].filter(Boolean).join(', ')}
                        </p>
                      </button>
                    ))}
                    <button
                      onClick={() => { closeCart(); router.push('/checkout') }}
                      className="w-full text-left p-3 rounded-xl border border-dashed border-primary c-primary text-xs font-medium hover:opacity-80 transition-opacity"
                    >
                      + Add new address
                    </button>
                  </div>
                ) : selectedAddress ? (
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    {selectedAddress.label && (
                      <p className="text-xs font-semibold text-gray-700 mb-0.5">{selectedAddress.label}</p>
                    )}
                    <p className="text-xs text-gray-500 leading-snug">
                      {[selectedAddress.address, selectedAddress.city, selectedAddress.pincode].filter(Boolean).join(', ')}
                    </p>
                    {addresses.length > 1 && (
                      <button
                        onClick={() => setShowAddressPicker(true)}
                        className="text-xs c-primary font-medium mt-1.5 hover:opacity-70 transition-opacity"
                      >
                        Change address
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => addresses.length > 0 ? setShowAddressPicker(true) : (closeCart(), router.push('/checkout'))}
                    className="w-full flex items-center gap-2 p-3 rounded-xl border border-dashed border-primary c-primary text-sm font-medium hover:opacity-80 transition-opacity"
                  >
                    <Plus className="w-4 h-4" />
                    {addresses.length > 0 ? 'Select delivery address' : 'Add delivery address'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer — Guest checkout */}
        {!isAuthenticated && guestItems.length > 0 && (
          <div className="flex-shrink-0 px-4 py-4 border-t border-gray-100 bg-white">
            <p className="text-xs text-gray-400 text-center mb-2">Sign in to place your order</p>
            <button
              onClick={handleGuestCheckout}
              className="w-full flex items-center justify-between btn-primary-filled font-semibold py-3.5 px-5 rounded-2xl text-sm"
            >
              <span>Sign in &amp; Checkout</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Footer — Authenticated checkout */}
        {isAuthenticated && items.length > 0 && (
          <div className="flex-shrink-0 px-4 py-4 border-t border-gray-100 bg-white">
            <button
              onClick={handleCheckout}
              className="w-full flex items-center justify-between btn-primary-filled font-semibold py-3.5 px-5 rounded-2xl text-sm"
            >
              <span>Proceed to Checkout</span>
              <div className="flex items-center gap-2">
                <span className="font-bold">₹{subtotal}</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        )}
      </div>
    </>
  )
}
