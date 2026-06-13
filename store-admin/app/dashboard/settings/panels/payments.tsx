'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader, Trash, Eye, EyeOff, Check } from '@deemlol/next-icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import AppSwitch from '@/components/ui/app-switch'
import api from '@/lib/api'
import { apiErrorMessage } from '@/lib/utils'
import type { PaymentProvider } from '@/types'
import r_logo from './../../../../public/images/rayzorpay.png'
import Image from 'next/image'

function RazorpayLogo({ size = 32 }: { size?: number }) {
  return (
    // <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    //   <rect width="40" height="40" rx="8" fill="#3395FF" />
    //   <path
    //     d="M11 10h11.5c3.2 0 5.5 2 5.5 5 0 2.2-1.2 4-3.2 4.8l4.2 8.2h-4.8l-3.6-7.5H15.2V28H11V10zm4.2 7.2h6.8c1.2 0 2.2-.8 2.2-2.2 0-1.3-1-2-2.2-2h-6.8v4.2z"
    //     fill="white"
    //   />
    // </svg>
    <Image src={r_logo} width={size} height={size} alt='r_pay_logo'></Image>
  )
}

export default function PaymentsPanel() {
  const [providers, setProviders] = useState<PaymentProvider[]>([])
  const [loading, setLoading] = useState(true)

  // Add modal
  const [addOpen, setAddOpen] = useState(false)
  const [addKeyId, setAddKeyId] = useState('')
  const [addKeySecret, setAddKeySecret] = useState('')
  const [showAddSecret, setShowAddSecret] = useState(false)
  const [adding, setAdding] = useState(false)

  // Edit modal
  const [editTarget, setEditTarget] = useState<PaymentProvider | null>(null)
  const [editKeyId, setEditKeyId] = useState('')
  const [editKeySecret, setEditKeySecret] = useState('')
  const [showEditSecret, setShowEditSecret] = useState(false)
  const [saving, setSaving] = useState(false)

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<PaymentProvider | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    api.get('/api/payment-providers')
      .then(res => setProviders(res.data.payment_providers))
      .catch(() => toast.error('Failed to load payment providers'))
      .finally(() => setLoading(false))
  }, [])

  const razorpay = providers.find(p => p.provider === 'RAZORPAY') ?? null
  const isConfigured = !!razorpay

  function openEdit() {
    if (!razorpay) return
    setEditTarget(razorpay)
    setEditKeyId(razorpay.key_id)
    setEditKeySecret('')
    setShowEditSecret(false)
  }

  async function handleAdd() {
    if (!addKeyId.trim()) { toast.error('Key ID is required'); return }
    if (!addKeySecret.trim()) { toast.error('Key Secret is required'); return }
    setAdding(true)
    try {
      const res = await api.post('/api/payment-providers', {
        provider: 'RAZORPAY',
        key_id: addKeyId.trim(),
        key_secret: addKeySecret.trim(),
      })
      setProviders(prev => [...prev, res.data.payment_provider])
      setAddOpen(false)
      setAddKeyId(''); setAddKeySecret('')
      toast.success('Razorpay configured successfully')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to configure Razorpay'))
    } finally {
      setAdding(false)
    }
  }

  async function handleSaveEdit() {
    if (!editTarget) return
    if (!editKeyId.trim()) { toast.error('Key ID is required'); return }
    setSaving(true)
    try {
      const body: Record<string, unknown> = { key_id: editKeyId.trim() }
      if (editKeySecret.trim()) body.key_secret = editKeySecret.trim()
      const res = await api.put(`/api/payment-providers/${editTarget.id}`, body)
      setProviders(prev => prev.map(p => p.id === editTarget.id ? res.data.payment_provider : p))
      setEditTarget(null)
      toast.success('Razorpay keys updated')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to update keys'))
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(active: boolean) {
    if (!razorpay) return
    try {
      const res = await api.put(`/api/payment-providers/${razorpay.id}`, { is_active: active })
      setProviders(prev => prev.map(p => p.id === razorpay.id ? res.data.payment_provider : p))
      toast.success(`Razorpay ${active ? 'enabled' : 'disabled'}`)
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to update Razorpay'))
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/api/payment-providers/${deleteTarget.id}`)
      setProviders([])
      setDeleteTarget(null)
      toast.success('Razorpay removed')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to remove Razorpay'))
    } finally {
      setDeleting(false)
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
      <div className="bg-white border rounded-sm border-gray-100 shadow-sm p-6">

        <div className="mb-6">
          <h2 className="text-base font-semibold text-gray-900">Payment providers</h2>
          <p className="text-sm text-gray-400 mt-0.5">Connect a payment gateway to accept online payments.</p>
        </div>

        {/* ── Razorpay card ── */}
        <div className={`border rounded-xl p-4 transition-colors ${isConfigured ? 'border-blue-100 bg-blue-50/30' : 'border-gray-100 bg-gray-50'}`}>
          <div className="flex items-center justify-between">

            {/* Left — logo + info */}
            <div className="flex items-center gap-3">
              <RazorpayLogo size={40} />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-gray-900">Razorpay</p>
                  {isConfigured && razorpay?.is_active && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
                      <Check className="w-2.5 h-2.5" /> Active
                    </span>
                  )}
                  {isConfigured && !razorpay?.is_active && (
                    <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      Inactive
                    </span>
                  )}
                </div>
                {isConfigured ? (
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{razorpay?.key_id}</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-0.5">Accept UPI, cards, netbanking & wallets</p>
                )}
              </div>
            </div>

            {/* Right — actions */}
            {isConfigured ? (
              <div className="flex items-center gap-3">
                <AppSwitch checked={razorpay!.is_active} onChange={handleToggle} />
                <button
                  onClick={openEdit}
                  className="text-xs text-indigo-500 font-semibold hover:text-indigo-700 transition-colors"
                >
                  Edit keys
                </button>
                <button
                  onClick={() => setDeleteTarget(razorpay)}
                  className="text-gray-300 hover:text-red-400 transition-colors"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Button
                className="bg-[#3395FF] hover:bg-[#2277dd] text-white h-9 px-4 text-sm"
                onClick={() => setAddOpen(true)}
              >
                Set up
              </Button>
            )}
          </div>
        </div>

      </div>

      {/* ── Set up Razorpay modal ── */}
      <Dialog open={addOpen} onOpenChange={open => { if (!adding) setAddOpen(open) }} disablePointerDismissal>
        <DialogContent showCloseButton={false} className="w-full max-w-sm bg-white rounded-2xl p-6">

          {/* Modal header with Razorpay branding */}
          <div className="flex items-center gap-3 mb-5">
            <RazorpayLogo size={36} />
            <div>
              <h3 className="font-bold text-gray-900">Connect Razorpay</h3>
              <p className="text-xs text-gray-400">Enter your API keys from Razorpay dashboard</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Key ID <span className="text-destructive">*</span></Label>
              <Input
                className="h-10 font-mono text-sm"
                value={addKeyId}
                onChange={e => setAddKeyId(e.target.value)}
                placeholder="rzp_test_xxxxxxxxxxxx"
              />
              <p className="text-xs text-gray-400">Found in Razorpay Dashboard → Settings → API Keys</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Key Secret <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  className="h-10 font-mono text-sm pr-10"
                  type={showAddSecret ? 'text' : 'password'}
                  value={addKeySecret}
                  onChange={e => setAddKeySecret(e.target.value)}
                  placeholder="Enter key secret"
                />
                <button
                  type="button"
                  onClick={() => setShowAddSecret(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showAddSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-400">Stored encrypted — never shown again after saving</p>
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)} disabled={adding}>Cancel</Button>
            <Button
              className="flex-1 bg-[#3395FF] hover:bg-[#2277dd] text-white"
              onClick={handleAdd}
              disabled={adding}
            >
              {adding ? <Loader className="w-4 h-4 animate-spin mr-2" /> : null}
              {adding ? 'Connecting…' : 'Connect Razorpay'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit keys modal ── */}
      <Dialog open={!!editTarget} onOpenChange={open => { if (!saving && !open) setEditTarget(null) }} disablePointerDismissal>
        <DialogContent showCloseButton={false} className="w-full max-w-sm bg-white rounded-2xl p-6">

          <div className="flex items-center gap-3 mb-5">
            <RazorpayLogo size={36} />
            <div>
              <h3 className="font-bold text-gray-900">Edit Razorpay keys</h3>
              <p className="text-xs text-gray-400">Leave Key Secret blank to keep existing</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Key ID <span className="text-destructive">*</span></Label>
              <Input
                className="h-10 font-mono text-sm"
                value={editKeyId}
                onChange={e => setEditKeyId(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Key Secret</Label>
              <div className="relative">
                <Input
                  className="h-10 font-mono text-sm pr-10"
                  type={showEditSecret ? 'text' : 'password'}
                  value={editKeySecret}
                  onChange={e => setEditKeySecret(e.target.value)}
                  placeholder="Enter to update"
                />
                <button
                  type="button"
                  onClick={() => setShowEditSecret(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showEditSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <Button variant="outline" className="flex-1" onClick={() => setEditTarget(null)} disabled={saving}>Cancel</Button>
            <Button
              className="flex-1 bg-[#3395FF] hover:bg-[#2277dd] text-white"
              onClick={handleSaveEdit}
              disabled={saving}
            >
              {saving ? <Loader className="w-4 h-4 animate-spin mr-2" /> : null}
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm modal ── */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!deleting && !open) setDeleteTarget(null) }}>
        <DialogContent showCloseButton={false} className="w-full max-w-sm bg-white rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <RazorpayLogo size={36} />
            <div>
              <h3 className="font-bold text-gray-900">Remove Razorpay?</h3>
              <p className="text-sm text-gray-400">Customers won't be able to pay online.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader className="w-4 h-4 animate-spin mr-2" /> : null}
              {deleting ? 'Removing…' : 'Remove'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
