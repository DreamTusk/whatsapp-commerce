'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ReactNode } from 'react'
import { theme } from '@/lib/theme'
import { ChevronLeft, House } from "@deemlol/next-icons"

interface Props {
  title: string
  backHref?: string      // explicit back destination; falls back to router.back()
  actions?: ReactNode    // extra buttons shown between title and home icon
}

export default function PageHeader({ title, backHref, actions }: Props) {
  const router = useRouter()

  return (
    <header className="sticky top-[var(--store-header-h)] z-20 lg:top-0 lg:z-30 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-screen-lg mx-auto px-3 h-14 flex items-center gap-2">
        {/* Back */}
        <button
          onClick={() => backHref ? router.push(backHref) : router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>

        {/* Title */}
        <h1 className="font-bold text-gray-900 flex-1 truncate text-base">{title}</h1>

        {/* Optional action buttons (e.g. Clear all) */}
        {actions && <div className="flex items-center gap-1 flex-shrink-0">{actions}</div>}

        {/* Home — hidden on mobile (bottom nav covers it), visible on desktop */}
        <Link
          href="/"
          className="hidden lg:flex w-9 h-9 items-center justify-center rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0"
          aria-label="Home"
        >
          <House className="w-5 h-5" style={{ color: theme.primary }} />
        </Link>
      </div>
    </header>
  )
}
