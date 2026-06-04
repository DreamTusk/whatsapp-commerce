'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ImagePlus, Loader2, X, ChevronRight, Package, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import api from '@/lib/api'
import type { Product, Category, Brand } from '@/types'
import AppSwitch from '@/components/ui/app-switch'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Add form state
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formCategoryId, setFormCategoryId] = useState('')
  const [formBrandId, setFormBrandId] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)
  const [formSellingPrice, setFormSellingPrice] = useState('')
  const [formOriginalPrice, setFormOriginalPrice] = useState('')
  const [formInStock, setFormInStock] = useState(true)
  const [formUnit, setFormUnit] = useState('')
  const [formImageFile, setFormImageFile] = useState<File | null>(null)
  const [formImagePreview, setFormImagePreview] = useState<string | null>(null)
  const [formIsSaving, setFormIsSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/api/products').then(r => setProducts(r.data.products)),
      api.get('/api/categories').then(r => setCategories(r.data.categories)),
      api.get('/api/brands').then(r => setBrands(r.data.brands)),
    ])
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false))
  }, [])

  async function fetchProducts(catId?: string) {
    try {
      const params = catId ? `?category_id=${catId}` : ''
      const res = await api.get(`/api/products${params}`)
      setProducts(res.data.products)
    } catch {
      toast.error('Failed to load products')
    }
  }

  function handleFilterChange(catId: string) {
    setFilterCategory(catId)
    setLoading(true)
    fetchProducts(catId || undefined).finally(() => setLoading(false))
  }

  function openForm() {
    setFormName('')
    setFormDescription('')
    setFormCategoryId('')
    setFormBrandId('')
    setFormIsActive(true)
    setFormSellingPrice('')
    setFormOriginalPrice('')
    setFormInStock(true)
    setFormUnit('')
    setFormImageFile(null)
    setFormImagePreview(null)
    setShowForm(true)
  }

  function handleFormImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setFormImageFile(file)
    setFormImagePreview(file ? URL.createObjectURL(file) : null)
  }

  async function handleAddProduct() {
    if (!formName.trim()) { toast.error('Product name is required'); return }
    if (!formCategoryId) { toast.error('Category is required'); return }
    if (!formSellingPrice || isNaN(parseFloat(formSellingPrice))) {
      toast.error('Selling price is required'); return
    }
    setFormIsSaving(true)
    try {
      const formData = new FormData()
      formData.append('name', formName.trim())
      if (formDescription.trim()) formData.append('description', formDescription.trim())
      formData.append('category_id', formCategoryId)
      if (formBrandId) formData.append('brand_id', formBrandId)
      formData.append('is_active', String(formIsActive))
      formData.append('selling_price', formSellingPrice)
      if (formOriginalPrice) formData.append('original_price', formOriginalPrice)
      formData.append('in_stock', String(formInStock))
      if (formUnit.trim()) formData.append('unit', formUnit.trim())
      if (formImageFile) formData.append('image', formImageFile)

      await api.post('/api/products', formData)
      const res = await api.get(filterCategory ? `/api/products?category_id=${filterCategory}` : '/api/products')
      setProducts(res.data.products)
      toast.success('Product created')
      setShowForm(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to create product'
      toast.error(msg)
    } finally {
      setFormIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await api.delete(`/api/products/${deleteTarget.id}`)
      setProducts(prev => prev.filter(p => p.id !== deleteTarget.id))
      toast.success('Product deleted')
      setDeleteTarget(null)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to delete product'
      toast.error(msg)
    } finally {
      setIsDeleting(false)
    }
  }

  // ── Add form view ──────────────────────────────────────────────────────────
  if (showForm) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-shrink-0 px-6 pt-6 pb-4 bg-gray-50">
          <button
            onClick={() => setShowForm(false)}
            className="flex items-center gap-1.5 text-base text-gray-500 hover:text-gray-700 mb-3 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Products
          </button>
          <h1 className="text-[26px] font-bold text-gray-900">Add product</h1>
        </div>
        <div className="flex-1 overflow-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="flex justify-center px-6 py-8">
            <div className="w-full max-w-4xl">
            <div className="grid grid-cols-2 gap-5 mb-5">

              {/* ── Product Information ── */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Product Information</h2>
                  <div className="mt-2 border-t border-gray-100" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-base">Name <span className="text-destructive">*</span></Label>
                  <Input className="text-base h-11" placeholder="Fresh Apples" value={formName} onChange={e => setFormName(e.target.value)} autoFocus />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-base">Description <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
                  <Input className="text-base h-11" placeholder="Fresh imported apples…" value={formDescription} onChange={e => setFormDescription(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-base">Category <span className="text-destructive">*</span></Label>
                  <select value={formCategoryId} onChange={e => setFormCategoryId(e.target.value)} className="w-full h-11 px-3 rounded-lg border border-gray-200 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#6366f1] cursor-pointer">
                    <option value="">Select category</option>
                    {categories.map(c =>
                      c.children && c.children.length > 0
                        ? c.children.map(ch => <option key={ch.id} value={ch.id}>{c.name} — {ch.name}</option>)
                        : <option key={c.id} value={c.id}>{c.name}</option>
                    )}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-base">Brand <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
                  <select value={formBrandId} onChange={e => setFormBrandId(e.target.value)} className="w-full h-11 px-3 rounded-lg border border-gray-200 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#6366f1] cursor-pointer">
                    <option value="">No brand</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              {/* ── Images & Videos ── */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Images &amp; Videos</h2>
                  <div className="mt-2 border-t border-gray-100" />
                </div>
                <label className="flex items-center gap-3 cursor-pointer group w-fit">
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 group-hover:border-[#6366f1] flex items-center justify-center overflow-hidden transition-colors flex-shrink-0">
                    {formImagePreview
                      ? <img src={formImagePreview} alt="preview" className="w-full h-full object-cover" />
                      : <ImagePlus className="w-5 h-5 text-gray-300 group-hover:text-[#6366f1] transition-colors" />}
                  </div>
                  <span className="text-base text-gray-500 group-hover:text-gray-700">{formImagePreview ? 'Change image' : 'Upload image'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFormImageChange} />
                </label>
              </div>

            </div>{/* end grid */}

              {/* ── Inventory ── */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Inventory</h2>
                  <div className="mt-2 border-t border-gray-100" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-base">Selling price (₹) <span className="text-destructive">*</span></Label>
                    <Input className="text-base h-11" type="number" min={0} step={0.01} placeholder="99" value={formSellingPrice} onChange={e => setFormSellingPrice(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-base">Original price (₹) <span className="text-gray-400 font-normal text-xs">(for discount)</span></Label>
                    <Input className="text-base h-11" type="number" min={0} step={0.01} placeholder="120" value={formOriginalPrice} onChange={e => setFormOriginalPrice(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-base">Unit <span className="text-gray-400 font-normal text-xs">(optional, e.g. kg, pcs)</span></Label>
                  <Input className="text-base h-11" placeholder="kg" value={formUnit} onChange={e => setFormUnit(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-base">Stock</Label>
                    <select
                      value={formInStock ? 'true' : 'false'}
                      onChange={e => setFormInStock(e.target.value === 'true')}
                      className="w-full h-11 px-3 rounded-lg border border-gray-200 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#6366f1] cursor-pointer"
                    >
                      <option value="true">In stock</option>
                      <option value="false">Out of stock</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-base">Visibility</Label>
                    <AppSwitch checked={formIsActive} onChange={setFormIsActive} />
                  </div>
                </div>
              </div>

              <Button className="bg-[#6366f1] hover:bg-[#4f46e5] text-white w-full h-11 text-base mt-5" onClick={handleAddProduct} disabled={formIsSaving}>
                {formIsSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {formIsSaving ? 'Saving…' : 'Add product'}
              </Button>
            </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-6 pt-6 pb-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[26px] font-bold text-gray-900">Products</h1>
            <p className="text-base text-gray-500 mt-0.5">{products.length} products</p>
          </div>
          <Button onClick={openForm} className="bg-[#6366f1] hover:bg-[#4f46e5] text-white gap-2">
            <Plus className="w-4 h-4" /> Add product
          </Button>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="flex-shrink-0 px-6 pb-4 bg-gray-50">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleFilterChange('')}
              className={`px-3 py-1.5 rounded-full text-base font-medium transition-colors cursor-pointer ${
                !filterCategory ? 'bg-[#6366f1] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {categories.map(cat =>
              cat.children && cat.children.length > 0 ? (
                cat.children.map(child => (
                  <button
                    key={child.id}
                    onClick={() => handleFilterChange(child.id)}
                    className={`px-3 py-1.5 rounded-full text-base font-medium transition-colors cursor-pointer ${
                      filterCategory === child.id ? 'bg-[#6366f1] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {child.name}
                  </button>
                ))
              ) : (
                <button
                  key={cat.id}
                  onClick={() => handleFilterChange(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-base font-medium transition-colors cursor-pointer ${
                    filterCategory === cat.id ? 'bg-[#6366f1] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.name}
                </button>
              )
            )}
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 px-6 pt-6 pb-4 flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-xl font-medium">No products yet</p>
            <p className="text-base mt-1">Add your first product to get started</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto min-h-0">
            <table className="w-full text-base min-w-[1060px]">
              <thead className="bg-indigo-50 border-b border-indigo-100 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide">Product</th>
                  <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Category</th>
                  <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Brand</th>
                  <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide">Selling Price</th>
                  <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide">Original Price</th>
                  <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide">Offer</th>
                  <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Stock</th>
                  <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map(p => (
                  <tr
                    key={p.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/products/${p.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          <img src={p.image_url.startsWith('http') ? p.image_url : `${API_URL}${p.image_url}`} alt={p.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <ImagePlus className="w-4 h-4 text-gray-300" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{p.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-base hidden sm:table-cell">{p.category.name}</td>
                    <td className="px-4 py-3 text-gray-500 text-base hidden md:table-cell">{p.brand?.name ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-base font-semibold text-gray-900">₹{p.selling_price}</td>
                    <td className="px-4 py-3 text-base text-gray-400">
                      {p.original_price != null && p.original_price > p.selling_price ? `₹${p.original_price}` : <span className="text-gray-200">—</span>}
                    </td>
                    <td className="px-4 py-3 text-base">
                      {p.discount_percent != null
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-600">{p.discount_percent}% off</span>
                        : <span className="text-gray-200">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`text-base font-medium px-2.5 py-1 rounded-full ${
                        p.in_stock ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                      }`}>
                        {p.in_stock ? 'In stock' : 'Out of stock'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-base font-medium px-2.5 py-1 rounded-full ${
                        p.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-0.5 justify-end">
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/products/${p.id}/edit`) }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(p) }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-gray-300 ml-1" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
             
            </table>
            </div>
            <div className="flex-shrink-0 px-4 py-2.5 bg-gray-50 rounded-b-2xl border-t border-gray-100">
              <p className="text-base text-gray-500">{products.length} products</p>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent showCloseButton={false} className="w-full max-w-sm bg-white rounded-2xl p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <X className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete product?</h3>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              <span className="font-semibold">{deleteTarget?.name}</span> will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isDeleting ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
