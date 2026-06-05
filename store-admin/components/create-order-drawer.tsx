'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { X, Search, Plus, Minus, Trash2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/api'
import { auth } from '@/lib/auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface Customer { id: string; name: string | null; phone: string | null }
interface Product {
  id: string; name: string; image_url: string | null
  selling_price: number; in_stock: boolean
  category: { id: string; name: string }
}
interface CartItem { product: Product; quantity: number }

interface AddressForm {
  door_no: string; street: string; area: string
  city: string; pincode: string; state: string; country: string
}

const EMPTY_ADDR: AddressForm = { door_no: '', street: '', area: '', city: '', pincode: '', state: '', country: '' }

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

type Step = 1 | 2 | 3

export default function CreateOrderDrawer({ open, onClose, onCreated }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [submitting, setSubmitting] = useState(false)

  // Step 1 — Customer
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [customerSearching, setCustomerSearching] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isNewCustomer, setIsNewCustomer] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null) // kept for future use

  // Step 2 — Products
  const [productSearch, setProductSearch] = useState('')
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [productResults, setProductResults] = useState<Product[]>([])
  const [productSearching, setProductSearching] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const productDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Step 3 — Details
  const [address, setAddress] = useState<AddressForm>(EMPTY_ADDR)
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'ONLINE'>('COD')
  const [notes, setNotes] = useState('')

  const user = auth.getUser()

  function reset() {
    setStep(1)
    setCustomerSearch(''); setCustomerResults([]); setSelectedCustomer(null)
    setIsNewCustomer(false); setNewName(''); setNewPhone('')
    setProductSearch(''); setProductResults([]); setCart([])
    setAddress(EMPTY_ADDR); setPaymentMethod('COD'); setNotes('')
  }

  function handleClose() { reset(); onClose() }

  // Load all customers when step 1 opens
  const [allCustomers, setAllCustomers] = useState<Customer[]>([])
  useEffect(() => {
    if (!open || step !== 1 || isNewCustomer) return
    setCustomerSearching(true)
    api.get('/api/customers')
      .then(res => {
        const customers = res.data.customers ?? []
        setAllCustomers(customers)
        setCustomerResults(customers)
      })
      .catch(() => { setAllCustomers([]); setCustomerResults([]) })
      .finally(() => setCustomerSearching(false))
  }, [open, step, isNewCustomer])

  // Customer search — client-side filter
  useEffect(() => {
    const q = customerSearch.trim().toLowerCase()
    if (!q) { setCustomerResults(allCustomers); return }
    setCustomerResults(allCustomers.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    ))
  }, [customerSearch, allCustomers])

  // Load all products when step 2 opens
  useEffect(() => {
    if (!open || step !== 2) return
    setProductSearching(true)
    api.get('/api/products')
      .then(res => {
        const products = res.data.products ?? []
        setAllProducts(products)
        setProductResults(products)
      })
      .catch(() => { setAllProducts([]); setProductResults([]) })
      .finally(() => setProductSearching(false))
  }, [open, step])

  // Product search — client-side filter on loaded list
  useEffect(() => {
    const q = productSearch.trim().toLowerCase()
    if (!q) { setProductResults(allProducts); return }
    setProductResults(allProducts.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category?.name.toLowerCase().includes(q)
    ))
  }, [productSearch, allProducts])

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product, quantity: 1 }]
    })
  }

  function updateQty(productId: string, delta: number) {
    setCart(prev => prev
      .map(i => i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i)
      .filter(i => i.quantity > 0)
    )
  }

  const total = cart.reduce((sum, i) => sum + i.product.selling_price * i.quantity, 0)

  const step1Valid = isNewCustomer ? newPhone.trim().length >= 10 : !!selectedCustomer
  const step2Valid = cart.length > 0
  const addrValid = Object.values(address).every(v => v.trim())

  async function placeOrder() {
    if (!addrValid) { toast.error('Please fill all address fields'); return }
    setSubmitting(true)
    try {
      const payload: any = {
        items: cart.map(i => ({ product_id: i.product.id, quantity: i.quantity })),
        address: {
          door_no: address.door_no.trim(), street: address.street.trim(),
          area: address.area.trim(), city: address.city.trim(),
          pincode: address.pincode.trim(), state: address.state.trim(), country: address.country.trim(),
        },
        payment_method: paymentMethod,
        notes: notes.trim() || undefined,
      }
      if (isNewCustomer) {
        payload.new_customer = { name: newName.trim() || undefined, phone: newPhone.trim() }
      } else {
        payload.customer_id = selectedCustomer!.id
      }
      await api.post('/api/orders', payload)
      toast.success('Order created successfully')
      reset()
      onCreated()
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to create order')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-full max-w-3xl bg-white flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-bold text-gray-900 text-lg">Create Order</h2>
          <button onClick={handleClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100 flex-shrink-0">
          {(['Customer', 'Products', 'Details'] as const).map((label, i) => {
            const n = i + 1 as Step
            const done = step > n
            const active = step === n
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${active ? 'text-[#6366f1]' : done ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${active ? 'bg-[#6366f1] text-white' : done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                    {done ? '✓' : n}
                  </div>
                  {label}
                </div>
                {i < 2 && <div className="w-6 h-px bg-gray-200" />}
              </div>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0">

          {/* ── Step 1: Customer ── */}
          {step === 1 && (
            <>
              {/* Sticky search/toggle */}
              <div className="flex-shrink-0 px-6 pt-5 pb-3 border-b border-gray-100 space-y-3 bg-white">
                <div className="flex gap-2">
                  <button
                    onClick={() => { setIsNewCustomer(false); setSelectedCustomer(null) }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${!isNewCustomer ? 'border-[#6366f1] bg-[#6366f1]/5 text-[#6366f1]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  >
                    Existing customer
                  </button>
                  <button
                    onClick={() => { setIsNewCustomer(true); setSelectedCustomer(null); setCustomerSearch('') }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${isNewCustomer ? 'border-[#6366f1] bg-[#6366f1]/5 text-[#6366f1]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  >
                    <UserPlus className="w-3.5 h-3.5 inline mr-1.5" />
                    New customer
                  </button>
                </div>
                {!isNewCustomer && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search by name or phone…"
                      value={customerSearch}
                      onChange={e => setCustomerSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                )}
              </div>

              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto">
                {!isNewCustomer ? (
                  <div className="px-6 py-4 space-y-3">
                    {/* Selected customer card — shown instead of list */}
                    {selectedCustomer ? (
                      <div className="flex items-center gap-3 p-3 bg-[#6366f1]/5 rounded-xl border border-[#6366f1]/20">
                        <div className="w-8 h-8 rounded-full bg-[#6366f1]/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-[#6366f1]">{(selectedCustomer.name ?? selectedCustomer.phone ?? '?').charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{selectedCustomer.name ?? '—'}</p>
                          <p className="text-xs text-gray-500">{selectedCustomer.phone}</p>
                        </div>
                        <button
                          onClick={() => { setSelectedCustomer(null); setCustomerSearch('') }}
                          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        {customerSearching && <p className="text-xs text-gray-400 text-center py-4">Loading…</p>}
                        {customerResults.length > 0 && (
                          <div className="border border-gray-100 rounded-xl overflow-hidden">
                            {customerResults.map(c => (
                              <button
                                key={c.id}
                                onClick={() => { setSelectedCustomer(c); setCustomerSearch('') }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-50 last:border-0 hover:bg-gray-50"
                              >
                                <div className="w-8 h-8 rounded-full bg-[#6366f1]/10 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-bold text-[#6366f1]">{(c.name ?? c.phone ?? '?').charAt(0).toUpperCase()}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{c.name ?? '—'}</p>
                                  <p className="text-xs text-gray-400">{c.phone}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        {!customerSearching && customerResults.length === 0 && (
                          <p className="text-xs text-gray-400 text-center py-6">No customers found</p>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="px-6 py-4 space-y-3">
                    <div className="space-y-1.5">
                      <Label>Name <span className="text-gray-400 text-xs">(optional)</span></Label>
                      <Input placeholder="Customer name" value={newName} onChange={e => setNewName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Phone <span className="text-red-500">*</span></Label>
                      <Input placeholder="9876543210" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Step 2: Products ── */}
          {step === 2 && (
            <>
              {/* Sticky search */}
              <div className="flex-shrink-0 px-6 pt-5 pb-3 border-b border-gray-100 bg-white">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search products…"
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {productSearching && <p className="text-xs text-gray-400 text-center py-4">Loading…</p>}

                {productResults.length > 0 && (
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    {productResults.map(p => (
                      <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                          {p.image_url
                            ? <img src={p.image_url.startsWith('http') ? p.image_url : `${API_URL}${p.image_url}`} className="w-full h-full object-cover" alt={p.name} />
                            : <div className="w-full h-full flex items-center justify-center text-sm">🛍️</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                          <p className="text-xs text-gray-400">₹{p.selling_price}</p>
                        </div>
                        <button
                          onClick={() => addToCart(p)}
                          disabled={!p.in_stock}
                          className="flex items-center gap-1 text-xs font-semibold text-[#6366f1] bg-[#6366f1]/10 hover:bg-[#6366f1]/20 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                        >
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {cart.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Added items</p>
                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                      {cart.map(({ product, quantity }) => (
                        <div key={product.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                            <p className="text-xs text-gray-400">₹{product.selling_price} × {quantity} = ₹{product.selling_price * quantity}</p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button onClick={() => updateQty(product.id, -1)} className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                              {quantity === 1 ? <Trash2 className="w-3 h-3 text-red-400" /> : <Minus className="w-3 h-3" />}
                            </button>
                            <span className="w-6 text-center text-sm font-semibold">{quantity}</span>
                            <button onClick={() => updateQty(product.id, 1)} className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center px-1">
                      <span className="text-sm font-semibold text-gray-600">Total</span>
                      <span className="text-base font-bold text-gray-900">₹{total}</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Step 3: Details ── */}
          {step === 3 && (
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Order summary</p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">{isNewCustomer ? (newName || newPhone) : (selectedCustomer?.name ?? selectedCustomer?.phone)}</span>
                  {!isNewCustomer && selectedCustomer?.phone && <span className="text-gray-400 ml-1.5">· {selectedCustomer.phone}</span>}
                </p>
                {cart.map(({ product, quantity }) => (
                  <div key={product.id} className="flex justify-between text-sm text-gray-600">
                    <span>{product.name} × {quantity}</span>
                    <span>₹{product.selling_price * quantity}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200 mt-1">
                  <span>Total</span><span>₹{total}</span>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700">Delivery Address <span className="text-red-500">*</span></p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Door No</Label>
                    <Input placeholder="12A" value={address.door_no} onChange={e => setAddress(a => ({ ...a, door_no: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Street</Label>
                    <Input placeholder="MG Road" value={address.street} onChange={e => setAddress(a => ({ ...a, street: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Area / Landmark</Label>
                  <Input placeholder="Near City Mall…" value={address.area} onChange={e => setAddress(a => ({ ...a, area: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">City</Label>
                    <Input placeholder="Bengaluru" value={address.city} onChange={e => setAddress(a => ({ ...a, city: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Pincode</Label>
                    <Input placeholder="560001" value={address.pincode} onChange={e => setAddress(a => ({ ...a, pincode: e.target.value.replace(/\D/g, '') }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">State</Label>
                    <Input placeholder="Karnataka" value={address.state} onChange={e => setAddress(a => ({ ...a, state: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Country</Label>
                    <Input placeholder="India" value={address.country} onChange={e => setAddress(a => ({ ...a, country: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Payment method</p>
                <div className="flex gap-3">
                  {(['COD', 'ONLINE'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors ${paymentMethod === m ? 'border-[#6366f1] bg-[#6366f1]/5 text-[#6366f1]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                    >
                      {m === 'COD' ? 'Cash on Delivery' : 'Online'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label>Notes <span className="text-gray-400 text-xs">(optional)</span></Label>
                <textarea
                  rows={2}
                  placeholder="Call before delivery…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-[#6366f1] resize-none"
                />
              </div>

              {/* Created by */}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="font-medium text-gray-700">Created by:</span>
                <span>{user?.name ?? 'You'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep((s) => (s - 1) as Step)} className="flex-1">
              ← Back
            </Button>
          )}
          {step < 3 ? (
            <Button
              onClick={() => setStep((s) => (s + 1) as Step)}
              disabled={step === 1 ? !step1Valid : !step2Valid}
              className="flex-1 bg-[#6366f1] hover:bg-[#4f46e5] text-white"
            >
              Next →
            </Button>
          ) : (
            <Button
              onClick={placeOrder}
              disabled={submitting || !addrValid}
              className="flex-1 bg-[#6366f1] hover:bg-[#4f46e5] text-white"
            >
              {submitting ? 'Placing…' : 'Place Order ✓'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
