import { AppDataSource } from "../../config/data-source";
import { Detection } from "../../entities/Detection";
import { Product } from "../../entities/Product";
import { Scan, ScanMode, ScanStatus } from "../../entities/Scan";
import { calculateInventoryQuantity } from "./inventory.utils";

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

  static async createScan(businessId: string, shelfId: string, userId: string, scanMode: ScanMode = "STOCK_IN") {
    const repository = AppDataSource.getRepository(Scan);
    return repository.save(
      repository.create({
        business_id: businessId,
        shelf_id: shelfId,
        user_id: userId,
        scan_mode: scanMode,
        status: "PENDING",
        error_message: null,
        completed_at: null,
      }),
    );
  }

  static async applyInventoryChange(scanId: string, businessId: string, scanMode: ScanMode) {
    return AppDataSource.transaction(async (manager) => {
      const rows = await manager.query(
        `SELECT p.id, p.name, p.quantity, b.low_stock_threshold
         FROM products p
         INNER JOIN businesses b ON b.id = p.business_id AND b.deleted_at IS NULL
         WHERE p.business_id = $1 AND p.deleted_at IS NULL
           AND EXISTS (SELECT 1 FROM detections d WHERE d.scan_id = $2 AND d.product_id = p.id)
         FOR UPDATE`,
        [businessId, scanId],
      ) as Array<{ id: string; name: string; quantity: number; low_stock_threshold: number }>;
      const counts = await manager.query(
        `SELECT product_id AS id, COUNT(*)::int AS detected
         FROM detections WHERE scan_id = $1 AND product_id IS NOT NULL
         GROUP BY product_id`,
        [scanId],
      ) as Array<{ id: string; detected: number }>;
      const products = new Map(rows.map((row) => [row.id, row]));
      const changes = counts.map((count) => {
        const product = products.get(count.id)!;
        const quantity = calculateInventoryQuantity(product.quantity, count.detected, scanMode);
        return { product, detected: count.detected, currentQuantity: product.quantity, quantity };
      });

      for (const change of changes) {
        await manager.query(`UPDATE products SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [change.quantity, change.product.id]);
        const alertMessage = `Low stock: ${change.product.name} has ${change.quantity} item${change.quantity === 1 ? "" : "s"} remaining.`;
        if (change.quantity < change.product.low_stock_threshold) {
          await manager.query(
            `INSERT INTO alerts (business_id, product_id, type, message, active)
             VALUES ($1, $2, 'LOW_STOCK', $3, TRUE)
             ON CONFLICT (business_id, product_id, type) WHERE active = TRUE
             DO UPDATE SET message = EXCLUDED.message, updated_at = CURRENT_TIMESTAMP`,
            [businessId, change.product.id, alertMessage],
          );
        } else {
          await manager.query(
            `UPDATE alerts SET active = FALSE, resolved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
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
    const repository = AppDataSource.getRepository(Scan);
    await repository.update(
      { id: scanId },
      {
        status,
        error_message: status === "COMPLETED" ? null : (errorMessage ?? null),
        ...(status === "COMPLETED" ? { completed_at: new Date() } : {}),
      },
    );
    return repository.findOneBy({ id: scanId });
  }

  static async findProductByName(businessId: string, productName: string) {
    return AppDataSource.getRepository(Product)
      .createQueryBuilder("product")
      .where("product.business_id = :businessId", { businessId })
      .andWhere("LOWER(product.name) = LOWER(:productName)", { productName })
      .andWhere("product.is_active = :isActive", { isActive: true })
      .andWhere("product.deleted_at IS NULL")
      .getOne();
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
    const repository = AppDataSource.getRepository(Detection);
    return repository.save(
      repository.create({
        scan_id: scanId,
        product_label: productLabel,
        product_id: productId,
        confidence,
        bbox_json: bbox,
        freshness: freshness as Detection["freshness"],
        freshness_confidence: freshnessConfidence,
        needs_review: false,
        corrected_freshness: null,
        corrected_by: null,
        corrected_at: null,
      }),
    );
  }
}
