import React from 'react'
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { clientFetch } from '@/lib/client-api'
import PageHeader from '@/components/page-header'
import type { Order } from '@/types'

type OrderStatus = 'NEW' | 'CONFIRMED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'NEW',              label: 'Order placed' },
  { status: 'CONFIRMED',        label: 'Confirmed' },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for delivery' },
  { status: 'DELIVERED',        label: 'Delivered' },
]

const STATUS_ORDER: Record<OrderStatus, number> = {
  NEW: 0, CONFIRMED: 1, OUT_FOR_DELIVERY: 2, DELIVERED: 3, CANCELLED: -1,
}

const STATUS_LABEL: Record<string, string> = {
  NEW: 'Order placed', CONFIRMED: 'Confirmed',
  OUT_FOR_DELIVERY: 'Out for delivery', DELIVERED: 'Delivered', CANCELLED: 'Cancelled',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function OrderDetailClient() {
    const { id } = useParams<{ id: string }>()
    const [order, setOrder] = useState<Order | null>(null)
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)
    const [cancelling, setCancelling] = useState(false)
    const [showCancelSheet, setShowCancelSheet] = useState(false)
    const [selectedReason, setSelectedReason] = useState('')
    const [otherReason, setOtherReason] = useState('')
  
    useEffect(() => {
      async function load() {
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
      load()
    }, [id])
  
    if (loading) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )
    }
  
    if (notFound || !order) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
          <p className="text-5xl mb-4">📦</p>
          <p className="font-bold text-gray-900 text-lg mb-1">Order not found</p>
          <p className="text-sm text-gray-500 mb-6">This order doesn&apos;t exist or belongs to another account.</p>
          <Link href="/" className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors">Go home</Link>
        </div>
      )
    }
  
    const currentStep = STATUS_ORDER[order.status as OrderStatus]
    const isCancelled = order.status === 'CANCELLED'
    const canCancel = order.status === 'NEW' || order.status === 'CONFIRMED'
  
    async function cancelOrder() {
      const reason = selectedReason === 'Other' ? otherReason.trim() : selectedReason
      setCancelling(true)
      try {
        const data = await clientFetch<{ order: Order }>(`/api/storefront/orders/${id}/cancel`, {
          method: 'PATCH',
          body: JSON.stringify({ reason: reason || null }),
        })
        setOrder(data.order)
        setShowCancelSheet(false)
      } catch {
        alert('Could not cancel order. Please try again.')
      } finally {
        setCancelling(false)
      }
    }
  
    // ── Vertical status tracker (desktop left panel) ──────────────────────────
    const verticalTracker = (
      <div className="flex flex-col flex-1 p-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-6">Order tracking</p>
        {isCancelled ? (
          <div className="p-4 bg-red-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-red-600 text-sm">Order cancelled</p>
                <p className="text-xs text-red-400 mt-0.5">
                  {order.cancelled_by === 'CUSTOMER' ? 'Cancelled by you' : order.cancelled_by === 'STORE' ? 'Cancelled by store' : 'This order has been cancelled'}
                </p>
              </div>
            </div>
            {order.cancellation_reason && (
              <p className="mt-2.5 text-xs text-red-500 bg-red-100 rounded-lg px-3 py-2 leading-relaxed">
                <span className="font-semibold">Reason: </span>{order.cancellation_reason}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            {STEPS.map((step, idx) => {
              const done = currentStep >= idx
              const active = currentStep === idx
              const isLast = idx === STEPS.length - 1
              return (
                <div key={step.status} className="flex gap-4">
                  {/* Dot + line */}
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      done ? 'bg-indigo-500 border-indigo-500' : 'bg-white border-gray-200'
                    } ${active ? 'ring-4 ring-indigo-100' : ''}`}>
                      {done && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    {!isLast && (
                      <div className={`w-0.5 flex-1 my-1 min-h-[32px] rounded-full ${done && currentStep > idx ? 'bg-indigo-400' : 'bg-gray-150'}`}
                        style={{ backgroundColor: done && currentStep > idx ? '#6366f1' : '#e5e7eb' }} />
                    )}
                  </div>
                  {/* Label */}
                  <div className={`pb-6 ${isLast ? 'pb-0' : ''}`}>
                    <p className={`text-sm font-semibold leading-tight mt-1 ${done ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
                    {active && <p className="text-xs text-indigo-500 mt-0.5">Current status</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  
    // ── Right panel content ────────────────────────────────────────────────────
    const rightContent = (
      <div className="flex flex-col flex-1">
        {/* Order summary header */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Order number</p>
              <p className="font-bold text-gray-900 text-lg leading-tight">{order.order_number}</p>
              <p className="text-xs text-gray-400 mt-1">{formatDate(order.created_at)}</p>
            </div>
            <span className={`mt-1 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0 ${
              isCancelled                    ? 'bg-red-50 text-red-500'
              : order.status === 'DELIVERED' ? 'bg-green-50 text-green-600'
              :                                'bg-indigo-50 text-indigo-600'
            }`}>
              {STATUS_LABEL[order.status] ?? order.status}
            </span>
          </div>
        </div>
  
        {/* Items */}
        <div className="border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 pt-4 pb-3">Items ordered</p>
          <div className="divide-y divide-gray-50">
            {order.items.map(item => (
              <div key={item.id} className="flex items-center gap-3 px-6 py-3">
                <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
                  {item.image_url
                    ? <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                    : <span className="text-sm font-bold text-gray-400">{item.product_name.charAt(0).toUpperCase()}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.product_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Qty {item.quantity} × ₹{item.price}</p>
                </div>
                <p className="text-sm font-semibold text-gray-900 flex-shrink-0">₹{item.subtotal}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between px-6 py-3" style={{ backgroundColor: '#F8F9FA' }}>
            <p className="text-sm font-semibold text-gray-600">Total</p>
            <p className="text-base font-bold text-gray-900">₹{order.total_amount}</p>
          </div>
        </div>
  
        {/* Address */}
        {order.address && (
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Delivery address</p>
            <div className="flex items-start gap-3">
              <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div>
                <p className="text-sm text-gray-700 leading-relaxed">{order.address}</p>
                {order.notes && <p className="text-xs text-gray-400 italic mt-1">{order.notes}</p>}
              </div>
            </div>
          </div>
        )}
  
        {/* Payment */}
        {order.payment && (
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Payment</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <p className="text-sm text-gray-700">{order.payment.method === 'COD' ? 'Cash on delivery' : 'Online payment'}</p>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                order.payment.status === 'PAID'   ? 'bg-green-50 text-green-600' :
                order.payment.status === 'FAILED' ? 'bg-red-50 text-red-500' :
                                                    'bg-amber-50 text-amber-600'
              }`}>
                {order.payment.status === 'PENDING' ? 'Pay on delivery' : order.payment.status}
              </span>
            </div>
          </div>
        )}
  
        {/* Actions — pushed to bottom */}
        <div className="mt-auto px-6 py-5 flex flex-col gap-2.5">
          <Link
            href="/products"
            className="block w-full text-center bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors"
          >
            Continue shopping
          </Link>
          {canCancel && (
            <button
              onClick={() => { setSelectedReason(''); setOtherReason(''); setShowCancelSheet(true) }}
              className="w-full text-center bg-red-50 hover:bg-red-100 text-red-500 font-semibold py-3.5 rounded-xl text-sm transition-colors"
            >
              Cancel order
            </button>
          )}
        </div>
      </div>
    )
  
    return (
      <>
        {/* Mobile header */}
        <div className="lg:hidden">
          <PageHeader title={`Order ${order.order_number}`} />
        </div>
  
        {/* ── Mobile layout: single column ── */}
        <div className="lg:hidden page-x py-5 space-y-4">
          {/* Summary */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Order number</p>
                <p className="font-bold text-gray-900 text-lg">{order.order_number}</p>
                <p className="text-xs text-gray-400 mt-1">{formatDate(order.created_at)}</p>
              </div>
              <span className={`mt-1 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0 ${
                isCancelled ? 'bg-red-50 text-red-500' : order.status === 'DELIVERED' ? 'bg-green-50 text-green-600' : 'bg-indigo-50 text-indigo-600'
              }`}>{STATUS_LABEL[order.status] ?? order.status}</span>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-500">Order total</p>
              <p className="text-xl font-bold text-gray-900">₹{order.total_amount}</p>
            </div>
          </div>
  
          {/* Mobile horizontal tracker */}
          {!isCancelled ? (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-6">Tracking</p>
              <div className="relative flex justify-between">
                <div className="absolute top-3.5 left-[12.5%] right-[12.5%] h-0.5 bg-gray-100" />
                <div className="absolute top-3.5 left-[12.5%] h-0.5 bg-indigo-500 transition-all duration-500"
                  style={{ width: currentStep === 0 ? '0%' : `${(currentStep / (STEPS.length - 1)) * 75}%` }} />
                {STEPS.map((step, idx) => {
                  const done = currentStep >= idx
                  const active = currentStep === idx
                  return (
                    <div key={step.status} className="relative flex flex-col items-center gap-2 w-1/4">
                      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${done ? 'bg-indigo-500 border-indigo-500' : 'bg-white border-gray-200'} ${active ? 'ring-4 ring-indigo-100' : ''}`}>
                        {done && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <p className={`text-center leading-tight text-[11px] font-medium ${done ? 'text-indigo-600' : 'text-gray-400'}`}>{step.label}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </div>
                <div>
                  <p className="font-semibold text-red-600">Order cancelled</p>
                  <p className="text-xs text-red-400 mt-0.5">
                    {order.cancelled_by === 'CUSTOMER' ? 'Cancelled by you' : order.cancelled_by === 'STORE' ? 'Cancelled by store' : 'This order has been cancelled'}
                  </p>
                </div>
              </div>
              {order.cancellation_reason && (
                <p className="mt-3 text-xs text-red-500 bg-red-100 rounded-xl px-3 py-2 leading-relaxed">
                  <span className="font-semibold">Reason: </span>{order.cancellation_reason}
                </p>
              )}
            </div>
          )}
  
          {/* Mobile items */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 pt-4 pb-3 border-b border-gray-100">Items ordered</p>
            <div className="divide-y divide-gray-50">
              {order.items.map(item => (
                <div key={item.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
                    {item.image_url ? <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-gray-400">{item.product_name.charAt(0).toUpperCase()}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.product_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Qty {item.quantity} × ₹{item.price}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 flex-shrink-0">₹{item.subtotal}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100" style={{ backgroundColor: '#F8F9FA' }}>
              <p className="text-sm font-semibold text-gray-700">Total</p>
              <p className="text-base font-bold text-gray-900">₹{order.total_amount}</p>
            </div>
          </div>
  
          {/* Mobile address */}
          {order.address && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Delivery address</p>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <div>
                  <p className="text-sm text-gray-700 leading-relaxed">{order.address}</p>
                  {order.notes && <p className="text-xs text-gray-400 italic mt-1">{order.notes}</p>}
                </div>
              </div>
            </div>
          )}
  
          {/* Mobile payment */}
          {order.payment && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Payment</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                  </div>
                  <p className="text-sm text-gray-700">{order.payment.method === 'COD' ? 'Cash on delivery' : 'Online payment'}</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${order.payment.status === 'PAID' ? 'bg-green-50 text-green-600' : order.payment.status === 'FAILED' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600'}`}>
                  {order.payment.status === 'PENDING' ? 'Pay on delivery' : order.payment.status}
                </span>
              </div>
            </div>
          )}
  
          <Link href="/products" className="block w-full text-center bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors">
            Continue shopping
          </Link>
          {canCancel && (
            <button
              onClick={() => { setSelectedReason(''); setOtherReason(''); setShowCancelSheet(true) }}
              className="w-full text-center bg-red-50 hover:bg-red-100 text-red-500 font-semibold py-3.5 rounded-xl text-sm transition-colors"
            >
              Cancel order
            </button>
          )}
        </div>
  
        {/* ── Desktop layout: two columns ── */}
        <div className="hidden lg:flex page-x gap-6 py-8 items-stretch">
          {/* Left: vertical tracker */}
          <div className="w-64 flex-shrink-0 flex flex-col rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ backgroundColor: '#F8F9FA' }}>
            {verticalTracker}
          </div>
          {/* Right: order details */}
          <div className="flex-1 min-w-0 flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {rightContent}
          </div>
        </div>
  
        {/* ── Cancel reason sheet ── */}
        {showCancelSheet && (
          <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowCancelSheet(false)} />
            <div className="relative w-full lg:max-w-md bg-white rounded-t-3xl lg:rounded-2xl p-6 shadow-xl">
              <h3 className="font-bold text-gray-900 text-base mb-1">Cancel order</h3>
              <p className="text-sm text-gray-500 mb-5">Please select a reason for cancellation</p>
              <div className="space-y-2 mb-4">
                {['Changed my mind', 'Ordered by mistake', 'Found a better price', 'Delivery taking too long', 'Other'].map(r => (
                  <button
                    key={r}
                    onClick={() => setSelectedReason(r)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium text-left transition-colors ${
                      selectedReason === r ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-100 text-gray-700 hover:border-gray-200'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selectedReason === r ? 'border-red-500 bg-red-500' : 'border-gray-300'}`}>
                      {selectedReason === r && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    {r}
                  </button>
                ))}
              </div>
              {selectedReason === 'Other' && (
                <textarea
                  value={otherReason}
                  onChange={e => setOtherReason(e.target.value)}
                  placeholder="Tell us more…"
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-100 transition-colors mb-4 resize-none"
                />
              )}
              <div className="flex gap-3 mt-2">
                <button onClick={() => setShowCancelSheet(false)} className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Go back
                </button>
                <button
                  onClick={cancelOrder}
                  disabled={cancelling || !selectedReason || (selectedReason === 'Other' && !otherReason.trim())}
                  className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {cancelling ? 'Cancelling…' : 'Confirm cancel'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }
  