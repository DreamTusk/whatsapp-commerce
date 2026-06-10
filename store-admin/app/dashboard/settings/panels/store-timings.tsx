'use client'

import { Clock } from 'lucide-react'

export default function StoreTimingsPanel() {
  return (
    <div className="bg-white  rounded-sm  border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-1">
        <Clock className="w-5 h-5 text-gray-400" />
        <h2 className="text-base font-semibold text-gray-900">Store timings</h2>
      </div>
      <p className="text-sm text-gray-400 mb-8">Your store will be automatically switched online/offline based on the hours you choose.</p>
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-300">
        <Clock className="w-12 h-12" />
        <p className="text-sm font-medium text-gray-400">Store timings settings coming soon</p>
      </div>
    </div>
  )
}
