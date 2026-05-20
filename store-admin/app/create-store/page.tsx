'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, Store, ImagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/api'

const schema = z.object({
  name: z.string().min(2, 'Store name must be at least 2 characters'),
  phone: z.string().min(7, 'Enter a valid phone number'),
  address: z.string().optional(),
  min_order_amount: z.coerce.number().min(0, 'Cannot be negative').optional(),
  delivery_radius: z.coerce.number().min(0, 'Cannot be negative').optional(),
})

type FormData = z.infer<typeof schema>

export default function CreateStorePage() {
  const router = useRouter()
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { min_order_amount: 0 },
  })

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setLogoFile(file)
    setLogoPreview(file ? URL.createObjectURL(file) : null)
  }

  async function onSubmit(data: FormData) {
    try {
      const formData = new FormData()
      formData.append('name', data.name)
      formData.append('phone', data.phone)
      if (data.address) formData.append('address', data.address)
      formData.append('min_order_amount', String(data.min_order_amount ?? 0))
      if (data.delivery_radius) formData.append('delivery_radius', String(data.delivery_radius))
      if (logoFile) formData.append('logo', logoFile)

      await api.post('/api/store', formData)
      toast.success('Store created! Welcome to your dashboard.')
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to create store. Please try again.'
      toast.error(msg)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#25D366] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
            <Store className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Set up your store</h1>
          <p className="text-sm text-gray-500 mt-1">
            You can update these details any time from settings.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

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
                  <p className="text-sm font-medium text-gray-700">
                    {logoPreview ? 'Change logo' : 'Upload logo'}
                  </p>
                  <p className="text-xs text-gray-400">PNG, JPG up to 5 MB</p>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </label>
            </div>

            {/* Store name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Store name <span className="text-destructive">*</span></Label>
              <Input id="name" placeholder="Fresh Mart" {...register('name')} aria-invalid={!!errors.name} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone">WhatsApp phone number <span className="text-destructive">*</span></Label>
              <Input id="phone" type="tel" placeholder="+91 98765 43210" {...register('phone')} aria-invalid={!!errors.phone} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label htmlFor="address">
                Address <span className="text-gray-400 font-normal text-xs">(optional)</span>
              </Label>
              <Input id="address" placeholder="123 Main Street, City" {...register('address')} />
            </div>

            {/* Min order + Delivery radius */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="min_order_amount">
                  Min order <span className="text-gray-400 font-normal text-xs">(optional)</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                  <Input
                    id="min_order_amount"
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    className="pl-7"
                    {...register('min_order_amount')}
                    aria-invalid={!!errors.min_order_amount}
                  />
                </div>
                {errors.min_order_amount && <p className="text-xs text-destructive">{errors.min_order_amount.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="delivery_radius">
                  Delivery radius <span className="text-gray-400 font-normal text-xs">(optional)</span>
                </Label>
                <div className="relative">
                  <Input
                    id="delivery_radius"
                    type="number"
                    min={0}
                    step={0.1}
                    placeholder="0"
                    className="pr-10"
                    {...register('delivery_radius')}
                    aria-invalid={!!errors.delivery_radius}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">km</span>
                </div>
                {errors.delivery_radius && <p className="text-xs text-destructive">{errors.delivery_radius.message}</p>}
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
