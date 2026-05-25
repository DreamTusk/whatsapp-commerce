'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2, Search } from 'lucide-react'
import api from '@/lib/api'

interface Customer {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  address: string | null
  order_count: number
  total_spent: number
  last_order_at: string | null
  joined_at: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get('/api/customers')
      .then(res => setCustomers(res.data.customers))
      .catch(() => toast.error('Failed to load customers'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = customers.filter(c => {
    const q = search.toLowerCase()
    return (
      c.name?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.address?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-6 pt-6 pb-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[26px] font-bold text-gray-900">Customers</h1>
            <p className="text-base text-gray-500 mt-0.5">{customers.length} total</p>
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 px-6 pb-4 bg-gray-50">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, phone or address…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 px-6 pt-6 pb-4 flex flex-col">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-xl font-medium">{search ? 'No customers match your search' : 'No customers yet'}</p>
          <p className="text-base mt-1">{!search && 'Customers appear here once they sign in to your store'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full text-base min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide">Customer</th>
                <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Address</th>
                <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide">Orders</th>
                <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Spent</th>
                <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Last order</th>
                <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#25D366]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-base font-bold text-[#25D366]">
                          {(c.name ?? c.phone ?? '?').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {c.name ?? <span className="text-gray-400 font-normal">No name</span>}
                        </p>
                        <p className="text-base text-gray-400">{c.phone ?? c.email ?? '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell max-w-[180px]">
                    <p className="truncate">{c.address ?? <span className="text-gray-300">—</span>}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-base font-semibold px-2 py-1 rounded-full ${
                      c.order_count > 0 ? 'bg-[#25D366]/10 text-[#25D366]' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {c.order_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 hidden sm:table-cell">
                    {c.total_spent > 0 ? `₹${c.total_spent.toFixed(0)}` : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                    {c.last_order_at ? formatDateTime(c.last_order_at) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 hidden lg:table-cell">
                    {formatDate(c.joined_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="flex-shrink-0 px-4 py-2.5 bg-gray-50 rounded-b-2xl border-t border-gray-100">
            <p className="text-base text-gray-500">{customers.length} customers</p>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
