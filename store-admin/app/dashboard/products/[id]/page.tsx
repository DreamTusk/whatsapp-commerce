'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Plus, Pencil, Trash2, ImagePlus, Loader2, X,
  ArrowLeft, Warehouse, ToggleLeft, ToggleRight, Package,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import api from '@/lib/api'
import type { Product, ProductVariant, Category, Brand } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

// ─── Variant modal state ──────────────────────────────────────────────────────
interface VariantForm {
  name: string
  costPrice: string
  originalPrice: string
  sellingPrice: string
  taxPercentage: string
  unit: string
  sortOrder: string
  isActive: boolean
}

const emptyVariantForm = (): VariantForm => ({
  name: '', costPrice: '', originalPrice: '', sellingPrice: '',
  taxPercentage: '0', unit: '', sortOrder: '0', isActive: true,
})

// ─── Inventory adjust modal state ─────────────────────────────────────────────
interface AdjustForm {
  addQty: string
  outOfStockLevel: string
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [product, setProduct] = useState<Product | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)

  // Product edit modal
  const [editProductOpen, setEditProductOpen] = useState(false)
  const [pName, setPName] = useState('')
  const [pNameLocal, setPNameLocal] = useState('')
  const [pDescription, setPDescription] = useState('')
  const [pCategoryId, setPCategoryId] = useState('')
  const [pBrandId, setPBrandId] = useState('')
  const [pSortOrder, setPSortOrder] = useState('0')
  const [pIsActive, setPIsActive] = useState(true)
  const [pImageFile, setPImageFile] = useState<File | null>(null)
  const [pImagePreview, setPImagePreview] = useState<string | null>(null)
  const [isSavingProduct, setIsSavingProduct] = useState(false)

  // Variant add/edit modal
  const [variantModalOpen, setVariantModalOpen] = useState(false)
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null)
  const [vForm, setVForm] = useState<VariantForm>(emptyVariantForm())
  const [isSavingVariant, setIsSavingVariant] = useState(false)

  // Variant delete
  const [deleteVariantTarget, setDeleteVariantTarget] = useState<ProductVariant | null>(null)
  const [isDeletingVariant, setIsDeletingVariant] = useState(false)

  // Inventory adjust modal
  const [adjustTarget, setAdjustTarget] = useState<ProductVariant | null>(null)
  const [adjustForm, setAdjustForm] = useState<AdjustForm>({ addQty: '', outOfStockLevel: '' })
  const [isSavingInventory, setIsSavingInventory] = useState(false)

  // Inventory tracking toggle loading set
  const [togglingInventory, setTogglingInventory] = useState<Set<string>>(new Set())

  const fetchProduct = useCallback(async () => {
    try {
      const res = await api.get(`/api/products/${id}`)
      setProduct(res.data.product)
    } catch {
      toast.error('Failed to load product')
    }
  }, [id])

  useEffect(() => {
    Promise.all([
      fetchProduct(),
      api.get('/api/categories').then(r => setCategories(r.data.categories)),
      api.get('/api/brands').then(r => setBrands(r.data.brands)),
    ]).finally(() => setLoading(false))
  }, [fetchProduct])

  // ─── Product edit ──────────────────────────────────────────────────────────
  function openEditProduct() {
    if (!product) return
    setPName(product.name)
    setPNameLocal(product.name_local ?? '')
    setPDescription(product.description ?? '')
    setPCategoryId(product.category.id)
    setPBrandId(product.brand?.id ?? '')
    setPSortOrder(String(product.sort_order))
    setPIsActive(product.is_active)
    setPImageFile(null)
    setPImagePreview(null)
    setEditProductOpen(true)
  }

  async function handleSaveProduct() {
    if (!pName.trim() || !pCategoryId) {
      toast.error('Name and category are required'); return
    }
    setIsSavingProduct(true)
    try {
      const formData = new FormData()
      formData.append('name', pName.trim())
      if (pNameLocal.trim()) formData.append('name_local', pNameLocal.trim())
      if (pDescription.trim()) formData.append('description', pDescription.trim())
      formData.append('category_id', pCategoryId)
      if (pBrandId) formData.append('brand_id', pBrandId)
      formData.append('sort_order', pSortOrder)
      formData.append('is_active', String(pIsActive))
      if (pImageFile) formData.append('image', pImageFile)

      const res = await api.put(`/api/products/${id}`, formData)
      setProduct(prev => prev ? { ...prev, ...res.data.product } : res.data.product)
      toast.success('Product updated')
      setEditProductOpen(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to update product'
      toast.error(msg)
    } finally {
      setIsSavingProduct(false)
    }
  }

  // ─── Variant CRUD ──────────────────────────────────────────────────────────
  function openAddVariant() {
    setEditingVariant(null)
    setVForm(emptyVariantForm())
    setVariantModalOpen(true)
  }

  function openEditVariant(v: ProductVariant) {
    setEditingVariant(v)
    setVForm({
      name: v.name,
      costPrice: v.cost_price != null ? String(v.cost_price) : '',
      originalPrice: v.original_price != null ? String(v.original_price) : '',
      sellingPrice: String(v.selling_price),
      taxPercentage: String(v.tax_percentage),
      unit: v.unit ?? '',
      sortOrder: String(v.sort_order),
      isActive: v.is_active,
    })
    setVariantModalOpen(true)
  }

  async function handleSaveVariant() {
    if (!vForm.name.trim() || !vForm.sellingPrice) {
      toast.error('Variant name and selling price are required'); return
    }
    setIsSavingVariant(true)
    try {
      const body: Record<string, unknown> = {
        name: vForm.name.trim(),
        selling_price: parseFloat(vForm.sellingPrice),
        tax_percentage: parseFloat(vForm.taxPercentage || '0'),
        sort_order: parseInt(vForm.sortOrder || '0'),
        is_active: vForm.isActive,
      }
      if (vForm.costPrice) body.cost_price = parseFloat(vForm.costPrice)
      if (vForm.originalPrice) body.original_price = parseFloat(vForm.originalPrice)
      if (vForm.unit.trim()) body.unit = vForm.unit.trim()

      if (editingVariant) {
        const res = await api.put(`/api/products/${id}/variants/${editingVariant.id}`, body)
        setProduct(prev => prev ? {
          ...prev,
          variants: prev.variants?.map(v => v.id === editingVariant.id ? res.data.variant : v),
        } : prev)
        toast.success('Variant updated')
      } else {
        const res = await api.post(`/api/products/${id}/variants`, body)
        setProduct(prev => prev ? {
          ...prev,
          variant_count: (prev.variant_count ?? 0) + 1,
          variants: [...(prev.variants ?? []), res.data.variant],
        } : prev)
        toast.success('Variant added')
      }
      setVariantModalOpen(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to save variant'
      toast.error(msg)
    } finally {
      setIsSavingVariant(false)
    }
  }

  async function handleDeleteVariant() {
    if (!deleteVariantTarget) return
    setIsDeletingVariant(true)
    try {
      await api.delete(`/api/products/${id}/variants/${deleteVariantTarget.id}`)
      setProduct(prev => prev ? {
        ...prev,
        variant_count: Math.max(0, (prev.variant_count ?? 1) - 1),
        variants: prev.variants?.filter(v => v.id !== deleteVariantTarget.id),
      } : prev)
      toast.success('Variant deleted')
      setDeleteVariantTarget(null)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to delete variant'
      toast.error(msg)
    } finally {
      setIsDeletingVariant(false)
    }
  }

  // ─── Inventory tracking toggle ─────────────────────────────────────────────
  async function toggleInventoryTracking(v: ProductVariant) {
    setTogglingInventory(prev => new Set(prev).add(v.id))
    try {
      if (v.inventory === null) {
        const res = await api.post(`/api/products/${id}/variants/${v.id}/inventory`, {})
        setProduct(prev => prev ? {
          ...prev,
          variants: prev.variants?.map(x => x.id === v.id ? { ...x, inventory: res.data.inventory } : x),
        } : prev)
        toast.success('Inventory tracking enabled')
      } else {
        await api.delete(`/api/products/${id}/variants/${v.id}/inventory`)
        setProduct(prev => prev ? {
          ...prev,
          variants: prev.variants?.map(x => x.id === v.id ? { ...x, inventory: null } : x),
        } : prev)
        toast.success('Inventory tracking disabled')
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to update tracking'
      toast.error(msg)
    } finally {
      setTogglingInventory(prev => { const s = new Set(prev); s.delete(v.id); return s })
    }
  }

  // ─── Inventory adjust ─────────────────────────────────────────────────────
  function openAdjust(v: ProductVariant) {
    setAdjustTarget(v)
    setAdjustForm({
      addQty: '',
      outOfStockLevel: String(v.inventory?.out_of_stock_level ?? 0),
    })
  }

  async function handleSaveInventory() {
    if (!adjustTarget) return
    setIsSavingInventory(true)
    try {
      const body: Record<string, unknown> = {}
      if (adjustForm.addQty.trim()) body.add = parseFloat(adjustForm.addQty)
      const currentLevel = adjustTarget.inventory?.out_of_stock_level ?? 0
      if (adjustForm.outOfStockLevel !== String(currentLevel)) {
        body.out_of_stock_level = parseFloat(adjustForm.outOfStockLevel)
      }

      if (Object.keys(body).length === 0) { setAdjustTarget(null); return }

      const res = await api.patch(`/api/products/${id}/variants/${adjustTarget.id}/inventory`, body)
      const updated = res.data.inventory
      setProduct(prev => prev ? {
        ...prev,
        variants: prev.variants?.map(v => v.id === adjustTarget.id
          ? { ...v, inventory: { qty: updated.qty, out_of_stock_level: updated.out_of_stock_level, updated_at: updated.updated_at } }
          : v
        ),
      } : prev)
      toast.success('Stock updated')
      setAdjustTarget(null)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to update stock'
      toast.error(msg)
    } finally {
      setIsSavingInventory(false)
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function stockBadge(v: ProductVariant) {
    if (!v.inventory) return null
    const { qty, out_of_stock_level } = v.inventory
    if (qty <= out_of_stock_level) return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600">Out</span>
    if (qty <= out_of_stock_level + 10) return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">Low</span>
    return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-600">OK</span>
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
        <button onClick={() => router.back()} className="mt-3 text-sm text-[#25D366] hover:underline">Go back</button>
      </div>
    )
  }

  const variants = product.variants ?? []

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back + header */}
      <button
        onClick={() => router.push('/dashboard/products')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5"
      >
        <ArrowLeft className="w-4 h-4" /> Products
      </button>

      {/* Product card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex items-start gap-4">
          {product.image_url ? (
            <img src={`${API_URL}${product.image_url}`} alt={product.name} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
              <ImagePlus className="w-7 h-7 text-gray-300" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{product.name}</h1>
                {product.name_local && <p className="text-sm text-gray-400">{product.name_local}</p>}
              </div>
              <Button variant="outline" size="sm" className="flex-shrink-0 gap-1.5" onClick={openEditProduct}>
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">{product.category.name}</span>
              {product.brand && (
                <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">{product.brand.name}</span>
              )}
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                product.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
              }`}>
                {product.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            {product.description && (
              <p className="text-sm text-gray-500 mt-2 line-clamp-2">{product.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Variants section */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">Variants</h2>
          <p className="text-xs text-gray-500 mt-0.5">{variants.length} variant{variants.length !== 1 ? 's' : ''} · pricing and unit info</p>
        </div>
        <Button onClick={openAddVariant} className="bg-[#25D366] hover:bg-[#1ebe5d] text-white gap-1.5 h-9 text-sm">
          <Plus className="w-4 h-4" /> Add variant
        </Button>
      </div>

      {variants.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-14 text-gray-400">
          <Package className="w-9 h-9 mx-auto mb-2 opacity-30" />
          <p className="font-medium">No variants yet</p>
          <p className="text-sm mt-1">Add at least one variant with a selling price</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Variant</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Pricing</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Inventory</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Status</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {variants.map(v => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{v.name}</p>
                    {v.unit && <p className="text-xs text-gray-400">{v.unit}</p>}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-semibold text-gray-900">₹{v.selling_price}</span>
                      {v.original_price != null && v.original_price > v.selling_price && (
                        <>
                          <span className="text-xs text-gray-400 line-through">₹{v.original_price}</span>
                          <span className="text-xs text-green-600 font-medium">
                            {Math.round((1 - v.selling_price / v.original_price) * 100)}% off
                          </span>
                        </>
                      )}
                    </div>
                    {v.cost_price != null && (
                      <p className="text-xs text-gray-400 mt-0.5">Cost: ₹{v.cost_price}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {v.inventory !== null ? (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{v.inventory.qty}</span>
                        {v.unit && <span className="text-xs text-gray-400">{v.unit}</span>}
                        {stockBadge(v)}
                        <button
                          onClick={() => openAdjust(v)}
                          className="ml-1 text-xs text-[#25D366] hover:underline"
                        >
                          Adjust
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Not tracked</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      v.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {v.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-0.5 justify-end">
                      <button
                        onClick={() => toggleInventoryTracking(v)}
                        disabled={togglingInventory.has(v.id)}
                        title={v.inventory ? 'Disable inventory tracking' : 'Enable inventory tracking'}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        {togglingInventory.has(v.id)
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : v.inventory !== null
                            ? <ToggleRight className="w-4 h-4 text-[#25D366]" />
                            : <ToggleLeft className="w-4 h-4" />
                        }
                      </button>
                      <button onClick={() => openEditVariant(v)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteVariantTarget(v)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Edit product modal ─────────────────────────────────────────────── */}
      <Dialog open={editProductOpen} onOpenChange={setEditProductOpen} disablePointerDismissal>
        <DialogContent showCloseButton={false} className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Edit product</h3>
              <button onClick={() => setEditProductOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <Label>Image <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 group-hover:border-[#25D366] flex items-center justify-center overflow-hidden transition-colors flex-shrink-0">
                  {pImagePreview ? (
                    <img src={pImagePreview} alt="preview" className="w-full h-full object-cover" />
                  ) : product.image_url ? (
                    <img src={`${API_URL}${product.image_url}`} alt="current" className="w-full h-full object-cover" />
                  ) : (
                    <ImagePlus className="w-5 h-5 text-gray-300 group-hover:text-[#25D366] transition-colors" />
                  )}
                </div>
                <span className="text-sm text-gray-500 group-hover:text-gray-700">
                  {pImagePreview || product.image_url ? 'Change image' : 'Upload image'}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={e => {
                  const f = e.target.files?.[0] ?? null
                  setPImageFile(f)
                  setPImagePreview(f ? URL.createObjectURL(f) : null)
                }} />
              </label>
            </div>

            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input value={pName} onChange={e => setPName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Local name <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
              <Input value={pNameLocal} onChange={e => setPNameLocal(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
              <Input value={pDescription} onChange={e => setPDescription(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Category <span className="text-destructive">*</span></Label>
              <select value={pCategoryId} onChange={e => setPCategoryId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]">
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Brand <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
              <select value={pBrandId} onChange={e => setPBrandId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]">
                <option value="">No brand</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sort order</Label>
                <Input type="number" min={0} value={pSortOrder} onChange={e => setPSortOrder(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Visibility</Label>
                <button type="button" onClick={() => setPIsActive(v => !v)}
                  className={`w-full h-10 rounded-lg text-sm font-medium border transition-colors ${
                    pIsActive ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'
                  }`}>
                  {pIsActive ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditProductOpen(false)}>Cancel</Button>
              <Button className="flex-1 bg-[#25D366] hover:bg-[#1ebe5d] text-white" onClick={handleSaveProduct} disabled={isSavingProduct}>
                {isSavingProduct ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isSavingProduct ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add/Edit variant modal ─────────────────────────────────────────── */}
      <Dialog open={variantModalOpen} onOpenChange={setVariantModalOpen} disablePointerDismissal>
        <DialogContent showCloseButton={false} className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">{editingVariant ? 'Edit variant' : 'Add variant'}</h3>
              <button onClick={() => setVariantModalOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Variant name <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. 500g, 1L, Large" value={vForm.name} onChange={e => setVForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Selling price (₹) <span className="text-destructive">*</span></Label>
                <Input type="number" min={0} step={0.01} placeholder="99" value={vForm.sellingPrice} onChange={e => setVForm(f => ({ ...f, sellingPrice: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Original price (₹) <span className="text-gray-400 font-normal text-xs">(for discount)</span></Label>
                <Input type="number" min={0} step={0.01} placeholder="120" value={vForm.originalPrice} onChange={e => setVForm(f => ({ ...f, originalPrice: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Cost price (₹) <span className="text-gray-400 font-normal text-xs">(internal)</span></Label>
                <Input type="number" min={0} step={0.01} placeholder="60" value={vForm.costPrice} onChange={e => setVForm(f => ({ ...f, costPrice: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Tax % <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
                <Input type="number" min={0} step={0.01} placeholder="5" value={vForm.taxPercentage} onChange={e => setVForm(f => ({ ...f, taxPercentage: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Unit <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
                <Input placeholder="kg, pcs, L" value={vForm.unit} onChange={e => setVForm(f => ({ ...f, unit: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Sort order</Label>
                <Input type="number" min={0} value={vForm.sortOrder} onChange={e => setVForm(f => ({ ...f, sortOrder: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Visibility</Label>
                <button type="button" onClick={() => setVForm(f => ({ ...f, isActive: !f.isActive }))}
                  className={`w-full h-10 rounded-lg text-sm font-medium border transition-colors ${
                    vForm.isActive ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'
                  }`}>
                  {vForm.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setVariantModalOpen(false)}>Cancel</Button>
              <Button className="flex-1 bg-[#25D366] hover:bg-[#1ebe5d] text-white" onClick={handleSaveVariant} disabled={isSavingVariant}>
                {isSavingVariant ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isSavingVariant ? 'Saving…' : editingVariant ? 'Save changes' : 'Add variant'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete variant confirm ─────────────────────────────────────────── */}
      <Dialog open={!!deleteVariantTarget} onOpenChange={(open) => { if (!open) setDeleteVariantTarget(null) }}>
        <DialogContent showCloseButton={false} className="w-full max-w-sm bg-white rounded-2xl p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete variant?</h3>
                <p className="text-sm text-gray-500">Inventory record will also be deleted.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              <span className="font-semibold">{deleteVariantTarget?.name}</span> will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteVariantTarget(null)}>Cancel</Button>
              <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={handleDeleteVariant} disabled={isDeletingVariant}>
                {isDeletingVariant ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isDeletingVariant ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Adjust inventory modal ─────────────────────────────────────────── */}
      <Dialog open={!!adjustTarget} onOpenChange={(open) => { if (!open) setAdjustTarget(null) }} disablePointerDismissal>
        <DialogContent showCloseButton={false} className="w-full max-w-sm bg-white rounded-2xl p-6">
          {adjustTarget && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-bold text-gray-900">Adjust stock</h3>
              </div>
              <p className="text-sm text-gray-500">{adjustTarget.name}{adjustTarget.unit ? ` · ${adjustTarget.unit}` : ''}</p>

              <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                <span className="text-sm text-gray-500">Current qty</span>
                <span className="font-bold text-gray-900">
                  {adjustTarget.inventory?.qty ?? 0} {adjustTarget.unit ?? ''}
                </span>
              </div>

              <div className="space-y-1.5">
                <Label>Add stock <span className="text-gray-400 font-normal text-xs">(leave blank to skip)</span></Label>
                <Input
                  type="number" min={0} step="any" placeholder="e.g. 50"
                  value={adjustForm.addQty}
                  onChange={e => setAdjustForm(f => ({ ...f, addQty: e.target.value }))}
                />
                {adjustForm.addQty && !isNaN(parseFloat(adjustForm.addQty)) && (
                  <p className="text-xs text-[#25D366]">
                    New qty: {(adjustTarget.inventory?.qty ?? 0) + parseFloat(adjustForm.addQty)} {adjustTarget.unit ?? ''}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Out-of-stock level</Label>
                <Input
                  type="number" min={0} step="any"
                  value={adjustForm.outOfStockLevel}
                  onChange={e => setAdjustForm(f => ({ ...f, outOfStockLevel: e.target.value }))}
                />
                <p className="text-xs text-gray-400">Mark as out of stock at or below this qty</p>
              </div>

              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setAdjustTarget(null)} disabled={isSavingInventory}>Cancel</Button>
                <Button className="flex-1 bg-[#25D366] hover:bg-[#1ebe5d] text-white" onClick={handleSaveInventory} disabled={isSavingInventory}>
                  {isSavingInventory ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {isSavingInventory ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
