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
import { apiErrorMessage } from '@/lib/utils'
import { useFileUpload } from '@/hooks/useFileUpload'

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
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploadFile, isUploading } = useFileUpload()

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
    if (!file) return
    setPendingLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!name.trim()) { toast.error('Store name is required'); return }
    if (!phone.trim()) { toast.error('Phone is required'); return }
    setIsSaving(true)
    try {
      let logoMediaId: string | undefined
      if (pendingLogoFile) {
        logoMediaId = await uploadFile(pendingLogoFile, { entityType: 'STORE' })
      }

      const res = await api.put('/api/store', {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        min_order_amount: minOrder || '0',
        ...(radius && { delivery_radius: radius }),
        is_active: String(isActive),
        ...(logoMediaId && { logo_media_id: logoMediaId }),
      })
      setStore(res.data.store)
      setPendingLogoFile(null)
      setLogoPreview(null)
      toast.success('Store updated')
    } catch (err: unknown) {
      const msg = apiErrorMessage(err, 'Failed to update store')
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

  const currentLogo = logoPreview ?? store?.logo ?? null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
    <div className="bg-white border rounded-sm border-gray-100 shadow-sm p-6 space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-gray-900">Store details</h2>
        <p className="text-sm text-gray-400 mt-0.5">Update and customize your store's information.</p>
      </div>

      {/* Logo */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">Logo</Label>
        <label className="flex items-center gap-4 cursor-pointer group w-fit">
          <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 group-hover:border-[#6366f1] flex items-center justify-center overflow-hidden transition-colors flex-shrink-0">
            {currentLogo ? (
              <img src={currentLogo} alt="logo" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Store className="w-5 h-5 text-gray-300 group-hover:text-[#6366f1] transition-colors" />
                <ImagePlus className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#6366f1] transition-colors" />
              </div>
            )}
          </div>
          <span className="text-sm text-gray-500 group-hover:text-gray-700">
            {currentLogo ? 'Change logo' : 'Upload logo'}
          </span>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={handleLogoChange} />
        </label>
      </div>

      {/* Fields */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Store name <span className="text-destructive">*</span></Label>
            <Input className="h-11" value={name} onChange={e => setName(e.target.value)} placeholder="My Store" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Phone <span className="text-destructive">*</span></Label>
            <Input className="h-11" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700">Address <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
          <Input className="h-11" value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St, City" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Min order (₹)</Label>
            <Input className="h-11" type="number" min={0} value={minOrder} onChange={e => setMinOrder(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Delivery radius (km) <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
            <Input className="h-11" type="number" min={0} step={0.1} value={radius} onChange={e => setRadius(e.target.value)} placeholder="e.g. 5" />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          className="bg-[#6366f1] hover:bg-[#4f46e5] text-white h-10 px-6"
          onClick={handleSave}
          disabled={isSaving || isUploading}
        >
          {(isSaving || isUploading) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {isUploading ? 'Uploading logo…' : isSaving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>

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
