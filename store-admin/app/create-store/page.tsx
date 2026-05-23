'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Store, ImagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/api'

const BASE_DOMAIN = process.env.NEXT_PUBLIC_STORE_DOMAIN ?? 'localhost'

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
}

export default function CreateStorePage() {
  const router = useRouter()
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [slug, setSlug] = useState('')
  const [address, setAddress] = useState('')
  const [minOrderAmount, setMinOrderAmount] = useState('')
  const [deliveryRadius, setDeliveryRadius] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})

  const fullDomain = `${slug}.${BASE_DOMAIN}`

  function handleNameChange(value: string) {
    setName(value)
    setSlug(toSlug(value))
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setLogoFile(file)
    setLogoPreview(file ? URL.createObjectURL(file) : null)
  }

  function validate() {
    const errs: Record<string, string> = {}
    if (name.trim().length < 2) errs.name = 'Store name must be at least 2 characters'
    if (phone.trim().length < 7) errs.phone = 'Enter a valid phone number'
    if (!slug || slug.length < 2) errs.slug = 'Subdomain must be at least 2 characters'
    if (!/^[a-z0-9-]+$/.test(slug)) errs.slug = 'Only lowercase letters, numbers, and hyphens allowed'
    return errs
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('name', name.trim())
      formData.append('phone', phone.trim())
      formData.append('domain', fullDomain)
      if (address.trim()) formData.append('address', address.trim())
      formData.append('min_order_amount', String(parseFloat(minOrderAmount) || 0))
      if (deliveryRadius) formData.append('delivery_radius', String(parseFloat(deliveryRadius)))
      if (logoFile) formData.append('logo', logoFile)

      await api.post('/api/store', formData)
      toast.success('Store created! Welcome to your dashboard.')
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to create store. Please try again.'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#25D366] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
            <Store className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Set up your store</h1>
          <p className="text-sm text-gray-500 mt-1">You can update these details any time from settings.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={onSubmit} className="space-y-5">

            {/* Logo */}
            <div className="space-y-1.5">
              <Label>Store logo <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
              <label className="flex items-center gap-4 cursor-pointer group">
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 group-hover:border-[#25D366] flex items-center justify-center overflow-hidden transition-colors flex-shrink-0">
                  {logoPreview ? (
                    <img src={logoPreview} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImagePlus className="w-5 h-5 text-gray-300 group-hover:text-[#25D366] transition-colors" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">{logoPreview ? 'Change logo' : 'Upload logo'}</p>
                  <p className="text-xs text-gray-400">PNG, JPG up to 5 MB</p>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </label>
            </div>

            {/* Store name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Store name <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                placeholder="Fresh Mart"
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                aria-invalid={!!errors.name}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone">WhatsApp phone number <span className="text-destructive">*</span></Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                aria-invalid={!!errors.phone}
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>

            {/* Domain — slug editable, base domain read-only */}
            <div className="space-y-1.5">
              <Label htmlFor="slug">Store subdomain <span className="text-destructive">*</span></Label>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-[#25D366] focus-within:border-transparent">
                <input
                  id="slug"
                  type="text"
                  placeholder="freshmart"
                  value={slug}
                  onChange={e => setSlug(toSlug(e.target.value))}
                  className="flex-1 h-10 px-3 text-sm text-gray-900 bg-white outline-none"
                  aria-invalid={!!errors.slug}
                />
                <span className="h-10 px-3 flex items-center text-sm text-gray-400 bg-gray-50 border-l border-gray-200 select-none whitespace-nowrap">
                  .{BASE_DOMAIN}
                </span>
              </div>
              {errors.slug
                ? <p className="text-xs text-destructive">{errors.slug}</p>
                : slug
                  ? <p className="text-xs text-gray-400">Your store will be at <span className="font-medium text-gray-600">{fullDomain}</span></p>
                  : <p className="text-xs text-gray-400">Auto-filled from store name — you can edit it</p>
              }
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label htmlFor="address">Address <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
              <Input
                id="address"
                placeholder="123 Main Street, City"
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
            </div>

            {/* Min order + Delivery radius */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="min_order_amount">Min order <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                  <Input
                    id="min_order_amount"
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    className="pl-7"
                    value={minOrderAmount}
                    onChange={e => setMinOrderAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="delivery_radius">Delivery radius <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
                <div className="relative">
                  <Input
                    id="delivery_radius"
                    type="number"
                    min={0}
                    step={0.1}
                    placeholder="0"
                    className="pr-10"
                    value={deliveryRadius}
                    onChange={e => setDeliveryRadius(e.target.value)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">km</span>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white mt-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isSubmitting ? 'Creating store…' : 'Create store'}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          WhatsApp integration can be configured in settings.
        </p>
      </div>
    </div>
  )
}
