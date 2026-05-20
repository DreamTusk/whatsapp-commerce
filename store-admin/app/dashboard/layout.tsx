'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  LayoutDashboard, ShoppingBag, Package, Tag, Users, Settings,
  LogOut, Pencil, Trash2, Menu, X, Loader2, Store, ImagePlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/api'
import { auth } from '@/lib/auth'
import type { Store as StoreType } from '@/types'

const NAV_ITEMS = [
  { label: 'Dashboard',  href: '/dashboard',            icon: LayoutDashboard },
  { label: 'Orders',     href: '/dashboard/orders',     icon: ShoppingBag },
  { label: 'Products',   href: '/dashboard/products',   icon: Package },
  { label: 'Categories', href: '/dashboard/categories', icon: Tag },
  { label: 'Customers',  href: '/dashboard/customers',  icon: Users },
  { label: 'Settings',   href: '/dashboard/settings',   icon: Settings },
]

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()

  const [store, setStore]             = useState<StoreType | null>(null)
  const [storeLoading, setStoreLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Edit modal
  const [editOpen, setEditOpen]         = useState(false)
  const [isSaving, setIsSaving]         = useState(false)
  const [editName, setEditName]         = useState('')
  const [editPhone, setEditPhone]       = useState('')
  const [editAddress, setEditAddress]   = useState('')
  const [editMinOrder, setEditMinOrder] = useState('')
  const [editRadius, setEditRadius]     = useState('')
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null)
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null)

  // Delete modal
  const [deleteOpen, setDeleteOpen]   = useState(false)
  const [isDeleting, setIsDeleting]   = useState(false)

  const [user, setUser] = useState<import('@/types').User | null>(null)
  useEffect(() => { setUser(auth.getUser()) }, [])

  useEffect(() => {
    api.get('/api/store')
      .then(res => setStore(res.data.store))
      .catch(err => {
        if (err.response?.status === 404) router.push('/create-store')
      })
      .finally(() => setStoreLoading(false))
  }, [router])

  function openEdit() {
    if (!store) return
    setEditName(store.name)
    setEditPhone(store.phone)
    setEditAddress(store.address ?? '')
    setEditMinOrder(String(store.min_order_amount ?? 0))
    setEditRadius(store.delivery_radius != null ? String(store.delivery_radius) : '')
    setEditLogoFile(null)
    setEditLogoPreview(null)
    setEditOpen(true)
  }

  function handleEditLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setEditLogoFile(file)
    setEditLogoPreview(file ? URL.createObjectURL(file) : null)
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      const formData = new FormData()
      if (editName)    formData.append('name', editName)
      if (editPhone)   formData.append('phone', editPhone)
      if (editAddress) formData.append('address', editAddress)
      formData.append('min_order_amount', editMinOrder || '0')
      if (editRadius)    formData.append('delivery_radius', editRadius)
      if (editLogoFile)  formData.append('logo', editLogoFile)

      const res = await api.put('/api/store', formData)
      setStore(res.data.store)
      setEditOpen(false)
      toast.success('Store updated.')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to update store.'
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await api.delete('/api/store')
      toast.success('Store deleted.')
      auth.clear()
      router.push('/login')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to delete store.'
      toast.error(msg)
    } finally {
      setIsDeleting(false)
    }
  }

  function handleLogout() {
    const refreshToken = auth.getRefreshToken()
    if (refreshToken) {
      api.post('/api/auth/logout', { refresh_token: refreshToken }).catch(() => {})
    }
    auth.clear()
    router.push('/login')
  }

  // Sidebar JSX — rendered in both desktop aside and mobile overlay
  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#25D366] rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-xs">DT</span>
          </div>
          <span className="font-bold text-gray-900">DT Commerce</span>
        </div>
      </div>

      {/* Store card */}
      <div className="px-4 py-3 border-b border-gray-100">
        {storeLoading ? (
          <div className="flex items-center gap-3 animate-pulse">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-gray-100 rounded w-3/4" />
              <div className="h-2.5 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        ) : store ? (
          <>
            <div className="flex items-center gap-3 mb-2.5">
              {store.logo ? (
                <img src={store.logo} alt={store.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 bg-[#25D366]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Store className="w-5 h-5 text-[#25D366]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{store.name}</p>
                <p className="text-xs text-gray-400 truncate">{store.phone}</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={openEdit}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg py-1.5 transition-colors"
              >
                <Pencil className="w-3 h-3" /> Edit
              </button>
              <button
                onClick={() => setDeleteOpen(true)}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg py-1.5 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          </>
        ) : null}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#25D366]/10 text-[#25D366]'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User + logout */}
      <div className="px-4 py-4 border-t border-gray-100">
        {user && (
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-gray-600">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-white border-r border-gray-100 flex-shrink-0">
        {sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl z-50">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:bg-gray-50"
            >
              <X className="w-4 h-4" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-50"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#25D366] rounded flex items-center justify-center">
              <span className="text-white font-bold text-[10px]">DT</span>
            </div>
            <span className="font-bold text-gray-900 text-sm">DT Commerce</span>
          </div>
          {store && (
            <span className="ml-auto text-xs text-gray-400 truncate max-w-[120px]">{store.name}</span>
          )}
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* ── Edit Store Modal ── */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Edit store</h3>
              <button onClick={() => setEditOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Logo */}
            <div className="space-y-1.5">
              <Label>Logo</Label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="w-14 h-14 rounded-xl border-2 border-dashed border-gray-200 group-hover:border-[#25D366] flex items-center justify-center overflow-hidden transition-colors flex-shrink-0">
                  {editLogoPreview ? (
                    <img src={editLogoPreview} alt="preview" className="w-full h-full object-cover" />
                  ) : store?.logo ? (
                    <img src={store.logo} alt="logo" className="w-full h-full object-cover" />
                  ) : (
                    <ImagePlus className="w-5 h-5 text-gray-300 group-hover:text-[#25D366] transition-colors" />
                  )}
                </div>
                <span className="text-sm text-gray-500 group-hover:text-gray-700">
                  {editLogoPreview ? 'Change logo' : 'Upload logo'}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={handleEditLogoChange} />
              </label>
            </div>

            <div className="space-y-1.5">
              <Label>Store name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={editAddress} onChange={e => setEditAddress(e.target.value)} placeholder="Optional" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Min order (₹)</Label>
                <Input type="number" min={0} value={editMinOrder} onChange={e => setEditMinOrder(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Delivery radius (km)</Label>
                <Input type="number" min={0} step={0.1} value={editRadius} onChange={e => setEditRadius(e.target.value)} placeholder="Optional" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-[#25D366] hover:bg-[#1ebe5d] text-white"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isSaving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete store?</h3>
                <p className="text-sm text-gray-500">This cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              All data for <span className="font-semibold">{store?.name}</span> — products, orders and customers — will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteOpen(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isDeleting ? 'Deleting…' : 'Delete store'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
