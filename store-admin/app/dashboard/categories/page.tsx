'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ImagePlus, Loader2, X, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import api from '@/lib/api'
import type { Category } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // Add/Edit modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [name, setName] = useState('')
  const [nameLocal, setNameLocal] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [isActive, setIsActive] = useState(true)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchCategories()
  }, [])

  async function fetchCategories() {
    try {
      const res = await api.get('/api/categories')
      setCategories(res.data.categories)
    } catch {
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  function openAdd() {
    setEditing(null)
    setName('')
    setNameLocal('')
    setSortOrder(String(categories.length))
    setIsActive(true)
    setImageFile(null)
    setImagePreview(null)
    setModalOpen(true)
  }

  function openEdit(cat: Category) {
    setEditing(cat)
    setName(cat.name)
    setNameLocal(cat.name_local ?? '')
    setSortOrder(String(cat.sort_order))
    setIsActive(cat.is_active)
    setImageFile(null)
    setImagePreview(null)
    setModalOpen(true)
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setImageFile(file)
    setImagePreview(file ? URL.createObjectURL(file) : null)
  }

  async function handleSave() {
    if (!name.trim()) { toast.error('Category name is required'); return }
    setIsSaving(true)
    try {
      const formData = new FormData()
      formData.append('name', name.trim())
      if (nameLocal.trim()) formData.append('name_local', nameLocal.trim())
      formData.append('sort_order', sortOrder)
      formData.append('is_active', String(isActive))
      if (imageFile) formData.append('image', imageFile)

      if (editing) {
        const res = await api.put(`/api/categories/${editing.id}`, formData)
        setCategories(prev => prev.map(c => c.id === editing.id ? res.data.category : c))
        toast.success('Category updated')
      } else {
        const res = await api.post('/api/categories', formData)
        setCategories(prev => [...prev, res.data.category])
        toast.success('Category created')
      }
      setModalOpen(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to save category'
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await api.delete(`/api/categories/${deleteTarget.id}`)
      setCategories(prev => prev.filter(c => c.id !== deleteTarget.id))
      toast.success('Category deleted')
      setDeleteTarget(null)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to delete category'
      toast.error(msg)
    } finally {
      setIsDeleting(false)
    }
  }

  async function toggleActive(cat: Category) {
    try {
      const formData = new FormData()
      formData.append('is_active', String(!cat.is_active))
      const res = await api.put(`/api/categories/${cat.id}`, formData)
      setCategories(prev => prev.map(c => c.id === cat.id ? res.data.category : c))
    } catch {
      toast.error('Failed to update category')
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">{categories.length} categories</p>
        </div>
        <Button onClick={openAdd} className="bg-[#25D366] hover:bg-[#1ebe5d] text-white gap-2">
          <Plus className="w-4 h-4" /> Add category
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">No categories yet</p>
          <p className="text-sm mt-1">Add your first category to get started</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide w-8"></th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Local name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Order</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {categories.map(cat => (
                <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-300">
                    <GripVertical className="w-4 h-4" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {cat.image_url ? (
                        <img
                          src={`${API_URL}${cat.image_url}`}
                          alt={cat.name}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <ImagePlus className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                      <span className="font-medium text-gray-900">{cat.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                    {cat.name_local || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{cat.sort_order}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(cat)}
                      className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                        cat.is_active
                          ? 'bg-green-50 text-green-600 hover:bg-green-100'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {cat.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(cat)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(cat)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
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

      {/* Add/Edit Modal — disablePointerDismissal prevents closing on outside click */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen} disablePointerDismissal>
        <DialogContent showCloseButton={false} className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">{editing ? 'Edit category' : 'Add category'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Image */}
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
                  {imagePreview ? 'Change image' : editing?.image_url ? 'Change image' : 'Upload image'}
                </span>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Name <span className="text-destructive">*</span></Label>
              <Input id="cat-name" placeholder="Fruits & Vegetables" value={name} onChange={e => setName(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-name-local">Local name <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
              <Input id="cat-name-local" placeholder="பழங்கள் & காய்கறிகள்" value={nameLocal} onChange={e => setNameLocal(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cat-order">Sort order</Label>
                <Input id="cat-order" type="number" min={0} value={sortOrder} onChange={e => setSortOrder(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <button
                  type="button"
                  onClick={() => setIsActive(v => !v)}
                  className={`w-full h-10 rounded-lg text-sm font-medium border transition-colors ${
                    isActive
                      ? 'bg-green-50 text-green-600 border-green-200'
                      : 'bg-gray-50 text-gray-500 border-gray-200'
                  }`}
                >
                  {isActive ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-[#25D366] hover:bg-[#1ebe5d] text-white"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isSaving ? 'Saving…' : editing ? 'Save changes' : 'Add category'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Modal — dismissible by default (no data to lose) */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent showCloseButton={false} className="w-full max-w-sm bg-white rounded-2xl p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete category?</h3>
                <p className="text-sm text-gray-500">This cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              <span className="font-semibold">{deleteTarget?.name}</span> will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                onClick={handleDelete}
                disabled={isDeleting}
              >
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
