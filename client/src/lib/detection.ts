import type { Shelf } from "../types/shelf";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";


export type DetectionResult = {
  shelf?: Shelf;

  scanId: string;

  image_width: number;
  image_height: number;
  total_count: number;

  counts: Record<string, {
      fresh: number;
      rotten: number;
      total: number;
    }>;

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
};

export type ScanStatusResponse = {
  scanId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  data?: DetectionResult | null;
  errorMessage?: string;
};

export type ScanUploadResponse = {
  scanId: string;
  status: "PENDING";
  objectKey: string;
  uploadUrl: string;
  expiresInSeconds: number;
};

export async function queueUploadedScan(
  upload: ScanUploadResponse,
  shelf: Shelf,
  businessId: string,
  contentType: string,
  token: string
): Promise<void> {
  const response = await fetch(`${API_URL}/detection/queue`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      scanId: upload.scanId,
      businessId,
      shelfId: shelf.id,
      objectKey: upload.objectKey,
      contentType,
    }),
  });

  const body = await response.json();

  if (!response.ok || body.success === false) {
    throw new Error(body.message || "Could not queue scan");
  }
}

export async function uploadScanImage(
  file: File,
  shelf: Shelf,
  businessId: string,
  token: string
): Promise<ScanUploadResponse> {
  const response = await fetch(`${API_URL}/detection/upload-url`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      businessId,
      shelfId: shelf.id,
      fileName: file.name,
      contentType: file.type,
    }),
  });

  const body = await response.json();

  if (!response.ok || body.success === false) {
    throw new Error(body.message || "Could not prepare image upload");
  }

  const uploadResponse = await fetch(body.data.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error("Image upload failed");
  }

  return body.data;
}

export async function fetchScanStatus(
  scanId: string,
  token: string
): Promise<ScanStatusResponse> {
  const response = await fetch(`${API_URL}/detection/status/${scanId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const body = await response.json();

  if (!response.ok || body.success === false) {
    throw new Error(body.message || "Could not fetch scan status");
  }

  return body.data;
}

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
  items: {
    id?: string;
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

export function formatHistoryDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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
