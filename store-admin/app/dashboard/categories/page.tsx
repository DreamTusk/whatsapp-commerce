'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Trash2, ImagePlus, Loader, ChevronRight } from '@deemlol/next-icons'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import api from '@/lib/api'
import type { Category } from '@/types'
import { useIsOwner } from '@/contexts/role'
import { apiErrorMessage } from '@/lib/utils'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export default function CategoriesPage() {
  const router = useRouter()
  const isOwner = useIsOwner()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [latestFirst, setLatestFirst] = useState(false)

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

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await api.delete(`/api/categories/${deleteTarget.id}`)
      await fetchCategories()
      toast.success('Category deleted')
      setDeleteTarget(null)
    } catch (err: unknown) {
      const msg = apiErrorMessage(err, 'Failed to delete category')
      toast.error(msg)
    } finally {
      setIsDeleting(false)
    }
  }

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const totalCount = categories.reduce((sum, c) => sum + 1 + (c.children?.length ?? 0), 0)

  const sortedCategories = latestFirst
    ? [...categories].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : categories

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-6 pt-6 pb-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[26px] font-bold text-gray-900">Categories</h1>
            <p className="text-base text-gray-500 mt-0.5">{totalCount} categories</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLatestFirst(v => !v)}
              className={`text-sm font-medium px-3 py-2 rounded-lg border transition-colors ${latestFirst ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
            >
              Latest added
            </button>
            <Button onClick={() => router.push('/dashboard/categories/new')} className="bg-[#6366f1] hover:bg-[#4f46e5] text-white gap-2">
              <Plus className="w-4 h-4" /> Add category
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 px-6 pt-6 pb-4 flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-xl font-medium">No categories yet</p>
            <p className="text-base mt-1">Add your first category to get started</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto min-h-0">
              <table className="w-full text-base min-w-[500px]">
                <thead className="bg-indigo-50 border-b border-indigo-100 sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide">Category</th>
                    <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sortedCategories.map(cat => {
                    const isExpanded = expandedIds.has(cat.id)
                    const hasChildren = cat.children && cat.children.length > 0
                    return (
                      <React.Fragment key={cat.id}>
                        <tr className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => router.push(`/dashboard/categories/${cat.id}/edit`)}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {hasChildren ? (
                                <button onClick={e => { e.stopPropagation(); toggleExpand(cat.id) }} className="p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0">
                                  <ChevronRight className={`w-4 h-4 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`} />
                                </button>
                              ) : (
                                <span className="w-5 flex-shrink-0" />
                              )}
                              {cat.image_url ? (
                                <img src={cat.image_url.startsWith('http') ? cat.image_url : `${API_URL}${cat.image_url}`} alt={cat.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                                  <ImagePlus className="w-4 h-4 text-gray-300" />
                                </div>
                              )}
                              <div>
                                <span className="font-medium text-gray-900">{cat.name}</span>
                                {hasChildren && <span className="ml-2 text-xs text-gray-400">{cat.children!.length} sub</span>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-base font-medium px-2.5 py-1 rounded-full ${cat.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                              {cat.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-1 justify-end">
                              {isOwner && (
                                <button onClick={() => setDeleteTarget(cat)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {isExpanded && cat.children?.map(child => (
                          <tr key={`child-${child.id}`} className="hover:bg-gray-50 transition-colors bg-gray-50/50 cursor-pointer" onClick={() => router.push(`/dashboard/categories/${child.id}/edit`)}>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2 pl-9">
                                {child.image_url ? (
                                  <img src={child.image_url.startsWith('http') ? child.image_url : `${API_URL}${child.image_url}`} alt={child.name} className="w-8 h-8 rounded-xl object-cover flex-shrink-0" />
                                ) : (
                                  <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                                    <ImagePlus className="w-3 h-3 text-gray-300" />
                                  </div>
                                )}
                                <span className="text-gray-700">{child.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${child.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                {child.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center gap-1 justify-end">
                                {isOwner && (
                                  <button onClick={() => setDeleteTarget(child)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex-shrink-0 px-4 py-2.5 bg-gray-50 rounded-b-2xl border-t border-gray-100">
              <p className="text-base text-gray-500">{totalCount} categories</p>
            </div>
          </div>
        )}
      </div>

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
              <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting && <Loader className="w-4 h-4 animate-spin mr-2" />}
                {isDeleting ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
