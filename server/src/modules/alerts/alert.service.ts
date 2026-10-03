import { BusinessService } from "../business/business.service";
import { DashboardRepository } from "../dashboard/dashboard.repository";
import { AlertRepository, type AlertListRow } from "./alert.repository";
import {
  COMPUTED_ALERT_TYPES,
  buildComputedAlertCandidates,
  planAlertSync,
} from "./alert.rules";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class AlertError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export type DashboardAlert = {
  id: string;
  type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  createdAt: string;
  status: "active" | "resolved";
  resolvedAt?: string;
  /** "user" = the owner resolved it, "auto" = the condition cleared on its own. */
  resolvedBy?: "user" | "auto";
  resolvedByName?: string;
  /** When the alert was first raised; createdAt tracks the latest evidence. */
  raisedAt: string;
  shelfName?: string;
  productLabel?: string;
};

const RESOLVED_HISTORY_DAYS = 30;
const RESOLVED_HISTORY_LIMIT = 50;

export class AlertService {
  /**
   * Bring SPOILAGE / FRESHNESS_RISK / STALE_SHELF rows in the alerts table in
   * line with current scan data. LOW_STOCK is maintained by the scan pipeline.
   */
  static async syncComputedAlerts(businessId: string, now = new Date()) {
    const thresholds = await DashboardRepository.getBusinessThresholds(businessId);
    const since = new Date(now);
    since.setDate(since.getDate() - 7);

    const [byShelfProduct, shelves, lastScans, active] = await Promise.all([
      DashboardRepository.productFreshnessByShelf(businessId, since),
      DashboardRepository.listShelves(businessId),
      DashboardRepository.lastScanByShelf(businessId),
      AlertRepository.listActiveByTypes(businessId, COMPUTED_ALERT_TYPES),
    ]);

    const candidates = buildComputedAlertCandidates({
      byShelfProduct,
      shelves,
      lastScanByShelf: new Map(lastScans.map((s) => [s.shelf_id, s.last_scan_at])),
      freshnessThreshold: thresholds?.freshness_alert_threshold ?? 65,
      now,
    });

    const { upsert, resolveIds } = planAlertSync(candidates, active);
    for (const candidate of upsert) {
      await AlertRepository.upsertComputed(businessId, candidate);
    }
    await AlertRepository.autoResolve(businessId, resolveIds);
  }

  private static toDashboardAlert(row: AlertListRow): DashboardAlert {
    return {
      id: String(row.id),
      type: row.type,
      severity: row.severity,
      title: row.title,
      message: row.message,
      createdAt: new Date(row.occurred_at).toISOString(),
      status: row.resolved_at ? "resolved" : "active",
      resolvedAt: row.resolved_at ? new Date(row.resolved_at).toISOString() : undefined,
      resolvedBy: row.resolved_at ? (row.resolved_by_user ? "user" : "auto") : undefined,
      resolvedByName: row.resolver_name ?? undefined,
      raisedAt: new Date(row.raised_at).toISOString(),
      shelfName: row.shelf_name ?? undefined,
      productLabel: row.product_name ?? undefined,
    };
  }

  /** Alerts resolved in the last RESOLVED_HISTORY_DAYS days, newest first. */
  static async listResolved(businessId: string, now = new Date()): Promise<DashboardAlert[]> {
    const since = new Date(now);
    since.setDate(since.getDate() - RESOLVED_HISTORY_DAYS);
    const rows = await AlertRepository.listResolved(businessId, since, RESOLVED_HISTORY_LIMIT);
    return rows.map((row) => this.toDashboardAlert(row));
  }

  static async listActive(businessId: string): Promise<DashboardAlert[]> {
    await this.syncComputedAlerts(businessId);
    const rows = await AlertRepository.listActive(businessId);

    const alerts = rows.map((row) => this.toDashboardAlert(row));

    const severityRank = { critical: 0, warning: 1, info: 2 };
    alerts.sort(
      (a, b) =>
        (severityRank[a.severity] ?? 3) - (severityRank[b.severity] ?? 3) ||
        b.createdAt.localeCompare(a.createdAt),
    );
    return alerts;
  }

  static async resolve(userId: string, businessId: string, alertId: string) {
    try {
      await BusinessService.assertOwner(userId, businessId);
    } catch (error: any) {
      throw new AlertError(error.message, 403);
    }
    if (!UUID_RE.test(alertId)) {
      throw new AlertError("Alert not found.", 404);
    }
    const resolved = await AlertRepository.resolveByUser(businessId, alertId, userId);
    if (!resolved) {
      throw new AlertError("Alert not found or already resolved.", 404);
    }
    return { id: resolved.id, resolvedAt: new Date(resolved.resolved_at).toISOString() };
  }
}
