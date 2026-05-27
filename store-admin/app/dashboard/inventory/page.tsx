'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Loader2, Warehouse, Search } from 'lucide-react'
import api from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

type Product = {
  id: string
  name: string
  image_url: string | null
  selling_price: number
  in_stock: boolean
  is_active: boolean
  category: { id: string; name: string }
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)

  const fetchInventory = useCallback(async () => {
    try {
      const res = await api.get('/api/inventory')
      setProducts(res.data.products)
    } catch {
      toast.error('Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchInventory() }, [fetchInventory])

  async function toggleStock(product: Product) {
    setToggling(product.id)
    try {
      await api.patch(`/api/inventory/${product.id}`, { in_stock: !product.in_stock })
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, in_stock: !p.in_stock } : p))
      toast.success(`Marked as ${product.in_stock ? 'out of stock' : 'in stock'}`)
    } catch {
      toast.error('Failed to update stock status')
    } finally {
      setToggling(null)
    }
  }

  const filtered = products.filter(p => {
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.category.name.toLowerCase().includes(q)
  })

  const outCount = products.filter(p => !p.in_stock).length

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-6 pt-6 pb-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[26px] font-bold text-gray-900">Inventory</h1>
            <p className="text-base text-gray-500 mt-0.5">{products.length} products</p>
          </div>
          {outCount > 0 && (
            <span className="text-base font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-600">
              {outCount} out of stock
            </span>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 px-6 pb-4 bg-gray-50">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search product or category…"
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
          <Warehouse className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-xl font-medium">{search ? 'No matches' : 'No products'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full text-base min-w-[700px]">
            <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide">Product</th>
                <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide">Price</th>
                <th className="text-left px-4 py-3 text-base font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 w-28"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(product => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {product.image_url ? (
                        <img src={product.image_url.startsWith('http') ? product.image_url : `${API_URL}${product.image_url}`} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex-shrink-0" />
                      )}
                      <p className="font-medium text-gray-900">{product.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{product.category.name}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">₹{product.selling_price}</td>
                  <td className="px-4 py-3">
                    <span className={`text-base font-medium px-2.5 py-1 rounded-full ${product.in_stock ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                      {product.in_stock ? 'In stock' : 'Out of stock'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleStock(product)}
                      disabled={toggling === product.id}
                      className="h-9 text-[14px] px-3 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {toggling === product.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : product.in_stock ? 'Mark out' : 'Mark in'
                      }
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="flex-shrink-0 px-4 py-2.5 bg-gray-50 rounded-b-2xl border-t border-gray-100">
            <p className="text-base text-gray-500">{filtered.length} products</p>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
