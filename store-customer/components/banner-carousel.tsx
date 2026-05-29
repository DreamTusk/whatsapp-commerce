'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import type { Banner } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

function getBannerHref(banner: Banner): string {
  if (banner.type === 'product' && banner.product_id) return `/products/${banner.product_id}`
  if (banner.type === 'collection' && banner.collection_id) return `/collection/${banner.collection_id}`
  if (banner.type === 'url' && banner.url) return banner.url
  return '#'
}

function getBannerSrc(imageUrl: string | null): string {
  if (!imageUrl) return ''
  return imageUrl.startsWith('http') ? imageUrl : `${API_URL}${imageUrl}`
}

function BannerImage({ banner }: { banner: Banner }) {
  const src = getBannerSrc(banner.image_url)
  return src ? (
    <img src={src} alt={banner.name} className="w-full h-full object-cover" draggable={false} />
  ) : (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-indigo-100 to-purple-100">
      <span className="text-sm text-gray-400 font-medium">{banner.name}</span>
    </div>
  )
}

export default function BannerCarousel({ banners }: { banners: Banner[] }) {
  const [active, setActive] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startXRef = useRef<number | null>(null)
  const isCarousel = banners.length > 1

  const next = useCallback(() => setActive(i => (i + 1) % banners.length), [banners.length])
  const prev = useCallback(() => setActive(i => (i - 1 + banners.length) % banners.length), [banners.length])

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!isCarousel) return
    timerRef.current = setTimeout(next, 3500)
  }, [next, isCarousel])

  useEffect(() => {
    resetTimer()
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [active, resetTimer])

  function handleDragStart(clientX: number) {
    if (!isCarousel) return
    startXRef.current = clientX
    setDragging(true)
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  function handleDragMove(clientX: number) {
    if (!isCarousel || startXRef.current === null) return
    setDragOffset(clientX - startXRef.current)
  }

  function handleDragEnd(clientX: number) {
    if (!isCarousel || startXRef.current === null) return
    const diff = startXRef.current - clientX
    if (Math.abs(diff) > 50) diff > 0 ? next() : prev()
    setDragging(false)
    setDragOffset(0)
    startXRef.current = null
    resetTimer()
  }

  if (banners.length === 0) return null

  // Single banner — plain image, no carousel
  if (!isCarousel) {
    return (
      <div className="page-x pt-4">
        <Link
          href={getBannerHref(banners[0])}
          className="block w-full h-44 sm:h-60 lg:h-80 rounded-2xl overflow-hidden bg-gray-100"
        >
          <BannerImage banner={banners[0]} />
        </Link>
      </div>
    )
  }

  return (
    <div className="page-x pt-4">
      <div
        className="relative w-full h-44 sm:h-60 lg:h-80 rounded-2xl overflow-hidden bg-gray-100 select-none"
        onTouchStart={e => handleDragStart(e.touches[0].clientX)}
        onTouchMove={e => handleDragMove(e.touches[0].clientX)}
        onTouchEnd={e => handleDragEnd(e.changedTouches[0].clientX)}
        onMouseDown={e => handleDragStart(e.clientX)}
        onMouseMove={e => e.buttons === 1 && handleDragMove(e.clientX)}
        onMouseUp={e => handleDragEnd(e.clientX)}
        onMouseLeave={e => { if (startXRef.current !== null) handleDragEnd(e.clientX) }}
      >
        {/* Each slide positioned by its offset from active */}
        {banners.map((b, i) => {
          const offset = i - active
          return (
            <Link
              key={b.id}
              href={getBannerHref(b)}
              className="absolute inset-0"
              style={{
                transform: `translateX(calc(${offset * 100}% + ${dragOffset}px))`,
                transition: dragging ? 'none' : 'transform 0.35s ease',
              }}
              onClick={e => { if (Math.abs(dragOffset) > 5) e.preventDefault() }}
            >
              <BannerImage banner={b} />
            </Link>
          )
        })}

        {/* Dot indicators */}
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => { setActive(i); resetTimer() }}
              className={`rounded-full transition-all duration-300 ${
                i === active ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
