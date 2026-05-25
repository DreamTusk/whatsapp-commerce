'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'
import type { Order } from '@/types'

type OrderStatus = 'NEW' | 'CONFIRMED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'

const STATUS_NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  NEW: 'CONFIRMED',
  CONFIRMED: 'OUT_FOR_DELIVERY',
  OUT_FOR_DELIVERY: 'DELIVERED',
}

const STATUS_NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  NEW: 'Confirm order',
  CONFIRMED: 'Out for delivery',
  OUT_FOR_DELIVERY: 'Mark delivered',
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  NEW: 'bg-yellow-50 text-yellow-700',
  CONFIRMED: 'bg-blue-50 text-blue-700',
  OUT_FOR_DELIVERY: 'bg-purple-50 text-purple-700',
  DELIVERED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

const STATUS_DISPLAY: Record<OrderStatus, string> = {
  NEW: 'New',
  CONFIRMED: 'Confirmed',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  const [isAdvancing, setIsAdvancing] = useState(false)
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)

  const fetchOrder = useCallback(async () => {
    try {
      const res = await api.get(`/api/orders/${id}`)
      setOrder(res.data.order)
    } catch {
      try {
        const res = await api.get('/api/orders')
        const found = (res.data.orders as Order[]).find(o => o.id === id) ?? null
        setOrder(found)
      } catch {
        toast.error('Failed to load order')
      }
    }
  }, [id])

  useEffect(() => {
    fetchOrder().finally(() => setLoading(false))
  }, [fetchOrder])

  async function handleAdvance() {
    if (!order) return
    const nextStatus = STATUS_NEXT[order.status as OrderStatus]
    if (!nextStatus) return
    setIsAdvancing(true)
    try {
      const res = await api.put(`/api/orders/${id}/status`, { status: nextStatus })
      setOrder(res.data.order)
      toast.success(`Order ${STATUS_DISPLAY[nextStatus].toLowerCase()}`)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to update status'
      toast.error(msg)
    } finally {
      setIsAdvancing(false)
    }
  }

  async function handleCancel() {
    if (!order) return
    if (!cancelReason.trim()) { toast.error('Please enter a cancellation reason'); return }
    setIsCancelling(true)
    try {
      const res = await api.put(`/api/orders/${id}/status`, {
        status: 'CANCELLED',
        cancellation_reason: cancelReason.trim(),
      })
      setOrder(res.data.order)
      toast.success('Order cancelled')
      setShowCancelForm(false)
      setCancelReason('')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to cancel order'
      toast.error(msg)
    } finally {
      setIsCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-40 text-gray-400">
        <p className="text-lg font-medium">Order not found</p>
        <button onClick={() => router.back()} className="mt-3 text-base text-[#25D366] hover:underline cursor-pointer">Go back</button>
      </div>
    )
  }

  const status = order.status as OrderStatus
  const canAct = status !== 'DELIVERED' && status !== 'CANCELLED'
  const nextLabel = STATUS_NEXT_LABEL[status]

  const addressParts = [order.door_no, order.street, order.city, order.state, order.pincode, order.country].filter(Boolean)
  const addressLine = addressParts.length > 0 ? addressParts.join(', ') : order.address ?? null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 bg-gray-50">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-base text-gray-500 hover:text-gray-700 mb-3 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Orders
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[26px] font-bold text-gray-900">{order.order_number}</h1>
              <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[status]}`}>
                {STATUS_DISPLAY[status]}
              </span>
            </div>
            <p className="text-base text-gray-400 mt-0.5">{formatDate(order.created_at)}</p>
          </div>
          {canAct && nextLabel && (
            <Button
              className="flex-shrink-0 bg-[#25D366] hover:bg-[#1ebe5d] text-white"
              onClick={handleAdvance}
              disabled={isAdvancing}
            >
              {isAdvancing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isAdvancing ? 'Updating…' : nextLabel}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0 bg-white">
        <div className="flex justify-center px-6 py-8">
          <div className="w-full max-w-xl space-y-6">

            {/* Items */}
            <div className="bg-gray-50 rounded-2xl p-5">
              <div className="space-y-2.5">
                {order.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between text-base">
                    <span className="text-gray-700">{item.product_name} <span className="text-gray-400">× {item.quantity}</span></span>
                    <span className="font-medium text-gray-900">₹{item.subtotal}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between pt-3 mt-3 border-t border-gray-200">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-gray-900 text-lg">₹{order.total_amount}</span>
              </div>
            </div>

            {/* Customer */}
            <div className="space-y-1.5">
              <p className="text-base font-semibold text-gray-900">
                {order.customer.name ?? <span className="text-gray-400 font-normal">Unknown customer</span>}
              </p>
              {order.customer.phone && (
                <p className="text-base text-gray-500">{order.customer.phone}{order.alt_phone ? ` · ${order.alt_phone}` : ''}</p>
              )}
              {addressLine && (
                <p className="text-base text-gray-500">{addressLine}</p>
              )}
              {order.latitude && order.longitude && (
                <a
                  href={`https://www.google.com/maps?q=${order.latitude},${order.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-base text-[#25D366] hover:underline font-medium"
                >
                  <MapPin className="w-4 h-4" /> View on map
                </a>
              )}
              {order.notes && (
                <p className="text-base text-gray-500 italic pt-1">"{order.notes}"</p>
              )}
            </div>

            {/* Payment */}
            {order.payment && (
              <div className="flex items-center gap-4 text-base text-gray-500">
                <span>{order.payment.method === 'COD' ? 'Cash on delivery' : 'Online payment'}</span>
                <span>·</span>
                <span className={
                  order.payment.status === 'PAID' ? 'text-green-600 font-medium'
                  : order.payment.status === 'FAILED' ? 'text-red-500 font-medium'
                  : 'text-yellow-600 font-medium'
                }>
                  {order.payment.status === 'PAID' ? 'Paid' : order.payment.status === 'FAILED' ? 'Failed' : 'Pending'}
                </span>
                {order.payment.paid_at && (
                  <>
                    <span>·</span>
                    <span>{formatDate(order.payment.paid_at)}</span>
                  </>
                )}
              </div>
            )}

            {/* Cancellation reason */}
            {status === 'CANCELLED' && order.cancellation_reason && (
              <div className="bg-red-50 rounded-2xl px-5 py-4">
                <p className="text-sm font-semibold text-red-400 uppercase tracking-wide mb-1">Cancellation reason</p>
                <p className="text-base text-red-700">{order.cancellation_reason}</p>
              </div>
            )}

            {/* Cancel action */}
            {canAct && !showCancelForm && (
              <button
                onClick={() => setShowCancelForm(true)}
                className="text-base text-red-400 hover:text-red-600 cursor-pointer"
              >
                Cancel order
              </button>
            )}

            {showCancelForm && (
              <div className="space-y-3 pt-1">
                <textarea
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="Reason for cancellation…"
                  rows={3}
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
                />
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setShowCancelForm(false); setCancelReason('') }}
                    disabled={isCancelling}
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                    onClick={handleCancel}
                    disabled={isCancelling || !cancelReason.trim()}
                  >
                    {isCancelling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {isCancelling ? 'Cancelling…' : 'Confirm cancel'}
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
