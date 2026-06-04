'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Plus, Trash2, Loader2, ArrowLeft, MousePointerClick, Zap,
  Search, X, CheckSquare, Square, Pencil, GripVertical,
} from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import api from '@/lib/api'
import type { Collection, Product, Category, Brand } from '@/types'
import AppSwitch from '@/components/ui/app-switch'

// ── Criteria builder helpers ─────────────────────────────────────────────────

interface CriteriaRow {
  id: string
  field: string
  operator: string
  value: string
}

const FIELDS = [
  { value: 'price',       label: 'Price' },
  { value: 'category_id', label: 'Category' },
  { value: 'brand_id',    label: 'Brand' },
  { value: 'name',        label: 'Product name' },
  { value: 'in_stock',    label: 'Stock status' },
]

const OPERATORS_FOR: Record<string, { value: string; label: string }[]> = {
  price:       [
    { value: 'lt',  label: 'less than' },
    { value: 'lte', label: 'less than or equal' },
    { value: 'gt',  label: 'greater than' },
    { value: 'gte', label: 'greater than or equal' },
    { value: 'eq',  label: 'equals' },
  ],
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
  return criteria.filters.map(f => ({
    id: `${Date.now()}${Math.random()}`,
    field: f.field as string,
    operator: f.operator as string,
    value: String(f.value),
  }))
}

// ── Sortable row ─────────────────────────────────────────────────────────────

function SortableRow({
  col,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  col: Collection
  onEdit: (col: Collection) => void
  onDelete: (col: Collection) => void
  onToggleActive: (col: Collection) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: col.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-gray-50 transition-colors">
      <td className="px-2 py-3 w-8">
        <button {...attributes} {...listeners} className="p-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4" />
        </button>
      </td>
      <td className="px-4 py-3">
        <span className="font-medium text-gray-900">{col.name}</span>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
          col.type === 'manual' ? 'bg-indigo-50 text-indigo-600' : 'bg-violet-50 text-violet-600'
        }`}>
          {col.type === 'manual' ? <MousePointerClick className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
          {col.type === 'manual' ? 'Manual' : 'Auto'}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-600">
        {col.type === 'manual' ? `${col.product_count ?? 0} products` : 'Auto'}
      </td>
      <td className="px-4 py-3 text-gray-500 tabular-nums">{col.display_order}</td>
      <td className="px-4 py-3">
        <button
          onClick={() => onToggleActive(col)}
          className={`text-sm font-medium px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
            col.is_active ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          {col.is_active ? 'Active' : 'Inactive'}
        </button>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={() => onEdit(col)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(col)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── Page component ────────────────────────────────────────────────────────────

export default function CollectionsPage() {
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list')
  const [editTarget, setEditTarget] = useState<Collection | null>(null)
  const [editOriginalProductIds, setEditOriginalProductIds] = useState<string[]>([])

  // ── List state ──
  const [collections, setCollections] = useState<Collection[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // ── Shared form state ──
  const [formType, setFormType] = useState<'manual' | 'auto' | null>(null)
  const [formName, setFormName] = useState('')
  const [formDisplayOrder, setFormDisplayOrder] = useState(0)
  const [formIsActive, setFormIsActive] = useState(true)
  const [formIsSaving, setFormIsSaving] = useState(false)

  // manual
  const [products, setProducts] = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [productsLoading, setProductsLoading] = useState(false)

  // auto
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [criteriaMatch, setCriteriaMatch] = useState<'all' | 'any'>('all')
  const [criteriaRows, setCriteriaRows] = useState<CriteriaRow[]>([defaultRow()])

  // ── DnD sensors ──
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = collections.findIndex(c => c.id === active.id)
    const newIndex = collections.findIndex(c => c.id === over.id)
    const reordered = arrayMove(collections, oldIndex, newIndex).map((c, idx) => ({
      ...c,
      display_order: idx,
    }))
    setCollections(reordered)
    try {
      await api.patch('/api/collections/reorder', { collection_ids: reordered.map(c => c.id) })
    } catch {
      toast.error('Failed to save order')
      fetchCollections()
    }
  }

  // ── Fetch collections ──
  const fetchCollections = useCallback(async () => {
    try {
      const res = await api.get('/api/collections')
      setCollections(res.data.collections)
    } catch {
      toast.error('Failed to load collections')
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => { fetchCollections() }, [fetchCollections])

  // ── Picker fetches ──
  async function fetchProducts() {
    setProductsLoading(true)
    try {
      const res = await api.get('/api/products')
      setProducts(res.data.products)
    } catch { /* silent */ } finally {
      setProductsLoading(false)
    }
  }

  async function fetchCategoriesPicker() {
    try { const res = await api.get('/api/categories'); setCategories(res.data.categories) }
    catch { /* silent */ }
  }

  async function fetchBrandsPicker() {
    try { const res = await api.get('/api/brands'); setBrands(res.data.brands) }
    catch { /* silent */ }
  }

  // ── Open create ──
  function openCreate() {
    setEditTarget(null)
    setFormType(null)
    setFormName('')
    setFormDisplayOrder(collections.length)
    setFormIsActive(true)
    setSelectedProductIds([])
    setProductSearch('')
    setCriteriaMatch('all')
    setCriteriaRows([defaultRow()])
    setView('create')
    fetchProducts()
    fetchCategoriesPicker()
    fetchBrandsPicker()
  }

  // ── Open edit ──
  async function openEdit(col: Collection) {
    setEditTarget(col)
    setFormType(col.type)
    setFormName(col.name)
    setFormDisplayOrder(col.display_order)
    setFormIsActive(col.is_active)
    setProductSearch('')
    setCriteriaMatch(col.criteria?.match ?? 'all')
    setCriteriaRows(criteriaToRows(col.criteria))
    setView('edit')
    fetchCategoriesPicker()
    fetchBrandsPicker()

    if (col.type === 'manual') {
      fetchProducts()
      try {
        const res = await api.get(`/api/collections/${col.id}`)
        const ids: string[] = (res.data.collection.products ?? []).map((p: { id: string }) => p.id)
        setSelectedProductIds(ids)
        setEditOriginalProductIds(ids)
      } catch {
        setSelectedProductIds([])
        setEditOriginalProductIds([])
      }
    } else {
      setSelectedProductIds([])
      setEditOriginalProductIds([])
    }
  }

  // ── Criteria row helpers ──
  function addRow() { setCriteriaRows(prev => [...prev, defaultRow()]) }
  function removeRow(id: string) { setCriteriaRows(prev => prev.filter(r => r.id !== id)) }
  function updateRow(id: string, changes: Partial<CriteriaRow>) {
    setCriteriaRows(prev => prev.map(r => r.id === id ? { ...r, ...changes } : r))
  }
  function onFieldChange(id: string, field: string) {
    const op = OPERATORS_FOR[field]?.[0]?.value ?? 'eq'
    const val = field === 'in_stock' ? 'true' : ''
    updateRow(id, { field, operator: op, value: val })
  }

  // ── Product selection ──
  function toggleProduct(id: string) {
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  )

  // ── Validate form ──
  function validateForm(): boolean {
    if (!formName.trim()) { toast.error('Collection name is required'); return false }
    if (formType === 'auto') {
      if (criteriaRows.length === 0) { toast.error('Add at least one filter'); return false }
      if (criteriaRows.some(r => !r.value && r.field !== 'in_stock')) {
        toast.error('All filters must have a value'); return false
      }
    }
    return true
  }

  function buildCriteria() {
    return {
      match: criteriaMatch,
      filters: criteriaRows.map(r => ({
        field: r.field,
        operator: r.operator,
        value: r.field === 'price' ? Number(r.value)
          : r.field === 'in_stock' ? r.value === 'true'
          : r.value,
      })),
    }
  }

  // ── Submit create ──
  async function handleCreate() {
    if (!formType) { toast.error('Please select a collection type'); return }
    if (!validateForm()) return
    setFormIsSaving(true)
    try {
      const body: Record<string, unknown> = {
        name: formName.trim(), type: formType,
        display_order: formDisplayOrder, is_active: formIsActive,
      }
      if (formType === 'manual') body.product_ids = selectedProductIds
      else body.criteria = buildCriteria()
      await api.post('/api/collections', body)
      toast.success('Collection created')
      await fetchCollections()
      setView('list')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to create collection'
      toast.error(msg)
    } finally {
      setFormIsSaving(false)
    }
  }

  // ── Submit edit ──
  async function handleUpdate() {
    if (!editTarget) return
    if (!validateForm()) return
    setFormIsSaving(true)
    try {
      // Update metadata (+ criteria for auto)
      const body: Record<string, unknown> = {
        name: formName.trim(),
        display_order: formDisplayOrder,
        is_active: formIsActive,
      }
      if (formType === 'auto') body.criteria = buildCriteria()
      await api.put(`/api/collections/${editTarget.id}`, body)

      // For manual: sync product diff
      if (formType === 'manual') {
        const added   = selectedProductIds.filter(id => !editOriginalProductIds.includes(id))
        const removed = editOriginalProductIds.filter(id => !selectedProductIds.includes(id))
        if (added.length > 0) {
          await api.post(`/api/collections/${editTarget.id}/products`, { product_ids: added })
        }
        await Promise.all(
          removed.map(id => api.delete(`/api/collections/${editTarget.id}/products/${id}`))
        )
      }

      toast.success('Collection updated')
      await fetchCollections()
      setView('list')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to update collection'
      toast.error(msg)
    } finally {
      setFormIsSaving(false)
    }
  }

  // ── Toggle active ──
  async function toggleActive(col: Collection) {
    try {
      await api.put(`/api/collections/${col.id}`, { is_active: !col.is_active })
      await fetchCollections()
    } catch {
      toast.error('Failed to update collection')
    }
  }

  // ── Delete ──
  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await api.delete(`/api/collections/${deleteTarget.id}`)
      await fetchCollections()
      toast.success('Collection deleted')
      setDeleteTarget(null)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to delete collection'
      toast.error(msg)
    } finally {
      setIsDeleting(false)
    }
  }

  const flatCategories = categories.flatMap(c => [c, ...(c.children ?? [])])
  const isEditing = view === 'edit'

  // ═══════════════════════════════════════════════════════
  //  FORM VIEW  (shared by create + edit)
  // ═══════════════════════════════════════════════════════
  if (view === 'create' || view === 'edit') {
    return (
      <div className="flex flex-col h-full">

        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 bg-gray-50">
          <button
            onClick={() => setView('list')}
            className="flex items-center gap-1.5 text-base text-gray-500 hover:text-gray-700 mb-3 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Collections
          </button>
          <h1 className="text-[26px] font-bold text-gray-900">
            {isEditing ? 'Edit collection' : 'Create collection'}
          </h1>
        </div>

        <div className="flex-1 overflow-auto min-h-0">
          <div className="flex justify-center px-6 py-8">
            <div className="w-full max-w-xl space-y-6">

              {/* ── Step 1: type selector (create only) ── */}
              {!isEditing && !formType ? (
                <div className="space-y-3">
                  <p className="text-base text-gray-500">Choose how products are added to this collection</p>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setFormType('manual')}
                      className="group flex flex-col items-start gap-3 p-5 rounded-2xl border-2 border-gray-200 hover:border-[#6366f1] hover:bg-indigo-50/40 transition-all text-left cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 group-hover:bg-[#6366f1]/10 flex items-center justify-center transition-colors">
                        <MousePointerClick className="w-5 h-5 text-indigo-500 group-hover:text-[#6366f1] transition-colors" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-base">Manual</p>
                        <p className="text-sm text-gray-500 mt-0.5 leading-snug">Hand-pick products and control their order</p>
                      </div>
                    </button>
                    <button
                      onClick={() => setFormType('auto')}
                      className="group flex flex-col items-start gap-3 p-5 rounded-2xl border-2 border-gray-200 hover:border-[#6366f1] hover:bg-indigo-50/40 transition-all text-left cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-xl bg-violet-50 group-hover:bg-[#6366f1]/10 flex items-center justify-center transition-colors">
                        <Zap className="w-5 h-5 text-violet-500 group-hover:text-[#6366f1] transition-colors" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-base">Automatic</p>
                        <p className="text-sm text-gray-500 mt-0.5 leading-snug">Set rules — matching products added automatically</p>
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Type badge */}
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full ${
                      formType === 'manual' ? 'bg-indigo-50 text-indigo-600' : 'bg-violet-50 text-violet-600'
                    }`}>
                      {formType === 'manual' ? <MousePointerClick className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                      {formType === 'manual' ? 'Manual collection' : 'Automatic collection'}
                    </span>
                    {/* Only allow type change during create */}
                    {!isEditing && (
                      <button onClick={() => setFormType(null)} className="text-sm text-gray-400 hover:text-gray-600 cursor-pointer">
                        Change
                      </button>
                    )}
                  </div>

                  {/* ── Common fields ── */}
                  <div className="space-y-1.5">
                    <Label className="text-base">Collection name <span className="text-destructive">*</span></Label>
                    <Input
                      className="text-base h-11"
                      placeholder={formType === 'manual' ? 'Staff Picks' : 'Budget Deals'}
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-base">Display order</Label>
                      <Input
                        type="number" className="text-base h-11" min={0}
                        value={formDisplayOrder} onChange={e => setFormDisplayOrder(Number(e.target.value))}
                      />
                      <p className="text-xs text-gray-400">Lower = appears first. Drag to reorder on list.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-base">Status</Label>
                      <AppSwitch checked={formIsActive} onChange={setFormIsActive} />
                    </div>
                  </div>

                  {/* ── Manual: product picker ── */}
                  {formType === 'manual' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-base">Products</Label>
                        {selectedProductIds.length > 0 && (
                          <span className="text-sm text-[#6366f1] font-medium">{selectedProductIds.length} selected</span>
                        )}
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                          type="text" placeholder="Search products…" value={productSearch}
                          onChange={e => setProductSearch(e.target.value)}
                          className="w-full h-10 pl-9 pr-4 rounded-lg border border-gray-200 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#6366f1]"
                        />
                      </div>
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        {productsLoading ? (
                          <div className="flex items-center justify-center py-10">
                            <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
                          </div>
                        ) : filteredProducts.length === 0 ? (
                          <p className="text-center text-gray-400 py-8 text-sm">No products found</p>
                        ) : (
                          <div className="divide-y divide-gray-50 max-h-72 overflow-auto">
                            {filteredProducts.map(p => {
                              const selected = selectedProductIds.includes(p.id)
                              return (
                                <button
                                  key={p.id} type="button" onClick={() => toggleProduct(p.id)}
                                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${
                                    selected ? 'bg-green-50' : 'hover:bg-gray-50'
                                  }`}
                                >
                                  {selected
                                    ? <CheckSquare className="w-4 h-4 text-[#6366f1] flex-shrink-0" />
                                    : <Square className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                  }
                                  {p.image_url ? (
                                    <img src={p.image_url} alt={p.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                                  ) : (
                                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex-shrink-0" />
                                  )}
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

                  {/* ── Auto: criteria builder ── */}
                  {formType === 'auto' && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Label className="text-base">Products match</Label>
                        <select
                          value={criteriaMatch}
                          onChange={e => setCriteriaMatch(e.target.value as 'all' | 'any')}
                          className="h-10 px-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#6366f1] w-20"
                        >
                          <option value="all">all</option>
                          <option value="any">any</option>
                        </select>
                        <span className="text-base text-gray-500">of the following</span>
                      </div>

                      <div className="space-y-2">
                        {criteriaRows.map(row => (
                          <div key={row.id} className="flex items-center gap-2">
                            <select
                              value={row.field}
                              onChange={e => onFieldChange(row.id, e.target.value)}
                              className="h-10 px-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#6366f1] w-36 flex-shrink-0"
                            >
                              {FIELDS.map(f => (
                                <option key={f.value} value={f.value}>{f.label}</option>
                              ))}
                            </select>

                            <select
                              value={row.operator}
                              onChange={e => updateRow(row.id, { operator: e.target.value })}
                              className="h-10 px-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#6366f1] w-44 flex-shrink-0"
                            >
                              {(OPERATORS_FOR[row.field] ?? []).map(op => (
                                <option key={op.value} value={op.value}>{op.label}</option>
                              ))}
                            </select>

                            {row.field === 'category_id' ? (
                              <select value={row.value} onChange={e => updateRow(row.id, { value: e.target.value })}
                                className="h-10 px-2 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#6366f1] cursor-pointer flex-1 min-w-0">
                                <option value="">Select category</option>
                                {flatCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                            ) : row.field === 'brand_id' ? (
                              <select value={row.value} onChange={e => updateRow(row.id, { value: e.target.value })}
                                className="h-10 px-2 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#6366f1] cursor-pointer flex-1 min-w-0">
                                <option value="">Select brand</option>
                                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                              </select>
                            ) : row.field === 'in_stock' ? (
                              <select value={row.value} onChange={e => updateRow(row.id, { value: e.target.value })}
                                className="h-10 px-2 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#6366f1] cursor-pointer flex-1 min-w-0">
                                <option value="true">In stock</option>
                                <option value="false">Out of stock</option>
                              </select>
                            ) : row.field === 'price' ? (
                              <input type="number" min={0} placeholder="300"
                                value={row.value} onChange={e => updateRow(row.id, { value: e.target.value })}
                                className="h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#6366f1] flex-1 min-w-0" />
                            ) : (
                              <input type="text" placeholder="keyword…"
                                value={row.value} onChange={e => updateRow(row.id, { value: e.target.value })}
                                className="h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#6366f1] flex-1 min-w-0" />
                            )}

                            <button type="button" onClick={() => removeRow(row.id)}
                              disabled={criteriaRows.length === 1}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-30 flex-shrink-0">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <button type="button" onClick={addRow}
                        className="flex items-center gap-1.5 text-sm text-[#6366f1] hover:text-[#4f46e5] font-medium cursor-pointer">
                        <Plus className="w-4 h-4" /> Add filter
                      </button>
                    </div>
                  )}

                  {/* ── Save button ── */}
                  <Button
                    className="bg-[#6366f1] hover:bg-[#4f46e5] text-white w-full h-11 text-base"
                    onClick={isEditing ? handleUpdate : handleCreate}
                    disabled={formIsSaving}
                  >
                    {formIsSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {formIsSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Create collection'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════
  //  LIST VIEW
  // ═══════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-6 pt-6 pb-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[26px] font-bold text-gray-900">Collections</h1>
            <p className="text-base text-gray-500 mt-0.5">{collections.length} collection{collections.length !== 1 ? 's' : ''}</p>
          </div>
          <Button onClick={openCreate} className="bg-[#6366f1] hover:bg-[#4f46e5] text-white gap-2">
            <Plus className="w-4 h-4" /> Create collection
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 px-6 pt-6 pb-4 flex flex-col">
        {listLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-xl font-medium">No collections yet</p>
            <p className="text-base mt-1">Create your first collection to group products on your home page</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto min-h-0">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={collections.map(c => c.id)} strategy={verticalListSortingStrategy}>
                  <table className="w-full text-base min-w-[500px]">
                    <thead className="bg-indigo-50 border-b border-indigo-100 sticky top-0 z-10">
                      <tr>
                        <th className="px-2 py-3 w-8"></th>
                        <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide">Collection</th>
                        <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide">Type</th>
                        <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide">Products</th>
                        <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide">Order</th>
                        <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide">Status</th>
                        <th className="px-4 py-3 w-20"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {collections.map(col => (
                        <SortableRow
                          key={col.id}
                          col={col}
                          onEdit={openEdit}
                          onDelete={setDeleteTarget}
                          onToggleActive={toggleActive}
                        />
                      ))}
                    </tbody>
                  </table>
                </SortableContext>
              </DndContext>
            </div>
            <div className="flex-shrink-0 px-4 py-2.5 bg-gray-50 rounded-b-2xl border-t border-gray-100">
              <p className="text-base text-gray-500">{collections.length} collection{collections.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent showCloseButton={false} className="w-full max-w-sm bg-white rounded-2xl p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete collection?</h3>
                <p className="text-sm text-gray-500">This cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              <span className="font-semibold">{deleteTarget?.name}</span> will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {isDeleting ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
