export interface GuestCartItem {
  product_id: string
  name: string
  image_url: string | null
  selling_price: number
  original_price: number | null
  in_stock: boolean
  quantity: number
}

const KEY = 'guest_cart'

export function getGuestCart(): GuestCartItem[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') }
  catch { return [] }
}

export function setGuestCart(items: GuestCartItem[]): void {
  localStorage.setItem(KEY, JSON.stringify(items))
}

export function addToGuestCart(product: Omit<GuestCartItem, 'quantity'>): void {
  const cart = getGuestCart()
  const existing = cart.find(i => i.product_id === product.product_id)
  if (existing) { existing.quantity += 1 }
  else { cart.push({ ...product, quantity: 1 }) }
  setGuestCart(cart)
}

export function updateGuestQty(productId: string, qty: number): void {
  const cart = getGuestCart()
  setGuestCart(
    qty <= 0
      ? cart.filter(i => i.product_id !== productId)
      : cart.map(i => i.product_id === productId ? { ...i, quantity: qty } : i)
  )
}

export function clearGuestCart(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(KEY)
}

export function guestCartCount(): number {
  return getGuestCart().reduce((sum, i) => sum + i.quantity, 0)
}
