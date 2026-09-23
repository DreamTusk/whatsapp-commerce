'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader } from '@deemlol/next-icons'
import { Store } from 'lucide-react'
import { AppSelect } from '@/components/ui/app-select'
import AppSwitch from '@/components/ui/app-switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/api'
import { apiErrorMessage } from '@/lib/utils'

const BASE_DOMAIN = process.env.NEXT_PUBLIC_STORE_DOMAIN ?? 'dreambiz.app'

// Keep in sync with RESERVED_SUBDOMAINS in api-server/src/admin/store/store.service.ts
const RESERVED_SUBDOMAINS = new Set([
  // environments
  'test', 'testing', 'tests', 'qa', 'uat', 'sit',
  'dev', 'develop', 'development', 'devel',
  'stage', 'staging', 'stg', 'preprod', 'pre-prod', 'prod', 'production', 'live',
  'demo', 'sandbox', 'beta', 'alpha', 'preview', 'canary', 'local', 'localhost',
  // infra
  'api', 'app', 'apps', 'admin', 'administrator', 'dashboard', 'console', 'panel', 'portal',
  'cdn', 'static', 'assets', 'media', 'img', 'images', 'files', 'upload', 'uploads', 'storage',
  'db', 'redis', 'cache', 'internal', 'intranet', 'vpn', 'proxy', 'gateway',
  'git', 'ci', 'jenkins', 'status', 'monitor', 'metrics', 'logs',
  // mail / dns
  'mail', 'email', 'smtp', 'imap', 'pop', 'pop3', 'mx', 'webmail',
  'ns', 'ns1', 'ns2', 'dns', 'ftp', 'sftp', 'autodiscover', 'autoconfig',
  // auth
  'auth', 'login', 'logout', 'signin', 'signup', 'register', 'sso', 'oauth',
  'account', 'accounts', 'user', 'users', 'password', 'reset', 'verify',
  // brand / business
  'www', 'help', 'support', 'docs', 'blog', 'about', 'contact', 'careers',
  'billing', 'pay', 'payment', 'payments', 'checkout', 'invoice', 'shop', 'store',
  'legal', 'terms', 'privacy', 'security', 'abuse', 'root', 'system', 'official',
])

const PLAN_OPTIONS = [
  { value: 'BASIC', label: 'Basic' },
  { value: 'PRO', label: 'Pro' },
]

const BILLING_CYCLE_OPTIONS = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
]

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
}

export default function CreateStorePage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [slug, setSlug] = useState('')
  const [address, setAddress] = useState('')
  const [minOrderAmount, setMinOrderAmount] = useState('')
  const [deliveryRadius, setDeliveryRadius] = useState('')
  const [plan, setPlan] = useState('BASIC')
  const [isPaid, setIsPaid] = useState(false)
  const [billingCycle, setBillingCycle] = useState('MONTHLY')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})

  const fullDomain = `${slug}.${BASE_DOMAIN}`

  function handleNameChange(value: string) {
    setName(value)
    setSlug(toSlug(value))
  }

  function validate() {
    const errs: Record<string, string> = {}
    if (name.trim().length < 2) errs.name = 'Store name must be at least 2 characters'
    if (phone.trim().length < 7) errs.phone = 'Enter a valid phone number'
    if (!slug || slug.length < 2) errs.slug = 'Subdomain must be at least 2 characters'
    if (!/^[a-z0-9-]+$/.test(slug)) errs.slug = 'Only lowercase letters, numbers, and hyphens allowed'
    if (RESERVED_SUBDOMAINS.has(slug)) errs.slug = 'This subdomain is reserved, please choose another'
    return errs
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setIsSubmitting(true)
    try {
      await api.post('/api/store', {
        name: name.trim(),
        phone: phone.trim(),
        domain: fullDomain,
        ...(address.trim() && { address: address.trim() }),
        min_order_amount: String(parseFloat(minOrderAmount) || 0),
        ...(deliveryRadius && { delivery_radius: String(parseFloat(deliveryRadius)) }),
        plan,
        is_paid: isPaid,
        ...(isPaid && { billing_cycle: billingCycle }),
      })
      toast.success('Store created! Welcome to your dashboard.')
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg =
        apiErrorMessage(err, 'Failed to create store. Please try again.')
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[url('/images/create-store-bg.jpg')] bg-cover bg-center bg-no-repeat flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#7c3aed] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
            <Store className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Set up your store</h1>
          <p className="text-sm text-gray-500 mt-1">You can update these details any time from settings.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={onSubmit} className="space-y-5">

            {/* Store name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Store name <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                placeholder="Fresh Mart"
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                aria-invalid={!!errors.name}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone">WhatsApp phone number <span className="text-destructive">*</span></Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                aria-invalid={!!errors.phone}
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>

            {/* Domain — slug editable, base domain read-only */}
            <div className="space-y-1.5">
              <Label htmlFor="slug">Store subdomain <span className="text-destructive">*</span></Label>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-[#7c3aed] focus-within:border-transparent">
                <input
                  id="slug"
                  type="text"
                  placeholder="freshmart"
                  value={slug}
                  onChange={e => setSlug(toSlug(e.target.value))}
                  className="flex-1 h-10 px-3 text-sm text-gray-900 bg-white outline-none"
                  aria-invalid={!!errors.slug}
                />
                <span className="h-10 px-3 flex items-center text-sm text-gray-400 bg-gray-50 border-l border-gray-200 select-none whitespace-nowrap">
                  .{BASE_DOMAIN}
                </span>
              </div>
              {errors.slug
                ? <p className="text-xs text-destructive">{errors.slug}</p>
                : slug
                  ? <p className="text-xs text-gray-400">Your store will be at <span className="font-medium text-gray-600">{fullDomain}</span></p>
                  : <p className="text-xs text-gray-400">Auto-filled from store name — you can edit it</p>
              }
            </div>

            {/* Plan */}
            <div className="space-y-1.5">
              <Label htmlFor="plan">Plan <span className="text-destructive">*</span></Label>
              <AppSelect
                value={plan}
                onValueChange={setPlan}
                options={PLAN_OPTIONS}
              />
            </div>

            {/* Paid status */}
            <div className="rounded-lg border border-gray-200 px-4 py-3">
              <AppSwitch
                checked={isPaid}
                onChange={setIsPaid}
                label="Paid"
                description="Has the store owner already paid for this plan?"
              />
            </div>

            {/* Billing cycle — only relevant once paid */}
            {isPaid && (
              <div className="space-y-1.5">
                <Label htmlFor="billing_cycle">Billing cycle <span className="text-destructive">*</span></Label>
                <AppSelect
                  value={billingCycle}
                  onValueChange={setBillingCycle}
                  options={BILLING_CYCLE_OPTIONS}
                />
              </div>
            )}

            {/* Address */}
            <div className="space-y-1.5">
              <Label htmlFor="address">Address <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
              <Input
                id="address"
                placeholder="123 Main Street, City"
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
            </div>

            {/* Min order + Delivery radius */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="min_order_amount">Min order <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                  <Input
                    id="min_order_amount"
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    className="pl-7"
                    value={minOrderAmount}
                    onChange={e => setMinOrderAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="delivery_radius">Delivery radius <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
                <div className="relative">
                  <Input
                    id="delivery_radius"
                    type="number"
                    min={0}
                    step={0.1}
                    placeholder="0"
                    className="pr-10"
                    value={deliveryRadius}
                    onChange={e => setDeliveryRadius(e.target.value)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">km</span>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white mt-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader className="w-4 h-4 animate-spin mr-2" /> : null}
              {isSubmitting ? 'Creating store…' : 'Create store'}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          WhatsApp integration can be configured in settings.
        </p>
      </div>
    </div>
  )
}
