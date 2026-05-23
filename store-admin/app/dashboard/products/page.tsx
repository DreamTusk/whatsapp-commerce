'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ImagePlus, Loader2, X, ChevronRight, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import api from '@/lib/api'
import type { Product, Category, Brand } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [name, setName] = useState('')
  const [nameLocal, setNameLocal] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [brandId, setBrandId] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [isActive, setIsActive] = useState(true)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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

  function openAdd() {
    setEditing(null)
    setName(''); setNameLocal(''); setDescription('')
    setCategoryId(categories[0]?.id ?? ''); setBrandId('')
    setSortOrder('0'); setIsActive(true)
    setImageFile(null); setImagePreview(null)
    setModalOpen(true)
  }

  function openEdit(p: Product, e: React.MouseEvent) {
    e.stopPropagation()
    setEditing(p)
    setName(p.name); setNameLocal(p.name_local ?? ''); setDescription(p.description ?? '')
    setCategoryId(p.category.id); setBrandId(p.brand?.id ?? '')
    setSortOrder(String(p.sort_order)); setIsActive(p.is_active)
    setImageFile(null); setImagePreview(null)
    setModalOpen(true)
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setImageFile(file)
    setImagePreview(file ? URL.createObjectURL(file) : null)
  }

  async function handleSave() {
    if (!name.trim() || !categoryId) {
      toast.error('Name and category are required'); return
    }
    setIsSaving(true)
    try {
      const formData = new FormData()
      formData.append('name', name.trim())
      if (nameLocal.trim()) formData.append('name_local', nameLocal.trim())
      if (description.trim()) formData.append('description', description.trim())
      formData.append('category_id', categoryId)
      if (brandId) formData.append('brand_id', brandId)
      formData.append('sort_order', sortOrder)
      formData.append('is_active', String(isActive))
      if (imageFile) formData.append('image', imageFile)

      if (editing) {
        const res = await api.put(`/api/products/${editing.id}`, formData)
        setProducts(prev => prev.map(p => p.id === editing.id ? res.data.product : p))
        toast.success('Product updated')
      } else {
        const res = await api.post('/api/products', formData)
        setProducts(prev => [...prev, res.data.product])
        toast.success('Product created — add variants from the detail page')
      }
      setModalOpen(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to save product'
      toast.error(msg)
    } finally {
      setIsSaving(false)
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

  function formatPriceRange(range: Product['price_range']) {
    if (!range) return <span className="text-gray-300">—</span>
    if (range.min === range.max) return <span>₹{range.min}</span>
    return <span>₹{range.min} – ₹{range.max}</span>
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">{products.length} products</p>
        </div>
        <Button onClick={openAdd} className="bg-[#25D366] hover:bg-[#1ebe5d] text-white gap-2">
          <Plus className="w-4 h-4" /> Add product
        </Button>
      </div>

      {categories.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => handleFilterChange('')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              !filterCategory ? 'bg-[#25D366] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleFilterChange(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterCategory === cat.id ? 'bg-[#25D366] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No products yet</p>
          <p className="text-sm mt-1">Add your first product to get started</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Product</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Brand</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Price range</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Variants</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
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
                        <img src={`${API_URL}${p.image_url}`} alt={p.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <ImagePlus className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{p.name}</p>
                        {p.name_local && <p className="text-xs text-gray-400">{p.name_local}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">{p.category.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">{p.brand?.name ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 text-xs">{formatPriceRange(p.price_range)}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs text-gray-500">{p.variant_count} variant{p.variant_count !== 1 ? 's' : ''}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      p.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-0.5 justify-end">
                      <button
                        onClick={(e) => openEdit(p, e)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(p) }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
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
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen} disablePointerDismissal>
        <DialogContent showCloseButton={false} className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">{editing ? 'Edit product' : 'Add product'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <Label>Image <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 group-hover:border-[#25D366] flex items-center justify-center overflow-hidden transition-colors flex-shrink-0">
                  {imagePreview ? (
                    <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                  ) : editing?.image_url ? (
                    <img src={`${API_URL}${editing.image_url}`} alt="current" className="w-full h-full object-cover" />
                  ) : (
                    <ImagePlus className="w-5 h-5 text-gray-300 group-hover:text-[#25D366] transition-colors" />
                  )}
                </div>
                <span className="text-sm text-gray-500 group-hover:text-gray-700">
                  {imagePreview || editing?.image_url ? 'Change image' : 'Upload image'}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            </div>

            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input placeholder="Fresh Apples" value={name} onChange={e => setName(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Local name <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
              <Input placeholder="புதிய ஆப்பிள்" value={nameLocal} onChange={e => setNameLocal(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Description <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
              <Input placeholder="Fresh imported apples…" value={description} onChange={e => setDescription(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Category <span className="text-destructive">*</span></Label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
              >
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Brand <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
              <select
                value={brandId}
                onChange={e => setBrandId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
              >
                <option value="">No brand</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sort order</Label>
                <Input type="number" min={0} value={sortOrder} onChange={e => setSortOrder(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Visibility</Label>
                <button
                  type="button"
                  onClick={() => setIsActive(v => !v)}
                  className={`w-full h-10 rounded-lg text-sm font-medium border transition-colors ${
                    isActive ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'
                  }`}
                >
                  {isActive ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>

            {!editing && (
              <p className="text-xs text-gray-400 bg-amber-50 text-amber-600 rounded-lg px-3 py-2">
                After creating, open the product to add pricing variants.
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button className="flex-1 bg-[#25D366] hover:bg-[#1ebe5d] text-white" onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isSaving ? 'Saving…' : editing ? 'Save changes' : 'Add product'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent showCloseButton={false} className="w-full max-w-sm bg-white rounded-2xl p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <X className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete product?</h3>
                <p className="text-sm text-gray-500">All variants and inventory records will be deleted.</p>
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
