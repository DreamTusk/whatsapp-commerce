'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCartDrawer, type SelectedAddress } from '@/contexts/cart-drawer'
import { useCart } from '@/contexts/cart'
import { useAuth } from '@/contexts/auth'
import { clientFetch } from '@/lib/client-api'
import SearchBar from './search-bar'
import type { Store, CustomerAddress } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
const LABEL_OPTIONS = ['Home', 'Work', 'Other']

type PickerView = 'list' | 'add'

interface AddressForm {
  label: string
  door_no: string
  street: string
  address: string
  city: string
  state: string
  country: string
  pincode: string
  is_default: boolean
}

const EMPTY_FORM: AddressForm = { label: 'Home', door_no: '', street: '', address: '', city: '', state: '', country: '', pincode: '', is_default: false }

interface Props {
  store: Store
}

export default function StoreHeaderClient({ store }: Props) {
  const { openCart, selectedAddress, setSelectedAddress } = useCartDrawer()
  const { count } = useCart()
  const { isAuthenticated, requireAuth, customer } = useAuth()
  const router = useRouter()

  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerView, setPickerView] = useState<PickerView>('list')
  const [addresses, setAddresses] = useState<CustomerAddress[]>([])
  const [loadingAddresses, setLoadingAddresses] = useState(false)
  const [locating, setLocating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<AddressForm>(EMPTY_FORM)
  const [formCoords, setFormCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [formError, setFormError] = useState('')

  const addressLine = selectedAddress
    ? (selectedAddress.label ?? selectedAddress.city ?? selectedAddress.pincode ?? 'Selected location')
    : 'Select Location'

  const fetchAddresses = useCallback(async () => {
    if (!isAuthenticated) return
    setLoadingAddresses(true)
    try {
      const data = await clientFetch<{ addresses: CustomerAddress[] }>('/api/storefront/addresses')
      setAddresses(data.addresses)
    } catch {
      setAddresses([])
    } finally {
      setLoadingAddresses(false)
    }
  }, [isAuthenticated])

  function openPicker() {
    setPickerView('list')
    setPickerOpen(true)
  }

  function closePicker() {
    setPickerOpen(false)
    setPickerView('list')
    setForm(EMPTY_FORM)
    setFormCoords(null)
    setFormError('')
  }

  useEffect(() => {
    fetchAddresses()
  }, [fetchAddresses])

  useEffect(() => {
    if (pickerOpen) fetchAddresses()
  }, [pickerOpen, fetchAddresses])

  useEffect(() => {
    if (addresses.length > 0 && selectedAddress === null) {
      const def = addresses.find(a => a.is_default) ?? addresses[0]
      setSelectedAddress({
        id: def.id,
        label: def.label,
        door_no: def.door_no,
        street: def.street,
        address: def.address,
        city: def.city,
        state: def.state,
        country: def.country,
        pincode: def.pincode,
        latitude: def.latitude,
        longitude: def.longitude,
      })
    }
  }, [addresses, selectedAddress, setSelectedAddress])

  useEffect(() => {
    document.body.style.overflow = pickerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [pickerOpen])

  function pickAddress(addr: CustomerAddress) {
    setSelectedAddress({
      id: addr.id,
      label: addr.label,
      door_no: addr.door_no,
      street: addr.street,
      address: addr.address,
      city: addr.city,
      state: addr.state,
      country: addr.country,
      pincode: addr.pincode,
      latitude: addr.latitude,
      longitude: addr.longitude,
    })
    closePicker()
  }

  async function useCurrentLocation() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          )
          const data = await res.json()
          const a = data.address ?? {}
          setFormCoords({ lat: latitude, lng: longitude })
          setForm(f => ({
            ...f,
            door_no:  a.house_number ?? '',
            street:   a.road ?? a.pedestrian ?? a.path ?? '',
            address:  a.suburb ?? a.neighbourhood ?? a.residential ?? a.quarter ?? a.city_district ?? '',
            city:     a.city ?? a.county ?? a.town ?? a.municipality ?? a.village ?? '',
            state:    a.state ?? a.state_district ?? '',
            country:  a.country ?? '',
            pincode:  (a.postcode ?? '').replace(/\D/g, '').slice(0, 6),
          }))
        } catch {
          // silently ignore — user can fill manually
        } finally {
          setLocating(false)
        }
      },
      () => setLocating(false),
      { timeout: 10000 }
    )
  }

  async function saveAddress() {
    if (!form.door_no.trim()) { setFormError('Door No is required'); return }
    if (!form.street.trim()) { setFormError('Street is required'); return }
    if (!form.address.trim()) { setFormError('Area / Landmark is required'); return }
    if (!form.city.trim()) { setFormError('City is required'); return }
    if (!form.pincode.trim()) { setFormError('Pincode is required'); return }
    if (!form.state.trim()) { setFormError('State is required'); return }
    if (!form.country.trim()) { setFormError('Country is required'); return }
    setSaving(true)
    setFormError('')
    try {
      const data = await clientFetch<{ address: CustomerAddress }>('/api/storefront/addresses', {
        method: 'POST',
        body: JSON.stringify({
          label:      form.label,
          door_no:    form.door_no.trim() || null,
          street:     form.street.trim() || null,
          address:    form.address.trim() || null,
          city:       form.city.trim() || null,
          state:      form.state.trim() || null,
          country:    form.country.trim() || null,
          pincode:    form.pincode.trim() || null,
          latitude:   formCoords?.lat ?? null,
          longitude:  formCoords?.lng ?? null,
          is_default: form.is_default,
        }),
      })
      const saved = data.address
      setSelectedAddress({
        id: saved.id,
        label: saved.label,
        door_no: saved.door_no,
        street: saved.street,
        address: saved.address,
        city: saved.city,
        state: saved.state,
        country: saved.country,
        pincode: saved.pincode,
        latitude: saved.latitude,
        longitude: saved.longitude,
      })
      closePicker()
    } catch {
      setFormError('Failed to save address')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-30 border-b border-gray-100 shadow-sm" style={{ backgroundColor: '#F4F4FE' }}>

        {/* ── Mobile + Tablet (< lg): column layout ── */}
        <div className="lg:hidden px-4 py-3 flex flex-col gap-2.5">
          {/* Store name + profile avatar row */}
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              {store.logo && (
                <img src={store.logo.startsWith('http') ? store.logo : `${API_URL}${store.logo}`} alt={store.name} className="w-7 h-7 rounded-lg object-cover" />
              )}
              <span className="text-[22px] font-normal leading-none text-violet-600" style={{ fontFamily: "'Qurova DEMO', sans-serif" }}>
                {store.name}
              </span>
            </Link>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => requireAuth(() => router.push('/account?tab=wishlist'))}
                className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors"
                aria-label="Wishlist"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
              {isAuthenticated && customer ? (
                <Link href="/account" className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0" aria-label="Account">
                  <span className="text-sm font-bold text-white leading-none">
                    {(customer.name ?? customer.phone).charAt(0).toUpperCase()}
                  </span>
                </Link>
              ) : (
                <button
                  onClick={() => requireAuth(() => {})}
                  className="text-xs font-semibold text-indigo-600 px-3 py-1.5 rounded-xl border border-indigo-200 bg-white hover:bg-indigo-50 transition-colors whitespace-nowrap"
                >
                  Sign in
                </button>
              )}
            </div>
          </div>
          {/* Search bar */}
          <SearchBar />
          {/* Location */}
          <button onClick={openPicker} className="flex items-center gap-[5px] hover:opacity-70 transition-opacity self-start">
            <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{addressLine}</span>
            <svg className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* ── Desktop (lg+): single row, page-x aligned ── */}
        <div className="hidden lg:flex w-full h-[70px] px-[5%] items-center gap-8">

            {/* Left: logo + store name + divider + location */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
                {store.logo && (
                  <img src={store.logo.startsWith('http') ? store.logo : `${API_URL}${store.logo}`} alt={store.name} className="w-8 h-8 rounded-xl object-cover" />
                )}
                <span className="text-[30px] font-normal leading-none tracking-normal text-violet-600" style={{ fontFamily: "'Qurova DEMO', sans-serif" }}>
                  {store.name}
                </span>
              </Link>
              <div className="w-px h-5 bg-gray-300 flex-shrink-0" />
              <button onClick={openPicker} className="flex items-center gap-1.5 hover:opacity-70 transition-opacity min-w-0">
                <svg className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm font-medium text-gray-700 truncate max-w-[140px]">{addressLine}</span>
                <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Center: Search — grows to fill */}
            <div className="flex-1">
              <SearchBar />
            </div>

            {/* Right: Orders + Wishlist + Cart + Auth — right-aligned */}
            <div className="flex items-center gap-1 justify-end">
              <button
                onClick={() => requireAuth(() => router.push('/account?tab=orders'))}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
                aria-label="Orders"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="text-[10px] font-medium text-gray-600 leading-none">Orders</span>
              </button>
              <button
                onClick={() => requireAuth(() => router.push('/account?tab=wishlist'))}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
                aria-label="Wishlist"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span className="text-[10px] font-medium text-gray-600 leading-none">Wishlist</span>
              </button>
              <button
                onClick={openCart}
                className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
                aria-label="Cart"
              >
                <div className="relative">
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4m1.6 8L5 5H3m4 8a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4z" />
                  </svg>
                  {count > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] bg-indigo-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium text-gray-600 leading-none">Cart</span>
              </button>
              <div className="w-px h-8 bg-gray-200 mx-1 flex-shrink-0" />
              {isAuthenticated && customer ? (
                <Link
                  href="/account"
                  className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
                  aria-label="Account"
                >
                  <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-[11px] font-bold text-white leading-none">
                      {(customer.name ?? customer.phone).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-gray-600 leading-none">Profile</span>
                </Link>
              ) : (
                <button onClick={() => requireAuth(() => {})} className="text-xs font-semibold text-indigo-600 px-4 py-2 rounded-xl border border-indigo-200 bg-white hover:bg-indigo-50 transition-colors whitespace-nowrap ml-1">
                  Sign in
                </button>
              )}
            </div>
        </div>

      </header>

      {/* ─── Location picker modal ─── */}
      {pickerOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={closePicker} />

          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto overflow-hidden">

              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                {pickerView === 'add' ? (
                  <button
                    onClick={() => { setPickerView('list'); setFormError('') }}
                    className="flex items-center gap-1.5 text-indigo-600 text-sm font-medium hover:text-indigo-800 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </button>
                ) : (
                  <h2 className="font-bold text-gray-900 text-base">Select Location</h2>
                )}
                <button onClick={closePicker} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* ── List view ── */}
              {pickerView === 'list' && (
                <div className="max-h-[70vh] overflow-y-auto">
                  <div className="px-5 py-4 space-y-3">

                    {/* Saved addresses */}
                    {isAuthenticated && (
                      loadingAddresses ? (
                        <div className="flex justify-center py-4">
                          <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : addresses.length > 0 ? (
                        <div>
                          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Saved addresses</p>
                          <div className="space-y-2">
                            {addresses.map(addr => (
                              <button
                                key={addr.id}
                                onClick={() => pickAddress(addr)}
                                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-colors ${
                                  selectedAddress?.id === addr.id
                                    ? 'border-indigo-400 bg-indigo-50'
                                    : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                                }`}
                              >
                                <span className="text-base flex-shrink-0">
                                  {addr.label === 'Home' ? '🏠' : addr.label === 'Work' ? '💼' : '📍'}
                                </span>
                                <div className="min-w-0 flex-1">
                                  {addr.label && <p className="text-sm font-semibold text-gray-800">{addr.label}</p>}
                                  <p className="text-xs text-gray-500 truncate mt-0.5">
                                    {[addr.address, addr.city, addr.pincode].filter(Boolean).join(', ')}
                                  </p>
                                </div>
                                {selectedAddress?.id === addr.id && (
                                  <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                                  </svg>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null
                    )}

                    {/* Add new address / sign-in prompt */}
                    {isAuthenticated ? (
                      <button
                        onClick={() => setPickerView('add')}
                        className="w-full flex items-center gap-2.5 p-3.5 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      >
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-sm font-medium">Add new address</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => { closePicker(); requireAuth(() => openPicker()) }}
                        className="w-full flex items-center gap-2.5 p-3.5 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      >
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-sm font-medium">Sign in to see saved addresses</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ── Add address form ── */}
              {pickerView === 'add' && (
                <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">

                  {/* Use current location — auto-fills the form */}
                  <button
                    onClick={useCurrentLocation}
                    disabled={locating}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-indigo-100 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 transition-colors disabled:opacity-60"
                  >
                    {locating ? (
                      <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    ) : (
                      <svg className="w-4 h-4 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                    <span className="text-sm font-semibold text-indigo-700">
                      {locating ? 'Detecting location…' : 'Use current location'}
                    </span>
                  </button>

                  {/* Label picker */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Label</p>
                    <div className="flex gap-2">
                      {LABEL_OPTIONS.map(opt => (
                        <button
                          key={opt}
                          onClick={() => setForm(f => ({ ...f, label: opt }))}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                            form.label === opt
                              ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          <span>{opt === 'Home' ? '🏠' : opt === 'Work' ? '💼' : '📍'}</span>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Door No + Street */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1.5">Door No</label>
                      <input
                        type="text"
                        value={form.door_no}
                        onChange={e => setForm(f => ({ ...f, door_no: e.target.value }))}
                        placeholder="12A"
                        className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1.5">Street</label>
                      <input
                        type="text"
                        value={form.street}
                        onChange={e => setForm(f => ({ ...f, street: e.target.value }))}
                        placeholder="MG Road"
                        className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Area / Landmark */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1.5">Area / Landmark</label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                      placeholder="Near City Mall, Koramangala…"
                      className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-colors"
                    />
                  </div>

                  {/* City + Pincode */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1.5">City</label>
                      <input
                        type="text"
                        value={form.city}
                        onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                        placeholder="Bengaluru"
                        className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1.5">Pincode</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={form.pincode}
                        onChange={e => setForm(f => ({ ...f, pincode: e.target.value.replace(/\D/g, '') }))}
                        placeholder="560001"
                        className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-colors"
                      />
                    </div>
                  </div>

                  {/* State + Country */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1.5">State</label>
                      <input
                        type="text"
                        value={form.state}
                        onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                        placeholder="Karnataka"
                        className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1.5">Country</label>
                      <input
                        type="text"
                        value={form.country}
                        onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                        placeholder="India"
                        className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Default toggle */}
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <div
                      onClick={() => setForm(f => ({ ...f, is_default: !f.is_default }))}
                      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${form.is_default ? 'bg-indigo-500' : 'bg-gray-200'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_default ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                    <span className="text-sm text-gray-700">Set as default address</span>
                  </label>

                  {formError && <p className="text-xs text-red-500 font-medium">{formError}</p>}

                  <button
                    onClick={saveAddress}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-60"
                  >
                    {saving ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : 'Save address'}
                  </button>
                </div>
              )}

              <div className="h-1" />
            </div>
          </div>
        </>
      )}
    </>
  )
}
