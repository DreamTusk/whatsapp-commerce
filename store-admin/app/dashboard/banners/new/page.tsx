'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, ImagePlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { DateTimePicker } from '@/components/ui/date-time-picker'
import api from '@/lib/api'
import type { Product, Collection } from '@/types'

type BannerType = 'product' | 'collection' | 'url'

export default function NewBannerPage() {
  const router = useRouter()

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

  useEffect(() => {
    Promise.all([
      api.get('/api/products').then(r => setProducts(r.data.products)),
      api.get('/api/collections').then(r => setCollections(r.data.collections)),
    ])
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false))
  }, [])

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
      const formData = new FormData()
      formData.append('name', name.trim())
      formData.append('type', type)
      formData.append('is_active', String(isActive))
      if (type === 'product') formData.append('product_id', productId)
      if (type === 'collection') formData.append('collection_id', collectionId)
      if (type === 'url') formData.append('url', url.trim())
      if (imageFile) formData.append('image', imageFile)
      else if (imageUrl.trim()) formData.append('image_url', imageUrl.trim())
      if (startsAt) formData.append('starts_at', new Date(startsAt).toISOString())
      if (expiresAt) formData.append('expires_at', new Date(expiresAt).toISOString())

      await api.post('/api/banners', formData)
      toast.success('Banner created')
      router.push('/dashboard/banners')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to create banner'
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
        <h1 className="text-[26px] font-bold text-gray-900">Add banner</h1>
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
                <select
                  value={collectionId}
                  onChange={e => setCollectionId(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-gray-200 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#6366f1]"
                >
                  <option value="">Select collection</option>
                  {collections.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {type === 'product' && (
              <div className="space-y-1.5">
                <Label className="text-base">Product <span className="text-destructive">*</span></Label>
                <select
                  value={productId}
                  onChange={e => setProductId(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-gray-200 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#6366f1]"
                >
                  <option value="">Select product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
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
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="w-24 h-14 rounded-xl border-2 border-dashed border-gray-200 group-hover:border-[#6366f1] flex items-center justify-center overflow-hidden transition-colors flex-shrink-0">
                  {imagePreview ? (
                    <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImagePlus className="w-5 h-5 text-gray-300 group-hover:text-[#6366f1] transition-colors" />
                  )}
                </div>
                <span className="text-base text-gray-500 group-hover:text-gray-700">
                  {imagePreview ? 'Change image' : 'Upload image'}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
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
              <button
                type="button"
                onClick={() => setIsActive(v => !v)}
                className={`w-full h-11 rounded-lg text-base font-medium border transition-colors ${
                  isActive
                    ? 'bg-green-50 text-green-600 border-green-200'
                    : 'bg-gray-50 text-gray-400 border-gray-200'
                }`}
              >
                {isActive ? 'Active' : 'Inactive'}
              </button>
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
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isSaving ? 'Saving…' : 'Add banner'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
