'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader } from '@deemlol/next-icons'
import api from '@/lib/api'
import AppSwitch from '@/components/ui/app-switch'
import { apiErrorMessage } from '@/lib/utils'

export default function DeliveryPanel() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [isPickupEnabled, setIsPickupEnabled] = useState(false)
  const [isHomeDeliveryEnabled, setIsHomeDeliveryEnabled] = useState(true)

  useEffect(() => {
    api.get('/api/store')
      .then(res => {
        const s = res.data.store
        setIsPickupEnabled(s.is_pickup_enabled ?? false)
        setIsHomeDeliveryEnabled(s.is_home_delivery_enabled ?? true)
      })
      .catch(() => toast.error('Failed to load store'))
      .finally(() => setLoading(false))
  }, [])

  async function toggle(field: 'pickup' | 'home_delivery', value: boolean) {
    if (field === 'pickup') setIsPickupEnabled(value)
    else setIsHomeDeliveryEnabled(value)

    setSaving(true)
    try {
      const payload = field === 'pickup'
        ? { is_pickup_enabled: String(value) }
        : { is_home_delivery_enabled: String(value) }
      await api.put('/api/store', payload)
      toast.success('Delivery settings updated')
    } catch (err: unknown) {
      if (field === 'pickup') setIsPickupEnabled(!value)
      else setIsHomeDeliveryEnabled(!value)
      toast.error(apiErrorMessage(err, 'Failed to update'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Pickup */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-base font-semibold text-gray-900">Store Pickup</p>
            <p className="text-sm text-gray-400 mt-0.5">
              Allow customers to pick up their orders directly from your store.
            </p>
            {isPickupEnabled && (
              <p className="mt-2 text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2 inline-block">
                Customers will see a pickup option at checkout and can set an expected pickup time.
              </p>
            )}
          </div>
          <AppSwitch checked={isPickupEnabled} onChange={v => toggle('pickup', v)} disabled={saving} />
        </div>
      </div>

      {/* Home Delivery */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-base font-semibold text-gray-900">Home Delivery</p>
            <p className="text-sm text-gray-400 mt-0.5">
              Allow customers to get their orders delivered to their address.
            </p>
            {!isHomeDeliveryEnabled && (
              <p className="mt-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 inline-block">
                Customers won't see the address form at checkout.
              </p>
            )}
          </div>
          <AppSwitch checked={isHomeDeliveryEnabled} onChange={v => toggle('home_delivery', v)} disabled={saving} />
        </div>
      </div>

      <p className="text-xs text-gray-400 px-1">
        At least one delivery option should be enabled. If both are enabled, customers choose at checkout.
      </p>

    </div>
  )
}
