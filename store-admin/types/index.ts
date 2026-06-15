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
  is_active: boolean
  is_pickup_enabled: boolean
  is_home_delivery_enabled: boolean
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
  image_url: string | null
  is_active: boolean
  parent_id: string | null
  store_id: string
  created_at: string
  children: Category[]
}

export interface Brand {
  id: string
  name: string
  product_count: number
  created_at: string
}

export interface ProductMediaItem {
  id: string
  media_id: string
  url: string | null
  thumbnail_url: string | null
  is_primary: boolean
  sort_order: number
}

export interface Product {
  id: string
  name: string
  description: string | null
  image_url: string | null
  images: ProductMediaItem[]
  is_active: boolean
  selling_price: number
  original_price: number | null
  in_stock: boolean
  discount_percent: number | null
  unit: string | null
  brand: { id: string; name: string } | null
  category: { id: string; name: string }
  store_id: string
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  product_id: string
  product_name: string
  price: number
  quantity: number
  subtotal: number
}

export interface Payment {
  id: string
  method: 'COD' | 'ONLINE'
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
  razorpay_order_id: string | null
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
  source: 'CUSTOMER' | 'MANUAL'
  created_by: string | null
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
  delivery_type: 'PICKUP' | 'HOME_DELIVERY'
  expected_pickup_time: string | null
  delivery_notes: string | null
  alt_phone: string | null
  cancellation_reason: string | null
  cancelled_by: string | null
  created_at: string
  updated_at: string
  customer: { name: string | null; phone: string | null }
  items: OrderItem[]
  payment: Payment | null
}

export interface CollectionFilter {
  field: 'price' | 'category_id' | 'brand_id' | 'name' | 'in_stock'
  operator: 'eq' | 'lt' | 'lte' | 'gt' | 'gte' | 'contains'
  value: string | number | boolean
}

export interface CollectionCriteria {
  match: 'all' | 'any'
  filters: CollectionFilter[]
}

export interface Collection {
  id: string
  name: string
  type: 'manual' | 'auto'
  criteria: CollectionCriteria | null
  is_active: boolean
  display_order: number
  image_url: string | null
  product_count?: number
  created_at: string
  updated_at: string
}

export interface Banner {
  id: string
  name: string
  type: 'product' | 'collection' | 'url' | 'category'
  image_url: string | null
  status: 'active' | 'inactive' | 'expired'
  display_order: number
  product_id: string | null
  collection_id: string | null
  category_id: string | null
  url: string | null
  starts_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface StoreUser {
  id: string
  user_id: string
  name: string
  email: string
  role: string
  is_active: boolean
  joined_at: string
}

export interface StoreInvite {
  id: string
  email: string
  role: string
  expires_at: string
  created_at: string
}

export interface PaymentProvider {
  id: string
  provider: string
  key_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ApiError {
  error: string
}
