'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { clientFetch } from '@/lib/client-api'
import { Search, X, ChevronRight } from "@deemlol/next-icons"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3010'

interface SearchProduct {
  id: string
  name: string
  image_url: string | null
  selling_price: number
  in_stock: boolean
  category: { id: string; name: string } | null
  brand: { id: string; name: string } | null
}

interface SearchCategory {
  id: string
  name: string
  image_url: string | null
}

interface SearchResults {
  products: SearchProduct[]
  categories: SearchCategory[]
}

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchResults = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults(null)
      setOpen(false)
      return
    }
    setLoading(true)
    try {
      const data = await clientFetch<SearchResults>(
        `/api/storefront/search?q=${encodeURIComponent(q.trim())}`
      )
      setResults(data)
      setOpen(true)
    } catch {
      setResults(null)
    } finally {
      setLoading(false)
    }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.trim().length < 2) {
      setResults(null)
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(() => fetchResults(val), 300)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    close()
    if (q) {
      router.push(`/products?search=${encodeURIComponent(q)}`)
    } else {
      router.push('/products')
    }
    inputRef.current?.blur()
  }

  function clear() {
    setQuery('')
    setResults(null)
    setOpen(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }

  function close() {
    setOpen(false)
    inputRef.current?.blur()
  }

  // Close dropdown on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const hasResults = results && (results.products.length > 0 || results.categories.length > 0)

  return (
    <div ref={containerRef} className="relative w-full sm:max-w-[900px]">
      <form onSubmit={handleSubmit}>
        <div className="h-[50px] flex items-center justify-between px-[14px] py-[8px] rounded-[8px] border border-gray-200 bg-white gap-3">
          {loading ? (
            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin flex-shrink-0 spinner-primary" />
          ) : (
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onFocus={() => { if (results) setOpen(true) }}
            placeholder="Search products, brands..."
            className="flex-1 h-full bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={clear}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-[54px] left-0 right-0 z-50 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden">

          {!hasResults ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto">

              {/* Categories section */}
              {results.categories.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Categories</p>
                  {results.categories.map(cat => (
                    <Link
                      key={cat.id}
                      href={`/products?category=${cat.id}`}
                      onClick={close}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {cat.image_url ? (
                          <img
                            src={cat.image_url.startsWith('http') ? cat.image_url : `${API_URL}${cat.image_url}`}
                            alt={cat.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm">🛍️</span>
                        )}
                      </div>
                      <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 ml-auto flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              )}

              {/* Products section */}
              {results.products.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Products</p>
                  {results.products.map(product => (
                    <Link
                      key={product.id}
                      href={`/products/${product.id}`}
                      onClick={close}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                        {product.image_url ? (
                          <img
                            src={product.image_url.startsWith('http') ? product.image_url : `${API_URL}${product.image_url}`}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">🛍️</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {product.brand ? product.brand.name : product.category?.name ?? ''}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm font-semibold text-gray-900">₹{product.selling_price}</p>
                        {!product.in_stock && (
                          <p className="text-[10px] text-red-400 font-medium">Out of stock</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* See all results */}
              <button
                onClick={handleSubmit as any}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-t border-gray-100 text-sm font-semibold transition-colors c-primary hover:opacity-80"
              >
                See all results for &ldquo;{query}&rdquo;
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
