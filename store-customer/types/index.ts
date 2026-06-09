export interface Banner {
  id: string
  name: string
  type: 'product' | 'collection' | 'url'
  image_url: string | null
  product_id: string | null
  collection_id: string | null
  url: string | null
}

export interface StoreCollection {
  id: string
  name: string
  type: 'manual' | 'auto'
  image_url: string | null
  products: Product[]
}

export interface Category {
  id: string
  name: string
  name_local: string | null
  image_url: string | null
  sort_order: number
}

export interface ProductImage {
  url: string | null
  thumbnail_url: string | null
  is_primary: boolean
}

export interface Product {
  id: string
  name: string
  name_local: string | null
  description: string | null
  image_url: string | null
  images: ProductImage[]
  unit: string | null
  in_stock: boolean
  sort_order: number
  category_id: string
  category: { id: string; name: string; name_local: string | null } | null
  brand: { id: string; name: string } | null
  selling_price: number
  original_price: number | null
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
}

export interface CartItem {
  id: string
  quantity: number
  product: {
    id: string
    name: string
    name_local: string | null
    image_url: string | null
    selling_price: number
    original_price: number | null
    in_stock: boolean
  }
}

export interface Cart {
  items: CartItem[]
  total: number
}

export interface CustomerAddress {
  id: string
  label: string | null
  address: string | null
  door_no: string | null
  street: string | null
  city: string | null
  state: string | null
  country: string | null
  pincode: string | null
  latitude: number | null
  longitude: number | null
  is_default: boolean
  created_at: string
}

export interface WishlistItem {
  id: string
  product: {
    id: string
    name: string
    name_local: string | null
    image_url: string | null
    in_stock: boolean
    selling_price: number
    original_price: number | null
  }
}

export interface OrderItem {
  id: string
  product_id: string
  product_name: string
  price: number
  quantity: number
  subtotal: number
  image_url: string | null
}

export interface Payment {
  method: 'COD' | 'ONLINE'
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
  paid_at: string | null
}

export interface Order {
  id: string
  order_number: string
  total_amount: number
  status: 'NEW' | 'CONFIRMED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'
  address: string | null
  notes: string | null
  cancellation_reason: string | null
  cancelled_by: string | null
  created_at: string
  items: OrderItem[]
  payment: Payment | null
}
