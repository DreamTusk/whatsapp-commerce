export interface User {
  id: string
  name: string
  email: string
}

export interface Store {
  id: string
  name: string
  phone: string
  domain: string | null
  logo: string | null
  address: string | null
  min_order_amount: number
  delivery_radius: number | null
  whatsapp_phone_number_id: string | null
  whatsapp_business_account_id: string | null
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
  store?: Store | null
}

export interface Category {
  id: string
  name: string
  name_local: string | null
  image_url: string | null
  sort_order: number
  is_active: boolean
  store_id: string
  created_at: string
}

export interface Brand {
  id: string
  name: string
  product_count: number
  created_at: string
}

export interface ProductVariant {
  id: string
  product_id: string
  name: string
  cost_price: number | null
  original_price: number | null
  selling_price: number
  tax_percentage: number
  unit: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
  inventory: {
    qty: number
    out_of_stock_level: number
    updated_at: string
  } | null
}

export interface Product {
  id: string
  name: string
  name_local: string | null
  description: string | null
  image_url: string | null
  is_active: boolean
  sort_order: number
  brand: { id: string; name: string } | null
  category: { id: string; name: string }
  store_id: string
  variant_count: number
  price_range: { min: number; max: number } | null
  in_stock: boolean
  created_at: string
  updated_at: string
  variants?: ProductVariant[]
}

export interface InventoryItem {
  id: string
  qty: number
  out_of_stock_level: number
  status: 'out' | 'low' | 'in_stock'
  updated_at: string
  variant: { id: string; name: string; selling_price: number; unit: string | null }
  product: { id: string; name: string; image_url: string | null; category: { id: string; name: string } }
}

export interface OrderItem {
  id: string
  product_id: string
  product_name: string
  variant_id: string | null
  variant_name: string | null
  price: number
  quantity: number
  subtotal: number
}

export interface Payment {
  id: string
  method: 'COD' | 'ONLINE'
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
  razorpay_link_id: string | null
  razorpay_payment_id: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  order_number: string
  customer_id: string
  store_id: string
  total_amount: number
  status: 'NEW' | 'CONFIRMED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'
  address: string | null
  door_no: string | null
  street: string | null
  city: string | null
  state: string | null
  country: string | null
  pincode: string | null
  latitude: number | null
  longitude: number | null
  notes: string | null
  alt_phone: string | null
  cancellation_reason: string | null
  created_at: string
  updated_at: string
  customer: { name: string | null; phone: string | null }
  items: OrderItem[]
  payment: Payment | null
}

export interface ApiError {
  error: string
}
