import { AlertService } from "../alerts/alert.service";
import { BusinessService } from "../business/business.service";
import { DashboardRepository } from "./dashboard.repository";

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function freshnessScore(
  fresh: number,
  medium: number,
  spoiled: number,
  total: number,
) {
  if (total <= 0) return null;
  return Math.round((fresh * 100 + medium * 50 + spoiled * 0) / total);
}

function dominantStatus(fresh: number, medium: number, spoiled: number) {
  if (spoiled >= fresh && spoiled >= medium && spoiled > 0)
    return "Spoiled" as const;
  if (medium >= fresh && medium > 0) return "Ripe" as const;
  if (fresh > 0) return "Fresh" as const;
  return "Unknown" as const;
}

export class DashboardService {
  static async getDashboard(userId: string, businessId: string, days = 7) {
    await BusinessService.assertMember(userId, businessId);

    const windowDays = Math.max(1, Math.min(90, Math.floor(days)));
    const since = daysAgo(windowDays);
    const stats = await DashboardRepository.detectionStats(businessId, since);
    const scansToday = await DashboardRepository.countScansToday(businessId);
    const scanVolume = await DashboardRepository.scansByDay(businessId, windowDays);
    const shelves = await DashboardRepository.shelfHealth(businessId);
    const alerts = await this.buildAlerts(businessId);

    const total = stats.total;
    const avgFreshness = freshnessScore(
      stats.fresh_count,
      stats.medium_count,
      stats.spoiled_count,
      total,
    );

    const freshnessMix =
      total > 0
        ? [
            {
              label: "Fresh",
              value: Math.round((stats.fresh_count / total) * 100),
              count: stats.fresh_count,
              color: "#1d6b45",
            },
            {
              label: "Ripe",
              value: Math.round((stats.medium_count / total) * 100),
              count: stats.medium_count,
              color: "#f4c430",
            },
            {
              label: "Spoiled",
              value: Math.round((stats.spoiled_count / total) * 100),
              count: stats.spoiled_count,
              color: "#e85d4c",
            },
          ]
        : [];

    const shelfHealth = shelves.map((s) => ({
      shelfId: s.shelf_id,
      name: s.shelf_name,
      pct: s.avg_score != null ? Math.round(s.avg_score) : 0,
      itemCount: Number(s.item_count),
      lastScannedAt: s.completed_at,
    }));

    const worst = [...shelfHealth]
      .filter((s) => s.itemCount > 0)
      .sort((a, b) => a.pct - b.pct)[0];

    const topAlert =
      alerts.find((a) => a.severity === "critical") ??
      alerts.find((a) => a.severity === "warning") ??
      null;

    return {
      windowDays,
      kpis: {
        totalSkus: stats.sku_count,
        avgFreshness,
        activeAlerts: alerts.length,
        scansToday,
      },
      freshnessMix,
      scanVolume: scanVolume.map((d) => ({
        label: d.day.slice(5), // MM-DD
        value: d.count,
        day: d.day,
      })),
      shelfHealth,
      avgShelfScore:
        shelfHealth.length > 0
          ? Math.round(
              shelfHealth.reduce((sum, s) => sum + s.pct, 0) /
                shelfHealth.length,
            )
          : null,
      topAlert: topAlert
        ? {
            title: topAlert.title,
            message: topAlert.message,
            severity: topAlert.severity,
          }
        : worst
          ? {
              title: `${worst.name} needs attention`,
              message: `Latest shelf score ${worst.pct}% across ${worst.itemCount} items.`,
              severity: worst.pct < 40 ? "critical" : "warning",
            }
          : null,
      hasData: total > 0 || scansToday > 0,
    };
  }

  static async getAnalytics(userId: string, businessId: string, days = 7) {
    await BusinessService.assertOwner(userId, businessId);

    const since = daysAgo(days);
    const stats = await DashboardRepository.detectionStats(businessId, since);
    const inventory = await DashboardRepository.inventoryByProduct(
      businessId,
      since,
    );
    const scanCount = (
      await DashboardRepository.scansByDay(businessId, days)
    ).reduce((sum, d) => sum + d.count, 0);

    const wastePct =
      stats.total > 0
        ? Math.round((stats.spoiled_count / stats.total) * 1000) / 10
        : 0;

    const wasteByProduct = inventory
      .map((p) => ({
        product: p.product_label,
        wastePct:
          p.total > 0 ? Math.round((p.spoiled_count / p.total) * 1000) / 10 : 0,
        spoiled: p.spoiled_count,
        total: p.total,
      }))
      .filter((p) => p.total > 0)
      .sort((a, b) => b.wastePct - a.wastePct);

    return {
      windowDays: days,
      wastePct,
      itemsSaved: stats.fresh_count,
      scanCount,
      avgConfidence:
        stats.avg_confidence != null
          ? Math.round(stats.avg_confidence * 1000) / 10
          : null,
      wasteByProduct,
      hasData: stats.total > 0,
    };
  }

  static async getInventory(userId: string, businessId: string, days = 7) {
    await BusinessService.assertMember(userId, businessId);

    const thresholds =
      await DashboardRepository.getBusinessThresholds(businessId);
    const lowStock = thresholds?.low_stock_threshold ?? 25;
    const since = daysAgo(days);
    const rows = await DashboardRepository.inventoryByProduct(
      businessId,
      since,
    );

    return {
      windowDays: days,
      lowStockThreshold: lowStock,
      items: rows.map((r) => {
        const status = dominantStatus(
          r.fresh_count,
          r.medium_count,
          r.spoiled_count,
        );
        const freshnessPct =
          freshnessScore(
            r.fresh_count,
            r.medium_count,
            r.spoiled_count,
            r.total,
          ) ?? 0;
        return {
          product: r.product_label,
          stock: r.quantity,
          fresh: r.fresh_count,
          ripe: r.medium_count,
          spoiled: r.spoiled_count,
          freshnessPct,
          status,
          lowStock: r.quantity < lowStock,
          lastSeen: r.last_seen,
        };
      }),
      hasData: rows.length > 0,
    };
  }

  /** `count` is always the number of active alerts; resolved ones are history only. */
  static async getAlerts(userId: string, businessId: string, includeResolved = true) {
    await BusinessService.assertMember(userId, businessId);
    const active = await this.buildAlerts(businessId);
    const resolved = includeResolved ? await AlertService.listResolved(businessId) : [];
    return { count: active.length, alerts: [...active, ...resolved] };
  }

  static async resolveAlert(userId: string, businessId: string, alertId: string) {
    return AlertService.resolve(userId, businessId, alertId);
  }

  private static async buildAlerts(businessId: string) {
    return AlertService.listActive(businessId);
  }
}
