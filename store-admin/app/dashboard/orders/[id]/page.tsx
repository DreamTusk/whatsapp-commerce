'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, MapPin, CreditCard, Package, MessageSquare, ClipboardList, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
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
  NEW: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  CONFIRMED: 'bg-blue-50 text-blue-700 border border-blue-200',
  OUT_FOR_DELIVERY: 'bg-purple-50 text-purple-700 border border-purple-200',
  DELIVERED: 'bg-green-50 text-green-700 border border-green-200',
  CANCELLED: 'bg-gray-100 text-gray-500 border border-gray-200',
}

const STATUS_DISPLAY: Record<OrderStatus, string> = {
  NEW: 'New',
  CONFIRMED: 'Confirmed',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PAID: 'text-green-600',
  FAILED: 'text-red-500',
  PENDING: 'text-yellow-600',
  REFUNDED: 'text-blue-600',
}

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PAID: 'Paid',
  FAILED: 'Failed',
  PENDING: 'Pending',
  REFUNDED: 'Refunded',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 ${className}`}>
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{children}</p>
  )
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
        <button onClick={() => router.back()} className="mt-3 text-sm text-[#6366f1] hover:underline">Go back</button>
      </div>
    )
  }

  const status = order.status as OrderStatus
  const canAct = status !== 'DELIVERED' && status !== 'CANCELLED'
  const nextLabel = STATUS_NEXT_LABEL[status]


  return (
    <div className="flex flex-col h-full bg-gray-50">

      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-5 pb-4 bg-white border-b border-gray-100">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Orders
        </button>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{order.order_number}</h1>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[status]}`}>
                {STATUS_DISPLAY[status]}
              </span>
              {order.source === 'MANUAL' && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                  Manual
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400">{formatDate(order.created_at)}</p>
          </div>
          {canAct && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                className="border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                onClick={() => setShowCancelForm(true)}
              >
                Cancel order
              </Button>
              {nextLabel && (
                <Button
                  className="bg-[#6366f1] hover:bg-[#4f46e5] text-white"
                  onClick={handleAdvance}
                  disabled={isAdvancing}
                >
                  {isAdvancing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {isAdvancing ? 'Updating…' : nextLabel}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto min-h-0">
        <div className="px-3 py-4 space-y-4">

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Left column: Customer + Delivery Address */}
            <div className="space-y-4">

              {/* Order Detail */}
              <SectionCard>
                <SectionLabel>
                  <span className="flex items-center gap-1.5"><ClipboardList className="w-3.5 h-3.5 inline" /> Order detail</span>
                </SectionLabel>
                <div className="divide-y divide-gray-50">
                  <div className="flex items-center justify-between gap-4 py-3">
                    <span className="text-sm text-gray-400">Order ID</span>
                    <span className="text-base font-semibold text-gray-900">{order.order_number}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3">
                    <span className="text-sm text-gray-400">Ordered on</span>
                    <span className="text-base text-gray-700">{formatDate(order.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3">
                    <span className="text-sm text-gray-400">Status</span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[status]}`}>
                      {STATUS_DISPLAY[status]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3">
                    <span className="text-sm text-gray-400">Type</span>
                    <span className="text-base text-gray-700">
                      {order.source === 'MANUAL' ? 'Manual' : 'WhatsApp'}
                    </span>
                  </div>
                  {order.created_by && (
                    <div className="flex items-center justify-between gap-4 py-3">
                      <span className="text-sm text-gray-400">Created by</span>
                      <span className="text-base text-gray-700">{order.created_by}</span>
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Customer + Delivery Address */}
              <SectionCard>
                <SectionLabel>
                  <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 inline" /> Customer detail</span>
                </SectionLabel>
                <div className="divide-y divide-gray-50">
                  <div className="flex items-center justify-between gap-4 py-3">
                    <span className="text-sm text-gray-400">Name</span>
                    <span className="text-base font-semibold text-gray-900">
                      {order.customer.name ?? <span className="text-gray-400 font-normal italic">No name</span>}
                    </span>
                  </div>
                  {order.customer.phone && (
                    <div className="flex items-center justify-between gap-4 py-3">
                      <span className="text-sm text-gray-400">Phone</span>
                      <span className="text-base text-gray-700">{order.customer.phone}</span>
                    </div>
                  )}
                  {order.alt_phone && (
                    <div className="flex items-center justify-between gap-4 py-3">
                      <span className="text-sm text-gray-400">Alt phone</span>
                      <span className="text-base text-gray-700">{order.alt_phone}</span>
                    </div>
                  )}
                  {order.door_no && (
                    <div className="flex items-start justify-between gap-4 py-3">
                      <span className="text-sm text-gray-400 shrink-0">Door no.</span>
                      <span className="text-base text-gray-700 text-right">{order.door_no}</span>
                    </div>
                  )}
                  {order.street && (
                    <div className="flex items-start justify-between gap-4 py-3">
                      <span className="text-sm text-gray-400 shrink-0">Street</span>
                      <span className="text-base text-gray-700 text-right">{order.street}</span>
                    </div>
                  )}
                  {order.address && (
                    <div className="flex items-start justify-between gap-4 py-3">
                      <span className="text-sm text-gray-400 shrink-0">Address</span>
                      <span className="text-base text-gray-700 text-right">{order.address}</span>
                    </div>
                  )}
                  {order.city && (
                    <div className="flex items-start justify-between gap-4 py-3">
                      <span className="text-sm text-gray-400 shrink-0">City</span>
                      <span className="text-base text-gray-700 text-right">{order.city}</span>
                    </div>
                  )}
                  {order.state && (
                    <div className="flex items-start justify-between gap-4 py-3">
                      <span className="text-sm text-gray-400 shrink-0">State</span>
                      <span className="text-base text-gray-700 text-right">{order.state}</span>
                    </div>
                  )}
                  {order.pincode && (
                    <div className="flex items-start justify-between gap-4 py-3">
                      <span className="text-sm text-gray-400 shrink-0">Pincode</span>
                      <span className="text-base text-gray-700 text-right">{order.pincode}</span>
                    </div>
                  )}
                  {order.country && (
                    <div className="flex items-start justify-between gap-4 py-3">
                      <span className="text-sm text-gray-400 shrink-0">Country</span>
                      <span className="text-base text-gray-700 text-right">{order.country}</span>
                    </div>
                  )}
                  {order.latitude && order.longitude && (
                    <div className="py-3">
                      <a
                        href={`https://www.google.com/maps?q=${order.latitude},${order.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-[#6366f1] hover:underline font-medium"
                      >
                        <MapPin className="w-3.5 h-3.5" /> View on map
                      </a>
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>

            {/* Right column: Order Items + Payment */}
            <div className="space-y-4">

              {/* Order Items */}
              <SectionCard>
                <div className="flex items-center justify-between mb-3">
                  <SectionLabel>
                    <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 inline" /> Order items</span>
                  </SectionLabel>
                  <span className="text-xs font-semibold text-gray-400 -mt-3">{order.items.length} {order.items.length === 1 ? 'item' : 'items'}</span>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {order.items.map((item, i) => (
                    <div key={item.id}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-6 h-6 flex-shrink-0 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold flex items-center justify-center">
                            {item.quantity}
                          </span>
                          <span className="text-sm text-gray-800 truncate">{item.product_name}</span>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <span className="text-sm font-semibold text-gray-900">₹{item.subtotal}</span>
                          {item.quantity > 1 && (
                            <p className="text-xs text-gray-400">₹{item.price} each</p>
                          )}
                        </div>
                      </div>
                      {i < order.items.length - 1 && <div className="mt-3 border-t border-gray-50" />}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <span className="text-sm font-semibold text-gray-700">Total</span>
                  <span className="text-xl font-bold text-gray-900">₹{order.total_amount}</span>
                </div>
              </SectionCard>

              {/* Payment */}
              {order.payment && (
                <SectionCard>
                  <SectionLabel>
                    <span className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 inline" /> Payment</span>
                  </SectionLabel>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {order.payment.method === 'COD' ? 'Cash on delivery' : 'Online payment'}
                    </p>
                    <p className={`text-sm font-semibold ${PAYMENT_STATUS_COLORS[order.payment.status] ?? 'text-gray-500'}`}>
                      {PAYMENT_STATUS_LABEL[order.payment.status] ?? order.payment.status}
                    </p>
                    {order.payment.paid_at && (
                      <p className="text-xs text-gray-400 pt-1">{formatDate(order.payment.paid_at)}</p>
                    )}
                  </div>
                </SectionCard>
              )}
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <SectionCard>
              <SectionLabel>
                <span className="flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5 inline" /> Notes</span>
              </SectionLabel>
              <p className="text-sm text-gray-600 italic">"{order.notes}"</p>
            </SectionCard>
          )}

          {/* Cancellation reason */}
          {status === 'CANCELLED' && order.cancellation_reason && (
            <SectionCard className="border-red-100 bg-red-50">
              <SectionLabel>Cancellation reason</SectionLabel>
              <p className="text-sm text-red-700">{order.cancellation_reason}</p>
              {order.cancelled_by && (
                <p className="text-xs text-red-400 mt-1">Cancelled by {order.cancelled_by.toLowerCase()}</p>
              )}
            </SectionCard>
          )}

          <div className="pb-4" />
        </div>
      </div>

      {/* Cancel order dialog */}
      <Dialog
        open={showCancelForm}
        onOpenChange={(open) => { if (!open) { setShowCancelForm(false); setCancelReason('') } }}
        dismissible={false}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Cancel order</DialogTitle>
            <DialogDescription>Please provide a reason for cancellation.</DialogDescription>
          </DialogHeader>
          <textarea
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
            placeholder="Reason for cancellation…"
            rows={4}
            autoFocus
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 resize-none bg-white"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowCancelForm(false); setCancelReason('') }}
              disabled={isCancelling}
            >
              Back
            </Button>
            <Button
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={handleCancel}
              disabled={isCancelling || !cancelReason.trim()}
            >
              {isCancelling && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {isCancelling ? 'Cancelling…' : 'Confirm cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
