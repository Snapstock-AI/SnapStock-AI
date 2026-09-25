import { AppDataSource } from "../../config/data-source";
import { Detection } from "../../entities/Detection";
import { Scan, ScanMode, ScanStatus } from "../../entities/Scan";
import { calculateInventoryQuantity } from "./inventory.utils";
import db from "../../config/db";

export class DetectionRepository {
  static async findScanHistory(
    businessId: string,
    startDate: Date,
    endDate: Date,
  ) {
    return AppDataSource.getRepository(Scan)
      .createQueryBuilder("scan")
      .innerJoin("shelves", "shelf", "shelf.id = scan.shelf_id")
      .leftJoin(Detection, "detection", "detection.scan_id = scan.id")
      .select([
        "scan.id AS id",
        "scan.shelf_id AS shelf_id",
        "shelf.name AS shelf_name",
        "scan.status AS status",
        "scan.scan_mode AS scan_mode",
        "TO_CHAR(scan.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') AS created_at",
        "CASE WHEN scan.completed_at IS NULL THEN NULL ELSE TO_CHAR(scan.completed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') END AS completed_at",
        "COUNT(detection.id)::int AS item_count",
        "COUNT(detection.id) FILTER (WHERE COALESCE(detection.corrected_freshness, detection.freshness) = 'Fresh')::int AS fresh_count",
        "COUNT(detection.id) FILTER (WHERE COALESCE(detection.corrected_freshness, detection.freshness) = 'Medium')::int AS medium_count",
        "COUNT(detection.id) FILTER (WHERE COALESCE(detection.corrected_freshness, detection.freshness) = 'Spoiled')::int AS spoiled_count",
        "COALESCE(JSON_AGG(JSON_BUILD_OBJECT('id', detection.id, 'type', detection.product_label, 'freshness', COALESCE(detection.corrected_freshness, detection.freshness)) ORDER BY detection.created_at) FILTER (WHERE detection.id IS NOT NULL), '[]') AS items",
      ])
      .where("scan.business_id = :businessId", { businessId })
      .andWhere("scan.created_at >= :startDate", { startDate })
      .andWhere("scan.created_at < :endDate", { endDate })
      .groupBy("scan.id")
      .addGroupBy("shelf.name")
      .orderBy("scan.created_at", "DESC")
      .getRawMany();
  }

  static async findForCorrection(detectionId: string) {
    return AppDataSource.getRepository(Detection)
      .createQueryBuilder("detection")
      .innerJoin(Scan, "scan", "scan.id = detection.scan_id")
      .addSelect(["scan.business_id", "scan.user_id"])
      .where("detection.id = :detectionId", { detectionId })
      .getRawAndEntities();
  }

  static async correctFreshness(
    detectionId: string,
    freshness: Detection["corrected_freshness"],
    correctedBy: string,
  ) {
    const repository = AppDataSource.getRepository(Detection);
    await repository.update(
      { id: detectionId },
      {
        corrected_freshness: freshness,
        corrected_by: correctedBy,
        corrected_at: new Date(),
        needs_review: true,
      },
    );

    return repository.findOneBy({ id: detectionId });
  }

  static async createScan(
    businessId: string,
    shelfId: string,
    userId: string,
    scanMode: ScanMode = "STOCK_IN",
  ) {
    const result = await db.query(
      `INSERT INTO scans (business_id, shelf_id, user_id, scan_mode, status)
       VALUES ($1, $2, $3, $4, 'PENDING')
       RETURNING id`,
      [businessId, shelfId, userId, scanMode],
    );
    return result.rows[0];
  }

  static async findProductByName(businessId: string, productName: string) {
    const result = await db.query(
      `SELECT id, name, quantity, low_stock_threshold
       FROM products
       WHERE business_id = $1 AND LOWER(name) = LOWER($2)
         AND is_active = TRUE AND deleted_at IS NULL
       LIMIT 1`,
      [businessId, productName],
    );
    return result.rows[0] ?? null;
  }

  static async findOrCreateProduct(businessId: string, productName: string) {
    const existing = await DetectionRepository.findProductByName(
      businessId,
      productName,
    );
    if (existing) return existing;

    const normalized = productName.trim();
    if (!normalized) return null;

    try {
      const created = await db.query(
        `INSERT INTO products (business_id, name, quantity, low_stock_threshold, unit, is_active)
         VALUES ($1, $2, 0, 5, 'pcs', TRUE)
         RETURNING id, name, quantity, low_stock_threshold`,
        [businessId, normalized],
      );
      return created.rows[0] ?? null;
    } catch {
      // Concurrent insert with same name — fetch the winner.
      return DetectionRepository.findProductByName(businessId, normalized);
    }
  }

  static async applyInventoryChange(
    scanId: string,
    businessId: string,
    scanMode: ScanMode,
  ) {
    return AppDataSource.transaction(async (manager) => {
      const rows = (await manager.query(
        `SELECT
           p.id,
           p.name,
           p.quantity,
           COALESCE(p.low_stock_threshold, b.low_stock_threshold, 5)::int AS low_stock_threshold
         FROM products p
         INNER JOIN businesses b ON b.id = p.business_id AND b.deleted_at IS NULL
         WHERE p.business_id = $1
           AND p.deleted_at IS NULL
           AND EXISTS (
             SELECT 1 FROM detections d
             WHERE d.scan_id = $2 AND d.product_id = p.id
           )
         FOR UPDATE OF p`,
        [businessId, scanId],
      )) as Array<{
        id: string;
        name: string;
        quantity: number;
        low_stock_threshold: number;
      }>;

      const counts = (await manager.query(
        `SELECT product_id AS id, COUNT(*)::int AS detected
         FROM detections
         WHERE scan_id = $1 AND product_id IS NOT NULL
         GROUP BY product_id`,
        [scanId],
      )) as Array<{ id: string; detected: number }>;

      const products = new Map(rows.map((row) => [row.id, row]));
      const changes = counts
        .map((count) => {
          const product = products.get(count.id);
          if (!product) return null;
          const quantity = calculateInventoryQuantity(
            Number(product.quantity),
            count.detected,
            scanMode,
          );
          return {
            product,
            detected: count.detected,
            currentQuantity: Number(product.quantity),
            quantity,
          };
        })
        .filter((change): change is NonNullable<typeof change> => change != null);

      for (const change of changes) {
        await manager.query(
          `UPDATE products
           SET quantity = $1, last_scan_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [change.quantity, change.product.id],
        );

        const alertMessage = `Low stock: ${change.product.name} has ${change.quantity} item${
          change.quantity === 1 ? "" : "s"
        } remaining.`;

        if (change.quantity < change.product.low_stock_threshold) {
          await manager.query(
            `INSERT INTO alerts (business_id, product_id, type, message, active)
             VALUES ($1, $2, 'LOW_STOCK', $3, TRUE)
             ON CONFLICT (business_id, product_id, type) WHERE (active = TRUE)
             DO UPDATE SET message = EXCLUDED.message, updated_at = CURRENT_TIMESTAMP`,
            [businessId, change.product.id, alertMessage],
          );
        } else {
          await manager.query(
            `UPDATE alerts
             SET active = FALSE, resolved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE business_id = $1 AND product_id = $2 AND type = 'LOW_STOCK' AND active = TRUE`,
            [businessId, change.product.id],
          );
        }
      }

      await manager.query(
        `UPDATE scans
         SET status = 'COMPLETED', error_message = NULL, completed_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [scanId],
      );

      return changes.map(({ product, detected, currentQuantity, quantity }) => ({
        productId: product.id,
        product: product.name,
        detected,
        currentQuantity,
        quantity,
      }));
    });
  }

  static async updateScanStatus(
    scanId: string,
    status: ScanStatus,
    errorMessage?: string,
  ) {
    if (status === "COMPLETED") {
      const result = await db.query(
        `UPDATE scans SET status = $1, completed_at = CURRENT_TIMESTAMP
         WHERE id = $2 RETURNING *`,
        [status, scanId],
      );
      return result.rows[0];
    }

    const result = await db.query(
      `UPDATE scans SET status = $1, error_message = $2
       WHERE id = $3 RETURNING *`,
      [status, errorMessage ?? null, scanId],
    );
    return result.rows[0];
  }

  static async createDetection(
    scanId: string,
    productLabel: string,
    productId: string | null,
    confidence: number,
    bbox: object,
    freshness: string | null,
    freshnessConfidence: number | null,
  ) {
    const result = await db.query(
      `INSERT INTO detections
       (scan_id, product_label, product_id, confidence, bbox_json, freshness, freshness_confidence)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [scanId, productLabel, productId, confidence, JSON.stringify(bbox), freshness, freshnessConfidence],
    );
    return result.rows[0];
  }
}
