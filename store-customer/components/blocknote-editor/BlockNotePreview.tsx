'use client'

const TEXT_COLORS: Record<string, string> = {
  gray: '#6b7280', brown: '#92400e', red: '#dc2626', orange: '#ea580c',
  yellow: '#ca8a04', green: '#16a34a', blue: '#2563eb', purple: '#7c3aed', pink: '#db2777',
}
const BG_COLORS: Record<string, string> = {
  gray: '#f3f4f6', brown: '#fef3c7', red: '#fee2e2', orange: '#ffedd5',
  yellow: '#fef9c3', green: '#dcfce7', blue: '#dbeafe', purple: '#ede9fe', pink: '#fce7f3',
}

interface InlineItem {
  type: string
  text?: string
  styles?: {
    bold?: boolean; italic?: boolean; underline?: boolean
    strikethrough?: boolean; code?: boolean
    textColor?: string; backgroundColor?: string
  }
  href?: string
  content?: InlineItem[]
}

interface Block {
  type: string
  props?: { level?: number; textAlignment?: string }
  content?: InlineItem[]
  children?: Block[]
}

function renderInline(items: InlineItem[]): React.ReactNode {
  return items.map((item, i) => {
    if (item.type === 'link') {
      return (
        <a key={i} href={item.href} className="text-indigo-500 underline" target="_blank" rel="noopener noreferrer">
          {item.content ? renderInline(item.content) : item.href}
        </a>
      )
    }
    const { bold, italic, underline, strikethrough, code, textColor, backgroundColor } = item.styles ?? {}
    const colorStyle: React.CSSProperties = {
      ...(textColor && textColor !== 'default' ? { color: TEXT_COLORS[textColor] ?? textColor } : {}),
      ...(backgroundColor && backgroundColor !== 'default' ? { backgroundColor: BG_COLORS[backgroundColor] ?? backgroundColor, borderRadius: '3px', padding: '0 2px' } : {}),
    }
    let node: React.ReactNode = item.text ?? ''
    if (bold) node = <strong key={i}>{node}</strong>
    if (italic) node = <em key={i}>{node}</em>
    if (underline) node = <u key={i}>{node}</u>
    if (strikethrough) node = <s key={i}>{node}</s>
    if (code) node = <code key={i} className="bg-gray-100 px-1 rounded text-xs font-mono">{node}</code>
    return <span key={i} style={Object.keys(colorStyle).length ? colorStyle : undefined}>{node}</span>
  })
}

function renderBlock(block: Block, i: number): React.ReactNode {
  const inline = block.content ? renderInline(block.content) : null

  switch (block.type) {
    case 'paragraph':
      return <p key={i} className="text-sm text-gray-700 leading-relaxed min-h-[1.25rem]">{inline}</p>

    case 'heading': {
      const level = block.props?.level ?? 1
      const cls = level === 1 ? 'text-xl font-bold text-gray-900'
        : level === 2 ? 'text-lg font-bold text-gray-900'
        : level === 3 ? 'text-base font-semibold text-gray-900'
        : 'text-sm font-semibold text-gray-800'
      return <p key={i} className={cls}>{inline}</p>
    }

    case 'bulletListItem':
      return (
        <li key={i} className="text-sm text-gray-700 leading-relaxed ml-1">
          {inline}
          {block.children?.length ? (
            <ul className="list-disc pl-5 space-y-1 mt-1">
              {block.children.map((c, j) => renderBlock(c, j))}
            </ul>
          ) : null}
        </li>
      )

    case 'numberedListItem':
      return (
        <li key={i} className="text-sm text-gray-700 leading-relaxed ml-1">
          {inline}
          {block.children?.length ? (
            <ol className="list-decimal pl-5 space-y-1 mt-1">
              {block.children.map((c, j) => renderBlock(c, j))}
            </ol>
          ) : null}
        </li>
      )

    case 'table':
      return null

    default:
      return inline ? <p key={i} className="text-sm text-gray-700 leading-relaxed">{inline}</p> : null
  }
}

function renderBlocks(blocks: Block[]): React.ReactNode {
  const nodes: React.ReactNode[] = []
  let i = 0
  while (i < blocks.length) {
    const block = blocks[i]
    if (block.type === 'bulletListItem') {
      const items: Block[] = []
      while (i < blocks.length && blocks[i].type === 'bulletListItem') {
        items.push(blocks[i])
        i++
      }
      nodes.push(
        <ul key={`ul-${i}`} className="list-disc pl-5 space-y-1">
          {items.map((b, j) => renderBlock(b, j))}
        </ul>
      )
    } else if (block.type === 'numberedListItem') {
      const items: Block[] = []
      while (i < blocks.length && blocks[i].type === 'numberedListItem') {
        items.push(blocks[i])
        i++
      }
      nodes.push(
        <ol key={`ol-${i}`} className="list-decimal pl-5 space-y-1">
          {items.map((b, j) => renderBlock(b, j))}
        </ol>
      )
    } else {
      nodes.push(renderBlock(block, i))
      i++
    }
  }
  return nodes
}

interface BlockNotePreviewProps {
  content: string
}

export default function BlockNotePreview({ content }: BlockNotePreviewProps) {
  const blocks: Block[] | null = (() => {
    try {
      const parsed = JSON.parse(content)
      return Array.isArray(parsed) ? parsed : null
    } catch {
      return null
    }
  })()

  if (!blocks) {
    return <p className="text-sm text-gray-600 leading-relaxed">{content}</p>
  }

  return <div className="space-y-2">{renderBlocks(blocks)}</div>
}
