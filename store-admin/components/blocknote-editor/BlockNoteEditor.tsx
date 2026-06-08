'use client'

import { useCreateBlockNote, SuggestionMenuController, getDefaultReactSlashMenuItems, getDefaultReactEmojiPickerItems } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import type { PartialBlock } from '@blocknote/core'
import '@blocknote/mantine/style.css'
import '@blocknote/core/fonts/inter.css'

import "@blocknote/mantine/style.css"

interface BlockNoteEditorProps {
  onChange: (jsonString: string) => void
  initialContent?: string
}

export default function BlockNoteEditor({ onChange, initialContent }: BlockNoteEditorProps) {
  const parsed: PartialBlock[] | undefined = (() => {
    if (!initialContent) return undefined
    try {
      const blocks = JSON.parse(initialContent)
      return Array.isArray(blocks) ? blocks : undefined
    } catch {
      return undefined
    }
  })()

  const editor = useCreateBlockNote({ initialContent: parsed })

  return (
    <div
      className="min-h-80 rounded-lg border border-input bg-white text-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0 overflow-hidden"
      onClick={() => editor.focus()}
    >
      <BlockNoteView
        editor={editor}
        theme="light"
        slashMenu={false}
        onChange={() => onChange(JSON.stringify(editor.document))}
      >

       <SuggestionMenuController 
        triggerCharacter="/"
        getItems={async (query) => {
          const allItems = await getDefaultReactSlashMenuItems(editor)
    
          // ← Filter only what you want
          const allowed = ["Paragraph", "Heading 2", "Heading 3", "Heading 4", "Bullet List", "Numbered List", "Table", "Toggle List", "Divider"]

          return allItems.filter((item) =>
            allowed.includes(item.title) &&
            (query === '' || item.title.toLowerCase().includes(query.toLowerCase()))
          )
        }}
        />

      

        </BlockNoteView>
    </div>
  )
}
