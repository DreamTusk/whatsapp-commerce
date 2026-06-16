'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Loader, MapPin } from '@deemlol/next-icons'
import api from '@/lib/api'

interface Address {
  id: string
  label: string | null
  door_no: string | null
  street: string | null
  city: string | null
  state: string | null
  country: string | null
  pincode: string | null
  is_default: boolean
}

interface CustomerDetail {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  order_count: number
  total_spent: number
  joined_at: string
  addresses: Address[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatAddress(a: Address) {
  return [a.door_no, a.street, a.city, a.pincode, a.state].filter(Boolean).join(', ')
}

export default function CustomerDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/api/customers/${id}`)
      .then(res => setCustomer(res.data.customer))
      .catch(() => toast.error('Failed to load customer'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p>Customer not found</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-auto bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-5 pb-4 bg-white border-b border-gray-100">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Customers
        </button>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#6366f1]/10 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-bold text-[#6366f1]">
              {(customer.name ?? customer.phone ?? '?').charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{customer.name ?? <span className="text-gray-400 font-normal">No name</span>}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{customer.phone ?? customer.email ?? '—'}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 py-5 space-y-4 max-w-2xl">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Orders', value: customer.order_count },
            { label: 'Total spent', value: customer.total_spent > 0 ? `₹${customer.total_spent.toFixed(0)}` : '—' },
            { label: 'Joined', value: formatDate(customer.joined_at) },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-1">{s.label}</p>
              <p className="text-base font-semibold text-gray-900">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Addresses */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50">
            <p className="text-sm font-semibold text-gray-900">Saved Addresses</p>
          </div>
          {customer.addresses.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <MapPin className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No addresses saved</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {customer.addresses.map(a => (
                <div key={a.id} className="px-5 py-4 flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {a.label && <span className="text-xs font-medium text-gray-700">{a.label}</span>}
                      {a.is_default && (
                        <span className="text-[10px] font-semibold bg-[#6366f1]/10 text-[#6366f1] px-1.5 py-0.5 rounded-full">Default</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{formatAddress(a)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
