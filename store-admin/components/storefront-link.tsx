'use client'

import { useState } from 'react'
import { Copy, Check, ExternalLink } from '@deemlol/next-icons'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { getStorefrontUrl } from '@/lib/utils'

interface Props {
  domain: string | null | undefined
  compact?: boolean
}

export default function StorefrontLink({ domain, compact = false }: Props) {
  const [copied, setCopied] = useState(false)
  const url = getStorefrontUrl(domain)

  if (!url) return null

  async function handleCopy() {
    await navigator.clipboard.writeText(url!)
    setCopied(true)
    toast.success('Store link copied')
    setTimeout(() => setCopied(false), 1500)
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1 min-w-0">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-[#6366f1] transition-colors truncate min-w-0"
        >
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{domain}</span>
        </a>
        <button
          onClick={handleCopy}
          title="Copy store link"
          className="p-1 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
        >
          {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 border border-gray-100">
      <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 text-sm font-medium text-[#6366f1] hover:underline truncate"
      >
        {url}
      </a>
      <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  )
}
