'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { clientFetch } from '@/lib/client-api'
import PageHeader from '@/components/page-header'
import type { Order } from '@/types'

type OrderStatus = 'NEW' | 'CONFIRMED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'

const STEPS: { status: OrderStatus; label: string; icon: string }[] = [
  { status: 'NEW', label: 'Order placed', icon: '📋' },
  { status: 'CONFIRMED', label: 'Confirmed', icon: '✅' },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for delivery', icon: '🛵' },
  { status: 'DELIVERED', label: 'Delivered', icon: '🎉' },
]

const STATUS_ORDER: Record<OrderStatus, number> = {
  NEW: 0, CONFIRMED: 1, OUT_FOR_DELIVERY: 2, DELIVERED: 3, CANCELLED: -1,
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function OrderTrackingPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function fetch() {
      try {
        const data = await clientFetch<{ order: Order }>(`/api/storefront/orders/${id}`)
        setOrder(data.order)
      } catch (e: unknown) {
        const err = e as { status?: number }
        if (err.status === 404 || err.status === 401) setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [id])

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#25D366] border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  if (notFound || !order) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
        <p className="text-4xl mb-3">🔍</p>
        <p className="font-bold text-gray-900 mb-1">Order not found</p>
        <Link href="/" className="mt-4 text-sm text-[#25D366] font-medium hover:underline">Go home</Link>
      </main>
    )
  }

  const currentStep = STATUS_ORDER[order.status as OrderStatus]
  const isCancelled = order.status === 'CANCELLED'

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      <PageHeader title={order.order_number} backHref="/orders" />
      <div className="max-w-2xl mx-auto px-4 pt-4">

        {/* Order confirmed banner */}
        <div className={`mt-4 rounded-2xl p-5 text-white ${isCancelled ? 'bg-gray-400' : 'bg-linear-to-br from-[#25D366] to-[#128C7E]'}`}>
          <p className="text-sm opacity-80">Order {isCancelled ? 'cancelled' : 'placed'}</p>
          <p className="text-2xl font-bold mt-1">{order.order_number}</p>
          <p className="text-sm opacity-75 mt-1">{formatDate(order.created_at)}</p>
        </div>

        {/* Tracking steps */}
        {!isCancelled && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mt-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Tracking</p>
            <div className="space-y-4">
              {STEPS.map((step, idx) => {
                const done = currentStep >= idx
                const active = currentStep === idx
                return (
                  <div key={step.status} className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0 transition-all ${
                      done ? 'bg-[#25D366]/10' : 'bg-gray-100'
                    }`}>
                      {done ? step.icon : <span className="w-2.5 h-2.5 rounded-full bg-gray-300 block" />}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${done ? 'text-gray-900' : 'text-gray-400'}`}>
                        {step.label}
                      </p>
                      {active && (
                        <p className="text-xs text-[#25D366] mt-0.5">Current status</p>
                      )}
                    </div>
                    {done && !active && (
                      <span className="text-[#25D366] text-lg">✓</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Items */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mt-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Items ordered</p>
          <div className="space-y-2">
            {order.items.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-700">{item.product_name} <span className="text-gray-400">× {item.quantity}</span></span>
                <span className="font-medium text-gray-900">₹{item.subtotal}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between">
            <span className="font-semibold text-gray-900">Total</span>
            <span className="font-bold text-gray-900">₹{order.total_amount}</span>
          </div>
        </div>

        {/* Delivery info */}
        {order.address && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mt-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Delivering to</p>
            <p className="text-sm text-gray-700">{order.address}</p>
            {order.notes && <p className="text-sm text-gray-400 italic mt-1">{order.notes}</p>}
          </div>
        )}

        {/* Payment */}
        {order.payment && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mt-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Payment</p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{order.payment.method === 'COD' ? 'Cash on delivery' : 'Online payment'}</span>
              <span className={`font-medium ${
                order.payment.status === 'PAID' ? 'text-green-600'
                : order.payment.status === 'FAILED' ? 'text-red-500'
                : 'text-yellow-600'
              }`}>
                {order.payment.status === 'PENDING' ? 'Pay on delivery' : order.payment.status}
              </span>
            </div>
          </div>
        )}

        <Link
          href="/products"
          className="mt-6 block w-full text-center bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold py-3 rounded-xl text-sm transition-colors"
        >
          Continue shopping
        </Link>
      </div>
    </main>
  )
}
