import {
  LayoutDashboard, ShoppingBag, Package, Tag,
  Users, Settings, BookMarked, Warehouse, Layers, Image,
} from 'lucide-react'

/**
 * roles: [] — visible to everyone
 * roles: ['OWNER'] — visible only to listed roles
 *
 * To enable a nav item for more roles later, just add the role to the array.
 */
export const NAV_ITEMS = [
  { label: 'Dashboard',        href: '/dashboard',             icon: LayoutDashboard, roles: ['OWNER'] },
  { label: 'Orders',           href: '/dashboard/orders',      icon: ShoppingBag,     roles: [] },
  { label: 'Products',         href: '/dashboard/products',    icon: Package,         roles: [] },
  { label: 'Inventory',        href: '/dashboard/inventory',   icon: Warehouse,       roles: [] },
  { label: 'Brands',           href: '/dashboard/brands',      icon: BookMarked,      roles: [] },
  { label: 'Categories',       href: '/dashboard/categories',  icon: Tag,             roles: [] },
  { label: 'Collections',      href: '/dashboard/collections', icon: Layers,          roles: [] },
  { label: 'Banners',          href: '/dashboard/banners',     icon: Image,           roles: [] },
  { label: 'Customers',        href: '/dashboard/customers',   icon: Users,           roles: [] },
  { label: 'Settings',         href: '/dashboard/settings',    icon: Settings,        roles: ['OWNER'] },
]
