'use client'

import { HeartHandshake } from 'lucide-react'

export default function SupportSocialPanel() {
  return (
    <div className="bg-white border rounded-sm border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-1">
        <HeartHandshake className="w-5 h-5 text-gray-400" />
        <h2 className="text-base font-semibold text-gray-900">Support &amp; Social</h2>
      </div>
      <p className="text-sm text-gray-400 mb-8">Add support contacts and social media links for your store.</p>
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-300">
        <HeartHandshake className="w-12 h-12" />
        <p className="text-sm font-medium text-gray-400">Support &amp; Social settings coming soon</p>
      </div>
    </div>
  )
}
