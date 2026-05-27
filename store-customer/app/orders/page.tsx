'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth'
import { clientFetch } from '@/lib/client-api'
import PageHeader from '@/components/page-header'
import type { Order } from '@/types'

type OrderStatus = 'NEW' | 'CONFIRMED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'

const STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: 'Order placed',
  CONFIRMED: 'Confirmed',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

const STATUS_COLOR: Record<OrderStatus, string> = {
  NEW: 'bg-yellow-50 text-yellow-700',
  CONFIRMED: 'bg-blue-50 text-blue-700',
  OUT_FOR_DELIVERY: 'bg-purple-50 text-purple-700',
  DELIVERED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function itemsSummary(items: Order['items']): string {
  if (items.length === 0) return ''
  const label = items[0].product_name
  return items.length === 1 ? label : `${label} +${items.length - 1} more`
}

export default function OrdersPage() {
  const { isAuthenticated, requireAuth } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const data = await clientFetch<{ orders: Order[] }>('/api/storefront/orders')
      setOrders(data.orders)
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  // Trigger OTP login if not authenticated, then re-fetch
  useEffect(() => {
    if (!isAuthenticated) {
      requireAuth(() => fetchOrders())
    }
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#25D366] border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      <PageHeader title="My Orders" backHref="/" />
      <div className="page-x pt-4">

        {orders.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">📦</p>
            <p className="font-semibold text-gray-800">No orders yet</p>
            <p className="text-sm text-gray-500 mt-1">Your orders will appear here once you place one.</p>
            <Link
              href="/products"
              className="mt-6 inline-block bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">{order.order_number}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.created_at)}</p>
                    <p className="text-sm text-gray-600 mt-2 truncate">{itemsSummary(order.items)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLOR[order.status as OrderStatus]}`}>
                      {STATUS_LABEL[order.status as OrderStatus]}
                    </span>
                    <p className="font-bold text-gray-900">₹{order.total_amount}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
