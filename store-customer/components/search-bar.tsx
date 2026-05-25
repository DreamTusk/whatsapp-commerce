'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (q) {
      router.push(`/products?search=${encodeURIComponent(q)}`)
    } else {
      router.push('/products')
    }
    inputRef.current?.blur()
  }

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex items-center">
      <div className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search products..."
          className="w-full h-9 pl-3 pr-10 rounded-lg bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
        />
        <button
          type="submit"
          className="absolute right-0 top-0 h-9 w-9 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="Search"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
        </button>
      </div>
    </form>
  )
}
