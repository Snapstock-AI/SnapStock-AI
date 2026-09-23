import db from "../../config/db";

export class DetectionRepository {
  static async findScanHistory(
    businessId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const result = await db.query(
      `
      SELECT
        scan.id AS id,
        scan.shelf_id AS shelf_id,
        shelf.name AS shelf_name,
        scan.status AS status,
        TO_CHAR(scan.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at,
        CASE
          WHEN scan.completed_at IS NULL THEN NULL
          ELSE TO_CHAR(scan.completed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
        END AS completed_at,
        COUNT(detection.id)::int AS item_count,
        COUNT(detection.id) FILTER (
          WHERE COALESCE(detection.corrected_freshness, detection.freshness) = 'Fresh'
        )::int AS fresh_count,
        COUNT(detection.id) FILTER (
          WHERE COALESCE(detection.corrected_freshness, detection.freshness) = 'Medium'
        )::int AS medium_count,
        COUNT(detection.id) FILTER (
          WHERE COALESCE(detection.corrected_freshness, detection.freshness) = 'Spoiled'
        )::int AS spoiled_count,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', detection.id,
              'type', detection.product_label,
              'freshness', COALESCE(detection.corrected_freshness, detection.freshness)
            )
            ORDER BY detection.created_at
          ) FILTER (WHERE detection.id IS NOT NULL),
          '[]'
        ) AS items
      FROM scans scan
      INNER JOIN shelves shelf ON shelf.id = scan.shelf_id
      LEFT JOIN detections detection ON detection.scan_id = scan.id
      WHERE scan.business_id = $1
        AND scan.created_at >= $2
        AND scan.created_at < $3
      GROUP BY scan.id, shelf.name
      ORDER BY scan.created_at DESC;
      `,
      [businessId, startDate, endDate],
    );

    return result.rows;
  }

  static async findForCorrection(detectionId: string) {
    const result = await db.query(
      `
      SELECT
        detection.*,
        scan.business_id AS scan_business_id
      FROM detections detection
      INNER JOIN scans scan ON scan.id = detection.scan_id
      WHERE detection.id = $1;
      `,
      [detectionId],
    );

    return result.rows[0] ?? null;
  }

  static async correctFreshness(
    detectionId: string,
    freshness: "Fresh" | "Medium" | "Spoiled" | "UNKNOWN",
    correctedBy: string,
  ) {
    await db.query(
      `
      UPDATE detections
      SET
        corrected_freshness = $1,
        corrected_by = $2,
        corrected_at = CURRENT_TIMESTAMP,
        needs_review = TRUE
      WHERE id = $3;
      `,
      [freshness, correctedBy, detectionId],
    );

    const result = await db.query(
      `SELECT * FROM detections WHERE id = $1;`,
      [detectionId],
    );

    return result.rows[0] ?? null;
  }

  static async getScanById(scanId: string) {
    const result = await db.query(
      `
      SELECT id, business_id, shelf_id, user_id, status, error_message
      FROM scans
      WHERE id = $1;
      `,
      [scanId]
    );

    return result.rows[0] ?? null;
  }

  static async getDetectionsForScan(scanId: string) {
    const result = await db.query(
      `
      SELECT
        id,
        product_label,
        confidence,
        bbox_json,
        freshness,
        freshness_confidence
      FROM detections
      WHERE scan_id = $1
      ORDER BY created_at ASC;
      `,
      [scanId]
    );

    return result.rows;
  }

  static async createScan(
    businessId: string,
    shelfId: string,
    userId: string
  ) {
    const result = await db.query(
      `
      INSERT INTO scans (
        business_id,
        shelf_id,
        user_id,
        status
      )
      VALUES ($1, $2, $3, 'PENDING')
      RETURNING id;
      `,
      [
        businessId,
        shelfId,
        userId,
      ]
    );

    return result.rows[0];
  }


  static async updateScanStatus(
    scanId: string,
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED",
    errorMessage?: string
  ) {

    if (status === "COMPLETED") {

      const result = await db.query(
        `
        UPDATE scans
        SET
          status = $1,
          completed_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *;
        `,
        [
          status,
          scanId,
        ]
      );

      return result.rows[0];
    }


    const result = await db.query(
      `
      UPDATE scans
      SET
        status = $1,
        error_message = $2
      WHERE id = $3
      RETURNING *;
      `,
      [
        status,
        errorMessage ?? null,
        scanId,
      ]
    );

    return result.rows[0];
  }

  static async updateScanImageMetadata(
    scanId: string,
    imageKey: string,
    contentType: string,
    originalName: string
  ) {
    const result = await db.query(
      `
      UPDATE scans
      SET
        image_key = $1,
        image_content_type = $2,
        image_original_name = $3
      WHERE id = $4
      RETURNING *;
      `,
      [imageKey, contentType, originalName, scanId]
    );

    return result.rows[0];
  }


  static async findProductByName(
    businessId: string,
    productName: string
  ) {

    const result = await db.query(
      `
      SELECT id
      FROM products
      WHERE business_id = $1
        AND LOWER(name) = LOWER($2)
        AND is_active = TRUE
        AND deleted_at IS NULL
      LIMIT 1;
      `,
      [
        businessId,
        productName,
      ]
    );

    return result.rows[0] ?? null;
  }


  static async createDetection(
    scanId: string,
    productLabel: string,
    productId: string | null,
    confidence: number,
    bbox: object,
    freshness: string | null,
    freshnessConfidence: number | null
  ) {

    const result = await db.query(
      `
      INSERT INTO detections (
        scan_id,
        product_label,
        product_id,
        confidence,
        bbox_json,
        freshness,
        freshness_confidence
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7
      )
      RETURNING *;
      `,
      [
        scanId,
        productLabel,
        productId,
        confidence,
        JSON.stringify(bbox),
        freshness,
        freshnessConfidence,
      ]
    );

    return result.rows[0];
  }
}