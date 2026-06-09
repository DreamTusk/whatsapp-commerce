'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Loader2, ImagePlus, Store, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import api from '@/lib/api'
import type { Store as StoreType } from '@/types'
import AppSwitch from '@/components/ui/app-switch'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export default function GeneralPanel() {
  const [store, setStore]     = useState<StoreType | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [name, setName]         = useState('')
  const [phone, setPhone]       = useState('')
  const [address, setAddress]   = useState('')
  const [minOrder, setMinOrder] = useState('')
  const [radius, setRadius]     = useState('')
  const [isActive, setIsActive] = useState(true)
  const [deactivateConfirm, setDeactivateConfirm] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)
  const [logoFile, setLogoFile]     = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.get('/api/store')
      .then(res => {
        const s: StoreType = res.data.store
        setStore(s)
        setName(s.name)
        setPhone(s.phone)
        setAddress(s.address ?? '')
        setMinOrder(String(s.min_order_amount ?? 0))
        setRadius(s.delivery_radius != null ? String(s.delivery_radius) : '')
        setIsActive(s.is_active)
      })
      .catch(() => toast.error('Failed to load store'))
      .finally(() => setLoading(false))
  }, [])

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setLogoFile(file)
    setLogoPreview(file ? URL.createObjectURL(file) : null)
  }

  async function handleSave() {
    if (!name.trim()) { toast.error('Store name is required'); return }
    if (!phone.trim()) { toast.error('Phone is required'); return }
    setIsSaving(true)
    try {
      const formData = new FormData()
      formData.append('name', name.trim())
      formData.append('phone', phone.trim())
      formData.append('address', address.trim())
      formData.append('min_order_amount', minOrder || '0')
      if (radius) formData.append('delivery_radius', radius)
      formData.append('is_active', String(isActive))
      if (logoFile) formData.append('logo', logoFile)

      const res = await api.put('/api/store', formData)
      setStore(res.data.store)
      setLogoFile(null)
      setLogoPreview(null)
      toast.success('Store updated')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to update store'
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  async function toggleStoreStatus(active: boolean) {
    if (!active) { setDeactivateConfirm(true); return }
    try {
      const res = await api.put('/api/store', { is_active: 'true' })
      setStore(res.data.store)
      setIsActive(true)
      toast.success('Store reactivated')
    } catch {
      toast.error('Failed to reactivate store')
    }
  }

  async function handleDeactivate() {
    setIsDeactivating(true)
    try {
      const res = await api.put('/api/store', { is_active: 'false' })
      setStore(res.data.store)
      setIsActive(false)
      setDeactivateConfirm(false)
      toast.success('Store deactivated')
    } catch {
      toast.error('Failed to deactivate store')
    } finally {
      setIsDeactivating(false)
    }
  }

  const currentLogo = logoPreview ?? (store?.logo ? (store.logo.startsWith('http') ? store.logo : `${API_URL}${store.logo}`) : null)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">

      {/* Logo */}
      <div className="space-y-2">
        <Label className="text-base">Logo</Label>
        <label className="flex items-center gap-4 cursor-pointer group w-fit">
          <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 group-hover:border-[#6366f1] flex items-center justify-center overflow-hidden transition-colors flex-shrink-0">
            {currentLogo ? (
              <img src={currentLogo} alt="logo" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Store className="w-6 h-6 text-gray-300 group-hover:text-[#6366f1] transition-colors" />
                <ImagePlus className="w-4 h-4 text-gray-300 group-hover:text-[#6366f1] transition-colors" />
              </div>
            )}
          </div>
          <span className="text-base text-gray-500 group-hover:text-gray-700">
            {currentLogo ? 'Change logo' : 'Upload logo'}
          </span>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
        </label>
      </div>

      {/* Fields */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-base">Store name <span className="text-destructive">*</span></Label>
          <Input className="text-base h-11" value={name} onChange={e => setName(e.target.value)} placeholder="My Store" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-base">Phone <span className="text-destructive">*</span></Label>
          <Input className="text-base h-11" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-base">Address <span className="text-gray-400 font-normal text-sm">(optional)</span></Label>
          <Input className="text-base h-11" value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St, City" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-base">Min order (₹)</Label>
            <Input className="text-base h-11" type="number" min={0} value={minOrder} onChange={e => setMinOrder(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-base">Delivery radius (km) <span className="text-gray-400 font-normal text-sm">(optional)</span></Label>
            <Input className="text-base h-11" type="number" min={0} step={0.1} value={radius} onChange={e => setRadius(e.target.value)} placeholder="e.g. 5" />
          </div>
        </div>
      </div>

      <Button
        className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white h-11 text-base"
        onClick={handleSave}
        disabled={isSaving}
      >
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        {isSaving ? 'Saving…' : 'Save changes'}
      </Button>

    </div>

    {/* ── Store Status — danger zone ── */}
    <div className="bg-red-50 rounded-2xl border border-red-100 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-semibold text-red-700">Store status</p>
          <p className="text-sm text-red-400 mt-0.5">
            {isActive ? 'Your store is live and accepting orders' : 'Your store is currently hidden from customers'}
          </p>
        </div>
        <AppSwitch checked={isActive} onChange={toggleStoreStatus} />
      </div>
      {!isActive && (
        <p className="mt-3 text-xs text-red-400 bg-red-100 rounded-lg px-3 py-2">
          Customers cannot access your store right now. Toggle on to reactivate.
        </p>
      )}
    </div>

      <Dialog open={deactivateConfirm} onOpenChange={setDeactivateConfirm}>
        <DialogContent showCloseButton={false} className="w-full max-w-sm bg-white rounded-2xl p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Deactivate store?</h3>
                <p className="text-sm text-gray-500">Customers won't be able to access your store.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Your store will be hidden and all storefront pages will show an unavailable message. You can reactivate at any time.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeactivateConfirm(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                onClick={handleDeactivate}
                disabled={isDeactivating}
              >
                {isDeactivating ? 'Deactivating…' : 'Deactivate'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
