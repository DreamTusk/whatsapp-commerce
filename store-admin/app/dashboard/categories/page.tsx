'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ImagePlus, Loader2, ArrowLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import api from '@/lib/api'
import type { Category } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export default function CategoriesPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formParentId, setFormParentId] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)
  const [formImageFile, setFormImageFile] = useState<File | null>(null)
  const [formImagePreview, setFormImagePreview] = useState<string | null>(null)
  const [formIsSaving, setFormIsSaving] = useState(false)

  useEffect(() => { fetchCategories() }, [])

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

  function openForm() {
    setFormName('')
    setFormParentId('')
    setFormIsActive(true)
    setFormImageFile(null)
    setFormImagePreview(null)
    setShowForm(true)
  }

  function handleFormImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setFormImageFile(file)
    setFormImagePreview(file ? URL.createObjectURL(file) : null)
  }

  async function handleAddCategory() {
    if (!formName.trim()) { toast.error('Category name is required'); return }
    setFormIsSaving(true)
    try {
      const formData = new FormData()
      formData.append('name', formName.trim())
      formData.append('is_active', String(formIsActive))
      if (formParentId) formData.append('parent_id', formParentId)
      if (formImageFile) formData.append('image', formImageFile)
      await api.post('/api/categories', formData)
      await fetchCategories()
      toast.success('Category created')
      setShowForm(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to create category'
      toast.error(msg)
    } finally {
      setFormIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await api.delete(`/api/categories/${deleteTarget.id}`)
      await fetchCategories()
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
      await api.put(`/api/categories/${cat.id}`, formData)
      await fetchCategories()
    } catch {
      toast.error('Failed to update category')
    }
  }

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Total count including sub-categories
  const totalCount = categories.reduce((sum, c) => sum + 1 + (c.children?.length ?? 0), 0)

  // ── Add form view ──────────────────────────────────────────────────────────
  if (showForm) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-shrink-0 px-6 pt-6 pb-4 bg-gray-50">
          <button
            onClick={() => setShowForm(false)}
            className="flex items-center gap-1.5 text-base text-gray-500 hover:text-gray-700 mb-3 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Categories
          </button>
          <h1 className="text-[26px] font-bold text-gray-900">Add category</h1>
        </div>
        <div className="flex-1 overflow-auto min-h-0">
          <div className="flex justify-center px-6 py-8">
          <div className="w-full max-w-lg space-y-4">
            <div className="space-y-1.5">
              <Label className="text-base">Image <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 group-hover:border-[#6366f1] flex items-center justify-center overflow-hidden transition-colors flex-shrink-0">
                  {formImagePreview ? (
                    <img src={formImagePreview} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImagePlus className="w-5 h-5 text-gray-300 group-hover:text-[#6366f1] transition-colors" />
                  )}
                </div>
                <span className="text-base text-gray-500 group-hover:text-gray-700">
                  {formImagePreview ? 'Change image' : 'Upload image'}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFormImageChange} />
              </label>
            </div>

            <div className="space-y-1.5">
              <Label className="text-base">Name <span className="text-destructive">*</span></Label>
              <Input
                className="text-base h-11"
                placeholder="Fruits & Vegetables"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-base">Parent category <span className="text-gray-400 font-normal text-xs">(optional — makes this a sub-category)</span></Label>
              <select
                value={formParentId}
                onChange={e => setFormParentId(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-gray-200 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#6366f1]"
              >
                <option value="">None (top-level)</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-base">Status</Label>
              <button
                type="button"
                onClick={() => setFormIsActive(v => !v)}
                className={`w-full h-11 rounded-lg text-base font-medium border transition-colors cursor-pointer ${formIsActive ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}
              >
                {formIsActive ? 'Active' : 'Inactive'}
              </button>
            </div>

            <Button
              className="bg-[#6366f1] hover:bg-[#4f46e5] text-white w-full h-11 text-base"
              onClick={handleAddCategory}
              disabled={formIsSaving}
            >
              {formIsSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {formIsSaving ? 'Saving…' : 'Add category'}
            </Button>
          </div>
          </div>
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
            <h1 className="text-[26px] font-bold text-gray-900">Categories</h1>
            <p className="text-base text-gray-500 mt-0.5">{totalCount} categories</p>
          </div>
          <Button onClick={openForm} className="bg-[#6366f1] hover:bg-[#4f46e5] text-white gap-2">
            <Plus className="w-4 h-4" /> Add category
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 px-6 pt-6 pb-4 flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-xl font-medium">No categories yet</p>
            <p className="text-base mt-1">Add your first category to get started</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 min-h-0 flex flex-col">
            <div className="flex-1 overflow-auto min-h-0">
            <table className="w-full text-base min-w-[500px]">
              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide">Category</th>
                  <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {categories.map(cat => {
                  const isExpanded = expandedIds.has(cat.id)
                  const hasChildren = cat.children && cat.children.length > 0
                  return (
                  <React.Fragment key={cat.id}>
                    {/* Parent row */}
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {hasChildren ? (
                            <button
                              onClick={() => toggleExpand(cat.id)}
                              className="p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer flex-shrink-0"
                            >
                              <ChevronRight className={`w-4 h-4 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`} />
                            </button>
                          ) : (
                            <span className="w-5 flex-shrink-0" />
                          )}
                          {cat.image_url ? (
                            <img src={cat.image_url.startsWith('http') ? cat.image_url : `${API_URL}${cat.image_url}`} alt={cat.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <ImagePlus className="w-4 h-4 text-gray-300" />
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-gray-900">{cat.name}</span>
                            {hasChildren && (
                              <span className="ml-2 text-xs text-gray-400">{cat.children!.length} sub</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(cat)}
                          className={`text-base font-medium px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                            cat.is_active ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {cat.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => router.push(`/dashboard/categories/${cat.id}/edit`)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(cat)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Sub-category rows — only when expanded */}
                    {isExpanded && cat.children?.map(child => (
                      <tr key={`child-${child.id}`} className="hover:bg-gray-50 transition-colors bg-gray-50/50 border-t-0">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2 pl-9">
                            {child.image_url ? (
                              <img src={child.image_url.startsWith('http') ? child.image_url : `${API_URL}${child.image_url}`} alt={child.name} className="w-8 h-8 rounded-md object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <ImagePlus className="w-3 h-3 text-gray-300" />
                              </div>
                            )}
                            <span className="text-gray-700">{child.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => toggleActive(child)}
                            className={`text-sm font-medium px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                              child.is_active ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                          >
                            {child.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => router.push(`/dashboard/categories/${child.id}/edit`)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(child)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                )})}

              </tbody>
            </table>
            </div>
            <div className="flex-shrink-0 px-4 py-2.5 bg-gray-50 rounded-b-2xl border-t border-gray-100">
              <p className="text-base text-gray-500">{totalCount} categories</p>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
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
              {deleteTarget?.children && deleteTarget.children.length > 0 && (
                <span className="block mt-1 text-red-500">Delete its {deleteTarget.children.length} sub-categor{deleteTarget.children.length === 1 ? 'y' : 'ies'} first.</span>
              )}
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
