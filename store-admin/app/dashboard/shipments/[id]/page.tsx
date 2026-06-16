'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Loader, ExternalLink } from '@deemlol/next-icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import api from '@/lib/api'
import { apiErrorMessage } from '@/lib/utils'

interface ShipmentDetail {
  id: string
  carrier_name: string
  tracking_id: string
  tracking_url: string | null
  created_at: string
  updated_at: string
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
    hour: '2-digit', minute: '2-digit',
  })
}

export default function ShipmentEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [shipment, setShipment] = useState<ShipmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ carrier_name: '', tracking_id: '', tracking_url: '' })
  const [isSaving, setIsSaving] = useState(false)

  const fetchShipment = useCallback(async () => {
    try {
      const res = await api.get(`/api/shipments/${id}`)
      const s: ShipmentDetail = res.data.shipment
      setShipment(s)
      setForm({
        carrier_name: s.carrier_name,
        tracking_id: s.tracking_id,
        tracking_url: s.tracking_url ?? '',
      })
    } catch {
      toast.error('Failed to load shipment')
    }
  }, [id])

  useEffect(() => {
    fetchShipment().finally(() => setLoading(false))
  }, [fetchShipment])

  async function handleSave() {
    if (!form.carrier_name.trim()) { toast.error('Carrier name is required'); return }
    if (!form.tracking_id.trim()) { toast.error('Tracking ID is required'); return }
    setIsSaving(true)
    try {
      const res = await api.put(`/api/shipments/${id}`, {
        carrier_name: form.carrier_name.trim(),
        tracking_id: form.tracking_id.trim(),
        tracking_url: form.tracking_url.trim() || null,
      })
      setShipment(res.data.shipment)
      toast.success('Shipment updated')
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, 'Failed to update shipment'))
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <Loader className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!shipment) {
    return (
      <div className="text-center py-40 text-gray-400">
        <p className="text-lg font-medium">Shipment not found</p>
        <button onClick={() => router.back()} className="mt-3 text-sm text-[#6366f1] hover:underline">Go back</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-5 pb-4 bg-white border-b border-gray-100">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Shipments
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Shipment details</h1>
            <p className="text-sm text-gray-400 mt-0.5">Order {shipment.order.order_number}</p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full mt-1 ${STATUS_COLORS[shipment.order.status] ?? ''}`}>
            {STATUS_DISPLAY[shipment.order.status] ?? shipment.order.status}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0 px-6 py-4">
        <div className="max-w-lg mx-auto space-y-4">

          {/* Order summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Order info</p>
            <div className="divide-y divide-gray-50">
              <div className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-sm text-gray-400">Order</span>
                <button
                  onClick={() => router.push(`/dashboard/orders/${shipment.order.id}`)}
                  className="text-sm font-semibold text-[#6366f1] hover:underline"
                >
                  {shipment.order.order_number}
                </button>
              </div>
              <div className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-sm text-gray-400">Customer</span>
                <span className="text-sm text-gray-700">{shipment.order.customer.name ?? <span className="italic text-gray-400">No name</span>}</span>
              </div>
              {shipment.order.customer.phone && (
                <div className="flex items-center justify-between gap-4 py-2.5">
                  <span className="text-sm text-gray-400">Phone</span>
                  <span className="text-sm text-gray-700">{shipment.order.customer.phone}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-sm text-gray-400">Amount</span>
                <span className="text-sm font-semibold text-gray-900">₹{shipment.order.total_amount}</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-sm text-gray-400">Added on</span>
                <span className="text-xs text-gray-400">{formatDate(shipment.created_at)}</span>
              </div>
              {shipment.updated_at !== shipment.created_at && (
                <div className="flex items-center justify-between gap-4 py-2.5">
                  <span className="text-sm text-gray-400">Last updated</span>
                  <span className="text-xs text-gray-400">{formatDate(shipment.updated_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Edit form */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Tracking info</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Carrier name *</label>
                <Input
                  placeholder="e.g. Delhivery, Bluedart"
                  value={form.carrier_name}
                  onChange={e => setForm(f => ({ ...f, carrier_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Tracking ID *</label>
                <Input
                  placeholder="e.g. DL123456789"
                  value={form.tracking_id}
                  onChange={e => setForm(f => ({ ...f, tracking_id: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Tracking URL <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <Input
                  placeholder="https://track.carrier.com/..."
                  value={form.tracking_url}
                  onChange={e => setForm(f => ({ ...f, tracking_url: e.target.value }))}
                />
                {form.tracking_url && (
                  <a
                    href={form.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#6366f1] hover:underline mt-1.5"
                  >
                    <ExternalLink className="w-3 h-3" /> Test link
                  </a>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-5">
              <Button
                className="bg-[#6366f1] hover:bg-[#4f46e5] text-white"
                onClick={handleSave}
                disabled={isSaving || !form.carrier_name.trim() || !form.tracking_id.trim()}
              >
                {isSaving && <Loader className="w-4 h-4 animate-spin mr-2" />}
                {isSaving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
