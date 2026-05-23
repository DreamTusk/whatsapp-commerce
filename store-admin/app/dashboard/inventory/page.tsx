'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Loader2, Warehouse, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import api from '@/lib/api'
import type { InventoryItem } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

const STATUS_CONFIG = {
  out: { label: 'Out of stock', className: 'bg-red-50 text-red-600' },
  low: { label: 'Low stock', className: 'bg-amber-50 text-amber-600' },
  in_stock: { label: 'In stock', className: 'bg-green-50 text-green-600' },
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [adjustTarget, setAdjustTarget] = useState<InventoryItem | null>(null)
  const [addQty, setAddQty] = useState('')
  const [newOutOfStockLevel, setNewOutOfStockLevel] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const fetchInventory = useCallback(async () => {
    try {
      const res = await api.get('/api/inventory')
      setItems(res.data.inventory)
    } catch {
      toast.error('Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchInventory() }, [fetchInventory])

  function openAdjust(item: InventoryItem) {
    setAdjustTarget(item)
    setAddQty('')
    setNewOutOfStockLevel(String(item.out_of_stock_level))
  }

  async function handleSave() {
    if (!adjustTarget) return
    setIsSaving(true)
    try {
      const body: Record<string, unknown> = {}
      if (addQty.trim()) body.add = parseFloat(addQty)
      if (newOutOfStockLevel !== String(adjustTarget.out_of_stock_level)) {
        body.out_of_stock_level = parseFloat(newOutOfStockLevel)
      }

      if (Object.keys(body).length === 0) { setAdjustTarget(null); return }

      const variantId = adjustTarget.variant.id
      const productId = adjustTarget.product.id
      const res = await api.patch(`/api/products/${productId}/variants/${variantId}/inventory`, body)
      const updated = res.data.inventory

      setItems(prev => prev.map(item =>
        item.variant.id === variantId
          ? {
              ...item,
              qty: updated.qty,
              out_of_stock_level: updated.out_of_stock_level,
              status: updated.qty <= updated.out_of_stock_level ? 'out'
                : updated.qty <= updated.out_of_stock_level + 10 ? 'low' : 'in_stock',
            }
          : item
      ))

      toast.success('Stock updated')
      setAdjustTarget(null)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to update stock'
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  const filtered = items.filter(item => {
    const q = search.toLowerCase()
    return item.product.name.toLowerCase().includes(q) || item.variant.name.toLowerCase().includes(q)
  })

  const outCount = items.filter(i => i.status === 'out').length
  const lowCount = items.filter(i => i.status === 'low').length

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} tracked variants</p>
        </div>
        {(outCount > 0 || lowCount > 0) && (
          <div className="flex gap-2">
            {outCount > 0 && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-600">
                {outCount} out of stock
              </span>
            )}
            {lowCount > 0 && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-600">
                {lowCount} low stock
              </span>
            )}
          </div>
        )}
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search product or variant…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Warehouse className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">{search ? 'No matches' : 'No tracked variants'}</p>
          <p className="text-sm mt-1">{!search && 'Enable inventory tracking on a variant from the Products page'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Product / Variant</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Qty</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Out-of-stock at</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {item.product.image_url ? (
                        <img src={`${API_URL}${item.product.image_url}`} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex-shrink-0" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{item.product.name}</p>
                        <p className="text-xs text-gray-400">{item.variant.name}{item.variant.unit ? ` · ${item.variant.unit}` : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">{item.product.category.name}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-gray-900">{item.qty}</span>
                    {item.variant.unit && <span className="text-xs text-gray-400 ml-1">{item.variant.unit}</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">{item.out_of_stock_level}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_CONFIG[item.status].className}`}>
                      {STATUS_CONFIG[item.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="outline"
                      className="h-8 text-xs px-3"
                      onClick={() => openAdjust(item)}
                    >
                      Adjust
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!adjustTarget} onOpenChange={(open) => { if (!open) setAdjustTarget(null) }} disablePointerDismissal>
        <DialogContent showCloseButton={false} className="w-full max-w-sm bg-white rounded-2xl p-6">
          {adjustTarget && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Adjust stock</h3>
                <p className="text-sm text-gray-500 mt-0.5">{adjustTarget.product.name} · {adjustTarget.variant.name}</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                <span className="text-sm text-gray-500">Current quantity</span>
                <span className="font-bold text-gray-900">
                  {adjustTarget.qty} {adjustTarget.variant.unit ?? ''}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Add stock <span className="text-gray-400 font-normal text-xs">(leave blank to skip)</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={addQty}
                  onChange={e => setAddQty(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
                />
                {addQty && !isNaN(parseFloat(addQty)) && (
                  <p className="text-xs text-[#25D366]">
                    New qty: {adjustTarget.qty + parseFloat(addQty)} {adjustTarget.variant.unit ?? ''}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Out-of-stock level</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={newOutOfStockLevel}
                  onChange={e => setNewOutOfStockLevel(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
                />
                <p className="text-xs text-gray-400">Mark as out of stock when qty drops to or below this value</p>
              </div>

              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setAdjustTarget(null)} disabled={isSaving}>
                  Cancel
                </Button>
                <Button className="flex-1 bg-[#25D366] hover:bg-[#1ebe5d] text-white" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {isSaving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
