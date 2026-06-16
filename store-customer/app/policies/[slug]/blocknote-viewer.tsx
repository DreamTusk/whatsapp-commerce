'use client'

import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import type { PartialBlock } from '@blocknote/core'
import '@blocknote/mantine/style.css'
import '@blocknote/core/fonts/inter.css'

interface Props {
  blocks: PartialBlock[]
}

export default function BlockNoteViewer({ blocks }: Props) {
  const editor = useCreateBlockNote({ initialContent: blocks })
  return (
    <div className="prose prose-sm max-w-none">
      <BlockNoteView editor={editor} theme="light" editable={false} />
    </div>
  )
}
