import { File, UploadTask, UploadType } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { API_URL } from '../config';
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
