'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ShoppingBag, Users, Package, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import api from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface Stats {
  total_orders: number
  total_revenue: number
  total_customers: number
  total_products: number
  out_of_stock_count: number
  orders_by_status: {
    new: number
    confirmed: number
    out_for_delivery: number
    delivered: number
    cancelled: number
  }
  recent_orders: {
    id: string
    order_number: string
    total_amount: number
    status: string
    created_at: string
    customer_name: string
  }[]
  out_of_stock_products: {
    id: string
    name: string
    image_url: string | null
    selling_price: number
    category: string
  }[]
}

const STATUS_STYLES: Record<string, string> = {
  NEW: 'bg-blue-50 text-blue-600',
  CONFIRMED: 'bg-indigo-50 text-indigo-600',
  OUT_FOR_DELIVERY: 'bg-amber-50 text-amber-600',
  DELIVERED: 'bg-green-50 text-green-600',
  CANCELLED: 'bg-red-50 text-red-500',
}

const STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  CONFIRMED: 'Confirmed',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

function fmt(n: number) {
  return n.toLocaleString('en-IN')
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/dashboard/stats')
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Failed to load dashboard.
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Revenue',
      value: `₹${fmt(stats.total_revenue)}`,
      sub: 'From delivered orders',
      icon: TrendingUp,
      iconClass: 'text-green-500 bg-green-50',
    },
    {
      title: 'Total Orders',
      value: fmt(stats.total_orders),
      sub: `${stats.orders_by_status.new} new today`,
      icon: ShoppingBag,
      iconClass: 'text-blue-500 bg-blue-50',
    },
    {
      title: 'Customers',
      value: fmt(stats.total_customers),
      sub: 'Registered customers',
      icon: Users,
      iconClass: 'text-violet-500 bg-violet-50',
    },
    {
      title: 'Products',
      value: fmt(stats.total_products),
      sub: stats.out_of_stock_count > 0 ? `${stats.out_of_stock_count} out of stock` : 'All in stock',
      icon: Package,
      iconClass: 'text-amber-500 bg-amber-50',
      subClass: stats.out_of_stock_count > 0 ? 'text-red-500' : undefined,
    },
  ]

  const statusRows = [
    { label: 'New', count: stats.orders_by_status.new, color: 'bg-blue-500' },
    { label: 'Confirmed', count: stats.orders_by_status.confirmed, color: 'bg-indigo-500' },
    { label: 'Out for Delivery', count: stats.orders_by_status.out_for_delivery, color: 'bg-amber-500' },
    { label: 'Delivered', count: stats.orders_by_status.delivered, color: 'bg-green-500' },
    { label: 'Cancelled', count: stats.orders_by_status.cancelled, color: 'bg-red-400' },
  ]
  const totalForBar = Math.max(stats.total_orders, 1)

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="flex-shrink-0 px-6 pt-6 pb-4 bg-gray-50">
        <h1 className="text-[26px] font-bold text-gray-900">Dashboard</h1>
        <p className="text-base text-gray-500 mt-0.5">Overview of your store</p>
      </div>

      <div className="px-6 pb-8 space-y-6">

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {statCards.map(card => (
            <Card key={card.title}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                    <p className={`text-xs mt-1 ${card.subClass ?? 'text-muted-foreground'}`}>{card.sub}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${card.iconClass}`}>
                    <card.icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* ── Recent Orders ── */}
          <Card className="xl:col-span-2">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-gray-900">Recent Orders</CardTitle>
                  <CardDescription>Last {stats.recent_orders.length} orders</CardDescription>
                </div>
                <button
                  onClick={() => router.push('/dashboard/orders')}
                  className="flex items-center gap-1 text-sm text-[#6366f1] hover:text-[#4f46e5] font-medium transition-colors"
                >
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {stats.recent_orders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">No orders yet</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Order</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Customer</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Amount</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {stats.recent_orders.map(o => (
                      <tr
                        key={o.id}
                        onClick={() => router.push(`/dashboard/orders/${o.id}`)}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">{o.order_number}</td>
                        <td className="px-4 py-3 text-gray-600">{o.customer_name}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">₹{fmt(o.total_amount)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[o.status] ?? 'bg-gray-100 text-gray-500'}`}>
                            {STATUS_LABELS[o.status] ?? o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* ── Right column ── */}
          <div className="flex flex-col gap-4">

            {/* Order breakdown */}
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-base font-semibold text-gray-900">Order Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {statusRows.map(row => (
                  <div key={row.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">{row.label}</span>
                      <span className="text-sm font-semibold text-gray-900">{row.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${row.color} transition-all`}
                        style={{ width: `${Math.round((row.count / totalForBar) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Out of stock */}
            {stats.out_of_stock_products.length > 0 && (
              <Card>
                <CardHeader className="border-b">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <CardTitle className="text-base font-semibold text-gray-900">Out of Stock</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-3 space-y-2">
                  {stats.out_of_stock_products.map((p, i) => (
                    <div key={p.id}>
                      <div
                        onClick={() => router.push(`/dashboard/products/${p.id}`)}
                        className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-lg p-1.5 -mx-1.5 transition-colors"
                      >
                        {p.image_url ? (
                          <img
                            src={p.image_url.startsWith('http') ? p.image_url : `${API_URL}${p.image_url}`}
                            alt={p.name}
                            className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-base">🛍️</div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.category}</p>
                        </div>
                        <span className="text-sm font-semibold text-gray-700 flex-shrink-0">₹{p.selling_price}</span>
                      </div>
                      {i < stats.out_of_stock_products.length - 1 && <Separator className="mt-2" />}
                    </div>
                  ))}
                  <button
                    onClick={() => router.push('/dashboard/inventory')}
                    className="w-full text-center text-xs text-[#6366f1] hover:text-[#4f46e5] font-medium pt-1 transition-colors"
                  >
                    Manage inventory →
                  </button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
