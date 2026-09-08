'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader } from '@deemlol/next-icons'
import api from '@/lib/api'

interface PlanDetails {
  plan: string
  usage: {
    products: { used: number; limit: number | null }
    staff: { used: number; limit: number | null }
  }
  subscriptions: {
    id: string
    plan: string
    billing_cycle: string
    amount: number
    start_date: string
    end_date: string
    created_at: string
  }[]
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function PlanPanel() {
  const [loading, setLoading] = useState(true)
  const [details, setDetails] = useState<PlanDetails | null>(null)

  useEffect(() => {
    api.get('/api/store/plan')
      .then(res => setDetails(res.data))
      .catch(() => toast.error('Failed to load plan details'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!details) {
    return <p className="text-sm text-gray-400 text-center py-20">Failed to load plan details.</p>
  }

  const usageRows = [
    { label: 'Products', ...details.usage.products },
    { label: 'Staff', ...details.usage.staff },
  ]

  return (
    <div className="space-y-4">

      {/* Current plan */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-semibold text-gray-900">Current Plan</p>
            <p className="text-sm text-gray-400 mt-0.5">Your plan is managed by the Dreambiz team.</p>
          </div>
          <span className="text-sm font-semibold text-[#7c3aed] bg-violet-50 rounded-full px-3 py-1.5 capitalize">
            {details.plan.toLowerCase()}
          </span>
        </div>

        <div className="mt-5 space-y-4">
          {usageRows.map(row => {
            const pct = row.limit ? Math.min(Math.round((row.used / row.limit) * 100), 100) : 0
            const barColor = row.limit && row.used >= row.limit
              ? 'bg-red-500'
              : row.limit && pct >= 80
                ? 'bg-amber-500'
                : 'bg-[#7c3aed]'
            return (
              <div key={row.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">{row.label}</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {row.used} / {row.limit ?? 'Unlimited'}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${barColor} transition-all`}
                    style={{ width: `${row.limit ? pct : 100}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Billing history */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="text-base font-semibold text-gray-900">Billing History</p>
          <p className="text-sm text-gray-400 mt-0.5">Payments recorded against your store.</p>
        </div>

        {details.subscriptions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No payments recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Plan</th>
                <th className="text-left px-6 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Cycle</th>
                <th className="text-left px-6 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Amount</th>
                <th className="text-left px-6 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Start</th>
                <th className="text-left px-6 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">End</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {details.subscriptions.map(s => (
                <tr key={s.id}>
                  <td className="px-6 py-3 font-medium text-gray-900 capitalize">{s.plan.toLowerCase()}</td>
                  <td className="px-6 py-3 text-gray-600 capitalize">{s.billing_cycle.toLowerCase()}</td>
                  <td className="px-6 py-3 font-semibold text-gray-900">₹{s.amount.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-3 text-gray-600">{fmtDate(s.start_date)}</td>
                  <td className="px-6 py-3 text-gray-600">{fmtDate(s.end_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}
