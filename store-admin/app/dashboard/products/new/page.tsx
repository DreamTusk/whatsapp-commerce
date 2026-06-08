'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, ImagePlus, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/api'
import type { Category, Brand } from '@/types'
import AppSwitch from '@/components/ui/app-switch'
import { AppSelect } from '@/components/ui/app-select'
import { AppCombobox } from '@/components/ui/app-combobox'
import dynamic from 'next/dynamic'

const BlockNoteEditor = dynamic(
  () => import('@/components/blocknote-editor/BlockNoteEditor'),
  { ssr: false },
)

export default function NewProductPage() {
  const router = useRouter()

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
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/api/categories').then(r => setCategories(r.data.categories)),
      api.get('/api/brands').then(r => setBrands(r.data.brands)),
    ])
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false))
  }, [])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setImageFile(file)
    setImagePreview(file ? URL.createObjectURL(file) : null)
  }

  async function handleSave() {
    if (!name.trim()) { toast.error('Product name is required'); return }
    if (!categoryId) { toast.error('Category is required'); return }
    if (!sellingPrice || isNaN(parseFloat(sellingPrice))) { toast.error('Selling price is required'); return }
    setIsSaving(true)
    try {
      const formData = new FormData()
      formData.append('name', name.trim())
      if (description.trim()) formData.append('description', description.trim())
      formData.append('category_id', categoryId)
      if (brandId) formData.append('brand_id', brandId)
      formData.append('is_active', String(isActive))
      formData.append('selling_price', sellingPrice)
      if (originalPrice) formData.append('original_price', originalPrice)
      formData.append('in_stock', String(inStock))
      if (unit.trim()) formData.append('unit', unit.trim())
      if (imageFile) formData.append('image', imageFile)

      await api.post('/api/products', formData)
      toast.success('Product created')
      router.push('/dashboard/products')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to create product'
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
          <Button className="bg-[#6366f1] hover:bg-[#4f46e5] text-white h-9 px-4 text-sm" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
            {isSaving ? 'Saving…' : 'Add product'}
          </Button>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mt-3">Add product</h1>
      </div>

      <div className="flex-1 overflow-auto min-h-0 bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
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
                    options={categories.flatMap(c =>
                      c.children && c.children.length > 0
                        ? c.children.map(ch => ({ value: ch.id, label: `${c.name} — ${ch.name}` }))
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

              {/* Image */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Image</h2>
                  <div className="mt-2 border-t border-gray-100" />
                </div>
                <div className="relative w-full aspect-square rounded-xl border-2 border-dashed border-gray-200 overflow-hidden bg-gray-50 group">
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setImageFile(null); setImagePreview(null) }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
                      >
                        <X className="w-3.5 h-3.5 text-white" />
                      </button>
                    </>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-full gap-2 cursor-pointer group-hover:border-[#6366f1]">
                      <ImagePlus className="w-7 h-7 text-gray-300 group-hover:text-[#6366f1] transition-colors" />
                      <span className="text-xs text-gray-400 group-hover:text-[#6366f1] transition-colors">Upload image</span>
                      <span className="text-xs text-gray-300">PNG, JPG up to 5MB</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    </label>
                  )}
                </div>
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
              <Button className="bg-[#6366f1] hover:bg-[#4f46e5] text-white h-9 px-6 text-sm" onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                {isSaving ? 'Saving…' : 'Add product'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
