'use client'

import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import type { PartialBlock } from '@blocknote/core'
import '@blocknote/mantine/style.css'
import '@blocknote/core/fonts/inter.css'

interface BlockNotePreviewProps {
  content: string
}

export default function BlockNotePreview({ content }: BlockNotePreviewProps) {
  const blocks: PartialBlock[] | null = (() => {
    try {
      const parsed = JSON.parse(content)
      return Array.isArray(parsed) ? parsed : null
    } catch {
      return null
    }
  })()

  const editor = useCreateBlockNote({
    initialContent: blocks ?? undefined,
  })

  if (!blocks) {
    return <p className="text-sm text-gray-500 leading-relaxed">{content}</p>
  }

  return (
    <BlockNoteView
      editor={editor}
      theme="light"
      editable={false}
    />
  )
}
