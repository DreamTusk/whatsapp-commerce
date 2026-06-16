import { ShoppingBag, Package, Users, Settings, Truck, Layout, Archive, Bookmark, Tag, Layers, Image } from '@deemlol/next-icons'

/**
 * roles: [] — visible to everyone
 * roles: ['OWNER'] — visible only to listed roles
 *
 * To enable a nav item for more roles later, just add the role to the array.
 */
export const NAV_ITEMS = [
  { label: 'Dashboard',        href: '/dashboard',             icon: Layout,      roles: ['OWNER'] },
  { label: 'Orders',           href: '/dashboard/orders',      icon: ShoppingBag, roles: [] },
  { label: 'Shipments',        href: '/dashboard/shipments',   icon: Truck,       roles: [] },
  { label: 'Products',         href: '/dashboard/products',    icon: Package,     roles: [] },
  { label: 'Inventory',        href: '/dashboard/inventory',   icon: Archive,     roles: [] },
  { label: 'Brands',           href: '/dashboard/brands',      icon: Bookmark,    roles: [] },
  { label: 'Categories',       href: '/dashboard/categories',  icon: Tag,         roles: [] },
  { label: 'Collections',      href: '/dashboard/collections', icon: Layers,      roles: [] },
  { label: 'Banners',          href: '/dashboard/banners',     icon: Image,       roles: [] },
  { label: 'Customers',        href: '/dashboard/customers',   icon: Users,       roles: [] },
  { label: 'Settings',         href: '/dashboard/settings',    icon: Settings,    roles: ['OWNER'] },
]
