import db from "../../config/db";

export class DetectionRepository {

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