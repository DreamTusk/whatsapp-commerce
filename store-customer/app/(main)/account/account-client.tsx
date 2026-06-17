'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth'
import { useCart } from '@/contexts/cart'
import { useCartDrawer } from '@/contexts/cart-drawer'
import { clientFetch } from '@/lib/client-api'
import { Heart, Package, ShoppingCart, MapPin, LogOut, User, ChevronLeft, ChevronRight, Edit, Trash, Plus, Check, Truck, ExternalLink } from "@deemlol/next-icons"

import type { Order, CustomerAddress, WishlistItem } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

type Tab = 'profile' | 'orders' | 'addresses' | 'wishlist'

const LABEL_OPTIONS = ['Home', 'Work', 'Other']

interface AddrForm {
  label: string; door_no: string; street: string; address: string
  city: string; state: string; country: string; pincode: string; is_default: boolean
}
const EMPTY_FORM: AddrForm = {
  label: 'Home', door_no: '', street: '', address: '', city: '', state: '', country: '', pincode: '', is_default: false,
}

const STATUS_LABEL: Record<string, string> = {
  NEW: 'Order placed', CONFIRMED: 'Confirmed', OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Order delivered', CANCELLED: 'Order cancelled',
}
const STATUS_COLOR: Record<string, string> = {
  NEW: 'text-yellow-600', CONFIRMED: 'text-blue-600', OUT_FOR_DELIVERY: 'text-purple-600',
  DELIVERED: 'text-green-600', CANCELLED: 'text-gray-400',
}
const TRACKING_STEPS = [
  { status: 'NEW', label: 'Order placed' },
  { status: 'CONFIRMED', label: 'Confirmed' },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for delivery' },
  { status: 'DELIVERED', label: 'Delivered' },
]
const TRACKING_ORDER: Record<string, number> = { NEW: 0, CONFIRMED: 1, OUT_FOR_DELIVERY: 2, DELIVERED: 3, CANCELLED: -1 }
const CANCEL_REASONS = ['Changed my mind', 'Ordered by mistake', 'Found a better price', 'Delivery taking too long', 'Other']
const BUBBLE_COLORS = [
  'bg-orange-100 text-orange-600', 'bg-red-100 text-red-600', 'bg-yellow-100 text-yellow-700',
  'bg-green-100 text-green-700', 'bg-blue-100 text-blue-600', 'bg-violet-100 text-violet-600',
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AccountClient({ storeName }: { storeName?: string }) {
  const { customer, isAuthenticated, initialized, requireAuth, logout, updateCustomer } = useAuth()
  const { refresh: cartRefresh } = useCart()
  const { openCart } = useCartDrawer()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get('tab')
    return (t === 'profile' || t === 'orders' || t === 'addresses' || t === 'wishlist') ? t : 'profile'
  })
  const [mobilePanelOpen, setMobilePanelOpen] = useState(() => !!searchParams.get('tab'))

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t === 'profile' || t === 'orders' || t === 'addresses' || t === 'wishlist') {
      setTab(t)
      setMobilePanelOpen(true)
    }
  }, [searchParams])

  useEffect(() => {
    if (!isAuthenticated) return
    const orderId = searchParams.get('orderId')
    if (!orderId) return
    setTab('orders')
    setMobilePanelOpen(true)
    selectOrder(orderId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  // Profile
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState('')

  // Orders
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [orderAgainLoading, setOrderAgainLoading] = useState<string | null>(null)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [selectedOrderLoading, setSelectedOrderLoading] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelSheet, setShowCancelSheet] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelOther, setCancelOther] = useState('')

  // Wishlist
  const [wishlist, setWishlist] = useState<WishlistItem[]>([])
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const [removingWishlist, setRemovingWishlist] = useState<string | null>(null)

  // Addresses
  const [addresses, setAddresses] = useState<CustomerAddress[]>([])
  const [addressesLoading, setAddressesLoading] = useState(false)
  const [showAddrForm, setShowAddrForm] = useState(false)
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null)
  const [addrForm, setAddrForm] = useState<AddrForm>(EMPTY_FORM)
  const [addrFormError, setAddrFormError] = useState('')
  const [addrSaving, setAddrSaving] = useState(false)
  const [locating, setLocating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteAddrConfirmId, setDeleteAddrConfirmId] = useState<string | null>(null)

  const [savedProfileName, setSavedProfileName] = useState('')
  const [savedProfileEmail, setSavedProfileEmail] = useState('')

  useEffect(() => {
    if (customer) {
      setProfileName(customer.name ?? '')
      setProfileEmail(customer.email ?? '')
      setSavedProfileName(customer.name ?? '')
      setSavedProfileEmail(customer.email ?? '')
    }
  }, [customer])

  const isProfileDirty = profileName !== savedProfileName || profileEmail !== savedProfileEmail

  useEffect(() => {
    if (initialized && !isAuthenticated) requireAuth(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized])

  const fetchOrders = useCallback(async () => {
    if (!isAuthenticated) return
    setOrdersLoading(true)
    try { const d = await clientFetch<{ orders: Order[] }>('/api/storefront/orders'); setOrders(d.orders) }
    catch { setOrders([]) } finally { setOrdersLoading(false) }
  }, [isAuthenticated])

  const fetchWishlist = useCallback(async () => {
    if (!isAuthenticated) return
    setWishlistLoading(true)
    try { const d = await clientFetch<{ items: WishlistItem[] }>('/api/storefront/wishlist'); setWishlist(d.items) }
    catch { setWishlist([]) } finally { setWishlistLoading(false) }
  }, [isAuthenticated])

  const fetchAddresses = useCallback(async () => {
    if (!isAuthenticated) return
    setAddressesLoading(true)
    try { const d = await clientFetch<{ addresses: CustomerAddress[] }>('/api/storefront/addresses'); setAddresses(d.addresses) }
    catch { setAddresses([]) } finally { setAddressesLoading(false) }
  }, [isAuthenticated])

  useEffect(() => { if (isAuthenticated) fetchOrders() }, [isAuthenticated, fetchOrders])
  useEffect(() => { if (tab === 'addresses' && isAuthenticated) fetchAddresses() }, [tab, isAuthenticated, fetchAddresses])
  useEffect(() => { if (tab === 'wishlist' && isAuthenticated) fetchWishlist() }, [tab, isAuthenticated, fetchWishlist])

  function openTab(t: Tab) {
    setTab(t)
    setMobilePanelOpen(true)
    setShowAddrForm(false)
    setEditingAddress(null)
    setSelectedOrderId(null)
    setSelectedOrder(null)
    router.replace(`/account?tab=${t}`, { scroll: false })
  }

  async function selectOrder(id: string) {
    setSelectedOrderId(id)
    setSelectedOrder(null)
    setSelectedOrderLoading(true)
    try {
      const d = await clientFetch<{ order: Order }>(`/api/storefront/orders/${id}`)
      setSelectedOrder(d.order)
    } catch { /* ignore */ } finally { setSelectedOrderLoading(false) }
  }

  function backToOrders() { setSelectedOrderId(null); setSelectedOrder(null) }

  async function cancelSelectedOrder() {
    if (!selectedOrderId) return
    const reason = cancelReason === 'Other' ? cancelOther.trim() : cancelReason
    setCancelling(true)
    try {
      const d = await clientFetch<{ order: Order }>(`/api/storefront/orders/${selectedOrderId}/cancel`, {
        method: 'PATCH', body: JSON.stringify({ reason: reason || null }),
      })
      setSelectedOrder(d.order)
      setOrders(prev => prev.map(o => o.id === selectedOrderId ? { ...o, status: d.order.status } : o))
      setShowCancelSheet(false)
    } catch { alert('Could not cancel. Try again.') } finally { setCancelling(false) }
  }

  async function saveProfile() {
    if (!isProfileDirty) return
    setProfileSaving(true); setProfileError('')
    try {
      const d = await clientFetch<{ customer: { id: string; name: string | null; email: string | null; phone: string; address: string | null } }>(
        '/api/storefront/auth/profile',
        { method: 'PUT', body: JSON.stringify({ name: profileName.trim() || null, email: profileEmail.trim() || null }) }
      )
      updateCustomer({ name: d.customer.name, email: d.customer.email })
      setSavedProfileName(profileName); setSavedProfileEmail(profileEmail)
      setProfileSaved(true); setTimeout(() => setProfileSaved(false), 2000)
    } catch { setProfileError('Failed to save') } finally { setProfileSaving(false) }
  }

  async function orderAgain(order: Order) {
    setOrderAgainLoading(order.id)
    try {
      for (const item of order.items)
        await clientFetch('/api/storefront/cart', { method: 'POST', body: JSON.stringify({ product_id: item.product_id }) })
      await cartRefresh(); openCart()
    } catch { /* ignore */ } finally { setOrderAgainLoading(null) }
  }

  async function removeFromWishlist(productId: string) {
    setRemovingWishlist(productId)
    try { await clientFetch(`/api/storefront/wishlist/${productId}`, { method: 'DELETE' }); setWishlist(prev => prev.filter(i => i.product.id !== productId)) }
    catch { /* ignore */ } finally { setRemovingWishlist(null) }
  }

  async function useCurrentLocation() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`, { headers: { 'Accept-Language': 'en' } })
        const geo = await res.json(); const a = geo.address ?? {}
        setAddrForm(f => ({
          ...f, door_no: a.house_number ?? '',
          street: a.road ?? a.pedestrian ?? a.path ?? '',
          address: a.suburb ?? a.neighbourhood ?? a.residential ?? a.quarter ?? a.city_district ?? '',
          city: a.city ?? a.county ?? a.town ?? a.municipality ?? a.village ?? '',
          state: a.state ?? a.state_district ?? '', country: a.country ?? '',
          pincode: (a.postcode ?? '').replace(/\D/g, '').slice(0, 6),
        }))
      } catch { /* ignore */ } finally { setLocating(false) }
    }, () => setLocating(false), { timeout: 10000 })
  }

  function openEditAddress(addr: CustomerAddress) {
    setEditingAddress(addr)
    setAddrForm({ label: addr.label ?? 'Home', door_no: addr.door_no ?? '', street: addr.street ?? '', address: addr.address ?? '', city: addr.city ?? '', state: addr.state ?? '', country: addr.country ?? '', pincode: addr.pincode ?? '', is_default: addr.is_default })
    setShowAddrForm(true); setAddrFormError('')
  }

  async function saveAddress() {
    const missing = !addrForm.door_no.trim() || !addrForm.street.trim() || !addrForm.address.trim() ||
      !addrForm.city.trim() || !addrForm.pincode.trim() || !addrForm.state.trim() || !addrForm.country.trim()
    if (missing) { setAddrFormError('Please fill in all required fields'); return }
    setAddrSaving(true); setAddrFormError('')
    try {
      const payload = { label: addrForm.label, door_no: addrForm.door_no.trim() || null, street: addrForm.street.trim() || null, address: addrForm.address.trim() || null, city: addrForm.city.trim() || null, state: addrForm.state.trim() || null, country: addrForm.country.trim() || null, pincode: addrForm.pincode.trim() || null, is_default: addrForm.is_default }
      if (editingAddress) {
        const d = await clientFetch<{ address: CustomerAddress }>(`/api/storefront/addresses/${editingAddress.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        setAddresses(prev => prev.map(a => a.id === editingAddress.id ? d.address : a))
      } else {
        const d = await clientFetch<{ address: CustomerAddress }>('/api/storefront/addresses', { method: 'POST', body: JSON.stringify(payload) })
        setAddresses(prev => [...prev, d.address])
      }
      setShowAddrForm(false); setEditingAddress(null); setAddrForm(EMPTY_FORM)
    } catch { setAddrFormError('Failed to save address') } finally { setAddrSaving(false) }
  }

  async function deleteAddress(id: string) {
    setDeletingId(id)
    try { await clientFetch(`/api/storefront/addresses/${id}`, { method: 'DELETE' }); setAddresses(prev => prev.filter(a => a.id !== id)) }
    catch { /* ignore */ } finally { setDeletingId(null); setDeleteAddrConfirmId(null) }
  }

  function confirmLogout() {
    setLogoutConfirmOpen(true)
  }

  function handleLogoutConfirmed() {
    setLogoutConfirmOpen(false)
    logout()
    router.push('/')
  }

  async function setDefaultAddress(id: string) {
    try { await clientFetch(`/api/storefront/addresses/${id}/default`, { method: 'PATCH' }); setAddresses(prev => prev.map(a => ({ ...a, is_default: a.id === id }))) }
    catch { /* ignore */ }
  }

  const initial = customer ? (customer.name ?? customer.phone).charAt(0).toUpperCase() : '?'

  if (!initialized) {
    return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin spinner-primary" /></div>
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-3">👤</p>
          <p className="font-bold text-gray-900 mb-2">Sign in to view your account</p>
          <button onClick={() => requireAuth(() => {})} className="mt-2 btn-primary-filled font-semibold px-6 py-2.5 rounded-xl text-sm">Sign in</button>
        </div>
      </div>
    )
  }

  // ── Reusable address form ────────────────────────────────────────────────────
  const addrFormEl = (
    <div className="space-y-4">
      <button onClick={useCurrentLocation} disabled={locating}
        className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-primary bg-gray-50 hover:opacity-90 transition-opacity disabled:opacity-60"
      >
        {locating ? <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin spinner-primary flex-shrink-0" /> : <MapPin className="w-4 h-4 c-primary flex-shrink-0" />}
        <span className="text-sm font-semibold c-primary">{locating ? 'Detecting…' : 'Use current location'}</span>
      </button>
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Label</p>
        <div className="flex gap-2">
          {LABEL_OPTIONS.map(opt => (
            <button key={opt} onClick={() => setAddrForm(f => ({ ...f, label: opt }))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 text-sm font-medium transition-colors ${addrForm.label === opt ? 'border-primary bg-gray-50 c-primary' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
            >{opt === 'Home' ? '🏠' : opt === 'Work' ? '💼' : '📍'} {opt}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium text-gray-500 block mb-1.5">Door No <span className="text-red-500">*</span></label><input type="text" value={addrForm.door_no} onChange={e => setAddrForm(f => ({ ...f, door_no: e.target.value }))} placeholder="12A" className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-[var(--color-primary)] transition-colors" /></div>
        <div><label className="text-xs font-medium text-gray-500 block mb-1.5">Street <span className="text-red-500">*</span></label><input type="text" value={addrForm.street} onChange={e => setAddrForm(f => ({ ...f, street: e.target.value }))} placeholder="MG Road" className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-[var(--color-primary)] transition-colors" /></div>
      </div>
      <div><label className="text-xs font-medium text-gray-500 block mb-1.5">Area / Landmark <span className="text-red-500">*</span></label><input type="text" value={addrForm.address} onChange={e => setAddrForm(f => ({ ...f, address: e.target.value }))} placeholder="Near City Mall…" className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-[var(--color-primary)] transition-colors" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium text-gray-500 block mb-1.5">City <span className="text-red-500">*</span></label><input type="text" value={addrForm.city} onChange={e => setAddrForm(f => ({ ...f, city: e.target.value }))} placeholder="Bengaluru" className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-[var(--color-primary)] transition-colors" /></div>
        <div><label className="text-xs font-medium text-gray-500 block mb-1.5">Pincode <span className="text-red-500">*</span></label><input type="text" inputMode="numeric" maxLength={6} value={addrForm.pincode} onChange={e => setAddrForm(f => ({ ...f, pincode: e.target.value.replace(/\D/g, '') }))} placeholder="560001" className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-[var(--color-primary)] transition-colors" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium text-gray-500 block mb-1.5">State <span className="text-red-500">*</span></label><input type="text" value={addrForm.state} onChange={e => setAddrForm(f => ({ ...f, state: e.target.value }))} placeholder="Karnataka" className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-[var(--color-primary)] transition-colors" /></div>
        <div><label className="text-xs font-medium text-gray-500 block mb-1.5">Country <span className="text-red-500">*</span></label><input type="text" value={addrForm.country} onChange={e => setAddrForm(f => ({ ...f, country: e.target.value }))} placeholder="India" className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-[var(--color-primary)] transition-colors" /></div>
      </div>
      <label className="flex items-center gap-3 select-none">
        <div onClick={() => setAddrForm(f => ({ ...f, is_default: !f.is_default }))} className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${addrForm.is_default ? 'bg-primary' : 'bg-gray-200'}`}>
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${addrForm.is_default ? 'translate-x-4' : ''}`} />
        </div>
        <span className="text-sm text-gray-700">Set as default address</span>
      </label>
      {addrFormError && <p className="text-xs text-red-500 font-medium">{addrFormError}</p>}
      <div className="flex gap-3">
        <button onClick={() => { setShowAddrForm(false); setEditingAddress(null); setAddrForm(EMPTY_FORM); setAddrFormError('') }} className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
        <button onClick={saveAddress} disabled={addrSaving} className="flex-1 h-11 rounded-xl btn-primary-filled text-sm font-semibold">{addrSaving ? 'Saving…' : editingAddress ? 'Update' : 'Save address'}</button>
      </div>
    </div>
  )

  // ── NAV ITEMS ────────────────────────────────────────────────────────────────
  const NAV_ITEMS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User /> },
    { id: 'orders', label: 'Orders', icon: <Package />},
    { id: 'addresses', label: 'Addresses', icon: <MapPin /> },
    { id: 'wishlist', label: 'Wishlist', icon: <Heart /> },
  ]

  // ── MOBILE SIDEBAR ───────────────────────────────────────────────────────────
  const mobileSidebar = (
    <>
      <header className="sticky top-[var(--store-header-h)] z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="px-4 h-14 flex items-center gap-2">
          <Link href="/" className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="font-bold text-gray-900 flex-1 text-base">Settings</h1>
        </div>
      </header>
      <div className="bg-white min-h-screen pb-24">
        {/* Profile row */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
          <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-base font-bold text-white leading-none">{initial}</span>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 text-sm truncate">{customer?.name ?? 'Customer'}</p>
            <p className="text-xs text-gray-500 mt-0.5">{customer?.phone}</p>
          </div>
        </div>
        {/* Settings section */}
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-4 pt-4 pb-1">Settings</p>
        {NAV_ITEMS.map(item => (
          <button key={item.id} onClick={() => openTab(item.id)}
            className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span className="text-gray-400 flex-shrink-0">{item.icon}</span>
            <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
            <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
          </button>
        ))}
        {/* Section divider */}
        <div className="h-2 bg-gray-50" />
        {/* Personal section */}
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-4 pt-4 pb-1">Personal</p>
        <button onClick={confirmLogout} className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 text-gray-700 hover:bg-gray-50 transition-colors">
          <LogOut className="w-[18px] h-[18px] text-gray-400 flex-shrink-0" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </>
  )

  // ── MOBILE CONTENT SCREENS ───────────────────────────────────────────────────
  const mobileBackHeader = (title: string) => (
    <header className="sticky top-[var(--store-header-h)] z-20 bg-white border-b border-gray-100 shadow-sm">
      <div className="px-4 h-14 flex items-center gap-2">
        <button onClick={() => { setMobilePanelOpen(false); setShowAddrForm(false); router.replace('/account', { scroll: false }) }} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="font-bold text-gray-900 flex-1 text-base">{title}</h1>
      </div>
    </header>
  )

  // Mobile Profile
  const mobileProfileScreen = (
    <>
      {mobileBackHeader('Profile')}
      <div className="page-x pt-5 pb-24 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">Name <span className="text-red-500">*</span></label>
          <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Your name"
            className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-[var(--color-primary)] transition-colors bg-white" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">Mobile Number <span className="text-red-500">*</span></label>
          <input type="text" value={customer?.phone ?? ''} readOnly
            className="w-full h-12 px-4 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-500 cursor-not-allowed" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">Email Address <span className="text-red-500">*</span></label>
          <input type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} placeholder="you@example.com"
            className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-[var(--color-primary)] transition-colors bg-white" />
        </div>
        {profileError && <p className="text-xs text-red-500">{profileError}</p>}
        <button onClick={saveProfile} disabled={profileSaving || profileSaved || !isProfileDirty}
          className={`w-full h-12 rounded-xl text-sm font-semibold transition-colors mt-2 ${profileSaved ? 'bg-green-500 text-white' : 'btn-primary-filled'}`}
        >{profileSaving ? 'Saving…' : profileSaved ? '✓ Saved!' : 'Save'}</button>
      </div>
    </>
  )

  // Mobile Orders
  const renderMobileOrdersScreen = () => (
    <>
      {selectedOrderId ? (
        selectedOrderLoading ? (
          <>
            {mobileBackHeader('Order Detail')}
            <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin spinner-primary" /></div>
          </>
        ) : (
          <div className="pb-24 overflow-auto">{orderDetailPanel}</div>
        )
      ) : (
        <>
          {mobileBackHeader('Orders')}
          <div className="pb-24">
            {ordersLoading ? (
              <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin spinner-primary" /></div>
            ) : orders.length === 0 ? (
              <div className="text-center py-16 px-6 text-gray-400">
                <p className="text-4xl mb-3">📦</p>
                <p className="font-semibold text-gray-600">No orders yet</p>
                <Link href="/products" className="mt-5 inline-block btn-primary-filled font-semibold px-6 py-2.5 rounded-xl text-sm">Browse products</Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {orders.map(order => (
                  <div key={order.id} className="relative px-4 py-4 bg-white hover:bg-gray-50 transition-colors">
                    <button onClick={() => selectOrder(order.id)} className="absolute inset-0" aria-label={`View order ${order.order_number}`} />
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-semibold text-gray-800">{order.order_number}</p>
                      <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
                    </div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`flex items-center gap-1.5 text-sm font-semibold ${STATUS_COLOR[order.status] ?? 'text-gray-500'}`}>
                        {order.status === 'DELIVERED' && <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                        {order.status === 'CANCELLED' && <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                        {STATUS_LABEL[order.status] ?? order.status}
                      </span>
                      <p className="text-sm font-bold text-gray-900">₹{order.total_amount}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        View details
                        <ChevronRight className="w-3 h-3" />
                      </span>
                      <button onClick={() => orderAgain(order)} disabled={orderAgainLoading === order.id}
                        className="relative z-10 text-xs font-semibold px-4 py-2 rounded-xl btn-primary-outline disabled:opacity-50"
                      >
                        {orderAgainLoading === order.id ? <span className="flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin spinner-primary inline-block" /> Adding…</span> : 'Order Again'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </>
  )

  // Mobile Addresses
  const mobileAddressesScreen = (
    <>
      {mobileBackHeader('Addresses')}
      <div className="pb-24">
        {showAddrForm ? (
          <div className="page-x pt-4">
            <p className="text-sm font-bold text-gray-900 mb-4">{editingAddress ? 'Edit address' : 'Add New Address'}</p>
            {addrFormEl}
          </div>
        ) : (
          <>
            {addressesLoading ? (
              <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin spinner-primary" /></div>
            ) : (
              <>
                <div className="page-x pt-4 pb-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Saved Location</p>
                </div>
                <div className="divide-y divide-gray-50 bg-white">
                  {addresses.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-gray-400 text-center">No saved addresses</p>
                  ) : (
                    addresses.map(addr => (
                      <div key={addr.id} className="flex items-start gap-3 px-4 py-4">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-gray-800">{addr.label ?? 'Address'}</p>
                            {addr.is_default && <span className="text-[10px] font-bold bg-gray-100 c-primary px-1.5 py-0.5 rounded-full">Default</span>}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                            {[addr.door_no, addr.street, addr.address, addr.city, addr.pincode].filter(Boolean).join(', ')}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => openEditAddress(addr)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteAddrConfirmId(addr.id)} disabled={deletingId === addr.id} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors">
                            {deletingId === addr.id ? <div className="w-3.5 h-3.5 border border-gray-400 border-t-transparent rounded-full animate-spin" /> : <Trash className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="px-4 py-4">
                  <button onClick={() => { setShowAddrForm(true); setEditingAddress(null); setAddrForm(EMPTY_FORM); setAddrFormError('') }}
                    className="flex items-center gap-1.5 text-sm font-semibold c-primary hover:opacity-70 transition-opacity"
                  >
                    <Plus className="w-4 h-4" />
                    Add New Address
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  )

  // Mobile Wishlist
  const mobileWishlistScreen = (
    <>
      {mobileBackHeader('Wishlist')}
      <div className="pb-24">
        {wishlistLoading ? (
          <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin spinner-primary" /></div>
        ) : wishlist.length === 0 ? (
          <div className="text-center py-16 px-6 text-gray-400">
            <p className="text-4xl mb-3">♡</p>
            <p className="font-semibold text-gray-600">Your wishlist is empty</p>
            <p className="text-sm mt-1">Save products you love</p>
            <Link href="/products" className="mt-5 inline-block btn-primary-filled font-semibold px-6 py-2.5 rounded-xl text-sm">Browse products</Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {wishlist.map(item => (
              <div key={item.id} className="relative flex items-center gap-3 px-4 py-4 bg-white hover:bg-gray-50 transition-colors">
                <Link href={`/products/${item.product.id}`} className="absolute inset-0" aria-label={item.product.name} />
                {item.product.image_url ? (
                  <img src={item.product.image_url.startsWith('http') ? item.product.image_url : `${API_URL}${item.product.image_url}`} alt={item.product.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 text-2xl">🛍️</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.product.name}</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">₹{item.product.selling_price}</p>
                  {!item.product.in_stock && <span className="text-xs text-red-500">Out of stock</span>}
                </div>
                <button disabled={removingWishlist === item.product.id} onClick={() => removeFromWishlist(item.product.id)} className="relative z-10 text-xs text-gray-400 hover:text-red-500 disabled:opacity-40 transition-colors flex-shrink-0">
                  {removingWishlist === item.product.id ? 'Removing…' : 'Remove'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )

  // ── DESKTOP SIDEBAR ──────────────────────────────────────────────────────────
  const desktopSidebar = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-base font-bold text-white leading-none">{initial}</span>
        </div>
        <div className="min-w-0">
          <p className="font-bold text-gray-900 text-sm truncate">{customer?.name ?? 'Customer'}</p>
          <p className="text-xs text-gray-500 mt-0.5">{customer?.phone}</p>
        </div>
      </div>
      <div className="border-t border-gray-200/60 mx-4" />
      <div className="px-3 py-4">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">Settings</p>
        {NAV_ITEMS.map(item => {
          const active = tab === item.id
          return (
            <button key={item.id} onClick={() => openTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors mb-0.5 ${active ? 'bg-white c-primary' : 'text-gray-600 hover:bg-white/60'}`}
            >
              <span className={`flex-shrink-0 ${active ? 'c-primary' : 'text-gray-400'}`}>{item.icon}</span>
              <span className="text-sm font-medium">{item.id === 'orders' ? 'Orders' : item.label}</span>
            </button>
          )
        })}
      </div>
      <div className="border-t border-gray-200/60 mx-4" />
      <div className="px-3 py-4">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">Personal</p>
        <div className="flex justify-center mt-6">
          <button onClick={confirmLogout} className="px-8 py-2 rounded-full border border-red-400 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors">
            Log Out
          </button>
        </div>
      </div>
      {storeName && (
        <div className="mt-auto px-5 pb-5">
          <p className="text-2xl font-bold text-gray-300 text-center">{storeName}</p>
        </div>
      )}
    </div>
  )

  // ── DESKTOP CONTENT ──────────────────────────────────────────────────────────

  // Desktop profile
  const desktopProfilePanel = (
    <div className="flex flex-col h-full p-4 gap-3">
      <div className="bg-white rounded-xl p-5 space-y-4 flex-1">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">Name <span className="text-red-500">*</span></label>
          <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} placeholder={customer?.name ?? 'Your name'}
            className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-[var(--color-primary)] transition-colors" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">Mobile Number</label>
          <input type="text" value={customer?.phone ?? ''} disabled
            className="w-full h-11 px-3 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-500 cursor-not-allowed" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">Email Address <span className="text-red-500">*</span></label>
          <input type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} placeholder={customer?.email ?? '–'}
            className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-[var(--color-primary)] transition-colors" />
        </div>
        {profileError && <p className="text-xs text-red-500">{profileError}</p>}
        <div className="flex justify-end pt-2">
          <button onClick={saveProfile} disabled={profileSaving || profileSaved || !isProfileDirty}
            className={`px-6 h-10 rounded-xl text-sm font-semibold ${profileSaved ? 'bg-green-500 text-white' : 'btn-primary-filled'}`}
          >{profileSaving ? 'Saving…' : profileSaved ? '✓ Saved!' : 'Save'}</button>
        </div>
      </div>
    </div>
  )

  // Order detail panel (shared between desktop + mobile)
  const orderDetailPanel = selectedOrder ? (() => {
    const o = selectedOrder
    const isCancelled = o.status === 'CANCELLED'
    const canCancel = o.status === 'NEW' || o.status === 'CONFIRMED'
    const currentStep = TRACKING_ORDER[o.status] ?? -1

    // Vertical tracker — used in the right-side card on desktop, and below details on mobile
    const verticalTracker = isCancelled ? (
      <div className="flex flex-col">
        {TRACKING_STEPS.map((step, idx) => {
          const isLast = idx === TRACKING_STEPS.length - 1
          return (
            <div key={step.status} className={`flex gap-3 ${!isLast ? 'flex-1' : ''}`}>
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 bg-white border-gray-200" />
                {!isLast && <div className="w-0.5 flex-1 my-1 rounded-full bg-gray-100" />}
              </div>
              <div className="pt-0.5">
                <p className="text-sm font-medium leading-tight text-gray-300">{step.label}</p>
              </div>
            </div>
          )
        })}
        <div className="flex gap-3 mt-1">
          <div className="flex flex-col items-center">
            <div className="w-7 h-7 rounded-full border-2 border-red-200 bg-red-50 flex items-center justify-center flex-shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            </div>
          </div>
          <div className="pt-0.5">
            <p className="text-sm font-semibold leading-tight text-red-500">Cancelled</p>
            {o.cancelled_by && <p className="text-xs text-red-400 mt-0.5">{o.cancelled_by === 'CUSTOMER' ? 'By you' : o.cancelled_by === 'STORE' ? 'By store' : ''}</p>}
            {o.cancellation_reason && <p className="text-xs text-gray-400 mt-1">{o.cancellation_reason}</p>}
          </div>
        </div>
      </div>
    ) : (
      <div className="flex flex-col h-full">
        {TRACKING_STEPS.map((step, idx) => {
          const done = currentStep >= idx
          const active = currentStep === idx
          const isLast = idx === TRACKING_STEPS.length - 1
          return (
            <div key={step.status} className={`flex gap-3 ${!isLast ? 'flex-1' : ''}`}>
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${done ? 'bg-primary border-primary' : 'bg-white border-gray-200'} ${active ? 'ring-4 ring-[var(--color-primary)]' : ''}`}>
                  {done && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                </div>
                {!isLast && <div className={`w-0.5 flex-1 my-1 rounded-full ${currentStep > idx ? 'bg-primary' : 'bg-gray-100'}`} />}
              </div>
              <div className="pt-0.5">
                <p className={`text-sm font-medium leading-tight ${done ? 'c-primary' : 'text-gray-400'}`}>{step.label}</p>
              </div>
            </div>
          )
        })}
      </div>
    )

    return (
      <div className="flex flex-col h-full">
        {/* Back */}
        <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-gray-100">
          <button onClick={backToOrders} className="flex items-center gap-1.5 text-sm font-medium c-primary hover:opacity-70 transition-opacity">
            <ChevronLeft className="w-4 h-4" />
            Back to orders
          </button>
        </div>

        {/* Two-column on desktop, single on mobile */}
        <div className="flex-1 overflow-auto min-h-0">
          <div className="p-4 flex flex-col lg:flex-row gap-4 lg:items-start">

            {/* LEFT: order details */}
            <div className="flex-1 min-w-0 space-y-3">
              {/* Header */}
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Order number</p>
                    <p className="font-bold text-gray-900 text-lg leading-tight">{o.order_number}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDateTime(o.created_at)}</p>
                  </div>
                  <span className={`mt-1 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0 ${isCancelled ? 'bg-red-50 text-red-500' : o.status === 'DELIVERED' ? 'bg-green-50 text-green-600' : 'bg-gray-50 c-primary'}`}>
                    {STATUS_LABEL[o.status] ?? o.status}
                  </span>
                </div>
              </div>

              {/* Items */}
              <div className="bg-white rounded-xl overflow-hidden border border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 pt-4 pb-3">Items ordered</p>
                <div className="divide-y divide-gray-50">
                  {o.items.map(item => (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
                        {item.image_url ? <img src={item.image_url.startsWith('http') ? item.image_url : `${API_URL}${item.image_url}`} alt={item.product_name} className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-gray-400">{item.product_name.charAt(0).toUpperCase()}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.product_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Qty {item.quantity} × ₹{item.price}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 flex-shrink-0">₹{item.subtotal}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                  <p className="text-sm font-semibold text-gray-600">Total</p>
                  <p className="text-base font-bold text-gray-900">₹{o.total_amount}</p>
                </div>
              </div>

              {/* Address */}
              {o.address && (
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Delivery address</p>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700 leading-relaxed">{o.address}</p>
                  </div>
                </div>
              )}

              {/* Payment */}
              {o.payment && (
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Payment</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-700">{o.payment.method === 'COD' ? 'Cash on delivery' : 'Online payment'}</p>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${o.payment.status === 'PAID' ? 'bg-green-50 text-green-600' : o.payment.status === 'FAILED' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600'}`}>
                      {o.payment.status === 'PENDING' ? 'Pay on delivery' : o.payment.status}
                    </span>
                  </div>
                </div>
              )}

              {/* Shipment */}
              {o.shipments && o.shipments.length > 0 && (
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Shipment tracking</p>
                  <div className="space-y-3">
                    {o.shipments.map((s, i) => (
                      <div key={s.id} className={`flex items-start gap-3 ${i > 0 ? 'pt-3 border-t border-gray-100' : ''}`}>
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                          <Truck className="w-4 h-4 c-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800">{s.carrier_name}</p>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">{s.tracking_id}</p>
                          {s.tracking_url && (
                            <a
                              href={s.tracking_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs c-primary hover:underline font-medium mt-1"
                            >
                              <ExternalLink className="w-3 h-3" /> Track package
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tracking — mobile only (shown below details, hidden on desktop) */}
              <div className="lg:hidden bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Order tracking</p>
                {verticalTracker}
              </div>

              {/* Cancel */}
              {canCancel && (
                <div className="flex">
                  <button onClick={() => { setCancelReason(''); setCancelOther(''); setShowCancelSheet(true) }} className="bg-red-50 hover:bg-red-100 text-red-500 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
                    Cancel order
                  </button>
                </div>
              )}
            </div>

            {/* RIGHT: tracking card — desktop only */}
            <div className="hidden lg:flex flex-col w-[200px] flex-shrink-0 self-stretch">
              <div className="bg-white rounded-xl p-4 border border-gray-100 flex-1 flex flex-col">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex-shrink-0">Order tracking</p>
                <div className="flex-1">{verticalTracker}</div>
              </div>
            </div>

          </div>
        </div>

        {/* Cancel sheet */}
        {showCancelSheet && (
          <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowCancelSheet(false)} />
            <div className="relative w-full lg:max-w-md bg-white rounded-t-3xl lg:rounded-2xl p-6 shadow-xl">
              <h3 className="font-bold text-gray-900 text-base mb-1">Cancel order</h3>
              <p className="text-sm text-gray-500 mb-5">Please select a reason</p>
              <div className="space-y-2 mb-4">
                {CANCEL_REASONS.map(r => (
                  <button key={r} onClick={() => setCancelReason(r)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium text-left transition-colors ${cancelReason === r ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-100 text-gray-700 hover:border-gray-200'}`}>
                    <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${cancelReason === r ? 'border-red-500 bg-red-500' : 'border-gray-300'}`}>{cancelReason === r && <span className="w-1.5 h-1.5 rounded-full bg-white" />}</span>
                    {r}
                  </button>
                ))}
              </div>
              {cancelReason === 'Other' && <textarea value={cancelOther} onChange={e => setCancelOther(e.target.value)} placeholder="Tell us more…" rows={2} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-100 transition-colors mb-4 resize-none" />}
              <div className="flex gap-3">
                <button onClick={() => setShowCancelSheet(false)} className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Go back</button>
                <button onClick={cancelSelectedOrder} disabled={cancelling || !cancelReason || (cancelReason === 'Other' && !cancelOther.trim())} className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                  {cancelling ? 'Cancelling…' : 'Confirm cancel'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  })() : null

  // Desktop orders
  const desktopOrdersPanel = selectedOrderId ? (
    <div className="flex flex-col h-full">
      {selectedOrderLoading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin spinner-primary" /></div>
      ) : (
        orderDetailPanel
      )}
    </div>
  ) : (
    <div className="flex flex-col h-full p-4 gap-3">
      <div className="bg-white rounded-xl p-4 flex-1 overflow-auto">
        {ordersLoading ? (
          <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin spinner-primary" /></div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">📦</p><p className="font-semibold text-gray-600">No orders yet</p>
            <Link href="/products" className="mt-5 inline-block btn-primary-filled font-semibold px-6 py-2.5 rounded-xl text-sm">Browse products</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <div key={order.id} className="relative border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <button onClick={() => selectOrder(order.id)} className="absolute inset-0 rounded-2xl" aria-label={`View order ${order.order_number}`} />
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2.5">
                      {order.items.slice(0, 3).map((item, i) => (
                        <div key={item.id} className={`w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center ${item.image_url ? '' : BUBBLE_COLORS[i % BUBBLE_COLORS.length]}`}>
                          {item.image_url
                            ? <img src={item.image_url.startsWith('http') ? item.image_url : `${API_URL}${item.image_url}`} alt={item.product_name} className="w-full h-full object-cover" />
                            : <span className="text-sm font-bold">{item.product_name.charAt(0).toUpperCase()}</span>
                          }
                        </div>
                      ))}
                    </div>
                    <span className={`flex items-center gap-1.5 text-sm font-semibold mb-1 ${STATUS_COLOR[order.status] ?? 'text-gray-500'}`}>
                      {order.status === 'DELIVERED' && <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                      {order.status === 'CANCELLED' && <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                      {STATUS_LABEL[order.status] ?? order.status}
                    </span>
                    <p className="text-xs text-gray-400">Order placed {formatDate(order.created_at)}</p>
                  </div>
                  <div className="relative z-10 flex flex-col items-end justify-center gap-3 flex-shrink-0">
                    <p className="font-bold text-gray-900 text-base">₹{order.total_amount}</p>
                    <button onClick={() => orderAgain(order)} disabled={orderAgainLoading === order.id}
                      className="text-sm font-semibold px-5 py-2.5 rounded-xl btn-primary-outline disabled:opacity-50 whitespace-nowrap"
                    >
                      {orderAgainLoading === order.id ? <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin spinner-primary inline-block" /> Adding…</span> : 'Order Again'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // Desktop addresses (helper for list)
  const addrList = (
    <div className="divide-y divide-gray-50">
      {addresses.length === 0
        ? <p className="px-5 py-8 text-sm text-gray-400 text-center">No saved addresses</p>
        : addresses.map(addr => (
            <div key={addr.id} className="flex items-start gap-3 px-5 py-4">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800">{addr.label ?? 'Address'}</p>
                  {addr.is_default && <span className="text-[10px] font-bold bg-gray-100 c-primary px-1.5 py-0.5 rounded-full">Default</span>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{[addr.door_no, addr.street, addr.address, addr.city, addr.pincode].filter(Boolean).join(', ')}</p>
                {!addr.is_default && <button onClick={() => setDefaultAddress(addr.id)} className="text-[11px] font-medium c-primary hover:opacity-70 mt-1 transition-opacity">Set as default</button>}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => openEditAddress(addr)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteAddrConfirmId(addr.id)} disabled={deletingId === addr.id} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors">
                  {deletingId === addr.id ? <div className="w-3.5 h-3.5 border border-gray-400 border-t-transparent rounded-full animate-spin" /> : <Trash className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))
      }
    </div>
  )

  const desktopAddressesPanel = (
    <div className="flex flex-col h-full p-4 gap-3">
      {showAddrForm ? (
        <div className="bg-white rounded-xl p-5 flex-1">
          <p className="text-sm font-bold text-gray-900 mb-4">{editingAddress ? 'Edit address' : 'Add New Address'}</p>
          {addrFormEl}
        </div>
      ) : (
        <div className="bg-white rounded-xl flex-1">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700">All Saved Addresses</p>
            <button onClick={() => { setShowAddrForm(true); setEditingAddress(null); setAddrForm(EMPTY_FORM); setAddrFormError('') }}
              className="flex items-center gap-1.5 btn-primary-filled text-xs font-semibold px-3 py-2 rounded-xl"
            >
              <Plus className="w-3.5 h-3.5" />
              Add New Address
            </button>
          </div>
          {addressesLoading ? <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin spinner-primary" /></div> : addrList}
        </div>
      )}
    </div>
  )

  // Desktop wishlist
  const desktopWishlistPanel = (
    <div className="flex flex-col h-full p-4 gap-3">
      <div className="bg-white rounded-xl p-4 flex-1">
        {wishlistLoading ? (
          <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin spinner-primary" /></div>
        ) : wishlist.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">♡</p>
            <p className="font-semibold text-gray-600">Your wishlist is empty</p>
            <p className="text-sm mt-1">Save products you love</p>
            <Link href="/products" className="mt-5 inline-block btn-primary-filled font-semibold px-6 py-2.5 rounded-xl text-sm">Browse products</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {wishlist.map(item => (
              <div key={item.id} className="relative flex items-center gap-4 p-3 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <Link href={`/products/${item.product.id}`} className="absolute inset-0 rounded-2xl" aria-label={item.product.name} />
                {item.product.image_url ? (
                  <img src={item.product.image_url.startsWith('http') ? item.product.image_url : `${API_URL}${item.product.image_url}`} alt={item.product.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 text-2xl">🛍️</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.product.name}</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">₹{item.product.selling_price}</p>
                  {!item.product.in_stock && <span className="text-xs text-red-500 block mt-0.5">Out of stock</span>}
                </div>
                <button disabled={removingWishlist === item.product.id} onClick={() => removeFromWishlist(item.product.id)} className="relative z-10 text-xs font-medium px-3 py-2 rounded-xl border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 disabled:opacity-40 transition-colors flex-shrink-0">
                  {removingWishlist === item.product.id ? 'Removing…' : 'Remove'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // ── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Mobile ── */}
      <div className="lg:hidden">
        {!mobilePanelOpen ? mobileSidebar : (
          <>
            {tab === 'profile' && mobileProfileScreen}
            {tab === 'orders' && renderMobileOrdersScreen()}
            {tab === 'addresses' && mobileAddressesScreen}
            {tab === 'wishlist' && mobileWishlistScreen}
          </>
        )}
      </div>

      {/* ── Desktop ── */}
      <div className="hidden lg:flex page-x gap-6 pt-8 pb-16 min-h-[calc(100vh-70px)] items-stretch">
        <div className="w-[240px] flex-shrink-0 rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ backgroundColor: '#F8F9FA' }}>
          {desktopSidebar}
        </div>
        <div className="flex-1 min-w-0 rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ backgroundColor: '#F8F9FA' }}>
          {tab === 'profile' && desktopProfilePanel}
          {tab === 'orders' && desktopOrdersPanel}
          {tab === 'addresses' && desktopAddressesPanel}
          {tab === 'wishlist' && desktopWishlistPanel}
        </div>
      </div>

      {/* Delete address confirmation */}
      {deleteAddrConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteAddrConfirmId(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 mx-4 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Delete address?</h3>
            <p className="text-sm text-gray-500 mb-5">This address will be permanently removed.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteAddrConfirmId(null)}
                className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteAddress(deleteAddrConfirmId)}
                disabled={deletingId === deleteAddrConfirmId}
                className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-60"
              >
                {deletingId === deleteAddrConfirmId ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout confirmation */}
      {logoutConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setLogoutConfirmOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 mx-4 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Sign out?</h3>
            <p className="text-sm text-gray-500 mb-5">You will be signed out of your account.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setLogoutConfirmOpen(false)}
                className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogoutConfirmed}
                className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
