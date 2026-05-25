'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ReactNode } from 'react'
import { theme } from '@/lib/theme'

interface Props {
  title: string
  backHref?: string      // explicit back destination; falls back to router.back()
  actions?: ReactNode    // extra buttons shown between title and home icon
}

export default function PageHeader({ title, backHref, actions }: Props) {
  const router = useRouter()

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-screen-lg mx-auto px-3 h-14 flex items-center gap-2">
        {/* Back */}
        <button
          onClick={() => backHref ? router.push(backHref) : router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0"
          aria-label="Back"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Title */}
        <h1 className="font-bold text-gray-900 flex-1 truncate text-base">{title}</h1>

        {/* Optional action buttons (e.g. Clear all) */}
        {actions && <div className="flex items-center gap-1 flex-shrink-0">{actions}</div>}

        {/* Home — always visible, essential on desktop where there's no bottom nav */}
        <Link
          href="/"
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0"
          aria-label="Home"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
            style={{ color: theme.primary }}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </Link>
      </div>
    </header>
  )
}
