import { File, UploadTask, UploadType } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { API_URL } from '../config';
import { apiRequest } from './api';
import { getToken } from './auth';
import type { Shelf } from './shelf';

// Mirrors client/src/lib/detection.ts against the same /detection/analyze
// multipart endpoint (server/src/modules/detection).
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

export type ScanMode = 'STOCK_IN' | 'STOCK_OUT';

// Mirrors client/src/lib/detection.ts's ScanHistoryItem/getScanHistory
// against the same GET /detection/history endpoint.
export type ScanHistoryItem = {
  id: string;
  shelf_id: string;
  shelf_name: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
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

export function countHistoryItems(items: ScanHistoryItem['items']): Record<string, number> {
  return items.reduce<Record<string, number>>((counts, item) => {
    counts[item.type] = (counts[item.type] || 0) + 1;
    return counts;
  }, {});
}

export function formatHistoryDate(value: string | null | undefined): string {
  if (!value) return '';
  const str = value.trim();
  const isoStr = str.includes('T') ? str : str.replace(' ', 'T');
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return value;

  const now = new Date();
  const timeStr = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const isSameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

  if (isSameDay(date, now)) return `Today, ${timeStr}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return `Yesterday, ${timeStr}`;

  const isThisYear = date.getFullYear() === now.getFullYear();
  const dateStr = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(isThisYear ? {} : { year: 'numeric' }),
  });
  return `${dateStr}, ${timeStr}`;
}

export async function getScanHistory(
  businessId: string,
  startDate?: string,
  endDate?: string,
): Promise<ScanHistoryItem[]> {
  const params = new URLSearchParams({ businessId });
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);

  const result = await apiRequest<ScanHistoryItem[]>(`/detection/history?${params}`, {}, true);
  return result.data || [];
}

/** A local image picked via expo-image-picker: its URI, plus name/mime type for multipart upload. */
export type PickedImage = {
  uri: string;
  name: string;
  type: string;
};

/** Max width to downscale a scan photo to before upload — see compressForUpload(). */
const MAX_UPLOAD_WIDTH = 1600;

/**
 * Downscales and JPEG-compresses a picked image before upload. Raw camera
 * photos can be many megapixels (several MB even after quality-only
 * compression), which is slow and unreliable to upload over a weak or
 * congested connection (e.g. a phone hotspot). Matches the SAD's
 * client-side image compression requirement (section 10.4).
 */
export async function compressForUpload(uri: string): Promise<PickedImage> {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: MAX_UPLOAD_WIDTH });
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });

  return {
    uri: result.uri,
    name: `scan-${Date.now()}.jpg`,
    type: 'image/jpeg',
  };
}

export async function analyzeImage(
  image: PickedImage,
  shelf: Shelf,
  businessId: string,
  scanMode: ScanMode = 'STOCK_IN',
): Promise<DetectionResult> {
  const token = await getToken();
  if (!token) throw new Error('Session expired. Please sign in again.');

  // Plain fetch() + FormData.append(name, { uri, name, type }) throws
  // "Unsupported FormDataPart implementation" on React Native's New
  // Architecture (the only architecture as of RN 0.76+) — the native
  // networking layer no longer accepts a plain object as a file part.
  // expo-file-system's UploadTask is Expo's supported replacement for
  // exactly this: uploading a local file as one part of a multipart
  // request, with the other fields as `parameters`.
  const file = new File(image.uri);
  const task = new UploadTask(file, `${API_URL}/detection/analyze`, {
    httpMethod: 'POST',
    uploadType: UploadType.MULTIPART,
    fieldName: 'file',
    mimeType: image.type,
    parameters: {
      shelfId: shelf.id,
      businessId,
      scanMode,
    },
    headers: { Authorization: `Bearer ${token}` },
  });

  let uploadResult: { body: string; status: number };
  try {
    uploadResult = await task.uploadAsync();
  } catch (err) {
    // Surface the real cause instead of a generic message — this can be a
    // true network failure, but also a local file-read error, a timeout, or
    // anything else the upload rejects with, and those need different fixes.
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`Unable to reach the server (${detail}). Check your connection and try again.`);
  }

  let body: { success?: boolean; data?: DetectionResult; message?: string };
  try {
    body = JSON.parse(uploadResult.body);
  } catch {
    body = {};
  }

  if (uploadResult.status < 200 || uploadResult.status >= 300 || body.success === false || !body.data) {
    throw new Error(body.message || 'Image analysis failed');
  }

  return body.data;
}
