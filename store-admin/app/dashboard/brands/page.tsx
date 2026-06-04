'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, BookMarked, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/api'
import type { Brand } from '@/types'

export default function BrandsPage() {
  const router = useRouter()
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)

  const [addOpen, setAddOpen] = useState(false)
  const [addName, setAddName] = useState('')
  const [isSavingAdd, setIsSavingAdd] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    api.get('/api/brands')
      .then(res => setBrands(res.data.brands))
      .catch(() => toast.error('Failed to load brands'))
      .finally(() => setLoading(false))
  }, [])

  async function handleAddBrand() {
    if (!addName.trim()) { toast.error('Brand name is required'); return }
    setIsSavingAdd(true)
    try {
      const res = await api.post('/api/brands', { name: addName.trim() })
      setBrands(prev => [...prev, res.data.brand])
      toast.success('Brand created')
      setAddOpen(false)
      setAddName('')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to create brand'
      toast.error(msg)
    } finally {
      setIsSavingAdd(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await api.delete(`/api/brands/${deleteTarget.id}`)
      setBrands(prev => prev.filter(b => b.id !== deleteTarget.id))
      toast.success('Brand deleted')
      setDeleteTarget(null)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to delete brand'
      toast.error(msg)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-6 pt-6 pb-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[26px] font-bold text-gray-900">Brands</h1>
            <p className="text-base text-gray-500 mt-0.5">{brands.length} brands</p>
          </div>
          <Button onClick={() => { setAddName(''); setAddOpen(true) }} className="bg-[#6366f1] hover:bg-[#4f46e5] text-white gap-2">
            <Plus className="w-4 h-4" /> Add brand
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 px-6 pt-6 pb-4 flex flex-col">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : brands.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <BookMarked className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-xl font-medium">No brands yet</p>
          <p className="text-base mt-1">Add brands to categorise your products by manufacturer</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full text-base min-w-[500px]">
            <thead className="bg-indigo-50 border-b border-indigo-100 sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide">Brand</th>
                <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide">Products</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {brands.map(b => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#6366f1]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-base font-bold text-[#6366f1]">{b.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <p className="font-medium text-gray-900">{b.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{b.product_count} product{b.product_count !== 1 ? 's' : ''}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => router.push(`/dashboard/brands/${b.id}/edit`)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget(b)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="flex-shrink-0 px-4 py-2.5 bg-gray-50 rounded-b-2xl border-t border-gray-100">
            <p className="text-base text-gray-500">{brands.length} brands</p>
          </div>
        </div>
      )}
      </div>

      {/* Add Brand Dialog */}
      <Dialog open={addOpen} dismissible={false} onOpenChange={() => {}}>
        <DialogContent showCloseButton={false} className="w-full max-w-sm bg-white rounded-2xl p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-lg">Add brand</h3>
              <button onClick={() => { setAddOpen(false); setAddName('') }} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-base">Brand name <span className="text-destructive">*</span></Label>
              <Input
                className="text-base h-11"
                placeholder="e.g. Amul, Nestle"
                value={addName}
                onChange={e => setAddName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddBrand()}
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setAddOpen(false); setAddName('') }}>Cancel</Button>
              <Button className="flex-1 bg-[#6366f1] hover:bg-[#4f46e5] text-white" onClick={handleAddBrand} disabled={isSavingAdd}>
                {isSavingAdd ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isSavingAdd ? 'Saving…' : 'Add brand'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Brand Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent showCloseButton={false} className="w-full max-w-sm bg-white rounded-2xl p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete brand?</h3>
                <p className="text-sm text-gray-500">Products will keep their data but lose this brand.</p>
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
