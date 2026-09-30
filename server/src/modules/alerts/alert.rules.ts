import type { AlertSeverity, AlertType } from "../../entities/Alert";

export const STALE_SHELF_HOURS = 48;

/** Alert types derived from scan data on read; LOW_STOCK is raised by the scan pipeline. */
export const COMPUTED_ALERT_TYPES: AlertType[] = [
  "SPOILAGE",
  "FRESHNESS_RISK",
  "STALE_SHELF",
];

export type AlertCandidate = {
  dedupeKey: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  shelfId: string | null;
  evidenceAt: Date | null;
  /**
   * If the owner manually resolved this alert at or after this time, it stays
   * resolved. Spoilage/freshness come back only when a newer scan shows the
   * problem; a stale-shelf reminder is snoozed for STALE_SHELF_HOURS.
   */
  silencedIfResolvedAfter: Date;
};

export type ActiveAlertRow = {
  id: string;
  dedupe_key: string;
  severity: string;
  title: string | null;
  message: string;
  evidence_at: Date | null;
};

type ShelfProductRow = {
  shelf_id: string;
  shelf_name: string;
  product_label: string;
  total: number;
  medium_count: number;
  spoiled_count: number;
  last_seen: Date;
};

export function buildComputedAlertCandidates(input: {
  byShelfProduct: ShelfProductRow[];
  shelves: Array<{ id: string; name: string }>;
  lastScanByShelf: Map<string, Date>;
  freshnessThreshold: number;
  now: Date;
}): AlertCandidate[] {
  const { byShelfProduct, shelves, lastScanByShelf, freshnessThreshold, now } = input;
  const candidates: AlertCandidate[] = [];

  for (const row of byShelfProduct) {
    const lastSeen = new Date(row.last_seen);

    if (row.spoiled_count > 0) {
      candidates.push({
        dedupeKey: `spoilage:${row.shelf_id}:${row.product_label}`,
        type: "SPOILAGE",
        severity: "critical",
        title: `${row.product_label} spoilage on ${row.shelf_name}`,
        message: `${row.spoiled_count} spoiled item(s) detected in the last 7 days.`,
        shelfId: row.shelf_id,
        evidenceAt: lastSeen,
        silencedIfResolvedAfter: lastSeen,
      });
    }

    const atRiskShare =
      row.total > 0
        ? Math.round(((row.medium_count + row.spoiled_count) / row.total) * 100)
        : 0;
    if (row.total > 0 && atRiskShare >= freshnessThreshold) {
      candidates.push({
        dedupeKey: `freshness:${row.shelf_id}:${row.product_label}`,
        type: "FRESHNESS_RISK",
        severity: "warning",
        title: `${row.product_label} freshness risk`,
        message: `${atRiskShare}% of ${row.product_label} on ${row.shelf_name} is ripe or spoiled (threshold ${freshnessThreshold}%).`,
        shelfId: row.shelf_id,
        evidenceAt: lastSeen,
        silencedIfResolvedAfter: lastSeen,
      });
    }
  }

  const staleCutoff = new Date(now.getTime() - STALE_SHELF_HOURS * 60 * 60 * 1000);
  for (const shelf of shelves) {
    const last = lastScanByShelf.get(shelf.id);
    if (!last || new Date(last) < staleCutoff) {
      candidates.push({
        dedupeKey: `stale_shelf:${shelf.id}`,
        type: "STALE_SHELF",
        severity: "info",
        title: `${shelf.name} needs a scan`,
        message: last
          ? `Last completed scan was ${new Date(last).toLocaleString()}.`
          : "No completed scans yet for this shelf.",
        shelfId: shelf.id,
        evidenceAt: last ? new Date(last) : null,
        silencedIfResolvedAfter: staleCutoff,
      });
    }
  }

  return candidates;
}

/**
 * Diff what the scan data says against the active rows in the alerts table.
 * - upsert: new alerts, or active ones whose content changed
 * - resolveIds: active alerts whose condition no longer holds
 */
export function planAlertSync(
  candidates: AlertCandidate[],
  active: ActiveAlertRow[],
): { upsert: AlertCandidate[]; resolveIds: string[] } {
  const activeByKey = new Map(active.map((row) => [row.dedupe_key, row]));
  const candidateKeys = new Set(candidates.map((c) => c.dedupeKey));

  const upsert = candidates.filter((c) => {
    const row = activeByKey.get(c.dedupeKey);
    if (!row) return true;
    const rowEvidence = row.evidence_at ? new Date(row.evidence_at).getTime() : null;
    const candEvidence = c.evidenceAt ? c.evidenceAt.getTime() : null;
    return (
      row.severity !== c.severity ||
      row.title !== c.title ||
      row.message !== c.message ||
      rowEvidence !== candEvidence
    );
  });

  const resolveIds = active
    .filter((row) => !candidateKeys.has(row.dedupe_key))
    .map((row) => row.id);

  return { upsert, resolveIds };
}
