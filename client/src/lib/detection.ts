import type { Shelf } from "../types/shelf";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export type DetectionResult = {
  scanId: string;

  image_width: number;
  image_height: number;
  total_count: number;

  counts: Record<
    string,
    {
      fresh: number;
      rotten: number;
      total: number;
    }
  >;

  detections: {
    id?: string;

    class_name: string;

    confidence: number;

    bounding_box: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    };

    freshness: string;

    freshness_confidence: number;

    freshness_confidence_percent: number;
  }[];
  inventoryChanges: {
    productId: string;
    product: string;
    detected: number;
    currentQuantity: number;
    quantity: number;
  }[];
};

export type ScanMode = "STOCK_IN" | "STOCK_OUT";

export type FreshnessStatus = "Fresh" | "Medium" | "Spoiled";

export type ScanHistoryItem = {
  id: string;
  shelf_id: string;
  shelf_name: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  created_at: string;
  completed_at: string | null;
  item_count: number;
  fresh_count: number;
  medium_count: number;
  spoiled_count: number;
  scan_mode: ScanMode;
  items: {
    type: string;
    freshness: string;
  }[];
};

export function countHistoryItems(items: ScanHistoryItem["items"]) {
  return items.reduce<Record<string, number>>((counts, item) => {
    counts[item.type] = (counts[item.type] || 0) + 1;
    return counts;
  }, {});
}

export function formatHistoryDate(value: string | Date | null | undefined): string {
  if (!value) return "";

  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else {
    const str = String(value).trim();
    // Normalize "YYYY-MM-DD HH:mm:ss..." to ISO format for consistent browser parsing
    const isoStr = str.includes("T") ? str : str.replace(" ", "T");
    date = new Date(isoStr);
  }

  if (isNaN(date.getTime())) {
    return String(value);
  }

  const now = new Date();

  // Local 12-hour time format: e.g. "9:14 AM", "3:25 PM"
  const timeStr = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return `Today, ${timeStr}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return `Yesterday, ${timeStr}`;
  }

  const isThisYear = date.getFullYear() === now.getFullYear();
  const dateStr = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(isThisYear ? {} : { year: "numeric" }),
  });

  return `${dateStr}, ${timeStr}`;
}

export async function getScanHistory(
  businessId: string,
  token: string,
  startDate?: string,
  endDate?: string,
): Promise<ScanHistoryItem[]> {
  const params = new URLSearchParams({ businessId });
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);

  const response = await fetch(`${API_URL}/detection/history?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await response.json();

  if (!response.ok || body.success === false) {
    throw new Error(body.message || "Unable to load scan history.");
  }

  return body.data || [];
}

export async function updateDetectionFreshness(
  detectionId: string,
  freshness: FreshnessStatus,
  token: string,
) {
  const response = await fetch(
    `${API_URL}/detection/${detectionId}/freshness`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ freshness }),
    },
  );

  const body = await response.json();
  if (!response.ok || body.success === false) {
    throw new Error(body.message || "Unable to update freshness.");
  }

  return body.data as { id: string; freshness: FreshnessStatus };
}

export async function analyzeImage(
  file: File,
  shelf: Shelf,
  businessId: string,
  token: string,
  scanMode: ScanMode = "STOCK_IN",
): Promise<DetectionResult> {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("shelfId", shelf.id);
  formData.append("businessId", businessId);
  formData.append("scanMode", scanMode);

  const response = await fetch(`${API_URL}/detection/analyze`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const body = await response.json();

  if (!response.ok || body.success === false) {
    throw new Error(body.message || "Image analysis failed");
  }

  return body.data;
}
