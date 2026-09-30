import { apiRequest } from './api'

export type DashboardKpis = {
  totalSkus: number
  avgFreshness: number | null
  activeAlerts: number
  scansToday: number
}

export type FreshnessSegment = {
  label: string
  value: number
  count: number
  color: string
}

export type DashboardData = {
  windowDays?: number
  kpis: DashboardKpis
  freshnessMix: FreshnessSegment[]
  scanVolume: Array<{ label: string; value: number; day: string }>
  shelfHealth: Array<{
    shelfId: string
    name: string
    pct: number
    itemCount: number
    lastScannedAt: string | null
  }>
  avgShelfScore: number | null
  topAlert: { title: string; message: string; severity: string } | null
  hasData: boolean
}

export type AnalyticsData = {
  windowDays: number
  wastePct: number
  itemsSaved: number
  scanCount: number
  avgConfidence: number | null
  wasteByProduct: Array<{
    product: string
    wastePct: number
    spoiled: number
    total: number
  }>
  hasData: boolean
}

export type InventoryItem = {
  product: string
  stock: number
  fresh: number
  ripe: number
  spoiled: number
  freshnessPct: number
  status: 'Fresh' | 'Ripe' | 'Spoiled' | 'Unknown'
  lowStock: boolean
  lastSeen: string
}

export type InventoryData = {
  windowDays: number
  lowStockThreshold: number
  items: InventoryItem[]
  hasData: boolean
}

export type DashboardAlert = {
  id: string
  type: 'LOW_STOCK' | 'SPOILAGE' | 'FRESHNESS_RISK' | 'STALE_SHELF'
  severity: 'critical' | 'warning' | 'info'
  title: string
  message: string
  createdAt: string
  status: 'active' | 'resolved'
  resolvedAt?: string
  /** 'user' = the owner resolved it, 'auto' = the condition cleared on its own. */
  resolvedBy?: 'user' | 'auto'
  resolvedByName?: string
  /** When the alert was first raised; createdAt tracks the latest evidence. */
  raisedAt?: string
  shelfName?: string
  productLabel?: string
}

export type AlertsData = {
  /** Number of active alerts; `alerts` also holds recently resolved ones. */
  count: number
  alerts: DashboardAlert[]
}

export async function getDashboard(businessId: string, days = 7) {
  return apiRequest<DashboardData>(
    `/businesses/${businessId}/dashboard?days=${days}`,
    {},
    true,
  )
}

export async function getAnalytics(businessId: string, days = 7) {
  return apiRequest<AnalyticsData>(
    `/businesses/${businessId}/analytics?days=${days}`,
    {},
    true,
  )
}

export async function getInventory(businessId: string, days = 7) {
  return apiRequest<InventoryData>(
    `/businesses/${businessId}/inventory?days=${days}`,
    {},
    true,
  )
}

export async function getAlerts(businessId: string) {
  return apiRequest<AlertsData>(`/businesses/${businessId}/alerts`, {}, true)
}

/** Fired after an alert is resolved so badges can refresh without waiting for the next poll. */
export const ALERTS_CHANGED_EVENT = 'snapstock:alerts-changed'

export async function resolveAlert(businessId: string, alertId: string) {
  const res = await apiRequest<{ id: string; resolvedAt: string }>(
    `/businesses/${businessId}/alerts/${alertId}/resolve`,
    { method: 'PATCH' },
    true,
  )
  window.dispatchEvent(new CustomEvent(ALERTS_CHANGED_EVENT))
  return res
}

export async function getAlertsCount(businessId: string) {
  return apiRequest<{ count: number }>(
    `/businesses/${businessId}/alerts?countOnly=1`,
    {},
    true,
  )
}
