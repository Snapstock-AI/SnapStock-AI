import { AppDataSource } from "../../config/data-source";
import type { AlertType } from "../../entities/Alert";
import type { ActiveAlertRow, AlertCandidate } from "./alert.rules";

export type AlertListRow = {
  id: string;
  type: AlertType;
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  occurred_at: Date;
  resolved_at: Date | null;
  resolved_by_user: boolean;
  raised_at: Date;
  resolver_name: string | null;
  shelf_name: string | null;
  product_name: string | null;
};

export class AlertRepository {
  static async listActiveByTypes(
    businessId: string,
    types: AlertType[],
  ): Promise<ActiveAlertRow[]> {
    return AppDataSource.query(
      `SELECT id, dedupe_key, severity, title, message, evidence_at
       FROM alerts
       WHERE business_id = $1
         AND active = TRUE
         AND dedupe_key IS NOT NULL
         AND type = ANY($2::varchar[])`,
      [businessId, types],
    );
  }

  /**
   * Insert a new active alert, or refresh the existing active one with the same
   * dedupe_key. Skipped when the owner manually resolved this alert at or after
   * candidate.silencedIfResolvedAfter.
   */
  static async upsertComputed(businessId: string, c: AlertCandidate) {
    await AppDataSource.query(
      `INSERT INTO alerts
         (business_id, shelf_id, type, severity, title, message, dedupe_key, evidence_at, active)
       SELECT $1::uuid, $2::uuid, $3::varchar, $4::varchar, $5::text, $6::text,
              $7::varchar, $8::timestamptz, TRUE
       WHERE NOT EXISTS (
         SELECT 1 FROM alerts r
         WHERE r.business_id = $1::uuid
           AND r.dedupe_key = $7::varchar
           AND r.active = FALSE
           AND r.resolved_by IS NOT NULL
           AND r.resolved_at >= $9::timestamptz
       )
       ON CONFLICT (business_id, dedupe_key) WHERE active = TRUE AND dedupe_key IS NOT NULL
       DO UPDATE SET severity = EXCLUDED.severity,
                     title = EXCLUDED.title,
                     message = EXCLUDED.message,
                     evidence_at = EXCLUDED.evidence_at,
                     updated_at = CURRENT_TIMESTAMP`,
      [
        businessId,
        c.shelfId,
        c.type,
        c.severity,
        c.title,
        c.message,
        c.dedupeKey,
        c.evidenceAt,
        c.silencedIfResolvedAfter,
      ],
    );
  }

  /** Condition cleared on its own: resolve without a resolver. */
  static async autoResolve(businessId: string, ids: string[]) {
    if (ids.length === 0) return;
    await AppDataSource.query(
      `UPDATE alerts
       SET active = FALSE, resolved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE business_id = $1 AND id = ANY($2::uuid[]) AND active = TRUE`,
      [businessId, ids],
    );
  }

  static async resolveByUser(businessId: string, alertId: string, userId: string) {
    const rows = await AppDataSource.query(
      `UPDATE alerts
       SET active = FALSE, resolved_at = CURRENT_TIMESTAMP,
           resolved_by = $3, updated_at = CURRENT_TIMESTAMP
       WHERE business_id = $1 AND id = $2 AND active = TRUE
       RETURNING id, resolved_at`,
      [businessId, alertId, userId],
    );
    // pg returns [rows, count] for UPDATE ... RETURNING through TypeORM
    const list = Array.isArray(rows?.[0]) ? rows[0] : rows;
    return (list?.[0] as { id: string; resolved_at: Date } | undefined) ?? null;
  }

  static async listActive(businessId: string): Promise<AlertListRow[]> {
    return AppDataSource.query(
      `${ALERT_LIST_SELECT}
       WHERE a.business_id = $1 AND a.active = TRUE`,
      [businessId],
    );
  }

  /** Recently resolved alerts, newest first, for the alert history. */
  static async listResolved(
    businessId: string,
    since: Date,
    limit: number,
  ): Promise<AlertListRow[]> {
    return AppDataSource.query(
      `${ALERT_LIST_SELECT}
       WHERE a.business_id = $1 AND a.active = FALSE AND a.resolved_at >= $2
       ORDER BY a.resolved_at DESC
       LIMIT $3`,
      [businessId, since, limit],
    );
  }
}

const ALERT_LIST_SELECT = `
  SELECT a.id,
         a.type,
         a.severity,
         COALESCE(a.title, a.message) AS title,
         a.message,
         COALESCE(a.evidence_at, a.created_at) AS occurred_at,
         a.resolved_at,
         a.resolved_by IS NOT NULL AS resolved_by_user,
         a.created_at AS raised_at,
         u.full_name AS resolver_name,
         s.name AS shelf_name,
         p.name AS product_name
  FROM alerts a
  LEFT JOIN shelves s ON s.id = a.shelf_id
  LEFT JOIN products p ON p.id = a.product_id
  LEFT JOIN users u ON u.id = a.resolved_by`;
