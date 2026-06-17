'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, ImagePlus, Loader, Package, Star, X } from '@deemlol/next-icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/api'
import { useFileUpload } from '@/hooks/useFileUpload'
import type { Product, ProductMediaItem, Category, Brand } from '@/types'
import AppSwitch from '@/components/ui/app-switch'
import { AppSelect } from '@/components/ui/app-select'
import { AppCombobox } from '@/components/ui/app-combobox'
import dynamic from 'next/dynamic'
import { apiErrorMessage } from '@/lib/utils'

const BlockNoteEditor = dynamic(
  () => import('@/components/blocknote-editor/BlockNoteEditor'),
  { ssr: false },
)

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [product, setProduct] = useState<Product | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [brandId, setBrandId] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [sellingPrice, setSellingPrice] = useState('')
  const [originalPrice, setOriginalPrice] = useState('')
  const [inStock, setInStock] = useState(true)
  const [unit, setUnit] = useState('')
  const [existingImages, setExistingImages] = useState<ProductMediaItem[]>([])
  const [newImageFiles, setNewImageFiles] = useState<File[]>([])
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const { uploadFile, isUploading } = useFileUpload()
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const fetchProduct = useCallback(async () => {
    const res = await api.get(`/api/products/${id}`)
    const p: Product = res.data.product
    setProduct(p)
    setName(p.name)
    setDescription(p.description ?? '')
    setCategoryId(p.category.id)
    setBrandId(p.brand?.id ?? '')
    setIsActive(p.is_active)
    setSellingPrice(String(p.selling_price))
    setOriginalPrice(p.original_price != null ? String(p.original_price) : '')
    setInStock(p.in_stock)
    setUnit(p.unit ?? '')
    setExistingImages(p.images)
  }, [id])

  useEffect(() => {
    Promise.all([
      fetchProduct(),
      api.get('/api/categories').then(r => setCategories(r.data.categories)),
      api.get('/api/brands').then(r => setBrands(r.data.brands)),
    ])
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false))
  }, [fetchProduct])

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
    setNewImageFiles(prev => [...prev, ...valid])
    setNewImagePreviews(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))])
    e.target.value = ''
  }

  function removeNewImage(index: number) {
    setNewImageFiles(prev => prev.filter((_, i) => i !== index))
    setNewImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  async function removeExistingImage(pmId: string) {
    try {
      await api.delete(`/api/products/${id}/media/${pmId}`)
      setExistingImages(prev => {
        const wasPrimary = prev.find(img => img.id === pmId)?.is_primary
        const next = prev.filter(img => img.id !== pmId)
        if (wasPrimary && next.length > 0) {
          return next.map((img, i) => ({ ...img, is_primary: i === 0 }))
        }
        return next
      })
    } catch {
      toast.error('Failed to remove image')
    }
  }

  async function setPrimaryImage(pmId: string) {
    try {
      await api.patch(`/api/products/${id}/media/${pmId}/primary`)
      setExistingImages(prev => prev.map(img => ({ ...img, is_primary: img.id === pmId })))
    } catch {
      toast.error('Failed to set primary image')
    }
  }

  async function handleSave() {
    if (!name.trim()) { toast.error('Product name is required'); return }
    if (!categoryId) { toast.error('Category is required'); return }
    if (!sellingPrice || isNaN(parseFloat(sellingPrice))) { toast.error('Selling price is required'); return }
    setIsSaving(true)
    try {
      const mediaIds: string[] = []
      for (const file of newImageFiles) {
        const mid = await uploadFile(file, { entityType: 'PRODUCT' })
        mediaIds.push(mid)
      }

      await api.put(`/api/products/${id}`, {
        name: name.trim(),
        description: description.trim() || null,
        category_id: categoryId,
        brand_id: brandId || null,
        is_active: String(isActive),
        selling_price: sellingPrice,
        original_price: originalPrice || null,
        in_stock: String(inStock),
        unit: unit.trim() || null,
        ...(mediaIds.length && { media_ids: mediaIds }),
      })
      toast.success('Product updated')
      router.push('/dashboard/products')
    } catch (err: unknown) {
      const msg = apiErrorMessage(err, 'Failed to update product')
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await api.delete(`/api/products/${id}`)
      toast.success('Product deleted')
      router.push('/dashboard/products')
    } catch {
      toast.error('Failed to delete product')
    } finally {
      setIsDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <Loader className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-40 text-gray-400">
        <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-lg font-medium">Product not found</p>
        <button onClick={() => router.back()} className="mt-3 text-base text-[#6366f1] hover:underline">Go back</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-6 pt-5 pb-4 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-3.5 h-3.5" /> Products
          </button>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-9 px-4 text-sm text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600" onClick={() => setConfirmDelete(true)} disabled={isDeleting}>
              Delete
            </Button>
            <Button className="bg-[#6366f1] hover:bg-[#4f46e5] text-white h-9 px-4 text-sm" onClick={handleSave} disabled={isSaving || isUploading}>
              {(isSaving || isUploading) && <Loader className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              {isUploading ? 'Uploading…' : isSaving ? 'Saving…' : 'Update'}
            </Button>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mt-3">Edit product</h1>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Delete product?</h2>
            <p className="text-sm text-gray-500">This action cannot be undone.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-10" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              <Button className="flex-1 h-10 bg-red-500 hover:bg-red-600 text-white" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting && <Loader className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                {isDeleting ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto min-h-0 bg-gray-50">
        <div className="px-4 py-6">
          <div className="grid grid-cols-3 gap-4 mb-4">

            {/* Product Information */}
            <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Product Information</h2>
                <div className="mt-2 border-t border-gray-100" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-base">Name <span className="text-destructive">*</span></Label>
                <Input className="text-base h-11" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-base">Category <span className="text-destructive">*</span></Label>
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
                <Label className="text-base">Brand <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
                <AppCombobox
                  value={brandId}
                  onValueChange={setBrandId}
                  placeholder="No brand"
                  searchPlaceholder="Search brands..."
                  options={brands.map(b => ({ value: b.id, label: b.name }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-base">Description <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
                <BlockNoteEditor onChange={setDescription} initialContent={description} />
              </div>
            </div>

            {/* Images */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Images</h2>
                <div className="mt-2 border-t border-gray-100" />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* Existing saved images */}
                {existingImages.map(img => (
                  <div
                    key={img.id}
                    className="relative aspect-square rounded-xl overflow-hidden bg-gray-50 group"
                    style={{ border: img.is_primary ? '2px solid #eab308' : '1px solid #f3f4f6' }}
                  >
                    <img src={img.url ?? ''} alt="" className="w-full h-full object-cover" />

                    {img.is_primary && (
                      <span className="absolute top-1 left-1 bg-yellow-400 rounded-full p-0.5">
                        <Star className="w-2.5 h-2.5 text-white" fill="white" />
                      </span>
                    )}

                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

                    {!img.is_primary && (
                      <button
                        type="button"
                        title="Set as primary"
                        onClick={() => setPrimaryImage(img.id)}
                        className="absolute top-1 left-1 w-5 h-5 bg-black/40 hover:bg-yellow-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Star className="w-3 h-3 text-white" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => removeExistingImage(img.id)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/50 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}

                {/* Queued new images (dashed border = not yet saved) */}
                {newImagePreviews.map((preview, i) => (
                  <div
                    key={`new-${i}`}
                    className="relative aspect-square rounded-xl overflow-hidden border-2 border-dashed border-[#6366f1]/40 bg-gray-50 group"
                  >
                    <img src={preview} alt="" className="w-full h-full object-cover opacity-80" />
                    <button
                      type="button"
                      onClick={() => removeNewImage(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/50 hover:bg-red-500 rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}

                {/* Add more images */}
                <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 hover:border-[#6366f1] flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors bg-gray-50 hover:bg-[#6366f1]/5 group">
                  <ImagePlus className="w-5 h-5 text-gray-300 group-hover:text-[#6366f1] transition-colors" />
                  <span className="text-xs text-gray-400 group-hover:text-[#6366f1] transition-colors">Add</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="hidden" onChange={handleImagesChange} />
                </label>
              </div>

              {existingImages.length > 0 && (
                <p className="text-xs text-gray-400">Hover image — ★ sets primary · ✕ removes · JPEG, PNG, WebP, AVIF · Max 10 MB</p>
              )}
              {newImagePreviews.length > 0 && (
                <p className="text-xs text-[#6366f1]/60">Dashed = will upload on save</p>
              )}
            </div>

          </div>

          {/* Inventory */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Inventory</h2>
              <div className="mt-2 border-t border-gray-100" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-base">Selling price (₹) <span className="text-destructive">*</span></Label>
                <Input className="text-base h-11" type="number" min={0} step={0.01} value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-base">Original price (₹) <span className="text-gray-400 font-normal text-xs">(for discount)</span></Label>
                <Input className="text-base h-11" type="number" min={0} step={0.01} placeholder="Leave blank if no discount" value={originalPrice} onChange={e => setOriginalPrice(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-base">Unit <span className="text-gray-400 font-normal text-xs">(optional, e.g. kg, pcs)</span></Label>
              <Input className="text-base h-11" placeholder="kg" value={unit} onChange={e => setUnit(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-base">Stock</Label>
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
                <Label className="text-base">Visibility</Label>
                <AppSwitch checked={isActive} onChange={setIsActive} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" className="h-9 px-4 text-sm text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600" onClick={() => setConfirmDelete(true)} disabled={isDeleting}>
              Delete
            </Button>
            <Button className="bg-[#6366f1] hover:bg-[#4f46e5] text-white h-9 px-6 text-sm" onClick={handleSave} disabled={isSaving || isUploading}>
              {(isSaving || isUploading) && <Loader className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              {isUploading ? 'Uploading…' : isSaving ? 'Saving…' : 'Update'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
