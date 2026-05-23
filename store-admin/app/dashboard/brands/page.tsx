'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, X, BookMarked } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import api from '@/lib/api'
import type { Brand } from '@/types'

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Brand | null>(null)
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    api.get('/api/brands')
      .then(res => setBrands(res.data.brands))
      .catch(() => toast.error('Failed to load brands'))
      .finally(() => setLoading(false))
  }, [])

  function openAdd() {
    setEditing(null)
    setName('')
    setModalOpen(true)
  }

  function openEdit(b: Brand) {
    setEditing(b)
    setName(b.name)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!name.trim()) { toast.error('Brand name is required'); return }
    setIsSaving(true)
    try {
      if (editing) {
        const res = await api.put(`/api/brands/${editing.id}`, { name: name.trim() })
        setBrands(prev => prev.map(b => b.id === editing.id ? res.data.brand : b))
        toast.success('Brand updated')
      } else {
        const res = await api.post('/api/brands', { name: name.trim() })
        setBrands(prev => [...prev, res.data.brand])
        toast.success('Brand created')
      }
      setModalOpen(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to save brand'
      toast.error(msg)
    } finally {
      setIsSaving(false)
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
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brands</h1>
          <p className="text-sm text-gray-500 mt-0.5">{brands.length} brands</p>
        </div>
        <Button onClick={openAdd} className="bg-[#25D366] hover:bg-[#1ebe5d] text-white gap-2">
          <Plus className="w-4 h-4" /> Add brand
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : brands.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <BookMarked className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No brands yet</p>
          <p className="text-sm mt-1">Add brands to categorise your products by manufacturer</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Brand</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Products</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {brands.map(b => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#25D366]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-[#25D366]">{b.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <p className="font-medium text-gray-900">{b.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{b.product_count} product{b.product_count !== 1 ? 's' : ''}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget(b)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
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

      <Dialog open={modalOpen} onOpenChange={setModalOpen} disablePointerDismissal>
        <DialogContent showCloseButton={false} className="w-full max-w-sm bg-white rounded-2xl p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">{editing ? 'Edit brand' : 'Add brand'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5">
              <Label>Brand name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Amul, Nestle"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button className="flex-1 bg-[#25D366] hover:bg-[#1ebe5d] text-white" onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isSaving ? 'Saving…' : editing ? 'Save changes' : 'Add brand'}
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
