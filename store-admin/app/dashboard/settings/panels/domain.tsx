'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Globe, Loader } from '@deemlol/next-icons'
import api from '@/lib/api'
import StorefrontLink from '@/components/storefront-link'
import type { Store as StoreType } from '@/types'

export default function DomainPanel() {
  const [store, setStore] = useState<StoreType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/store')
      .then(res => setStore(res.data.store))
      .catch(() => toast.error('Failed to load store'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-1">
        <Globe className="w-5 h-5 text-gray-400" />
        <h2 className="text-base font-semibold text-gray-900">Domain</h2>
      </div>
      <p className="text-sm text-gray-400 mb-8">Manage your store's custom domain settings.</p>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : store?.domain ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Your store is live at</p>
          <StorefrontLink domain={store.domain} />
          <p className="text-xs text-gray-400 pt-2">Changing your custom domain isn't supported yet — contact support if you need this updated.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-300">
          <Globe className="w-12 h-12" />
          <p className="text-sm font-medium text-gray-400">No domain set for this store</p>
        </div>
      )}
    </div>
  )
}
