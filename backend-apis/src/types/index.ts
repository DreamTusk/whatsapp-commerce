export interface CartItem {
  variantId?: string;
  productId: string;
  name: string;
  price: number;
  unit?: string;
  quantity: number;
  catalogProductId?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  unit?: string;
  subtotal: number;
}

export interface OrderFilters {
  status?: string;
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
}

export interface StoreStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  codOrders: number;
  onlineOrders: number;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

export interface MessageInput {
  messageText: string;
  selectedId: string | null;
  location: LocationData | null;
}

export interface WhatsAppButton {
  id: string;
  title: string;
}

export interface WhatsAppListRow {
  id: string;
  title: string;
  description?: string;
}

export interface WhatsAppSection {
  title: string;
  rows: WhatsAppListRow[];
}

export interface CatalogProductItem {
  product_retailer_id: string;
  item_name?: string;
  item_price: string;
  quantity: string;
}

export interface CatalogOrderData {
  product_items: CatalogProductItem[];
}

export interface WhatsAppMessage {
  id: string;
  from: string;
  type: string;
  text?: { body: string };
  interactive?: {
    type: string;
    list_reply?: { id: string; title: string };
    button_reply?: { id: string; title: string };
    nfm_reply?: CatalogOrderData;
  };
  order?: CatalogOrderData;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}
