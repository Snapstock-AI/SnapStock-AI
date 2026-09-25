import { AppDataSource } from "../../config/data-source";
import { Detection } from "../../entities/Detection";
import { Product } from "../../entities/Product";
import { Scan } from "../../entities/Scan";
import { Shelf } from "../../entities/Shelf";
import { Alert } from "../../entities/Alert";

const FRESHNESS_EXPR =
  "COALESCE(detection.corrected_freshness, detection.freshness)";

export class DashboardRepository {
  static async getBusinessThresholds(businessId: string) {
    const row = await AppDataSource.query(
      `SELECT freshness_alert_threshold, low_stock_threshold
       FROM businesses
       WHERE id = $1 AND deleted_at IS NULL`,
      [businessId],
    );
    return row[0] as
      | { freshness_alert_threshold: number; low_stock_threshold: number }
      | undefined;
  }

  static async countScansToday(businessId: string) {
    const result = await AppDataSource.getRepository(Scan)
      .createQueryBuilder("scan")
      .where("scan.business_id = :businessId", { businessId })
      .andWhere("scan.status = :status", { status: "COMPLETED" })
      .andWhere("scan.created_at >= date_trunc('day', NOW())")
      .getCount();
    return result;
  }

  static async detectionStats(businessId: string, since: Date) {
    const rows = await AppDataSource.getRepository(Detection)
      .createQueryBuilder("detection")
      .innerJoin(Scan, "scan", "scan.id = detection.scan_id")
      .leftJoin("products", "product", "product.id = detection.product_id")
      .select([
        `COUNT(detection.id)::int AS total`,
        `COUNT(DISTINCT detection.product_label)::int AS sku_count`,
        `COUNT(detection.id) FILTER (WHERE ${FRESHNESS_EXPR} = 'Fresh')::int AS fresh_count`,
        `COUNT(detection.id) FILTER (WHERE ${FRESHNESS_EXPR} = 'Medium')::int AS medium_count`,
        `COUNT(detection.id) FILTER (WHERE ${FRESHNESS_EXPR} = 'Spoiled')::int AS spoiled_count`,
        `AVG(detection.confidence)::float AS avg_confidence`,
      ])
      .where("scan.business_id = :businessId", { businessId })
      .andWhere("scan.status = :status", { status: "COMPLETED" })
      .andWhere("scan.created_at >= :since", { since })
      .getRawOne();

    return {
      total: Number(rows?.total ?? 0),
      sku_count: Number(rows?.sku_count ?? 0),
      fresh_count: Number(rows?.fresh_count ?? 0),
      medium_count: Number(rows?.medium_count ?? 0),
      spoiled_count: Number(rows?.spoiled_count ?? 0),
      avg_confidence: rows?.avg_confidence != null ? Number(rows.avg_confidence) : null,
    };
  }

  static async scansByDay(businessId: string, days: number) {
    const safeDays = Math.max(1, Math.min(90, Math.floor(days)))
    const rows = await AppDataSource.getRepository(Scan)
      .createQueryBuilder("scan")
      .select([
        `TO_CHAR(date_trunc('day', scan.created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day`,
        `COUNT(*)::int AS count`,
      ])
      .where("scan.business_id = :businessId", { businessId })
      .andWhere("scan.status = :status", { status: "COMPLETED" })
      .andWhere(`scan.created_at >= NOW() - (:days * INTERVAL '1 day')`, {
        days: safeDays,
      })
      .groupBy("day")
      .orderBy("day", "ASC")
      .getRawMany();

    return rows.map((r) => ({
      day: String(r.day),
      count: Number(r.count),
    }));
  }

  static async shelfHealth(businessId: string) {
    // Latest completed scan per shelf, then avg freshness score of its detections
    const rows = await AppDataSource.query(
      `
      WITH latest AS (
        SELECT DISTINCT ON (s.shelf_id)
          s.id AS scan_id,
          s.shelf_id,
          sh.name AS shelf_name,
          s.completed_at
        FROM scans s
        INNER JOIN shelves sh ON sh.id = s.shelf_id AND sh.deleted_at IS NULL
        WHERE s.business_id = $1
          AND s.status = 'COMPLETED'
        ORDER BY s.shelf_id, s.completed_at DESC NULLS LAST, s.created_at DESC
      )
      SELECT
        latest.shelf_id,
        latest.shelf_name,
        latest.completed_at,
        COUNT(d.id)::int AS item_count,
        AVG(
          CASE COALESCE(d.corrected_freshness, d.freshness)
            WHEN 'Fresh' THEN 100
            WHEN 'Medium' THEN 50
            WHEN 'Spoiled' THEN 0
            ELSE NULL
          END
        )::float AS avg_score
      FROM latest
      LEFT JOIN detections d ON d.scan_id = latest.scan_id
      GROUP BY latest.shelf_id, latest.shelf_name, latest.completed_at
      ORDER BY latest.shelf_name ASC
      `,
      [businessId],
    );

    return rows as Array<{
      shelf_id: string;
      shelf_name: string;
      completed_at: Date | null;
      item_count: number;
      avg_score: number | null;
    }>;
  }

  static async inventoryByProduct(businessId: string, since: Date) {
    const rows = await AppDataSource.getRepository(Detection)
      .createQueryBuilder("detection")
      .innerJoin(Scan, "scan", "scan.id = detection.scan_id")
      .leftJoin(Product, "product", "product.id = detection.product_id")
      .select([
        "detection.product_label AS product_label",
        "MAX(product.quantity)::int AS quantity",
        `COUNT(detection.id)::int AS total`,
        `COUNT(detection.id) FILTER (WHERE ${FRESHNESS_EXPR} = 'Fresh')::int AS fresh_count`,
        `COUNT(detection.id) FILTER (WHERE ${FRESHNESS_EXPR} = 'Medium')::int AS medium_count`,
        `COUNT(detection.id) FILTER (WHERE ${FRESHNESS_EXPR} = 'Spoiled')::int AS spoiled_count`,
        "MAX(scan.created_at) AS last_seen",
      ])
      .where("scan.business_id = :businessId", { businessId })
      .andWhere("scan.status = :status", { status: "COMPLETED" })
      .andWhere("scan.created_at >= :since", { since })
      .groupBy("detection.product_label")
      .orderBy("total", "DESC")
      .getRawMany();

    return rows.map((r) => ({
      product_label: String(r.product_label),
      total: Number(r.total),
      quantity: r.quantity == null ? Number(r.total) : Number(r.quantity),
      fresh_count: Number(r.fresh_count),
      medium_count: Number(r.medium_count),
      spoiled_count: Number(r.spoiled_count),
      last_seen: r.last_seen as Date,
    }));
  }

  static async productFreshnessByShelf(businessId: string, since: Date) {
    const rows = await AppDataSource.getRepository(Detection)
      .createQueryBuilder("detection")
      .innerJoin(Scan, "scan", "scan.id = detection.scan_id")
      .innerJoin(Shelf, "shelf", "shelf.id = scan.shelf_id")
      .select([
        "scan.shelf_id AS shelf_id",
        "shelf.name AS shelf_name",
        "detection.product_label AS product_label",
        `COUNT(detection.id)::int AS total`,
        `COUNT(detection.id) FILTER (WHERE ${FRESHNESS_EXPR} = 'Fresh')::int AS fresh_count`,
        `COUNT(detection.id) FILTER (WHERE ${FRESHNESS_EXPR} = 'Medium')::int AS medium_count`,
        `COUNT(detection.id) FILTER (WHERE ${FRESHNESS_EXPR} = 'Spoiled')::int AS spoiled_count`,
        "MAX(scan.created_at) AS last_seen",
      ])
      .where("scan.business_id = :businessId", { businessId })
      .andWhere("scan.status = :status", { status: "COMPLETED" })
      .andWhere("scan.created_at >= :since", { since })
      .groupBy("scan.shelf_id")
      .addGroupBy("shelf.name")
      .addGroupBy("detection.product_label")
      .getRawMany();

    return rows.map((r) => ({
      shelf_id: String(r.shelf_id),
      shelf_name: String(r.shelf_name),
      product_label: String(r.product_label),
      total: Number(r.total),
      quantity: r.quantity == null ? Number(r.total) : Number(r.quantity),
      fresh_count: Number(r.fresh_count),
      medium_count: Number(r.medium_count),
      spoiled_count: Number(r.spoiled_count),
      last_seen: r.last_seen as Date,
    }));
  }

  static async activeLowStockAlerts(businessId: string) {
    return AppDataSource.getRepository(Alert)
      .createQueryBuilder("alert")
      .leftJoin("products", "product", "product.id = alert.product_id")
      .select([
        "alert.id AS id",
        "alert.message AS message",
        "alert.created_at AS created_at",
        "product.name AS product_name",
      ])
      .where("alert.business_id = :businessId", { businessId })
      .andWhere("alert.type = :type", { type: "LOW_STOCK" })
      .andWhere("alert.active = TRUE")
      .orderBy("alert.created_at", "DESC")
      .getRawMany();
  }

  static async listShelves(businessId: string) {
    return AppDataSource.getRepository(Shelf).find({
      where: { business_id: businessId },
      order: { name: "ASC" },
    });
  }

  static async lastScanByShelf(businessId: string) {
    const rows = await AppDataSource.query(
      `
      SELECT DISTINCT ON (s.shelf_id)
        s.shelf_id,
        sh.name AS shelf_name,
        s.created_at AS last_scan_at
      FROM scans s
      INNER JOIN shelves sh ON sh.id = s.shelf_id AND sh.deleted_at IS NULL
      WHERE s.business_id = $1 AND s.status = 'COMPLETED'
      ORDER BY s.shelf_id, s.created_at DESC
      `,
      [businessId],
    );
    return rows as Array<{
      shelf_id: string;
      shelf_name: string;
      last_scan_at: Date;
    }>;
  }
}
