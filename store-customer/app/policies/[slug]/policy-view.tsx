'use client'

import dynamic from 'next/dynamic'

const BlockNoteViewer = dynamic(() => import('./blocknote-viewer'), { ssr: false, loading: () => <div className="animate-pulse h-64 bg-gray-50 rounded-lg" /> })

interface Props {
  content: string
}

export default function PolicyView({ content }: Props) {
  const blocks = (() => {
    try {
      const parsed = JSON.parse(content)
      return Array.isArray(parsed) ? parsed : null
    } catch {
      return null
    }
  })()

  if (!blocks) {
    return <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{content}</p>
  }

  return <BlockNoteViewer blocks={blocks} />
}
