'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Loader2, ArrowLeft, MousePointerClick, Zap, Search, X, CheckSquare, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/api'
import type { Product, Category, Brand, Collection } from '@/types'
import AppSwitch from '@/components/ui/app-switch'
import { AppSelect } from '@/components/ui/app-select'
import { AppCombobox } from '@/components/ui/app-combobox'

interface CriteriaRow { id: string; field: string; operator: string; value: string }

const FIELDS = [
  { value: 'price',       label: 'Price' },
  { value: 'category_id', label: 'Category' },
  { value: 'brand_id',    label: 'Brand' },
  { value: 'name',        label: 'Product name' },
  { value: 'in_stock',    label: 'Stock status' },
]

const OPERATORS_FOR: Record<string, { value: string; label: string }[]> = {
  price:       [{ value: 'lt', label: 'less than' }, { value: 'lte', label: 'less than or equal' }, { value: 'gt', label: 'greater than' }, { value: 'gte', label: 'greater than or equal' }, { value: 'eq', label: 'equals' }],
  category_id: [{ value: 'eq', label: 'equals' }],
  brand_id:    [{ value: 'eq', label: 'equals' }],
  name:        [{ value: 'contains', label: 'contains' }],
  in_stock:    [{ value: 'eq', label: 'equals' }],
}

function defaultRow(): CriteriaRow {
  return { id: `${Date.now()}${Math.random()}`, field: 'price', operator: 'lt', value: '' }
}

function criteriaToRows(criteria: Collection['criteria']): CriteriaRow[] {
  if (!criteria || criteria.filters.length === 0) return [defaultRow()]
  return criteria.filters.map(f => ({ id: `${Date.now()}${Math.random()}`, field: f.field as string, operator: f.operator as string, value: String(f.value) }))
}

export default function EditCollectionPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [loading, setLoading] = useState(true)
  const [formType, setFormType] = useState<'manual' | 'auto'>('manual')
  const [formName, setFormName] = useState('')
  const [formDisplayOrder, setFormDisplayOrder] = useState(0)
  const [formIsActive, setFormIsActive] = useState(true)
  const [formIsSaving, setFormIsSaving] = useState(false)

  const [products, setProducts] = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [originalProductIds, setOriginalProductIds] = useState<string[]>([])
  const [productsLoading, setProductsLoading] = useState(false)

  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [criteriaMatch, setCriteriaMatch] = useState<'all' | 'any'>('all')
  const [criteriaRows, setCriteriaRows] = useState<CriteriaRow[]>([defaultRow()])

  useEffect(() => {
    async function load() {
      try {
        const [colRes, catsRes, brandsRes] = await Promise.all([
          api.get('/api/collections'),
          api.get('/api/categories'),
          api.get('/api/brands'),
        ])
        setCategories(catsRes.data.categories)
        setBrands(brandsRes.data.brands)

        const col: Collection = colRes.data.collections.find((c: Collection) => c.id === id)
        if (!col) { toast.error('Collection not found'); router.push('/dashboard/collections'); return }

        setFormType(col.type as 'manual' | 'auto')
        setFormName(col.name)
        setFormDisplayOrder(col.display_order)
        setFormIsActive(col.is_active)
        setCriteriaMatch(col.criteria?.match ?? 'all')
        setCriteriaRows(criteriaToRows(col.criteria))

        if (col.type === 'manual') {
          setProductsLoading(true)
          const [prodRes, detailRes] = await Promise.all([
            api.get('/api/products'),
            api.get(`/api/collections/${id}`),
          ])
          setProducts(prodRes.data.products)
          const ids: string[] = (detailRes.data.collection.products ?? []).map((p: { id: string }) => p.id)
          setSelectedProductIds(ids)
          setOriginalProductIds(ids)
          setProductsLoading(false)
        }
      } catch {
        toast.error('Failed to load collection')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, router])

  function addRow() { setCriteriaRows(prev => [...prev, defaultRow()]) }
  function removeRow(rowId: string) { setCriteriaRows(prev => prev.filter(r => r.id !== rowId)) }
  function updateRow(rowId: string, changes: Partial<CriteriaRow>) {
    setCriteriaRows(prev => prev.map(r => r.id === rowId ? { ...r, ...changes } : r))
  }
  function onFieldChange(rowId: string, field: string) {
    const op = OPERATORS_FOR[field]?.[0]?.value ?? 'eq'
    const val = field === 'in_stock' ? 'true' : ''
    updateRow(rowId, { field, operator: op, value: val })
  }
  function toggleProduct(productId: string) {
    setSelectedProductIds(prev => prev.includes(productId) ? prev.filter(x => x !== productId) : [...prev, productId])
  }

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
  const flatCategories = categories.flatMap(c => [c, ...(c.children ?? [])])

  function buildCriteria() {
    return {
      match: criteriaMatch,
      filters: criteriaRows.map(r => ({
        field: r.field,
        operator: r.operator,
        value: r.field === 'price' ? Number(r.value) : r.field === 'in_stock' ? r.value === 'true' : r.value,
      })),
    }
  }

  async function handleSave() {
    if (!formName.trim()) { toast.error('Collection name is required'); return }
    if (formType === 'auto') {
      if (criteriaRows.length === 0) { toast.error('Add at least one filter'); return }
      if (criteriaRows.some(r => !r.value && r.field !== 'in_stock')) { toast.error('All filters must have a value'); return }
    }
    setFormIsSaving(true)
    try {
      const body: Record<string, unknown> = { name: formName.trim(), display_order: formDisplayOrder, is_active: formIsActive }
      if (formType === 'auto') body.criteria = buildCriteria()
      await api.put(`/api/collections/${id}`, body)

      if (formType === 'manual') {
        const added   = selectedProductIds.filter(pid => !originalProductIds.includes(pid))
        const removed = originalProductIds.filter(pid => !selectedProductIds.includes(pid))
        if (added.length > 0) await api.post(`/api/collections/${id}/products`, { product_ids: added })
        await Promise.all(removed.map(pid => api.delete(`/api/collections/${id}/products/${pid}`)))
      }

      toast.success('Collection updated')
      router.push('/dashboard/collections')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to update collection'
      toast.error(msg)
    } finally {
      setFormIsSaving(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center py-40"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-6 pt-5 pb-4 bg-white border-b border-gray-100">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Collections
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Edit collection</h1>
      </div>

      <div className="flex-1 overflow-auto min-h-0 bg-gray-50">
        <div className="max-w-xl mx-auto px-6 py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">

            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full ${formType === 'manual' ? 'bg-indigo-50 text-indigo-600' : 'bg-violet-50 text-violet-600'}`}>
                {formType === 'manual' ? <MousePointerClick className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                {formType === 'manual' ? 'Manual collection' : 'Automatic collection'}
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Collection name <span className="text-destructive">*</span></Label>
              <Input className="h-11" value={formName} onChange={e => setFormName(e.target.value)} autoFocus />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Display order</Label>
                <Input type="number" className="h-11" min={0} value={formDisplayOrder} onChange={e => setFormDisplayOrder(Number(e.target.value))} />
                <p className="text-xs text-gray-400">Lower = appears first</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Status</Label>
                <div className="h-11 flex items-center">
                  <AppSwitch checked={formIsActive} onChange={setFormIsActive} />
                </div>
              </div>
            </div>

            {formType === 'manual' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-gray-700">Products</Label>
                  {selectedProductIds.length > 0 && <span className="text-sm text-[#6366f1] font-medium">{selectedProductIds.length} selected</span>}
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input type="text" placeholder="Search products…" value={productSearch} onChange={e => setProductSearch(e.target.value)}
                    className="w-full h-10 pl-9 pr-4 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#6366f1]" />
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  {productsLoading ? (
                    <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
                  ) : filteredProducts.length === 0 ? (
                    <p className="text-center text-gray-400 py-8 text-sm">No products found</p>
                  ) : (
                    <div className="divide-y divide-gray-50 max-h-72 overflow-auto">
                      {filteredProducts.map(p => {
                        const selected = selectedProductIds.includes(p.id)
                        return (
                          <button key={p.id} type="button" onClick={() => toggleProduct(p.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${selected ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                            {selected ? <CheckSquare className="w-4 h-4 text-[#6366f1] flex-shrink-0" /> : <Square className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                            {p.image_url ? <img src={p.image_url} alt={p.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" /> : <div className="w-9 h-9 rounded-lg bg-gray-100 flex-shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                              <p className="text-xs text-gray-400">₹{p.selling_price}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {formType === 'auto' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium text-gray-700">Products match</Label>
                  <AppSelect
                    value={criteriaMatch}
                    onValueChange={v => setCriteriaMatch(v as 'all' | 'any')}
                    className="w-20 h-10 text-sm"
                    options={[{ value: 'all', label: 'all' }, { value: 'any', label: 'any' }]}
                  />
                  <span className="text-sm text-gray-500">of the following</span>
                </div>
                <div className="space-y-2">
                  {criteriaRows.map(row => (
                    <div key={row.id} className="flex items-center gap-2">
                      <AppSelect
                        value={row.field}
                        onValueChange={v => onFieldChange(row.id, v)}
                        className="w-36 h-10 text-sm flex-shrink-0"
                        options={FIELDS.map(f => ({ value: f.value, label: f.label }))}
                      />
                      <AppSelect
                        value={row.operator}
                        onValueChange={v => updateRow(row.id, { operator: v })}
                        className="w-44 h-10 text-sm flex-shrink-0"
                        options={(OPERATORS_FOR[row.field] ?? []).map(op => ({ value: op.value, label: op.label }))}
                      />
                      {row.field === 'category_id' ? (
                        <AppCombobox
                          value={row.value}
                          onValueChange={v => updateRow(row.id, { value: v })}
                          placeholder="Select category"
                          searchPlaceholder="Search categories..."
                          className="flex-1 min-w-0 h-10 text-sm"
                          options={flatCategories.map(c => ({ value: c.id, label: c.name }))}
                        />
                      ) : row.field === 'brand_id' ? (
                        <AppCombobox
                          value={row.value}
                          onValueChange={v => updateRow(row.id, { value: v })}
                          placeholder="Select brand"
                          searchPlaceholder="Search brands..."
                          className="flex-1 min-w-0 h-10 text-sm"
                          options={brands.map(b => ({ value: b.id, label: b.name }))}
                        />
                      ) : row.field === 'in_stock' ? (
                        <AppSelect
                          value={row.value}
                          onValueChange={v => updateRow(row.id, { value: v })}
                          className="flex-1 min-w-0 h-10 text-sm"
                          options={[{ value: 'true', label: 'In stock' }, { value: 'false', label: 'Out of stock' }]}
                        />
                      ) : row.field === 'price' ? (
                        <input type="number" min={0} placeholder="300" value={row.value} onChange={e => updateRow(row.id, { value: e.target.value })}
                          className="h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#6366f1] flex-1 min-w-0" />
                      ) : (
                        <input type="text" placeholder="keyword…" value={row.value} onChange={e => updateRow(row.id, { value: e.target.value })}
                          className="h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#6366f1] flex-1 min-w-0" />
                      )}
                      <button type="button" onClick={() => removeRow(row.id)} disabled={criteriaRows.length === 1}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-30 flex-shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addRow} className="flex items-center gap-1.5 text-sm text-[#6366f1] hover:text-[#4f46e5] font-medium cursor-pointer">
                  <Plus className="w-4 h-4" /> Add filter
                </button>
              </div>
            )}

            <div className="border-t border-gray-50 pt-1">
              <Button className="bg-[#6366f1] hover:bg-[#4f46e5] text-white w-full h-11" onClick={handleSave} disabled={formIsSaving}>
                {formIsSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {formIsSaving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
