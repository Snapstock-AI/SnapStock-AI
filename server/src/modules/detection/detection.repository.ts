import { AppDataSource } from "../../config/data-source";
import { Detection } from "../../entities/Detection";
import { Product } from "../../entities/Product";
import { Scan, ScanStatus } from "../../entities/Scan";

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

  static async createScan(businessId: string, shelfId: string, userId: string) {
    const repository = AppDataSource.getRepository(Scan);
    return repository.save(
      repository.create({
        business_id: businessId,
        shelf_id: shelfId,
        user_id: userId,
        status: "PENDING",
        error_message: null,
        completed_at: null,
      }),
    );
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
