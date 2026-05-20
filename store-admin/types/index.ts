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

export interface ApiError {
  error: string
}
