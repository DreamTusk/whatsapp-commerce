'use client'

import { ScrollText } from 'lucide-react'

export default function PoliciesPanel() {
  return (
    <div className="bg-white  rounded-sm border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-1">
        <ScrollText className="w-5 h-5 text-gray-400" />
        <h2 className="text-base font-semibold text-gray-900">Policies</h2>
      </div>
      <p className="text-sm text-gray-400 mb-8">Set your store's return, privacy, and shipping policies.</p>
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-300">
        <ScrollText className="w-12 h-12" />
        <p className="text-sm font-medium text-gray-400">Policies settings coming soon</p>
      </div>
    </div>
  )
}
