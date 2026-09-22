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


export async function analyzeImage(
  file: File,
  shelf: Shelf,
  businessId: string,
  token: string
): Promise<DetectionResult> {

  const formData = new FormData();

  formData.append("file", file);
  formData.append("shelfId", shelf.id);
  formData.append("businessId", businessId);

  const response = await fetch(
    `${API_URL}/detection/analyze`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }
  );


  const body = await response.json();


  if (!response.ok || body.success === false) {
    throw new Error(
      body.message || "Image analysis failed"
    );
  }

  return {
    ...body.data,
    shelf,
  };
}
