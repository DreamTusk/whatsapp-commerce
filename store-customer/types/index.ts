export interface Category {
  id: string
  name: string
  name_local: string | null
  image_url: string | null
  sort_order: number
}

export interface ProductVariant {
  id: string
  name: string
  selling_price: number
  original_price: number | null
  unit: string | null
  in_stock: boolean
}

export interface Product {
  id: string
  name: string
  name_local: string | null
  description: string | null
  image_url: string | null
  in_stock: boolean
  sort_order: number
  category_id: string
  price_range: { min: number; max: number } | null
  variants: ProductVariant[]
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
  variant: {
    id: string
    name: string
    selling_price: number
    original_price: number | null
    unit: string | null
    in_stock: boolean
  }
  product: {
    id: string
    name: string
    name_local: string | null
    image_url: string | null
  }
}

export interface Cart {
  items: CartItem[]
  total: number
}

export interface WishlistItem {
  id: string
  product: {
    id: string
    name: string
    name_local: string | null
    image_url: string | null
    in_stock: boolean
    price: number
    original_price: number | null
    unit: string | null
    price_range: { min: number; max: number } | null
  }
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
  created_at: string
  items: OrderItem[]
  payment: Payment | null
}
