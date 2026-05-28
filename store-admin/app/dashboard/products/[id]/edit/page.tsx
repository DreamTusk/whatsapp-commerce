'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, ImagePlus, Loader2, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/api'
import type { Product, Category, Brand } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

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
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

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

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setImageFile(file)
    setImagePreview(file ? URL.createObjectURL(file) : null)
  }

  async function handleSave() {
    if (!name.trim()) { toast.error('Product name is required'); return }
    if (!categoryId) { toast.error('Category is required'); return }
    if (!sellingPrice || isNaN(parseFloat(sellingPrice))) {
      toast.error('Selling price is required'); return
    }
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

      await api.put(`/api/products/${id}`, formData)
      toast.success('Product updated')
      router.push(`/dashboard/products/${id}`)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to update product'
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-40 text-gray-400">
        <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-lg font-medium">Product not found</p>
        <button onClick={() => router.back()} className="mt-3 text-base text-[#6366f1] hover:underline cursor-pointer">Go back</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-6 pt-6 pb-4 bg-gray-50">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-base text-gray-500 hover:text-gray-700 mb-3 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Products
        </button>
        <h1 className="text-[26px] font-bold text-gray-900">Edit product</h1>
      </div>
      <div className="flex-1 overflow-auto min-h-0">
        <div className="flex justify-center px-6 py-8">
        <div className="w-full max-w-lg space-y-4">
          {/* Image */}
          <div className="space-y-1.5">
            <Label className="text-base">Image <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 group-hover:border-[#6366f1] flex items-center justify-center overflow-hidden transition-colors flex-shrink-0">
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                ) : product.image_url ? (
                  <img src={product.image_url.startsWith('http') ? product.image_url : `${API_URL}${product.image_url}`} alt="current" className="w-full h-full object-cover" />
                ) : (
                  <ImagePlus className="w-5 h-5 text-gray-300 group-hover:text-[#6366f1] transition-colors" />
                )}
              </div>
              <span className="text-base text-gray-500 group-hover:text-gray-700">
                {imagePreview || product.image_url ? 'Change image' : 'Upload image'}
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
          </div>

          <div className="space-y-1.5">
            <Label className="text-base">Name <span className="text-destructive">*</span></Label>
            <Input
              className="text-base h-11"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-base">Description <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
            <Input
              className="text-base h-11"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-base">Selling price (₹) <span className="text-destructive">*</span></Label>
              <Input
                className="text-base h-11"
                type="number"
                min={0}
                step={0.01}
                value={sellingPrice}
                onChange={e => setSellingPrice(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-base">Original price (₹) <span className="text-gray-400 font-normal text-xs">(for discount)</span></Label>
              <Input
                className="text-base h-11"
                type="number"
                min={0}
                step={0.01}
                placeholder="Leave blank if no discount"
                value={originalPrice}
                onChange={e => setOriginalPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-base">Category <span className="text-destructive">*</span></Label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-gray-200 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#6366f1]"
            >
              <option value="">Select category</option>
              {categories.map(c =>
                c.children && c.children.length > 0 ? (
                  <optgroup key={c.id} label={c.name}>
                    {c.children.map(ch => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
                  </optgroup>
                ) : (
                  <option key={c.id} value={c.id}>{c.name}</option>
                )
              )}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-base">Brand <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
            <select
              value={brandId}
              onChange={e => setBrandId(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-gray-200 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#6366f1]"
            >
              <option value="">No brand</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-base">Stock</Label>
              <button
                type="button"
                onClick={() => setInStock(v => !v)}
                className={`w-full h-11 rounded-lg text-base font-medium border transition-colors cursor-pointer ${inStock ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}
              >
                {inStock ? 'In stock' : 'Out of stock'}
              </button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-base">Visibility</Label>
              <button
                type="button"
                onClick={() => setIsActive(v => !v)}
                className={`w-full h-11 rounded-lg text-base font-medium border transition-colors cursor-pointer ${isActive ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}
              >
                {isActive ? 'Active' : 'Inactive'}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-base">Unit <span className="text-gray-400 font-normal text-xs">(optional, e.g. kg, pcs)</span></Label>
            <Input
              className="text-base h-11"
              placeholder="kg"
              value={unit}
              onChange={e => setUnit(e.target.value)}
            />
          </div>

          <Button
            className="bg-[#6366f1] hover:bg-[#4f46e5] text-white w-full h-11 text-base"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {isSaving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
        </div>
      </div>
    </div>
  )
}
