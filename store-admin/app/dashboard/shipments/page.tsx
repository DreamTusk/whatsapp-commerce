'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader, ExternalLink } from '@deemlol/next-icons'
import api from '@/lib/api'

interface ShipmentListItem {
  id: string
  carrier_name: string
  tracking_id: string
  tracking_url: string | null
  created_at: string
  order: {
    id: string
    order_number: string
    status: string
    total_amount: number
    customer: { name: string | null; phone: string | null }
  }
}

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  CONFIRMED: 'bg-blue-50 text-blue-700 border border-blue-200',
  OUT_FOR_DELIVERY: 'bg-purple-50 text-purple-700 border border-purple-200',
  DELIVERED: 'bg-green-50 text-green-700 border border-green-200',
  CANCELLED: 'bg-gray-100 text-gray-500 border border-gray-200',
}

const STATUS_DISPLAY: Record<string, string> = {
  NEW: 'New',
  CONFIRMED: 'Confirmed',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export default function ShipmentsPage() {
  const router = useRouter()
  const [shipments, setShipments] = useState<ShipmentListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/shipments')
      .then(res => setShipments(res.data.shipments))
      .catch(() => toast.error('Failed to load shipments'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <Loader className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex-shrink-0 px-6 pt-5 pb-4 bg-white border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Shipments</h1>
        <p className="text-sm text-gray-400 mt-0.5">{shipments.length} total</p>
      </div>

      <div className="flex-1 overflow-auto min-h-0 px-6 py-4">
        {shipments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <p className="text-gray-400 text-sm">No shipments yet</p>
            <p className="text-gray-300 text-xs mt-1">Shipments appear here when orders are out for delivery</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3.5">Order</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3.5">Customer</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3.5">Carrier</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3.5">Tracking ID</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3.5">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {shipments.map(s => (
                  <tr
                    key={s.id}
                    onClick={() => router.push(`/dashboard/shipments/${s.id}`)}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-5 py-4 font-semibold text-gray-900">{s.order.order_number}</td>
                    <td className="px-5 py-4 text-gray-700">
                      <p>{s.order.customer.name ?? <span className="text-gray-400 italic">No name</span>}</p>
                      {s.order.customer.phone && <p className="text-xs text-gray-400">{s.order.customer.phone}</p>}
                    </td>
                    <td className="px-5 py-4 text-gray-700">{s.carrier_name}</td>
                    <td className="px-5 py-4 font-mono text-gray-700">{s.tracking_id}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[s.order.status] ?? ''}`}>
                        {STATUS_DISPLAY[s.order.status] ?? s.order.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-400 text-xs">{formatDate(s.created_at)}</td>
                    <td className="px-5 py-4">
                      {s.tracking_url && (
                        <a
                          href={s.tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-[#6366f1] hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" /> Track
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
