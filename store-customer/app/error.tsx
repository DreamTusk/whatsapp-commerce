'use client'

import Link from 'next/link'
import { ArrowLeft } from '@deemlol/next-icons'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ reset }: Props) {
  return (
    <main className="min-h-[80vh] flex flex-col items-center justify-center page-x text-center">
      <p className="text-6xl mb-4">😕</p>
      <h1 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h1>
      <p className="text-sm text-gray-400 max-w-xs mb-8">
        We hit an unexpected error. Try again or go back to the home page.
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Home
        </Link>
      </div>
    </main>
  )
}
