'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2, Eye, ChevronRight, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import api from '@/lib/api'
import type { Order } from '@/types'

type OrderStatus = 'NEW' | 'CONFIRMED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'

const STATUS_TABS: { label: string; value: OrderStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'New', value: 'NEW' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Out for delivery', value: 'OUT_FOR_DELIVERY' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
]

const STATUS_NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  NEW: 'CONFIRMED',
  CONFIRMED: 'OUT_FOR_DELIVERY',
  OUT_FOR_DELIVERY: 'DELIVERED',
}

const STATUS_NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  NEW: 'Confirm order',
  CONFIRMED: 'Mark out for delivery',
  OUT_FOR_DELIVERY: 'Mark delivered',
}

const STATUS_NEXT_DESC: Partial<Record<OrderStatus, string>> = {
  NEW: 'This will accept the order and notify the customer it has been confirmed.',
  CONFIRMED: 'This will mark the order as out for delivery.',
  OUT_FOR_DELIVERY: 'This will mark the order as successfully delivered.',
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

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<OrderStatus | 'ALL'>('ALL')

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  // Advance status confirm modal
  const [advanceTarget, setAdvanceTarget] = useState<{ order: Order; nextStatus: OrderStatus } | null>(null)
  const [isAdvancing, setIsAdvancing] = useState(false)

  // Cancel confirm modal
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)

  useEffect(() => { fetchOrders(activeTab) }, [activeTab])

  async function fetchOrders(status: OrderStatus | 'ALL') {
    setLoading(true)
    try {
      const params = status !== 'ALL' ? `?status=${status}` : ''
      const res = await api.get(`/api/orders${params}`)
      setOrders(res.data.orders)
    } catch {
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  function applyUpdate(updated: Order) {
    setOrders(prev => prev.map(o => o.id === updated.id ? updated : o))
    setSelectedOrder(updated)
  }

  async function confirmAdvance() {
    if (!advanceTarget) return
    setIsAdvancing(true)
    try {
      const res = await api.put(`/api/orders/${advanceTarget.order.id}/status`, { status: advanceTarget.nextStatus })
      applyUpdate(res.data.order)
      toast.success(`Order ${STATUS_DISPLAY[advanceTarget.nextStatus].toLowerCase()}`)
      setAdvanceTarget(null)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to update status'
      toast.error(msg)
    } finally {
      setIsAdvancing(false)
    }
  }

  async function confirmCancel() {
    if (!cancelTarget) return
    if (!cancelReason.trim()) { toast.error('Please enter a cancellation reason'); return }
    setIsCancelling(true)
    try {
      const res = await api.put(`/api/orders/${cancelTarget.id}/status`, {
        status: 'CANCELLED',
        cancellation_reason: cancelReason.trim(),
      })
      applyUpdate(res.data.order)
      toast.success('Order cancelled')
      setCancelTarget(null)
      setCancelReason('')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to cancel order'
      toast.error(msg)
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500 mt-0.5">{orders.length} orders</p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeTab === tab.value
                ? 'bg-[#25D366] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">No orders yet</p>
          <p className="text-sm mt-1">Orders will appear here once customers start placing them</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Order</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Items</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Total</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Payment</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map(order => (
                <tr
                  key={order.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedOrder(order)}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{order.order_number}</p>
                    <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <p className="text-gray-800">{order.customer.name ?? <span className="text-gray-400">—</span>}</p>
                    <p className="text-xs text-gray-400">{order.customer.phone ?? ''}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                    {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">₹{order.total_amount}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {order.payment ? (
                      <div>
                        <p className="text-gray-600 capitalize">{order.payment.method}</p>
                        <p className={`text-xs font-medium ${
                          order.payment.status === 'PAID' ? 'text-green-600'
                          : order.payment.status === 'FAILED' ? 'text-red-500'
                          : 'text-yellow-600'
                        }`}>
                          {order.payment.status}
                        </p>
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status as OrderStatus]}`}>
                      {STATUS_DISPLAY[order.status as OrderStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Eye className="w-4 h-4 text-gray-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Order Detail Modal ── */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => { if (!open) setSelectedOrder(null) }} disablePointerDismissal>
        <DialogContent showCloseButton={false} className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-6">
          {selectedOrder && (
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedOrder.order_number}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(selectedOrder.created_at)}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[selectedOrder.status as OrderStatus]}`}>
                  {STATUS_DISPLAY[selectedOrder.status as OrderStatus]}
                </span>
              </div>

              {/* Customer info */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Customer</p>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900">{selectedOrder.customer.name ?? <span className="text-gray-400">Name not provided</span>}</p>
                  {selectedOrder.customer.phone && (
                    <p className="text-xs text-gray-500">
                      <span className="font-medium text-gray-600">Phone:</span> {selectedOrder.customer.phone}
                    </p>
                  )}
                  {selectedOrder.alt_phone && (
                    <p className="text-xs text-gray-500">
                      <span className="font-medium text-gray-600">Alt. phone:</span> {selectedOrder.alt_phone}
                    </p>
                  )}
                </div>

                {(selectedOrder.door_no || selectedOrder.street || selectedOrder.city || selectedOrder.state || selectedOrder.pincode || selectedOrder.country) ? (
                  <div className="border-t border-gray-200 pt-3 space-y-1">
                    <p className="text-xs font-medium text-gray-500 mb-1.5">Delivery address</p>
                    {selectedOrder.door_no && (
                      <p className="text-xs text-gray-500"><span className="font-medium text-gray-600">Door/Flat:</span> {selectedOrder.door_no}</p>
                    )}
                    {selectedOrder.street && (
                      <p className="text-xs text-gray-500"><span className="font-medium text-gray-600">Street:</span> {selectedOrder.street}</p>
                    )}
                    {selectedOrder.city && (
                      <p className="text-xs text-gray-500"><span className="font-medium text-gray-600">City:</span> {selectedOrder.city}</p>
                    )}
                    {selectedOrder.state && (
                      <p className="text-xs text-gray-500"><span className="font-medium text-gray-600">State:</span> {selectedOrder.state}</p>
                    )}
                    {selectedOrder.pincode && (
                      <p className="text-xs text-gray-500"><span className="font-medium text-gray-600">Pincode:</span> {selectedOrder.pincode}</p>
                    )}
                    {selectedOrder.country && (
                      <p className="text-xs text-gray-500"><span className="font-medium text-gray-600">Country:</span> {selectedOrder.country}</p>
                    )}
                  </div>
                ) : selectedOrder.address ? (
                  <div className="border-t border-gray-200 pt-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">Delivery address</p>
                    <p className="text-sm text-gray-600">{selectedOrder.address}</p>
                  </div>
                ) : null}

                {selectedOrder.notes && (
                  <p className="text-xs text-gray-500 border-t border-gray-200 pt-2 italic">
                    <span className="font-medium not-italic text-gray-600">Note:</span> {selectedOrder.notes}
                  </p>
                )}

                {selectedOrder.latitude && selectedOrder.longitude && (
                  <a
                    href={`https://www.google.com/maps?q=${selectedOrder.latitude},${selectedOrder.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#25D366] hover:underline font-medium"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    View on map
                  </a>
                )}
              </div>

              {/* Items */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Items</p>
                <div className="space-y-2">
                  {selectedOrder.items.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-gray-800">{item.product_name}</span>
                        <span className="text-gray-400 ml-2">× {item.quantity}</span>
                      </div>
                      <span className="font-medium text-gray-900">₹{item.subtotal}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-bold text-gray-900">₹{selectedOrder.total_amount}</span>
                </div>
              </div>

              {/* Payment */}
              {selectedOrder.payment && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Payment</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 capitalize">{selectedOrder.payment.method}</span>
                    <span className={`font-medium ${
                      selectedOrder.payment.status === 'PAID' ? 'text-green-600'
                      : selectedOrder.payment.status === 'FAILED' ? 'text-red-500'
                      : 'text-yellow-600'
                    }`}>
                      {selectedOrder.payment.status}
                    </span>
                  </div>
                  {selectedOrder.payment.paid_at && (
                    <p className="text-xs text-gray-400 mt-1">Paid at {formatDate(selectedOrder.payment.paid_at)}</p>
                  )}
                </div>
              )}

              {/* Cancellation reason */}
              {selectedOrder.status === 'CANCELLED' && selectedOrder.cancellation_reason && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                  <p className="text-xs font-medium text-red-500 uppercase tracking-wide mb-1">Cancellation reason</p>
                  <p className="text-sm text-red-700">{selectedOrder.cancellation_reason}</p>
                </div>
              )}

              {/* Actions */}
              {selectedOrder.status !== 'DELIVERED' && selectedOrder.status !== 'CANCELLED' && (
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</p>

                  {STATUS_NEXT[selectedOrder.status as OrderStatus] && (
                    <div className="flex items-start gap-3 p-3 bg-[#25D366]/5 border border-[#25D366]/20 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{STATUS_NEXT_LABEL[selectedOrder.status as OrderStatus]}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{STATUS_NEXT_DESC[selectedOrder.status as OrderStatus]}</p>
                      </div>
                      <Button
                        className="flex-shrink-0 bg-[#25D366] hover:bg-[#1ebe5d] text-white gap-1.5 h-9 px-4 text-xs"
                        onClick={() => setAdvanceTarget({ order: selectedOrder, nextStatus: STATUS_NEXT[selectedOrder.status as OrderStatus]! })}
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                        Proceed
                      </Button>
                    </div>
                  )}

                  <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-red-600">Cancel order</p>
                      <p className="text-xs text-red-400 mt-0.5">Permanently cancel this order. A reason is required.</p>
                    </div>
                    <Button
                      variant="outline"
                      className="flex-shrink-0 border-red-200 text-red-500 hover:bg-red-100 hover:border-red-300 h-9 px-4 text-xs"
                      onClick={() => { setCancelTarget(selectedOrder); setCancelReason('') }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <Button variant="outline" className="w-full" onClick={() => setSelectedOrder(null)}>
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Advance Status Confirm Modal ── */}
      <Dialog open={!!advanceTarget} onOpenChange={(open) => { if (!open) setAdvanceTarget(null) }} disablePointerDismissal>
        <DialogContent showCloseButton={false} className="w-full max-w-sm bg-white rounded-2xl p-6">
          {advanceTarget && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#25D366]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ChevronRight className="w-5 h-5 text-[#25D366]" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{STATUS_NEXT_LABEL[advanceTarget.order.status as OrderStatus]}</h3>
                  <p className="text-xs text-gray-400">{advanceTarget.order.order_number}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">{STATUS_NEXT_DESC[advanceTarget.order.status as OrderStatus]}</p>
              <p className="text-sm text-gray-600">
                Status will change: <span className="font-medium">{STATUS_DISPLAY[advanceTarget.order.status as OrderStatus]}</span>
                {' → '}
                <span className="font-medium text-[#25D366]">{STATUS_DISPLAY[advanceTarget.nextStatus]}</span>
              </p>
              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setAdvanceTarget(null)} disabled={isAdvancing}>
                  Go back
                </Button>
                <Button className="flex-1 bg-[#25D366] hover:bg-[#1ebe5d] text-white" onClick={confirmAdvance} disabled={isAdvancing}>
                  {isAdvancing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {isAdvancing ? 'Updating…' : 'Confirm'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Cancel Order Modal ── */}
      <Dialog open={!!cancelTarget} onOpenChange={(open) => { if (!open) { setCancelTarget(null); setCancelReason('') } }} disablePointerDismissal>
        <DialogContent showCloseButton={false} className="w-full max-w-sm bg-white rounded-2xl p-6">
          {cancelTarget && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Cancel order?</h3>
                  <p className="text-xs text-gray-400">{cancelTarget.order_number}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                This will permanently cancel the order. Please provide a reason so the customer understands why.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Reason for cancellation <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="e.g. Item out of stock, delivery not possible to this area…"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-transparent resize-none"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setCancelTarget(null); setCancelReason('') }}
                  disabled={isCancelling}
                >
                  Go back
                </Button>
                <Button
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                  onClick={confirmCancel}
                  disabled={isCancelling || !cancelReason.trim()}
                >
                  {isCancelling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {isCancelling ? 'Cancelling…' : 'Cancel order'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
