'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader, Trash, Eye, EyeOff, Check, Copy } from '@deemlol/next-icons'
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
    <Image src={r_logo} width={size} height={size} alt='r_pay_logo'></Image>
  )
}

export default function PaymentsPanel() {
  const [providers, setProviders] = useState<PaymentProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [storeId, setStoreId] = useState<string | null>(null)

  // Add modal
  const [addOpen, setAddOpen] = useState(false)
  const [addKeyId, setAddKeyId] = useState('')
  const [addKeySecret, setAddKeySecret] = useState('')
  const [addWebhookSecret, setAddWebhookSecret] = useState('')
  const [showAddSecret, setShowAddSecret] = useState(false)
  const [showAddWebhookSecret, setShowAddWebhookSecret] = useState(false)
  const [adding, setAdding] = useState(false)

  // Edit modal
  const [editTarget, setEditTarget] = useState<PaymentProvider | null>(null)
  const [editKeyId, setEditKeyId] = useState('')
  const [editKeySecret, setEditKeySecret] = useState('')
  const [editWebhookSecret, setEditWebhookSecret] = useState('')
  const [showEditSecret, setShowEditSecret] = useState(false)
  const [showEditWebhookSecret, setShowEditWebhookSecret] = useState(false)
  const [saving, setSaving] = useState(false)

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<PaymentProvider | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/api/payment-providers'),
      api.get('/api/auth/me'),
    ])
      .then(([providersRes, meRes]) => {
        setProviders(providersRes.data.payment_providers)
        setStoreId(meRes.data.store?.id ?? null)
      })
      .catch(() => toast.error('Failed to load payment providers'))
      .finally(() => setLoading(false))
  }, [])

  const razorpay = providers.find(p => p.provider === 'RAZORPAY') ?? null
  const isConfigured = !!razorpay
  const webhookUrl = storeId ? `${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/payments/razorpay-webhook/${storeId}` : ''

  function openEdit() {
    if (!razorpay) return
    setEditTarget(razorpay)
    setEditKeyId(razorpay.key_id)
    setEditKeySecret('')
    setEditWebhookSecret('')
    setShowEditSecret(false)
    setShowEditWebhookSecret(false)
  }

  async function handleAdd() {
    if (!addKeyId.trim()) { toast.error('Key ID is required'); return }
    if (!addKeySecret.trim()) { toast.error('Key Secret is required'); return }
    setAdding(true)
    try {
      const body: Record<string, unknown> = {
        provider: 'RAZORPAY',
        key_id: addKeyId.trim(),
        key_secret: addKeySecret.trim(),
      }
      if (addWebhookSecret.trim()) body.webhook_secret = addWebhookSecret.trim()
      const res = await api.post('/api/payment-providers', body)
      setProviders(prev => [...prev, res.data.payment_provider])
      setAddOpen(false)
      setAddKeyId(''); setAddKeySecret(''); setAddWebhookSecret('')
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
      if (editWebhookSecret.trim()) body.webhook_secret = editWebhookSecret.trim()
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

  function copyWebhookUrl() {
    if (!webhookUrl) return
    navigator.clipboard.writeText(webhookUrl)
    toast.success('Webhook URL copied')
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

          {/* Webhook URL section — shown only when configured */}
          {isConfigured && webhookUrl && (
            <div className="mt-4 pt-4 border-t border-blue-100">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-medium text-gray-600">Webhook URL</p>
                {razorpay?.has_webhook_secret ? (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
                    <Check className="w-2.5 h-2.5" /> Secret saved
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                    No webhook secret
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <p className="text-xs font-mono text-gray-500 flex-1 truncate">{webhookUrl}</p>
                <button onClick={copyWebhookUrl} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Add this URL in Razorpay Dashboard → Settings → Webhooks. Select the <span className="font-mono">payment.captured</span> event.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* ── Set up Razorpay modal ── */}
      <Dialog open={addOpen} onOpenChange={open => { if (!adding) setAddOpen(open) }} disablePointerDismissal>
        <DialogContent showCloseButton={false} className="w-full max-w-sm bg-white rounded-2xl p-6">

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
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Webhook Secret <span className="text-gray-400 font-normal">(optional)</span></Label>
              <div className="relative">
                <Input
                  className="h-10 font-mono text-sm pr-10"
                  type={showAddWebhookSecret ? 'text' : 'password'}
                  value={addWebhookSecret}
                  onChange={e => setAddWebhookSecret(e.target.value)}
                  placeholder="Enter webhook secret"
                />
                <button
                  type="button"
                  onClick={() => setShowAddWebhookSecret(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showAddWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-400">Found in Razorpay Dashboard → Settings → Webhooks. Required for automatic payment confirmation on network failure.</p>
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
              <p className="text-xs text-gray-400">Leave secret fields blank to keep existing values</p>
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
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                Webhook Secret
                {editTarget?.has_webhook_secret && (
                  <span className="ml-2 text-[10px] font-semibold text-green-600 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-full">Saved</span>
                )}
              </Label>
              <div className="relative">
                <Input
                  className="h-10 font-mono text-sm pr-10"
                  type={showEditWebhookSecret ? 'text' : 'password'}
                  value={editWebhookSecret}
                  onChange={e => setEditWebhookSecret(e.target.value)}
                  placeholder={editTarget?.has_webhook_secret ? 'Enter to update' : 'Enter webhook secret'}
                />
                <button
                  type="button"
                  onClick={() => setShowEditWebhookSecret(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showEditWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
