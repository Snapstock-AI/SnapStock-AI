import {
  AlertTriangle,
  BarChart3,
  Camera,
  History,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBasket,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  ownerOnly?: boolean
}

export const homeNav: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/dashboard/inventory', label: 'Inventory', icon: Package },
  { to: '/dashboard/scans', label: 'Scans', icon: Camera, end: true },
  { to: '/dashboard/scans/history', label: 'History', icon: History },
  { to: '/dashboard/alerts', label: 'Alerts', icon: AlertTriangle },
  { to: '/dashboard/shelves', label: 'Shelves', icon: ShoppingBasket },
]

export const manageNav: NavItem[] = [
  { to: '/dashboard/analytics', label: 'Analytics', icon: BarChart3, ownerOnly: true },
  { to: '/dashboard/invitations', label: 'Team', icon: Users, ownerOnly: true },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export function isNavActive(pathname: string, item: Pick<NavItem, 'to' | 'end'>) {
  return item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`)
}
