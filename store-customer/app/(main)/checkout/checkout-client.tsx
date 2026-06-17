'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth'
import { useCart } from '@/contexts/cart'
import { useCartDrawer } from '@/contexts/cart-drawer'
import { clientFetch } from '@/lib/client-api'
import type { Cart, Order, Store } from '@/types'
import { Check, X, MapPin, CreditCard, Smartphone, Truck, House } from "@deemlol/next-icons"

type LocationState = 'idle' | 'requesting' | 'granted' | 'denied'
type PaymentMethod = 'COD' | 'ONLINE'
type DeliveryType = 'PICKUP' | 'HOME_DELIVERY'

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) { resolve(true); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

function buildAddress(doorNo: string, street: string, city: string, state: string, country: string, pincode: string): string {
  const line1 = [doorNo, street].filter(Boolean).join(', ')
  const line2 = [city, state && pincode ? `${state} - ${pincode}` : state || pincode].filter(Boolean).join(', ')
  return [line1, line2, country].filter(Boolean).join(', ')
}

const inputCls = 'w-full h-11 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-[var(--color-primary)] transition-colors bg-white'
const inputSmCls = 'w-full h-10 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-[var(--color-primary)] transition-colors bg-white'

export default function CheckoutClient() {
  const { isAuthenticated, customer, requireAuth, updateCustomer } = useAuth()
  const { refresh: refreshCount } = useCart()
  const { selectedAddress } = useCartDrawer()
  const router = useRouter()

  const [cart, setCart] = useState<Cart | null>(null)
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState('')

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD')
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('HOME_DELIVERY')
  const [expectedPickupTime, setExpectedPickupTime] = useState('')
  const [deliveryNotes, setDeliveryNotes] = useState('')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [altPhone, setAltPhone] = useState('')

  const [doorNo, setDoorNo] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [addrState, setAddrState] = useState('')
  const [country, setCountry] = useState('')
  const [pincode, setPincode] = useState('')

  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [locationState, setLocationState] = useState<LocationState>('idle')

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const [cartData, storeData] = await Promise.all([
        clientFetch<Cart>('/api/storefront/cart'),
        clientFetch<{ store: Store }>('/api/storefront/store'),
      ])
      setCart(cartData)
      setStore(storeData.store)
    } catch {
      setCart(null)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (!store) return
    if (!store.is_home_delivery_enabled && store.is_pickup_enabled) {
      setDeliveryType('PICKUP')
    } else {
      setDeliveryType('HOME_DELIVERY')
    }
  }, [store])

  useEffect(() => {
    if (customer) {
      if (customer.name) setName(customer.name)
      if (customer.phone) setPhone(customer.phone)
    }
  }, [customer])

  useEffect(() => {
    if (selectedAddress) {
      setDoorNo(selectedAddress.door_no ?? '')
      setStreet(selectedAddress.street ?? '')
      setCity(selectedAddress.city ?? '')
      setAddrState(selectedAddress.state ?? '')
      setCountry(selectedAddress.country ?? '')
      setPincode(selectedAddress.pincode ?? '')
      if (selectedAddress.latitude !== null) setLatitude(selectedAddress.latitude)
      if (selectedAddress.longitude !== null) setLongitude(selectedAddress.longitude)
      if (selectedAddress.latitude !== null && selectedAddress.longitude !== null) {
        setLocationState('granted')
      }
    }
  }, [selectedAddress])

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
    } catch { /* Nominatim failed — fields stay empty */ }
  }

  function requestLocation() {
    if (!navigator.geolocation) { setLocationState('denied'); return }
    setLocationState('requesting')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        setLatitude(lat); setLongitude(lon)
        setLocationState('granted')
        await fillFromNominatim(lat, lon)
      },
      () => setLocationState('denied'),
      { timeout: 10000 }
    )
  }

  function handlePlaceOrderClick() {
    if (!cart || cart.items.length === 0) return
    if (deliveryType === 'HOME_DELIVERY') {
      const combined = buildAddress(doorNo, street, city, addrState, country, pincode)
      if (!combined.trim()) { setError('Delivery address is required'); return }
    }
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
        delivery_type: deliveryType,
        delivery_notes: deliveryNotes.trim() || undefined,
        name: name.trim() || undefined,
        alt_phone: altPhone.trim() || undefined,
        payment_method: paymentMethod,
      }
      if (deliveryType === 'PICKUP') {
        if (expectedPickupTime) body.expected_pickup_time = new Date(expectedPickupTime).toISOString()
      } else {
        body.address = combined
        body.door_no = doorNo.trim() || undefined
        body.street = street.trim() || undefined
        body.city = city.trim() || undefined
        body.state = addrState.trim() || undefined
        body.country = country.trim() || undefined
        body.pincode = pincode.trim() || undefined
        if (latitude !== null && longitude !== null) {
          body.latitude = latitude
          body.longitude = longitude
        }
      }

      const data = await clientFetch<{
        order: Order
        razorpay_order_id?: string
        razorpay_key_id?: string
        amount_paise?: number
      }>('/api/storefront/orders', {
        method: 'POST',
        body: JSON.stringify(body),
      })

      setConfirmOpen(false)

      if (paymentMethod === 'ONLINE' && data.razorpay_order_id && data.razorpay_key_id) {
        // Load script and open Razorpay modal — setPlacing stays true until handled
        const loaded = await loadRazorpayScript()
        if (!loaded) {
          setError('Failed to load payment gateway. Please try again.')
          setPlacing(false)
          return
        }

        const rzp = new (window as any).Razorpay({
          key: data.razorpay_key_id,
          amount: data.amount_paise,
          currency: 'INR',
          order_id: data.razorpay_order_id,
          name: store?.name ?? 'Store',
          description: 'Order payment',
          image: store?.logo ?? undefined,
          prefill: {
            name: name.trim() || undefined,
            contact: phone || undefined,
          },
          theme: { color: '#6366f1' },
          handler: async (response: {
            razorpay_order_id: string
            razorpay_payment_id: string
            razorpay_signature: string
          }) => {
            try {
              await clientFetch(`/api/storefront/orders/${data.order.id}/verify-payment`, {
                method: 'POST',
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              })
              updateCustomer({ name: name.trim() || undefined })
              refreshCount()
              router.push(`/account?tab=orders&orderId=${data.order.id}`)
            } catch {
              setError('Payment verification failed. Please contact support with your order ID.')
              setPlacing(false)
            }
          },
          modal: {
            ondismiss: () => {
              setError('Payment was cancelled. Your order is saved — you can retry from the orders page.')
              setPlacing(false)
            },
          },
        })

        rzp.open()
        return
      }

      // COD flow
      updateCustomer({ name: name.trim() || undefined, address: combined })
      refreshCount()
      router.push(`/account?tab=orders&orderId=${data.order.id}`)
    } catch (e: unknown) {
      setConfirmOpen(false)
      setError((e as { error?: string })?.error ?? 'Failed to place order')
    } finally {
      if (paymentMethod === 'COD') setPlacing(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl mb-3">🔐</p>
          <p className="font-bold text-gray-900 mb-1">Sign in to checkout</p>
          <button onClick={() => requireAuth(() => {})}
            className="mt-4 btn-primary-filled font-semibold px-6 py-2.5 rounded-xl text-sm">
            Sign in
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin spinner-primary" />
      </div>
    )
  }

  const items = cart?.items ?? []

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl mb-3">🛒</p>
          <p className="font-bold text-gray-900 mb-1">Your cart is empty</p>
          <button onClick={() => router.push('/products')}
            className="mt-4 btn-primary-filled font-semibold px-6 py-2.5 rounded-xl text-sm">
            Browse products
          </button>
        </div>
      </div>
    )
  }

  const addressPreview = buildAddress(doorNo, street, city, addrState, country, pincode)
  const hasOnlinePayment = store?.active_payment_providers?.includes('RAZORPAY') ?? false
  const hasPickup = store?.is_pickup_enabled ?? false
  const hasHouseDelivery = store?.is_home_delivery_enabled ?? true
  const showSelector = hasPickup && hasHouseDelivery
  const isPickup = deliveryType === 'PICKUP'
  const minPickupTime = new Date(Date.now() + 60000).toISOString().slice(0, 16)

  // ── Reusable form sections ──────────────────────────────────────────────────

  const contactSection = (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contact details</p>
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1.5">
          Name <span className="text-xs font-normal text-gray-400">(optional)</span>
        </label>
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder="Your name" className={inputCls} />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1.5">Phone number</label>
        <input type="tel" value={phone} readOnly
          className="w-full h-11 px-3 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-500 cursor-not-allowed" />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1.5">
          Alternate phone <span className="text-xs font-normal text-gray-400">(optional)</span>
        </label>
        <input type="tel" value={altPhone} onChange={e => setAltPhone(e.target.value)}
          placeholder="+91 98765 43210" className={inputCls} />
      </div>
    </div>
  )

  const addressSection = (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      {/* Pre-filled badge */}
      {selectedAddress && (
        <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
          <span className="text-base flex-shrink-0">
            {selectedAddress.label === 'House' ? '🏠' : selectedAddress.label === 'Work' ? '💼' : '📍'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold c-primary">{selectedAddress.label ?? 'Saved address'}</p>
            <p className="text-xs text-gray-500 truncate">
              {[selectedAddress.address, selectedAddress.city, selectedAddress.pincode].filter(Boolean).join(', ')}
            </p>
          </div>
          <span className="text-[10px] font-semibold c-primary flex-shrink-0 bg-gray-100 px-2 py-0.5 rounded-full">Pre-filled</span>
        </div>
      )}

      {/* Section label + location button */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Delivery address <span className="text-red-400">*</span>
        </p>
        <button type="button" onClick={requestLocation} disabled={locationState === 'requesting'}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
            locationState === 'granted'  ? 'bg-green-50 text-green-600 hover:bg-green-100'
            : locationState === 'denied'  ? 'bg-red-50 text-red-400 cursor-not-allowed'
            : locationState === 'requesting' ? 'bg-gray-100 text-gray-400 cursor-wait'
            : 'bg-gray-100 c-primary hover:opacity-80'
          }`}
        >
          {locationState === 'granted' ? (
            <><Check className="w-3 h-3" />Location set</>
          ) : locationState === 'requesting' ? (
            <><svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Detecting…</>
          ) : locationState === 'denied' ? (
            <><X className="w-3 h-3" />Denied</>
          ) : (
            <><MapPin className="w-3 h-3" />Use location</>
          )}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1.5">Door / Flat no.</label>
          <input type="text" value={doorNo} onChange={e => setDoorNo(e.target.value)}
            placeholder="4B, Flat 12" className={inputSmCls} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1.5">Pincode</label>
          <input type="text" value={pincode} onChange={e => setPincode(e.target.value)}
            placeholder="600001" className={inputSmCls} />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1.5">Street / Area</label>
        <input type="text" value={street} onChange={e => setStreet(e.target.value)}
          placeholder="Anna Nagar, 2nd Cross Street" className={inputSmCls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1.5">City</label>
          <input type="text" value={city} onChange={e => setCity(e.target.value)}
            placeholder="Chennai" className={inputSmCls} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1.5">State</label>
          <input type="text" value={addrState} onChange={e => setAddrState(e.target.value)}
            placeholder="Tamil Nadu" className={inputSmCls} />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1.5">Country</label>
        <input type="text" value={country} onChange={e => setCountry(e.target.value)}
          placeholder="India" className={inputSmCls} />
      </div>
    </div>
  )

  const deliveryTypeSelector = showSelector ? (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Delivery method</p>
      <div className="grid grid-cols-2 gap-2.5">
        <button type="button" onClick={() => setDeliveryType('HOME_DELIVERY')}
          className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border-2 transition-colors ${!isPickup ? 'border-primary bg-gray-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}
        >
          <House className={`w-5 h-5 ${!isPickup ? 'c-primary' : 'text-gray-400'}`} />
          <span className={`text-sm font-semibold ${!isPickup ? 'c-primary' : 'text-gray-500'}`}>House Delivery</span>
        </button>
        <button type="button" onClick={() => setDeliveryType('PICKUP')}
          className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border-2 transition-colors ${isPickup ? 'border-primary bg-gray-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}
        >
          <Truck className={`w-5 h-5 ${isPickup ? 'c-primary' : 'text-gray-400'}`} />
          <span className={`text-sm font-semibold ${isPickup ? 'c-primary' : 'text-gray-500'}`}>Store Pickup</span>
        </button>
      </div>
    </div>
  ) : null

  const pickupSection = (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pickup location</p>
      <div className="flex items-start gap-3 bg-gray-50 rounded-xl px-3 py-3">
        <MapPin className="w-4 h-4 c-primary flex-shrink-0 mt-0.5" />
        <p className="text-sm text-gray-700 leading-relaxed">
          {store?.address ?? 'Store address not available — contact the store for directions.'}
        </p>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1.5">
          Expected pickup time <span className="text-gray-300 font-normal">(optional)</span>
        </label>
        <input
          type="datetime-local"
          min={minPickupTime}
          value={expectedPickupTime}
          onChange={e => setExpectedPickupTime(e.target.value)}
          className={inputSmCls}
        />
        <p className="text-[11px] text-gray-400 mt-1">Only future times allowed.</p>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1.5">
          Pickup notes <span className="text-gray-300 font-normal">(optional)</span>
        </label>
        <input type="text" value={deliveryNotes} onChange={e => setDeliveryNotes(e.target.value)}
          placeholder="e.g. Call when ready, I'll be at gate 2"
          className={inputSmCls} />
      </div>
    </div>
  )

  const notesSection = (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-3">
        Delivery notes <span className="text-gray-300 font-normal normal-case">(optional)</span>
      </label>
      <input type="text" value={deliveryNotes} onChange={e => setDeliveryNotes(e.target.value)}
        placeholder="Any special instructions for delivery?"
        className={inputSmCls} />
    </div>
  )

  const orderSummarySection = (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Order summary</p>
      </div>
      <div className="divide-y divide-gray-50">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-3 px-5 py-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
              {item.product.image_url
                ? <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                : <span className="text-xs font-bold text-gray-400">{item.product.name.charAt(0).toUpperCase()}</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{item.product.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">Qty {item.quantity}</p>
            </div>
            <p className="text-sm font-semibold text-gray-900 flex-shrink-0">₹{item.product.selling_price * item.quantity}</p>
          </div>
        ))}
      </div>
      <div className="px-5 py-3.5 flex items-center justify-between" style={{ backgroundColor: '#F8F9FA' }}>
        <p className="text-sm font-semibold text-gray-700">Total</p>
        <p className="text-base font-bold text-gray-900">₹{cart?.total ?? 0}</p>
      </div>
    </div>
  )

  const paymentSection = (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Payment</p>
      <div className="space-y-2.5">

        {/* COD */}
        <button
          type="button"
          onClick={() => setPaymentMethod('COD')}
          className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
            paymentMethod === 'COD' ? 'bg-gray-50 border-primary' : 'bg-gray-50 border-gray-100 hover:border-gray-200'
          }`}
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${paymentMethod === 'COD' ? 'bg-gray-100' : 'bg-gray-100'}`}>
            <CreditCard className={`w-4 h-4 ${paymentMethod === 'COD' ? 'c-primary' : 'text-gray-400'}`} />
          </div>
          <div className="flex-1 text-left">
            <p className={`text-sm font-semibold ${paymentMethod === 'COD' ? 'text-gray-900' : 'text-gray-600'}`}>Cash on delivery</p>
            <p className="text-xs text-gray-400 mt-0.5">Pay when your order arrives</p>
          </div>
          <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${paymentMethod === 'COD' ? 'bg-primary' : 'border-2 border-gray-300'}`}>
            {paymentMethod === 'COD' && <Check className="w-2.5 h-2.5 text-white" />}
          </div>
        </button>

        {/* Pay online — only if Razorpay is configured and active */}
        {hasOnlinePayment && (
          <button
            type="button"
            onClick={() => setPaymentMethod('ONLINE')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
              paymentMethod === 'ONLINE' ? 'bg-gray-50 border-primary' : 'bg-gray-50 border-gray-100 hover:border-gray-200'
            }`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${paymentMethod === 'ONLINE' ? 'bg-gray-100' : 'bg-gray-100'}`}>
              <Smartphone className={`w-4 h-4 ${paymentMethod === 'ONLINE' ? 'c-primary' : 'text-gray-400'}`} />
            </div>
            <div className="flex-1 text-left">
              <p className={`text-sm font-semibold ${paymentMethod === 'ONLINE' ? 'text-gray-900' : 'text-gray-600'}`}>Pay online</p>
              <p className="text-xs text-gray-400 mt-0.5">UPI, cards, netbanking & wallets</p>
            </div>
            <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${paymentMethod === 'ONLINE' ? 'bg-primary' : 'border-2 border-gray-300'}`}>
              {paymentMethod === 'ONLINE' && <Check className="w-2.5 h-2.5 text-white" />}
            </div>
          </button>
        )}

      </div>
    </div>
  )

  return (
    <>
      {/* ── Single column (mobile + desktop) ── */}
      <div className="page-x py-5 pb-28 lg:pb-8 space-y-4 lg:max-w-[900px] lg:mx-auto">
        {orderSummarySection}
        {contactSection}
        {deliveryTypeSelector}
        {isPickup ? pickupSection : addressSection}
        {!isPickup && notesSection}
        {paymentSection}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        <button onClick={handlePlaceOrderClick}
          className="hidden lg:block w-full btn-primary-filled font-semibold py-4 rounded-xl text-sm shadow-sm">
          {paymentMethod === 'ONLINE' ? `Pay ₹${cart?.total ?? 0} online` : `Place order · ₹${cart?.total ?? 0}`}
        </button>
      </div>

      {/* ── Mobile fixed bottom bar ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg px-4 py-3 z-40">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-xs text-gray-400">Total</p>
            <p className="text-lg font-bold text-gray-900">₹{cart?.total ?? 0}</p>
          </div>
          <button onClick={handlePlaceOrderClick}
            className="flex-1 btn-primary-filled font-semibold py-3.5 rounded-xl text-sm">
            {paymentMethod === 'ONLINE' ? 'Pay online' : 'Place order'}
          </button>
        </div>
      </div>

      {/* ── Confirm order modal ── */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !placing && setConfirmOpen(false)} />
          <div className="relative bg-white w-full lg:max-w-sm rounded-t-3xl lg:rounded-2xl p-6 shadow-xl">
            <h2 className="font-bold text-gray-900 text-base mb-1">Confirm your order</h2>
            <p className="text-sm text-gray-500 mb-5">Review the details before placing</p>

            <div className="rounded-xl border border-gray-100 divide-y divide-gray-100 mb-5 overflow-hidden">
              <div className="flex justify-between px-4 py-3 text-sm">
                <span className="text-gray-500">Items</span>
                <span className="font-semibold text-gray-900">{items.length} item{items.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between px-4 py-3 text-sm">
                <span className="text-gray-500">Total</span>
                <span className="font-bold text-gray-900">₹{cart?.total ?? 0}</span>
              </div>
              <div className="flex justify-between px-4 py-3 text-sm">
                <span className="text-gray-500">Payment</span>
                <span className="text-gray-700">{paymentMethod === 'ONLINE' ? 'Online (Razorpay)' : 'Cash on delivery'}</span>
              </div>
              <div className="flex justify-between px-4 py-3 text-sm">
                <span className="text-gray-500">Delivery</span>
                <span className="text-gray-700 font-medium">{isPickup ? '🏪 Store pickup' : '🚚 House delivery'}</span>
              </div>
              {isPickup ? (
                <>
                  {expectedPickupTime && (
                    <div className="flex justify-between px-4 py-3 text-sm">
                      <span className="text-gray-500">Pickup time</span>
                      <span className="text-gray-700">{new Date(expectedPickupTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                  )}
                  {deliveryNotes && (
                    <div className="px-4 py-3">
                      <p className="text-xs text-gray-400 mb-1">Pickup notes</p>
                      <p className="text-sm text-gray-700">{deliveryNotes}</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {locationState === 'granted' && (
                    <div className="flex justify-between px-4 py-3 text-sm">
                      <span className="text-gray-500">Location</span>
                      <span className="text-green-600 font-semibold text-xs">Shared ✓</span>
                    </div>
                  )}
                  {addressPreview && (
                    <div className="px-4 py-3">
                      <p className="text-xs text-gray-400 mb-1">Deliver to</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{addressPreview}</p>
                    </div>
                  )}
                  {deliveryNotes && (
                    <div className="px-4 py-3">
                      <p className="text-xs text-gray-400 mb-1">Delivery notes</p>
                      <p className="text-sm text-gray-700">{deliveryNotes}</p>
                    </div>
                  )}
                </>
              )}
              {altPhone && (
                <div className="flex justify-between px-4 py-3 text-sm">
                  <span className="text-gray-500">Alt. phone</span>
                  <span className="text-gray-700">{altPhone}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setConfirmOpen(false)} disabled={placing}
                className="flex-1 h-11 border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors">
                Go back
              </button>
              <button onClick={confirmOrder} disabled={placing}
                className="flex-1 h-11 btn-primary-filled font-semibold rounded-xl text-sm">
                {placing
                  ? (paymentMethod === 'ONLINE' ? 'Opening payment…' : 'Placing…')
                  : (paymentMethod === 'ONLINE' ? 'Proceed to pay' : 'Confirm & place')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
