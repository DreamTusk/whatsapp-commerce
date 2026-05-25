'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, ChevronRight } from 'lucide-react'
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
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<OrderStatus | 'ALL'>('ALL')

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

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-6 pt-6 pb-4 bg-gray-50">
        <h1 className="text-[26px] font-bold text-gray-900">Orders</h1>
        <p className="text-base text-gray-500 mt-0.5">{orders.length} orders</p>
      </div>

      <div className="flex-shrink-0 px-6 pb-4 bg-gray-50">
        <div className="flex gap-2 flex-wrap">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-3 py-1.5 rounded-full text-base font-medium transition-colors cursor-pointer ${
                activeTab === tab.value
                  ? 'bg-[#25D366] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 px-6 pt-6 pb-4 flex flex-col">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-xl font-medium">No orders yet</p>
          <p className="text-base mt-1">Orders will appear here once customers start placing them</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full text-base min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide">Order</th>
                <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Customer</th>
                <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Items</th>
                <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide">Total</th>
                <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Payment</th>
                <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map(order => (
                <tr
                  key={order.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{order.order_number}</p>
                    <p className="text-base text-gray-400">{formatDate(order.created_at)}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <p className="text-gray-800">{order.customer.name ?? <span className="text-gray-400">—</span>}</p>
                    <p className="text-base text-gray-400">{order.customer.phone ?? ''}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                    {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">₹{order.total_amount}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {order.payment ? (
                      <div>
                        <p className="text-gray-600 capitalize">{order.payment.method}</p>
                        <p className={`text-base font-medium ${
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
                    <span className={`text-base font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status as OrderStatus]}`}>
                      {STATUS_DISPLAY[order.status as OrderStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="flex-shrink-0 px-4 py-2.5 bg-gray-50 rounded-b-2xl border-t border-gray-100">
            <p className="text-base text-gray-500">{orders.length} orders</p>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
