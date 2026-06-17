'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, ImagePlus, Loader, Star, X } from '@deemlol/next-icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/api'
import { useFileUpload } from '@/hooks/useFileUpload'
import type { Category, Brand } from '@/types'
import AppSwitch from '@/components/ui/app-switch'
import { AppSelect } from '@/components/ui/app-select'
import { AppCombobox } from '@/components/ui/app-combobox'
import dynamic from 'next/dynamic'
import { apiErrorMessage } from '@/lib/utils'

const BlockNoteEditor = dynamic(
  () => import('@/components/blocknote-editor/BlockNoteEditor'),
  { ssr: false },
)

function NewProductForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState(searchParams.get('category_id') ?? '')
  const [brandId, setBrandId] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [sellingPrice, setSellingPrice] = useState('')
  const [originalPrice, setOriginalPrice] = useState('')
  const [inStock, setInStock] = useState(true)
  const [unit, setUnit] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [primaryIndex, setPrimaryIndex] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const { uploadFile, isUploading } = useFileUpload()

  useEffect(() => {
    Promise.all([
      api.get('/api/categories').then(r => setCategories(r.data.categories)),
      api.get('/api/brands').then(r => setBrands(r.data.brands)),
    ])
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false))
  }, [])

  function handleImagesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const valid: File[] = []
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds the 10 MB limit and was skipped.`)
      } else {
        valid.push(file)
      }
    }
    if (!valid.length) { e.target.value = ''; return }
    setImageFiles(prev => [...prev, ...valid])
    setImagePreviews(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))])
    e.target.value = ''
  }

  function removeImage(index: number) {
    setImageFiles(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
    setPrimaryIndex(prev => {
      if (prev === index) return 0
      if (prev > index) return prev - 1
      return prev
    })
  }

  async function handleSave() {
    if (!name.trim()) { toast.error('Product name is required'); return }
    if (!categoryId) { toast.error('Category is required'); return }
    if (!sellingPrice || isNaN(parseFloat(sellingPrice))) { toast.error('Selling price is required'); return }
    setIsSaving(true)
    try {
      // Upload in order with primary first
      const ordered = [
        ...imageFiles.slice(primaryIndex),
        ...imageFiles.slice(0, primaryIndex),
      ]
      const mediaIds: string[] = []
      for (const file of ordered) {
        const mid = await uploadFile(file, { entityType: 'PRODUCT' })
        mediaIds.push(mid)
      }

      await api.post('/api/products', {
        name: name.trim(),
        ...(description.trim() && { description: description.trim() }),
        category_id: categoryId,
        ...(brandId && { brand_id: brandId }),
        is_active: String(isActive),
        selling_price: sellingPrice,
        ...(originalPrice && { original_price: originalPrice }),
        in_stock: String(inStock),
        ...(unit.trim() && { unit: unit.trim() }),
        ...(mediaIds.length && { media_ids: mediaIds }),
      })
      toast.success('Product created')
      router.push('/dashboard/products')
    } catch (err: unknown) {
      const msg = apiErrorMessage(err, 'Failed to create product')
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-6 pt-5 pb-4 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-3.5 h-3.5" /> Products
          </button>
          <Button className="bg-[#6366f1] hover:bg-[#4f46e5] text-white h-9 px-4 text-sm" onClick={handleSave} disabled={isSaving || isUploading}>
            {(isSaving || isUploading) && <Loader className="w-3.5 h-3.5 animate-spin mr-1.5" />}
            {isUploading ? 'Uploading…' : isSaving ? 'Saving…' : 'Add product'}
          </Button>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mt-3">Add product</h1>
      </div>

      <div className="flex-1 overflow-auto min-h-0 bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="px-4 py-6">
            <div className="grid grid-cols-3 gap-4 mb-4">

              {/* Product Information */}
              <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Product Information</h2>
                  <div className="mt-2 border-t border-gray-100" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Name <span className="text-destructive">*</span></Label>
                  <Input className="h-11" placeholder="Fresh Apples" value={name} onChange={e => setName(e.target.value)} autoFocus />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Category <span className="text-destructive">*</span></Label>
                  <AppCombobox
                    value={categoryId}
                    onValueChange={setCategoryId}
                    placeholder="Select category"
                    searchPlaceholder="Search categories..."
                    options={categories.filter(c => c.is_active).flatMap(c =>
                      c.children && c.children.length > 0
                        ? c.children.filter(ch => ch.is_active).map(ch => ({ value: ch.id, label: `${c.name} — ${ch.name}` }))
                        : [{ value: c.id, label: c.name }]
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Brand <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
                  <AppCombobox
                    value={brandId}
                    onValueChange={setBrandId}
                    placeholder="No brand"
                    searchPlaceholder="Search brands..."
                    options={brands.map(b => ({ value: b.id, label: b.name }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Description <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
                  <BlockNoteEditor onChange={setDescription} />
                </div>
              </div>

              {/* Images */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Images</h2>
                  <div className="mt-2 border-t border-gray-100" />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {imagePreviews.map((preview, i) => {
                    const isPrimary = i === primaryIndex
                    return (
                      <div
                        key={i}
                        className="relative aspect-square rounded-xl overflow-hidden border bg-gray-50 group"
                        style={{ borderColor: isPrimary ? '#eab308' : '#f3f4f6', borderWidth: isPrimary ? 2 : 1 }}
                      >
                        <img src={preview} alt="" className="w-full h-full object-cover" />

                        {/* Primary badge */}
                        {isPrimary && (
                          <span className="absolute top-1 left-1 bg-yellow-400 rounded-full p-0.5">
                            <Star className="w-2.5 h-2.5 text-white" fill="white" />
                          </span>
                        )}

                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

                        {/* Set primary button */}
                        {!isPrimary && (
                          <button
                            type="button"
                            title="Set as primary"
                            onClick={() => setPrimaryIndex(i)}
                            className="absolute top-1 left-1 w-5 h-5 bg-black/40 hover:bg-yellow-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Star className="w-3 h-3 text-white" />
                          </button>
                        )}

                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/50 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    )
                  })}

                  {/* Add button */}
                  <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 hover:border-[#6366f1] flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors bg-gray-50 hover:bg-[#6366f1]/5 group">
                    <ImagePlus className="w-5 h-5 text-gray-300 group-hover:text-[#6366f1] transition-colors" />
                    <span className="text-xs text-gray-400 group-hover:text-[#6366f1] transition-colors">Add</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="hidden" onChange={handleImagesChange} />
                  </label>
                </div>

                <p className="text-xs text-gray-400">
                  {imagePreviews.length > 0 ? 'Click ★ on an image to set it as primary · ' : ''}JPEG, PNG, WebP, AVIF · Max 10 MB
                </p>
              </div>
            </div>

            {/* Inventory */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Inventory</h2>
                <div className="mt-2 border-t border-gray-100" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Selling price (₹) <span className="text-destructive">*</span></Label>
                  <Input className="h-11" type="number" min={0} step={0.01} placeholder="99" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Original price (₹) <span className="text-gray-400 font-normal text-xs">(for discount)</span></Label>
                  <Input className="h-11" type="number" min={0} step={0.01} placeholder="120" value={originalPrice} onChange={e => setOriginalPrice(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Unit <span className="text-gray-400 font-normal text-xs">(optional, e.g. kg, pcs)</span></Label>
                <Input className="h-11" placeholder="kg" value={unit} onChange={e => setUnit(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Stock</Label>
                  <AppSelect
                    value={inStock ? 'true' : 'false'}
                    onValueChange={v => setInStock(v === 'true')}
                    options={[
                      { value: 'true', label: 'In stock' },
                      { value: 'false', label: 'Out of stock' },
                    ]}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Visibility</Label>
                  <div className="h-11 flex items-center">
                    <AppSwitch checked={isActive} onChange={setIsActive} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <Button className="bg-[#6366f1] hover:bg-[#4f46e5] text-white h-9 px-6 text-sm" onClick={handleSave} disabled={isSaving || isUploading}>
                {(isSaving || isUploading) && <Loader className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                {isUploading ? 'Uploading…' : isSaving ? 'Saving…' : 'Add product'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function NewProductPage() {
  return (
    <Suspense>
      <NewProductForm />
    </Suspense>
  )
}
