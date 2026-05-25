'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth'
import { useCart } from '@/contexts/cart'
import { clientFetch } from '@/lib/client-api'
import type { Cart, Order } from '@/types'

type LocationState = 'idle' | 'requesting' | 'granted' | 'denied'

function buildAddress(doorNo: string, street: string, city: string, state: string, country: string, pincode: string): string {
  const line1 = [doorNo, street].filter(Boolean).join(', ')
  const line2 = [city, state && pincode ? `${state} - ${pincode}` : state || pincode].filter(Boolean).join(', ')
  return [line1, line2, country].filter(Boolean).join(', ')
}

export default function CheckoutPage() {
  const { isAuthenticated, customer, requireAuth, updateCustomer } = useAuth()
  const { refresh: refreshCount } = useCart()
  const router = useRouter()

  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [altPhone, setAltPhone] = useState('')
  const [notes, setNotes] = useState('')

  const [doorNo, setDoorNo] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [addrState, setAddrState] = useState('')
  const [country, setCountry] = useState('')
  const [pincode, setPincode] = useState('')

  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [locationState, setLocationState] = useState<LocationState>('idle')

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const data = await clientFetch<Cart>('/api/storefront/cart')
      setCart(data)
    } catch {
      setCart(null)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { fetchCart() }, [fetchCart])

  useEffect(() => {
    if (customer) {
      if (customer.name) setName(customer.name)
      if (customer.phone) setPhone(customer.phone)
    }
  }, [customer])

  async function fillFromNominatim(lat: number, lon: number) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
        { headers: { 'Accept-Language': 'en' } }
      )
      if (!res.ok) return
      const data = await res.json()
      const a = data.address ?? {}
      setStreet(a.road ?? a.suburb ?? a.neighbourhood ?? '')
      setCity(a.city ?? a.town ?? a.village ?? a.county ?? '')
      setAddrState(a.state ?? '')
      setPincode(a.postcode ?? '')
      setCountry(a.country ?? '')
    } catch {
      // Nominatim failed — fields stay empty, lat/lon still captured
    }
  }

  function requestLocation() {
    if (!navigator.geolocation) { setLocationState('denied'); return }
    setLocationState('requesting')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        setLatitude(lat)
        setLongitude(lon)
        setLocationState('granted')
        await fillFromNominatim(lat, lon)
      },
      () => setLocationState('denied'),
      { timeout: 10000 }
    )
  }

  function handlePlaceOrderClick() {
    if (!cart || cart.items.length === 0) return
    const combined = buildAddress(doorNo, street, city, addrState, country, pincode)
    if (!combined.trim()) { setError('Delivery address is required'); return }
    setError('')
    setConfirmOpen(true)
  }

  async function confirmOrder() {
    setPlacing(true)
    try {
      const combined = buildAddress(doorNo, street, city, addrState, country, pincode)
      const items = cart!.items.map(i => ({ product_id: i.product.id, quantity: i.quantity }))
      const body: Record<string, unknown> = {
        items,
        address: combined,
        name: name.trim() || undefined,
        door_no: doorNo.trim() || undefined,
        street: street.trim() || undefined,
        city: city.trim() || undefined,
        state: addrState.trim() || undefined,
        country: country.trim() || undefined,
        pincode: pincode.trim() || undefined,
        notes: notes.trim() || undefined,
        alt_phone: altPhone.trim() || undefined,
        payment_method: 'COD',
      }
      if (latitude !== null && longitude !== null) {
        body.latitude = latitude
        body.longitude = longitude
      }
      const data = await clientFetch<{ order: Order }>('/api/storefront/orders', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      updateCustomer({ name: name.trim() || undefined, address: combined })
      refreshCount()
      setConfirmOpen(false)
      router.push(`/orders/${data.order.id}`)
    } catch (e: unknown) {
      setConfirmOpen(false)
      setError((e as { error?: string })?.error ?? 'Failed to place order')
    } finally {
      setPlacing(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl mb-3">🔐</p>
          <p className="font-bold text-gray-900 mb-1">Sign in to checkout</p>
          <button
            onClick={() => requireAuth(() => {})}
            className="mt-4 bg-[#25D366] text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-[#1ebe5d] transition-colors"
          >
            Sign in
          </button>
        </div>
      </main>
    )
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#25D366] border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  const items = cart?.items ?? []

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl mb-3">🛒</p>
          <p className="font-bold text-gray-900 mb-1">Your cart is empty</p>
          <button
            onClick={() => router.push('/products')}
            className="mt-4 bg-[#25D366] text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-[#1ebe5d] transition-colors"
          >
            Browse products
          </button>
        </div>
      </main>
    )
  }

  const addressPreview = buildAddress(doorNo, street, city, addrState, country, pincode)

  return (
    <main className="min-h-screen bg-gray-50 pb-32">
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <button onClick={() => router.back()} className="text-sm text-[#25D366] font-medium mb-4 hover:underline">
          ← Back to cart
        </button>

        <h1 className="text-xl font-bold text-gray-900 mb-5">Checkout</h1>

        {/* Order summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Order summary</p>
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {item.product.name}
                  {' '}<span className="text-gray-400">× {item.quantity}</span>
                </span>
                <span className="font-medium text-gray-900">₹{item.product.selling_price * item.quantity}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between">
            <span className="font-semibold text-gray-900">Total</span>
            <span className="font-bold text-gray-900">₹{cart?.total ?? 0}</span>
          </div>
        </div>

        {/* Contact details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 space-y-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contact details</p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Your name <span className="text-gray-400 font-normal text-xs">(optional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone number</label>
            <input
              type="tel"
              value={phone}
              readOnly
              className="w-full h-11 px-3 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Alternate phone <span className="text-gray-400 font-normal text-xs">(optional)</span>
            </label>
            <input
              type="tel"
              value={altPhone}
              onChange={e => setAltPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
            />
          </div>
        </div>

        {/* Delivery address */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Delivery address <span className="text-red-500">*</span></p>
            {/* Location button */}
            <button
              type="button"
              onClick={requestLocation}
              disabled={locationState === 'requesting'}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                locationState === 'granted'
                  ? 'bg-green-50 text-green-600 hover:bg-green-100'
                  : locationState === 'denied'
                  ? 'bg-red-50 text-red-500 cursor-not-allowed'
                  : locationState === 'requesting'
                  ? 'bg-gray-100 text-gray-400 cursor-wait'
                  : 'bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20'
              }`}
            >
              {locationState === 'granted' ? (
                <>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  Address filled
                </>
              ) : locationState === 'requesting' ? (
                <>
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                  Getting location…
                </>
              ) : locationState === 'denied' ? (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  Location denied
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Use my location
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Door / Flat no. <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={doorNo}
                onChange={e => setDoorNo(e.target.value)}
                placeholder="e.g. 4B, Flat 12"
                className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Pincode</label>
              <input
                type="text"
                value={pincode}
                onChange={e => setPincode(e.target.value)}
                placeholder="e.g. 600001"
                className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Street / Area</label>
            <input
              type="text"
              value={street}
              onChange={e => setStreet(e.target.value)}
              placeholder="e.g. Anna Nagar, 2nd Cross Street"
              className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="e.g. Chennai"
                className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
              <input
                type="text"
                value={addrState}
                onChange={e => setAddrState(e.target.value)}
                placeholder="e.g. Tamil Nadu"
                className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Country</label>
            <input
              type="text"
              value={country}
              onChange={e => setCountry(e.target.value)}
              placeholder="e.g. India"
              className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-2">
            Delivery notes <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any special instructions?"
            className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
          />
        </div>

        {/* Payment method */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Payment</p>
          <div className="flex items-center gap-3 p-3 bg-[#25D366]/5 border border-[#25D366]/20 rounded-xl">
            <div className="w-8 h-8 bg-[#25D366]/10 rounded-lg flex items-center justify-center text-lg">💵</div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Cash on delivery</p>
              <p className="text-xs text-gray-400">Pay when your order arrives</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>

      {/* Place order bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg px-4 py-3 z-40">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <div className="flex-1">
            <p className="text-xs text-gray-400">Total</p>
            <p className="text-lg font-bold text-gray-900">₹{cart?.total ?? 0}</p>
          </div>
          <button
            onClick={handlePlaceOrderClick}
            className="flex-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            Place order
          </button>
        </div>
      </div>

      {/* Confirm order modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Confirm your order</h2>
            <p className="text-sm text-gray-500 mb-4">Please review before placing</p>

            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Items</span>
                <span className="font-medium text-gray-900">{items.length} item{items.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total</span>
                <span className="font-bold text-gray-900">₹{cart?.total ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Payment</span>
                <span className="text-gray-700">Cash on delivery</span>
              </div>
              {locationState === 'granted' && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Location</span>
                  <span className="text-green-600 text-xs font-medium">Shared ✓</span>
                </div>
              )}
              {addressPreview && (
                <div className="pt-1.5 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-0.5">Deliver to</p>
                  <p className="text-sm text-gray-700">{addressPreview}</p>
                </div>
              )}
              {altPhone && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Alt. phone</span>
                  <span className="text-gray-700">{altPhone}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={placing}
                className="flex-1 h-11 border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Go back
              </button>
              <button
                onClick={confirmOrder}
                disabled={placing}
                className="flex-2 h-11 bg-[#25D366] hover:bg-[#1ebe5d] disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                {placing ? 'Placing…' : 'Confirm & place order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
