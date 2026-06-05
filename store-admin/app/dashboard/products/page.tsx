'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ImagePlus, Loader2, ChevronRight, Package, X, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { AppSelect } from '@/components/ui/app-select'
import { AppCombobox } from '@/components/ui/app-combobox'
import api from '@/lib/api'
import type { Product, Category, Brand } from '@/types'
import { useIsOwner } from '@/contexts/role'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export default function ProductsPage() {
  const router = useRouter()
  const isOwner = useIsOwner()
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)

  const [filterCategory, setFilterCategory] = useState('')
  const [filterBrand, setFilterBrand] = useState('')
  const [filterStock, setFilterStock] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/api/products').then(r => setAllProducts(r.data.products)),
      api.get('/api/categories').then(r => setCategories(r.data.categories)),
      api.get('/api/brands').then(r => setBrands(r.data.brands)),
    ])
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false))
  }, [])

  const flatCategories = useMemo(() =>
    categories.flatMap(c => c.children && c.children.length > 0 ? c.children : [c]),
    [categories]
  )

  const products = useMemo(() => {
    return allProducts.filter(p => {
      if (filterCategory && p.category.id !== filterCategory) return false
      if (filterBrand) {
        if (filterBrand === '__none__' && p.brand) return false
        if (filterBrand !== '__none__' && p.brand?.id !== filterBrand) return false
      }
      if (filterStock === 'in_stock' && !p.in_stock) return false
      if (filterStock === 'out_of_stock' && p.in_stock) return false
      if (filterStatus === 'active' && !p.is_active) return false
      if (filterStatus === 'inactive' && p.is_active) return false
      return true
    })
  }, [allProducts, filterCategory, filterBrand, filterStock, filterStatus])

  const activeFilterCount = [filterCategory, filterBrand, filterStock, filterStatus].filter(Boolean).length

  function clearFilters() {
    setFilterCategory('')
    setFilterBrand('')
    setFilterStock('')
    setFilterStatus('')
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await api.delete(`/api/products/${deleteTarget.id}`)
      setAllProducts(prev => prev.filter(p => p.id !== deleteTarget.id))
      toast.success('Product deleted')
      setDeleteTarget(null)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to delete product'
      toast.error(msg)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[26px] font-bold text-gray-900">Products</h1>
            <p className="text-base text-gray-500 mt-0.5">
              {products.length}{activeFilterCount > 0 ? ` of ${allProducts.length}` : ''} products
            </p>
          </div>
          <Button onClick={() => router.push('/dashboard/products/new')} className="bg-[#6366f1] hover:bg-[#4f46e5] text-white gap-2">
            <Plus className="w-4 h-4" /> Add product
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex-shrink-0 px-6 pb-4 bg-gray-50">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-sm text-gray-400">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filter</span>
          </div>

          <AppCombobox
            value={filterCategory}
            onValueChange={setFilterCategory}
            placeholder="All categories"
            searchPlaceholder="Search categories..."
            className="w-52 h-9 text-sm"
            options={flatCategories.map(c => ({ value: c.id, label: c.name }))}
          />

          <AppCombobox
            value={filterBrand}
            onValueChange={setFilterBrand}
            placeholder="All brands"
            searchPlaceholder="Search brands..."
            className="w-44 h-9 text-sm"
            options={[
              ...brands.map(b => ({ value: b.id, label: b.name })),
              { value: '__none__', label: 'No brand' },
            ]}
          />

          <AppSelect
            value={filterStock}
            onValueChange={setFilterStock}
            placeholder="All stock"
            className="w-36 h-9 text-sm"
            options={[
              { value: 'in_stock', label: 'In stock' },
              { value: 'out_of_stock', label: 'Out of stock' },
            ]}
          />

          <AppSelect
            value={filterStatus}
            onValueChange={setFilterStatus}
            placeholder="All status"
            className="w-32 h-9 text-sm"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />

          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 h-9 px-3 rounded-lg text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Clear {activeFilterCount > 1 ? `(${activeFilterCount})` : ''}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 px-6 pb-4 flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-xl font-medium">{activeFilterCount > 0 ? 'No products match filters' : 'No products yet'}</p>
            <p className="text-base mt-1">
              {activeFilterCount > 0
                ? <button onClick={clearFilters} className="text-[#6366f1] hover:underline cursor-pointer">Clear filters</button>
                : 'Add your first product to get started'}
            </p>
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
                          <p className="font-medium text-gray-900">{p.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{p.category.name}</td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{p.brand?.name ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">₹{p.selling_price}</td>
                      <td className="px-4 py-3 text-gray-400">
                        {p.original_price != null && p.original_price > p.selling_price ? `₹${p.original_price}` : <span className="text-gray-200">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {p.discount_percent != null
                          ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-600">{p.discount_percent}% off</span>
                          : <span className="text-gray-200">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${p.in_stock ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                          {p.in_stock ? 'In stock' : 'Out of stock'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${p.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5 justify-end">
                          <button onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/products/${p.id}/edit`) }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {isOwner && (
                            <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(p) }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <ChevronRight className="w-4 h-4 text-gray-300 ml-1" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex-shrink-0 px-4 py-2.5 bg-gray-50 rounded-b-2xl border-t border-gray-100">
              <p className="text-base text-gray-500">
                {products.length}{activeFilterCount > 0 ? ` of ${allProducts.length}` : ''} products
              </p>
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
                <Trash2 className="w-5 h-5 text-red-500" />
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
