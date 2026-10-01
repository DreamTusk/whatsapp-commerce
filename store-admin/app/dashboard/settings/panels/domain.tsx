'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Globe, Loader, Copy, Check, ExternalLink, Trash, AlertTriangle, RefreshCw } from '@deemlol/next-icons'
import api from '@/lib/api'
import StorefrontLink from '@/components/storefront-link'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { apiErrorMessage } from '@/lib/utils'
import type { Store as StoreType } from '@/types'

// Wired to the real POST/GET-status/DELETE endpoints in
// api-server/src/admin/store/store.controller.ts. They're gated to
// production only (see custom-domain-architecture.md) — calling these
// against a non-production api-server returns a 403.

type CustomDomainState = 'none' | 'pending' | 'active' | 'failed'

// Matches Cloudflare's ownership_verification shape from the Custom
// Hostnames API — a TXT record the store owner adds alongside the CNAME to
// prove domain control, separate from SSL cert issuance.
type VerificationData = { type: string; name: string; value: string } | null

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(value)
    setCopied(true)
    toast.success(`${label} copied`)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div>
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
        <p className="text-xs font-mono text-gray-700 flex-1 truncate">{value}</p>
        <button onClick={handleCopy} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  )
}

// Mirrors the backend's own gate (api-server checks NODE_ENV !== 'production'
// before touching Cloudflare) — Next.js inlines process.env.NODE_ENV into the
// client bundle at build time, so this is safe to read directly here.
const isProductionEnv = process.env.NODE_ENV === 'production'

export default function DomainPanel() {
  const [store, setStore] = useState<StoreType | null>(null)
  const [loading, setLoading] = useState(true)

  // Custom domain
  const [customState, setCustomState] = useState<CustomDomainState>('none')
  // Raw backend status, kept alongside the bucketed customState so the
  // pending card can distinguish "DNS not added yet" from "DNS verified,
  // cert still issuing" (both map to the same 'pending' bucket).
  const [rawStatus, setRawStatus] = useState('')
  const [sslStatus, setSslStatus] = useState('')
  const [customDomain, setCustomDomain] = useState('')
  const [verification, setVerification] = useState<VerificationData>(null)
  const [dnsTarget, setDnsTarget] = useState('')
  const [checking, setChecking] = useState(false)

  // Connect dialog
  const [connectOpen, setConnectOpen] = useState(false)
  const [domainInput, setDomainInput] = useState('')
  const [connecting, setConnecting] = useState(false)

  // Remove confirm
  const [removeOpen, setRemoveOpen] = useState(false)
  const [removing, setRemoving] = useState(false)

  // Cancel setup confirm
  const [cancelSetupOpen, setCancelSetupOpen] = useState(false)

  // Both requests fire together on mount instead of waiting for the store
  // fetch to resolve before deciding whether a second (DNS/SSL status) call
  // is needed — avoids the page rendering once, then immediately flashing a
  // second spinner on "Verify DNS Records" right after. The status call 404s
  // for stores with no custom domain connected (the common case), so its
  // failure is swallowed rather than surfaced as an error toast.
  useEffect(() => {
    async function load() {
      const [storeRes, statusRes] = await Promise.all([
        api.get('/api/store').catch(() => null),
        isProductionEnv ? api.get('/api/store/custom-domain/status').catch(() => null) : Promise.resolve(null),
      ])

      if (!storeRes) {
        toast.error('Failed to load store')
        setLoading(false)
        return
      }

      const s: StoreType = storeRes.data.store
      setStore(s)

      if (s.custom_domain) {
        if (statusRes) {
          setCustomDomain(statusRes.data.custom_domain)
          setDnsTarget(statusRes.data.dns_target ?? '')
          setVerification(statusRes.data.verification ?? null)
          setRawStatus(statusRes.data.custom_domain_status ?? '')
          setSslStatus(statusRes.data.ssl_status ?? '')
          setCustomState(statusRes.data.custom_domain_status === 'active' ? 'active' : 'pending')
        } else {
          setCustomDomain(s.custom_domain)
          setRawStatus(s.custom_domain_status ?? '')
          setCustomState(s.custom_domain_status === 'active' ? 'active' : 'pending')
        }
      }

      setLoading(false)
    }
    load()
  }, [])

  async function handleConnect() {
    const domain = domainInput.trim().toLowerCase()
    if (!domain) { toast.error('Enter a domain'); return }
    if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(domain)) { toast.error('Enter a valid domain, e.g. freshmart.com or shop.freshmart.com'); return }

    setConnecting(true)
    try {
      const res = await api.post('/api/store/custom-domain', { domain })
      setCustomDomain(res.data.custom_domain)
      setDnsTarget(res.data.dns_target ?? '')
      setVerification(res.data.verification ?? null)
      setRawStatus(res.data.custom_domain_status ?? '')
      setSslStatus(res.data.ssl_status ?? '')
      setCustomState(res.data.custom_domain_status === 'active' ? 'active' : 'pending')
      setConnectOpen(false)
      setDomainInput('')
      toast.success('Domain added — verify DNS to activate')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to connect domain'))
    } finally {
      setConnecting(false)
    }
  }

  async function handleCheckStatus() {
    setChecking(true)
    try {
      const res = await api.get('/api/store/custom-domain/status')
      setCustomDomain(res.data.custom_domain)
      setDnsTarget(res.data.dns_target ?? '')
      setVerification(res.data.verification ?? null)
      setRawStatus(res.data.custom_domain_status ?? '')
      setSslStatus(res.data.ssl_status ?? '')
      if (res.data.custom_domain_status === 'active') {
        setCustomState('active')
        toast.success('Domain verified and connected')
      } else {
        setCustomState('pending')
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to check domain status'))
    } finally {
      setChecking(false)
    }
  }

  async function handleRemove() {
    setRemoving(true)
    try {
      await api.delete('/api/store/custom-domain')
      setCustomState('none')
      setCustomDomain('')
      setVerification(null)
      setDnsTarget('')
      setRawStatus('')
      setSslStatus('')
      setRemoveOpen(false)
      setCancelSetupOpen(false)
      toast.success('Custom domain removed')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to remove domain'))
    } finally {
      setRemoving(false)
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
    <div className="space-y-3">
      {/* ── Platform subdomain (unchanged, always works) ── */}
      <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-3 mb-1">
          <Globe className="w-5 h-5 text-gray-400" />
          <h2 className="text-base font-semibold text-gray-900">Domain</h2>
        </div>
        <p className="text-sm text-gray-400 mb-3">Manage your store's domain settings.</p>

        {store?.domain ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Your store is live at</p>
            <StorefrontLink domain={store.domain} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 gap-2 text-gray-300">
            <Globe className="w-8 h-8" />
            <p className="text-sm font-medium text-gray-400">No domain set for this store</p>
          </div>
        )}
      </div>

      {/* ── Custom domain ── */}
      <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-4">
        <div className="mb-3">
          <h2 className="text-base font-semibold text-gray-900">Custom domain</h2>
          <p className="text-sm text-gray-400 mt-0.5">Connect your own domain so customers see your brand, not dreambizstore.com.</p>
        </div>

        {/* Every action here (connect/check/remove) is rejected by the backend
            outside production — mirror that in the UI instead of showing a
            live-looking panel that 403s on every click. */}
        {!isProductionEnv && (
          <div className="flex flex-col items-center justify-center py-6 gap-2 text-gray-300 text-center">
            <Globe className="w-8 h-8" />
            <p className="text-sm font-medium text-gray-400">Custom domains are only available in production</p>
            <p className="text-xs text-gray-300 max-w-xs">This environment can't reach the real Cloudflare account, so connecting a domain here isn't possible.</p>
          </div>
        )}

        {isProductionEnv && customState === 'none' && (
          <div className="border border-gray-100 bg-gray-50 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                <Globe className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">No custom domain connected</p>
                <p className="text-xs text-gray-400 mt-0.5">e.g. yourbrand.com</p>
              </div>
            </div>
            <Button className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white h-9 px-4 text-sm" onClick={() => setConnectOpen(true)}>
              Connect domain
            </Button>
          </div>
        )}

        {isProductionEnv && customState === 'pending' && (
          <div className="border border-amber-100 bg-amber-50/40 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-900">
                {rawStatus === 'pending_ssl' ? `Issuing certificate for ${customDomain}` : `Verifying ${customDomain}`}
              </p>
              <span className="text-[10px] font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Pending</span>
            </div>
            {sslStatus && <p className="text-[11px] text-gray-400 mb-2">SSL: {sslStatus.replace(/_/g, ' ')}</p>}
            <p className="text-xs text-gray-500 mb-3">
              {rawStatus === 'pending_ssl'
                ? 'DNS is verified — Cloudflare is issuing the SSL certificate now. This usually takes a few minutes.'
                : "Add these two records at your domain's DNS provider (GoDaddy, Namecheap, Cloudflare, etc). It can take a few minutes to a few hours to take effect."}
            </p>
            <div className="space-y-2 mb-3">
              <div className="border border-gray-200 bg-white rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-700 mb-2">Step 1</p>
                <div className="space-y-2">
                  <CopyRow label="Type" value="CNAME" />
                  <CopyRow label="Host" value={customDomain} />
                  {dnsTarget && <CopyRow label="Value" value={dnsTarget} />}
                </div>
              </div>

              {verification && (
                <div
                  className={`border rounded-lg p-3 ${
                    rawStatus === 'pending_ssl' ? 'border-green-200 bg-green-50/40' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <p className={`text-xs font-semibold ${rawStatus === 'pending_ssl' ? 'text-green-700' : 'text-gray-700'}`}>
                      Step 2
                    </p>
                    {rawStatus === 'pending_ssl' && <Check className="w-3.5 h-3.5 text-green-500" />}
                  </div>
                  <div className="space-y-2">
                    <CopyRow label="Type" value="TXT" />
                    <CopyRow label="Host" value={verification.name} />
                    <CopyRow label="Value" value={verification.value} />
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleCheckStatus} disabled={checking}>
                {checking ? <Loader className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                {checking ? 'Verifying…' : 'Verify DNS Records'}
              </Button>
              <button
                onClick={() => setCancelSetupOpen(true)}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors px-3"
              >
                Cancel setup
              </button>
            </div>
          </div>
        )}

        {isProductionEnv && customState === 'active' && (
          <div className="border border-green-100 bg-green-50/40 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-green-200 flex items-center justify-center flex-shrink-0">
                  <Check className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{customDomain}</p>
                    <span className="text-[10px] font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Connected</span>
                  </div>
                  <a
                    href={`https://${customDomain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#7c3aed] transition-colors mt-0.5"
                  >
                    <ExternalLink className="w-3 h-3" /> Visit store
                  </a>
                </div>
              </div>
              <button onClick={() => setRemoveOpen(true)} className="text-gray-300 hover:text-red-400 transition-colors">
                <Trash className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {isProductionEnv && customState === 'failed' && (
          <div className="border border-red-100 bg-red-50/40 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-red-200 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Couldn't verify {customDomain}</p>
                <p className="text-xs text-gray-400 mt-0.5">We didn't find the DNS record yet, or it doesn't match.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleCheckStatus} disabled={checking}>
                {checking ? <Loader className="w-4 h-4 animate-spin mr-2" /> : null}
                {checking ? 'Checking…' : 'Recheck DNS'}
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-red-200 text-red-500 hover:bg-red-50"
                onClick={handleRemove}
                disabled={removing}
              >
                {removing ? <Loader className="w-4 h-4 animate-spin mr-2" /> : null}
                {removing ? 'Removing…' : 'Start over'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Connect domain dialog ── */}
      <Dialog open={connectOpen} onOpenChange={open => { if (!connecting) setConnectOpen(open) }} disablePointerDismissal>
        <DialogContent showCloseButton={false} className="w-full max-w-sm bg-white rounded-2xl p-6">
          <div className="mb-5">
            <h3 className="font-bold text-gray-900">Connect your domain</h3>
            <p className="text-xs text-gray-400 mt-0.5">You'll get a DNS record to add at your domain provider next.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Domain</Label>
            <div className="flex items-center h-11 rounded-xl border border-gray-200 overflow-hidden focus-within:ring-1 focus-within:ring-[var(--color-primary,#7c3aed)] focus-within:border-[#7c3aed]">
              <input
                className="flex-1 h-full px-3 font-mono text-sm outline-none"
                value={domainInput}
                onChange={e => setDomainInput(e.target.value)}
                placeholder="freshmart.com or shop.freshmart.com"
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-400">
              {/^([a-z0-9-]+\.){2,}[a-z]{2,}$/i.test(domainInput.trim())
                ? `Your store will be reachable at ${domainInput.trim().toLowerCase()}`
                : `Your store will be reachable at www.${domainInput.trim() || 'yourdomain.com'} (we add www. automatically for a bare domain)`}
            </p>
          </div>
          <div className="flex gap-3 mt-5">
            <Button variant="outline" className="flex-1" onClick={() => setConnectOpen(false)} disabled={connecting}>Cancel</Button>
            <Button className="flex-1 bg-[#7c3aed] hover:bg-[#6d28d9] text-white" onClick={handleConnect} disabled={connecting}>
              {connecting ? <Loader className="w-4 h-4 animate-spin mr-2" /> : null}
              {connecting ? 'Connecting…' : 'Connect'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Remove confirm ── */}
      <Dialog open={removeOpen} onOpenChange={open => { if (!removing) setRemoveOpen(open) }}>
        <DialogContent showCloseButton={false} className="w-full max-w-sm bg-white rounded-2xl p-6">
          <div className="mb-4">
            <h3 className="font-bold text-gray-900">Remove {customDomain}?</h3>
            <p className="text-sm text-gray-400 mt-0.5">Your store will only be reachable at its dreambizstore.com subdomain again.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setRemoveOpen(false)} disabled={removing}>Cancel</Button>
            <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={handleRemove} disabled={removing}>
              {removing ? <Loader className="w-4 h-4 animate-spin mr-2" /> : null}
              {removing ? 'Removing…' : 'Remove'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Cancel setup confirm ── */}
      <Dialog open={cancelSetupOpen} onOpenChange={setCancelSetupOpen}>
        <DialogContent showCloseButton={false} className="w-full max-w-sm bg-white rounded-2xl p-6">
          <div className="mb-4">
            <h3 className="font-bold text-gray-900">Cancel domain setup?</h3>
            <p className="text-sm text-gray-400 mt-0.5">{customDomain} won't be connected. You can start over any time.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setCancelSetupOpen(false)} disabled={removing}>Back</Button>
            <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={handleRemove} disabled={removing}>
              {removing ? <Loader className="w-4 h-4 animate-spin mr-2" /> : null}
              {removing ? 'Cancelling…' : 'Cancel setup'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
