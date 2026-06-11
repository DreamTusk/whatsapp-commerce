'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Loader, Trash2, ImageOff } from '@deemlol/next-icons'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import api from '@/lib/api'
import type { Banner } from '@/types'
import { useIsOwner } from '@/contexts/role'

const STATUS_STYLES: Record<string, string> = {
  active:   'bg-green-50 text-green-600',
  inactive: 'bg-gray-100 text-gray-500',
  expired:  'bg-red-50 text-red-500',
}

const TYPE_LABELS: Record<string, string> = {
  product:    'Product',
  collection: 'Collection',
  url:        'URL',
}

export default function BannersPage() {
  const router = useRouter()
  const isOwner = useIsOwner()
  const [banners, setBanners]           = useState<Banner[]>([])
  const [loading, setLoading]           = useState(true)
  const [deletingId, setDeletingId]     = useState<string | null>(null)
  const [confirmBanner, setConfirmBanner] = useState<Banner | null>(null)

  useEffect(() => {
    api.get('/api/banners')
      .then(r => setBanners(r.data.banners))
      .catch(() => toast.error('Failed to load banners'))
      .finally(() => setLoading(false))
  }, [])

  async function handleDeleteConfirmed() {
    if (!confirmBanner) return
    setDeletingId(confirmBanner.id)
    setConfirmBanner(null)
    try {
      await api.delete(`/api/banners/${confirmBanner.id}`)
      setBanners(prev => prev.filter(b => b.id !== confirmBanner.id))
      toast.success('Banner deleted')
    } catch {
      toast.error('Failed to delete banner')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-6 pt-6 pb-4 bg-gray-50 flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-gray-900">Banners</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage carousel banners shown on your storefront</p>
        </div>
        <Button
          className="bg-[#6366f1] hover:bg-[#4f46e5] text-white h-10 gap-2"
          onClick={() => router.push('/dashboard/banners/new')}
        >
          <Plus className="w-4 h-4" /> Add banner
        </Button>
      </div>

      <div className="flex-1 overflow-auto min-h-0 px-6 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : banners.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <ImageOff className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-base font-medium text-gray-700">No banners yet</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">Add your first banner to show on the storefront carousel</p>
            <Button
              className="bg-[#6366f1] hover:bg-[#4f46e5] text-white gap-2"
              onClick={() => router.push('/dashboard/banners/new')}
            >
              <Plus className="w-4 h-4" /> Add banner
            </Button>
          </div>
        ) : (
          <div className="space-y-3 pt-2 max-w-3xl">
            {banners.map((banner) => (
              <div
                key={banner.id}
                onClick={() => router.push(`/dashboard/banners/${banner.id}/edit`)}
                className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 p-3 hover:border-gray-200 transition-colors cursor-pointer"
              >
                <div className="w-24 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  {banner.image_url ? (
                    <img src={banner.image_url} alt={banner.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageOff className="w-5 h-5 text-gray-300" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-base truncate">{banner.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                      {TYPE_LABELS[banner.type]}
                    </span>
                    {banner.expires_at && (
                      <span className="text-xs text-gray-400">
                        Expires {new Date(banner.expires_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize flex-shrink-0 ${STATUS_STYLES[banner.status]}`}>
                  {banner.status}
                </span>

                {isOwner && (
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setConfirmBanner(banner)}
                      disabled={deletingId === banner.id}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      {deletingId === banner.id
                        ? <Loader className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />
                      }
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!confirmBanner} onOpenChange={open => !open && setConfirmBanner(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete banner?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{confirmBanner?.name}&quot; will be permanently removed from your storefront.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={handleDeleteConfirmed}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
