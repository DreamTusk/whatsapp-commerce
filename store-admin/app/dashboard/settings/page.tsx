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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export default function SettingsPage() {
  const [store, setStore]       = useState<StoreType | null>(null)
  const [loading, setLoading]   = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [name, setName]               = useState('')
  const [phone, setPhone]             = useState('')
  const [address, setAddress]         = useState('')
  const [minOrder, setMinOrder]       = useState('')
  const [radius, setRadius]           = useState('')
  const [isActive, setIsActive]         = useState(true)
  const [deactivateConfirm, setDeactivateConfirm] = useState(false)
  const [logoFile, setLogoFile]         = useState<File | null>(null)
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

  const currentLogo = logoPreview ?? (store?.logo ?? null)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-6 pt-6 pb-4 bg-gray-50">
        <h1 className="text-[26px] font-bold text-gray-900">Settings</h1>
        <p className="text-base text-gray-500 mt-0.5">Manage your store details</p>
      </div>

      <div className="flex-1 overflow-auto justify-center items-center min-h-0 px-6 pb-8">
        <div className="max-w-lg space-y-6 pt-2">

          {/* Logo */}
          <div className="space-y-2">
            <Label className="text-base">Logo</Label>
            <label className="flex items-center gap-4 cursor-pointer group w-fit">
              <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 group-hover:border-[#25D366] flex items-center justify-center overflow-hidden transition-colors flex-shrink-0">
                {currentLogo ? (
                  <img src={currentLogo} alt="logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Store className="w-6 h-6 text-gray-300 group-hover:text-[#25D366] transition-colors" />
                    <ImagePlus className="w-4 h-4 text-gray-300 group-hover:text-[#25D366] transition-colors" />
                  </div>
                )}
              </div>
              <span className="text-base text-gray-500 group-hover:text-gray-700">
                {currentLogo ? 'Change logo' : 'Upload logo'}
              </span>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </label>
          </div>

          {/* Active / Inactive */}
          <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div>
              <p className="text-base font-semibold text-gray-900">Store status</p>
              <p className="text-base text-gray-500 mt-0.5">
                {isActive ? 'Your store is live and accepting orders' : 'Your store is hidden from customers'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => isActive ? setDeactivateConfirm(true) : setIsActive(true)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none flex-shrink-0 cursor-pointer ${
                isActive ? 'bg-[#25D366]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Fields */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-base">Store name <span className="text-destructive">*</span></Label>
              <Input
                className="text-base h-11"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="My Store"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-base">Phone <span className="text-destructive">*</span></Label>
              <Input
                className="text-base h-11"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-base">Address <span className="text-gray-400 font-normal text-sm">(optional)</span></Label>
              <Input
                className="text-base h-11"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="123 Main St, City"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-base">Min order (₹)</Label>
                <Input
                  className="text-base h-11"
                  type="number"
                  min={0}
                  value={minOrder}
                  onChange={e => setMinOrder(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-base">Delivery radius (km) <span className="text-gray-400 font-normal text-sm">(optional)</span></Label>
                <Input
                  className="text-base h-11"
                  type="number"
                  min={0}
                  step={0.1}
                  value={radius}
                  onChange={e => setRadius(e.target.value)}
                  placeholder="e.g. 5"
                />
              </div>
            </div>
          </div>

          <Button
            className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white h-11 text-base"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {isSaving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
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
                onClick={() => { setIsActive(false); setDeactivateConfirm(false) }}
              >
                Deactivate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
