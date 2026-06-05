'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Plus, Trash2, Loader2, MousePointerClick, Zap, Pencil, GripVertical,
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
import api from '@/lib/api'
import type { Collection } from '@/types'
import { useIsOwner } from '@/contexts/role'

// ── Sortable row ─────────────────────────────────────────────────────────────

function SortableRow({
  col,
  onEdit,
  onDelete,
  onToggleActive,
  isOwner,
}: {
  col: Collection
  onEdit: (col: Collection) => void
  onDelete: (col: Collection) => void
  onToggleActive: (col: Collection) => void
  isOwner: boolean
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
          {isOwner && (
            <button
              onClick={() => onDelete(col)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

// ── Page component ────────────────────────────────────────────────────────────

export default function CollectionsPage() {
  const router = useRouter()
  const isOwner = useIsOwner()
  const [collections, setCollections] = useState<Collection[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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
          <Button onClick={() => router.push('/dashboard/collections/new')} className="bg-[#6366f1] hover:bg-[#4f46e5] text-white gap-2">
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
                          onEdit={col => router.push(`/dashboard/collections/${col.id}/edit`)}
                          onDelete={setDeleteTarget}
                          onToggleActive={toggleActive}
                          isOwner={isOwner}
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
