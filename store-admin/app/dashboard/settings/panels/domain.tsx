'use client'

import { Globe } from 'lucide-react'

export default function DomainPanel() {
  return (
    <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-1">
        <Globe className="w-5 h-5 text-gray-400" />
        <h2 className="text-base font-semibold text-gray-900">Domain</h2>
      </div>
      <p className="text-sm text-gray-400 mb-8">Manage your store's custom domain settings.</p>
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-300">
        <Globe className="w-12 h-12" />
        <p className="text-sm font-medium text-gray-400">Domain settings coming soon</p>
      </div>
    </div>
  )
}
