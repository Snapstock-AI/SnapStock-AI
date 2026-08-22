import type { Shelf } from "../types/shelf";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";


export type DetectionResult = {
  shelf: Shelf;

  scanId: string;

  image_width: number;
  image_height: number;
  total_count: number;

  counts: Record< string,{
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
};


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
