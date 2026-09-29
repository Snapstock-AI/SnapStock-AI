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

export async function analyzeImage(
  image: PickedImage,
  shelf: Shelf,
  businessId: string,
  scanMode: ScanMode = 'STOCK_IN',
): Promise<DetectionResult> {
  const token = await getToken();
  if (!token) throw new Error('Session expired. Please sign in again.');

  const formData = new FormData();
  // React Native's FormData accepts { uri, name, type } for file fields;
  // this doesn't match the DOM Blob type FormData.append expects.
  formData.append('file', { uri: image.uri, name: image.name, type: image.type } as unknown as Blob);
  formData.append('shelfId', shelf.id);
  formData.append('businessId', businessId);
  formData.append('scanMode', scanMode);

  let response: Response;
  try {
    response = await fetch(`${API_URL}/detection/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
  } catch {
    throw new Error('Unable to reach the server. Check your connection and try again.');
  }

  const body = (await response.json().catch(() => ({}))) as {
    success?: boolean;
    data?: DetectionResult;
    message?: string;
  };

  if (!response.ok || body.success === false || !body.data) {
    throw new Error(body.message || 'Image analysis failed');
  }

  return body.data;
}
