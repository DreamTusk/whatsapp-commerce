'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, ImagePlus, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { DateTimePicker } from '@/components/ui/date-time-picker'
import api from '@/lib/api'
import { useFileUpload } from '@/hooks/useFileUpload'
import type { Product, Collection, Banner } from '@/types'
import AppSwitch from '@/components/ui/app-switch'
import { AppCombobox } from '@/components/ui/app-combobox'

type BannerType = 'product' | 'collection' | 'url'

export default function EditBannerPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [products, setProducts]         = useState<Product[]>([])
  const [collections, setCollections]   = useState<Collection[]>([])
  const [loading, setLoading]           = useState(true)

  const [name, setName]                 = useState('')
  const [type, setType]                 = useState<BannerType>('collection')
  const [productId, setProductId]       = useState('')
  const [collectionId, setCollectionId] = useState('')
  const [url, setUrl]                   = useState('')
  const [imageFile, setImageFile]       = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageUrl, setImageUrl]         = useState('')
  const [isActive, setIsActive]         = useState(true)
  const [expiresAt, setExpiresAt]       = useState('')
  const [startsAt, setStartsAt]         = useState('')
  const [isSaving, setIsSaving]         = useState(false)
  const { uploadFile, isUploading }     = useFileUpload()

  function toLocalDatetime(iso: string | null) {
    if (!iso) return ''
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  useEffect(() => {
    Promise.all([
      api.get(`/api/banners`).then(r => {
        const banner: Banner = r.data.banners.find((b: Banner) => b.id === id)
        if (!banner) { toast.error('Banner not found'); router.push('/dashboard/banners'); return }
        setName(banner.name)
        setType(banner.type as BannerType)
        setProductId(banner.product_id ?? '')
        setCollectionId(banner.collection_id ?? '')
        setUrl(banner.url ?? '')
        setImageUrl(banner.image_url ?? '')
        setIsActive(banner.status !== 'inactive')
        setStartsAt(toLocalDatetime(banner.starts_at))
        setExpiresAt(toLocalDatetime(banner.expires_at))
      }),
      api.get('/api/products').then(r => setProducts(r.data.products)),
      api.get('/api/collections').then(r => setCollections(r.data.collections)),
    ])
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false))
  }, [id, router])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setImageFile(file)
    setImagePreview(file ? URL.createObjectURL(file) : null)
    if (file) setImageUrl('')
  }

  async function handleSave() {
    if (!name.trim()) { toast.error('Banner name is required'); return }
    if (type === 'product' && !productId) { toast.error('Select a product'); return }
    if (type === 'collection' && !collectionId) { toast.error('Select a collection'); return }
    if (type === 'url' && !url.trim()) { toast.error('URL is required'); return }

    setIsSaving(true)
    try {
      let mediaId: string | undefined
      if (imageFile) {
        mediaId = await uploadFile(imageFile, { entityType: 'BANNER' })
      }

      await api.put(`/api/banners/${id}`, {
        name: name.trim(),
        is_active: String(isActive),
        product_id: type === 'product' ? productId : '',
        collection_id: type === 'collection' ? collectionId : '',
        url: type === 'url' ? url.trim() : '',
        ...(mediaId ? { media_id: mediaId } : { image_url: imageUrl.trim() }),
        starts_at: startsAt ? new Date(startsAt).toISOString() : '',
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : '',
      })
      toast.success('Banner updated')
      router.push('/dashboard/banners')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to update banner'
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-6 pt-6 pb-4 bg-gray-50">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-base text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Banners
        </button>
        <h1 className="text-[26px] font-bold text-gray-900">Edit banner</h1>
      </div>

      <div className="flex-1 overflow-auto min-h-0 px-6 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="max-w-lg mx-auto space-y-5 pt-2">

            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-base">Banner name <span className="text-destructive">*</span></Label>
              <Input
                className="text-base h-11"
                placeholder="e.g. Summer Sale, New Arrivals"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label className="text-base">Links to <span className="text-destructive">*</span></Label>
              <div className="grid grid-cols-3 gap-2">
                {(['collection', 'product', 'url'] as BannerType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`h-11 rounded-lg text-base font-medium border transition-colors capitalize ${
                      type === t
                        ? 'bg-[#6366f1]/10 text-[#6366f1] border-[#6366f1]/30'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional link target */}
            {type === 'collection' && (
              <div className="space-y-1.5">
                <Label className="text-base">Collection <span className="text-destructive">*</span></Label>
                <AppCombobox
                  value={collectionId}
                  onValueChange={setCollectionId}
                  placeholder="Select collection"
                  searchPlaceholder="Search collections..."
                  options={collections.map(c => ({ value: c.id, label: c.name }))}
                />
              </div>
            )}

            {type === 'product' && (
              <div className="space-y-1.5">
                <Label className="text-base">Product <span className="text-destructive">*</span></Label>
                <AppCombobox
                  value={productId}
                  onValueChange={setProductId}
                  placeholder="Select product"
                  searchPlaceholder="Search products..."
                  options={products.map(p => ({ value: p.id, label: p.name }))}
                />
              </div>
            )}

            {type === 'url' && (
              <div className="space-y-1.5">
                <Label className="text-base">URL <span className="text-destructive">*</span></Label>
                <Input
                  className="text-base h-11"
                  placeholder="https://example.com/sale"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                />
              </div>
            )}

            {/* Image */}
            <div className="space-y-2">
              <Label className="text-base">Banner image <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-3 cursor-pointer group w-fit">
                  <div className="w-24 h-14 rounded-xl border-2 border-dashed border-gray-200 group-hover:border-[#6366f1] flex items-center justify-center overflow-hidden transition-colors flex-shrink-0">
                    {(imagePreview || imageUrl) ? (
                      <img src={imagePreview ?? imageUrl} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImagePlus className="w-5 h-5 text-gray-300 group-hover:text-[#6366f1] transition-colors" />
                    )}
                  </div>
                  <span className="text-base text-gray-500 group-hover:text-gray-700">
                    {(imagePreview || imageUrl) ? 'Change image' : 'Upload image'}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null) }}
                    className="p-1.5 rounded-full bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {!imageFile && (
                <div className="space-y-1">
                  <p className="text-sm text-gray-400">or paste an image URL</p>
                  <Input
                    className="text-sm h-9"
                    placeholder="https://picsum.photos/seed/banner/800/400"
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-base">Status</Label>
              <AppSwitch checked={isActive} onChange={setIsActive} />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-base">Starts at <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
                <DateTimePicker value={startsAt} onChange={setStartsAt} placeholder="Pick start date" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-base">Expires at <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
                <DateTimePicker value={expiresAt} onChange={setExpiresAt} placeholder="Pick expiry date" />
              </div>
            </div>

            <Button
              className="bg-[#6366f1] hover:bg-[#4f46e5] text-white w-full h-11 text-base"
              onClick={handleSave}
              disabled={isSaving || isUploading}
            >
              {(isSaving || isUploading) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {isUploading ? 'Uploading…' : isSaving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
