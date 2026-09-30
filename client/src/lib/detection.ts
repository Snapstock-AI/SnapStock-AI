import type { Shelf } from "../types/shelf";
import { API_URL } from "./api";

export type DetectionResult = {
  scanId: string;
  shelf?: Shelf;

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

export type AnalysisStage = "uploading" | "queued" | "analyzing";

export type AnalyzeOptions = {
  onProgress?: (stage: AnalysisStage) => void;
  pollIntervalMs?: number;
  timeoutMs?: number;
};

type ScanUploadTicket = {
  scanId: string;
  upload: { url: string; fields: Record<string, string> };
};

type ScanStatus = {
  scanId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  data: DetectionResult | null;
  errorMessage?: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function readJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

/**
 * Analyzes a shelf image.
 *
 * Event-driven (default): request a presigned S3 POST, upload the image straight to S3,
 * queue the scan (backend publishes IMAGE_UPLOADED to SQS, the AI worker consumes it) and
 * poll the scan status until the result is stored.
 *
 * Falls back to the synchronous POST /detection/analyze when the server reports that the
 * S3/SQS pipeline is not configured (503 EVENT_PIPELINE_DISABLED).
 */
export async function analyzeImage(
  file: File,
  shelf: Shelf,
  businessId: string,
  token: string,
  scanMode: ScanMode = "STOCK_IN",
  options: AnalyzeOptions = {},
): Promise<DetectionResult> {
  const { onProgress, pollIntervalMs = 1500, timeoutMs = 180_000 } = options;
  const authHeaders = { Authorization: `Bearer ${token}` };

  onProgress?.("uploading");

  const ticketResponse = await fetch(`${API_URL}/detection/upload-url`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      businessId,
      shelfId: shelf.id,
      scanMode,
      fileName: file.name,
      contentType: file.type,
    }),
  });
  const ticketBody = await readJson(ticketResponse);

  if (ticketBody.code === "EVENT_PIPELINE_DISABLED") {
    return analyzeImageSync(file, shelf, businessId, token, scanMode);
  }
  if (!ticketResponse.ok || ticketBody.success === false) {
    throw new Error(ticketBody.message || "Unable to start the image upload.");
  }

  const ticket = ticketBody.data as ScanUploadTicket;

  // Direct browser -> S3 upload. The presigned fields must precede the file.
  const form = new FormData();
  for (const [name, value] of Object.entries(ticket.upload.fields)) {
    form.append(name, value);
  }
  form.append("file", file);

  const uploadResponse = await fetch(ticket.upload.url, { method: "POST", body: form });
  if (!uploadResponse.ok) {
    throw new Error(
      uploadResponse.status === 400 || uploadResponse.status === 403
        ? "The image was rejected by storage. Use a JPEG, PNG or WebP image under 10 MB."
        : "Image upload failed. Please try again.",
    );
  }

  const queueResponse = await fetch(`${API_URL}/detection/queue`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ scanId: ticket.scanId }),
  });
  const queueBody = await readJson(queueResponse);
  if (!queueResponse.ok || queueBody.success === false) {
    throw new Error(queueBody.message || "Unable to queue the image for analysis.");
  }

  onProgress?.("queued");

  const deadline = Date.now() + timeoutMs;
  let announcedAnalyzing = false;

  while (Date.now() < deadline) {
    await sleep(pollIntervalMs);

    const statusResponse = await fetch(`${API_URL}/detection/status/${ticket.scanId}`, {
      headers: authHeaders,
    });
    const statusBody = await readJson(statusResponse);
    if (!statusResponse.ok || statusBody.success === false) {
      throw new Error(statusBody.message || "Unable to check the analysis status.");
    }

    const status = statusBody.data as ScanStatus;

    if (status.status === "COMPLETED" && status.data) {
      return status.data;
    }
    if (status.status === "FAILED") {
      throw new Error(status.errorMessage || "Image analysis failed.");
    }
    if (!announcedAnalyzing) {
      announcedAnalyzing = true;
      onProgress?.("analyzing");
    }
  }

  throw new Error(
    "Analysis is taking longer than expected. Check Scan history in a moment for the result.",
  );
}

/** Synchronous analysis (multipart upload to the backend, which calls the AI service). */
export async function analyzeImageSync(
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
